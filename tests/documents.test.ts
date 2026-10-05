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
