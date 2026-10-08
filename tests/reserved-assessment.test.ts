import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { validateExperiment, type Experiment } from "../evaluation/experiment";
import { configurationIdentity } from "../evaluation/implementation";
import {
  validateReservedBinding,
  claimReservedSlot,
} from "../evaluation/reserved-assessment";

async function fixture() {
  const manifest = JSON.parse(
    await readFile("evaluation/frozen-manifest.json", "utf8"),
  );
  const policy: Experiment["policy"] = {
    origin: "https://inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigests: ["a".repeat(64)],
    model: "gemma4-31b",
    gemmaThinking: true,
    maxInputCharacters: 8000,
    maxOutputTokens: 2048,
    pricing: { inputPerMillion: 0.4, outputPerMillion: 1, currency: "USD" },
  };
  const evidence = "Synthetic offline test only; no spending authorization.";
  return validateExperiment({
    purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
    scenario: "reserved_case",
    developmentCaseId: "heldout-writing-01",
    approvalId: "test-reserved-slot-1",
    approvedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    approvalEvidence: evidence,
    approvedCapUSD: 2,
    providerCapUSD: 2,
    providerLimitEvidence: evidence,
    pricingEvidence: evidence,
    pricingCheckedAt: new Date().toISOString(),
    browserPreflightEvidence: evidence,
    releaseReviewEvidence: evidence,
    policy,
    reservedAssessment: {
      configurationSHA256: configurationIdentity("b".repeat(64), policy),
      fixtureSHA256: manifest["heldout.json"],
      repetition: 1,
      reviewEvidence: evidence,
    },
  });
}

describe("reserved evaluation isolation", () => {
  it("requires separate scope, frozen binding and bounded repetition", async () => {
    const permit = await fixture();
    expect(() =>
      validateExperiment({ ...permit, reservedAssessment: undefined }),
    ).toThrow();
    expect(() =>
      validateExperiment({ ...permit, scenario: "development_case" }),
    ).toThrow();
    expect(() =>
      validateExperiment({
        ...permit,
        developmentCaseId: "development-writing-01",
      }),
    ).toThrow();
    for (const repetition of [0, 4, 1.5])
      expect(() =>
        validateExperiment({
          ...permit,
          reservedAssessment: { ...permit.reservedAssessment, repetition },
        }),
      ).toThrow();
    await expect(
      validateReservedBinding(process.cwd(), permit, "b".repeat(64)),
    ).resolves.toBeUndefined();
    await expect(
      validateReservedBinding(process.cwd(), permit, "c".repeat(64)),
    ).rejects.toThrow();
    await expect(
      validateReservedBinding(
        process.cwd(),
        { ...permit, policy: { ...permit.policy, gemmaThinking: false } },
        "b".repeat(64),
      ),
    ).rejects.toThrow();
  });
  it("detects edited held-out bytes and prevents new approval IDs reusing a slot", async () => {
    const permit = await fixture();
    const root = await mkdtemp(resolve(tmpdir(), "privateai-reserved-"));
    try {
      await mkdir(resolve(root, "evaluation/cases"), { recursive: true });
      await writeFile(resolve(root, "evaluation/cases/heldout.json"), "[]");
      await writeFile(
        resolve(root, "evaluation/frozen-manifest.json"),
        await readFile("evaluation/frozen-manifest.json"),
      );
      await expect(
        validateReservedBinding(root, permit, "b".repeat(64)),
      ).rejects.toThrow();
      await claimReservedSlot(root, permit);
      await expect(
        claimReservedSlot(root, {
          ...permit,
          approvalId: "another-test-approval",
        }),
      ).rejects.toThrow();
      await expect(
        claimReservedSlot(root, {
          ...permit,
          reservedAssessment: { ...permit.reservedAssessment!, repetition: 2 },
        }),
      ).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
