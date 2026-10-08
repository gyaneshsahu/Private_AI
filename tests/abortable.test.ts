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
