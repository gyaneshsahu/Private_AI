// The Privatemode browser adapter offline (plan point 2): approved manifest by digest, CSRF on
// every SDK call, our routing headers forwarded, no SDK retries, refused replies handed back to
// the app's stream parser, and the per-account cache salt. The SDK is a test double here; the
// live run is tests/privatemode-browser.test.ts. Synthetic only.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  options: [] as Record<string, any>[],
  instances: [] as unknown[],
  create: vi.fn(),
  verify: vi.fn(async () => undefined),
  refreshSecret: vi.fn(async () => undefined),
  close: vi.fn(),
}));
vi.mock("privatemode-ai", () => ({
  PrivatemodeAI: class {
    chat = { completions: { create: (body: unknown, options: unknown) => ({ asResponse: () => sdk.create(body, options) }) } };
    constructor(options: Record<string, any>) {
      sdk.options.push(options);
      sdk.instances.push(this);
    }
    verify = sdk.verify;
    refreshSecret = sdk.refreshSecret;
    close = sdk.close;
  },
}));
import { AttestationBusyError, inferenceClientFor } from "../src/providers/inference-client";
import "../src/providers/privatemode-client";
import "../src/providers/tinfoil-client";
import {
  discardPrivatemodeSession,
  PRIVATEMODE_VERIFY_MAX_AGE_MS,
  PRIVATEMODE_WASM_SHA256,
} from "../src/providers/privatemode-client";
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
  discardPrivatemodeSession();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sdk.options.length = 0;
  sdk.instances.length = 0;
  sdk.create.mockReset();
  sdk.verify.mockReset().mockImplementation(async () => undefined);
  sdk.refreshSecret.mockReset().mockImplementation(async () => undefined);
  sdk.close.mockReset();
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
  // The refused reply ended that client; a new verification gives a new one.
  await expect(transport.request("ignored", { method: "POST", headers, body: "{}" })).rejects.toThrow(
    "The verified connection was closed. Nothing was sent.",
  );
  const fresh = await (await adapter.verify(policy, new AbortController().signal, () => {})).transport();
  sdk.create.mockRejectedValueOnce(Error("network"));
  await expect(fresh.request("ignored", { method: "POST", headers, body: "{}" })).rejects.toThrow("network");
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

// Session verification (owner, 12 November, option 1): one verified client per browser session,
// verified afresh after 10 minutes, after any failure and on any release change; fail closed.
const otherManifest = new TextEncoder().encode('{"synthetic":"another manifest for tests"}');
async function sha(bytes: Uint8Array) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}
const serve = (bytes: Uint8Array) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      fetched.push(url);
      return new Response(bytes.slice());
    }),
  );
/** One message as the app sends it: verify (or reuse), one request, the reply read to the end. */
async function send(p = policy, reply: () => Response = () => new Response("data: [DONE]\n\n")) {
  const destination = await inferenceClientFor("privatemode").verify(p, new AbortController().signal, () => {});
  sdk.create.mockImplementationOnce(async () => reply());
  const response = await (await destination.transport()).request("", { method: "POST", body: "{}" });
  return { destination, text: await response.text(), status: response.status };
}
const verifications = () => sdk.options.length;

it("(a) two messages within 10 minutes share one verification", async () => {
  await send();
  await send();
  expect(verifications()).toBe(1);
  expect(sdk.verify).toHaveBeenCalledTimes(1);
  // The secret is set during verification, so the SDK's first chat does not attest again.
  expect(sdk.refreshSecret).toHaveBeenCalledTimes(1);
  expect(sdk.refreshSecret.mock.invocationCallOrder[0]).toBeGreaterThan(sdk.verify.mock.invocationCallOrder[0]);
  expect(sdk.refreshSecret.mock.invocationCallOrder[0]).toBeLessThan(sdk.create.mock.invocationCallOrder[0]);
  expect(fetched).toEqual(["/api/inference/privatemode/manifest"]);
  expect(sdk.create).toHaveBeenCalledTimes(2);
  expect(sdk.close).not.toHaveBeenCalled();
});

it("(b) a verification 10 minutes old or more is repeated before the next message; the old client is closed", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const start = new Date("2026-11-12T10:00:00Z").getTime();
  vi.setSystemTime(start);
  await send();
  vi.setSystemTime(start + PRIVATEMODE_VERIFY_MAX_AGE_MS - 1);
  await send();
  expect(verifications()).toBe(1);
  vi.setSystemTime(start + PRIVATEMODE_VERIFY_MAX_AGE_MS);
  await send();
  expect(verifications()).toBe(2);
  expect(sdk.close).toHaveBeenCalledTimes(1);
  // The limit counts from the last successful verification.
  vi.setSystemTime(start + 2 * PRIVATEMODE_VERIFY_MAX_AGE_MS - 1);
  await send();
  expect(verifications()).toBe(2);
  expect(PRIVATEMODE_VERIFY_MAX_AGE_MS).toBe(600_000);
});

