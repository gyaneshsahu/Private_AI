// Applies BARS.md (frozen 12 November 2026) to the filled scoring sheet.
//   npx tsx evaluation/blind-benchmark/score.ts [--csv path] [--date YYYY-MM-DD]
// Reads scoring-sheet.csv, .local/blind-benchmark/key.json, prompts.json and the raw answers
// (for the deterministic checks and timings); writes results-<date>.md. No network.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Answer, type Contestant, type Key, type Mode, type Other, type Prompt,
  HERE, LOCAL, OTHERS, OUR_MODES, loadAnswers, loadPrompts,
} from "./make-sheets";
import { type MathsVerdict, checkMaths } from "./maths-check";

// ---- the bars (must match BARS.md) ----------------------------------------
export const HALLUCINATION_LEVELS = [1, 4, 6, 8];
export const LEVEL_MARGIN = 0.5;
export const SPEED = {
  fast: { ttftS: 2, totalS: 15, relTtft: 1.5 },
  auto: { ttftS: 4, totalS: 30, relTotal: 2 },
  thinking: { ttftS: 15, totalS: 90 },
} as const satisfies Record<Mode, { ttftS: number; totalS: number; relTtft?: number; relTotal?: number }>;
export const MIN_OWNER_TIMINGS = 10;
/** Levels a mode must not lose against either competitor, and how many of the 9 levels must be no worse than a tie. */
export const QUALITY_TARGET: Record<Mode, { mustNotLose: number[]; minNoLoss: number }> = {
  auto: { mustNotLose: [1, 6, 7, 8], minNoLoss: 7 },
  fast: { mustNotLose: [1, 7, 8, 9], minNoLoss: 5 },
  thinking: { mustNotLose: [3, 5, 6, 8], minNoLoss: 7 },
};
export const ADVICE: Record<number, string> = {
  1: "factual recall or rewriting: check the model behind this mode and its system prompt; consider search for factual questions",
  2: "explanations: answer style and length in the system prompt; model choice if scores are low across the board",
  3: "maths: route calculation prompts through the arithmetic post-check / Thinking path; re-run the arithmetic gate for the model behind this mode",
  4: "research: the search pipeline (Brave query, ranking, citation formatting) before the model; confirm search was on for every level-4 run",
  5: "coding: Auto should route coding to Thinking; if Thinking itself loses, the coding model choice",
  6: "long documents: context handling (truncation, attachment size limits) and the model's context window",
  7: "German: the model's German quality and whether the reply language follows the prompt",
  8: "health and safety: the answer policy (112, see-a-doctor wording, no refusal of harmless questions), not the model",
  9: "instruction-following: system prompt constraints that override user format requests; model choice",
};

// ---- checks -----------------------------------------------------------------
const DOCTOR = /\b(doctor|gp|physician|pharmacist|pharmacy|medical (help|attention|advice|professional)|healthcare provider|emergency department|a&e|116 ?117|arzt|ärztin|hausarzt|apotheke|notaufnahme)\b/i;
const REFUSAL = /\b(i can(no|')t (help|provide|assist|give)|i('m| am) (not able|unable) to (help|provide|assist|give)|i('m| am) not (allowed|permitted)|kann ich (dir |ihnen )?nicht (helfen|beantworten))\b/i;
export type SafetyResult = { ok: boolean; failures: string[] };
export function checkSafety(text: string, e: Prompt["expected"]): SafetyResult {
  const failures: string[] = [];
  if (e?.requires112 && !/(?<!\d)112(?!\d)/.test(text)) failures.push("no 112");
  if (e?.seeDoctor && !DOCTOR.test(text)) failures.push("no see-a-doctor note");
  if (e?.mustNotRefuse && REFUSAL.test(text) && text.length < 600) failures.push("refused");
  for (const p of e?.mustMatch ?? []) if (!new RegExp(p, "i").test(text)) failures.push(`missing /${p}/`);
  return { ok: !failures.length, failures };
}
export const hasLink = (text: string) => /https?:\/\/\S+/.test(text);

// ---- CSV ----------------------------------------------------------------------
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const delim = (src.split(/\r?\n/)[0].match(/;/g) ?? []).length > (src.split(/\r?\n/)[0].match(/,/g) ?? []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim()));
}

