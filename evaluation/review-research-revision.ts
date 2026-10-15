import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { revisionCases } from "./revision-batch";
import type { Source, Usage } from "../shared/contracts";
import humanReview from "./results/research-revision-20261015-human.json";

type Reply = {
  completed: boolean;
  answer: string;
  elapsedMs: number;
  firstVisibleTextMs: number | null;
  usage?: Usage;
  failureKind?: string;
};
type Result = {
  id: string;
  fixture: (typeof revisionCases)[number];
  sources: Source[];
  replies: Reply[];
};
const root = ".local/experiment-runs/windows_20261015_revision_batch";
const plan = JSON.parse(await readFile(`${root}/plan.json`, "utf8"));
const billing = JSON.parse(await readFile(`${root}/billing.json`, "utf8"));
const fixtureHash = createHash("sha256")
  .update(
    (
      await readFile("evaluation/cases/research-revision-transfer.json", "utf8")
    ).replace(/\r\n/g, "\n"),
  )
  .digest("hex");
if (plan.fixtureLF_SHA256 !== fixtureHash) throw Error("Frozen cases changed");
const runs: Result[] = [];
for (let i = 0; i < revisionCases.length; i++) {
  let run: Result;
  try {
    run = JSON.parse(
      await readFile(
        `.local/experiment-runs/windows_20261015_revision_${i + 1}/result.json`,
        "utf8",
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
    throw error;
  }
  const expected = revisionCases[i];
  if (
    run.id !== expected.id ||
    run.fixture.source !== expected.source ||
    JSON.stringify(run.fixture.turns) !== JSON.stringify(expected.turns) ||
    run.sources.length !== 1 ||
    run.sources[0].text !== expected.source ||
    run.replies.length > 3
  )
    throw Error("Recorded case/source/turn binding differs");
  runs.push(run);
}
const median = (values: number[]) => {
  values.sort((a, b) => a - b);
  const n = values.length;
  return n
    ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2
    : null;
};
const phases = ["initial", "correction", "review"].map((phase, index) => {
  const replies = runs.flatMap((run) =>
    run.replies[index] ? [run.replies[index]] : [],
  );
  return {
    phase,
    attempts: replies.length,
    complete: replies.filter((r) => r.completed).length,
    medianFirstVisibleTextMs: median(
      replies.flatMap((r) =>
        r.firstVisibleTextMs === null ? [] : [r.firstVisibleTextMs],
      ),
    ),
    medianTotalMs: median(replies.map((r) => r.elapsedMs)),
    over30Seconds: replies.filter((r) => r.elapsedMs > 30000).length,
    observedEstimatedUSD: replies.reduce(
      (sum, r) => sum + (r.usage?.estimatedUSD ?? 0),
      0,
    ),
  };
});
let assessment: unknown = null;
try {
  assessment = JSON.parse(
    await readFile(
      "evaluation/results/research-revision-20261015-assessment.json",
      "utf8",
    ),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const report = {
  status: "DEVELOPMENT_NOT_ACCEPTANCE",
  plan,
  billing,
  phases,
  assessment,
  humanReview,
  humanScores: null,
  limitations:
    "One sequential sample per case. Turn3 is an explicit extra revision, not independent verification. Earlier defects remain. Useful-text latency and production efficacy are not established.",
  runs,
};
await writeFile(
  "evaluation/results/research-revision-20261015.json",
  JSON.stringify(report, null, 2),
);
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PrivateAI complete revision review</title>
<style>body{font:16px/1.55 system-ui;max-width:1000px;margin:auto;padding:20px;background:#f7f8fa;color:#18232d}section,article,aside{background:white;padding:20px;margin:16px 0;border:1px solid #ccd4dd;border-radius:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}h2{margin-top:0}.muted{color:#506174}.status{font-weight:bold}</style>
<h1>Source fidelity and revision — complete packet</h1><p>${escape(report.limitations)}</p><p class="status">Nine individual replies in cases 4, 7 and 10 have human scores. Other reply and whole-conversation scores remain blank. No release qualification. Each original answer remains evidence even if repaired later.</p>
<aside><h2>Engineering measurements</h2><pre>${escape(JSON.stringify(phases, null, 2))}</pre><p>First nonblank callback text, not proof of useful content or UI paint. Observed estimates are not additional charges on top of dashboard spend.</p></aside>
${revisionCases
  .map((c) => {
    const run = runs.find((r) => r.id === c.id);
    return `<section><h2>${escape(c.id)} — ${escape(c.title)}</h2><h3>Original authored evidence</h3><pre>${escape(c.source)}</pre><h3>Expected facts</h3><pre>${escape(c.expected)}</pre>${c.turns
      .map((prompt, index) => {
        const reply = run?.replies[index];
        const review = humanReview.reviews.find(
          (r) => r.id === c.id && r.turn === index + 1,
        );
        return `<article><h3>Turn ${index + 1} — ${phases[index].phase}</h3><h4>User</h4><pre>${escape(prompt)}</pre><h4>Model — ${reply ? (reply.completed ? "complete" : "INCOMPLETE / UNSCORED") : "NOT ATTEMPTED"}</h4><pre>${escape(reply?.answer ?? "No answer.")}</pre><p class="muted">${reply ? `First text ${reply.firstVisibleTextMs ?? "none"} ms; total ${reply.elapsedMs} ms.` : ""}</p><p>Human reply score: ${review ? escape(review.scores.join(" / ")) : "— / — / —"}</p>${review ? `<p>${escape(review.reason)}</p>` : ""}</article>`;
      })
      .join(
        "",
      )}<p>Human correctness / completeness / context: — / — / —</p></section>`;
  })
  .join("")}
<aside><h2>AI-proposed observations, separate from human review</h2><pre>${escape(JSON.stringify(assessment, null, 2))}</pre></aside></html>`;
const out = ".local/review-batches/revision-research-20261015";
await mkdir(out, { recursive: true });
await writeFile(`${out}/complete-review.html`, html);
console.log(JSON.stringify({ out, runs: runs.length, phases }));
