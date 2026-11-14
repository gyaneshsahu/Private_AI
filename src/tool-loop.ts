// The tool loop for code execution (docs/code-execution-20261114.md): read a streamed reply,
// put its tool calls together, run each on this device, send the results back, and repeat until
// the model answers in text. At most MAX_TOOL_ROUNDS rounds of code per user message.
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Qualification, Usage } from "../shared/contracts";
import {
  BAD_CALL_OUTPUT,
  MAX_CODE_RUNS,
  UNAVAILABLE_OUTPUT,
  wireSize,
  type CodeResult,
  type CodeRun,
  type WireMessage,
} from "./code-tool";
import { AttestationBusyError } from "./providers/inference-client";
import { CODE_LIMIT } from "./python-sandbox";
import { consumeReply, IncompleteReplyError } from "./reply-stream";
import { StreamProtocolError } from "./stream-failure";
import { chatErrorText } from "./text/chat-errors";
import { codeText } from "./text/code";
import { textFor } from "./text/core";

export const MAX_TOOL_ROUNDS = 3;
export const MAX_CALLS_PER_ROUND = 4;
const MAX_ARGUMENT_CHARACTERS = 32_000;

export type ToolCall = { id: string; name: string; arguments: string };

/**
 * One streamed reply. Text goes to `onChunk` as it arrives; `delta.tool_calls` fragments are
 * joined by their index. Everything else (usage rules, limits, failure classes) is consumeReply's.
 * A reply that ends with tool calls returns them; a plain answer returns none.
 */
export async function consumeToolTurn(
  stream: AsyncIterable<ChatCompletionChunk>,
  pricing: Qualification["pricing"],
  signal: AbortSignal,
  onChunk: (text: string) => void,
): Promise<{ usage: Usage | undefined; calls: ToolCall[]; text: string }> {
  const calls: Partial<ToolCall>[] = [];
  let text = "";
  let size = 0;
  let closing = false;
  async function* withoutTools(): AsyncGenerator<ChatCompletionChunk> {
    for await (const event of stream) {
      const choice = event.choices?.[0];
      if (!choice?.delta || typeof choice.delta !== "object") {
        yield event;
        continue;
      }
      const fragments = choice.delta.tool_calls;
      if (fragments != null && !Array.isArray(fragments)) throw new StreamProtocolError("INVALID_CHOICE");
      for (const [position, fragment] of (fragments ?? []).entries()) {
        // Some servers leave the index out when a chunk carries whole calls.
        const index = fragment.index ?? position;
        if (!Number.isInteger(index) || index < 0 || index >= MAX_CALLS_PER_ROUND)
          throw new StreamProtocolError("INVALID_CHOICE");
        const call = (calls[index] ??= { arguments: "" });
        if (typeof fragment.id === "string" && fragment.id) call.id = fragment.id.slice(0, 128);
        if (typeof fragment.function?.name === "string" && fragment.function.name) call.name ??= fragment.function.name;
        if (typeof fragment.function?.arguments === "string") {
          call.arguments += fragment.function.arguments;
          if ((size += fragment.function.arguments.length) > MAX_ARGUMENT_CHARACTERS)
            throw new StreamProtocolError("FRAME_TOO_LARGE");
        }
      }
      if (typeof choice.delta.content === "string") text += choice.delta.content;
      // The reply ends in tool calls: consumeReply sees a finished answer with one marker
      // character, which `closing` keeps away from the user.
      closing = calls.length > 0 && (choice.finish_reason === "tool_calls" || choice.finish_reason === "stop");
      yield {
        ...event,
        choices: [
          {
            ...choice,
            delta: { role: choice.delta.role, content: closing ? "." : choice.delta.content, refusal: choice.delta.refusal },
            finish_reason: closing ? "stop" : choice.finish_reason,
          },
        ],
      };
    }
  }
  const usage = await consumeReply(withoutTools(), pricing, signal, (chunk) => {
    if (!closing) onChunk(chunk);
  });
  return {
    usage,
    text,
    calls: Array.from(calls, (call, index) => ({
      id: call?.id ?? `call_${index}`,
      name: call?.name ?? "",
      arguments: call?.arguments ?? "",
    })),
  };
}

