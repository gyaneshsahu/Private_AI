export const billingDeadlineMs = 10_000;

/** A browser timeout cannot prove whether a submitted operation reached the server. */
export async function billingRequest<T>(
  path: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  const timer = setTimeout(() => controller.abort(), billingDeadlineMs);
  try {
    return await read(
      await fetch(path, { ...init, cache: "no-store", signal }),
    );
  } catch (error) {
    if (controller.signal.aborted)
      throw Error(
        "Billing response timed out. The outcome is unconfirmed; refresh status before continuing. No automatic retry was made.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
