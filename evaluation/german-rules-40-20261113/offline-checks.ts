// Offline, on the U answers of the 40-question set: which answers the question detector warns on,
// and which the answer-side check warns on. Writes offline-checks.json next to this file.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as gr from "../../src/german-rules";
// Run from the repository root: npx tsx evaluation/german-rules-40-20261113/offline-checks.ts
const DIR = "evaluation/german-rules-40-20261113";
const U = ".local/german-rules-40-20261113/run-U/auto";
const prompts = JSON.parse(readFileSync(`${DIR}/prompts.json`, "utf8")).prompts as { id: string; prompt: string | string[] }[];
const out: Record<string, unknown> = {};
for (const p of prompts) {
  const f = `${U}/${p.id}.json`;
  if (!existsSync(f)) {
    out[p.id] = { missing: true };
    continue;
  }
  const a = JSON.parse(readFileSync(f, "utf8"));
  const question = ([] as string[]).concat(p.prompt).at(-1)!;
  const web = !!a.searched;
  const detected = gr.germanRulesQuestion(question);
  const detectorWarns = !web && detected && gr.statesUncheckedFigures(a.text);
  const answerSideWarns = !web && gr.answerStatesRules(a.text, question);
  out[p.id] = {
    questionDetected: detected,
    searched: web,
    choiceShown: !!a.choiceShown,
    detectorWarns,
    answerSideWarns,
    eitherWarns: detectorWarns || answerSideWarns,
    // What the app itself showed during the run (it already had the answer-side check).
    appWarningShown: !!a.uncheckedWarning,
    againShown: !!a.againShown,
    error: a.error,
  };
}
const v = Object.values(out) as { detectorWarns?: boolean; answerSideWarns?: boolean; eitherWarns?: boolean; appWarningShown?: boolean; questionDetected?: boolean }[];
const n = (f: (x: (typeof v)[number]) => boolean | undefined) => v.filter(f).length;
const summary = {
  answers: v.length,
  questionDetected: n((x) => x.questionDetected),
  detectorWarns: n((x) => x.detectorWarns),
  answerSideWarns: n((x) => x.answerSideWarns),
  eitherWarns: n((x) => x.eitherWarns),
  answerSideOnly: n((x) => x.answerSideWarns && !x.detectorWarns),
  appWarningShown: n((x) => x.appWarningShown),
  appMatchesOffline: n((x) => !!x.appWarningShown === !!x.eitherWarns),
};
writeFileSync(
  `${DIR}/offline-checks.json`,
  JSON.stringify(
    {
      note: "Offline checks on the U answers (Privatemode, Auto, 'Answer without checking'). detectorWarns: question detector fires and the answer states figures (the warning before the answer-side check). answerSideWarns: answerStatesRules on the answer text. Code at the commit that ran them; no grades here.",
      summary,
      byPrompt: out,
    },
    null,
    2,
  ).replace(/\n/g, "\r\n") + "\r\n",
);
console.log(summary);
