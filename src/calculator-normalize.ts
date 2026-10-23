// Deterministic normalisation of calculator tool arguments before strict
// validation. Every rule below was observed in the paid practice batches of
// 23 October 2026 (Gemma 4 31B, GPT-OSS 120B) and resolves a shape the model
// used for the same information the strict schema wants. No rule introduces a
// value that is not already in the user's text, a supplied source, the allowed
// constants, or the model's own inputs; anything else is left for the schema
// and the evidence check to refuse.
import type { Conversation, Source } from "../shared/contracts";
import { CONSTANT_OPERANDS } from "./checked-response";
import { evidenceNumberTokens } from "./number-evidence";

const ID = /^[a-z][a-z0-9_]{0,31}$/;
const NUMERIC = /^-?\d+(?:\.\d+)?$/;

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** camelCase, spaces, dashes and upper case become the schema's snake_case id. */
export function normalizeId(id: string): string {
  const snake = id
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  const started = /^[a-z]/.test(snake) ? snake : `v_${snake}`;
  return started.slice(0, 32);
}

/** The exact substring of `text` that `quote` denotes, allowing only whitespace differences. */
export function findQuote(text: string, quote: string): string | undefined {
  if (!quote.trim()) return undefined;
  if (text.includes(quote)) return quote;
  const compact = (s: string) => s.replace(/\s+/g, "");
  const needle = compact(quote);
  if (!needle) return undefined;
  const map: number[] = [];
  let hay = "";
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue;
    hay += text[i];
    map.push(i);
  }
  const at = hay.indexOf(needle);
  if (at < 0) return undefined;
  return text.slice(map[at], map[at + needle.length - 1] + 1);
}

