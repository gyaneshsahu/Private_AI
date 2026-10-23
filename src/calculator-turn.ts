import { z } from "zod";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type {
  Conversation,
  Qualification,
  Source,
  Usage,
} from "../shared/contracts";
import {
  checkedResponseSchema,
  checkedFailureCode,
  type CheckedFailure,
  renderCheckedResponse,
} from "./checked-response";
import { consumeReply, IncompleteReplyError } from "./reply-stream";

const calculatorUnit = z.enum([
  "EUR",
  "GBP",
  "USD",
  "count",
  "%",
  "m",
  "km",
  "s",
  "h",
  "W",
  "kW",
  "Wh",
  "kWh",
  "min",
  "d",
]);
export const calculatorArguments = z
  .object({
    unit: calculatorUnit,
    inputs: checkedResponseSchema.shape.inputs.min(1),
    steps: checkedResponseSchema.shape.steps.min(1),
    results: z
      .array(
        checkedResponseSchema.shape.results.element.extend({
          unit: calculatorUnit.optional(),
        }),
      )
      .min(1)
      .max(12),
  })
  .strict();
export const calculatorTool = {
  type: "function" as const,
  function: {
    name: "calculate",
    description:
      "Compute up to twelve derived results in one call. Each entry in results names the id of an existing step (results[].id must equal a steps[].id; do not invent new result names) and may specify its own unit; otherwise the top-level unit applies. Compute a requested derived quantity from exact source or user operands. Use ordinary text for explanations and questions. Input evidence refers only to exact supplied-source or user-message quotations, or {kind:'constant'} for a calendar or unit constant (1, 2, 7, 12, 24, 30, 52, 60, 100, 365, 366, 1000); an earlier assistant answer is not a user message. An operand value may be the number as written or its plain decimal form (1234.56 for 1.234,56 or 1,234.56); clock times are handled as minutes (unit min) and days (unit d). No arbitrary code. The application displays the result directly; operation and unit selection still need to match the question.",
    parameters: z.toJSONSchema(calculatorArguments),
  },
};
/**
 * Models often write an input's evidence as the bare quotation ("2.345,67 EUR")
 * or as an object without `kind`. Resolve such shorthand to the strict shape
 * when, and only when, the quotation occurs verbatim in a supplied source or an
 * included user message (latest first); anything else is left for the schema
 * to refuse. No value is ever inferred.
 */
export function normalizeEvidenceShorthand(
  parsed: unknown,
  sources: Source[],
  conversation: Conversation,
): unknown {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return parsed;
  const args = parsed as { inputs?: unknown };
  if (!Array.isArray(args.inputs)) return parsed;
  const users = conversation.messages.filter(
    (m) => m.role === "user" && m.included && m.status === "complete",
  );
  const resolve = (quote: string) => {
    if (!quote.trim()) return undefined;
    for (let turn = users.length; turn >= 1; turn--)
      if (users[turn - 1].text.includes(quote))
        return { kind: "user", userTurn: turn, quote };
    const source = sources.find((s) => s.text.includes(quote));
    return source ? { kind: "source", sourceId: source.id, quote } : undefined;
  };
  const inputs = args.inputs.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input))
      return input;
    const candidate = input as { evidence?: unknown };
    const evidence = candidate.evidence;
    if (typeof evidence === "string")
      return { ...candidate, evidence: resolve(evidence) ?? evidence };
    if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
      const e = evidence as Record<string, unknown>;
      if (e.kind === undefined) {
        if (typeof e.sourceId === "string")
          return { ...candidate, evidence: { kind: "source", ...e } };
        if (typeof e.userTurn === "number")
          return { ...candidate, evidence: { kind: "user", ...e } };
        if (typeof e.quote === "string" && Object.keys(e).length === 1)
          return { ...candidate, evidence: resolve(e.quote) ?? evidence };
      }
    }
    return input;
  });
  // A step operand written as a number ("2435.67") instead of an input id is
  // accepted only when exactly one input carries that same value; it is then
  // the input's id. No new value enters the calculation this way.
  const argsWithSteps = parsed as { steps?: unknown };
  const valueIds = new Map<string, string[]>();
  for (const input of inputs) {
    if (!input || typeof input !== "object") continue;
    const { id, value } = input as { id?: unknown; value?: unknown };
    if (typeof id !== "string" || typeof value !== "string") continue;
    const key = normalizeDecimal(value);
    if (key === undefined) continue;
    valueIds.set(key, [...(valueIds.get(key) ?? []), id]);
  }
  const resolveOperand = (operand: unknown) => {
    if (typeof operand !== "string") return operand;
    const key = normalizeDecimal(operand);
    const ids = key === undefined ? undefined : valueIds.get(key);
    return ids && ids.length === 1 ? ids[0] : operand;
  };
  const steps = Array.isArray(argsWithSteps.steps)
    ? argsWithSteps.steps.map((step) =>
        step && typeof step === "object" && !Array.isArray(step)
          ? {
              ...(step as object),
              left: resolveOperand((step as { left?: unknown }).left),
              right: resolveOperand((step as { right?: unknown }).right),
            }
          : step,
      )
    : argsWithSteps.steps;
  return { ...(parsed as object), inputs, steps };
}

