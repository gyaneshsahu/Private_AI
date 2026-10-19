import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { validateExperiment } from "./experiment";
import fixtures from "./cases/research-tools.json";
const root = ".local/continuation-20261019";
await mkdir(root, { recursive: true });
const now = new Date().toISOString();
const expires = new Date(Date.now() + 4 * 3600000).toISOString();
const template = JSON.parse(
  await readFile(".local/checked-20261015/1.json", "utf8"),
);
const selected = fixtures.filter((f) =>
  ["30", "31", "32", "33"].includes(f.id.slice(-2)),
);
const reserveUSD = (24 * (80000 * 0.15 + 4096 * 0.6)) / 1e6;
const evidence =
  "Read-only19October: actual0.74,credit10.26,301requests,auto-reload off,key5/account3,no separate pending amount. Public v1/models GPTOSS120B input0.15/output0.60 per million,request0. User authorized cumulative5; no account changes.";
const plan = {
  status: "FROZEN_BEFORE_EXECUTION",
  frozenAt: now,
  maxRequests: 24,
  maxSearches: 0,
  automaticRetries: 0,
  actualBeforeUSD: 0.74,
  prepaidBeforeUSD: 10.26,
  uncertaintyUSD: 0.2491904,
  reserveUSD,
  cumulativeBoundUSD: 0.74 + 0.2491904 + reserveUSD,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  humanScores: null,
  caseIds: selected.map((f) => f.id),
  cells: ["baseline", "candidate"],
  order:
    "Case-major, alternate baseline/candidate order by case index. Global stop at first incomplete; no retries. Two turns per conversation.",
  baseline:
    "GPTOSS120B high reasoning constraints-v4 normal answers; one inference per turn.",
  candidate:
    "Identical model/settings plus optional calculator and one separately permitted explanation; no replay. At most two inferences per turn.",
  bounds:
    "20000 input characters including tool context;4096outputtokens per inference;authored synthetic sources only. Not acceptance.",
  budgetEvidence: evidence,
  fixtureSHA256: createHash("sha256")
    .update(await readFile("evaluation/cases/research-tools.json"))
    .digest("hex"),
  implementationHashes: {} as Record<string, string>,
};
if (plan.cumulativeBoundUSD > 3) throw Error("Budget");
const files = execFileSync(
  "git",
  ["ls-files", "src", "shared", "server", "evaluation", "package-lock.json"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((f) => /\.(ts|tsx)$/.test(f) || f === "package-lock.json");
for (const f of new Set([...files, "evaluation/prepare-continuation.ts"]))
  plan.implementationHashes[f] = createHash("sha256")
    .update(await readFile(f))
    .digest("hex");
for (const f of selected)
  for (const cell of plan.cells) {
    const candidate = cell === "candidate";
    const id = `windows_20261019_continuation_${f.id.slice(-2)}_${cell}`;
    const permit = {
      ...template,
      developmentCaseId: f.id,
      approvalId: id,
      approvedAt: now,
      expiresAt: expires,
      approvedCapUSD: 5,
      providerCapUSD: 3,
      approvalEvidence:
        "Founder authorizes necessary bounded synthetic tests under cumulativeUSD5. Fixed4freshcases, maximum24requests including continuation calls. Stop first incomplete, no retries. No release acceptance.",
      providerLimitEvidence: evidence,
      pricingEvidence: evidence,
      pricingCheckedAt: now,
      browserPreflightEvidence:
        "PinnedSDK read-only attestation verified19October routerv0.0.159 SEV-SNPv2 digest1ffc1cde. Browser must reverify same pin before each paid call. Full privacy stillblocked.",
      releaseReviewEvidence:
        "Scoped synthetic-only review of publicv0.0.159 routing/admission diff and exacttagconfig: pool loadtiers replace shadowrouting, localinflightaccounting, legacyexempt removal; CVM0.14.13 and safeguards0.1.1 unchanged. CompareAPI diverged; exacttagconfigs checked. Not a full security audit.",
      policy: {
        origin: template.policy.origin,
        repository: template.policy.repository,
        releaseDigests: [
          "1ffc1cde7acd5134367cb9f430024203ed4455a51ee4473f7b3e75bd556d0a6b",
        ],
        model: "gpt-oss-120b",
        gptOssReasoningEffort: "high",
        answerPolicyVariant: "constraints-v4",
        maxInputCharacters: 20000,
        maxOutputTokens: 4096,
        pricing: {
          currency: "USD",
          inputPerMillion: 0.15,
          outputPerMillion: 0.6,
        },
        ...(candidate
          ? { optionalCalculator: true, calculatorContinuation: true }
          : {}),
      },
      ...(candidate
        ? {
            continuationApproval: {
              approvalId: id + "_explain",
              expiresAt: expires,
              approvalEvidence:
                "Separate continuation allowance under same cumulative authorization: at most one additional inference for each of the two turns, no retries.",
            },
          }
        : {}),
    };
    validateExperiment(permit);
    await writeFile(
      `${root}/${f.id}-${cell}.json`,
      JSON.stringify(permit, null, 2),
      { flag: "wx" },
    );
  }
await writeFile(root + "/plan.json", JSON.stringify(plan, null, 2), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    maxRequests: 24,
    reserveUSD,
    bound: plan.cumulativeBoundUSD,
  }),
);
