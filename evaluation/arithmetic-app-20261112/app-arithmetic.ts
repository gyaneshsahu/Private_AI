// The arithmetic set (unseen-v3, 30 conversations = 60 questions) asked as ordinary chat questions
// through the real app, scored against the code key with the gate's own scorer (12 November 2026).
//   npx tsx evaluation/arithmetic-app-20261112/app-arithmetic.ts build   -> prompts.json (for run-ours.ts)
//   npx tsx evaluation/arithmetic-app-20261112/app-arithmetic.ts score [--ours <dir>] [--date d]
// Answers come from run-ours.ts with BENCH_DIR=evaluation/arithmetic-app-20261112.
// Verdicts per answer: correct; flagged (wrong, but the app showed a check warning or the answer
// says it is unsure); silent-wrong; no-answer.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import unseenV3 from "../arithmetic-gate/unseen-v3-20261023.json";
import { scoreTurn, type GateCase } from "../arithmetic-gate/scorer";

const DIR = dirname(fileURLToPath(import.meta.url));
const cases = unseenV3.cases as unknown as GateCase[];
const MODES = ["auto", "fast", "thinking"] as const;

/** Standalone question texts, as written for the ChatGPT/Claude paste batches. */
export function questions(): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (let b = 1; b <= 6; b++) {
    const file = join(DIR, `../arithmetic-gate/paste-batches-v3-unseen/batch-0${b}.md`);
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^(unseen3-\d{2}[ab]): (.+)$/.exec(line.trim());
      if (m) out.push({ id: m[1], text: m[2] });
    }
  }
  return out;
}
const lookup = (id: string) => {
  const c = cases.find((x) => x.id === id.slice(0, -1))!;
  const turn = id.endsWith("a") ? 0 : 1;
  return { c, expected: c.expected[turn], forbidden: c.forbidden[turn] };
};

// The app's own check warnings (kept apart from the answer text by run-ours.ts) and stated doubt.
const APP_WARNING = /^(Some calculations written in this answer|We recalculated the figures|A number in this answer could be read|This answer may not state every figure)/;
// The app's failure lines (no answer was given), captured as text by run-ours.ts.
const APP_FAILURE = /^(Protected response unavailable|Response timed out|The protected service did not accept)/;
const DOUBT = /\b(not (entirely |completely )?(sure|certain)|please (double[- ]?)?check|may be (wrong|incorrect)|nicht (ganz )?sicher|bitte (nach)?prüfen|ohne gewähr)\b/i;

export type Verdict = "correct" | "flagged" | "silent-wrong" | "no-answer";
export function verdict(id: string, answer: { text?: string; notices?: string[] } | undefined): Verdict {
  if (!answer?.text?.trim() || APP_FAILURE.test(answer.text.trim())) return "no-answer";
  const { c, expected, forbidden } = lookup(id);
  if (scoreTurn(answer.text, expected, forbidden, c.locale).pass) return "correct";
  const warned = (answer.notices ?? []).some((n) => APP_WARNING.test(n.trim())) || DOUBT.test(answer.text);
  return warned ? "flagged" : "silent-wrong";
}

function build() {
  const qs = questions();
  if (qs.length !== 60) throw Error(`expected 60 questions, found ${qs.length}`);
  const prompts = qs.map((q) => {
    const { c } = lookup(q.id);
    return { id: q.id, level: c.category, levelName: c.category, language: c.locale, prompt: q.text };
  });
  writeFileSync(join(DIR, "prompts.json"), JSON.stringify({ version: "arithmetic-app-20261112", note: "unseen-v3 questions asked standalone through the app; scored against the code key", prompts }, null, 2));
  console.log(`prompts.json: ${prompts.length} questions`);
}

function score(ours: string, date: string) {
  const qs = questions();
  const rows: string[] = ["| Mode | Correct | Flagged | Silently wrong | No answer |", "| --- | --- | --- | --- | --- |"];
  const byKind = new Map<string, Record<string, Record<Verdict, number>>>();
  const silent: string[] = [];
  for (const m of MODES) {
    const n: Record<Verdict, number> = { correct: 0, flagged: 0, "silent-wrong": 0, "no-answer": 0 };
    for (const q of qs) {
      const f = join(ours, m, `${q.id}.json`);
      const a = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : undefined;
      const v = verdict(q.id, a);
      n[v]++;
      const kind = lookup(q.id).c.category;
      const k = byKind.get(kind) ?? {};
      k[m] ??= { correct: 0, flagged: 0, "silent-wrong": 0, "no-answer": 0 };
      k[m][v]++;
      byKind.set(kind, k);
      if (v === "silent-wrong") silent.push(`${m} ${q.id}: ${String(a?.text ?? "").replace(/\s+/g, " ").slice(0, 160)}`);
    }
    rows.push(`| ${m} | ${n.correct} | ${n.flagged} | ${n["silent-wrong"]} | ${n["no-answer"]} |`);
  }
  const kinds = ["| Kind | " + MODES.map((m) => `${m} (correct/flagged/silent)`).join(" | ") + " |", "| --- |" + MODES.map(() => " --- |").join("")];
  for (const [kind, k] of byKind) kinds.push(`| ${kind} | ${MODES.map((m) => `${k[m]?.correct ?? 0}/${k[m]?.flagged ?? 0}/${k[m]?.["silent-wrong"] ?? 0}`).join(" | ")} |`);
  const md = [`# Arithmetic set through the app, ${date}`, "", "60 standalone questions (unseen-v3), one chat each, scored against the code key with the gate scorer. Flagged = wrong, but the app showed a check warning or the answer stated doubt.", "", ...rows, "", "## Per kind", "", ...kinds, "", "## Silently wrong answers", "", ...(silent.length ? silent.map((s) => `- ${s}`) : ["- none"]), ""].join("\n");
  writeFileSync(join(DIR, `results-${date}.md`), md.replace(/\n/g, "\r\n"));
  console.log(md);
}

const [cmd, ...rest] = process.argv.slice(2);
const opt = (n: string) => (rest.indexOf(n) >= 0 ? rest[rest.indexOf(n) + 1] : undefined);
if (cmd === "build") build();
else if (cmd === "score") score(opt("--ours") ?? join(DIR, "../../.local/arithmetic-app-20261112/ours"), opt("--date") ?? new Date().toISOString().slice(0, 10));
else if (cmd) throw Error("usage: app-arithmetic.ts build | score [--ours dir] [--date d]");
