import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { validateExperiment } from "./experiment";
import fixtures from "./cases/research-tools.json";
const root = process.argv[2];
if (!root?.startsWith(".local/matched-"))
  throw Error("Matched local directory required");
await mkdir(root, { recursive: true });
const now = new Date().toISOString();
const template = JSON.parse(
  await readFile(".local/checked-20261015/1.json", "utf8"),
);
const cells = [
  "deepseek-normal",
  "gptoss-normal",
  "deepseek-calculator",
  "gptoss-calculator",
];
const selected = fixtures.filter((f) =>
  ["26", "27", "28", "29"].includes(f.id.slice(-2)),
);
const reserveUSD =
  (16 * (80000 * 0.65 + 4096 * 1.45)) / 1e6 +
  (16 * (80000 * 0.15 + 4096 * 0.6)) / 1e6;
const plan = {
  status: "FROZEN_BEFORE_EXECUTION",
  frozenAt: now,
  maxRequests: 32,
  maxSearches: 0,
  automaticRetries: 0,
  actualBeforeUSD: 0.72,
  prepaidBeforeUSD: 10.28,
  uncertaintyUSD: 0.2491904,
  reserveUSD,
  cumulativeBoundUSD: 0.72 + 0.2491904 + reserveUSD,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  publicContentPersistence: false,
  humanScores: null,
  caseIds: selected.map((f) => f.id),
  cells,
  order:
    "Case-major, rotate four cells by case index. Two turns per cell, independent conversation. Global stop on first incomplete or application failure; no retries or continuation.",
  baseline:
    "Normal answers: DeepSeek thinking=true reasoning_effort=low versus GPT-OSS reasoning_effort=high; both constraints-v4",
  candidate:
    "Same model settings plus current optionalCalculator + calculatorReplay + ratioPercent. One inference per turn; no post-tool continuation.",
  bounds:
    "20000 input characters including tools/replay; 4096 output tokens; same questions/sources/limits. Synthetic sources only. Not acceptance; one sample per cell.",
  fixtureSHA256: createHash("sha256")
    .update(await readFile("evaluation/cases/research-tools.json"))
    .digest("hex"),
  implementationHashes: {} as Record<string, string>,
  budgetEvidence:
    "Read-only16October: actual0.72, credit10.28,289requests,autoreload off, key5/account3. No separate pending figure. User approves cumulative5; no account edits. Public catalog input/output perM DeepSeek0.65/1.45 GPTOSS0.15/0.60;request0.",
};
if (
  plan.cumulativeBoundUSD > Math.min(plan.capUSD, plan.providerAccountLimitUSD)
)
  throw Error("Reserve does not fit existing account controls");
for (const file of execFileSync(
  "git",
  ["ls-files", "src", "shared", "server", "evaluation", "package-lock.json"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((f) => /\.(ts|tsx)$/.test(f) || f === "package-lock.json"))
  plan.implementationHashes[file] = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
for (const f of selected)
  for (const cell of cells) {
    const deep = cell.startsWith("deepseek");
    const calc = cell.endsWith("calculator");
    const policy = {
      origin: template.policy.origin,
      repository: template.policy.repository,
      releaseDigests: template.policy.releaseDigests,
      model: deep ? "deepseek-v4-1-flash" : "gpt-oss-120b",
      maxInputCharacters: 20000,
      maxOutputTokens: 4096,
      answerPolicyVariant: "constraints-v4",
      pricing: {
        inputPerMillion: deep ? 0.65 : 0.15,
        outputPerMillion: deep ? 1.45 : 0.6,
        currency: "USD",
      },
      ...(deep
        ? { deepSeekThinking: true, deepSeekReasoningEffort: "low" }
        : { gptOssReasoningEffort: "high" }),
      ...(calc ? { optionalCalculator: true, calculatorReplay: true } : {}),
    };
    const permit = {
      ...template,
      policy,
      developmentCaseId: f.id,
      approvalId: `windows_20261016_matched_${f.id.slice(-2)}_${cell.replaceAll("-", "_")}`,
      approvedAt: now,
      expiresAt: new Date(Date.now() + 4 * 3600000).toISOString(),
      approvedCapUSD: 5,
      providerCapUSD: 3,
      approvalEvidence:
        "Founder explicitly requests offline replay then fixed matched DeepSeek low versus GPTOSS high, normal and calculator paths. Authorizes cumulativeUSD5. Max32syntheticrequests; stop on any incomplete without retry. No release acceptance.",
      providerLimitEvidence:
        plan.budgetEvidence + " Conservativebound=" + plan.cumulativeBoundUSD,
      pricingEvidence: plan.budgetEvidence,
      pricingCheckedAt: now,
      browserPreflightEvidence:
        "PinnedSDK browser re-verifies routerrelease8daaecd4 before each paidrequest; no bypass. Previous observed releasev0.0.158. Full privacy qualification remainsblocked.",
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
    root,
    maxRequests: 32,
    reserveUSD,
    bound: plan.cumulativeBoundUSD,
  }),
);
