import { afterEach, expect, it, vi } from "vitest";
import { accountDeadlineMs, accountRequest } from "../src/account-request";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it.each(["headers", "body"])(
  "account requests bound stalled %s without retry",
  async (stage) => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url, init: RequestInit) => {
      const pending = new Promise<never>((_, reject) => {
        init.signal!.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
      return stage === "headers"
        ? pending
        : Promise.resolve(
            Object.assign(new Response(), { json: () => pending }),
          );
    });
    vi.stubGlobal("fetch", fetcher);
    const pending = accountRequest(
      "/api/account/access",
      { method: "POST" },
      (r) => r.json(),
    );
    const check = expect(pending).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(accountDeadlineMs);
    await check;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("caller cancellation and success both release account deadline resources", async () => {
  vi.useFakeTimers();
  const abort = new AbortController();
  abort.abort();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init: RequestInit) => {
      if (init.signal!.aborted) throw new DOMException("Aborted", "AbortError");
      return new Response('{"ok":true}');
    }),
  );
  await expect(
    accountRequest("/api/account/access", { signal: abort.signal }, (r) =>
      r.json(),
    ),
  ).rejects.toThrow("Aborted");
  await expect(
    accountRequest("/api/account/access", {}, (r) => r.json()),
  ).resolves.toEqual({ ok: true });
  expect(vi.getTimerCount()).toBe(0);
});
