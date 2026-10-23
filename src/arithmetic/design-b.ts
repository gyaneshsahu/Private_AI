// Design B (owner decision after gate v2, 23 October 2026): the cross-check
// is a second, independent extraction instead of the model's own estimate.
// Call 1 is the Design A program (extractDesignA). Call 2 reads the same
// turn under a materially different framing: one formula per figure, each a
// chain that starts from one span or constant and applies operations in
// order to a running value, over the same span ids, constants and the fixed
// operation set. Both are evaluated here. The shown figure is always call 1's
// value. States: "recomputed and matches" when call 2 computed the same
// figure (at the figure's rounding); "not cross-checked" with the flag "two
// independent readings of this question gave different figures" when it did
// not; "not cross-checked" with its own flag when call 2 failed validation
// after its retry. Deterministic method checks (method-checks.ts) add flags
// on call 1's program. The model's estimate is not used.
//
// Wording placeholders ("recomputed and matches", "calculated", "not
// cross-checked") await the owner's report; the bare word "verified" is never
// used.
import { D, type Dec, EvaluationError, OPERATIONS, OPERATION_HELP, ROUNDING_MODES, type Program, type Step, evaluateProgram } from "./evaluator";
import {
  DESIGN_A_CONSTANTS,
  DesignAError,
  MAX_RESULTS,
  RESULT_FORMATS,
  type DesignAExtraction,
  type ResultFormat,
  composeAnswer,
  constantRef,
  extractDesignA,
  typeOfFormat,
  typeProgram,
} from "./design-a";
import { roundDecimal, type RoundingMode } from "./locale-number";
import type { NumberLocale } from "./numbers";
import type { Span } from "./spans";
import { methodChecks, type MethodFlag } from "./method-checks";

export const MAX_FORMULAS = 8;
export const MAX_CHAIN = 12;
/** Chain operations: every binary operation of the set plus round; sum is repeated add. */
export const CHAIN_OPERATIONS = OPERATIONS.filter((op) => op !== "sum") as Exclude<(typeof OPERATIONS)[number], "sum">[];

export function designBReferenceIds(spans: Span[]): string[] {
  return [...spans.map((s) => s.id), ...DESIGN_A_CONSTANTS.map(constantRef), ...Array.from({ length: MAX_FORMULAS }, (_, i) => `f${i + 1}`)];
}

/** Call 2's JSON Schema: a list of formulas, each a chain; the reference enum fixed per request. */
export function designBSchema(spans: Span[]) {
  const refs = designBReferenceIds(spans);
  return {
    type: "object",
    properties: {
      formulas: {
        type: "array",
        maxItems: MAX_FORMULAS,
        items: {
          type: "object",
          properties: {
            label: { type: "string", maxLength: 60 },
            format: { type: "string", enum: [...RESULT_FORMATS, "helper"] },
            unit: { type: "string", maxLength: 12 },
            decimals: { type: "integer", minimum: 0, maximum: 8 },
            start: { type: "string", enum: refs },
            ops: {
              type: "array",
              maxItems: MAX_CHAIN,
              items: {
                type: "object",
                properties: {
                  op: { type: "string", enum: [...CHAIN_OPERATIONS] },
                  arg: { type: "string", enum: [...refs, "none"] },
                  decimals: { type: "integer", minimum: 0, maximum: 8 },
                  mode: { type: "string", enum: [...ROUNDING_MODES, "none"] },
                },
                required: ["op", "arg", "decimals", "mode"],
                additionalProperties: false,
              },
            },
          },
          required: ["label", "format", "unit", "decimals", "start", "ops"],
          additionalProperties: false,
        },
      },
      limitation: { type: "string", enum: ["none", "cannot_answer"] },
    },
    required: ["formulas", "limitation"],
    additionalProperties: false,
  } as const;
}

