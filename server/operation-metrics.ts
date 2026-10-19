const increment = (value: number) =>
  Math.min(Number.MAX_SAFE_INTEGER, value + 1);

/** Process-local aggregates only. No request data, dynamic labels, persistence or exporter. */
export function operationMetrics() {
  let inFlight = 0;
  let peakInFlight = 0;
  let accepted = 0;
  let completed = 0;
  let aborted = 0;
  let rejectedAdmission = 0;
  const readiness = { ready: 0, unavailable: 0 };
  const responses = {
    success: 0,
    redirect: 0,
    clientError: 0,
    serverError: 0,
    other: 0,
  };
  const durationMs = {
    under100: 0,
    under1000: 0,
    under5000: 0,
    under30000: 0,
    atLeast30000: 0,
  };
  return {
    rejectAdmission() {
      rejectedAdmission = increment(rejectedAdmission);
    },
    probe(ready: boolean) {
      const key = ready ? "ready" : "unavailable";
      readiness[key] = increment(readiness[key]);
    },
    admit() {
      const start = performance.now();
      accepted = increment(accepted);
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      let settled = false;
      return (status: number, finished: boolean) => {
        if (settled) return;
        settled = true;
        inFlight--;
        if (finished) {
          completed = increment(completed);
          const group =
            Number.isInteger(status) && status >= 200 && status < 600
              ? status < 300
                ? "success"
                : status < 400
                  ? "redirect"
                  : status < 500
                    ? "clientError"
                    : "serverError"
              : "other";
          responses[group] = increment(responses[group]);
        } else aborted = increment(aborted);
        const elapsed = Math.max(0, performance.now() - start);
        const bucket =
          elapsed < 100
            ? "under100"
            : elapsed < 1000
              ? "under1000"
              : elapsed < 5000
                ? "under5000"
                : elapsed < 30000
                  ? "under30000"
                  : "atLeast30000";
        durationMs[bucket] = increment(durationMs[bucket]);
      };
    },
    snapshot() {
      return {
        inFlight,
        peakInFlight,
        accepted,
        completed,
        aborted,
        rejectedAdmission,
        readiness: { ...readiness },
        responses: { ...responses },
        durationMs: { ...durationMs },
      };
    },
  };
}
