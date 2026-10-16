import { afterEach, expect, it, vi } from "vitest";
import { emptyConversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { createCalculationSession } from "../src/calculation-session";
import {
  streamVerifiedConversation,
  type VerifiedChatPolicy,
} from "../src/verified-chat";
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
  assistedResearchContract: true,
  assistedStructuredOutput: true,
};
function run(signal = new AbortController().signal) {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Synthetic check"));
  return streamVerifiedConversation(
    c,
    policy,
    "synthetic",
    signal,
    () => {},
    () => {},
    () => {},
  );
}
it("passes schema to the encrypted-transport boundary once, without plaintext fetch or fallback", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  request.mockResolvedValue(
    new Response("provider error not logged", { status: 400 }),
  );
  await expect(run()).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  const [url, init] = request.mock.calls[0];
  expect(url).toBe("http://localhost/api/inference/v1/chat/completions");
  const body = JSON.parse(init.body);
  expect(body.response_format.type).toBe("json_schema");
  expect(body.response_format.json_schema.schema.required).toEqual(["blocks"]);
  expect(body.stream).toBe(true);
  expect(body.max_completion_tokens).toBe(4096);
  expect(fetch).not.toHaveBeenCalled();
});
it("cancellation prevents verification transport and paid requests", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(run(controller.signal)).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});

it("counts schema overhead before sending a paid request", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Synthetic check"));
  await expect(
    streamVerifiedConversation(
      c,
      { ...policy, maxInputCharacters: 6500 },
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
    ),
  ).rejects.toThrow("including the response schema");
  expect(request).not.toHaveBeenCalled();
});
it("sends optional tools through one encrypted request and accepts an ordinary answer", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  const events = [
    {
      choices: [
        {
          index: 0,
          delta: {
            content: "The source does not establish an actual reopening.",
          },
          finish_reason: "stop",
        },
      ],
    },
    {
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    },
  ];
  request.mockResolvedValue(
    new Response(
      events.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("") +
        "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream" } },
    ),
  );
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Explain this source."));
  const chunks: string[] = [];
  await streamVerifiedConversation(
    c,
    {
      ...policy,
      assistedResearchContract: false,
      assistedStructuredOutput: false,
      optionalCalculator: true,
    },
    "synthetic",
    new AbortController().signal,
    (s) => chunks.push(s),
    () => {},
    () => {},
  );
  expect(request).toHaveBeenCalledTimes(1);
  const body = JSON.parse(request.mock.calls[0][1].body);
  expect(body.tools[0].function.name).toBe("calculate");
  expect(body.tool_choice).toBe("auto");
  expect(body.parallel_tool_calls).toBe(false);
  expect(body.response_format).toBeUndefined();
  expect(chunks).toEqual([
    "The source does not establish an actual reopening.",
  ]);
});
it("requires a replay session and admits its schema before the encrypted request", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Synthetic replay"));
  const replayPolicy = {
    ...policy,
    assistedResearchContract: false,
    assistedStructuredOutput: false,
    optionalCalculator: true,
    calculatorReplay: true,
  };
  await expect(
    streamVerifiedConversation(
      c,
      replayPolicy,
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
    ),
  ).rejects.toThrow("isolated session");
  expect(request).not.toHaveBeenCalled();
  request.mockResolvedValue(
    new Response("synthetic provider rejection", { status: 400 }),
  );
  await expect(
    streamVerifiedConversation(
      c,
      replayPolicy,
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
      undefined,
      undefined,
      undefined,
      createCalculationSession(),
    ),
  ).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  const body = JSON.parse(request.mock.calls[0][1].body);
  expect(
    body.tools[0].function.parameters.properties.derivedInputs,
  ).toBeDefined();
  expect(body.messages[0].content).toContain(
    "historical calculation references",
  );
  request.mockClear();
  await expect(
    streamVerifiedConversation(
      c,
      { ...replayPolicy, maxInputCharacters: 4000 },
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
      undefined,
      undefined,
      undefined,
      createCalculationSession(),
    ),
  ).rejects.toThrow("including calculator tools");
  expect(request).not.toHaveBeenCalled();
});
it("binds low reasoning to explicit DeepSeek thinking without changing other models", async () => {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  const c = emptyConversation();
  c.messages.push(newMessage("user", "Synthetic reasoning configuration"));
  const settings: VerifiedChatPolicy = {
    ...policy,
    model: "deepseek-v4-1-flash",
    deepSeekThinking: true,
    deepSeekReasoningEffort: "low",
  };
  request.mockResolvedValue(
    new Response("synthetic rejection", { status: 400 }),
  );
  await expect(
    streamVerifiedConversation(
      c,
      settings,
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
    ),
  ).rejects.toThrow();
  expect(
    JSON.parse(request.mock.calls[0][1].body).chat_template_kwargs,
  ).toEqual({ thinking: true, reasoning_effort: "low" });
  request.mockClear();
  await expect(
    streamVerifiedConversation(
      c,
      { ...settings, deepSeekThinking: false },
      "synthetic",
      new AbortController().signal,
      () => {},
      () => {},
      () => {},
    ),
  ).rejects.toThrow("explicit thinking");
  expect(request).not.toHaveBeenCalled();
});
