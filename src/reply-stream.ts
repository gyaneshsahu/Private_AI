import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Qualification, Usage } from "../shared/contracts";

export class IncompleteReplyError extends Error {
  constructor(
    message: string,
    public readonly usage?: Usage,
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
  try {
    for await (const event of stream) {
      signal.throwIfAborted();
      if (!Array.isArray(event.choices) || event.choices.length > 1)
        throw new Error("Invalid response choices.");
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
        throw new Error("Invalid response choice.");
      if (choice) {
        if (finish !== null)
          throw new Error("Unexpected content after completion.");
        hasTools ||= Boolean(
          (choice.delta.tool_calls != null &&
            (!Array.isArray(choice.delta.tool_calls) ||
              choice.delta.tool_calls.length > 0)) ||
          choice.delta.function_call != null,
        );
        const text = choice.delta.content || choice.delta.refusal;
        if (text) {
          hasText = true;
          onChunk(text);
        }
        if (choice.finish_reason) finish = choice.finish_reason;
      }
      if (event.usage) {
        if (usage) throw new Error("Repeated provider usage.");
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
          throw new Error("Invalid provider usage.");
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
      throw new Error("The provider did not return a complete text answer.");
    return usage;
  } catch {
    throw new IncompleteReplyError(
      "Response incomplete. Partial answers are excluded from future context. No automatic retry was made.",
      usage,
    );
  }
}
