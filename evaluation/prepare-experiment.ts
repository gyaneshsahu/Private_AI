import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { validateExperiment } from "./experiment";

const selectedDigest =
  "ad95d02b2e27b3c1d5c327f2ee9616634f841e4b2ed5a48f404e4e9f595a4876";
const approvalId = "synthetic_20261004_two_turns_usd2";

const preflightSchema = z.object({
  observedAt: z.string().datetime(),
  kind: z.literal("LIVE_BROWSER_PREFLIGHT"),
  result: z.literal("ROUTER_VERIFICATION_PASSED"),
  inferenceRequests: z.literal(0),
  requests: z.array(
    z.object({
      host: z.string(),
      path: z.string(),
      status: z.number().int(),
    }),
  ),
  verification: z.object({
    securityVerified: z.literal(true),
    host: z.literal("inference.tinfoil.sh"),
    repository: z.literal("tinfoilsh/confidential-model-router"),
    releaseDigest: z.literal(selectedDigest),
  }),
  providerQualification: z.literal("NOT_PASSED"),
});

export function prepareFromPreflight(raw: unknown, now = Date.now()) {
  const proof = preflightSchema.parse(raw);
  const age = now - Date.parse(proof.observedAt);
  if (
    age < 0 ||
    age > 24 * 60 * 60 * 1000 ||
    proof.requests.length !== 1 ||
    proof.requests[0].host !== "atc.tinfoil.sh" ||
    proof.requests[0].path !== "/attestation" ||
    proof.requests[0].status !== 200
  )
    throw new Error(
      "Browser verification evidence is old or does not match the approved one-request preflight.",
    );
  const nowText = new Date(now).toISOString();
  return validateExperiment(
    {
      purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
      approvalId,
      approvedAt: nowText,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      approvalEvidence:
        "User approved up to USD 2 actual spending for exactly one two-turn synthetic test in this conversation on 2026-10-04; this is not private-data provider approval.",
      approvedCapUSD: 2,
      providerCapUSD: 2,
      providerLimitEvidence:
        "User reports a USD 2 account spending limit and disabled auto-recharge in the Tinfoil dashboard on 2026-10-04; this is user-reported, not independently inspected.",
      pricingEvidence:
        "User transcribed Tinfoil API model pricing: gpt-oss-120b USD 0.15 per 1M input tokens, USD 0.60 per 1M output tokens, no listed request fee, on 2026-10-04.",
      pricingCheckedAt: nowText,
      browserPreflightEvidence: `User-run WSL Chromium at ${proof.observedAt}, ATC HTTP 200, verified router ${proof.verification.releaseDigest}, zero inference requests.`,
      releaseReviewEvidence:
        "Router release digest matches earlier Node and user-run Chromium verification. Scope is one synthetic experiment; downstream model chain and operational release approval remain unverified.",
      policy: {
        origin: "https://inference.tinfoil.sh",
        repository: "tinfoilsh/confidential-model-router",
        releaseDigests: [proof.verification.releaseDigest],
        model: "gpt-oss-120b",
        maxInputCharacters: 8000,
        maxOutputTokens: 2048,
        pricing: {
          inputPerMillion: 0.15,
          outputPerMillion: 0.6,
          currency: "USD",
        },
      },
    },
    now,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.error(
    "The original two-turn test is complete. Its approval cannot be reissued. Review existing evidence; a compatibility check requires separate confirmation of the additional request scope.",
  );
  process.exitCode = 1;
}
