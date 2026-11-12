// The Privatemode browser adapter offline (plan point 2): approved manifest by digest, CSRF on
// every SDK call, our routing headers forwarded, no SDK retries, refused replies handed back to
// the app's stream parser, and the per-account cache salt. The SDK is a test double here; the
// live run is tests/privatemode-browser.test.ts. Synthetic only.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  options: [] as Record<string, any>[],
  create: vi.fn(),
  verify: vi.fn(async () => undefined),
  close: vi.fn(),
}));
vi.mock("privatemode-ai", () => ({
  PrivatemodeAI: class {
    chat = { completions: { create: (body: unknown, options: unknown) => ({ asResponse: () => sdk.create(body, options) }) } };
    constructor(options: Record<string, any>) {
      sdk.options.push(options);
    }
    verify = sdk.verify;
    close = sdk.close;
  },
}));
import { inferenceClientFor } from "../src/providers/inference-client";
import "../src/providers/privatemode-client";
import "../src/providers/tinfoil-client";
import { PRIVATEMODE_WASM_SHA256 } from "../src/providers/privatemode-client";
import { fakeManifest, fakeManifestDigest } from "./fixtures/privatemode-report";

const policy = {
  provider: "privatemode" as const,
  origin: "https://api.privatemode.ai/",
  repository: "edgelesssys/privatemode-public",
  releaseDigests: [fakeManifestDigest],
  model: "glm-5.3-flash",
  glmReasoningEffort: "low" as const,
  csrf: "c".repeat(64),
  cacheSalt: "s".repeat(64),
};
const fetched: string[] = [];
beforeEach(() => {
  vi.stubGlobal("location", { origin: "https://app.example.test", host: "app.example.test" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      fetched.push(url);
      return new Response(fakeManifest);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  sdk.options.length = 0;
  sdk.create.mockReset();
  fetched.length = 0;
});

it("refuses a manifest the report does not approve before the SDK is created", async () => {
  const adapter = inferenceClientFor("privatemode");
  await expect(
    adapter.verify({ ...policy, releaseDigests: ["0".repeat(64)] }, new AbortController().signal, () => {}),
  ).rejects.toThrow("does not match the reviewed provider configuration. Nothing was sent.");
  expect(sdk.options).toEqual([]);
});

it("creates the SDK with our origin, the hash-named Wasm, CSRF on every call and no automatic retries", async () => {
  const adapter = inferenceClientFor("privatemode");
  await adapter.verify(policy, new AbortController().signal, () => {});
  expect(fetched).toEqual(["/api/inference/privatemode/manifest"]);
  const [options] = sdk.options;
  expect(options).toMatchObject({
    apiKey: "relay-injects-the-key",
    apiBaseURL: "https://app.example.test",
    browserWasmURL: `/api/inference/privatemode/privatemode-${PRIVATEMODE_WASM_SHA256}.wasm`,
    expectedWasmHash: PRIVATEMODE_WASM_SHA256,
    openAIOptions: { defaultHeaders: { "X-PrivateAI-CSRF": policy.csrf }, maxRetries: 0 },
    nvidiaOCSPPolicy: { allowUnknown: false, revokedGracePeriodHours: 0 },
  });
  expect(new Uint8Array(options.manifestBytes)).toEqual(fakeManifest);
});

it("forwards our request headers through the SDK and hands a refused reply back with its status and class", async () => {
  const adapter = inferenceClientFor("privatemode");
  const destination = await adapter.verify(policy, new AbortController().signal, () => {});
  const transport = await destination.transport();
  sdk.create.mockResolvedValueOnce(new Response("data: [DONE]\n\n"));
  const headers = {
    "Content-Type": "application/json",
    "X-PrivateAI-CSRF": policy.csrf,
    "X-PrivateAI-Mode": "thinking",
    "X-PrivateAI-Continuation-Approval": "approval-123",
  };
  const ok = await transport.request("ignored", { method: "POST", headers, body: JSON.stringify({ model: "glm-5.3-flash" }) });
  expect(ok.status).toBe(200);
  const [body, options] = sdk.create.mock.calls[0];
  expect(body).toEqual({ model: "glm-5.3-flash" });
  expect(options.headers).toMatchObject({
    "x-privateai-csrf": policy.csrf,
    "x-privateai-mode": "thinking",
    "x-privateai-continuation-approval": "approval-123",
  });
  sdk.create.mockRejectedValueOnce(
    Object.assign(Error("502"), { status: 502, headers: new Headers({ "x-privateai-upstream": "rejected" }) }),
  );
  const refused = await transport.request("ignored", { method: "POST", headers, body: "{}" });
  expect(refused.status).toBe(502);
  expect(refused.headers.get("x-privateai-upstream")).toBe("rejected");
  sdk.create.mockRejectedValueOnce(Error("network"));
  await expect(transport.request("ignored", { method: "POST", headers, body: "{}" })).rejects.toThrow("network");
});

it("sends this account's cache salt to Privatemode and refuses without one; Tinfoil keeps a fresh secret per request", () => {
  const privatemode = inferenceClientFor("privatemode");
  expect(privatemode.cacheOptions(policy)).toEqual({ cache_salt: policy.cacheSalt });
  expect(() => privatemode.cacheOptions({ ...policy, cacheSalt: undefined })).toThrow("Nothing was sent");
  expect(privatemode.modelOptions(policy)).toEqual({ reasoning_effort: "low" });
  const tinfoil = inferenceClientFor("tinfoil");
  const a = tinfoil.cacheOptions({ ...policy, provider: "tinfoil" });
  const b = tinfoil.cacheOptions({ ...policy, provider: "tinfoil" });
  expect(Object.keys(a)).toEqual(["user_cache_secret"]);
  expect(a.user_cache_secret).not.toBe(b.user_cache_secret);
});
