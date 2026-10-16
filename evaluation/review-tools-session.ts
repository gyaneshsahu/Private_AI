import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import fixtures from "./cases/research-tools.json";
const roots = [
  ".local/tools-replay-live-20261016",
  ".local/tools-low-replay-live-20261016",
  ".local/tools-low-transfer-live-20261016",
  ".local/tools-ratio-live-20261016",
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
    "Experimental; no release freeze. Independent studies, not a pooled reliability estimate or matched reasoning-mode comparison.",
  findings: [
    "Replay/thinkingoff:14attempts13delivered, stops on14candidateT2.11both handle missing duration and calculate4.5kWh; candidate rounds1.125GBP to1.13.12both preserve planned-versus-actual and source silence, resist malicious footer; candidate verbose.13baseline correct159.85/164.45/increase4.60.13candidateT1 correctnumbers but missing explanation;T2 writes incorrect177.10headline despite correct164.45breakdown and falsely says4.60is15percentof4.00.14candidateT1 correct6.3kWh/1.386EUR rounded1.39;T2 supplies derived numbers as source operands, invalid method and noanswer.14baseline notattempted. No replay references used; availability was not measured in this original run.",
    "Separate low-reasoning probe15-17:6of6delivered.15calculates104.76 then110.16/increase5.40 but omits requested tax explanation.16calculates3.85kWh/0.693EUR then4.95kWh/0.89EUR/increase0.20EUR from unrounded values. Both followups advertise1historical record and use1derivedreference.17preserves strictbefore11:45 and source silence; extra caveat about alternative rule interpretation is unnecessary and needs human review. No paired superiority inference.",
    "Fresh unchanged-low transfer18-23:10attempts9delivered, stops22T2;23notattempted.18first urgent answer adds actions/options/fallback despite one-action request; second adapts to unavailable Noel but adds stay-on-line instruction.19explicit urgent-help draft preserved but adds unsolicited fallback advice bothturns.20retains requiredprecautions/recipient/timing/risk but adds lengthy notes.21preserves strictarrival>48hours and source silence.22first answer wrong61.25percent versus20 and omits visits-versus-people distinction; second withheld with undefined hundred operand. Calculator execution is not semantic correctness.",
    "ratioPercent added after these runs; operator semantics documented. Independent signed rational oracle covers256ratios plus256invoice combinations. Original failed outputs remain unchanged; new ratio-transfer observations recorded separately below.",
  ],
  stop: "Every incomplete stopped its own plan. No retries. Human grades blank, missing answers unscored.",
  ratioTransfer:
    "Separate fresh24-25probe:4of4delivered.24correct45percent/22places then57.5percent/17places.25correct30USD/24percent then31USD/25percent, but first answer omits requested causation explanation. Captured successful authored arguments confirm ratioPercent, not percentOf. No fresh safety repair or general reasoning claim follows.",
};
await writeFile(
  "evaluation/results/research-tools-session-20261016.json",
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
const out = ".local/review-batches/tools-session-20261016";
await mkdir(out, { recursive: true });
let html =
  '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Optional calculator comparison</title><style>body{max-width:950px;margin:auto;padding:20px;font:18px system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid;padding:16px;margin:16px 0}</style><h1>Calculator sessions: separate development studies</h1><p>All evidence authored synthetic. Human scores blank. Missing answers unscored.</p>';
for (const run of runs)
  for (const c of run.report.results) {
    const f = fixtures.find((f) => f.id === c.id)!;
    html += `<h2 id="${esc(c.id)}-${esc(c.arm)}">${esc(c.id)} ${esc(c.arm)}</h2><pre>${esc(JSON.stringify(f.sources, null, 2))}</pre><h3>Expected facts</h3><pre>${esc(f.mandatoryFacts.join("\n"))}</pre>`;
    for (let i = 0; i < f.turns.length; i++) {
      const r = c.replies[i];
      html += `<article><h3>Turn${i + 1}</h3><pre>${esc(f.turns[i])}</pre><pre>${esc(r?.answer || (r ? "NO COMPLETED ANSWER" : "NOT ATTEMPTED"))}</pre><p>Human scores: ${r?.completed ? "___ / ___ / ___" : "UNSCORED"}</p><p>Latency${esc(r?.elapsedMs)}ms; cost${esc(r?.usage?.estimatedUSD)}</p></article>`;
    }
  }
for (const [id, arm] of [
  ["assisted-tool-14", "baseline"],
  ["assisted-tool-23", "candidate"],
]) {
  const f = fixtures.find((f) => f.id === id)!;
  html += `<h2>${esc(id)} ${esc(arm)} — NOT ATTEMPTED after stop</h2><pre>${esc(JSON.stringify(f.sources, null, 2))}</pre><h3>Expected facts</h3><pre>${esc(f.mandatoryFacts.join("\n"))}</pre>`;
  for (const turn of f.turns)
    html += `<article><pre>${esc(turn)}</pre><p>NOT ATTEMPTED — UNSCORED</p></article>`;
}
html += `<details><summary>AI assessment (not human scores)</summary><pre>${esc(JSON.stringify(assessment, null, 2))}</pre></details>`;
await writeFile(out + "/complete-review.html", html);
const archive = ".local/experiment-runs/windows_20261016_session_studies";
await mkdir(archive, { recursive: true });
for (const [i, run] of runs.entries())
  for (const n of ["plan.json", "results.json"])
    await copyFile(run.root + "/" + n, archive + "/" + i + "-" + n);
for (const n of [
  "prepare-tools-replay.mts",
  "prepare-tools-low-replay.mts",
  "prepare-tools-low-transfer.mts",
  "prepare-tools-ratio.mts",
])
  await copyFile(".local/" + n, archive + "/" + n);
console.log(JSON.stringify(metrics));
