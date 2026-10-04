import { it, expect, vi } from "vitest";
import { completionEvents } from "../src/completion-events";
import { consumeReply, IncompleteReplyError } from "../src/reply-stream";
const signal = () => new AbortController().signal;
const event = {
  choices: [
    { index: 0, delta: { content: "Valid € answer" }, finish_reason: "stop" },
  ],
};
const usage = {
  choices: [],
  usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
};
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const pricing = {
  inputPerMillion: 1,
  outputPerMillion: 1,
  currency: "USD" as const,
};
const run = (body: string) =>
  consumeReply(
    completionEvents(new Response(body), signal()),
    pricing,
    signal(),
    () => {},
  );

it("parses split UTF-8 bytes, CRLF, comments and usage; requires explicit completion", async () => {
  const data = new TextEncoder().encode(
    `: keepalive\n\n${frame(event)}${frame(usage)}data: [DONE]\n\n`.replaceAll(
      "\n",
      "\r\n",
    ),
  );
  let offset = 0;
  const response = new Response(
    new ReadableStream({
      pull(c) {
        if (offset === data.length) c.close();
        else c.enqueue(data.slice(offset, ++offset));
      },
    }),
  );
  const received = [];
  for await (const item of completionEvents(response, signal()))
    received.push(item);
  expect(received).toEqual([event, usage]);
});
it.each([
  frame(event),
  `${frame(event)}${frame(usage)}data: [DONE]`,
  `${frame(event)}data: [DONE]\n\n${frame(event)}`,
  `event: thread.error\ndata: PRIVATE_CANARY_INVALID_JSON\n\n`,
  `data: PRIVATE_CANARY_INVALID_JSON\n\n`,
  `data: ${"x".repeat(256 * 1024 + 1)}`,
  frame({ error: "PRIVATE_CANARY_UPSTREAM_ERROR" }),
])(
  "rejects malformed/truncated protocol without exposing frame contents (#%#)",
  async (body) => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(run(body)).rejects.toBeInstanceOf(IncompleteReplyError);
      expect(logger).not.toHaveBeenCalled();
    } finally {
      logger.mockRestore();
    }
  },
);
it("cancels a pending read promptly and cancels abandoned consumers", async () => {
  let cancelled = 0;
  const controller = new AbortController();
  const response = new Response(
    new ReadableStream({
      cancel() {
        cancelled++;
      },
    }),
  );
  const pending = completionEvents(response, controller.signal).next();
  controller.abort();
  await expect(pending).rejects.toThrow();
  expect(cancelled).toBe(1);
  const second = new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(frame(event)));
      },
      cancel() {
        cancelled++;
      },
    }),
  );
  for await (const _item of completionEvents(second, signal())) break;
  expect(cancelled).toBe(2);
});
it("retains received usage while rejecting missing terminal marker", async () => {
  await expect(run(frame(event) + frame(usage))).rejects.toMatchObject({
    usage: { total: 5 },
  });
});
