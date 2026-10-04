import { describe, expect, it } from "vitest";
import { prepareFromPreflight } from "../evaluation/prepare-experiment";
import { validateQualification } from "../shared/contracts";

const now = Date.parse("2026-10-04T18:20:00Z");
const digest =
  "ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876";
const proof = () => ({
  observedAt: new Date(now - 1000).toISOString(),
  kind: "LIVE_BROWSER_PREFLIGHT",
  result: "ROUTER_VERIFICATION_PASSED",
  inferenceRequests: 0,
  requests: [{ host: "atc.tinfoil.sh", path: "/attestation", status: 200 }],
  verification: {
    securityVerified: true,
    host: "inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigest: digest,
  },
  providerQualification: "NOT_PASSED",
});

describe("experiment permit preparation; synthetic fixture only", () => {
  it("uses only the approved model, cost limit and verified router release", () => {
    const permit = prepareFromPreflight(proof(), now);
    expect(permit.policy.model).toBe("gpt-oss-120b");
    expect(permit.approvedCapUSD).toBe(2);
    expect(permit.providerCapUSD).toBe(2);
    expect(permit.policy.releaseDigests).toEqual([digest]);
    expect(permit.policy.pricing).toMatchObject({
      inputPerMillion: 0.15,
      outputPerMillion: 0.6,
    });
    expect(() => validateQualification(permit)).toThrow();
  });
  it("rejects stale, failed, mismatched or billable preflights", () => {
    for (const update of [
      { observedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() },
      { result: "FAILED" },
      { inferenceRequests: 1 },
      {
        requests: [
          { host: "atc.tinfoil.sh", path: "/attestation", status: 403 },
        ],
      },
      {
        verification: {
          ...proof().verification,
          releaseDigest: "b".repeat(64),
        },
      },
    ])
      expect(() =>
        prepareFromPreflight({ ...proof(), ...update }, now),
      ).toThrow();
  });
});
