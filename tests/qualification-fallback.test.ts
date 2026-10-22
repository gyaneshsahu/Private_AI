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
