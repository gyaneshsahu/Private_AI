import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Decimal from "decimal.js";
import { z } from "zod";
import { experimentSchema, developmentCase } from "./experiment";
import { resultSchema as gradeSchema, taskPassed } from "./grade";
import { configurationIdentity } from "./implementation";
import { reviewResult } from "./review-result";
import frozenManifest from "./frozen-manifest.json";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const identitySchema = z.object({
  observedAt: z.string().datetime(),
  configurationSHA256: hash.optional(),
  implementation: z.object({ adapterAndLockfileSHA256: hash }),
  modelConfiguration: experimentSchema.shape.policy.optional(),
  client: z
    .object({
      conversation: z.object({
        messages: z.array(z.object({ role: z.string(), text: z.string() })),
      }),
    })
    .optional(),
});
const boundReviewSchema = gradeSchema.extend({ sourceResultSHA256: hash });
type Entry = {
  run: string;
  integrity: "VALID" | "INVALID_OR_LEGACY";
  model?: string;
  configuration?: string;
  identitySource?: "RECORDED" | "DERIVED_FROM_CODE_AND_PERMIT";
  caseId?: string;
  caseSet?: "development_case" | "robustness_case" | "reserved_case";
  casePromptsMatch?: boolean;
  family?: string;
  outcome?: string;
  attempts?: number;
  completedReplies?: number;
  estimatedUSD?: string;
  review: "PENDING" | "AGENT_REVIEWED" | "HUMAN_REVIEWED" | "CONFLICT";
  reviewIssues: number;
  acceptableUnderRubric?: boolean;
  findings?: {
    minor: number;
    material: number;
    critical: number;
    serious: number;
  };
};

export function inspectEvidence(
  run: string,
  resultText: string,
  permitInput: unknown,
  reviews: unknown[],
): Entry {
  const entry: Entry = {
    run,
    integrity: "INVALID_OR_LEGACY",
    review: "PENDING",
    reviewIssues: 0,
  };
  try {
    const raw: unknown = JSON.parse(resultText);
    const permit = experimentSchema.parse(permitInput);
    const identity = identitySchema.parse(raw);
    if (
      permit.approvalId !== run ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(permit.policy.model)
    )
      throw Error();
    const expected = configurationIdentity(
      identity.implementation.adapterAndLockfileSHA256,
      permit.policy,
    );
    if (
      permit.scenario === "reserved_case" &&
      (!permit.reservedAssessment ||
        permit.reservedAssessment.configurationSHA256 !== expected ||
        permit.reservedAssessment.fixtureSHA256 !==
          frozenManifest["heldout.json"])
    )
      throw Error();
    if (
      (identity.configurationSHA256 === undefined) !==
        (identity.modelConfiguration === undefined) ||
      (identity.configurationSHA256 !== undefined &&
        (expected !== identity.configurationSHA256 ||
          configurationIdentity(
            identity.implementation.adapterAndLockfileSHA256,
            identity.modelConfiguration!,
          ) !== expected))
    )
      throw Error();
    const summary = reviewResult(raw, permit);
    const c =
      permit.scenario === "development_case" ||
      permit.scenario === "robustness_case" ||
      permit.scenario === "reserved_case"
        ? developmentCase(permit.developmentCaseId, permit.scenario)
        : undefined;
    Object.assign(entry, {
      integrity: "VALID",
      model: permit.policy.model,
      configuration: expected,
      identitySource: identity.configurationSHA256
        ? "RECORDED"
        : "DERIVED_FROM_CODE_AND_PERMIT",
      ...(c
        ? {
            caseId: c.id,
            family: c.family,
            caseSet: permit.scenario as
              "development_case" | "robustness_case" | "reserved_case",
          }
        : {}),
      outcome: summary.outcome,
      attempts: summary.recordedInferenceAttempts,
      completedReplies: summary.completedReplies,
      estimatedUSD: summary.reportedUsage.estimatedUSD,
    });
    const digest = createHash("sha256").update(resultText).digest("hex");
    const transcript = identity.client?.conversation.messages.map(
      ({ role, text }) => ({ role, text }),
    );
    if (c)
      entry.casePromptsMatch =
        JSON.stringify(
          transcript?.filter((m) => m.role === "user").map((m) => m.text),
        ) === JSON.stringify(c.turns);
    const valid = reviews.flatMap((input) => {
      const parsed = boundReviewSchema.safeParse(input);
      if (!parsed.success) {
        entry.reviewIssues++;
        return [];
      }
      const review = parsed.data;
      if (
        review.sourceResultSHA256 !== digest ||
        review.configuration !== expected ||
        review.runAt !== identity.observedAt ||
        review.system !== "PrivateAI" ||
        review.evidenceKind !== "live" ||
        !c ||
        review.caseId !== c.id ||
        (permit.scenario === "reserved_case" &&
          review.repetition !== permit.reservedAssessment?.repetition) ||
        JSON.stringify(
          transcript?.filter((m) => m.role === "user").map((m) => m.text),
        ) !== JSON.stringify(c.turns) ||
        review.assertions.length !== c.mandatoryFacts.length ||
        new Set(review.assertions.map((a) => a.fact)).size !==
          c.mandatoryFacts.length ||
        !review.assertions.every((a) => c.mandatoryFacts.includes(a.fact)) ||
        JSON.stringify(review.transcript) !== JSON.stringify(transcript) ||
        summary.outcome !== "TWO_TURNS_RETURNED_REVIEW_REQUIRED" ||
        summary.relayAssessment === "UNRESOLVED"
      ) {
        entry.reviewIssues++;
        return [];
      }
      return [review];
    });
    if (valid.length > 1) entry.review = "CONFLICT";
    if (valid.length === 1) {
      const review = valid[0];
      entry.review =
        review.reviewerKind === "human" ? "HUMAN_REVIEWED" : "AGENT_REVIEWED";
      entry.acceptableUnderRubric = taskPassed(review);
      entry.findings = {
        minor: review.findings.filter((f) => f.severity === "minor").length,
        material: review.findings.filter((f) => f.severity === "material")
          .length,
        critical: review.findings.filter((f) => f.severity === "critical")
          .length,
        serious: review.seriousErrors.length,
      };
    }
  } catch {
    // Legacy, incomplete or malformed evidence remains visible without raw diagnostics.
  }
  return entry;
}

