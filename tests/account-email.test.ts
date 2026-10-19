import { afterEach, expect, it, vi } from "vitest";
import { submitSignInCode } from "../server/account-email";

afterEach(() => vi.useRealTimers());
const message = { email: "mail@example.test", otp: "12345678" };

it("submits one code and cleans its deadline after acceptance", async () => {
  vi.useFakeTimers();
  const sender = vi.fn(async () => {});
  await submitSignInCode(message, sender);
  expect(sender).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("bounds a stalled sender, aborts it and never retries a possibly accepted code", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  let finish: (() => void) | undefined;
  const sender = vi.fn((_message, input: AbortSignal) => {
    signal = input;
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  const submission = expect(submitSignInCode(message, sender)).rejects.toThrow(
    "could not be confirmed",
  );
  await vi.advanceTimersByTimeAsync(10_000);
  await submission;
  expect(signal?.aborted).toBe(true);
  finish?.();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(sender).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("does not expose provider errors containing credentials or recipient data", async () => {
  const failure = submitSignInCode(message, async () => {
    throw Error("supplier-key-secret mail@example.test 12345678");
  });
  await expect(failure).rejects.toThrow(
    /^Sign-in code delivery could not be confirmed\.$/,
  );
});

it("rejects malformed messages and unbounded deadlines before submission", async () => {
  const sender = vi.fn(async () => {});
  for (const input of [
    { ...message, email: "mail@example.test\r\nBcc: other@example.test" },
    { ...message, otp: "1234" },
  ])
    await expect(submitSignInCode(input, sender)).rejects.toThrow("Invalid");
  for (const deadline of [0, Infinity, 10001, 1.5])
    await expect(submitSignInCode(message, sender, deadline)).rejects.toThrow(
      "Invalid",
    );
  expect(sender).not.toHaveBeenCalled();
});
