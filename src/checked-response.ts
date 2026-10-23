import { evidenceNumberTokens } from "./number-evidence";
import Decimal from "decimal.js";
import { z } from "zod";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type {
  Conversation,
  Qualification,
  Source,
  Usage,
} from "../shared/contracts";
import { consumeReply, IncompleteReplyError } from "./reply-stream";

export const checkedResponseInstruction = `Experimental checked response: return ONLY JSON with keys inputs, steps, results, passages, limitation. Do not supply prose, computed values or a final total: the browser computes and renders them. inputs is an array (max24) of {id, value, evidence}; id is a lowercase identifier, value is a decimal string: the number as written in the evidence, or its plain form with a dot as decimal mark and no thousands separators (write 1234.56 for "1.234,56 EUR" or "1,234.56 EUR"). evidence is {kind:"source",sourceId,quote}, {kind:"user",userTurn,quote}, or {kind:"constant"} for a calendar or unit constant only (1, 2, 7, 12, 24, 30, 52, 60, 100, 365, 366, 1000); quote must be an exact contiguous passage, and userTurn is the one-based index of included USER messages. Prefer the latest user correction over older source values. steps is an array (max32) of {id,op,left,right}; left/right reference earlier input/step IDs, op is add, subtract, multiply, divide, percentOf (left*right/100) or ratioPercent (left/right*100). results is an array of {id,decimals} referring to calculated steps; decimals is0..8 and rounds only the final display, half up. passages is an array (max12) of evidence objects: these render as exact quotations, so retain qualifiers and the source's scope (including what it does not mention) rather than inferring real-world absence. limitation is "none" or "insufficient". Use insufficient if this bounded format cannot answer. Never use earlier assistant answers as evidence. No arbitrary code, tool calls, extra keys or free-form final answer.`;

const id = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
const evidenceSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("source"),
      sourceId: z.string().regex(/^[a-zA-Z0-9-]{6,100}$/),
      quote: z.string().min(1).max(3000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("user"),
      userTurn: z.number().int().min(1).max(1000),
      quote: z.string().min(1).max(3000),
    })
    .strict(),
  // A calendar or unit constant the text need not contain; nothing else.
  z.object({ kind: z.literal("constant") }).strict(),
]);
/** The only operands that need no quotation: calendar and unit constants. */
export const CONSTANT_OPERANDS = [
  "1",
  "2",
  "7",
  "12",
  "24",
  "30",
  "52",
  "60",
  "100",
  "365",
  "366",
  "1000",
] as const;
export const checkedResponseSchema = z
  .object({
    inputs: z
      .array(
        z
          .object({
            id,
            value: z.string().regex(/^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,12})?$/),
            evidence: evidenceSchema,
          })
          .strict(),
      )
      .max(24),
    steps: z
      .array(
        z
          .object({
            id,
            op: z
              .enum([
                "add",
                "subtract",
                "multiply",
                "divide",
                "percentOf",
                "ratioPercent",
              ])
              .describe(
                "add: left+right; subtract: left-right; multiply: left*right; divide: left/right; percentOf: left*right/100; ratioPercent: left/right*100. For percentage change, subtract old from new, then ratioPercent that difference over old. Division and ratioPercent reject zero right operand.",
              ),
            left: id,
            right: id,
          })
          .strict(),
      )
      .max(32),
    results: z
      .array(
        z.object({ id, decimals: z.number().int().min(0).max(8) }).strict(),
      )
      .max(12),
    passages: z.array(evidenceSchema).max(12),
    limitation: z.enum(["none", "insufficient"]),
  })
  .strict();

type Evidence = z.infer<typeof evidenceSchema>;
export type CheckedFailure =
  | "FORMAT"
  | "INVALID_JSON"
  | "INVALID_SCHEMA"
  | "EVIDENCE"
  | "OPERAND"
  | "DEPENDENCY"
  | "ARITHMETIC"
  | "EMPTY";
