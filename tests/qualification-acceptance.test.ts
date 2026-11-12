import { expect, it } from "vitest";
import {
  acceptedChecks,
  checks,
  validateQualification,
  verificationSummary,
} from "../shared/contracts";

const report = (review: Record<string, unknown> = {}) => ({
  provider: "tinfoil",
  model: "TEST_ONLY",
  origin: "https://test.tinfoil.sh/",
  repository: "tinfoilsh/test-only",
  releaseDigests: ["a".repeat(64)],
  reviewedAt: new Date(Date.now() - 60_000).toISOString(),
  validUntil: new Date(Date.now() + 60_000).toISOString(),
  review: {
    ...Object.fromEntries(
      checks.map((key) => [
        key,
        { status: "pass", evidence: ["TEST ONLY not provider evidence"] },
      ]),
    ),
    ...review,
  },
  maxInputCharacters: 5000,
  maxOutputTokens: 500,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
  approvedSpendUSD: 1,
});
const accepted = (extra: Record<string, unknown> = {}) => ({
  status: "accepted-by-owner",
  evidence: ["TEST ONLY: browser verifier lacks freshness checks"],
  acceptedAt: new Date(Date.now() - 1000).toISOString(),
  reason: "TEST ONLY: accepted for an invite-only alpha with two users",
  ...extra,
});

it("says verified only when every check passed", () => {
  const passed = validateQualification(report());
  expect(acceptedChecks(passed)).toEqual([]);
  expect(verificationSummary(passed)).toBe(
    "The secure server is checked before each request, and every review check passed.",
  );
});

it("accepts a dated, reasoned owner acceptance and names it instead of claiming verification", () => {
  const partial = validateQualification(
    report({ freshnessAndRevocation: accepted(), retentionAndLogs: accepted() }),
  );
  expect(acceptedChecks(partial)).toEqual([
    "freshnessAndRevocation",
    "retentionAndLogs",
  ]);
  const summary = verificationSummary(partial);
  expect(summary).not.toContain("verified before each request");
  expect(summary).toContain("freshness and revocation checks");
  expect(summary).toContain("supplier retention and logs");
  expect(summary).toContain("not verified");
});

it("refuses acceptances without a reason or date, dated in the future or after expiry, and any other status", () => {
  for (const bad of [
    accepted({ reason: "too short" }),
    accepted({ acceptedAt: undefined }),
    accepted({ evidence: [] }),
    accepted({ acceptedAt: new Date(Date.now() + 60_000).toISOString() }),
    accepted({ acceptedAt: new Date(Date.now() + 120_000).toISOString() }),
    { status: "waived", evidence: ["TEST ONLY not provider evidence"] },
    { status: "pass" },
  ])
    expect(() =>
      validateQualification(report({ negativeTests: bad })),
      JSON.stringify(bad),
    ).toThrow();
});

it("never says verified for a report whose checks are missing or unknown", () => {
  const partial = { ...report(), review: {} } as never;
  expect(verificationSummary(partial)).toBe(
    "The secure server is checked before each request.",
  );
  expect(acceptedChecks(partial)).toEqual([]);
});

it("says when the check runs for the provider in use: per session for Privatemode, Tinfoil unchanged", () => {
  const pm = (review: Record<string, unknown> = {}) => ({ ...report(review), provider: "privatemode" }) as never;
  expect(verificationSummary(pm())).toBe(
    "The secure server is checked when you start chatting and again at least every 10 minutes, and every review check passed.",
  );
  expect(verificationSummary({ ...(pm() as object), review: {} } as never)).toBe(
    "The secure server is checked when you start chatting and again at least every 10 minutes.",
  );
  const partial = verificationSummary(pm({ retentionAndLogs: accepted() }));
  expect(partial).toMatch(/^The secure server is checked when you start chatting and again at least every 10 minutes, but not every check has passed\./);
  for (const summary of [verificationSummary(pm()), partial]) expect(summary).not.toContain("before each request");
  // Tinfoil's three texts stay byte for byte.
  expect(verificationSummary(report() as never)).toBe(
    "The secure server is checked before each request, and every review check passed.",
  );
  expect(verificationSummary({ ...report(), provider: undefined } as never)).toBe(
    "The secure server is checked before each request, and every review check passed.",
  );
});
