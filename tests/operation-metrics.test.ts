import { afterEach, expect, it, vi } from "vitest";
import { operationMetrics } from "../server/operation-metrics";

afterEach(() => vi.restoreAllMocks());
it("counts terminal outcomes exactly once and separates aborted responses from HTTP success", () => {
  const metrics = operationMetrics();
  const first = metrics.admit(),
    second = metrics.admit();
  expect(metrics.snapshot()).toMatchObject({
    inFlight: 2,
    peakInFlight: 2,
    accepted: 2,
  });
  first(200, true);
  first(500, false);
  second(200, false);
  second(200, true);
  metrics.rejectAdmission();
  metrics.probe(false);
  metrics.probe(true);
  expect(metrics.snapshot()).toMatchObject({
    inFlight: 0,
    peakInFlight: 2,
    accepted: 2,
    completed: 1,
    aborted: 1,
    rejectedAdmission: 1,
    readiness: { ready: 1, unavailable: 1 },
    responses: { success: 1, serverError: 0 },
  });
});
it("uses fixed latency buckets with exact boundary behavior and no retained per-request samples", () => {
  let time = 0;
  vi.spyOn(performance, "now").mockImplementation(() => time);
  const metrics = operationMetrics();
  for (const duration of [99, 100, 999, 1000, 4999, 5000, 29999, 30000]) {
    const finish = metrics.admit();
    time += duration;
    finish(200, true);
  }
  expect(metrics.snapshot().durationMs).toEqual({
    under100: 1,
    under1000: 2,
    under5000: 2,
    under30000: 2,
    atLeast30000: 1,
  });
});
it("bounds label cardinality and returns independent snapshots rather than mutable internal state", () => {
  const metrics = operationMetrics();
  for (const status of [204, 302, 403, 503, NaN, 700, -1, 200.5])
    metrics.admit()(status, true);
  const snapshot = metrics.snapshot();
  expect(snapshot.responses).toEqual({
    success: 1,
    redirect: 1,
    clientError: 1,
    serverError: 1,
    other: 4,
  });
  snapshot.responses.success = 900;
  snapshot.readiness.ready = 900;
  snapshot.durationMs.under100 = 900;
  expect(metrics.snapshot().responses.success).toBe(1);
  expect(metrics.snapshot().readiness.ready).toBe(0);
  expect(metrics.snapshot().durationMs.under100).not.toBe(900);
  expect(Object.keys(snapshot).sort()).toEqual(
    [
      "aborted",
      "accepted",
      "completed",
      "durationMs",
      "inFlight",
      "peakInFlight",
      "readiness",
      "rejectedAdmission",
      "responses",
    ].sort(),
  );
  expect(operationMetrics().snapshot().accepted).toBe(0);
});
