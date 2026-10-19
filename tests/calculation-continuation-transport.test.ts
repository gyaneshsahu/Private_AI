import { afterEach, expect, it, vi } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { createCalculationSession } from "../src/calculation-session";
import {
  streamVerifiedConversation,
  type VerifiedChatPolicy,
} from "../src/verified-chat";
const { request, verification } = vi.hoisted(() => ({
  request: vi.fn(),
  verification: { digest: "a" },
}));
vi.mock("tinfoil", () => ({
  fetchAttestationBundle: async () => ({ domain: "inference.tinfoil.sh" }),
  Verifier: class {
    async verifyBundle() {}
    getVerificationDocument() {
      return {
        securityVerified: true,
        releaseDigest: verification.digest.repeat(64),
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
  vi.unstubAllGlobals();
  request.mockReset();
  verification.digest = "a";
});
const policy: VerifiedChatPolicy = {
  origin: "https://inference.tinfoil.sh",
  repository: "tinfoilsh/confidential-model-router",
  releaseDigests: ["a".repeat(64)],
  model: "synthetic",
  maxInputCharacters: 20000,
  maxOutputTokens: 4096,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  assistedResearchContract: true,
  assistedStructuredOutput: true,
};
const args = JSON.stringify({
  unit: "EUR",
  inputs: [
    {
      id: "n",
      value: "7",
      evidence: { kind: "user", userTurn: 1, quote: "Add 7 and 7." },
    },
  ],
  steps: [{ id: "total", op: "add", left: "n", right: "n" }],
  results: [{ id: "total", decimals: 2 }],
});
function response(tool: boolean, finish = "stop", preamble = "") {
  const delta = tool
    ? {
        tool_calls: [
          {
            index: 0,
            id: "calc-1",
            type: "function",
            function: { name: "calculate", arguments: args },
          },
        ],
      }
    : { content: "Adding equal amounts doubles the amount." };
  if (tool && preamble) Object.assign(delta, { content: preamble });
  const events = [
    {
      choices: [
        { index: 0, delta, finish_reason: tool ? "tool_calls" : finish },
      ],
    },
    {
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    },
  ];
  return new Response(
    events.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("") +
      "data: [DONE]\n\n",
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
const continuationPolicy = {
  ...policy,
  assistedResearchContract: false,
  assistedStructuredOutput: false,
  optionalCalculator: true,
  calculatorContinuation: true,
};
function invoke(
  permit: ((signal: AbortSignal) => Promise<void>) | undefined,
  signal = new AbortController().signal,
  p = continuationPolicy,
) {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Add 7 and 7."));
  const chunks: string[] = [];
  const session = createCalculationSession();
  const result = streamVerifiedConversation(
    c,
    p,
    "synthetic",
    signal,
    (s) => chunks.push(s),
    () => {},
    () => {},
    undefined,
    undefined,
    undefined,
    session,
    undefined,
    permit,
  );
  return { result, chunks, c, session };
}
it("requires a distinct continuation capability before sending anything", async () => {
  const run = invoke(undefined);
  await expect(run.result).rejects.toThrow("separate request authorization");
  expect(request).not.toHaveBeenCalled();
});
it("delivers one completed explanation and original calculated values with two-call usage", async () => {
  request
    .mockResolvedValueOnce(response(true))
    .mockResolvedValueOnce(response(false));
  const permit = vi.fn(async () => {});
  const run = invoke(permit);
  expect(await run.result).toMatchObject({ input: 20, output: 20, total: 40 });
  expect(permit).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(2);
  expect(run.chunks).toHaveLength(1);
  expect(run.chunks[0]).toContain("doubles the amount");
  expect(run.chunks[0]).toContain("14.00 EUR");
  const first = JSON.parse(request.mock.calls[0][1].body),
    second = JSON.parse(request.mock.calls[1][1].body);
  expect(second.tool_choice).toBe("none");
  expect(second.max_completion_tokens).toBe(first.max_completion_tokens);
  expect(second.user_cache_secret).not.toBe(first.user_cache_secret);
  expect(second.messages.at(-1)).toMatchObject({
    role: "tool",
    tool_call_id: "calc-1",
  });
  expect(second.messages.at(-2).tool_calls[0].function.arguments).toBe(args);
  expect(run.c.messages).toHaveLength(1);
  expect(run.session.references(run.c)).toEqual([]);
});
it("does not spend a second request for an ordinary first answer", async () => {
  request.mockResolvedValueOnce(response(false));
  const permit = vi.fn(async () => {});
  const run = invoke(permit);
  expect(await run.result).toMatchObject({ total: 20 });
  expect(permit).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
});
it("denied second permit withholds the draft and retains first-call usage", async () => {
  request.mockResolvedValueOnce(response(true));
  const run = invoke(async () => {
    throw Error("Denied");
  });
  await expect(run.result).rejects.toMatchObject({ usage: { total: 20 } });
  expect(request).toHaveBeenCalledTimes(1);
  expect(run.chunks).toEqual([]);
});
it("aborting during second authorization prevents the second request", async () => {
  request.mockResolvedValueOnce(response(true));
  const controller = new AbortController();
  const run = invoke(async () => {
    controller.abort();
  }, controller.signal);
  await expect(run.result).rejects.toMatchObject({ usage: { total: 20 } });
  expect(request).toHaveBeenCalledTimes(1);
  expect(run.chunks).toEqual([]);
});
it("incomplete explanation preserves combined known usage and cannot publish or stage", async () => {
  request
    .mockResolvedValueOnce(response(true))
    .mockResolvedValueOnce(response(false, "length"));
  const run = invoke(async () => {}, undefined, {
    ...continuationPolicy,
    calculatorReplay: true,
  });
  await expect(run.result).rejects.toMatchObject({ usage: { total: 40 } });
  expect(run.chunks).toEqual([]);
  expect(run.session.references(run.c)).toEqual([]);
  expect(request).toHaveBeenCalledTimes(2);
});
it("further tool calls are rejected without requesting a third response", async () => {
  request
    .mockResolvedValueOnce(response(true))
    .mockResolvedValueOnce(response(true));
  const run = invoke(async () => {});
  await expect(run.result).rejects.toThrow("incomplete");
  expect(request).toHaveBeenCalledTimes(2);
  expect(run.chunks).toEqual([]);
});

it("changed deployment blocks the continuation before consuming its permit", async () => {
  request.mockImplementationOnce(async () => {
    verification.digest = "b";
    return response(true);
  });
  const permit = vi.fn(async () => {});
  const run = invoke(permit);
  await expect(run.result).rejects.toMatchObject({ usage: { total: 20 } });
  expect(permit).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
  expect(run.chunks).toEqual([]);
});
it("complete continuation context is admitted before permit consumption", async () => {
  request.mockResolvedValueOnce(response(true, "stop", "x".repeat(25000)));
  const permit = vi.fn(async () => {});
  const run = invoke(permit);
  await expect(run.result).rejects.toThrow("context budget");
  expect(permit).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
  expect(run.chunks).toEqual([]);
});

it("blocks unverified DeepSeek thinking-history continuation before sending", async () => {
  const run = invoke(async () => {}, undefined, {
    ...continuationPolicy,
    model: "deepseek-v4-1-flash",
    deepSeekThinking: true,
  });
  await expect(run.result).rejects.toThrow("reasoning-history protocol");
  expect(request).not.toHaveBeenCalled();
});