export function normalizeDecimal(text: string): string | undefined {
  if (!NUMERIC.test(text)) return undefined;
  const negative = text.startsWith("-");
  const [integer, fraction = ""] = text.replace(/^-/, "").split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer.replace(/^0+(?=\d)/, "")}${trimmed ? "." + trimmed : ""}`;
}

/**
 * Resolves calculator arguments the way a careful reader would, then leaves
 * strict validation to the schema and the evidence check.
 */
export function normalizeEvidenceShorthand(
  parsed: unknown,
  sources: Source[],
  conversation: Conversation,
): unknown {
  if (!isObject(parsed)) return parsed;
  const args: Obj = { ...parsed };
  // One input written as an object instead of a one-element array.
  if (isObject(args.inputs) && !Array.isArray(args.inputs.evidence))
    args.inputs = [args.inputs];
  if (!Array.isArray(args.inputs)) return parsed;
  const users = conversation.messages.filter(
    (m) => m.role === "user" && m.included && m.status === "complete",
  );

  // 1. Identifiers: inputs, steps and results share one renaming.
  const renames = new Map<string, string>();
  const rename = (id: unknown) => {
    if (typeof id !== "string") return id;
    if (ID.test(id)) return id;
    if (!renames.has(id)) renames.set(id, normalizeId(id));
    return renames.get(id)!;
  };
  const ref = (operand: unknown) =>
    typeof operand === "string" && renames.has(operand)
      ? renames.get(operand)!
      : operand;

  // 2. Evidence: quotations located loosely, kinds spelled variously,
  //    constants that are really quotations or values from the text.
  const quoteEvidence = (quote: string) => {
    for (let turn = users.length; turn >= 1; turn--) {
      const exact = findQuote(users[turn - 1].text, quote);
      if (exact) return { kind: "user", userTurn: turn, quote: exact };
    }
    for (const source of sources) {
      const exact = findQuote(source.text, quote);
      if (exact) return { kind: "source", sourceId: source.id, quote: exact };
    }
    return undefined;
  };
  const valueEvidence = (value: string) => {
    const key = normalizeDecimal(value);
    if (key === undefined) return undefined;
    const matches = (text: string) =>
      (text.match(/[-+]?\d[\d.,]*/g) ?? [])
        .map((t) => t.replace(/[.,]+$/, ""))
        .find((written) =>
          evidenceNumberTokens(written).some(
            (t) => normalizeDecimal(t) === key,
          ),
        );
    for (let turn = users.length; turn >= 1; turn--) {
      const written = matches(users[turn - 1].text);
      if (written) return { kind: "user", userTurn: turn, quote: written };
    }
    for (const source of sources) {
      const written = matches(source.text);
      if (written)
        return { kind: "source", sourceId: source.id, quote: written };
    }
    return undefined;
  };
  const inputs: unknown[] = args.inputs.map((input) => {
    if (!isObject(input)) return input;
    const out: Obj = { ...input, id: rename(input.id) };
    const evidence = out.evidence;
    if (typeof evidence === "string")
      out.evidence = quoteEvidence(evidence) ?? evidence;
    else if (isObject(evidence)) {
      const e: Obj = { ...evidence };
      if (
        e.kind === "userMessage" ||
        e.kind === "user_message" ||
        e.kind === "userTurn"
      )
        e.kind = "user";
      if (e.kind === undefined) {
        if (typeof e.sourceId === "string") e.kind = "source";
        else if (typeof e.userTurn === "number") e.kind = "user";
      }
      if (e.kind === "constant") {
        const value = typeof out.value === "string" ? out.value : "";
        const fromQuote =
          typeof e.quote === "string" ? quoteEvidence(e.quote) : undefined;
        const allowed = (CONSTANT_OPERANDS as readonly string[]).some(
          (c) => normalizeDecimal(c) === normalizeDecimal(value),
        );
        out.evidence =
          fromQuote ??
          (allowed
            ? { kind: "constant" }
            : (valueEvidence(value) ?? { kind: "constant" }));
      } else if (
        (e.kind === "user" || e.kind === "source") &&
        typeof e.quote === "string"
      ) {
        const located =
          e.kind === "user" && typeof e.userTurn === "number"
            ? findQuote(users[e.userTurn - 1]?.text ?? "", e.quote)
            : e.kind === "source" && typeof e.sourceId === "string"
              ? findQuote(
                  sources.find((s) => s.id === e.sourceId)?.text ?? "",
                  e.quote,
                )
              : undefined;
        out.evidence = located
          ? { ...e, quote: located }
          : (quoteEvidence(e.quote) ?? e);
      } else if (Object.keys(e).length === 1 && typeof e.quote === "string")
        out.evidence = quoteEvidence(e.quote) ?? e;
      else out.evidence = e;
    }
    return out;
  });

  // 3. Literal numbers as step operands: the input with that value, an allowed
  //    constant, or a form that some input's quotation stands for.
  const inputIds = new Set<string>();
  const valueIds = new Map<string, string[]>();
  for (const input of inputs)
    if (isObject(input) && typeof input.id === "string") {
      inputIds.add(input.id);
      if (typeof input.value === "string") {
        const key = normalizeDecimal(input.value);
        if (key !== undefined)
          valueIds.set(key, [...(valueIds.get(key) ?? []), input.id]);
      }
    }
  let synthesized = 0;
  const freshId = (base: string) => {
    let id = normalizeId(base);
    while (inputIds.has(id)) id = normalizeId(`${base}_${++synthesized}`);
    inputIds.add(id);
    return id;
  };
  const literal = (operand: unknown): unknown => {
    if (typeof operand !== "string") return operand;
    const key = normalizeDecimal(operand);
    if (key === undefined) return operand;
    const ids = valueIds.get(key);
    if (ids && ids.length === 1) return ids[0];
    if (ids && ids.length > 1) return operand;
    if (
      (CONSTANT_OPERANDS as readonly string[]).some(
        (c) => normalizeDecimal(c) === key,
      )
    ) {
      const id = freshId(`const_${key.replace(/[^0-9]/g, "_")}`);
      inputs.push({ id, value: operand, evidence: { kind: "constant" } });
      valueIds.set(key, [id]);
      return id;
    }
    for (const input of inputs) {
      if (!isObject(input) || !isObject(input.evidence)) continue;
      const quote = input.evidence.quote;
      if (typeof quote !== "string") continue;
      if (
        evidenceNumberTokens(quote).some((t) => normalizeDecimal(t) === key)
      ) {
        const id = freshId(
          `${String(input.id)}_${key.replace(/[^0-9]/g, "_")}`,
        );
        inputs.push({ id, value: operand, evidence: input.evidence });
        valueIds.set(key, [id]);
        return id;
      }
    }
    return operand;
  };

  // 4. Chains: a running total written as repeated steps with one id.
  const defined = new Set(inputIds);
  const latest = new Map<string, string>();
  const chain = (operand: unknown) =>
    typeof operand === "string" ? (latest.get(operand) ?? operand) : operand;
  const steps = Array.isArray(args.steps)
    ? args.steps.map((step) => {
        if (!isObject(step)) return step;
        const left = chain(literal(ref(step.left)));
        const right = chain(literal(ref(step.right)));
        let id = rename(step.id);
        if (typeof id === "string" && defined.has(id)) {
          let n = 2;
          while (defined.has(`${id}_${n}`)) n++;
          latest.set(id, `${id}_${n}`);
          id = `${id}_${n}`;
        }
        if (typeof id === "string") defined.add(id);
        return { ...step, id, left, right };
      })
    : args.steps;
  const results = Array.isArray(args.results)
    ? args.results.map((result) =>
        isObject(result) ? { ...result, id: chain(ref(result.id)) } : result,
      )
    : args.results;
  return { ...args, inputs, steps, results };
}
