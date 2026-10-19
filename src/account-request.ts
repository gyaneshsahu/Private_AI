export const accountDeadlineMs = 10_000;

/** A deadline ends waiting, not a server-side account change. Never retry here. */
export async function accountRequest<T>(
  path: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;
  const timer = setTimeout(() => controller.abort(), accountDeadlineMs);
  try {
    return await read(
      await fetch(path, { ...init, cache: "no-store", signal }),
    );
  } finally {
    clearTimeout(timer);
  }
}
