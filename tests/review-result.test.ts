import { it, expect } from "vitest";
import { reviewResult } from "../evaluation/review-result";
import { prepareFromPreflight } from "../evaluation/prepare-experiment";
const now = new Date("2026-10-04T19:00:00Z");
const digest =
  "ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876";
// Labelled fixtures only: no provider observation or actual approval in this test.
function fixture() {
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
  const result = {
    kind: "SYNTHETIC_EXPERIMENT",
    attempts: [0, 1].map(() => ({
      outcome: "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED",
    })),
    network: [],
    client: {
      failure: null as string | null,
      evidence: [0, 1].map(() => ({
        host: "inference.tinfoil.sh",
        releaseDigest: digest,
      })),
      timings: [4277, 5180],
      conversation: {
        messages: [0, 1].map(() => ({
          role: "assistant",
          status: "complete",
          text: "PRIVATE_TRANSCRIPT_CANARY",
        })),
        usage: [
          { input: 253, output: 449, total: 702 },
          { input: 593, output: 621, total: 1214 },
        ],
      },
    },
  };
  return { permit, result };
}
it("summarizes exact token cost without repeating text or promoting quality/security", () => {
  const { permit, result } = fixture();
  const report = reviewResult(result, permit);
  expect(report.outcome).toBe("TWO_TURNS_RETURNED_REVIEW_REQUIRED");
  expect(report.reportedUsage).toEqual({
    inputTokens: 846,
    outputTokens: 1070,
    turns: 2,
    estimatedUSD: "0.00076890",
  });
  expect(report.providerQualification).toBe("NOT_PASSED");
  expect(report.actualChargedUSD).toBeNull();
  expect(JSON.stringify(report)).not.toContain("PRIVATE_TRANSCRIPT_CANARY");
});
it("does not accept missing usage, mismatched evidence or inconsistent usage totals", () => {
  const { permit, result } = fixture();
  result.client.evidence[0].releaseDigest = "b".repeat(64);
  expect(reviewResult(result, permit).outcome).toBe(
    "INCOMPLETE_REVIEW_REQUIRED",
  );
  result.client.evidence[0].releaseDigest = digest;
  result.client.conversation.usage.pop();
  expect(reviewResult(result, permit).outcome).toBe(
    "INCOMPLETE_REVIEW_REQUIRED",
  );
  result.client.conversation.usage[0].total = 0;
  expect(() => reviewResult(result, permit)).toThrow();
});
it("distinguishes the intentional diagnostic stop from a paid completion", () => {
  const { permit, result } = fixture();
  const diagnostic = {
    ...result,
    kind: "NONBILLABLE_DIAGNOSTIC",
    attempts: [],
    network: [{ outcome: "INFERENCE_BLOCKED_BY_DIAGNOSTIC" }],
    client: {
      ...result.client,
      failure: "Expected stop",
      conversation: { messages: [], usage: [] },
    },
  };
  expect(reviewResult(diagnostic, permit).outcome).toBe(
    "DIAGNOSTIC_REACHED_INFERENCE_BOUNDARY",
  );
  expect(
    reviewResult({ ...diagnostic, attempts: result.attempts }, permit).outcome,
  ).toBe("INCOMPLETE_REVIEW_REQUIRED");
});

it("reviews one compatibility completion without calling it two-turn or provider qualified", () => {
  const { result, permit } = fixture();
  permit.scenario = "adapter_compatibility";
  result.attempts.pop();
  result.client.evidence.pop();
  result.client.conversation.messages.pop();
  result.client.conversation.usage.pop();
  expect(reviewResult(result, permit).outcome).toBe(
    "COMPATIBILITY_RETURNED_REVIEW_REQUIRED",
  );
});

it("requires an identified relay finish for compatibility and retains relay failures", () => {
  const { result, permit } = fixture();
  permit.scenario = "adapter_compatibility";
  result.attempts.pop();
  result.client.evidence.pop();
  result.client.conversation.messages.pop();
  result.client.conversation.usage.pop();
  expect(reviewResult(result, permit).compatibilityEvidence).toBe("NOT_PASSED");
  const network = [
    { outcome: "REQUEST_FINISHED", route: "INFERENCE_RELAY", requestId: 1 },
  ];
  expect(
    reviewResult({ ...result, network }, permit).compatibilityEvidence,
  ).toBe("READY_FOR_HUMAN_REVIEW");
  network.push({
    outcome: "REQUEST_FAILED",
    route: "INFERENCE_RELAY",
    requestId: 1,
  });
  expect(reviewResult({ ...result, network }, permit).relayClosure).toBe(
    "FAILED",
  );
  expect(
    reviewResult({ ...result, network }, permit).compatibilityEvidence,
  ).toBe("NOT_PASSED");
});
