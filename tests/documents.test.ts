import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { extract } from "../src/documents";

class WorkerFixture {
  static instances: WorkerFixture[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    WorkerFixture.instances.push(this);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  WorkerFixture.instances = [];
  vi.stubGlobal("Worker", WorkerFixture);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const file = () => new File(["synthetic"], "test.txt", { type: "text/plain" });

it("terminates a stalled extraction without accepting late output", async () => {
  const progress = vi.fn();
  const result = extract(file(), new AbortController().signal, progress);
  const rejection = expect(result).rejects.toThrow("took too long");
  await vi.advanceTimersByTimeAsync(90000);
  await rejection;
  const worker = WorkerFixture.instances[0];
  worker.onmessage?.({ data: { progress: "late" } });
  expect(progress).not.toHaveBeenCalled();
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("cancels ongoing work and avoids creating a worker for an already aborted request", async () => {
  const controller = new AbortController();
  const result = extract(file(), controller.signal, vi.fn());
  const rejection = expect(result).rejects.toThrow("cancelled");
  controller.abort();
  await rejection;
  expect(WorkerFixture.instances[0].terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  await expect(extract(file(), controller.signal, vi.fn())).rejects.toThrow(
    "cancelled",
  );
  expect(WorkerFixture.instances).toHaveLength(1);
});
it("cleans up a successful extraction before its deadline", async () => {
  const result = extract(file(), new AbortController().signal, vi.fn());
  WorkerFixture.instances[0].onmessage?.({
    data: { pages: [{ text: "synthetic" }] },
  });
  expect((await result).sources[0].text).toBe("synthetic");
  expect(vi.getTimerCount()).toBe(0);
  expect(WorkerFixture.instances[0].terminate).toHaveBeenCalledTimes(1);
});

it.each([
  null,
  {},
  { pages: [{ text: 123 }] },
  { pages: [{ text: "synthetic", page: -1 }] },
  { pages: Array.from({ length: 21 }, () => ({ text: "synthetic" })) },
  { progress: "reading", pages: [{ text: "synthetic" }] },
])(
  "settles invalid worker output and allows a subsequent extraction: %j",
  async (data) => {
    const progress = vi.fn();
    const result = extract(file(), new AbortController().signal, progress);
    const rejected = expect(result).rejects.toThrow("invalid result");
    const worker = WorkerFixture.instances[0];
    worker.onmessage?.({ data });
    await rejected;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    worker.onmessage?.({ data: { progress: "late" } });
    expect(progress).not.toHaveBeenCalled();
    const next = extract(file(), new AbortController().signal, progress);
    WorkerFixture.instances[1].onmessage?.({
      data: { pages: [{ text: "next intact source" }] },
    });
    expect((await next).sources[0].text).toBe("next intact source");
  },
);
