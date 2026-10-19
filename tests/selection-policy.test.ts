import {expect,it} from "vitest";
import {selectionModels,assertSelectionPolicy} from "../evaluation/selection-policy";
import fixtures from "../evaluation/cases/model-selection-20261020.json";
it("binds every selection arm to its explicit model, reasoning, price and limits",()=>{
 for(const [cell,{input,output,...spec}] of Object.entries(selectionModels)){
  const p={...spec,maxInputCharacters:8000,maxOutputTokens:4096,answerPolicyVariant:"constraints-v4",pricing:{inputPerMillion:input,outputPerMillion:output}};
  expect(()=>assertSelectionPolicy(p,cell)).not.toThrow();
  for(const change of [{maxInputCharacters:20000},{model:"gpt-oss-120b"},{gptOssReasoningEffort:"high"},{pricing:{inputPerMillion:0,outputPerMillion:0}}])expect(()=>assertSelectionPolicy({...p,...change},cell)).toThrow();
 }
});
it("keeps all seven fresh families and ordinary chats free of fake sources",()=>{
 expect(new Set(fixtures.map(f=>f.family)).size).toBe(7);
 expect(fixtures.every(f=>f.turns.length===2 && f.synthetic && f.humanScores===null)).toBe(true);
 expect(fixtures.filter(f=>f.sources.length).map(f=>f.family)).toEqual(["documents","research"]);
 expect(9*60+35-18-7-5).toBe(9*60+5);
 expect(9*60+35-24-5).toBe(9*60+6);
});
