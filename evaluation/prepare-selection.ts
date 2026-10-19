import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fixtures from "./cases/model-selection-20261020.json";
import { selectionModels, assertSelectionPolicy } from "./selection-policy";
import { validateExperiment } from "./experiment";
const root = ".local/model-selection-20261020";
await mkdir(root, { recursive: true });
const template = JSON.parse(
  await readFile(
    ".local/everyday-remaining-20261019/everyday-03-candidate.json",
    "utf8",
  ),
);
const now = new Date().toISOString();
const reserve = Object.values(selectionModels).reduce(
  (n, s) => n + (14 * (8000 * 4 * s.input + 4096 * s.output)) / 1e6,
  0,
);
const budgetEvidence =
  "20October: latest read-only Billing actual0.76/account3/credit10.24/auto-reloadoff; key5 last observed; owner5. Retain0.2781056 historical uncertainty,0.01rounding,0.001368 late settlement allowance. Current public v1/models prices retained. No account changes.";
const plan = {
  status: "FROZEN_BEFORE_EXECUTION",
  frozenAt: now,
  stopPolicy: "independent-arms",
  maxRequests: 42,
  maxSearches: 0,
  automaticRetries: 0,
  actualBeforeUSD: 0.76,
  prepaidBeforeUSD: 10.24,
  uncertaintyUSD: 0.2894736,
  reserveUSD: reserve,
  cumulativeBoundUSD: 0.76 + 0.2894736 + reserve,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  budgetEvidence,
  caseIds: fixtures.map((f) => f.id),
  cells: Object.keys(selectionModels),
  humanScores: null,
  fixtureSHA256: createHash("sha256")
    .update(await readFile("evaluation/cases/model-selection-20261020.json"))
    .digest("hex"),
  implementationHashes: {} as Record<string, string>,
  scope:
    "Five ordinary-chat conversations without attachments; document/research synthesis with identical authored source attachments. No live search, file extraction or image capability claim. Seven compact two-turn tasks; 8000-character context fails explicitly rather than truncating. 4096 output tokens and existing95s stream deadline. No calculator or automatic routing.",
  order:
    "Case-major, rotate three arms by case. Incomplete stops dependent conversation; unknown transport/auth/integrity stops batch. No retries.",
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
  "evaluation/prepare-selection.ts",
  "evaluation/cases/model-selection-20261020.json",
]))
  if (/\.(ts|tsx|json)$/.test(file))
    plan.implementationHashes[file] = createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
for (const f of fixtures)
  for (const [cell, s] of Object.entries(selectionModels)) {
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
      approvalId: `windows_20261020_${f.id.replaceAll("-", "_")}_${cell}`,
      approvedAt: now,
      expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(),
      approvalEvidence:
        "Owner authorizes fresh broad fixed model comparison within cumulativeUSD5 and actual account limits;42requests maximum, synthetic only, separate permits, no retries.",
      pricingEvidence: budgetEvidence,
      providerLimitEvidence: budgetEvidence,
      pricingCheckedAt: now,
      policy: {
        ...base,
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
