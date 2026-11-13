// Thinking time limits (13 November): the waiting status and the first-text limit, through the
// real verified-chat path with a synthetic encrypted transport.
import { afterEach, expect, it, vi } from "vitest";
import { emptyConversation, REPLY_LIMITS } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { STILL_THINKING_AFTER_MS, stillThinkingStatus } from "../src/answer-modes";
import { streamVerifiedConversation, type VerifiedChatPolicy } from "../src/verified-chat";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("tinfoil", () => ({
  fetchAttestationBundle: async () => ({ domain: "inference.tinfoil.sh" }),
  Verifier: class {
    async verifyBundle() {}
    getVerificationDocument() {
      return {
        securityVerified: true,
        releaseDigest: "a".repeat(64),
        configRepo: "tinfoilsh/confidential-model-router",
        hpkePublicKey: "synthetic",
        enclaveHost: "inference.tinfoil.sh",
      };
    }
  },
}));
vi.mock("ehbp", () => ({
  Identity: { fromPublicKeyHex: async () => ({}) },
  Transport: class {
    request = request;
  },
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  request.mockReset();
});
const policy: VerifiedChatPolicy = {
  origin: "https://inference.tinfoil.sh",
  repository: "tinfoilsh/confidential-model-router",
  releaseDigests: ["a".repeat(64)],
  model: "synthetic",
  maxInputCharacters: 20000,
  maxOutputTokens: 4096,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  answerMode: "thinking",
};
const frame = (delta: object, finish: string | null = null) =>
  new TextEncoder().encode(
    `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`,
  );
function start(signal = new AbortController().signal) {
  vi.useFakeTimers();
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  request.mockResolvedValue(
    new Response(new ReadableStream({ start: (c) => void (stream = c) }), {
      headers: { "Content-Type": "text/event-stream" },
    }),
  );
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Synthetic check"));
  const statuses: string[] = [];
  const text: string[] = [];
  const reply = streamVerifiedConversation(
    c,
    policy,
    "synthetic",
    signal,
    (t) => text.push(t),
    (s) => statuses.push(s),
    () => {},
  );
  return { reply, statuses, text, stream: () => stream };
}

it("says it is still thinking after the threshold, and drops that once text arrives", async () => {
  const run = start();
  await vi.advanceTimersByTimeAsync(STILL_THINKING_AFTER_MS - 1);
  expect(request).toHaveBeenCalledTimes(1);
  expect(run.statuses.at(-1)).toBe("Receiving a protected response…");
  await vi.advanceTimersByTimeAsync(1);
  expect(run.statuses.at(-1)).toBe(stillThinkingStatus("thinking"));
  // Reasoning is not answer text: the status stays.
  run.stream().enqueue(frame({ reasoning_content: "synthetic reasoning" }));
  await vi.advanceTimersByTimeAsync(0);
  expect(run.statuses.at(-1)).toBe(stillThinkingStatus("thinking"));
  run.stream().enqueue(frame({ content: "Synthetic answer." }));
  await vi.advanceTimersByTimeAsync(0);
  expect(run.statuses.at(-1)).toBe("Receiving a protected response…");
  // Past the first-text limit, an answer that is writing is not cut off.
  await vi.advanceTimersByTimeAsync(REPLY_LIMITS.thinking.firstTextMs);
  run.stream().enqueue(frame({}, "stop"));
  run.stream().enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
  run.stream().close();
  await run.reply;
  expect(run.text.join("")).toBe("Synthetic answer.");
  expect(vi.getTimerCount()).toBe(0);
});

it("ends a silent Thinking reply at the mode's first-text limit as a time-out", async () => {
  const run = start();
  const failed = expect(run.reply).rejects.toMatchObject({
    message: expect.stringContaining("Response timed out."),
    diagnostic: expect.objectContaining({ code: "TIMED_OUT", textCharacters: 0 }),
  });
  await vi.advanceTimersByTimeAsync(REPLY_LIMITS.thinking.firstTextMs);
  await failed;
  expect(vi.getTimerCount()).toBe(0);
});

it("Stop ends a long silent wait at once and shows no later status", async () => {
  const stop = new AbortController();
  const run = start(stop.signal);
  const stopped = expect(run.reply).rejects.toMatchObject({
    diagnostic: expect.objectContaining({ code: "ABORTED" }),
  });
  await vi.advanceTimersByTimeAsync(REPLY_LIMITS.thinking.firstTextMs - 1000);
  const shown = run.statuses.length;
  stop.abort();
  await stopped;
  await vi.advanceTimersByTimeAsync(REPLY_LIMITS.thinking.totalMs);
  expect(run.statuses.length).toBe(shown);
  expect(vi.getTimerCount()).toBe(0);
});
