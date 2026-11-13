// Offline checks on stored answers (13 November 2026). No model calls.
// 1. False alarms on stored answers to prompts that are not about German rules: the answer-side
//    check (bar: at most 3 of 501, 0.6 %), the full unchecked-figures warning, and the question
//    detector on the questions. Same corpus as the calibration of 13 November (six older sets).
// 2. Answer language: did a German question get a German answer, and an English one English?
//    Also over the 40-question set (measuring only, nothing is tuned on it).
// Run from the repository root, pointing at the folder that holds the stored runs:
//   npx tsx evaluation/german-routing-20261113/stored-answers.ts ../Private_AI/.local [--samples]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { answerStatesRules, germanRulesQuestion, statesUncheckedFigures } from "../../src/german-rules";

const LOCAL = process.argv[2] ?? ".local";
const SETS: Record<string, string> = {
  "german-rules-20261113": "evaluation/german-rules-20261113/prompts.json",
  "german-rules-official-20261113": "evaluation/german-rules-official-20261113/prompts.json",
  "benchmark-fresh-20261112": "evaluation/benchmark-fresh-20261112/prompts.json",
  "benchmark-privatemode-20261112": "evaluation/benchmark-privatemode-20261112/prompts.json",
  "blind-benchmark-privatemode-20261112": "evaluation/blind-benchmark-privatemode-20261112/prompts.json",
  "blind-benchmark": "evaluation/blind-benchmark/prompts.json",
};
const FORTY = "german-rules-40-20261113";
// Rules prompts outside a "German rules" level, labelled from the prompt text (calibration of 13 November).
const RULES_IDS = new Set(["R-01", "R-04", "R-05", "R-07", "P-R1", "P-R5", "L7-04", "L4-03"]);

type Rec = { set: string; id: string; question: string; text: string; searched: boolean; rules: boolean };
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".json") ? [p] : [];
  });
function load(set: string, promptFile: string): Rec[] {
  const prompts = new Map<string, { levelName?: string; prompt: string | string[] }>(
    JSON.parse(readFileSync(promptFile, "utf8")).prompts.map((p: { id: string }) => [p.id, p]),
  );
  // The 40-question set: the three runs only ("ours" holds copies made for the grading sheet).
  const files = set === FORTY ? ["run-U", "run-S", "run-G"].flatMap((r) => walk(join(LOCAL, set, r))) : walk(join(LOCAL, set));
  return files.flatMap((f) => {
    if (/failed-first-pass/.test(f)) return [];
    const id = f.split(/[\\/]/).pop()!.replace(/\.json$/, "");
    const p = prompts.get(id);
    if (!p) return [];
    const j = JSON.parse(readFileSync(f, "utf8"));
    if (typeof j.text !== "string" || !j.text) return [];
    return [{
      set,
      id,
      question: ([] as string[]).concat(p.prompt).at(-1)!,
      text: j.text,
      searched: !!j.searched,
      rules: set === FORTY || /German rules/.test(p.levelName ?? "") || RULES_IDS.has(id),
    }];
  });
}
const older = Object.entries(SETS).flatMap(([set, file]) => load(set, file));
const forty = load(FORTY, `evaluation/${FORTY}/prompts.json`);
const pct = (a: number, b: number) => `${a} of ${b} (${b ? ((100 * a) / b).toFixed(1) : "-"} %)`;

// 1. False alarms.
const non = older.filter((r) => !r.rules);
const unsearched = non.filter((r) => !r.searched);
const answerSide = (r: Rec) => answerStatesRules(r.text, r.question);
const warning = (r: Rec) => (germanRulesQuestion(r.question) && statesUncheckedFigures(r.text)) || answerSide(r);
const questions = [...new Set(non.map((r) => r.question))];
console.log(`stored answers ${older.length}; not about rules ${non.length} (unsearched ${unsearched.length})`);
console.log("answer-side check false alarms:", pct(non.filter(answerSide).length, non.length));
console.log("unchecked-figures warning false alarms (unsearched):", pct(unsearched.filter(warning).length, unsearched.length));
console.log("question detector false alarms (unique questions):", pct(questions.filter(germanRulesQuestion).length, questions.length));
for (const q of questions.filter(germanRulesQuestion)) console.log("  detector fires on:", q.slice(0, 100).replace(/\n/g, " "));
for (const r of unsearched.filter(warning)) console.log("  warning on:", r.set, r.id);

// 2. Answer language. A simple count of common German and English words; code, links and
// citations removed first. shortcut: two languages only; mixed answers go to the larger count.
const DE = new Set("der die das und ist nicht ich sie es ein eine einen zu mit auf für von den dem des sich auch wird werden kann können sind wenn oder bei nach wie aus im zum zur sie ihr ihre ihnen haben hat noch nur über wir dass diese dieser sehr gibt mehr bitte".split(" "));
const EN = new Set("the and is are not you it of to in for with on that this be can will your if or as at by from have has an was what which there they their more please".split(" "));
// A word with an umlaut or ß counts as German too. Questions are short: one signal word decides.
function language(text: string, least = 3): "de" | "en" | "unclear" {
  const words = text
    .replace(/```[\s\S]*?(```|$)|`[^`\n]*`|https?:\/\/\S+|\[[^\]]*\]/g, " ")
    .toLowerCase()
    .match(/\p{L}+/gu) ?? [];
  const de = words.filter((w) => DE.has(w) || /[äöüß]/.test(w)).length;
  const en = words.filter((w) => EN.has(w)).length;
  if (de + en < least) return "unclear";
  return de > en ? "de" : en > de ? "en" : "unclear";
}
// The user asked for another language (translate, "auf Englisch"): not scored.
const ASKS_LANGUAGE = /übersetz|translat|ins (englische|deutsche|französische)|auf (englisch|deutsch)|in(to)? (english|german|french)\b/i;
// Answers that are only figures or a single word come out "unclear"; they are counted apart.
function rate(name: string, recs: Rec[]) {
  for (const lang of ["de", "en"] as const) {
    const scored = recs.filter((r) => language(r.question, 1) === lang && !ASKS_LANGUAGE.test(r.question));
    const same = scored.filter((r) => language(r.text) === lang);
    const other = scored.filter((r) => !["unclear", lang].includes(language(r.text)));
    console.log(
      `${name}: ${lang} questions: answered in ${lang} ${pct(same.length, scored.length)}; in the other language ${other.length}; unclear ${scored.length - same.length - other.length}`,
    );
    for (const r of scored.filter((r) => language(r.text) !== lang))
      console.log(`  ${r.set} ${r.id}: answer looks ${language(r.text)}:`, r.text.slice(0, 100).replace(/\s+/g, " "));
  }
  const skipped = recs.filter((r) => ASKS_LANGUAGE.test(r.question) || language(r.question, 1) === "unclear");
  console.log(`${name}: not scored (asks for a language or question unclear): ${skipped.length}`);
}
rate("older sets", older);
rate("40-question set", forty);
if (process.argv.includes("--samples"))
  for (const r of [...older, ...forty].filter((r) => language(r.question, 1) === "de").filter((_, i) => i % 15 === 0))
    console.log("SAMPLE", r.set, r.id, "|", r.question.slice(0, 60).replace(/\s+/g, " "), "|", r.text.slice(0, 80).replace(/\s+/g, " "));
