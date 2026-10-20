import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = ".local/complete-assessment-20261020-live";
const report = JSON.parse(await readFile(`${root}/results.json`, "utf8"));
const plan = JSON.parse(await readFile(`${root}/plan.json`, "utf8"));
const bytes = await readFile(
  "evaluation/cases/complete-assessment-20261020.json",
);
if (createHash("sha256").update(bytes).digest("hex") !== plan.fixtureSHA256)
  throw Error("Frozen cases differ");
const fixtures = JSON.parse(bytes);
const median = (xs) => {
  const a = [...xs].sort((a, b) => a - b);
  return a.length
    ? a.length % 2
      ? a[(a.length - 1) / 2]
      : (a[a.length / 2 - 1] + a[a.length / 2]) / 2
    : null;
};
const metrics = plan.cells.map((cell) => {
  const runs = report.results.filter((r) => r.cell === cell),
    replies = runs.flatMap((r) => r.replies),
    delivered = replies.filter((t) => t.completed);
  return {
    cell,
    attempts: runs.reduce((n, r) => n + r.attempts.length, 0),
    delivered: delivered.length,
    completeTasks: runs.filter(
      (r) => r.replies.length === 2 && r.replies.every((t) => t.completed),
    ).length,
    medianDeliveredMs: median(delivered.map((t) => t.elapsedMs)),
    reportedCostUSD: replies.reduce(
      (n, t) => n + (t.usage?.estimatedUSD ?? 0),
      0,
    ),
    tasks: runs.map((r) => ({
      id: r.id,
      completed: r.replies.length === 2 && r.replies.every((t) => t.completed),
      elapsedMs: r.replies.reduce((n, t) => n + t.elapsedMs, 0),
      costUSD: r.replies.reduce((n, t) => n + (t.usage?.estimatedUSD ?? 0), 0),
    })),
    humanScores: null,
  };
});
let engineering = { status: "PENDING_ENGINEERING_REVIEW" };
try {
  engineering = JSON.parse(await readFile(`${root}/engineering.json`, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const evidence = {
  status: "DEVELOPMENT_NOT_ACCEPTANCE",
  plan,
  fixtures,
  metrics,
  report,
  engineering,
  humanScores: null,
  limits: [
    "Eight fresh two-turn tasks, one sample each; not a reliability estimate or release acceptance.",
    "One authored source-citation case; remaining task evidence in user turns. No live retrieval or document extraction qualification. See harness-date finding.",
    "Provider privacy, enforced opaque usage, independent safety review and reserved acceptance remain separate gates.",
  ],
};
const evidencePath = "evaluation/results/complete-assessment-20261020.json";
if (!process.argv.includes("--render-only"))
  await writeFile(evidencePath, JSON.stringify(evidence), { flag: "wx" });
else if ((await readFile(evidencePath, "utf8")) !== JSON.stringify(evidence))
  throw Error("Local inputs differ from immutable run evidence");
let human = null;
try {
  human = JSON.parse(
    await readFile(
      "evaluation/results/complete-assessment-20261020-human.json",
      "utf8",
    ),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if (
  human &&
  human.evidenceSHA256 !==
    createHash("sha256")
      .update(await readFile(evidencePath))
      .digest("hex")
)
  throw Error("Human review evidence mismatch");
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pre = (x) =>
  `<pre>${esc(typeof x === "string" ? x : JSON.stringify(x, null, 2))}</pre>`;
let html =
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fresh complete-answer assessment</title><style>body{font:17px/1.5 system-ui;max-width:1100px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #999;padding:16px;margin:16px 0}</style><h1>Fresh complete-answer assessment</h1><p>DeepSeek low, unchanged constraints-v4. Human review below applies only to explicitly graded turns; all others remain blank. Earlier failures and release gates remain open.</p>' +
  pre(human) +
  pre(metrics) +
  pre(evidence.limits) +
  "<h2>Engineering findings</h2>" +
  pre(engineering);
for (const f of fixtures) {
  html += `<h2>${esc(f.id)} — ${esc(f.family)}</h2><h3>Expected facts</h3>${pre(f.expected)}<h3>Actual authored sources</h3>${pre(f.sources.length ? f.sources : "None: ordinary chat")}`;
  for (const cell of plan.cells) {
    const run = report.results.find((r) => r.id === f.id && r.cell === cell);
    html += `<h3>${esc(cell)}</h3>`;
    for (const [i, q] of f.turns.entries()) {
      const grade = human?.reviews.find(
        (r) => r.id === f.id && r.cell === cell && r.turn === i + 1,
      );
      const t = run?.replies[i];
      const raw = (t?.modelEvents ?? [])
        .flatMap((e) => (e.choices ?? []).map((c) => c.delta?.content ?? ""))
        .join("");
      html += `<article><h4>User turn ${i + 1}</h4>${pre(q)}<h4>Delivered answer</h4>${pre(t?.completed ? t.answer : t ? "INCOMPLETE — unscored" : "NOT ATTEMPTED")}<p>Human correctness/completeness/context: ${t?.completed ? (grade ? grade.scores.join(" / ") : "___ / ___ / ___") : "UNSCORED"}</p>${grade?.reason ? pre(grade.reason) : ""}${pre({ elapsedMs: t?.elapsedMs, usage: t?.usage, failure: t?.failureKind })}<details><summary>Raw model text</summary>${pre(raw)}</details></article>`;
    }
  }
}
await mkdir(".local/review-batches/complete-assessment-20261020", {
  recursive: true,
});
await writeFile(
  ".local/review-batches/complete-assessment-20261020/complete-review.html",
  html,
);
console.log(JSON.stringify(metrics));
