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
