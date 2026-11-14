// Scores the arithmetic set as answered through the app with code execution on
// (run-ours.ts --code --cases ...). Frozen scorer; an answer is exact, wrong or missing.
//   npx tsx evaluation/arithmetic-gate/score-app-code.ts .local/code-app-20261114/full/fast
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreConversation, type GateCase } from "./scorer";

const dir = process.argv[2];
if (!dir) throw Error("Name the results folder (<out>/<mode>).");
const cases = JSON.parse(readFileSync("evaluation/arithmetic-gate/unseen-v3-20261023.json", "utf8")).cases as GateCase[];
let exact = 0, wrong = 0, missing = 0, turns = 0, marked = 0;
const bad: string[] = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const r = JSON.parse(readFileSync(join(dir, file), "utf8")) as { turnTexts?: string[]; codeMarks?: string[] };
  const gateCase = cases.find((c) => c.id === file.replace(/\.json$/, ""));
  if (!gateCase) continue;
  const answers = r.turnTexts ?? [];
  turns += gateCase.turns.length;
  marked += r.codeMarks?.length ?? 0;
  const delivered = answers.length === gateCase.turns.length && answers.every((a) => a && !/^Protected response unavailable|^Response timed out/.test(a));
  if (!delivered) { missing++; bad.push(`${gateCase.id} no-answer`); continue; }
  if (scoreConversation(gateCase, answers).pass) exact++;
  else { wrong++; bad.push(`${gateCase.id} wrong`); }
}
console.log(JSON.stringify({ dir, conversations: exact + wrong + missing, exact, wrong, missing, turns, turnsMarkedAsCalculatedWithCode: marked }));
for (const line of bad) console.log(line);
