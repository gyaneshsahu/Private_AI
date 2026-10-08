import { expect, it } from "vitest";
import {
  prepareWindowsCompatibility,
  windowsApprovalId,
} from "../evaluation/prepare-windows-compatibility";
import { validateQualification } from "../shared/contracts";
const now = Date.parse("2026-10-05T12:00:00Z");
const receipt = () => ({
  checkedAt: new Date(now).toISOString(),
  cumulativeSpentUSD: 0.001,
  remainingBalanceUSD: 1.999,
  accountCapUSD: 2,
  autoRechargeDisabled: true,
  keyMatchesCappedAccount: true,
  inputPerMillion: 0.15,
  outputPerMillion: 0.6,
  noAdditionalRequestFee: true,
});
const proof = () => ({
  observedAt: new Date(now).toISOString(),
  kind: "LIVE_BROWSER_PREFLIGHT",
  result: "ROUTER_VERIFICATION_PASSED",
  inferenceRequests: 0,
  requests: [{ host: "atc.tinfoil.sh", path: "/attestation", status: 200 }],
  verification: {
    securityVerified: true,
    host: "inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigest:
      "ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876",
  },
  providerQualification: "NOT_PASSED",
});
it("prepares only the fresh Windows one-request scope and never qualifies production", () => {
  const permit = prepareWindowsCompatibility(proof(), receipt(), now);
  expect(permit.approvalId).toBe(windowsApprovalId);
  expect(permit.scenario).toBe("adapter_compatibility");
  expect(permit.approvedCapUSD).toBe(2);
  expect(permit.policy.maxOutputTokens).toBe(512);
  expect(permit.policy.maxInputCharacters).toBe(2000);
  expect(permit.browserPreflightEvidence).not.toContain("WSL");
  expect(() => validateQualification(permit)).toThrow();
});
it("rejects unknown spending, exhausted headroom, changed caps, stale receipts and unconfirmed controls", () => {
  for (const update of [
    { cumulativeSpentUSD: null },
    { cumulativeSpentUSD: 1.995 },
    { remainingBalanceUSD: 0.001 },
    { accountCapUSD: 5 },
    { autoRechargeDisabled: false },
    { keyMatchesCappedAccount: false },
    { noAdditionalRequestFee: false },
    { inputPerMillion: 10 },
    { checkedAt: new Date(now - 86400001).toISOString() },
    { checkedAt: new Date(now + 1).toISOString() },
    { apiKey: "TEST must never be in evidence" },
  ])
    expect(() =>
      prepareWindowsCompatibility(proof(), { ...receipt(), ...update }, now),
    ).toThrow();
  expect(() =>
    prepareWindowsCompatibility(
      { ...proof(), inferenceRequests: 1 },
      receipt(),
      now,
    ),
  ).toThrow();
});
