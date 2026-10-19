import { z } from "zod";

export interface SignInCode {
  email: string;
  otp: string;
}
export type SignInCodeSender = (
  message: SignInCode,
  signal: AbortSignal,
) => Promise<void>;

const codeSchema = z
  .object({
    email: z.email().max(254),
    otp: z.string().regex(/^\d{8}$/),
  })
  .strict();

/** One submission, no retry. A timeout cannot establish whether mail was accepted. */
export async function submitSignInCode(
  message: SignInCode,
  sender: SignInCodeSender,
  timeoutMs = 10_000,
): Promise<void> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000)
    throw Error("Invalid sign-in delivery deadline.");
  if (!codeSchema.safeParse(message).success)
    throw Error("Invalid sign-in delivery request.");
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(() => sender({ ...message }, abort.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          abort.abort();
          reject(Error("Delivery deadline exceeded."));
        }, timeoutMs);
      }),
    ]);
  } catch {
    // Neither email addresses, OTPs nor supplier error bodies may reach logs/responses.
    throw Error("Sign-in code delivery could not be confirmed.");
  } finally {
    clearTimeout(timer);
  }
}