class ContractError extends Error {
  constructor(readonly code: CheckedFailure) {
    super("Checked response rejected");
  }
}
export function checkedFailureCode(error: unknown): CheckedFailure | undefined {
  return error instanceof ContractError ? error.code : undefined;
}
export class CheckedResponseError extends IncompleteReplyError {
  constructor(
    readonly checkedFailure: CheckedFailure,
    usage?: Usage,
  ) {
    super(
      "Answer withheld because its calculation or source record could not be validated. No automatic retry was made.",
      usage,
    );
  }
}
const escape = (value: string) =>
  value.replace(/[\\`*_{}\[\]()<>#+.!|~$-]/g, "\\$&");
const Arithmetic = Decimal.clone({
  precision: 64,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});

export function renderCheckedResponse(
  raw: string,
  sources: Source[],
  conversation: Conversation,
  presentation: "full" | "result" = "full",
): string {
  if (raw.length > 64000) throw new ContractError("FORMAT");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ContractError("INVALID_JSON");
  }
  const result = checkedResponseSchema.safeParse(parsed);
  if (!result.success) throw new ContractError("INVALID_SCHEMA");
  const data = result.data;
  if (new Set(sources.map((s) => s.id)).size !== sources.length)
    throw new ContractError("EVIDENCE");
  const users = conversation.messages.filter(
    (m) => m.role === "user" && m.included && m.status === "complete",
  );
  const checkEvidence = (evidence: Evidence) => {
    if (evidence.kind === "constant") return "(constant)";
    const original =
      evidence.kind === "source"
        ? sources.find((s) => s.id === evidence.sourceId)?.text
        : users[evidence.userTurn - 1]?.text;
    if (!evidence.quote.trim() || !original?.includes(evidence.quote))
      throw new ContractError("EVIDENCE");
    return evidence.kind === "source"
      ? `[${evidence.sourceId}]`
      : `(your message ${evidence.userTurn})`;
  };
  const values = new Map<string, Decimal>();
  const renderedInputs: string[] = [];
  for (const input of data.inputs) {
    const reference = checkEvidence(input.evidence);
    // Exact numeric tokens (written or canonical decimal form), bounded English
    // integer words, or an allowed constant; no inference of missing values.
    const tokens =
      input.evidence.kind === "constant"
        ? [...CONSTANT_OPERANDS]
        : evidenceNumberTokens(input.evidence.quote);
    if (!tokens.includes(input.value)) throw new ContractError("OPERAND");
    if (values.has(input.id)) throw new ContractError("DEPENDENCY");
    values.set(input.id, new Arithmetic(input.value));
    renderedInputs.push(
      input.evidence.kind === "constant"
        ? `- ${escape(input.id)} = ${input.value}; constant`
        : `- ${escape(input.id)} = ${input.value}; “${escape(input.evidence.quote)}” ${reference}`,
    );
  }
  const renderedSteps: string[] = [];
  const stepIds = new Set<string>();
  for (const step of data.steps) {
    const left = values.get(step.left),
      right = values.get(step.right);
    if (!left || !right || values.has(step.id))
      throw new ContractError("DEPENDENCY");
    if ((step.op === "divide" || step.op === "ratioPercent") && right.isZero())
      throw new ContractError("ARITHMETIC");
    const computed =
      step.op === "add"
        ? left.plus(right)
        : step.op === "subtract"
          ? left.minus(right)
          : step.op === "multiply"
            ? left.times(right)
            : step.op === "divide"
              ? left.div(right)
              : step.op === "ratioPercent"
                ? left.div(right).times(100)
                : left.times(right).div(100);
    if (
      !computed.isFinite() ||
      computed.abs().gt("1e24") ||
      (!computed.isZero() && computed.abs().lt("1e-24"))
    )
      throw new ContractError("ARITHMETIC");
    values.set(step.id, computed);
    stepIds.add(step.id);
    const operation = {
      add: "+",
      subtract: "−",
      multiply: "×",
      divide: "÷",
      percentOf: "×",
      ratioPercent: "÷",
    }[step.op];
    renderedSteps.push(
      `- ${escape(step.id)}: ${left.toString()} ${operation} ${right.toString()}${step.op === "percentOf" ? " ÷ 100" : step.op === "ratioPercent" ? " × 100" : ""} = ${computed.toString()}`,
    );
  }
  if ((data.inputs.length || data.steps.length) && !data.results.length)
    throw new ContractError("EMPTY");
  const seenResults = new Set<string>();
  const totals = data.results.map((r) => {
    if (!stepIds.has(r.id) || seenResults.has(r.id))
      throw new ContractError("DEPENDENCY");
    seenResults.add(r.id);
    return `**${escape(r.id)}: ${values.get(r.id)!.toFixed(r.decimals)}**`;
  });
  if (presentation === "result") {
    if (
      data.results.length !== 1 ||
      data.passages.length ||
      data.limitation !== "none"
    )
      throw new ContractError("FORMAT");
    const result = data.results[0];
    return values.get(result.id)!.toFixed(result.decimals);
  }
  const passages = data.passages.map((e) => {
    // A passage is a quotation; a constant has none.
    if (e.kind === "constant") throw new ContractError("EVIDENCE");
    return `> ${escape(e.quote).replace(/\n/g, "\n> ")}\n\n${checkEvidence(e)}`;
  });
  if (!totals.length && !passages.length && data.limitation === "none")
    throw new ContractError("EMPTY");
  return [
    totals.length
      ? `### Calculated results\n${totals.join("\n\n")}\n\nArithmetic calculated locally; the choice of inputs, units and operations still needs review.\n\nInputs:\n${renderedInputs.join("\n")}\n\nCalculation:\n${renderedSteps.join("\n")}`
      : "",
    passages.length
      ? `### Selected evidence — exact wording\n${passages.join("\n\n")}`
      : "",
    data.limitation === "insufficient"
      ? "This checked format cannot establish a complete answer from the supplied information."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function consumeCheckedResponse(
  stream: AsyncIterable<ChatCompletionChunk>,
  pricing: Qualification["pricing"],
  signal: AbortSignal,
  sources: Source[],
  conversation: Conversation,
  onChunk: (text: string) => void,
  onDiagnosticDraft?: (raw: string) => void,
  renderer: typeof renderCheckedResponse = renderCheckedResponse,
) {
  let raw = "",
    oversized = false;
  const usage = await consumeReply(stream, pricing, signal, (chunk) => {
    if (raw.length + chunk.length > 64000) oversized = true;
    if (!oversized) raw += chunk;
  });
  signal.throwIfAborted();
  // Explicit evaluation hook only; the normal application supplies no recorder.
  if (!oversized) onDiagnosticDraft?.(raw);
  try {
    if (oversized) throw new ContractError("FORMAT");
    let answer: string;
    try {
      answer = renderer(raw, sources, conversation);
    } catch (error) {
      if (error instanceof ContractError) throw error;
      throw new ContractError("INVALID_SCHEMA");
    }
    signal.throwIfAborted();
    onChunk(answer);
    return usage;
  } catch (error) {
    if (error instanceof ContractError)
      throw new CheckedResponseError(error.code, usage);
    throw error;
  }
}
