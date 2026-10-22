import { expect, it } from "vitest";
import { requestTiming } from "../evaluation/request-timing";
import { reviewResult } from "../evaluation/review-result";
import { prepareFromPreflight } from "../evaluation/prepare-experiment";

function clock(start = 1000) {
  let now = start;
  return { now: () => now, tick: (ms: number) => (now += ms) };
}

it("measures first content delta and final usage frame from the moment the request leaves", () => {
  const c = clock();
  const timing = requestTiming(c.now);
  c.tick(300);
  timing.status("Fetching attestation…");
  c.tick(700);
  timing.status("Receiving a protected response…");
  c.tick(5);
  timing.status("Receiving a protected response…"); // repeated status never moves the origin
  c.tick(120);
  timing.chunk(""); // an empty delta is not content
  c.tick(30);
  timing.chunk("Hel");
  c.tick(200);
  timing.chunk("lo"); // later deltas never move the first-delta mark
  c.tick(400);
  timing.usage();
  c.tick(10);
  timing.usage();
  c.tick(50);
  expect(timing.snapshot()).toEqual({
    measuredFrom: "request_sent",
    preparationMs: 1000,
    timeToFirstContentDeltaMs: 155,
    timeToFinalUsageFrameMs: 755,
    elapsedMs: 815,
  });
});

it("records nulls, not zeros, when the request never left or never completed", () => {
  const c = clock();
  const failed = requestTiming(c.now);
  c.tick(250);
  failed.status("Verifying the protected destination…");
  c.tick(50);
  expect(failed.snapshot()).toEqual({
    measuredFrom: "call_start",
    preparationMs: null,
    timeToFirstContentDeltaMs: null,
    timeToFinalUsageFrameMs: null,
    elapsedMs: 300,
  });
  const interrupted = requestTiming(c.now);
  interrupted.status("Receiving a protected response…");
  c.tick(80);
  interrupted.chunk("partial");
  c.tick(20);
  expect(interrupted.snapshot()).toEqual({
    measuredFrom: "request_sent",
    preparationMs: 0,
    timeToFirstContentDeltaMs: 80,
    timeToFinalUsageFrameMs: null,
    elapsedMs: 100,
  });
});

it("carries the per-request timings through the result review without affecting its verdicts", () => {
  // Labelled fixture only, as in review-result.test.ts: no provider observation.
  const now = new Date("2026-10-04T19:00:00Z");
  const digest =
    "ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876";
  const permit = prepareFromPreflight(
    {
      observedAt: now.toISOString(),
      kind: "LIVE_BROWSER_PREFLIGHT",
      providerQualification: "NOT_PASSED",
      result: "ROUTER_VERIFICATION_PASSED",
      inferenceRequests: 0,
      requests: [{ host: "atc.tinfoil.sh", path: "/attestation", status: 200 }],
      verification: {
        securityVerified: true,
        host: "inference.tinfoil.sh",
        repository: "tinfoilsh/confidential-model-router",
        releaseDigest: digest,
      },
    },
    now.getTime(),
  );
  const requestTimings = [0, 1].map((turn) => ({
    measuredFrom: "request_sent" as const,
    preparationMs: 400 + turn,
    timeToFirstContentDeltaMs: 120 + turn,
    timeToFinalUsageFrameMs: 500 + turn,
    elapsedMs: 500 + turn,
  }));
  const client = {
    failure: null,
    evidence: [0, 1].map(() => ({ host: "inference.tinfoil.sh", releaseDigest: digest })),
    timings: [4277, 5180],
    requestTimings,
    conversation: {
      messages: [0, 1].map(() => ({ role: "assistant", status: "complete" })),
      usage: [
        { input: 253, output: 449, total: 702 },
        { input: 593, output: 621, total: 1214 },
      ],
    },
  };
  const result = {
    kind: "SYNTHETIC_EXPERIMENT",
    attempts: [0, 1].map(() => ({
      outcome: "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED",
    })),
    network: [],
    client,
  };
  const summary = reviewResult(result, permit);
  expect(summary.requestTimings).toEqual(requestTimings);
  expect(summary.outcome).toBe("TWO_TURNS_RETURNED_REVIEW_REQUIRED");
  expect(summary.providerQualification).toBe("NOT_PASSED");
  // Records written before the field existed still review.
  const { requestTimings: _omitted, ...legacy } = client;
  expect(reviewResult({ ...result, client: legacy }, permit).requestTimings).toEqual([]);
  expect(() =>
    reviewResult(
      {
        ...result,
        client: {
          ...client,
          requestTimings: [{ ...requestTimings[0], elapsedMs: -1 }],
        },
      },
      permit,
    ),
  ).toThrow();
});