it.each([
  ["a transport error", () => sdk.create.mockRejectedValueOnce(Error("network"))],
  ["a 5xx from chat", () => sdk.create.mockRejectedValueOnce(Object.assign(Error("502"), { status: 502 }))],
  ["a 4xx from key exchange", () => sdk.create.mockRejectedValueOnce(Object.assign(Error("403"), { status: 403 }))],
  ["a refused reply", () => sdk.create.mockResolvedValueOnce(new Response(null, { status: 503 }))],
  [
    "a reply that breaks mid-stream",
    () =>
      sdk.create.mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode("data: {}\n\n"));
              c.error(Error("connection reset"));
            },
          }),
        ),
      ),
  ],
  ["a stop while the reply streams", () => sdk.create.mockResolvedValueOnce(new Response("data: {}\n\n"))],
])("(c) after %s the next message verifies afresh before sending", async (name, fail) => {
  await send();
  const destination = await inferenceClientFor("privatemode").verify(policy, new AbortController().signal, () => {});
  fail();
  try {
    const response = await (await destination.transport()).request("", { method: "POST", body: "{}" });
    // The app's stream parser reads, then cancels on a stop or a refused reply.
    const reader = response.body?.getReader();
    await reader?.read();
    if (name.includes("mid-stream")) await reader?.read();
    await reader?.cancel();
  } catch {
    // the failure itself
  }
  expect(verifications()).toBe(1);
  expect(sdk.close).toHaveBeenCalledTimes(1);
  await send();
  expect(verifications()).toBe(2);
  expect(sdk.verify).toHaveBeenCalledTimes(2);
});

it("(c) a failed verification caches nothing; the next message verifies again", async () => {
  sdk.verify.mockRejectedValueOnce(Object.assign(Error("attest 429"), { status: 429 }));
  await expect(send()).rejects.toThrow("Protected operation failed.");
  expect(sdk.close).toHaveBeenCalledTimes(1);
  await send();
  expect(sdk.verify).toHaveBeenCalledTimes(2);
  expect(sdk.create).toHaveBeenCalledTimes(1);
});

it("(d) a changed approved digest, a new session token or an SDK manifest update forces a new verification", async () => {
  await send();
  // The status now approves a second release as well: the client is verified again.
  const both = [await sha(otherManifest), fakeManifestDigest];
  await send({ ...policy, releaseDigests: both });
  expect(verifications()).toBe(2);
  await send({ ...policy, releaseDigests: both, csrf: "d".repeat(64) });
  expect(verifications()).toBe(3);
  expect(sdk.options[2].openAIOptions.defaultHeaders).toEqual({ "X-PrivateAI-CSRF": "d".repeat(64) });
  const { destination } = await send();
  expect(verifications()).toBe(4);
  // The SDK reports a manifest it switched to by itself: that client stops and is forgotten.
  expect(() => sdk.options[3].onManifestUpdate()).toThrow("manifest changed");
  await expect((await destination.transport()).request("", { method: "POST", body: "{}" })).rejects.toThrow(
    "differs from the reviewed one. Nothing was sent.",
  );
  await send();
  expect(verifications()).toBe(5);
  expect(sdk.close).toHaveBeenCalledTimes(4);
});

it("(e) a failed re-verification sends nothing and never falls back to the old client", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const start = Date.now();
  const { destination: old } = await send();
  vi.setSystemTime(start + PRIVATEMODE_VERIFY_MAX_AGE_MS);
  sdk.verify.mockRejectedValueOnce(Error("attestation failed"));
  await expect(send()).rejects.toThrow("Protected operation failed.");
  expect(sdk.create).toHaveBeenCalledTimes(1);
  // The expired client was closed and refuses, so nothing can reach the provider under it.
  await expect((await old.transport()).request("", { method: "POST", body: "{}" })).rejects.toThrow(
    "Nothing was sent.",
  );
  sdk.verify.mockRejectedValueOnce(Error("attestation failed again"));
  await expect(send()).rejects.toThrow("Protected operation failed.");
  expect(sdk.create).toHaveBeenCalledTimes(1);
});

it("(f) the manifest pin and the Wasm pin hold on first verification, on re-verification and across a pin change", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const start = Date.now();
  const refused = "does not match the reviewed provider configuration. Nothing was sent.";
  // First verification: an unapproved manifest is refused before any SDK client exists.
  serve(otherManifest);
  await expect(send()).rejects.toThrow(refused);
  expect(verifications()).toBe(0);
  serve(fakeManifest);
  await send();
  // Re-verification after the time limit: the served manifest changed, so it is refused.
  vi.setSystemTime(start + PRIVATEMODE_VERIFY_MAX_AGE_MS);
  serve(otherManifest);
  await expect(send()).rejects.toThrow(refused);
  expect(verifications()).toBe(1);
  expect(sdk.create).toHaveBeenCalledTimes(1);
  // A fresh client under the approved manifest, then the approval moves to another release
  // while the provider still serves the old one: the cached client is not reused.
  serve(fakeManifest);
  await send();
  await expect(send({ ...policy, releaseDigests: [await sha(otherManifest)] })).rejects.toThrow(refused);
  expect(verifications()).toBe(2);
  expect(sdk.create).toHaveBeenCalledTimes(2);
  for (const options of sdk.options) {
    expect(options.expectedWasmHash).toBe(PRIVATEMODE_WASM_SHA256);
    expect(new Uint8Array(options.manifestBytes)).toEqual(fakeManifest);
  }
});

