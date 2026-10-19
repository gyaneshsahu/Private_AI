import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = ".local/everyday-20261019-r4";
const report = JSON.parse(await readFile(`${root}/results.json`, "utf8"));
const plan = JSON.parse(await readFile(`${root}/plan.json`, "utf8"));
const bytes = await readFile("evaluation/cases/everyday-transfer-20261019.json");
if (createHash("sha256").update(bytes).digest("hex") !== plan.fixtureSHA256)
  throw Error("Frozen fixture mismatch");
const fixtures = JSON.parse(bytes);
const metrics = plan.cells.map(cell => {
  const conversations = report.results.filter(r => r.cell === cell);
  const replies = conversations.flatMap(r => r.replies);
  return { cell, model: cell === "baseline" ? "gpt-oss-120b high" : "deepseek-v4-1-flash low",
    conversations: conversations.length, attemptedTurns: replies.length,
    delivered: replies.filter(r => r.completed).length,
    completedConversations: conversations.filter(r => r.replies.length === 2 && r.replies.every(t=>t.completed)).length,
    inferenceRequests: conversations.reduce((n,r)=>n+r.attempts.length,0),
    meanElapsedMs: replies.length ? Math.round(replies.reduce((n,r)=>n+r.elapsedMs,0)/replies.length) : null,
    reportedEstimateUSD: replies.reduce((n,r)=>n+(r.usage?.estimatedUSD??0),0), humanScores:null };
});
const priorHarnessRuns = await Promise.all([".local/everyday-20261019", ".local/everyday-20261019-r2", ".local/everyday-20261019-r3"].map(async path => ({path, report:JSON.parse(await readFile(`${path}/results.json`, "utf8"))})));
const engineeringAssessment = [
  "Case01 GPT-OSS turn1 invents no exceptions despite source silence; turn2 repairs it but cannot erase the first-turn failure. DeepSeek preserves the distinction in both turns. Human scores blank.",
  "Case02 DeepSeek both turns match independently calculated energy/fees/difference. GPT-OSS turn1 has upstream HTTP503, zero model events and zero delivered text: provider delivery failure, not wrong arithmetic or validator rejection.",
  "Case01 matched delivered latency: GPT-OSS 33.994s/17.277s; DeepSeek 3.082s/1.346s. One paired conversation does not establish general superiority.",
  "The research citation audit warns on GPT-OSS quoting user-supplied wording absent from the synthetic marker source. This is an audit-scope limitation, not proof of factual error; it did not withhold the answer.",
  "Cases03–06 and GPT-OSS case02 turn2 unattempted after global transport stop. No coding execution or safety acceptance earned. No retries after HTTP503."
];
const budget = {actualRoundedUSD:0.75, availableCreditUSD:10.25, accountLimitUSD:3, keyLimitLastObservedUSD:5, ownerAuthorizationUSD:5, autoReload:false, reportedCompletedEstimateUSD:0.00473895, historicalUncertaintyUSD:0.263648, new503UncertaintyUSD:0.0144576, roundingAllowanceUSD:0.01, conservativeBoundUSD:1.0381056, activeReservationUSD:0, pendingChargeStatus:"No separately quantified pending figure; new failed-request maximum retained pending reconciliation. Completed token estimates are not added again to refreshed actual spend."};
const evidence = { status:"STOPPED_UPSTREAM_503_DEVELOPMENT_NOT_ACCEPTANCE", plan, fixtures, report, metrics, priorHarnessRuns, engineeringAssessment, budget, humanScores:null,
  limitations:["One sample per configuration/case; no reliability-rate or superiority claim.","Research workspace with authored context marker; no live retrieval or ordinary-chat UI claim.","Completion/citation checks are not factual or safety acceptance. Missing answers remain unscored.","Usage estimates do not substitute for billed spend; incomplete usage may be nonfinal."] };
await writeFile("evaluation/results/everyday-20261019.json", JSON.stringify(evidence,null,2),{flag:"wx"});
const esc = x => String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const pre = x => `<pre>${esc(typeof x==="string"?x:JSON.stringify(x,null,2))}</pre>`;
let html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Everyday assistant comparison</title><style>body{font:17px/1.5 system-ui;max-width:1100px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #999;padding:16px;margin:16px 0}</style><h1>Everyday assistant comparison</h1><p>GPT-OSS high versus DeepSeek low. Synthetic tasks, no calculator. Human scores are blank.</p>'+pre(metrics)+pre(evidence.limitations);
html += '<h2>Engineering findings (not human scores)</h2>'+pre(engineeringAssessment)+'<h2>Budget reconciliation</h2>'+pre(budget);
for (const f of fixtures) {
  html += `<h2>${esc(f.id)} — ${esc(f.family)}</h2><h3>Fixed expected facts</h3>${pre(f.expected)}`;
  for (const cell of plan.cells) {
    const run = report.results.find(r=>r.id===f.id&&r.cell===cell);
    html += `<h3>${esc(cell === "baseline" ? "GPT-OSS high" : "DeepSeek low")}</h3>`;
    for (const [i,q] of f.turns.entries()) {
      const r=run?.replies[i];
      const modelText=(r?.modelEvents??[]).flatMap(e=>(e.choices??[]).map(c=>c.delta?.content??"")).join("");
      html += `<article><h4>Turn ${i+1}: user</h4>${pre(q)}<h4>Delivered answer</h4>${pre(r?.completed ? r.answer : r ? "INCOMPLETE — no quality score" : "NOT ATTEMPTED")}<p>Human correctness/completeness/context: ${r?.completed ? "___ / ___ / ___" : "UNSCORED"}</p>${pre({completed:r?.completed,elapsedMs:r?.elapsedMs,usage:r?.usage,failureKind:r?.failureKind})}<details><summary>Captured model text (may be incomplete)</summary>${pre(modelText)}</details></article>`;
    }
  }
}
await mkdir(".local/review-batches/everyday-20261019",{recursive:true});
await writeFile(".local/review-batches/everyday-20261019/complete-review.html",html);
console.log(JSON.stringify(metrics));