function normalizeDecimal(text: string): string | undefined {
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return undefined;
  const [integer, fraction = ""] = text.replace(/^-/, "").split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return `${text.startsWith("-") ? "-" : ""}${integer.replace(/^0+(?=\d)/, "")}${trimmed ? "." + trimmed : ""}`;
}

export class CalculatorValidationError extends IncompleteReplyError {
  constructor(
    readonly calculatorFailure:
      "INVALID_JSON" | "INVALID_SCHEMA" | "EVIDENCE_OR_ARITHMETIC",
    usage: Usage,
    readonly schemaIssues?: { code: string; path: (string | number)[] }[],
    readonly validationDetail?: CheckedFailure,
  ) {
    super(
      "Calculation could not be validated. No automatic retry was made.",
      usage,
    );
  }
}
export type CalculatorTurn = {
  toolCall?: { id: string; arguments: string };
  text: string;
  calculation?: {
    id?: string;
    value: string;
    unit: string;
    references: string[];
  };
  calculations?: {
    id: string;
    value: string;
    unit: string;
    references: string[];
  }[];
  usage: Usage;
};

// Offline prototype: exactly one already-authorized inference stream, no callbacks
// capable of requesting more inference and no execution of provider-supplied code.
export async function consumeCalculatorTurn(
  stream: AsyncIterable<ChatCompletionChunk>,
  pricing: Qualification["pricing"],
  signal: AbortSignal,
  sources: Source[],
  conversation: Conversation,
  onDiagnosticArguments?: (raw: string) => void,
  prepareArguments?: (raw: string) => string,
  onValidatedArguments?: (raw: string) => void,
): Promise<CalculatorTurn> {
  let text = "";
  let argumentsText = "";
  let callId: string | undefined;
  let name: string | undefined;
  let toolFinished = false;
  let sawTool = false;
  async function* normalize(): AsyncGenerator<ChatCompletionChunk> {
    for await (const event of stream) {
      signal.throwIfAborted();
      const choice = event.choices?.[0];
      if (!choice) {
        yield event;
        continue;
      }
      if (
        event.choices.length !== 1 ||
        choice.delta.function_call ||
        choice.delta.refusal
      )
        throw Error("Unsupported calculator stream");
      const calls = choice.delta.tool_calls;
      if (calls != null && !Array.isArray(calls))
        throw Error("Invalid tool list");
      if (calls?.length) {
        if (calls.length !== 1 || calls[0].index !== 0)
          throw Error("Only one calculation per reply");
        const call = calls[0];
        sawTool = true;
        if (call.type !== undefined && call.type !== "function")
          throw Error("Unsupported tool type");
        if (call.id !== undefined) {
          if (callId !== undefined && callId !== call.id)
            throw Error("Changed tool identity");
          if (!call.id || call.id.length > 128)
            throw Error("Invalid tool identity");
          callId = call.id;
        }
        if (call.function?.name !== undefined) {
          if (name !== undefined && name !== call.function.name)
            throw Error("Changed tool name");
          name = call.function.name;
        }
        if (call.function?.arguments !== undefined) {
          if (typeof call.function.arguments !== "string")
            throw Error("Invalid arguments");
          argumentsText += call.function.arguments;
          if (argumentsText.length > 32000)
            throw Error("Calculation too large");
        }
      }
      if (choice.delta.content) {
        if (typeof choice.delta.content !== "string")
          throw Error("Invalid text");
        text += choice.delta.content;
        if (text.length > 32000) throw Error("Answer too large");
      }
      if (choice.finish_reason === "tool_calls") {
        if (!sawTool || !callId || name !== "calculate")
          throw Error("Invalid calculation finish");
        toolFinished = true;
      } else if (choice.finish_reason && sawTool)
        throw Error("Calculation not completed");
      yield {
        ...event,
        choices: [
          {
            ...choice,
            delta: {
              role: choice.delta.role,
              content:
                choice.delta.content ||
                (toolFinished ? "calculation completed" : ""),
            },
            finish_reason: toolFinished ? "stop" : choice.finish_reason,
          },
        ],
      };
    }
  }
  const usage = await consumeReply(normalize(), pricing, signal, () => {});
  if (!usage)
    throw new IncompleteReplyError(
      "Calculator prototype requires final usage; no retry was made.",
    );
  if (!sawTool) return { text, usage };
  const originalArguments = argumentsText;
  onDiagnosticArguments?.(argumentsText);
  try {
    if (prepareArguments) argumentsText = prepareArguments(argumentsText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(argumentsText);
    } catch {
      throw new CalculatorValidationError("INVALID_JSON", usage);
    }
    parsed = normalizeEvidenceShorthand(parsed, sources, conversation);
    const validated = calculatorArguments.safeParse(parsed);
    if (!validated.success) {
      const knownFields = new Set([
        "unit",
        "program",
        "inputs",
        "steps",
        "results",
        "passages",
        "limitation",
        "id",
        "value",
        "evidence",
        "kind",
        "sourceId",
        "quote",
        "userTurn",
        "op",
        "left",
        "right",
        "decimals",
      ]);
      const issues = validated.error.issues.slice(0, 8).map((issue) => ({
        code: issue.code,
        path: issue.path.map((part) =>
          typeof part === "number"
            ? part
            : knownFields.has(String(part))
              ? String(part)
              : "unknown_field",
        ),
      }));
      throw new CalculatorValidationError("INVALID_SCHEMA", usage, issues);
    }
    const args = validated.data;
    if (new Set(args.results.map((r) => r.id)).size !== args.results.length)
      throw new CalculatorValidationError("INVALID_SCHEMA", usage);
    const values = args.results.map(({ id, decimals, unit }) => ({
      id,
      unit: unit ?? args.unit,
      value: renderCheckedResponse(
        JSON.stringify({
          inputs: args.inputs,
          steps: args.steps,
          results: [{ id, decimals }],
          passages: [],
          limitation: "none",
        }),
        sources,
        conversation,
        "result",
      ),
    }));
    const references = [
      ...new Set(
        args.inputs.flatMap((input) =>
          input.evidence.kind === "source"
            ? [input.evidence.sourceId]
            : input.evidence.kind === "user"
              ? [`user:${input.evidence.userTurn}`]
              : [],
        ),
      ),
    ];
    onValidatedArguments?.(JSON.stringify(args));
    if (values.length === 1)
      return {
        text,
        toolCall: { id: callId!, arguments: originalArguments },
        calculation: {
          id: values[0].id,
          value: values[0].value,
          unit: values[0].unit,
          references,
        },
        usage,
      };
    return {
      text,
      toolCall: { id: callId!, arguments: originalArguments },
      calculations: values.map((value) => ({ ...value, references })),
      usage,
    };
  } catch (error) {
    if (error instanceof CalculatorValidationError) throw error;
    throw new CalculatorValidationError(
      "EVIDENCE_OR_ARITHMETIC",
      usage,
      undefined,
      checkedFailureCode(error),
    );
  }
}

export function renderCalculatorTurn(turn: CalculatorTurn): string {
  const results =
    turn.calculations ??
    (turn.calculation
      ? [{ ...turn.calculation, id: turn.calculation.id ?? "result" }]
      : []);
  if (!results.length) return turn.text;
  return [
    turn.text,
    ...results.map(({ id, value, unit, references }) => {
      const citations = references
        .map((reference) =>
          reference.startsWith("user:")
            ? `(your message ${reference.slice(5)})`
            : `[${reference}]`,
        )
        .join(" ");
      const label = id.replaceAll("_", " ");
      return `**Calculated ${label}: ${value} ${unit}** ${citations}`;
    }),
    "Arithmetic calculated locally; the selected inputs, method and explanation are not independently verified.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
