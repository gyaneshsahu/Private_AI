import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fixtures from "./cases/fidelity-transfer-20261020.json";
import { selectionModels, assertSelectionPolicy } from "./selection-policy";
import { validateExperiment } from "./experiment";
const root = ".local/fidelity-transfer-20261020-router161";
await mkdir(root, { recursive: true });
const template = JSON.parse(
  await readFile(
    ".local/everyday-remaining-20261019/everyday-03-candidate.json",
    "utf8",
  ),
);
const now = new Date().toISOString();
const assessmentModels = { deepseek: selectionModels.deepseek };
const reserve = Object.values(assessmentModels).reduce(
  (n, s) => n + (16 * (8000 * 4 * s.input + 4096 * s.output)) / 1e6,
  0,
);
const budgetEvidence =
  "20October: latest read-only Billing actual0.84/account3/credit10.16/auto-reloadoff; key5 reconfirmed; owner5. Retain0.2781056 historical uncertainty,0.01rounding,no separate pending figure shown. Current public v1/models prices retained. Public router v0.0.161 published20October06:08:34Z digest b7d96b79eeefcaefc82fe8a879cc779e21024f2a86329d81bb39e466202d68fe matches pinned Node SDK verification; development-only pin, production unqualified. No account changes.";
const plan = {
  status: "FROZEN_BEFORE_EXECUTION",
  frozenAt: now,
  stopPolicy: "independent-arms",
  maxRequests: 16,
  maxSearches: 0,
  automaticRetries: 0,
  actualBeforeUSD: 0.84,
  prepaidBeforeUSD: 10.16,
  uncertaintyUSD: 0.2881056,
  reserveUSD: reserve,
  cumulativeBoundUSD: 0.84 + 0.2881056 + reserve,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  budgetEvidence,
  caseIds: fixtures.map((f) => f.id),
  cells: Object.keys(assessmentModels),
  humanScores: null,
  fixtureSHA256: createHash("sha256")
    .update(await readFile("evaluation/cases/fidelity-transfer-20261020.json"))
    .digest("hex"),
  implementationHashes: {} as Record<string, string>,
  scope:
    "Eight fresh complete two-turn tasks on the unchanged provisional default; authored user-provided evidence cases, no live retrieval. No live search, file extraction or image capability claim. Eight compact two-turn tasks; 8000-character context fails explicitly rather than truncating. 4096 output tokens and existing95s stream deadline. No calculator or automatic routing.",
  order:
    "One DeepSeek-low arm; case order fixed. Incomplete stops dependent conversation; unknown transport/auth/integrity stops batch. No retries.",
};
const tracked = execFileSync(
  "git",
  ["ls-files", "src", "shared", "server", "evaluation", "package-lock.json"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
for (const file of new Set([
  ...tracked,
  "evaluation/selection-policy.ts",
  "evaluation/prepare-fidelity.ts",
  "evaluation/cases/fidelity-transfer-20261020.json",
]))
  if (/\.(ts|tsx|json)$/.test(file))
    plan.implementationHashes[file] = createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
for (const f of fixtures)
  for (const [cell, s] of Object.entries(assessmentModels)) {
    const { input, output, ...config } = s;
    const {
      deepSeekThinking,
      deepSeekReasoningEffort,
      gptOssReasoningEffort,
      gemmaThinking,
      glmReasoningEffort,
      ...base
    } = template.policy;
    const permit = {
      ...template,
      developmentCaseId: f.id,
      approvalId: `windows_20261020_router161_${f.id.replaceAll("-", "_")}_${cell}`,
      approvedAt: now,
      expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(),
      approvalEvidence:
        "Owner authorizes eight prepared fidelity and safety cases on unchanged default within cumulativeUSD5 and actual account limits;16requests maximum, synthetic only, separate permits, no retries.",
      pricingEvidence: budgetEvidence,
      providerLimitEvidence: budgetEvidence,
      pricingCheckedAt: now,
      policy: {
        ...base,
        releaseDigests: [
          "b7d96b79eeefcaefc82fe8a879cc779e21024f2a86329d81bb39e466202d68fe",
        ],
        ...config,
        maxInputCharacters: 8000,
        maxOutputTokens: 4096,
        pricing: {
          currency: "USD",
          inputPerMillion: input,
          outputPerMillion: output,
        },
      },
    };
    assertSelectionPolicy(permit.policy, cell);
    validateExperiment(permit);
    await writeFile(
      `${root}/${f.id}-${cell}.json`,
      JSON.stringify(permit, null, 2),
      { flag: "wx" },
    );
  }
await writeFile(`${root}/plan.json`, JSON.stringify(plan, null, 2), {
  flag: "wx",
});
console.log(JSON.stringify({ root, reserve, bound: plan.cumulativeBoundUSD }));