const sum = (a: Usage | undefined, b: Usage | undefined): Usage | undefined =>
  a && b
    ? {
        input: a.input + b.input,
        output: a.output + b.output,
        total: a.total + b.total,
        estimatedUSD: a.estimatedUSD + b.estimatedUSD,
      }
    : (a ?? b);

/**
 * Runs the loop. `first` is the reply to the request already sent with `messages`; `next` sends
 * a follow-up request. `run` executes code and rejects when the runtime cannot start: the model
 * is then told to answer without the tool and `onRuns` reports it. `onRuns` is called after each
 * round with every run so far; text streamed before it was a preamble and no longer counts.
 * `restore` and `mask` are the identifier masking of this message: code runs with the user's
 * real values, and nothing unmasked goes back out.
 */
export async function runToolLoop(options: {
  first: AsyncIterable<ChatCompletionChunk>;
  messages: WireMessage[];
  next: (messages: WireMessage[]) => Promise<AsyncIterable<ChatCompletionChunk>>;
  run: (code: string, signal: AbortSignal) => Promise<CodeResult>;
  pricing: Qualification["pricing"];
  signal: AbortSignal;
  maxCharacters: number;
  onChunk: (text: string) => void;
  onStatus: (text: string) => void;
  onRuns: (runs: CodeRun[], unavailable: boolean) => void;
  mask?: (text: string) => string;
  restore?: (text: string) => string;
}): Promise<Usage | undefined> {
  const { signal, mask = (text) => text, restore = (text) => text } = options;
  let messages = options.messages;
  let stream = options.first;
  let usage: Usage | undefined;
  let unavailable = false;
  const runs: CodeRun[] = [];
  const stop = (reason: string) =>
    new IncompleteReplyError(textFor(chatErrorText).partialExcluded(reason), usage);
  const stopped = () =>
    stop(
      signal.reason?.name === "TimeoutError"
        ? textFor(chatErrorText).timedOut
        : textFor(chatErrorText).calculationStopped,
    );
  for (let round = 0; ; round++) {
    let turn;
    try {
      turn = await consumeToolTurn(stream, options.pricing, signal, options.onChunk);
    } catch (error) {
      // Earlier rounds were billed too: the failure carries the whole message's usage.
      if (error instanceof IncompleteReplyError && usage)
        throw new IncompleteReplyError(error.message, sum(usage, error.usage), error.diagnostic);
      throw error;
    }
    usage = sum(usage, turn.usage);
    if (!turn.calls.length) return usage;
    if (round === MAX_TOOL_ROUNDS) throw stop(textFor(codeText).tooManyRounds);
    options.onStatus(textFor(codeText).calculating);
    const calls = turn.calls.map((call) => ({
      id: call.id,
      type: "function" as const,
      function: { name: "python" as const, arguments: call.arguments },
    }));
    messages = [...messages, { role: "assistant", content: turn.text, tool_calls: calls }];
    for (const call of turn.calls) {
      let code: unknown;
      try {
        code = call.name === "python" ? JSON.parse(call.arguments).code : undefined;
      } catch {
        /* a malformed call gets the error message below, as in the tested harness */
      }
      let result: CodeResult;
      if (typeof code !== "string") result = { output: BAD_CALL_OUTPUT, error: true };
      else if (unavailable) result = { output: UNAVAILABLE_OUTPUT, error: true };
      else
        try {
          result = await options.run(restore(code), signal);
        } catch {
          if (signal.aborted) throw stopped();
          unavailable = true;
          result = { output: UNAVAILABLE_OUTPUT, error: true };
        }
      if (typeof code === "string" && !unavailable && runs.length < MAX_CODE_RUNS)
        runs.push({ code: restore(code).slice(0, CODE_LIMIT), ...result });
      messages.push({ role: "tool", tool_call_id: call.id, content: mask(result.output) });
    }
    if (signal.aborted) throw stopped();
    options.onRuns([...runs], unavailable);
    if (wireSize(messages) > options.maxCharacters) throw stop(textFor(codeText).tooLargeFollowUp);
    try {
      stream = await options.next(messages);
    } catch (error) {
      // A busy verification keeps its own message and countdown; anything else keeps the usage.
      if (error instanceof AttestationBusyError || error instanceof IncompleteReplyError) throw error;
      throw signal.aborted
        ? stopped()
        : new IncompleteReplyError(textFor(chatErrorText).continuationStopped, usage);
    }
  }
}
