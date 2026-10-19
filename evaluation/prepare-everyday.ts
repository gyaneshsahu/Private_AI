import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fixtures from "./cases/everyday-transfer-20261019.json";
import { validateExperiment } from "./experiment";
const root = ".local/everyday-20261019-r4";
await mkdir(root, { recursive: true });
const template = JSON.parse(
  await readFile(
    ".local/continuation-20261019/assisted-tool-30-baseline.json",
    "utf8",
  ),
);
const now = new Date().toISOString();
const evidence =
  "19October read-only: billed rounded0.74,key5/account3,credit10.26,auto-reloadoff,no quantified pending figure. Public v1/models reconfirmed GPTOSS0.15/0.60 and DeepSeek0.65/1.45 perM,request0. Retain0.263648 uncertainty plus0.01rounding. Owner cumulativeUSD5. No settings changes.";
const plan = {
  status: "FROZEN_BEFORE_EXECUTION",
  frozenAt: now,
  stopPolicy: "independent-arms",
  maxRequests: 24,
  maxSearches: 0,
  automaticRetries: 0,
  actualBeforeUSD: 0.74,
  prepaidBeforeUSD: 10.26,
  uncertaintyUSD: 0.273648,
  reserveUSD: 0.8687616,
  cumulativeBoundUSD: 1.8824096,
  capUSD: 5,
  providerAccountLimitUSD: 3,
  providerKeyLimitUSD: 5,
  humanScores: null,
  caseIds: fixtures.map((f) => f.id),
  cells: ["baseline", "candidate"],
  budgetEvidence: evidence,
  order:
    "Case major, alternating arm order; two turns; no retry. Known isolated incomplete stops its conversation; unknown integrity/auth/transport failure stops globally.",
  scope:
    "Actual temporary-research workspace ordinary answers. Task facts in user turns; identical authored context marker in source panel. No actual web retrieval. Not ordinary-chat UI or release acceptance.",
  fixtureSHA256: createHash("sha256")
    .update(await readFile("evaluation/cases/everyday-transfer-20261019.json"))
    .digest("hex"),
  implementationHashes: {} as Record<string, string>,
};
const tracked = execFileSync(
  "git",
  ["ls-files", "src", "shared", "server", "evaluation", "package-lock.json"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
for (const f of new Set([...tracked, "evaluation/prepare-everyday.ts"]))
  if (/\.(ts|tsx|json)$/.test(f))
    plan.implementationHashes[f] = createHash("sha256")
      .update(await readFile(f))
      .digest("hex");
for (const fixture of fixtures)
  for (const cell of plan.cells) {
    const deep = cell === "candidate";
    const permit = {
      ...template,
      developmentCaseId: fixture.id,
      approvalId: `windows_20261019_${fixture.id.replaceAll("-", "_")}_${cell}_r4`,
      approvedAt: now,
      expiresAt: new Date(Date.now() + 4 * 3600000).toISOString(),
      approvalEvidence:
        "Founder approves prepared6case ordinary-answer study; maximum24syntheticrequests under cumulativeUSD5. Independent arms, no retries, no private data or release acceptance.",
      providerLimitEvidence: evidence,
      pricingEvidence: evidence,
      pricingCheckedAt: now,
      policy: {
        ...template.policy,
        model: deep ? "deepseek-v4-1-flash" : "gpt-oss-120b",
        gptOssReasoningEffort: deep ? undefined : "high",
        ...(deep
          ? { deepSeekThinking: true, deepSeekReasoningEffort: "low" }
          : {}),
        pricing: {
          currency: "USD",
          inputPerMillion: deep ? 0.65 : 0.15,
          outputPerMillion: deep ? 1.45 : 0.6,
        },
      },
    };
    validateExperiment(permit);
    await writeFile(
      `${root}/${fixture.id}-${cell}.json`,
      JSON.stringify(permit, null, 2),
      { flag: "wx" },
    );
  }
await writeFile(`${root}/plan.json`, JSON.stringify(plan, null, 2), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    root,
    requests: 24,
    reserve: plan.reserveUSD,
    bound: plan.cumulativeBoundUSD,
  }),
);
