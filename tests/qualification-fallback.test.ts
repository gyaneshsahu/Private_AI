import { expect, it } from "vitest";
import { checks, validateQualification } from "../shared/contracts";

const report = () => ({
  provider: "tinfoil",
  model: "TEST_ONLY",
  origin: "https://test.tinfoil.sh/",
  repository: "tinfoilsh/test-only",
  releaseDigests: ["a".repeat(64)],
  reviewedAt: new Date(Date.now() - 1000).toISOString(),
  validUntil: new Date(Date.now() + 60000).toISOString(),
  review: Object.fromEntries(
    checks.map((key) => [
      key,
      { status: "pass", evidence: ["TEST ONLY not provider evidence"] },
    ]),
  ),
  maxInputCharacters: 5000,
  maxOutputTokens: 500,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  approvedSpendUSD: 1,
});

it("accepts an optional distinct fallback model and refuses automatic or identical ones", () => {
  expect(validateQualification(report()).fallbackModel).toBeUndefined();
  expect(
    validateQualification({ ...report(), fallbackModel: "TEST_FALLBACK" })
      .fallbackModel,
  ).toBe("TEST_FALLBACK");
  expect(() =>
    validateQualification({ ...report(), fallbackModel: "TEST_ONLY" }),
  ).toThrow("must differ");
  expect(() =>
    validateQualification({ ...report(), fallbackModel: "auto" }),
  ).toThrow();
  expect(() =>
    validateQualification({ ...report(), fallbackModel: "" }),
  ).toThrow();
});

it("keeps the reviewed model settings and gives each model only its own (T6 finding, 12 November)", async () => {
  const { policyForModel } = await import("../shared/contracts");
  const parsed = validateQualification({
    ...report(),
    model: "gemma4-31b",
    fallbackModel: "gpt-oss-120b",
    gemmaThinking: false,
    gptOssReasoningEffort: "low",
  });
  // Before the fix, parsing silently dropped both settings.
  expect(parsed.gemmaThinking).toBe(false);
  expect(parsed.gptOssReasoningEffort).toBe("low");
  const primary = policyForModel(parsed, parsed.model);
  expect(primary).toMatchObject({ model: "gemma4-31b", gemmaThinking: false });
  expect(primary.gptOssReasoningEffort).toBeUndefined();
  const fallback = policyForModel(parsed, parsed.fallbackModel!);
  expect(fallback).toMatchObject({ model: "gpt-oss-120b", gptOssReasoningEffort: "low" });
  expect(fallback.gemmaThinking).toBeUndefined();
  expect(() =>
    validateQualification({ ...report(), model: "gemma4-31b", glmReasoningEffort: "low" }),
  ).toThrow("does not qualify");
});
