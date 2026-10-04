import { z } from "zod";
import Decimal from "decimal.js";
import { experimentSchema } from "./experiment";

const usageSchema = z
  .object({
    input: z.number().int().nonnegative().safe(),
    output: z.number().int().nonnegative().safe(),
    total: z.number().int().nonnegative().safe(),
  })
  .refine((x) => x.input + x.output === x.total);
const resultSchema = z.object({
  kind: z.enum(["SYNTHETIC_EXPERIMENT", "NONBILLABLE_DIAGNOSTIC"]),
  attempts: z.array(z.object({ outcome: z.string() })).max(2),
  network: z.array(z.object({ outcome: z.string() })).default([]),
  client: z
    .object({
      failure: z.string().nullable(),
      evidence: z
        .array(z.object({ host: z.string(), releaseDigest: z.string() }))
        .max(2),
      timings: z.array(z.number().nonnegative().finite()).max(2),
      conversation: z.object({
        messages: z.array(z.object({ role: z.string(), status: z.string() })),
        usage: z.array(usageSchema).max(2),
      }),
    })
    .optional(),
});

// Recorded observations only; never promotes provider qualification or grades
// answer semantics. Do not echo transcript, provider errors or arbitrary URLs.
export function reviewResult(input: unknown, permitInput: unknown) {
  const r = resultSchema.parse(input);
  const permit = experimentSchema.parse(permitInput); // Historical record, not fresh authorization.
  const c = r.client;
  const matches =
    !!c?.evidence.length &&
    c.evidence.every(
      (e) =>
        e.host === new URL(permit.policy.origin).hostname &&
        permit.policy.releaseDigests.includes(e.releaseDigest),
    );
  const boundaryReached =
    r.kind === "NONBILLABLE_DIAGNOSTIC" &&
    r.attempts.length === 0 &&
    matches &&
    r.network.some((n) => n.outcome === "INFERENCE_BLOCKED_BY_DIAGNOSTIC");
  const completed =
    r.kind === "SYNTHETIC_EXPERIMENT" &&
    c?.failure === null &&
    matches &&
    c.evidence.length === 2 &&
    r.attempts.length === 2 &&
    r.attempts.every(
      (a) => a.outcome === "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED",
    ) &&
    c.conversation.messages.filter(
      (m) => m.role === "assistant" && m.status === "complete",
    ).length === 2 &&
    c.conversation.usage.length === 2;
  const usage = c?.conversation.usage ?? [];
  const inputTokens = usage.reduce((n, u) => n + u.input, 0);
  const outputTokens = usage.reduce((n, u) => n + u.output, 0);
  const estimate = new Decimal(inputTokens)
    .mul(permit.policy.pricing.inputPerMillion)
    .plus(new Decimal(outputTokens).mul(permit.policy.pricing.outputPerMillion))
    .div(1000000);
  return {
    outcome: boundaryReached
      ? "DIAGNOSTIC_REACHED_INFERENCE_BOUNDARY"
      : completed
        ? "TWO_TURNS_RETURNED_REVIEW_REQUIRED"
        : "INCOMPLETE_REVIEW_REQUIRED",
    recordedInferenceAttempts: r.attempts.length,
    recordedMatchingVerifications: matches ? c!.evidence.length : 0,
    completedReplies:
      c?.conversation.messages.filter(
        (m) => m.role === "assistant" && m.status === "complete",
      ).length ?? 0,
    reportedUsage: {
      inputTokens,
      outputTokens,
      turns: usage.length,
      estimatedUSD: estimate.toFixed(8),
    },
    actualChargedUSD: null,
    turnDurationsMs: c?.timings ?? [],
    recordedNetworkFailures: r.network.filter(
      (n) => n.outcome === "REQUEST_FAILED",
    ).length,
    quality: "HUMAN_REVIEW_REQUIRED",
    providerQualification: "NOT_PASSED",
    automaticRetry: false,
  };
}