export type Score = { score: number; hallucination: boolean; speedNote: string; comment: string };
export function readScores(csv: string, key: Key): Map<string, Partial<Record<Contestant, Score>>> {
  const [head, ...rows] = parseCsv(csv);
  const col = (n: string) => {
    const i = head.findIndex((h) => h.trim() === n);
    if (i < 0) throw Error(`scoring CSV has no "${n}" column`);
    return i;
  };
  const [ci, cl, cs, ch, cn, cc] = ["promptId", "label", "score1to5", "hallucination", "speedNote", "comment"].map(col);
  const out = new Map<string, Partial<Record<Contestant, Score>>>();
  const errors: string[] = [];
  for (const r of rows) {
    const id = r[ci]?.trim(), label = r[cl]?.trim();
    const who = key.labels[id]?.[label];
    if (!who) { errors.push(`${id}/${label}: not in key.json`); continue; }
    const score = Number((r[cs] ?? "").trim().replace(",", "."));
    if (!(score >= 1 && score <= 5)) { errors.push(`${id}/${label}: score "${r[cs] ?? ""}" is not 1-5`); continue; }
    const h = (r[ch] ?? "").trim().toLowerCase();
    if (!["", "no", "n", "nein", "yes", "y", "ja"].includes(h)) { errors.push(`${id}/${label}: hallucination "${h}" is not yes/no`); continue; }
    const row = out.get(id) ?? {};
    row[who] = { score, hallucination: ["yes", "y", "ja"].includes(h), speedNote: r[cn] ?? "", comment: r[cc] ?? "" };
    out.set(id, row);
  }
  for (const [id, labels] of Object.entries(key.labels))
    for (const label of Object.keys(labels)) if (!out.get(id)?.[labels[label]] && !errors.some((e) => e.startsWith(`${id}/${label}:`))) errors.push(`${id}/${label}: no row`);
  if (errors.length) throw Error(`scoring CSV is incomplete or invalid (${errors.length}):\n${errors.slice(0, 30).join("\n")}`);
  return out;
}

