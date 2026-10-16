import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-tools.json";
const roots = [
  ".local/tools-live-20261016",
  ".local/tools-remaining-live-20261016",
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
    "Experimental, not ready. Narrow first-turn calculation benefit; follow-up delivery failed. No reliability-rate claim from this sample.",
  findings: [
    "01 baseline writing preserves reopening uncertainty but wrongly says no stated year: source explicitly gives2026. No candidate attempted due harness bug.",
    "02 baseline wrong139.00/144.00 instead of139.40/144.40 despite correct components.",
    "02 candidate first turn locally computes139.40; explanation does not state tax treatment. Second turn withheld by local argument/evidence/arithmetic validation; exact cause unavailable because raw arguments not retained. No zero-quality score for missing answer.",
    "03-04 unattempted; cannot claim unit/missing-information or corrected-count coverage.",
  ],
  stop: "First run stopped after2 baseline replies at harness mismatch. Separate remaining-case run stopped after4requests at candidate02turn2. No retries. All unused reserve retired.",
};
await writeFile(
  "evaluation/results/research-tools-20261016.json",
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
const out = ".local/review-batches/tools-20261016";
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
const archive = ".local/experiment-runs/windows_20261016_optional_tools";
await mkdir(archive, { recursive: true });
for (const [i, run] of runs.entries())
  for (const n of ["plan.json", "results.json"])
    await copyFile(run.root + "/" + n, archive + "/" + i + "-" + n);
for (const n of ["prepare-tools.mts", "prepare-tools-remaining.mts"])
  await copyFile(".local/" + n, archive + "/" + n);
console.log(JSON.stringify(metrics));
