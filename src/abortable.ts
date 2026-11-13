export async function withDeadline<T>(
  parent: AbortSignal,
  /** A total, or a total plus a shorter first-text limit that `started()` clears. */
  limit: number | { totalMs: number; firstTextMs: number },
  operation: (signal: AbortSignal, started: () => void) => Promise<T>,
): Promise<T> {
  const { totalMs, firstTextMs } =
    typeof limit === "number" ? { totalMs: limit, firstTextMs: limit } : limit;
  const deadline = new AbortController();
  const expire = () =>
    deadline.abort(new DOMException("Operation timed out.", "TimeoutError"));
  const timer = setTimeout(expire, totalMs);
  const first = setTimeout(expire, firstTextMs);
  try {
    return await operation(AbortSignal.any([parent, deadline.signal]), () =>
      clearTimeout(first),
    );
  } catch (error) {
    // An SDK may turn our deadline into its own abort error: report it as the time-out it is.
    if (
      deadline.signal.aborted &&
      !parent.aborted &&
      !(error instanceof Error && error.name === "IncompleteReplyError")
    )
      throw deadline.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    clearTimeout(first);
  }
}

// Stop waiting for SDK operations that lack AbortSignal support. This does not
// claim to cancel their internal work; callers must not send data after abort.
export function abortable<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(
        new DOMException(
          signal.reason?.name === "TimeoutError"
            ? "Operation timed out."
            : "Operation stopped.",
          signal.reason?.name === "TimeoutError"
            ? "TimeoutError"
            : "AbortError",
        ),
      );
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    operation.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      () => {
        cleanup();
        reject(new Error("Protected operation failed."));
      },
    );
    if (signal.aborted) {
      cleanup();
      abort();
    }
  });
}