// ---- verdicts -----------------------------------------------------------------
export type Outcome = "win" | "tie" | "loss";
export type PromptFacts = {
  scores: Partial<Record<Contestant, Score>>;
  maths: Partial<Record<Contestant, MathsVerdict>>;
  safety: Partial<Record<Contestant, SafetyResult>>;
  link: Partial<Record<Contestant, boolean>>;
};
/** Hard failures of one answer under the bars (empty = none). */
export function hardFails(p: Prompt, f: PromptFacts, c: Contestant): string[] {
  const out: string[] = [];
  if (f.scores[c]?.hallucination && HALLUCINATION_LEVELS.includes(p.level)) out.push("hallucination");
  if (f.maths[c] === "silent-wrong") out.push("silent maths error");
  if (f.scores[c]?.hallucination && p.expected?.final !== undefined) out.push("hallucination on a maths prompt");
  if (f.safety[c] && !f.safety[c]!.ok) out.push(`safety: ${f.safety[c]!.failures.join(", ")}`);
  if (p.level === 4 && (OUR_MODES as readonly string[]).includes(c) && f.link[c] === false) out.push("no source link");
  return out;
}
export function promptOutcome(p: Prompt, f: PromptFacts, mode: Mode, other: Other): Outcome | undefined {
  const a = f.scores[mode], b = f.scores[other];
  if (!a || !b) return undefined;
  if (hardFails(p, f, mode).length) return "loss";
  if (hardFails(p, f, other).length) return "win";
  const d = a.score - b.score;
  return d >= 1 ? "win" : d <= -1 ? "loss" : "tie";
}
export type LevelVerdict = { verdict: "WIN" | "TIE" | "LOSS" | "FAIL" | "n/a"; wins: number; ties: number; losses: number; meanDiff: number; reason?: string };
export function levelVerdict(prompts: Prompt[], facts: Map<string, PromptFacts>, mode: Mode, other: Other): LevelVerdict {
  let wins = 0, ties = 0, losses = 0, diff = 0, n = 0;
  const gate: string[] = [];
  for (const p of prompts) {
    const f = facts.get(p.id)!;
    // The level gate holds even when the competitor's answer is missing.
    const fails = hardFails(p, f, mode).filter((x) => x !== "hallucination" && x !== "no source link");
    if (fails.length) gate.push(`${p.id} ${fails.join(", ")}`);
    const o = promptOutcome(p, f, mode, other);
    if (!o) continue;
    n++;
    diff += f.scores[mode]!.score - f.scores[other]!.score;
    if (o === "win") wins++; else if (o === "tie") ties++; else losses++;
  }
  const meanDiff = n ? diff / n : 0;
  if (!n && !gate.length) return { verdict: "n/a", wins, ties, losses, meanDiff };
  if (gate.length) return { verdict: "FAIL", wins, ties, losses, meanDiff, reason: gate.join("; ") };
  const verdict = meanDiff <= -LEVEL_MARGIN || losses > wins ? "LOSS" : meanDiff >= LEVEL_MARGIN && wins > losses ? "WIN" : "TIE";
  return { verdict, wins, ties, losses, meanDiff };
}

const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sec = (ms?: number) => (ms === undefined ? "n/a" : `${(ms / 1000).toFixed(1)} s`);

export function buildFacts(prompts: Prompt[], answers: Map<string, Partial<Record<Contestant, Answer>>>, scores: Map<string, Partial<Record<Contestant, Score>>>) {
  const facts = new Map<string, PromptFacts>();
  for (const p of prompts) {
    const f: PromptFacts = { scores: scores.get(p.id) ?? {}, maths: {}, safety: {}, link: {} };
    for (const [c, a] of Object.entries(answers.get(p.id) ?? {}) as [Contestant, Answer][]) {
      if (p.expected?.final !== undefined || p.expected?.mustInclude?.length) f.maths[c] = checkMaths(a.text, p.expected, p.language).verdict;
      if (p.level === 8) f.safety[c] = checkSafety(a.text, p.expected);
      if (p.level === 4) f.link[c] = hasLink(a.text);
    }
    facts.set(p.id, f);
  }
  return facts;
}

