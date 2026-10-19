import { afterEach, expect, it, vi } from "vitest";
import { billingDeadlineMs, billingRequest } from "../src/billing-request";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each(["headers", "body"])(
  "bounds stalled %s without replaying a submitted operation",
  async (stage) => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_path, init: RequestInit) => {
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
    const promise = billingRequest(
      "/api/billing/checkout",
      { method: "POST" },
      (r) => r.json(),
    );
    const check = expect(promise).rejects.toThrow("outcome is unconfirmed");
    await vi.advanceTimersByTimeAsync(billingDeadlineMs);
    await check;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("preserves caller cancellation and clears the deadline on success", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_path, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(true);
      throw new DOMException("Aborted", "AbortError");
    }),
  );
  controller.abort();
  await expect(
    billingRequest(
      "/api/billing/overview",
      { signal: controller.signal },
      (r) => r.json(),
    ),
  ).rejects.toThrow("Aborted");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response('{"ok":true}')),
  );
  await expect(
    billingRequest("/api/billing/overview", {}, (r) => r.json()),
  ).resolves.toEqual({ ok: true });
  expect(vi.getTimerCount()).toBe(0);
});
