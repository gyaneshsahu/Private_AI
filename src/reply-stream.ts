import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Qualification, Usage } from "../shared/contracts";
import { StreamProtocolError, type StreamFailureCode } from "./stream-failure";

export class IncompleteReplyError extends Error {
  constructor(
    message: string,
    public readonly usage?: Usage,
    public readonly diagnostic?: {
      code: StreamFailureCode;
      events: number;
      usageEvents: number;
      textCharacters: number;
      finish: string;
    },
  ) {
    super(message);
    this.name = "IncompleteReplyError";
  }
}

// Transport EOF is not evidence that the model finished its answer.
export async function consumeReply(
  stream: AsyncIterable<ChatCompletionChunk>,
  pricing: Qualification["pricing"],
  signal: AbortSignal,
  onChunk: (text: string) => void,
): Promise<Usage | undefined> {
  let usage: Usage | undefined;
  let finish: string | null = null;
  let hasText = false;
  let hasTools = false;
  let events = 0;
  let usageEvents = 0;
  let finalUsage = false;
  let textCharacters = 0;
  try {
    for await (const event of stream) {
      events++;
      signal.throwIfAborted();
      if (!Array.isArray(event.choices) || event.choices.length > 1)
        throw new StreamProtocolError("INVALID_CHOICES");
      const choice = event.choices[0];
      if (
        choice &&
        (choice.index !== 0 ||
          !choice.delta ||
          typeof choice.delta !== "object" ||
          [choice.delta.content, choice.delta.refusal].some(
            (value) => value != null && typeof value !== "string",
          ) ||
          (choice.finish_reason != null &&
            typeof choice.finish_reason !== "string"))
      )
        throw new StreamProtocolError("INVALID_CHOICE");
      if (choice) {
        if (finish !== null)
          throw new StreamProtocolError("CONTENT_AFTER_FINISH");
        hasTools ||= Boolean(
          (choice.delta.tool_calls != null &&
            (!Array.isArray(choice.delta.tool_calls) ||
              choice.delta.tool_calls.length > 0)) ||
          choice.delta.function_call != null,
        );
        const text = choice.delta.content || choice.delta.refusal;
        if (text) {
          hasText = true;
          textCharacters += text.length;
          onChunk(text);
        }
        if (choice.finish_reason) finish = choice.finish_reason;
      }
      if (event.usage) {
        usageEvents++;
        const {
          prompt_tokens: input,
          completion_tokens: output,
          total_tokens: total,
        } = event.usage;
        if (
          ![input, output, total].every(
            (n) => Number.isSafeInteger(n) && n >= 0,
          ) ||
          total !== input + output
        )
          throw new StreamProtocolError("INVALID_USAGE");
        if (usage && (input !== usage.input || output < usage.output))
          throw new StreamProtocolError("USAGE_REGRESSION");
        // Some providers report cumulative usage on every chunk, including
        // repeated zero-output snapshots before text. Replace, never sum them.
        finalUsage ||= finish !== null;
        usage = {
          input,
          output,
          total,
          estimatedUSD:
            (input * pricing.inputPerMillion +
              output * pricing.outputPerMillion) /
            1e6,
        };
      }
    }
    signal.throwIfAborted();
    if (finish !== "stop" || !hasText || hasTools)
      throw new StreamProtocolError("INCOMPLETE_ANSWER");
    if (usage && !finalUsage)
      throw new StreamProtocolError("MISSING_FINAL_USAGE");
    return usage;
  } catch (error) {
    const timedOut = signal.aborted && signal.reason?.name === "TimeoutError";
    throw new IncompleteReplyError(
      `${timedOut ? "Response timed out." : "Response incomplete."} Partial answers are excluded from future context. No automatic retry was made.`,
      usage,
      {
        code:
          error instanceof StreamProtocolError
            ? error.code
            : signal.aborted
              ? timedOut
                ? "TIMED_OUT"
                : "ABORTED"
              : "TRANSPORT_OR_DECRYPTION",
        events,
        usageEvents,
        textCharacters,
        finish:
          finish === null
            ? "NONE"
            : [
                  "stop",
                  "length",
                  "content_filter",
                  "tool_calls",
                  "function_call",
                ].includes(finish)
              ? finish
              : "OTHER",
      },
    );
  }
}
