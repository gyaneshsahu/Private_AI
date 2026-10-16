import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-tools.json";
const roots = [".local/tools-flat-live-20261016"];
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
    "Keep experimental. The flat API is accepted, but the candidate still loses a valid follow-up.",
  findings: [
    "10 baseline both turns correctly calculates176.60EUR then181.60EUR and increase5EUR, with correct untaxed transport explanation.",
    "10 candidate turn1 computes176.60EUR, but confusingly labels165.60 as total before final bill, and omits the requested explanation of tax treatment.",
    "10 candidate turn2 supplies old_total176.60 with a source quotation that contains no such number. The schema is valid but operand provenance fails. No answer reaches user; do not count internal correct arithmetic as a quality pass.",
    "The same underlying derived-value provenance failure survived the schema simplification. More per-example prompt rules are not justified. Evaluate an explicit ephemeral calculation-record design before more paid correction screens.",
    "11 and12 were not attempted because stop rule applied. No live coverage claimed for them.",
  ],
  stop: "Four requests, three delivered; stop on first incomplete, no retries. Human grades blank.",
};
await writeFile(
  "evaluation/results/research-tools-flat-20261016.json",
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
const out = ".local/review-batches/tools-flat-20261016";
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
const archive = ".local/experiment-runs/windows_20261016_flat_tools";
await mkdir(archive, { recursive: true });
for (const [i, run] of runs.entries())
  for (const n of ["plan.json", "results.json"])
    await copyFile(run.root + "/" + n, archive + "/" + i + "-" + n);
for (const n of ["prepare-tools-flat.mts"])
  await copyFile(".local/" + n, archive + "/" + n);
console.log(JSON.stringify(metrics));