export function designBInstruction(): string {
  const ops = CHAIN_OPERATIONS.map((op) => `${op}: ${OPERATION_HELP[op].replace("args[0]", "the running value").replace("args[1]", "arg")}`).join("\n");
  return [
    "You are an independent second reader of a calculation question. Another reader has already written a program; you have not seen it and must not guess at it. Write one formula for each figure the question asks for. A formula is a chain: it starts from one number (start) and applies operations in order; each operation combines the running value with one argument (arg) and the result becomes the running value. You never write a number as text: start and arg are span ids from the user's message (such as t1n3), one of the constants const:1, const:2, const:7, const:12, const:24, const:30, const:52, const:60, const:100, const:365, const:366, const:1000, or f1, f2, ... for the value of an earlier formula in your list. Our software evaluates every chain with exact decimal arithmetic.",
    "Operations (the running value first, then arg):\n" + ops + "\nround takes no arg (write none); its places go in decimals and its mode in mode. On every other operation write decimals 0 and mode none.",
    "Percentages are spans as written (19 for \"19 %\"): use percent_of, add_percent or subtract_percent with that span. A factor such as 1.03 is add_percent applied to const:1. Clock times and durations are minutes; a date is a day count; a figure that is a date has format date, a clock time format clock, a span of time format minutes or days. A chain you need only as an intermediate value gets format helper and is not shown. Round only where the question asks for it. When a later message corrects a figure, use the corrected span. Label each formula in the user's language and give the places to show in decimals (money: 2). If the figures cannot be computed from the spans and constants, set limitation to cannot_answer and list no formulas. Reply with JSON only.",
  ].join("\n\n");
}

/** The user message for call 2: the same annotated text and span table, a different closing request. */
export function designBUserMessage(annotatedText: string, turn: number, spans: Span[], spanLines: string): string {
  return [
    `User message ${turn} (span ids in brackets):\n${annotatedText}`,
    `Spans available (all user messages so far):\n${spanLines || "- none"}`,
    turn > 1
      ? "This is a follow-up: compute every figure it asks for from the spans above alone (earlier messages' spans stay available; a corrected figure replaces the earlier one). Write one chain per figure."
      : "Write one chain per figure the question asks for.",
  ].join("\n\n");
}

export type ChainFormula = {
  label: string;
  format: ResultFormat | "helper";
  unit: string;
  decimals: number;
  start: string;
  ops: { op: (typeof CHAIN_OPERATIONS)[number]; arg: string; decimals: number; mode: RoundingMode | "none" }[];
};

export type DesignBExtraction = {
  formulas: ChainFormula[];
  program: Program;
  /** Value of every formula by its index (f1 = 0). */
  values: Dec[];
  /** Figures meant to be shown (format other than helper). */
  figures: { index: number; label: string; format: ResultFormat; value: Dec; places: number }[];
};

const ID = /^(?:t\d{1,3}n\d{1,3}|const:\d+|f\d{1,2})$/;

