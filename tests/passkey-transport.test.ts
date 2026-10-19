import { afterEach, expect, it, vi } from "vitest";
import { createPasskeyTransport } from "../src/passkey-transport";
import { accountDeadlineMs } from "../src/account-request";
const origin = "https://app.example.test";
const options = `${origin}/api/auth/passkey/generate-authenticate-options`;
const verification = `${origin}/api/auth/passkey/verify-authentication`;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("redacts server failure bodies while preserving verification uncertainty", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response('{"message":"SENSITIVE diagnostic"}', { status: 503 }),
    ),
  );
  const transport = createPasskeyTransport(origin);
  const result = await transport.fetch(verification, { method: "POST" });
  expect(await result.text()).not.toContain("SENSITIVE");
  expect(transport.failure()).toBe("verification");
});
it.each(["headers", "body"])(
  "bounds passkey %s and distinguishes uncertain verification without retry",
  async (stage) => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_input, init: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          init.signal!.addEventListener(
            "abort",
            () => controller.error(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        },
      });
      return stage === "body"
        ? Promise.resolve(new Response(stream))
        : new Promise<Response>((_, reject) => {
            init.signal!.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          });
    });
    vi.stubGlobal("fetch", fetcher);
    const transport = createPasskeyTransport(origin);
    const response = transport.fetch(verification, {
      method: "POST",
      body: "synthetic assertion",
    });
    await vi.advanceTimersByTimeAsync(accountDeadlineMs);
    expect((await response).status).toBe(503);
    expect(transport.failure()).toBe("verification");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("a failed options request never claims a verification was submitted", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("SENSITIVE transport detail");
    }),
  );
  const transport = createPasskeyTransport(origin);
  const response = await transport.fetch(options);
  expect(await response.text()).not.toContain("SENSITIVE");
  expect(transport.failure()).toBe("options");
  transport.reset();
  expect(transport.failure()).toBeUndefined();
});
it.each(["oversized", "malformed", "empty"])(
  "withholds a %s verification body and marks its outcome uncertain",
  async (kind) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            kind === "oversized"
              ? '"' + "a".repeat(128 * 1024) + '"'
              : kind === "malformed"
                ? "SENSITIVE invalid JSON"
                : "",
          ),
      ),
    );
    const transport = createPasskeyTransport(origin);
    expect((await transport.fetch(verification)).status).toBe(503);
    expect(transport.failure()).toBe("verification");
  },
);
it("preserves complete JSON and leaves no deadline during authenticator interaction", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async (_input, init: RequestInit) => {
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    return new Response('{"challenge":"synthetic"}', {
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const transport = createPasskeyTransport(origin);
  expect(await (await transport.fetch(options)).json()).toEqual({
    challenge: "synthetic",
  });
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(transport.failure()).toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not send assertions to a different origin and preserves caller cancellation", async () => {
  const fetcher = vi.fn(async (_input, init: RequestInit) => {
    if (init.signal!.aborted) throw new DOMException("Aborted", "AbortError");
    return new Response("{}");
  });
  vi.stubGlobal("fetch", fetcher);
  const transport = createPasskeyTransport(origin);
  expect(
    (
      await transport.fetch(
        "https://other.example.test/api/auth/passkey/verify-authentication",
      )
    ).status,
  ).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
  const abort = new AbortController();
  abort.abort();
  expect(
    (await transport.fetch(options, { signal: abort.signal })).status,
  ).toBe(503);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