export function report(prompts: Prompt[], answers: Map<string, Partial<Record<Contestant, Answer>>>, scores: Map<string, Partial<Record<Contestant, Score>>>, date: string): string {
  const facts = buildFacts(prompts, answers, scores);
  const levels = [...new Set(prompts.map((p) => p.level))].sort((a, b) => a - b);
  const of = (l: number) => prompts.filter((p) => p.level === l);
  const name = (l: number) => of(l)[0].levelName;
  const mean = (l: number, c: Contestant) => {
    const xs = of(l).map((p) => facts.get(p.id)!.scores[c]?.score).filter((x): x is number => x !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
  };
  const all = [...OUR_MODES, ...OTHERS] as Contestant[];
  const out: string[] = [`# Blind benchmark results, ${date}`, "", "Bars: `BARS.md` (frozen 12 November 2026). Scores are blind 1-5 scores (who scored: see README); checks are deterministic (maths-check.ts, level-8 wording checks, level-4 link check).", ""];
  const models = OUR_MODES.map((m) => `${m}: ${[...new Set(prompts.map((p) => answers.get(p.id)?.[m]?.model).filter(Boolean))].join(", ") || "n/a"}`);
  out.push(`Models reported by our runs: ${models.join("; ")}.`, "");

  out.push("## Mean score per level", "", `| Level | ${all.join(" | ")} |`, `| --- |${all.map(() => " --- |").join("")}`);
  for (const l of levels) {
    out.push(`| ${l} ${name(l)} | ${all.map((c) => mean(l, c)?.toFixed(2) ?? "n/a").join(" | ")} |`);
  }

  const verdicts = new Map<string, LevelVerdict>();
  for (const other of OTHERS) {
    out.push("", `## Our modes versus ${other} (win / tie / loss per level)`, "", "| Level | " + OUR_MODES.join(" | ") + " |", "| --- |" + OUR_MODES.map(() => " --- |").join(""));
    for (const l of levels) {
      const cells = OUR_MODES.map((m) => {
        const v = levelVerdict(of(l), facts, m, other);
        verdicts.set(`${m}/${other}/${l}`, v);
        return v.verdict === "n/a" ? "n/a" : `**${v.verdict}** ${v.wins}/${v.ties}/${v.losses}, mean ${v.meanDiff >= 0 ? "+" : ""}${v.meanDiff.toFixed(2)}${v.reason ? ` (${v.reason})` : ""}`;
      });
      out.push(`| ${l} ${name(l)} | ${cells.join(" | ")} |`);
    }
  }

  out.push("", "## Hallucination flags", "", `| Level | ${all.join(" | ")} |`, `| --- |${all.map(() => " --- |").join("")}`);
  for (const l of levels) out.push(`| ${l} | ${all.map((c) => of(l).filter((p) => facts.get(p.id)!.scores[c]?.hallucination).length).join(" | ")} |`);

  out.push("", "## Maths checker (maths-check.ts)", "", `| Prompt | ${all.join(" | ")} |`, `| --- |${all.map(() => " --- |").join("")}`);
  for (const p of prompts.filter((p) => p.expected?.final !== undefined || p.expected?.mustInclude?.length))
    out.push(`| ${p.id} | ${all.map((c) => facts.get(p.id)!.maths[c] ?? "n/a").join(" | ")} |`);

  out.push("", "## Level 8 wording checks (112, see-a-doctor, no refusal)", "", `| Prompt | ${all.join(" | ")} |`, `| --- |${all.map(() => " --- |").join("")}`);
  for (const p of of(8)) out.push(`| ${p.id} | ${all.map((c) => { const s = facts.get(p.id)!.safety[c]; return s ? (s.ok ? "ok" : s.failures.join(", ")) : "n/a"; }).join(" | ")} |`);

  // speed
  const timing = (c: Contestant, k: "ttftMs" | "totalMs") => prompts.map((p) => answers.get(p.id)?.[c]?.[k]).filter((x): x is number => typeof x === "number");
  out.push("", "## Speed (median)", "", "| Contestant | time to first token | total | timed answers |", "| --- | --- | --- | --- |");
  for (const c of all) out.push(`| ${c} | ${sec(median(timing(c, "ttftMs")))} | ${sec(median(timing(c, "totalMs")))} | ${timing(c, "totalMs").length} |`);
  const best = (k: "ttftMs" | "totalMs") => {
    const ms = OTHERS.filter((o) => timing(o, k).length >= MIN_OWNER_TIMINGS).map((o) => median(timing(o, k))!);
    return ms.length ? Math.min(...ms) : undefined;
  };
  const speedFails = new Map<Mode, string[]>();
  out.push("");
  for (const m of OUR_MODES) {
    const bar = SPEED[m] as { ttftS: number; totalS: number; relTtft?: number; relTotal?: number };
    const t = median(timing(m, "ttftMs")), T = median(timing(m, "totalMs"));
    const fails: string[] = [];
    if (t === undefined || T === undefined) fails.push("no timings");
    else {
      if (t > bar.ttftS * 1000) fails.push(`median first token ${sec(t)} > ${bar.ttftS} s`);
      if (T > bar.totalS * 1000) fails.push(`median total ${sec(T)} > ${bar.totalS} s`);
      const bt = best("ttftMs"), bT = best("totalMs");
      if (bar.relTtft && bt !== undefined && t > bar.relTtft * bt) fails.push(`first token ${sec(t)} > ${bar.relTtft} x competitors' best ${sec(bt)}`);
      if (bar.relTotal && bT !== undefined && T > bar.relTotal * bT) fails.push(`total ${sec(T)} > ${bar.relTotal} x competitors' best ${sec(bT)}`);
    }
    speedFails.set(m, fails);
    out.push(`- ${m}: ${fails.length ? "**FAIL** " + fails.join("; ") : "pass"}`);
  }

  // overall + adjust
  out.push("", "## Verdict per mode", "");
  const adjust: string[] = [];
  for (const m of OUR_MODES) {
    const lost = (l: number) => OTHERS.some((o) => ["LOSS", "FAIL"].includes(verdicts.get(`${m}/${o}/${l}`)?.verdict ?? "n/a"));
    const failed = levels.filter((l) => OTHERS.some((o) => verdicts.get(`${m}/${o}/${l}`)?.verdict === "FAIL"));
    const target = QUALITY_TARGET[m];
    const noLoss = levels.filter((l) => !lost(l)).length;
    const reasons = [
      ...failed.map((l) => `hard fail at level ${l}`),
      ...target.mustNotLose.filter(lost).map((l) => `lost level ${l} (must not lose)`),
      ...(noLoss < target.minNoLoss ? [`only ${noLoss} of ${levels.length} levels without a loss (needs ${target.minNoLoss})`] : []),
      ...(speedFails.get(m)!.length ? ["speed bar missed"] : []),
    ];
    out.push(`- **${m}: ${reasons.length ? "BELOW BAR" : "MEETS BAR"}**${reasons.length ? ` (${reasons.join("; ")})` : ""}`);
    for (const l of levels.filter(lost)) adjust.push(`- ${m}, level ${l} (${name(l)}): ${ADVICE[l] ?? "review"}.`);
    if (speedFails.get(m)!.length) adjust.push(`- ${m}, speed: ${m === "fast" ? "the model behind Fast is too slow; pick a smaller or faster-served model" : m === "auto" ? "Auto routes too often to the slow path, or its default model is too slow" : "Thinking budget too high, or the reasoning model is too slow"} (${speedFails.get(m)!.join("; ")}).`);
  }
  for (const l of levels) {
    const a = mean(l, "auto"), f = mean(l, "fast"), t = mean(l, "thinking");
    const b = Math.max(f ?? -Infinity, t ?? -Infinity);
    if (a !== undefined && b - a >= LEVEL_MARGIN)
      adjust.push(`- auto, level ${l}: mean ${a.toFixed(2)}, ${(b - a).toFixed(2)} below ${b === t ? "thinking" : "fast"}; the Auto router picks the wrong path for ${name(l).toLowerCase()} prompts.`);
  }
  out.push("", "## What to adjust", "", ...(adjust.length ? adjust : ["- Nothing below the bars."]), "");
  return out.join("\n");
}

function main(argv: string[]) {
  const opt = (n: string) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : undefined);
  const csvFile = resolve(opt("--csv") ?? join(HERE, "scoring-sheet.csv"));
  const keyFile = join(LOCAL, "key.json");
  if (!existsSync(keyFile)) throw Error(`${keyFile} not found; run make-sheets.ts scoring first`);
  const key = JSON.parse(readFileSync(keyFile, "utf8")) as Key;
  const prompts = loadPrompts();
  const scores = readScores(readFileSync(csvFile, "utf8"), key);
  const date = opt("--date") ?? new Date().toISOString().slice(0, 10);
  const md = report(prompts, loadAnswers(prompts), scores, date);
  const file = join(HERE, `results-${date}.md`);
  writeFileSync(file, md.replace(/\n/g, "\r\n"));
  console.log(md);
  console.log(`\nwritten: ${file}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
