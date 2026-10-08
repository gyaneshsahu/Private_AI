export async function withDeadline<T>(
  parent: AbortSignal,
  milliseconds: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const deadline = new AbortController();
  const timer = setTimeout(
    () =>
      deadline.abort(new DOMException("Operation timed out.", "TimeoutError")),
    milliseconds,
  );
  try {
    return await operation(AbortSignal.any([parent, deadline.signal]));
  } finally {
    clearTimeout(timer);
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
