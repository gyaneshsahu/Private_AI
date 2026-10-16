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
]);
export const calculatorArguments = z
  .object({
    unit: calculatorUnit,
    program: checkedResponseSchema.extend({
      inputs: checkedResponseSchema.shape.inputs.min(1),
      steps: checkedResponseSchema.shape.steps.min(1),
      results: z
        .array(
          checkedResponseSchema.shape.results.element.extend({
            unit: calculatorUnit.optional(),
          }),
        )
        .min(1)
        .max(4),
      passages: checkedResponseSchema.shape.passages.max(0),
      limitation: z.literal("none"),
    }),
  })
  .strict();
export const calculatorTool = {
  type: "function" as const,
  function: {
    name: "calculate",
    description:
      "Compute up to four named derived results in one call. Each result references a step id and may specify its own unit; otherwise the top-level unit applies. Compute a requested derived quantity from exact source or user operands. Use ordinary text for explanations and questions. No arbitrary code. The application displays the result directly; operation and unit selection still need to match the question.",
    parameters: z.toJSONSchema(calculatorArguments),
  },
};
export class CalculatorValidationError extends IncompleteReplyError {
  constructor(
    readonly calculatorFailure:
      "INVALID_JSON" | "INVALID_SCHEMA" | "EVIDENCE_OR_ARITHMETIC",
    usage: Usage,
    readonly schemaIssues?: { code: string; path: (string | number)[] }[],
  ) {
    super(
      "Calculation could not be validated. No automatic retry was made.",
      usage,
    );
  }
}
export type CalculatorTurn = {
  text: string;
  calculation?: { value: string; unit: string; references: string[] };
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
  onDiagnosticArguments?.(argumentsText);
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(argumentsText);
    } catch {
      throw new CalculatorValidationError("INVALID_JSON", usage);
    }
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
    if (
      new Set(args.program.results.map((r) => r.id)).size !==
      args.program.results.length
    )
      throw new CalculatorValidationError("INVALID_SCHEMA", usage);
    const values = args.program.results.map(({ id, decimals, unit }) => ({
      id,
      unit: unit ?? args.unit,
      value: renderCheckedResponse(
        JSON.stringify({ ...args.program, results: [{ id, decimals }] }),
        sources,
        conversation,
        "result",
      ),
    }));
    const references = [
      ...new Set(
        args.program.inputs.map((input) =>
          input.evidence.kind === "source"
            ? input.evidence.sourceId
            : `user:${input.evidence.userTurn}`,
        ),
      ),
    ];
    if (values.length === 1)
      return {
        text,
        calculation: {
          value: values[0].value,
          unit: values[0].unit,
          references,
        },
        usage,
      };
    return {
      text,
      calculations: values.map((value) => ({ ...value, references })),
      usage,
    };
  } catch (error) {
    if (error instanceof CalculatorValidationError) throw error;
    throw new CalculatorValidationError("EVIDENCE_OR_ARITHMETIC", usage);
  }
}

export function renderCalculatorTurn(turn: CalculatorTurn): string {
  const results =
    turn.calculations ??
    (turn.calculation ? [{ ...turn.calculation, id: "result" }] : []);
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
