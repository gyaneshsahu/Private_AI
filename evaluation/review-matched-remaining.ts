import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-tools.json";
const root = ".local/matched-remaining-20261016";
const plan = JSON.parse(await readFile(root + "/plan.json", "utf8"));
const report = JSON.parse(await readFile(root + "/results.json", "utf8"));
const replay = JSON.parse(
  await readFile(root + "/offline-diagnostic.json", "utf8"),
);
const oracle = {
  turn1: "360 - 300 = 60; 60 / 300 * 100 = 20%",
  turn2: "360 - 288 = 72; 72 / 288 * 100 = 25%",
  qualification:
    "Visits do not establish unique people; independently checked arithmetic, not human grading.",
};
const assessment = {
  status: "AI_OBSERVATIONS_NOT_HUMAN_SCORES",
  humanScores: null,
  decision:
    "Keep normal answers as the development reference. Stop paid screening of the unchanged direct-render calculator; any further calculator work should address orchestration generically. No release selection or acceptance.",
  normal:
    "Both normal paths deliver the correct 60/20% then 72/25%, and explain that unique people are unknown. GPT-OSS changes initial capital Repeat to repeat inside a quotation: limited verbatim-fidelity defect. DeepSeek attaches the source citation to combined source and user-corrected values; provenance attribution needs human review.",
  calculator:
    "First reply computes correctly but omits the required unique-people explanation. Second stream completes with tool_calls and usage; inputs and formula are correct, but requested result IDs abs_inc/pct_inc are undefined (steps are diff/pct). Local dependency rejection is justified. Missing answer is unscored, not a transport failure.",
  limits: [
    "Six attempts, five delivered; stopped without retries. GPT-OSS calculator and cases28/29 unattempted.",
    "One conversation per attempted configuration; not a reliability estimate.",
    "Offline diagnostic preserves exact model events and rejection; it is not a live repair.",
    "Human grades blank; historical safety, privacy and quality gates remain open.",
  ],
  recovery:
    "Read-only local backup health reports BACKUP_STALE and SNAPSHOT_STALE; last verified receipt October15 12:44 UTC. No live transfer, deletion or retention change.",
};
const cells = plan.cells.map((cell: string) => {
  const rs = report.results
    .filter((c: any) => c.cell === cell)
    .flatMap((c: any) => c.replies);
  return {
    cell,
    attempted: rs.length,
    delivered: rs.filter((r: any) => r.completed).length,
    numericallyCorrect: cell === "deepseek-calculator" ? 1 : rs.length,
    completeUsefulAnswers: cell === "deepseek-calculator" ? 0 : rs.length,
    meanElapsedMs: rs.length
      ? rs.reduce((s: number, r: any) => s + r.elapsedMs, 0) / rs.length
      : null,
    estimatedUSD: rs.reduce(
      (s: number, r: any) => s + (r.usage?.estimatedUSD || 0),
      0,
    ),
  };
});
const result = {
  status: "STOPPED_FIRST_INCOMPLETE_NOT_ACCEPTANCE",
  plan,
  fixtures: fixtures.filter((f) => plan.caseIds.includes(f.id)),
  independentGroundTruth: oracle,
  report,
  metrics: {
    cells,
    attempted: cells.reduce((s: number, c: any) => s + c.attempted, 0),
    delivered: cells.reduce((s: number, c: any) => s + c.delivered, 0),
    estimatedUSD: cells.reduce((s: number, c: any) => s + c.estimatedUSD, 0),
    humanScores: null,
  },
  assessment,
  billing: {
    actualUSD: 0.74,
    prepaidUSD: 10.26,
    recordedRequestsBefore: 295,
    recordedRequestsAfter: 301,
    approvedCumulativeCapUSD: 5,
    observedKeyLimitUSD: 5,
    observedAccountLimitUSD: 3,
    autoReload: false,
    historicalUncertaintyUSD: 0.2491904,
    conservativeBoundUSD: 0.9891904,
    activeReserveUSD: 0,
    tokenEstimateIncludedInDashboard: true,
    unusedReserveRetired: true,
    pendingCharges: "No separate amount shown",
    accountChangesMade: false,
  },
};
await writeFile(
  "evaluation/results/research-matched-remaining-20261016.json",
  JSON.stringify(result, null, 2) + "\n",
);
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let html =
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matched model and integration comparison</title><style>body{max-width:1050px;margin:auto;padding:24px;font:17px/1.5 system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #aaa;padding:18px;margin:18px 0}table{border-collapse:collapse;width:100%}td,th{text-align:left;border:1px solid #aaa;padding:8px}summary{cursor:pointer}</style><h1>Matched comparison — stopped after six requests</h1><p>Development evidence only. All sources authored synthetic. Human scores blank. One incomplete result stopped the entire24-request plan; no retries.</p><h2>Combined outcomes</h2><pre>' +
  esc(JSON.stringify(cells, null, 2)) +
  "</pre><h2>Engineering assessment (not human grading)</h2><pre>" +
  esc(JSON.stringify(assessment, null, 2)) +
  "</pre>";
for (const f of result.fixtures) {
  html +=
    "<h2>" +
    esc(f.id) +
    "</h2><h3>Sources</h3><pre>" +
    esc(JSON.stringify(f.sources, null, 2)) +
    "</pre><h3>Expected facts</h3><pre>" +
    esc(f.mandatoryFacts.join("\n")) +
    "</pre>";
  for (const cell of plan.cells) {
    const c = report.results.find((c: any) => c.id === f.id && c.cell === cell);
    html += "<h3>" + esc(cell) + "</h3>";
    for (const [i, q] of f.turns.entries()) {
      const r = c?.replies[i];
      const events = r?.modelEvents || [];
      const rawText = events
        .flatMap((e: any) =>
          (e.choices || []).map((c: any) => c.delta?.content || ""),
        )
        .join("");
      html +=
        "<article><h4>Turn " +
        (i + 1) +
        "</h4><p>" +
        esc(q) +
        "</p><h4>Delivered answer</h4><pre>" +
        esc(r?.answer || (r ? "NO COMPLETED ANSWER" : "NOT ATTEMPTED")) +
        "</pre><p>Human score: " +
        (r?.completed ? "___ / ___ / ___" : "UNSCORED") +
        "</p><p>Elapsed " +
        esc(r?.elapsedMs) +
        "ms; token-estimated cost $" +
        esc(r?.usage?.estimatedUSD) +
        "</p>";
      if (r)
        html +=
          "<details><summary>Model output before application validation</summary><pre>" +
          esc(rawText || "(No ordinary text; see tool arguments)") +
          "</pre><pre>" +
          esc(JSON.stringify(events, null, 2)) +
          "</pre></details><details><summary>Delivery and failure evidence</summary><pre>" +
          esc(
            JSON.stringify(
              {
                completed: r.completed,
                failureKind: r.failureKind,
                calculatorFailure: r.calculatorFailure,
                recordCount: r.availableCalculationRecords,
                derivedReferences: r.derivedReferenceCount,
                terminalReasons: events.flatMap((e: any) =>
                  (e.choices || [])
                    .map((c: any) => c.finish_reason)
                    .filter(Boolean),
                ),
                deliveredDOMText: r.deliveredDOMText,
              },
              null,
              2,
            ),
          ) +
          "</pre></details>";
      html += "</article>";
    }
  }
}
html +=
  "<h2>Offline exact-output dependency diagnostic</h2><pre>" +
  esc(JSON.stringify(replay, null, 2)) +
  "</pre></html>";
const out = ".local/review-batches/matched-remaining-20261016";
await mkdir(out, { recursive: true });
await writeFile(out + "/complete-review.html", html);
const archive = ".local/experiment-runs/windows_20261016_matched_remaining";
await mkdir(archive, { recursive: true });
for (const f of ["plan.json", "results.json", "offline-diagnostic.json"])
  await copyFile(root + "/" + f, archive + "/" + f);
console.log(JSON.stringify(result.metrics));
