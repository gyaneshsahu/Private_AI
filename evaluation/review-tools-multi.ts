import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-tools.json";
const roots = [
  ".local/tools-multi-live-20261016",
  ".local/tool-diagnostic-live-20261016",
  ".local/tool-invoice-live-20261016",
];
const runs = await Promise.all(
  roots.map(async (root) => ({
    root,
    plan: JSON.parse(await readFile(root + "/plan.json", "utf8")),
    report: JSON.parse(await readFile(root + "/results.json", "utf8")),
  })),
);
const replies = runs.flatMap((r) =>
  r.report.results.flatMap((c: any) => c.replies),
);
const metrics = {
  attempted: replies.length,
  delivered: replies.filter((r: any) => r.completed).length,
  estimatedUSD: replies.reduce(
    (s: number, r: any) => s + (r.usage?.estimatedUSD ?? 0),
    0,
  ),
  humanScores: null,
};
const assessment = {
  status: "AI_PROPOSED_NOT_HUMAN_REVIEW",
  decision:
    "Keep experimental. Multi-result energy/cost works in two turns; writing and delivery remain blockers.",
  findings: [
    "05 both arms add unrequested promises to follow up. Candidate calls compensation undecided when source only says notices are silent, and is too verbose for short alternatives.",
    "06 candidate computes124subtotal,18.60tax,149.60total; omits explicit untaxed-fee explanation. Follow-up INVALID_SCHEMA, no answer; exact violation not captured. Baseline unattempted after stop.",
    "07 separate fresh diagnostic:7.20kWh/2.16EUR then8.40kWh/2.52EUR correct independently; no baseline. Human scores blank.",
    "08 separate fresh diagnostic: rejected digit8 sourced from wordEight. Captured synthetic argument proves lexical validator limitation. Offline normalization replay computes128.70EUR; original live failure remains unscored. Follow-up unattempted.",
  ],
  stop: "Main6requests stopped on06candidateT2; separate07diagnostic2complete; separate08diagnostic1failed then stopped. No retries or continuing stopped plans.",
};
await writeFile(
  "evaluation/results/research-tools-multi-20261016.json",
  JSON.stringify({ runs, metrics, assessment }, null, 2) + "\n",
);
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const out = ".local/review-batches/tools-multi-20261016";
await mkdir(out, { recursive: true });
let html =
  '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Optional calculator comparison</title><style>body{max-width:950px;margin:auto;padding:20px;font:18px system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid;padding:16px;margin:16px 0}</style><h1>Optional calculator: stopped comparison</h1><p>All evidence authored synthetic. Human scores blank. Missing answers unscored.</p>';
for (const run of runs)
  for (const c of run.report.results) {
    const f = fixtures.find((f) => f.id === c.id)!;
    html += `<h2>${esc(c.id)} ${esc(c.arm)}</h2><pre>${esc(JSON.stringify(f.sources, null, 2))}</pre><h3>Expected facts</h3><pre>${esc(f.mandatoryFacts.join("\n"))}</pre>`;
    for (let i = 0; i < f.turns.length; i++) {
      const r = c.replies[i];
      html += `<article><h3>Turn${i + 1}</h3><pre>${esc(f.turns[i])}</pre><pre>${esc(r?.answer || (r ? "NO COMPLETED ANSWER" : "NOT ATTEMPTED"))}</pre><p>Human scores: ${r?.completed ? "___ / ___ / ___" : "UNSCORED"}</p><p>Latency${esc(r?.elapsedMs)}ms; cost${esc(r?.usage?.estimatedUSD)}</p></article>`;
    }
  }
html += `<details><summary>AI assessment (not human scores)</summary><pre>${esc(JSON.stringify(assessment, null, 2))}</pre></details>`;
await writeFile(out + "/complete-review.html", html);
const archive = ".local/experiment-runs/windows_20261016_multi_tools";
await mkdir(archive, { recursive: true });
for (const [i, run] of runs.entries())
  for (const n of ["plan.json", "results.json"])
    await copyFile(run.root + "/" + n, archive + "/" + i + "-" + n);
for (const n of [
  "prepare-tools-multi.mts",
  "prepare-tool-diagnostic.mts",
  "prepare-tool-invoice.mts",
])
  await copyFile(".local/" + n, archive + "/" + n);
console.log(JSON.stringify(metrics));
