import { expect, it } from "vitest";
import { abortable } from "../src/abortable";

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
