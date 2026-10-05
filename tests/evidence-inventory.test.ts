import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { inspectEvidence, inventory } from "../evaluation/inventory";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  unlink,
  rmdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configurationIdentity } from "../evaluation/implementation";
import { developmentCase, type Experiment } from "../evaluation/experiment";

// Fabricated offline records test inventory validation, not provider behavior.
function fixture() {
  const date = "2026-10-05T12:00:00Z";
  const permit: Experiment = {
    purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
    scenario: "development_case",
    developmentCaseId: "development-planning-04",
    approvalId: "fixture_inventory_1",
    approvedAt: date,
    expiresAt: "2026-10-05T13:00:00Z",
    approvalEvidence: "TEST ONLY, no real authorization",
    approvedCapUSD: 2,
    providerCapUSD: 2,
    providerLimitEvidence: "TEST ONLY, no actual provider limit",
    pricingEvidence: "TEST ONLY, no actual provider pricing",
    pricingCheckedAt: date,
    browserPreflightEvidence: "TEST ONLY, fabricated verification",
    releaseReviewEvidence: "TEST ONLY, fabricated release review",
    policy: {
      origin: "https://inference.tinfoil.sh",
      repository: "tinfoilsh/confidential-model-router",
      releaseDigests: ["a".repeat(64)],
      model: "fixture-model",
      maxInputCharacters: 8000,
      maxOutputTokens: 2048,
      pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    },
  };
  const code = "b".repeat(64),
    configuration = configurationIdentity(code, permit.policy);
  const transcript = ["user", "assistant", "user", "assistant"].map(
    (role, index) => ({
      role,
      text:
        role === "user"
          ? developmentCase(permit.developmentCaseId).turns[index / 2]
          : "SYNTHETIC_TRANSCRIPT_CANARY",
    }),
  );
  const result = {
    observedAt: date,
    kind: "SYNTHETIC_EXPERIMENT",
    implementation: { adapterAndLockfileSHA256: code },
    configurationSHA256: configuration,
    modelConfiguration: permit.policy,
    attempts: [0, 1].map(() => ({
      outcome: "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED",
      responseFinished: true,
    })),
    network: [0, 1].map((requestId) => ({
      route: "INFERENCE_RELAY",
      requestId,
      outcome: "REQUEST_FINISHED",
    })),
    client: {
      failure: null,
      evidence: [0, 1].map(() => ({
        host: "inference.tinfoil.sh",
        releaseDigest: "a".repeat(64),
      })),
      timings: [1, 2],
      conversation: {
        messages: transcript.map((m) => ({ ...m, status: "complete" })),
        usage: [0, 1].map(() => ({ input: 1, output: 1, total: 2 })),
      },
    },
  };
  const text = JSON.stringify(result);
  const review = {
    caseId: permit.developmentCaseId,
    repetition: 1,
    system: "PrivateAI",
    configuration,
    runAt: date,
    transcript,
    correctness: 2,
    completeness: 2,
    context: 2,
    assertions: developmentCase(permit.developmentCaseId).mandatoryFacts.map(
      (fact) => ({ fact, passed: true, evidence: "SYNTHETIC REVIEW CANARY" }),
    ),
    seriousErrors: [],
    reviewer: "fixture reviewer",
    reviewerKind: "agent",
    findings: [],
    reviewNotes: "Fixture only",
    evidenceKind: "live",
    sourceResultSHA256: createHash("sha256").update(text).digest("hex"),
  };
  return { permit, result, text, review };
}
it("binds reviews to exact bytes, configuration, transcript and case without leaking content", () => {
  const { permit, text, review } = fixture();
  const entry = inspectEvidence(permit.approvalId, text, permit, [review]);
  expect(entry.integrity).toBe("VALID");
  expect(entry.review).toBe("AGENT_REVIEWED");
  expect(entry.acceptableUnderRubric).toBe(true);
  expect(entry.estimatedUSD).toBe("0.00000400");
  expect(JSON.stringify(entry)).not.toContain("CANARY");
  for (const patch of [
    { sourceResultSHA256: "f".repeat(64) },
    { configuration: "f".repeat(64) },
    { transcript: [] },
    { caseId: "wrong-case" },
    { assertions: review.assertions.slice(0, 1) },
    { evidenceKind: "mock" },
  ]) {
    const invalid = inspectEvidence(permit.approvalId, text, permit, [
      { ...review, ...patch },
    ]);
    expect(invalid.review).toBe("PENDING");
    expect(invalid.reviewIssues).toBe(1);
  }
});
it("keeps missing, conflicting, altered-model and incomplete evidence unqualified", () => {
  const { permit, text, review, result } = fixture();
  expect(inspectEvidence(permit.approvalId, text, permit, []).review).toBe(
    "PENDING",
  );
  expect(
    inspectEvidence(permit.approvalId, text, permit, [review, review]).review,
  ).toBe("CONFLICT");
  expect(
    inspectEvidence(
      permit.approvalId,
      text,
      { ...permit, policy: { ...permit.policy, model: "other" } },
      [review],
    ).integrity,
  ).toBe("INVALID_OR_LEGACY");
  expect(inspectEvidence("another_run", text, permit, []).integrity).toBe(
    "INVALID_OR_LEGACY",
  );
  result.client.conversation.messages[1].status = "partial";
  const partialText = JSON.stringify(result);
  const partialReview = {
    ...review,
    sourceResultSHA256: createHash("sha256").update(partialText).digest("hex"),
  };
  expect(
    inspectEvidence(permit.approvalId, partialText, permit, [partialReview])
      .review,
  ).toBe("PENDING");
  expect(inspectEvidence(permit.approvalId, "{", permit, []).integrity).toBe(
    "INVALID_OR_LEGACY",
  );
});

it("derives legacy identities explicitly and reads a private fixture directory without rewriting evidence", async () => {
  const { permit, result, review } = fixture();
  const {
    configurationSHA256: _configuration,
    modelConfiguration: _model,
    ...legacy
  } = result;
  const text = JSON.stringify(legacy);
  const bound = {
    ...review,
    sourceResultSHA256: createHash("sha256").update(text).digest("hex"),
  };
  const entry = inspectEvidence(permit.approvalId, text, permit, [bound]);
  expect(entry.identitySource).toBe("DERIVED_FROM_CODE_AND_PERMIT");
  expect(entry.review).toBe("AGENT_REVIEWED");
  const root = await mkdtemp(join(tmpdir(), "privateai-inventory-fixture-"));
  const dir = join(root, permit.approvalId);
  await mkdir(dir);
  const files = {
    "result.json": text,
    "permit.json": JSON.stringify(permit),
    "agent-review-profile-20261005.json": JSON.stringify(bound),
    "human-review-20261005.json": "{malformed",
  };
  try {
    for (const [name, content] of Object.entries(files))
      await writeFile(join(dir, name), content, { flag: "wx" });
    const report = await inventory(root);
    expect(report.totals.runs).toBe(1);
    expect(report.totals.agentReviewed).toBe(1);
    expect(report.totals.humanReviewed).toBe(0);
    expect(report.entries[0].reviewIssues).toBe(1);
    expect(report.qualityGate).toBe("NOT_ASSESSED");
    expect(report.totals.actualChargedUSD).toBeNull();
    expect(JSON.stringify(report)).not.toContain("CANARY");
    for (const [name, content] of Object.entries(files))
      expect(await readFile(join(dir, name), "utf8")).toBe(content);
  } finally {
    for (const name of Object.keys(files)) await unlink(join(dir, name));
    await rmdir(dir);
    await rmdir(root);
  }
});
