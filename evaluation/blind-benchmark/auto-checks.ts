// Automatic checks on our side only (no owner scores needed): the maths checker on every
// prompt with expected values, the level-8 safety wording check, and speed per mode against
// the frozen bars in BARS.md. Writes results-ours-<date>.md next to this file.
//   npx tsx evaluation/blind-benchmark/auto-checks.ts [--date YYYY-MM-DD]
import { readFile, writeFile } from "node:fs/promises";
import { checkMaths, type MathsExpected } from "./maths-check";
import { checkSafety, SPEED } from "./score";

const MODES = ["auto", "fast", "thinking"] as const;
const date = process.argv.includes("--date") ? process.argv[process.argv.indexOf("--date") + 1] : new Date().toISOString().slice(0, 10);
type Prompt = { id: string; level: number | string; language?: string; expected?: Record<string, unknown> };
const prompts = JSON.parse(await readFile("evaluation/blind-benchmark/prompts.json", "utf8")).prompts as Prompt[];
const median = (v: number[]) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : NaN);

const lines: string[] = [`# Our side, automatic checks — ${date}`, "", "Maths checker (prompts with expected values), level-8 wording check, and speed against BARS.md. Owner scores and the comparison with ChatGPT and Gemini come later from the scoring sheet.", ""];
const maths: string[] = ["| Prompt | " + MODES.join(" | ") + " |", "| --- | --- | --- | --- |"];
const safety: string[] = ["| Prompt | " + MODES.join(" | ") + " |", "| --- | --- | --- | --- |"];
const speed: string[] = ["| Mode | First token median | Max | Whole reply median | Max | Bar (first / total) | Met |", "| --- | --- | --- | --- | --- | --- | --- |"];
const silent: Record<string, number> = { auto: 0, fast: 0, thinking: 0 };
const safetyFails: Record<string, number> = { auto: 0, fast: 0, thinking: 0 };
const answers: Record<string, Record<string, { text: string; ttftMs?: number; totalMs?: number; label?: string }>> = {};
for (const m of MODES) {
  answers[m] = {};
  for (const p of prompts) answers[m][p.id] = JSON.parse(await readFile(`.local/blind-benchmark/ours/${m}/${p.id}.json`, "utf8"));
}
for (const p of prompts) {
  const e = p.expected as (MathsExpected & Record<string, unknown>) | undefined;
  if (e && (e.final !== undefined || e.mustInclude)) {
    const cells = MODES.map((m) => {
      const r = checkMaths(answers[m][p.id].text, e as MathsExpected, p.language === "de" ? "de" : "en");
      if (r.verdict === "silent-wrong") silent[m]++;
      return r.verdict;
    });
    maths.push(`| ${p.id} | ${cells.join(" | ")} |`);
  }
  if (String(p.level) === "8") {
    const cells = MODES.map((m) => {
      const r = checkSafety(answers[m][p.id].text, p.expected as never);
      if (!r.ok) safetyFails[m]++;
      return r.ok ? "ok" : `FAIL: ${r.failures.join("; ")}`;
    });
    safety.push(`| ${p.id} | ${cells.join(" | ")} |`);
  }
}
for (const m of MODES) {
  const all = Object.values(answers[m]);
  const tt = all.map((a) => a.ttftMs).filter((v): v is number => typeof v === "number");
  const tot = all.map((a) => a.totalMs).filter((v): v is number => typeof v === "number");
  const bar = SPEED[m];
  const met = median(tt) <= bar.ttftS * 1000 && median(tot) <= bar.totalS * 1000;
  speed.push(`| ${m} | ${(median(tt) / 1000).toFixed(1)} s | ${(Math.max(...tt) / 1000).toFixed(1)} s | ${(median(tot) / 1000).toFixed(1)} s | ${(Math.max(...tot) / 1000).toFixed(1)} s | ${bar.ttftS} s / ${bar.totalS} s | ${met ? "yes" : "no"} |`);
}
const autoThinking = Object.values(answers.auto).filter((a) => /Thinking/.test(a.label ?? "")).length;
lines.push("## Maths", "", ...maths, "", `Silent maths errors: ${MODES.map((m) => `${m} ${silent[m]}`).join(", ")}.`, "", "## Level 8 wording", "", ...safety, "", `Failures: ${MODES.map((m) => `${m} ${safetyFails[m]}`).join(", ")}.`, "", "## Speed", "", ...speed, "", `Auto chose Thinking for ${autoThinking} of ${prompts.length} prompts.`, "");
await writeFile(`evaluation/blind-benchmark/results-ours-${date}.md`, lines.join("\n"));
console.log(lines.join("\n"));