/** Parses, validates and evaluates one call-2 reply. Throws DesignAError. */
export function extractDesignB(raw: string, spans: Span[]): DesignBExtraction {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new DesignAError("INVALID_JSON", "the second reading is not valid JSON");
  }
  const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isObject(json) || !Array.isArray(json.formulas) || json.formulas.length > MAX_FORMULAS)
    throw new DesignAError("INVALID_SCHEMA", `formulas must be an array of at most ${MAX_FORMULAS}`);
  if (json.limitation === "cannot_answer") throw new DesignAError("CANNOT_ANSWER", "the second reading reported that the question cannot be answered");
  if (json.limitation !== "none") throw new DesignAError("INVALID_SCHEMA", "limitation must be none or cannot_answer");
  const formulas: ChainFormula[] = json.formulas.map((f, i) => {
    if (!isObject(f)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} must be an object`);
    const { label, format, unit = "", decimals = 2, start, ops } = f;
    if (typeof label !== "string" || !label.trim() || label.length > 60) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1}: label must be 1 to 60 characters`);
    if (typeof format !== "string" || !([...RESULT_FORMATS, "helper"] as string[]).includes(format)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1}: unknown format`);
    if (typeof unit !== "string" || unit.length > 12 || /\d/.test(unit)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1}: unit must be a short word`);
    if (!Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 8) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1}: decimals must be 0..8`);
    if (typeof start !== "string" || !ID.test(start)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1}: start must be a span id, const:<value> or an earlier formula`);
    if (!Array.isArray(ops) || ops.length > MAX_CHAIN) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1}: ops must be a list of at most ${MAX_CHAIN}`);
    const chain = ops.map((o, j) => {
      if (!isObject(o)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} op ${j + 1} must be an object`);
      const { op, arg = "none", decimals: d = 0, mode = "none" } = o;
      if (typeof op !== "string" || !(CHAIN_OPERATIONS as readonly string[]).includes(op)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} op ${j + 1}: unknown operation`);
      if (typeof arg !== "string" || (arg !== "none" && !ID.test(arg))) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} op ${j + 1}: arg must be a span id, constant, earlier formula or none`);
      if (op !== "round" && arg === "none") throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} op ${j + 1}: ${op} needs an arg`);
      if (!Number.isInteger(d) || (d as number) < 0 || (d as number) > 8) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} op ${j + 1}: decimals must be 0..8`);
      if (typeof mode !== "string" || !([...ROUNDING_MODES, "none"] as string[]).includes(mode)) throw new DesignAError("INVALID_SCHEMA", `formula ${i + 1} op ${j + 1}: unknown mode`);
      return { op: op as (typeof CHAIN_OPERATIONS)[number], arg, decimals: d as number, mode: mode as RoundingMode | "none" };
    });
    return { label: label.trim(), format: format as ResultFormat | "helper", unit: unit.trim(), decimals: decimals as number, start, ops: chain };
  });
  // Chains become evaluator steps; f<k> resolves to formula k's final value.
  const spanById = new Map(spans.map((s) => [s.id, s]));
  const operands: Program["operands"] = {};
  const steps: Step[] = [];
  const valueRef: string[] = [];
  const resolve = (ref: string, index: number, where: string): string => {
    if (ref.startsWith("const:")) {
      const value = ref.slice(6);
      if (!(DESIGN_A_CONSTANTS as readonly string[]).includes(value)) throw new DesignAError("UNKNOWN_REFERENCE", `${where}: ${ref} is not an allowed constant`);
      operands[ref] = value;
      return ref;
    }
    if (ref.startsWith("f")) {
      const k = Number(ref.slice(1));
      if (!Number.isInteger(k) || k < 1 || k > formulas.length) throw new DesignAError("UNKNOWN_REFERENCE", `${where}: ${ref} is not a formula of this list`);
      if (k - 1 >= index) throw new DesignAError("FORWARD_REFERENCE", `${where}: ${ref} is not an earlier formula`);
      return valueRef[k - 1];
    }
    const span = spanById.get(ref);
    if (!span) throw new DesignAError("UNKNOWN_REFERENCE", `${where}: ${ref} is not a span of the user's text`);
    operands[ref] = span.value;
    return ref;
  };
  formulas.forEach((f, i) => {
    let current = resolve(f.start, i, `formula ${i + 1} start`);
    f.ops.forEach((o, j) => {
      const id = `f${i + 1}_${j + 1}`;
      if (o.op === "round") steps.push({ id, op: "round", args: [current], decimals: o.decimals, mode: o.mode === "none" ? "half-up" : o.mode });
      else steps.push({ id, op: o.op, args: [current, resolve(o.arg, i, `formula ${i + 1} op ${j + 1}`)] });
      current = id;
    });
    valueRef.push(current);
  });
  const program: Program = { operands, steps };
  let evaluated: Map<string, Dec>;
  try {
    evaluated = evaluateProgram(program);
  } catch (error) {
    if (error instanceof EvaluationError) throw new DesignAError("EVALUATION", error.message);
    throw error;
  }
  const types = typeProgram(steps, spanById);
  const values = valueRef.map((ref) => evaluated.get(ref)!);
  const figures = formulas.flatMap((f, i) => {
    if (f.format === "helper") return [];
    const ref = valueRef[i];
    const type = types.get(ref) ?? (spanById.get(ref)?.kind === "date" ? "date" : spanById.get(ref)?.kind === "time" ? "clock" : "plain");
    if (type !== typeOfFormat[f.format]) throw new DesignAError("RESULT_FORMAT", `${f.label}: the value is a ${type === "plain" ? "plain number" : type} but the format is ${f.format}`);
    const places = f.format === "money" ? f.decimals || 2 : f.format === "clock" || f.format === "date" || f.format === "minutes" ? 0 : f.decimals;
    return [{ index: i, label: f.label, format: f.format, value: values[i], places }];
  });
  if (!figures.length) throw new DesignAError("EMPTY", "the second reading lists no figure to show");
  return { formulas, program, values, figures };
}

