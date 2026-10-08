import { z } from "zod";
import Decimal from "decimal.js";
import { experimentSchema, experimentRequestLimit } from "./experiment";

const usageSchema = z
  .object({
    input: z.number().int().nonnegative().safe(),
    output: z.number().int().nonnegative().safe(),
    total: z.number().int().nonnegative().safe(),
  })
  .refine((x) => x.input + x.output === x.total);
const resultSchema = z.object({
  kind: z.enum(["SYNTHETIC_EXPERIMENT", "NONBILLABLE_DIAGNOSTIC"]),
  attempts: z
    .array(
      z.object({
        outcome: z.string(),
        responseFinished: z.boolean().optional(),
      }),
    )
    .max(2),
  browserStreamLifecycle: z
    .object({
      requestSignalAborts: z.number().int().nonnegative(),
      readerCancels: z.number().int().nonnegative(),
    })
    .optional(),
  network: z
    .array(
      z.object({
        outcome: z.string(),
        route: z.string().optional(),
        requestId: z.number().int().optional(),
        code: z.string().optional(),
        status: z.number().int().optional(),
        noStore: z.boolean().optional(),
      }),
    )
    .default([]),
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
  const expectedTurns = experimentRequestLimit(permit);
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
    c.evidence.length === expectedTurns &&
    r.attempts.length === expectedTurns &&
    r.attempts.every(
      (a) => a.outcome === "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED",
    ) &&
    c.conversation.messages.filter(
      (m) => m.role === "assistant" && m.status === "complete",
    ).length === expectedTurns &&
    c.conversation.usage.length === expectedTurns;
  const relayEvents = r.network.filter((n) => n.route === "INFERENCE_RELAY");
  const finished = new Set(
    relayEvents
      .filter((n) => n.outcome === "REQUEST_FINISHED")
      .map((n) => n.requestId)
      .filter((id) => id != null),
  );
  const relayClosure = relayEvents.some((n) => n.outcome === "REQUEST_FAILED")
    ? "FAILED"
    : finished.size === expectedTurns
      ? "FINISHED"
      : relayEvents.length
        ? "MISSING_TERMINAL_EVENT"
        : "NOT_RECORDED";
  const usage = c?.conversation.usage ?? [];
  const terminals = relayEvents.filter((n) =>
    ["REQUEST_FAILED", "REQUEST_FINISHED"].includes(n.outcome),
  );
  // Chromium can report ERR_ABORTED for a fully consumed no-store response.
  // Retain the failure event; require independent client/server completion and
  // zero cancellation. Historical records lacking this evidence stay unresolved.
  const browserAbortAfterCompletion =
    completed &&
    relayClosure === "FAILED" &&
    r.attempts.every((a) => a.responseFinished === true) &&
    r.browserStreamLifecycle?.requestSignalAborts === 0 &&
    r.browserStreamLifecycle.readerCancels === 0 &&
    terminals.length === expectedTurns &&
    new Set(terminals.map((n) => n.requestId)).size === expectedTurns &&
    terminals.every(
      (n) =>
        n.requestId != null &&
        (n.outcome === "REQUEST_FINISHED" || n.code === "net::ERR_ABORTED") &&
        relayEvents.some(
          (response) =>
            response.requestId === n.requestId &&
            response.outcome === "HTTP_RESPONSE" &&
            response.status === 200 &&
            response.noStore === true,
        ),
    ) &&
    !r.network.some(
      (n) => n.outcome === "REQUEST_FAILED" && n.route !== "INFERENCE_RELAY",
    );
  const relayAssessment = browserAbortAfterCompletion
    ? "VALIDATED_COMPLETE_WITH_CHROMIUM_ABORT"
    : relayClosure === "FINISHED"
      ? "NORMAL_COMPLETION"
      : "UNRESOLVED";
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
        ? expectedTurns === 1
          ? "COMPATIBILITY_RETURNED_REVIEW_REQUIRED"
          : "TWO_TURNS_RETURNED_REVIEW_REQUIRED"
        : "INCOMPLETE_REVIEW_REQUIRED",
    relayClosure,
    relayAssessment,
    compatibilityEvidence:
      expectedTurns === 1 && completed && relayAssessment !== "UNRESOLVED"
        ? "READY_FOR_HUMAN_REVIEW"
        : "NOT_PASSED",
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

export function reviewExitCode(
  summary: ReturnType<typeof reviewResult>,
): 0 | 1 {
  if (summary.outcome === "DIAGNOSTIC_REACHED_INFERENCE_BOUNDARY") return 0;
  return summary.outcome === "INCOMPLETE_REVIEW_REQUIRED" ||
    summary.relayAssessment === "UNRESOLVED"
    ? 1
    : 0;
}