export async function boundedRead(path: string) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 10 * 1024 * 1024)
    throw Error();
  return readFile(path, "utf8");
}
export async function inventory(root: string) {
  const entries: Entry[] = [];
  for (const dir of (await readdir(root, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    if (
      !dir.isDirectory() ||
      dir.isSymbolicLink() ||
      !/^[a-zA-Z0-9_-]{8,80}$/.test(dir.name)
    )
      continue;
    let result = "",
      permit: unknown;
    const reviews: unknown[] = [];
    try {
      result = await boundedRead(resolve(root, dir.name, "result.json"));
      permit = JSON.parse(
        await boundedRead(resolve(root, dir.name, "permit.json")),
      );
      for (const file of await readdir(resolve(root, dir.name))) {
        if (!/^(agent|human)-review(?:-profile)?-[0-9-]+\.json$/.test(file))
          continue;
        try {
          reviews.push(
            JSON.parse(await boundedRead(resolve(root, dir.name, file))),
          );
        } catch {
          reviews.push(null);
        }
      }
    } catch {
      /* Missing results remain unreviewed; no historical evidence is modified. */
    }
    entries.push(inspectEvidence(dir.name, result, permit, reviews));
  }
  const valid = entries.filter((e) => e.integrity === "VALID");
  return {
    kind: "LOCAL_EVIDENCE_INVENTORY",
    generatedAt: new Date().toISOString(),
    qualityGate: "NOT_ASSESSED",
    providerQualification: "NOT_ASSESSED",
    totals: {
      runs: entries.length,
      invalidOrLegacy: entries.length - valid.length,
      distinctDevelopmentCases: new Set(
        valid.flatMap((e) =>
          e.caseSet === "development_case" &&
          e.caseId &&
          e.casePromptsMatch &&
          (e.completedReplies ?? 0) > 0
            ? [e.caseId]
            : [],
        ),
      ).size,
      distinctSupplementalCases: new Set(
        valid.flatMap((e) =>
          e.caseSet === "robustness_case" &&
          e.caseId &&
          e.casePromptsMatch &&
          (e.completedReplies ?? 0) > 0
            ? [e.caseId]
            : [],
        ),
      ).size,
      distinctReservedCases: new Set(
        valid
          .filter((e) => e.caseSet === "reserved_case" && e.casePromptsMatch)
          .map((e) => e.caseId),
      ).size,
      pendingReviews: entries.filter((e) => e.review === "PENDING").length,
      agentReviewed: entries.filter((e) => e.review === "AGENT_REVIEWED")
        .length,
      humanReviewed: entries.filter((e) => e.review === "HUMAN_REVIEWED")
        .length,
      conflictingReviews: entries.filter((e) => e.review === "CONFLICT").length,
      validatedRecordEstimateUSD: valid
        .reduce((sum, e) => sum.plus(e.estimatedUSD ?? 0), new Decimal(0))
        .toFixed(8),
      actualChargedUSD: null,
    },
    entries,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(
      JSON.stringify(
        await inventory(resolve(".local/experiment-runs")),
        null,
        2,
      ),
    );
  } catch {
    console.error(
      "Evidence inventory unavailable. Check the local experiment directory; no files were modified.",
    );
    process.exitCode = 1;
  }
}
