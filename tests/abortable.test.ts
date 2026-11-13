import { expect, it, vi } from "vitest";
import { abortable, withDeadline } from "../src/abortable";

it("clears completed deadlines while active operations still time out", async () => {
  vi.useFakeTimers();
  try {
    let completed: AbortSignal | undefined;
    await withDeadline(new AbortController().signal, 90000, async (signal) => {
      completed = signal;
    });
    await vi.advanceTimersByTimeAsync(100000);
    expect(completed?.aborted).toBe(false);
    const pending = withDeadline(
      new AbortController().signal,
      90000,
      (signal) => abortable(new Promise<void>(() => {}), signal),
    );
    const rejected = expect(pending).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.advanceTimersByTimeAsync(90000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    await expect(
      withDeadline(new AbortController().signal, 90000, async () => {
        throw Error("failed");
      }),
    ).rejects.toThrow("failed");
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it("preserves deadline classification without exposing the SDK or abort reason", async () => {
  const controller = new AbortController();
  const pending = abortable(new Promise<void>(() => {}), controller.signal);
  controller.abort(new DOMException("PRIVATE_REASON", "TimeoutError"));
  await expect(pending).rejects.toMatchObject({
    name: "TimeoutError",
    message: "Operation timed out.",
  });
  const stopped = new AbortController();
  stopped.abort("PRIVATE_REASON");
  await expect(
    abortable(Promise.resolve(), stopped.signal),
  ).rejects.toMatchObject({
    name: "AbortError",
    message: "Operation stopped.",
  });
  await expect(
    abortable(
      Promise.reject(new Error("PRIVATE_SDK_DETAIL")),
      new AbortController().signal,
    ),
  ).rejects.toThrow("Protected operation failed.");
});

it("ends a reply without answer text at the first-text limit, and only then", async () => {
  vi.useFakeTimers();
  try {
    const limits = { firstTextMs: 1000, totalMs: 5000 };
    const silent = withDeadline(new AbortController().signal, limits, (signal) =>
      abortable(new Promise<void>(() => {}), signal),
    );
    const timedOut = expect(silent).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(1000);
    await timedOut;
    let seen: AbortSignal | undefined;
    const writing = withDeadline(new AbortController().signal, limits, (signal, started) => {
      seen = signal;
      started();
      return abortable(new Promise<void>(() => {}), signal);
    });
    const ended = expect(writing).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(4999);
    expect(seen?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await ended;
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it("Stop still ends a long silent wait at once, as a stop and not a time-out", async () => {
  vi.useFakeTimers();
  try {
    const stop = new AbortController();
    const pending = withDeadline(stop.signal, { firstTextMs: 300_000, totalMs: 600_000 }, (signal) =>
      abortable(new Promise<void>(() => {}), signal),
    );
    const stopped = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(200_000);
    stop.abort();
    await stopped;
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it("reports an SDK's own abort error after the deadline as the time-out", async () => {
  vi.useFakeTimers();
  try {
    const pending = withDeadline(new AbortController().signal, 1000, (signal) =>
      new Promise<void>((_, reject) =>
        signal.addEventListener("abort", () => reject(Error("Request was aborted."))),
      ),
    );
    const rejected = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
  } finally {
    vi.useRealTimers();
  }
});
