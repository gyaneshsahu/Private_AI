import { readFile, writeFile, mkdir } from "node:fs/promises";
// Render the preserved study, never whatever fixtures or local results exist now.
const evidence = JSON.parse(
  await readFile(
    "evaluation/results/research-continuation-20261019.json",
    "utf8",
  ),
);
const { plan, report, fixtures } = evidence;
const metrics = plan.cells.map((arm) => {
  const cases = report.results.filter((c) => c.arm === arm);
  const replies = cases.flatMap((c) => c.replies);
  return {
    arm,
    attemptedTurns: replies.length,
    delivered: replies.filter((r) => r.completed).length,
    inferenceRequests: cases.reduce((n, c) => n + (c.attempts?.length || 0), 0),
    meanElapsedMs: replies.length
      ? replies.reduce((n, r) => n + r.elapsedMs, 0) / replies.length
      : null,
    estimatedUSD: replies.reduce((n, r) => n + (r.usage?.estimatedUSD || 0), 0),
    humanScores: null,
  };
});
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pre = (s) =>
  "<pre>" +
  esc(typeof s === "string" ? s : JSON.stringify(s, null, 2)) +
  "</pre>";
let html =
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bounded continuation comparison</title><style>body{font:17px/1.5 system-ui;max-width:1050px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #aaa;padding:16px;margin:16px 0}summary{cursor:pointer}</style><h1>Normal answers versus calculator explanation</h1><p>Authored synthetic sources; stopped at first incomplete. Scores remain blank for human review. Model output and actual delivery are separate. No retries. No live explanation request was reached.</p><h2>Engineering observations, not human grades</h2>' +
  pre(evidence.assessment) +
  "<h2>Billing reconciliation</h2>" +
  pre(evidence.billing) +
  "<h2>Configuration and measured outcomes</h2>" +
  pre(plan.baseline + "\n" + plan.candidate) +
  pre(metrics) +
  "<p>Unequal case coverage after the stop prevents interpreting pooled arm averages as a matched performance comparison. The last usage event on the timeout is interim, not final billing.</p>";
for (const f of fixtures) {
  html +=
    "<h2>" +
    esc(f.id) +
    "</h2><h3>Original sources</h3>" +
    pre(f.sources) +
    "<h3>Expected facts fixed before execution</h3>" +
    pre(f.mandatoryFacts);
  for (const arm of plan.cells) {
    const c = report.results.find((c) => c.id === f.id && c.arm === arm);
    html += "<h3>" + esc(arm) + "</h3>";
    for (const [i, q] of f.turns.entries()) {
      const r = c?.replies[i];
      html +=
        "<article><h4>Turn " +
        (i + 1) +
        "</h4>" +
        pre(q) +
        "<h4>Delivered answer</h4>" +
        pre(r?.answer || (r ? "NO COMPLETED ANSWER" : "NOT ATTEMPTED")) +
        "<p>Human score: " +
        (r?.completed ? "___ / ___ / ___" : "UNSCORED") +
        "</p>";
      if (r) {
        html += pre({
          completed: r.completed,
          elapsedMs: r.elapsedMs,
          firstVisibleTextMs: r.firstVisibleTextMs,
          usage: r.usage,
          failureKind: r.failureKind,
          calculatorFailure: r.calculatorFailure,
          evidenceAudit: r.evidenceAudit,
        });
        for (const [round, events] of Object.entries(
          r.modelRounds ?? { 1: r.modelEvents ?? [] },
        )) {
          if (!events.length) continue;
          const content = events
            .flatMap((e) =>
              (e.choices || []).map((c) => c.delta?.content || ""),
            )
            .join("");
          const args = events
            .flatMap((e) =>
              (e.choices || []).flatMap((c) =>
                (c.delta?.tool_calls || []).map(
                  (t) => t.function?.arguments || "",
                ),
              ),
            )
            .join("");
          html +=
            "<details><summary>Model round " +
            esc(round) +
            " before delivery</summary>" +
            pre({
              content,
              toolArguments: args,
              finishReasons: events.flatMap((e) =>
                (e.choices || []).map((c) => c.finish_reason).filter(Boolean),
              ),
              lastReportedUsage: events.filter((e) => e.usage).at(-1)?.usage,
            }) +
            "</details>";
        }
        html +=
          "<details><summary>Application delivery evidence</summary>" +
          pre(r.deliveredDOMText) +
          "</details>";
      }
      html += "</article>";
    }
  }
}
html += "</html>";
const out = ".local/review-batches/continuation-20261019";
await mkdir(out, { recursive: true });
await writeFile(out + "/complete-review.html", html);
console.log(JSON.stringify(metrics));
