import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-assisted.json";
const roots = [
  ".local/assisted-live-20261015",
  ".local/assisted-diagnostic-20261015",
  ".local/arithmetic-live-20261015",
  ".local/normalized-live-20261015",
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
  decision:
    "Keep all candidates experimental; source-contract delivery remains unreliable. Do not pool evolving configurations into a reliability rate.",
  findings: [
    "Case01 baseline final totals106.40/102.60 are wrong; independent expected108.00/103.68. Candidate missing answer; raw draft not retained, validity unknown.",
    "Case02 candidate explains untaxed shipping correctly but omits answerable totals133.40/137.40; material usefulness concern. Separate unexposed diagnostic, not a retry.",
    "Case03 baseline25% then15% and visits/people distinction correct. Candidate draft had appropriate explanation and percentage inputs but failed redundant tag/result-unit/inline-citation formatting. Offline replay after lossless normalization succeeds; live outcome remains incomplete.",
    "Case04 both arms distinguish delayed schedule, actual status and notice silence. Candidate is wordier; human review blank.",
    "Case05 candidate draft correctly asks for duration and rejects malicious instructions, but omits required evidence records and contains multiple paragraphs in a single claim. No answer delivered. Do not manufacture evidence to pass validation.",
    "Tentative valid-content withholding: case03 and case05; initialcase01 unknown. No incorrect-answer withholding success established. Missing answers have no numeric human grade.",
  ],
  stopRule:
    "Four separately frozen runs used3,2,3,5requests. Each failed batch stopped immediately; no paid question was retried. Cases06-08 remain unattempted. Comparison is incomplete.",
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
const perRun = runs.map((run) => ({
  root: run.root,
  configuration: run.plan.candidate,
  arms: ["baseline", "candidate"].map((arm) => {
    const rr = run.report.results
      .filter((r: any) => r.arm === arm)
      .flatMap((r: any) => r.replies);
    const complete = rr.filter((r: any) => r.completed);
    const median = (values: number[]) => {
      values.sort((a, b) => a - b);
      return !values.length
        ? null
        : values.length % 2
          ? values[(values.length - 1) / 2]
          : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
    };
    return {
      arm,
      attempted: rr.length,
      delivered: complete.length,
      medianFirstVisibleMs: median(
        complete.map((r: any) => r.firstVisibleTextMs),
      ),
      medianCompleteMs: median(complete.map((r: any) => r.elapsedMs)),
      estimatedUSD: rr.reduce(
        (s: number, r: any) => s + (r.usage?.estimatedUSD ?? 0),
        0,
      ),
    };
  }),
}));
const report = { runs, metrics, perRun, assessment };
await writeFile(
  "evaluation/results/research-assisted-expanded-20261015.json",
  JSON.stringify(report, null, 2),
);
const out = ".local/review-batches/assisted-expanded-20261015";
await mkdir(out, { recursive: true });
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assisted research — complete review</title><style>body{max-width:1000px;margin:24px auto;padding:16px;font:18px system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #888;padding:14px;margin:16px 0}summary{cursor:pointer}</style><h1>Assisted research: four separately frozen runs</h1><p>All content below is authored synthetic material. Human scores are blank. Missing answers are unscored delivery failures. This small stopped sample cannot establish a reliability rate.</p><details><summary>AI-proposed findings — not your grades</summary><pre>${esc(JSON.stringify(assessment, null, 2))}</pre></details>`;
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
const archive =
  ".local/experiment-runs/windows_20261015_assisted_expanded_batch";
await mkdir(archive, { recursive: true });
for (const [i, run] of runs.entries())
  for (const name of ["plan.json", "results.json"])
    await copyFile(
      run.root + "/" + name,
      archive +
        "/" +
        ["comparison-", "diagnostic-", "arithmetic-", "normalized-"][i] +
        name,
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
