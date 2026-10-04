import { describe, it, expect } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { consumeReply, IncompleteReplyError } from "../src/reply-stream";

const pricing = {
  inputPerMillion: 1,
  outputPerMillion: 2,
  currency: "USD" as const,
};
function chunk(
  text: string,
  finish: ChatCompletionChunk.Choice["finish_reason"] = null,
): ChatCompletionChunk {
  return {
    id: "fixture",
    object: "chat.completion.chunk",
    created: 0,
    model: "fixture-only",
    choices: [{ index: 0, delta: { content: text }, finish_reason: finish }],
  };
}
const usage: ChatCompletionChunk = {
  ...chunk(""),
  choices: [],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};
async function* events(items: ChatCompletionChunk[]) {
  yield* items;
}
const run = (
  items: ChatCompletionChunk[],
  signal = new AbortController().signal,
) => consumeReply(events(items), pricing, signal, () => {});

describe("synthetic stream protocol checks, not live provider evidence", () => {
  it("accepts explicit text completion and a later usage-only frame", async () => {
    await expect(
      run([chunk("Hello"), chunk("", "stop"), usage]),
    ).resolves.toMatchObject({ input: 10, output: 5, total: 15 });
  });
  it.each(["length", "content_filter", "tool_calls", "function_call"] as const)(
    "keeps %s termination partial and retains reported usage",
    async (finish) => {
      await expect(
        run([chunk("Partial", finish), usage]),
      ).rejects.toMatchObject({
        name: "IncompleteReplyError",
        usage: { total: 15 },
      });
    },
  );
  it("rejects empty streams, silent EOF, empty completions and post-completion text", async () => {
    for (const items of [
      [],
      [chunk("cut off")],
      [chunk("", "stop")],
      [chunk("Done", "stop"), chunk("extra")],
    ])
      await expect(run(items)).rejects.toBeInstanceOf(IncompleteReplyError);
  });
  it("preserves refusal text when the provider completes it normally", async () => {
    const event = chunk("", "stop");
    event.choices[0].delta.refusal = "I cannot help with that request.";
    let text = "";
    await consumeReply(
      events([event]),
      pricing,
      new AbortController().signal,
      (s) => {
        text += s;
      },
    );
    expect(text).toBe("I cannot help with that request.");
  });
  it("rejects malformed usage and unsolicited tools even with a stop reason", async () => {
    await expect(
      run([
        chunk("Done", "stop"),
        {
          ...usage,
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: -1 },
        },
      ]),
    ).rejects.toBeInstanceOf(IncompleteReplyError);
    const tool = chunk("Text", "stop");
    tool.choices[0].delta.tool_calls = [
      {
        index: 0,
        id: "fixture",
        type: "function",
        function: { name: "search", arguments: "{}" },
      },
    ];
    await expect(run([tool])).rejects.toBeInstanceOf(IncompleteReplyError);
  });
  it("rejects cancellation and a transport error after visible text", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      run([chunk("Done", "stop")], controller.signal),
    ).rejects.toBeInstanceOf(IncompleteReplyError);
    async function* broken() {
      yield chunk("Partial");
      throw new Error("connection lost");
    }
    await expect(
      consumeReply(broken(), pricing, new AbortController().signal, () => {}),
    ).rejects.toBeInstanceOf(IncompleteReplyError);
  });
});

it("rejects non-text deltas, duplicate choices and duplicate accounting without losing the first valid usage", async () => {
  const malformed = chunk("text", "stop");
  malformed.choices[0].delta.content = {
    secret: "PRIVATE_TEST",
  } as unknown as string;
  await expect(run([malformed])).rejects.toBeInstanceOf(IncompleteReplyError);
  const duplicate = chunk("text", "stop");
  duplicate.choices.push(duplicate.choices[0]);
  await expect(run([duplicate])).rejects.toBeInstanceOf(IncompleteReplyError);
  await expect(
    run([chunk("done", "stop"), usage, usage]),
  ).rejects.toMatchObject({ usage: { total: 15 } });
});
