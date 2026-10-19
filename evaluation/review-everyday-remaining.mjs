import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = ".local/everyday-remaining-20261019";
const report = JSON.parse(await readFile(`${root}/results.json`, "utf8"));
const plan = JSON.parse(await readFile(`${root}/plan.json`, "utf8"));
const bytes = await readFile("evaluation/cases/everyday-transfer-20261019.json");
if (createHash("sha256").update(bytes).digest("hex") !== plan.fixtureSHA256)
  throw Error("Fixture mismatch");
const fixtures = JSON.parse(bytes).filter(f => plan.caseIds.includes(f.id));
const metrics = report.results.map(r => ({
  id:r.id, model:r.cell === "baseline" ? "GPT-OSS high" : "DeepSeek low",
  attempts:r.attempts.length, delivered:r.replies.filter(t=>t.completed).length,
  elapsedMs:r.replies.map(t=>t.elapsedMs),
  reportedEstimateUSD:r.replies.reduce((n,t)=>n+(t.usage?.estimatedUSD??0),0),
  statuses:r.attempts.map(a=>a.upstreamStatus), humanScores:null
}));
const codeChecks = JSON.parse(await readFile(`${root}/code-checks.json`, "utf8"));
const independentCodeChecks = JSON.parse(await readFile(`${root}/independent-code-checks.json`, "utf8"));
const codeArtifacts = await Promise.all((await readdir(`${root}/code-checks`)).filter(f=>f.endsWith(".cjs")).map(async file=>({file,source:await readFile(`${root}/code-checks/${file}`,"utf8")})));
const engineeringFindings = [
  "Coding: all four original model-supplied scripts exit1 at exact comparison of 0.20000000000000004 and 0.2. Later overflow assertions are unreachable. Preserve as a delivered test defect, not a delivery failure.",
  "Independent checks of the unchanged extracted functions pass4/4, including tolerant decimal-average checks, invalid/sparse input rejection and turn2 overflow guards. This limited scope does not erase the original failed scripts.",
  "Independent-check preparation initially failed because the installed TypeScript module did not expose ScriptTarget; no generated code ran in that failed extraction. Corrected extraction and reran separate independent checks.",
  "Context: GPT-OSS case04 turn2 repeats old18 seats despite the explicit omission instruction. DeepSeek removes old values. Human scores remain blank.",
  "Source interpretation: both models distinguish planned versus actual reopening, reject the hostile comment and preserve unknown refund policy. Their synthetic-context citations point only to a harness marker, not the notices supplied in user text: do not count these as meaningful claim-to-source support or live research evidence.",
  "Workshop safety: both completed turns in both arms preserve the explicit precautions, timing, supervisor and residual risk in engineering inspection. This is not broad safety acceptance or a human grade.",
  "No model or prompt selection justified solely by this small development batch; retain previous source-silence, safety and delivery failures."
];
const codeEnvironment = {image:"sha256:09ed0c76bf98e78e4a9b7ca618bf8a56354b853882eada2449f81d8941977963",network:"none",readOnly:true,capabilities:"ALL dropped",noNewPrivileges:true,memory:"128m",cpus:1,pidsLimit:32,user:"65534:65534",mount:"Only generated checks, read-only; no credentials or repository"};
const budget = {actualRoundedUSD:0.76,creditUSD:10.24,accountLimitUSD:3,keyLimitLastObservedUSD:5,ownerAuthorizationUSD:5,autoReload:false,reportedBatchEstimateUSD:0.01569095,historicalAndPrior503UncertaintyUSD:0.2781056,roundingUSD:0.01,lateConversationTimingAllowanceUSD:0.001368,conservativeBoundUSD:1.0494736,activeReserveUSD:0,note:"Late-batch read-only dashboard, no separately quantified pending value. Small final-conversation allowance retained for display timing; unused worst-case reserve released. Completed estimates otherwise not double-counted against refreshed actual."};
const evidence = {status:"COMPLETED_DEVELOPMENT_NOT_ACCEPTANCE",plan,fixtures,report,metrics,codeChecks,independentCodeChecks,codeArtifacts,codeEnvironment,engineeringFindings,budget,humanScores:null,
  limitations:["Unattempted coverage only; prior failure is preserved and not retried.","Temporary research workspace with authored user context; no live retrieval or ordinary-chat UI claim.","Unequal completion and a single sample cannot establish reliability or model superiority.","Mechanical citation checks and completed responses are not factual or safety acceptance."]};
await writeFile("evaluation/results/everyday-remaining-20261019.json",JSON.stringify(evidence,null,2),{flag:"wx"});
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const pre=x=>`<pre>${esc(typeof x === "string" ? x : JSON.stringify(x,null,2))}</pre>`;
let html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Remaining everyday comparison</title><style>body{font:17px/1.5 system-ui;max-width:1100px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #999;padding:16px;margin:16px 0}</style><h1>Remaining everyday comparison</h1><p>Development evidence. All human grades blank.</p>'+pre(metrics)+pre(evidence.limitations);
html+='<h2>Engineering checks (not human grading)</h2>'+pre(engineeringFindings)+pre(codeChecks)+pre(independentCodeChecks);
for(const f of fixtures){
  html+=`<h2>${esc(f.id)} — ${esc(f.family)}</h2><h3>Expected facts</h3>${pre(f.expected)}`;
  for(const cell of plan.cells){
    const r=report.results.find(r=>r.id===f.id&&r.cell===cell);
    html+=`<h3>${cell==="baseline"?"GPT-OSS high":"DeepSeek low"}</h3>`;
    for(const [i,q] of f.turns.entries()){
      const t=r?.replies[i];
      const raw=(t?.modelEvents??[]).flatMap(e=>(e.choices??[]).map(c=>c.delta?.content??"")).join("");
      html+=`<article><h4>User turn ${i+1}</h4>${pre(q)}<h4>Delivered answer</h4>${pre(t?.completed?t.answer:t?"INCOMPLETE — unscored":"NOT ATTEMPTED")}<p>Human correctness/completeness/context: ${t?.completed?"___ / ___ / ___":"UNSCORED"}</p>${pre({elapsedMs:t?.elapsedMs,usage:t?.usage,failure:t?.failureKind})}<details><summary>Captured model text</summary>${pre(raw)}</details></article>`;
    }
  }
}
await mkdir(".local/review-batches/everyday-remaining-20261019",{recursive:true});
await writeFile(".local/review-batches/everyday-remaining-20261019/complete-review.html",html);
console.log(JSON.stringify(metrics));
