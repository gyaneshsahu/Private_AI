import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-tools.json";
const root = ".local/matched-live-20261016";
const plan = JSON.parse(await readFile(root + "/plan.json", "utf8"));
const report = JSON.parse(await readFile(root + "/results.json", "utf8"));
const replay = JSON.parse(
  await readFile("evaluation/results/validator-replay-20261016.json", "utf8"),
);
const oracle = JSON.parse(
  await readFile(root + "/independent-ground-truth.json", "utf8"),
);
const assessment = {
  status: "AI_OBSERVATIONS_NOT_HUMAN_SCORES",
  humanScores: null,
  decision:
    "Use normal answers as the simpler development reference; keep calculator experimental. No release selection. This globally stopped sample cannot compare GPT-OSS calculator or the remaining three task families.",
  case26: {
    "deepseek-normal": {
      numericCorrect: [true, true],
      complete: [true, true],
      notes:
        "121.00 then126.36/increase5.36; preserves taxed kits/packing and untaxed delivery.",
    },
    "gptoss-normal": {
      numericCorrect: [true, true],
      complete: [true, true],
      notes:
        "Same correct totals and tax explanation; follow-up explicitly attributes correction to user.",
    },
    "deepseek-calculator": {
      numericCorrect: [true, null],
      complete: [false, null],
      notes:
        "First final121.00 correct, but no requested tax explanation and ambiguous intermediate total112.00. Second completed model tool stream rejected by local evidence validation:96 is derived, not a literal source operand, and correction is incorrectly attributed to userTurn1 rather than2. One advertised historical record and one derived reference used; historical record availability alone does not cure other invalid operands. Missing answer unscored.",
    },
    "gptoss-calculator": {
      numericCorrect: [],
      complete: [],
      notes: "Not attempted after global stop.",
    },
  },
  limits: [
    "One invoice conversation per attempted configuration; no general reliability-rate or cross-family conclusion.",
    "No retries. Remaining26requests unattempted; unused reserve retired.",
    "Synthetic sources shared identically. Prior assistant histories necessarily differ by configuration; this is an end-to-end follow-up comparison, not identical second-turn token input.",
    "Recorded model events are decrypted SDK events, including tool arguments and terminal/usage events; deliveredDOMText independently records rendered UI. No claim of raw encrypted wire capture.",
    "Offline replay uses synthesized complete stream envelopes around captured arguments. It diagnoses validation, not historical transport.",
    "No source/provider/privacy, safety or held-out acceptance gate passed.",
  ],
  next: "For a later bounded study, compare the untouched remaining task families without modifying prompts or tool contract. If calculation integration continues, evaluate a standard tool-result continuation with computed values preserved, not another case-specific rule. This batch is closed.",
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
    actualUSD: 0.73,
    prepaidUSD: 10.27,
    recordedRequestsBefore: 289,
    recordedRequestsAfter: 295,
    approvedCumulativeCapUSD: 5,
    observedKeyLimitUSD: 5,
    observedAccountLimitUSD: 3,
    autoReload: false,
    historicalUncertaintyUSD: 0.2491904,
    conservativeBoundUSD: 0.9791904,
    activeReserveUSD: 0,
    tokenEstimateIncludedInDashboard: true,
    unusedReserveRetired: true,
    pendingCharges: "No separate amount shown",
    accountChangesMade: false,
  },
};
await writeFile(
  "evaluation/results/research-matched-20261016.json",
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
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matched model and integration comparison</title><style>body{max-width:1050px;margin:auto;padding:24px;font:17px/1.5 system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #aaa;padding:18px;margin:18px 0}table{border-collapse:collapse;width:100%}td,th{text-align:left;border:1px solid #aaa;padding:8px}summary{cursor:pointer}</style><h1>Matched comparison — stopped after six requests</h1><p>Development evidence only. All sources authored synthetic. Human scores blank. One incomplete result stopped the entire32-request plan; no retries.</p><h2>Combined outcomes</h2><pre>' +
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
          esc(r.diagnosticDraft || "") +
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
  "<h2>Offline historical/current validator replay</h2><pre>" +
  esc(JSON.stringify(replay, null, 2)) +
  "</pre></html>";
const out = ".local/review-batches/matched-20261016";
await mkdir(out, { recursive: true });
await writeFile(out + "/complete-review.html", html);
const archive = ".local/experiment-runs/windows_20261016_matched_study";
await mkdir(archive, { recursive: true });
for (const f of ["plan.json", "results.json", "independent-ground-truth.json"])
  await copyFile(root + "/" + f, archive + "/" + f);
console.log(JSON.stringify(result.metrics));
