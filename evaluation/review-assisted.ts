import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-assisted.json";
const roots = [
  ".local/assisted-live-20261015",
  ".local/assisted-diagnostic-20261015",
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
const assessment = {
  status: "AI_PROPOSED_NOT_HUMAN_REVIEW",
  decision: "Keep candidate experimental; no release selection.",
  baseline: {
    attempted: 2,
    delivered: 2,
    incorrectFinalTotals: 2,
    correctTotals: ["108.00 GBP", "103.68 GBP"],
    observedWrongTotals: ["106.40 GBP", "102.60 GBP"],
  },
  candidate: {
    attempted: 3,
    delivered: 2,
    incomplete: 1,
    usefulness:
      "Two delivered answers explain the tax-method mismatch but omit computable totals133.40EUR and137.40EUR. Material completeness concern; human judgment pending.",
    validAnswersUnnecessarilyBlocked:
      "UNKNOWN: initial rejected draft was not retained; cannot judge its validity.",
    incorrectAnswersWithheld: "NOT_ESTABLISHED",
  },
  stopRule:
    "Initial batch stopped after3requests. Separate2request diagnostic used previously unattempted authoredcase02; no retry ofcase01. Cases03-08 unattempted.",
};
const metrics = {
  attempted: replies.length,
  delivered: replies.filter((r: any) => r.completed).length,
  reportedEstimatedUSD: replies.reduce(
    (n: number, r: any) => n + (r.usage?.estimatedUSD ?? 0),
    0,
  ),
  humanScores: null,
};
const report = { runs, metrics, assessment };
await writeFile(
  "evaluation/results/research-assisted-20261015.json",
  JSON.stringify(report, null, 2),
);
const out = ".local/review-batches/assisted-20261015";
await mkdir(out, { recursive: true });
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assisted research — complete review</title><style>body{max-width:1000px;margin:24px auto;padding:16px;font:18px system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #888;padding:14px;margin:16px 0}summary{cursor:pointer}</style><h1>Assisted research: stopped comparison and separate diagnostic</h1><p>All content below is authored synthetic material. Human scores are blank. Missing answers are unscored delivery failures. This small stopped sample cannot establish a reliability rate.</p><details><summary>AI-proposed findings — not your grades</summary><pre>${esc(JSON.stringify(assessment, null, 2))}</pre></details>`;
for (const run of runs)
  for (const c of run.report.results) {
    const f = fixtures.find((f) => f.id === c.id)!;
    html += `<section><h2>${esc(c.id)} · ${esc(c.arm)}</h2><p>Run: ${esc(run.root)}</p><h3>Original evidence</h3>${f.sources.map((s) => `<h4>${esc(s.title)}</h4><pre>${esc(s.text)}</pre>`).join("")}<h3>Expected facts, fixed before execution</h3><pre>${esc(f.mandatoryFacts.join("\n"))}</pre>`;
    for (let i = 0; i < f.turns.length; i++) {
      const r = c.replies[i];
      html += `<article><h3>Turn ${i + 1}</h3><pre>${esc(f.turns[i])}</pre><h4>Model reply</h4><pre>${esc(r?.answer || (r ? "NO COMPLETED ANSWER" : "NOT ATTEMPTED — stop rule"))}</pre><p>Human correctness / completeness / context: ${r?.completed ? "___ / ___ / ___" : "UNSCORED"}</p>${r ? `<p>Elapsed ${r.elapsedMs}ms; first visible ${r.firstVisibleTextMs ?? "none"}ms; estimated USD${r.usage?.estimatedUSD ?? "unknown"}; ${esc(r.failureKind ?? "complete")}</p>` : ""}</article>`;
    }
    html += "</section>";
  }
await writeFile(out + "/complete-review.html", html);
const archive = ".local/experiment-runs/windows_20261015_assisted_batch";
await mkdir(archive, { recursive: true });
for (const [i, run] of runs.entries())
  for (const name of ["plan.json", "results.json"])
    await copyFile(
      run.root + "/" + name,
      archive + "/" + (i ? "diagnostic-" : "comparison-") + name,
    );
await copyFile(
  ".local/assisted-offline-20261015/results.json",
  archive + "/offline-results.json",
);
await copyFile(
  ".local/prepare-assisted.mts",
  archive + "/prepare-assisted.mts",
);
await copyFile(
  ".local/prepare-assisted-diagnostic.mts",
  archive + "/prepare-assisted-diagnostic.mts",
);
console.log(JSON.stringify({ metrics, review: out + "/complete-review.html" }));
