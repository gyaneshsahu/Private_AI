import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
const root=".local/model-selection-20261020";
const report=JSON.parse(await readFile(`${root}/results.json`,"utf8"));
const plan=JSON.parse(await readFile(`${root}/plan.json`,"utf8"));
const bytes=await readFile("evaluation/cases/model-selection-20261020.json");
if(createHash("sha256").update(bytes).digest("hex")!==plan.fixtureSHA256)throw Error("Frozen cases differ");
const fixtures=JSON.parse(bytes);
const median=xs=>{const a=[...xs].sort((a,b)=>a-b);return a.length?a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2:null;};
const metrics=plan.cells.map(cell=>{
 const runs=report.results.filter(r=>r.cell===cell),replies=runs.flatMap(r=>r.replies),delivered=replies.filter(t=>t.completed);
 return {cell,attempts:runs.reduce((n,r)=>n+r.attempts.length,0),delivered:delivered.length,completeTasks:runs.filter(r=>r.replies.length===2&&r.replies.every(t=>t.completed)).length,medianDeliveredMs:median(delivered.map(t=>t.elapsedMs)),reportedCostUSD:replies.reduce((n,t)=>n+(t.usage?.estimatedUSD??0),0),tasks:runs.map(r=>({id:r.id,completed:r.replies.length===2&&r.replies.every(t=>t.completed),elapsedMs:r.replies.reduce((n,t)=>n+t.elapsedMs,0),costUSD:r.replies.reduce((n,t)=>n+(t.usage?.estimatedUSD??0),0)})),humanScores:null};
});
let engineering={status:"PENDING_ENGINEERING_REVIEW"};
try{engineering=JSON.parse(await readFile(`${root}/engineering.json`,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
const evidence={status:"DEVELOPMENT_NOT_ACCEPTANCE",plan,fixtures,metrics,report,engineering,humanScores:null,limits:["One fresh two-turn case per family, one sample per configuration; not a reliability estimate or release acceptance.","Five ordinary-chat cases without source attachments; two authored source-synthesis cases, no live research or document extraction qualification.","Provider privacy, enforced opaque usage, independent safety review and reserved acceptance remain separate gates."]};
await writeFile("evaluation/results/model-selection-20261020.json",JSON.stringify(evidence),{flag:"wx"});
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const pre=x=>`<pre>${esc(typeof x==="string"?x:JSON.stringify(x,null,2))}</pre>`;
let html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fresh model selection</title><style>body{font:17px/1.5 system-ui;max-width:1100px;margin:auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}article{border:1px solid #999;padding:16px;margin:16px 0}</style><h1>Fresh model selection</h1><p>DeepSeek low · Gemma thinking off · GLM low. Human scores blank.</p>'+pre(metrics)+pre(evidence.limits)+'<h2>Engineering findings</h2>'+pre(engineering);
for(const f of fixtures){
 html+=`<h2>${esc(f.id)} — ${esc(f.family)}</h2><h3>Expected facts</h3>${pre(f.expected)}<h3>Actual authored sources</h3>${pre(f.sources.length?f.sources:"None: ordinary chat")}`;
 for(const cell of plan.cells){
  const run=report.results.find(r=>r.id===f.id&&r.cell===cell);html+=`<h3>${esc(cell)}</h3>`;
  for(const [i,q] of f.turns.entries()){
   const t=run?.replies[i];const raw=(t?.modelEvents??[]).flatMap(e=>(e.choices??[]).map(c=>c.delta?.content??"")).join("");
   html+=`<article><h4>User turn ${i+1}</h4>${pre(q)}<h4>Delivered answer</h4>${pre(t?.completed?t.answer:t?"INCOMPLETE — unscored":"NOT ATTEMPTED")}<p>Human correctness/completeness/context: ${t?.completed?"___ / ___ / ___":"UNSCORED"}</p>${pre({elapsedMs:t?.elapsedMs,usage:t?.usage,failure:t?.failureKind})}<details><summary>Raw model text</summary>${pre(raw)}</details></article>`;
  }
 }
}
await mkdir(".local/review-batches/model-selection-20261020",{recursive:true});
await writeFile(".local/review-batches/model-selection-20261020/complete-review.html",html);
console.log(JSON.stringify(metrics));