it("(g) a stop during verification closes the client and caches nothing", async () => {
  let release!: () => void;
  sdk.verify.mockImplementationOnce(() => new Promise<undefined>((resolve) => (release = () => resolve(undefined))));
  const stop = new AbortController();
  const verifying = inferenceClientFor("privatemode").verify(policy, stop.signal, () => {});
  await vi.waitFor(() => expect(sdk.verify).toHaveBeenCalledTimes(1));
  stop.abort();
  await expect(verifying).rejects.toThrow();
  release(); // the SDK finishes after the stop; still nothing is cached
  expect(sdk.close).toHaveBeenCalledTimes(1);
  await send();
  expect(verifications()).toBe(2);
  expect(sdk.create).toHaveBeenCalledTimes(1);
});

// Attestation queue (owner, 13 November): the SDK reports a refused attest call as plain text.
const BUSY_TEXT = (status: number) =>
  `initializing client: offering credential to secret manager: setting secrets: All attempts fail:\n#1: updating mesh CA: doing attest request: unexpected status code: ${status}`;

it.each([429, 503])("a verification refused with %s on attest becomes the plain busy message; nothing is cached or sent", async (code) => {
  sdk.verify.mockRejectedValueOnce(Error(BUSY_TEXT(code)));
  const failure = await send().catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(AttestationBusyError);
  expect((failure as Error).message).toBe(
    "CometRow is busy checking the secure server. Please try again in a minute. Nothing was sent.",
  );
  expect(sdk.create).not.toHaveBeenCalled();
  expect(sdk.close).toHaveBeenCalledTimes(1);
  // Other refusals keep their old handling.
  sdk.verify.mockRejectedValueOnce(Error("updating mesh CA: doing attest request: unexpected status code: 500"));
  await expect(send()).rejects.toThrow("Protected operation failed.");
});

it("the SDK's own re-verification refused on attest (a connection error with the busy cause) is the busy message too", async () => {
  const destination = await inferenceClientFor("privatemode").verify(policy, new AbortController().signal, () => {});
  sdk.create.mockRejectedValueOnce(Object.assign(Error("Connection error."), { cause: Error(BUSY_TEXT(503)) }));
  await expect((await destination.transport()).request("", { method: "POST", body: "{}" })).rejects.toBeInstanceOf(
    AttestationBusyError,
  );
});

it("race fix: a slower verification that ends later keeps the newer cached client and closes only its own", async () => {
  let releaseSlow!: () => void;
  sdk.verify.mockImplementationOnce(() => new Promise<undefined>((resolve) => (releaseSlow = () => resolve(undefined))));
  const adapter = inferenceClientFor("privatemode");
  const slow = adapter.verify(policy, new AbortController().signal, () => {});
  await vi.waitFor(() => expect(sdk.verify).toHaveBeenCalledTimes(1));
  // Meanwhile another request verifies and starts streaming on the newer client.
  const newer = await adapter.verify(policy, new AbortController().signal, () => {});
  sdk.create.mockResolvedValueOnce(new Response("data: {}\n\n"));
  const streaming = await (await newer.transport()).request("", { method: "POST", body: "{}" });
  releaseSlow();
  expect(await slow).toBe(newer);
  expect(sdk.close.mock.contexts).toEqual([sdk.instances[0]]);
  expect(await streaming.text()).toBe("data: {}\n\n");
  await send();
  expect(verifications()).toBe(2);
});

it("race fix: a stopped request whose cleanup lands after a newer client was cached closes only its own client", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const start = Date.now();
  const adapter = inferenceClientFor("privatemode");
  const old = await adapter.verify(policy, new AbortController().signal, () => {});
  sdk.create.mockResolvedValueOnce(new Response("data: {}\n\n"));
  const stopped = await (await old.transport()).request("", { method: "POST", body: "{}" });
  const reader = stopped.body!.getReader();
  await reader.read();
  // The next message verifies a new client (here: the old one expired) before the stop's cleanup runs.
  vi.setSystemTime(start + PRIVATEMODE_VERIFY_MAX_AGE_MS);
  const newer = await adapter.verify(policy, new AbortController().signal, () => {});
  expect(newer).not.toBe(old);
  await reader.cancel(); // the stopped request's cleanup
  expect(sdk.close.mock.contexts).toEqual([sdk.instances[0]]);
  await send();
  expect(verifications()).toBe(2);
});
