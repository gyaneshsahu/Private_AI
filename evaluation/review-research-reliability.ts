import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import fixtures from "./cases/research-reliability-transfer.json";
import assessment from "./results/research-reliability-20261012-assessment.json";
import type { Usage, Source } from "../shared/contracts";
import type { Experiment } from "./experiment";

type Reply = {
  completed: boolean;
  answer: string;
  usage?: Usage;
  elapsedMs: number;
  firstVisibleTextMs: number | null;
  evidenceAudit?: {
    unknownSourceReferences: number;
    citationReferences: number;
  };
};
type Result = {
  id: string;
  fixture: (typeof fixtures.cases)[number];
  sources: Source[];
  replies: Reply[];
  attempts: unknown[];
};
const root = resolve(
  ".local/experiment-runs/windows_20261012_reliability_batch",
);
const plan = JSON.parse(await readFile(resolve(root, "plan.json"), "utf8"));
const hash = createHash("sha256")
  .update(await readFile("evaluation/cases/research-reliability-transfer.json"))
  .digest("hex");
if (plan.fixtureSHA256 !== hash) throw Error("Frozen fixture changed");
const runs: Array<
  Result & { permit: Experiment; arm: string; humanScores: null }
> = [];
for (let i = 1; i <= 24; i++) {
  const dir = resolve(
    `.local/experiment-runs/windows_20261012_reliability_${i}`,
  );
  let result: Result;
  try {
    result = JSON.parse(await readFile(resolve(dir, "result.json"), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
    throw e;
  }
  const permit: Experiment = JSON.parse(
    await readFile(resolve(dir, "permit.json"), "utf8"),
  );
  const fixture = fixtures.cases.find((c) => c.id === result.id);
  if (
    !fixture ||
    result.fixture.source !== fixture.source ||
    JSON.stringify(result.fixture.turns) !== JSON.stringify(fixture.turns) ||
    result.sources.length !== 1 ||
    result.sources[0].text !== fixture.source
  )
    throw Error("Only unchanged authored fixtures may be persisted");
  runs.push({
    ...result,
    permit,
    arm:
      permit.policy.deepSeekThinking === false
        ? "DeepSeek thinking off"
        : "DeepSeek default",
    humanScores: null,
  });
}
const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length
    ? (v[Math.floor(v.length / 2)] + v[Math.floor((v.length - 1) / 2)]) / 2
    : null;
};
const arms = fixtures.arms.map((arm) => {
  const replies = runs.filter((r) => r.arm === arm).flatMap((r) => r.replies);
  return {
    arm,
    attempts: replies.length,
    complete: replies.filter((r) => r.completed).length,
    observedUsageEstimateUSD: replies.reduce(
      (s, r) => s + (r.usage?.estimatedUSD ?? 0),
      0,
    ),
    medianTotalMs: median(replies.map((r) => r.elapsedMs)),
    medianFirstVisibleTextMs: median(
      replies.flatMap((r) =>
        r.firstVisibleTextMs === null ? [] : [r.firstVisibleTextMs],
      ),
    ),
    noVisibleText: replies.filter((r) => r.firstVisibleTextMs === null).length,
    over30Seconds: replies.filter((r) => r.elapsedMs > 30000).length,
    unknownReferenceReplies: replies.filter(
      (r) => (r.evidenceAudit?.unknownSourceReferences ?? 0) > 0,
    ).length,
  };
});
const report = {
  status:
    runs.length === 24
      ? "DEVELOPMENT_EXECUTED_NOT_ACCEPTED"
      : "PARTIAL_DEVELOPMENT_NOT_ACCEPTED",
  humanReview: "PENDING",
  budget: JSON.parse(await readFile(resolve(root, "billing.json"), "utf8")),
  aiProposedAssessment: assessment,
  executionMetadata: JSON.parse(
    await readFile(resolve(root, "metadata.json"), "utf8"),
  ),
  plan,
  arms,
  runs,
  limitations: [
    "One sample per case/configuration; no reliability-rate or reserved-acceptance claim.",
    "First nonblank delivered text is a proxy, not human-confirmed useful content or UI paint. No-answer attempts are reported separately, never as zero latency.",
    "Fresh browser context per conversation; both turns fetch attestation. Sequential requests, not the required multi-period/concurrency sample.",
    "Synthetic authored sources only; no live Brave retrieval qualification, privacy qualification or release promotion.",
    "Incomplete replies are unscored; interim usage is not a final charge. Preserve full-request uncertainty until billing reconciles.",
  ],
};
await writeFile(
  "evaluation/results/research-reliability-20261012.json",
  JSON.stringify(report, null, 2),
);
const esc = (x: unknown) =>
  String(x).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const findings: Record<string, string> = assessment.findings;
const sections = fixtures.cases
  .map(
    (f) =>
      `<section id="${f.id}"><h2>${esc(f.id)} · ${esc(f.title)}</h2><h3>Original authored source</h3><pre>${esc(f.source)}</pre><h3>Frozen expected facts</h3><p>${esc(f.expected)}</p><h3>AI-proposed observations (not human grades)</h3><p>${esc(findings[f.id] ?? "Assessment pending")}</p>${runs
        .filter((r) => r.id === f.id)
        .map(
          (r) =>
            `<details open><summary>${esc(r.arm)}</summary><p>Human correctness / completeness / context: ${r.replies.length === 2 && r.replies.every((p) => p.completed) ? "— / — / — (pending)" : "Unscored — incomplete conversation"}</p>${f.turns.map((q, i) => `<h4>User ${i + 1}</h4><pre>${esc(q)}</pre><h4>Assistant ${i + 1}</h4><pre>${esc(r.replies[i]?.answer || "NO COMPLETE ANSWER")}</pre><p>${r.replies[i]?.completed ? "Complete" : "Incomplete / not attempted"}; first visible text ${r.replies[i]?.firstVisibleTextMs ?? "not observed"} ms; total ${r.replies[i]?.elapsedMs ?? "not attempted"} ms.</p>`).join("")}</details>`,
        )
        .join("")}</section>`,
  )
  .join("");
const out = resolve(".local/review-batches/reliability-research-20261012");
await mkdir(out, { recursive: true });
await writeFile(
  resolve(out, "complete-review.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>PrivateAI fresh transfer review</title><style>body{font:17px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 20px;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#f2f5f8;padding:16px;font:inherit}section{border-top:2px solid #ccd6de;margin:28px 0}summary{font-weight:bold;cursor:pointer}</style><h1>Fresh safety, constraint and latency comparison</h1><p>Development evidence only. Human grades pending; no release selection.</p><pre>${esc(JSON.stringify(arms, null, 2))}</pre><ul>${report.limitations.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${sections}</html>`,
);
console.log(
  JSON.stringify({
    runs: runs.length,
    arms,
    review: resolve(out, "complete-review.html"),
  }),
);