export type CrossCheck = "matches" | "differs" | "unavailable";
export type NumberStateB = "recomputed and matches" | "not cross-checked";

export type DesignBResult = {
  label: string;
  value: string;
  shown: string;
  format: ResultFormat;
  state: NumberStateB;
  crossCheck: CrossCheck;
};

export type FlagClass = "cross-check-differs" | "cross-check-unavailable" | "method" | "ambiguity" | "prose" | "ledger";

export type DesignBOutcome = {
  answer: string;
  results: DesignBResult[];
  flags: string[];
  flagClasses: FlagClass[];
  methodFlags: MethodFlag[];
  programA: Program;
  programB?: Program;
  ledger: string[];
};

export const DESIGN_B_FOOTER =
  "Figures marked \"recomputed and matches\" were computed by this software from two independent readings of your message that agree; a figure marked \"not cross-checked\" comes from one reading only. The choice of numbers and method is the model's and is not independently checked beyond the rules named above.";

/**
 * Combines call 1 (shown) with call 2 (cross-check) and the method checks.
 * `b` is undefined when call 2 failed validation after its retry.
 */
export function renderDesignB(a: DesignAExtraction, b: DesignBExtraction | undefined, turns: string[], spans: Span[], locale: NumberLocale): DesignBOutcome {
  const flags: string[] = [];
  const flagClasses: FlagClass[] = [];
  const used = new Set<number>();
  const results: DesignBResult[] = a.results.map((r) => {
    if (!b) return { label: r.label, value: r.value, shown: r.shown, format: r.format, state: "not cross-checked", crossCheck: "unavailable" };
    const target = roundDecimal(r.value, r.places);
    const hit = b.figures.find((f) => !used.has(f.index) && roundDecimal(f.value, r.places) === target);
    if (hit) {
      used.add(hit.index);
      return { label: r.label, value: r.value, shown: r.shown, format: r.format, state: "recomputed and matches", crossCheck: "matches" };
    }
    return { label: r.label, value: r.value, shown: r.shown, format: r.format, state: "not cross-checked", crossCheck: "differs" };
  });
  if (!b) {
    flags.push("the second, independent reading of this question could not be validated, so these figures are not cross-checked");
    flagClasses.push("cross-check-unavailable");
  } else {
    const differing = results.filter((r) => r.crossCheck === "differs").map((r) => r.label);
    if (differing.length) {
      flags.push(`two independent readings of this question gave different figures for ${differing.join(", ")}; the first reading's figure is shown and is not cross-checked`);
      flagClasses.push("cross-check-differs");
    }
  }
  const methodFlags = methodChecks(turns, spans, a.program, a.results);
  for (const m of methodFlags) {
    flags.push(m.text);
    flagClasses.push("method");
  }
  if (a.ambiguityFlags.length) {
    flags.push(...a.ambiguityFlags);
    flagClasses.push("ambiguity");
  }
  const lines = results.map((r) => `**${r.label}: ${r.shown}** (${r.state})`);
  const before = flags.length;
  const { answer } = composeAnswer(lines, a.note, flags, a.ledger, locale, DESIGN_B_FOOTER);
  for (const f of flags.slice(before)) flagClasses.push(/outside the ledger/.test(f) ? "ledger" : "prose");
  return { answer, results, flags, flagClasses, methodFlags, programA: a.program, ...(b ? { programB: b.program } : {}), ledger: a.ledger };
}

export { extractDesignA };
