// Scores the saved answers of blocks-probe-20261126.json again with the app's current block reader,
// without asking the model again: npx tsx evaluation/answer-design/blocks-rescore.mts
import { readFileSync } from "node:fs";
import { calloutKind, parseDiagram, parseExplore, parseQuiz, parseSteps } from "../../src/answer/blocks";

const saved = JSON.parse(readFileSync(new URL("./blocks-probe-20261126.json", import.meta.url), "utf8")) as { rows: { id: string; expected: "none" | string[]; answer: string }[] };
let correct = 0;
let quiet = 0;
for (const row of saved.rows) {
  const found = new Set<string>();
  let malformed = 0;
  for (const m of row.answer.matchAll(/```(steps|diagram|quiz|explore)\s*\n([\s\S]*?)```/g)) {
    const ok = m[1] === "steps" ? parseSteps(m[2]) : m[1] === "diagram" ? parseDiagram(m[2]) : m[1] === "quiz" ? parseQuiz(m[2]) : parseExplore(m[2]);
    if (ok) found.add(m[1]);
    else malformed++;
  }
  for (const m of row.answer.matchAll(/^>\s*\*\*([^*\n]{2,40})\*\*/gm)) if (calloutKind(m[1])) found.add("note");
  const right = row.expected === "none" ? found.size === 0 && !malformed : row.expected.some((b) => found.has(b));
  if (right) correct++;
  if (row.expected === "none" && right) quiet++;
  if (!right || malformed) console.log(JSON.stringify({ id: row.id, expected: row.expected, found: [...found], malformed }));
}
console.log(JSON.stringify({ correct, of: saved.rows.length, noneKeptClean: quiet }));
