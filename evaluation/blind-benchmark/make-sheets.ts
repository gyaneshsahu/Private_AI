// Blind benchmark sheets. No network, no model calls.
//   npx tsx evaluation/blind-benchmark/make-sheets.ts prompts            -> prompt-sheet.md
//   npx tsx evaluation/blind-benchmark/make-sheets.ts scoring [--seed s] [--force]
//        -> scoring-sheet.md + scoring-sheet.csv (blind) and .local/blind-benchmark/key.json
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MathsExpected } from "./maths-check";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../..");
export const LOCAL = join(ROOT, ".local", "blind-benchmark");
export const OUR_MODES = ["auto", "fast", "thinking"] as const;
// Gemini dropped by the owner on 12 November 2026 (ChatGPT only); the bars are otherwise unchanged.
export const OTHERS = ["chatgpt"] as const;
export type Mode = (typeof OUR_MODES)[number];
export type Other = (typeof OTHERS)[number];
export type Contestant = Mode | Other;
export const CONTESTANTS: Contestant[] = [...OUR_MODES, ...OTHERS];

export type Expected = MathsExpected & {
  facts?: string[];
  elements?: string[];
  requires112?: boolean;
  seeDoctor?: boolean;
  mustNotRefuse?: boolean;
  /** Extra case-insensitive regexes the reply must match (level 8). */
  mustMatch?: string[];
};
export type Prompt = {
  id: string;
  level: number;
  levelName: string;
  prompt: string | string[];
  language: "en" | "de";
  expected?: Expected;
  searchExpected?: boolean;
  attachments?: { path: string }[];
  notes?: string;
};
export type Answer = { text: string; ttftMs?: number; totalMs?: number; model?: string };
export type Key = { seed: string; createdAt: string; labels: Record<string, Record<string, Contestant>> };

export function loadPrompts(file = join(HERE, "prompts.json")): Prompt[] {
  return (JSON.parse(readFileSync(file, "utf8")) as { prompts: Prompt[] }).prompts;
}

/** The exact turns to paste; attachments are appended to the first turn. */
export function turns(p: Prompt): string[] {
  const list = typeof p.prompt === "string" ? [p.prompt] : [...p.prompt];
  for (const a of p.attachments ?? [])
    list[0] += `\n\n---\n\n${readFileSync(join(HERE, a.path), "utf8").replace(/\r\n/g, "\n").trim()}`;
  return list;
}

/** Owner's pasted answer: optional "ttft: <s>" / "total: <s>" header lines, then "---", then the text. */
export function parseOwnerAnswer(raw: string): Answer {
  const text = raw.replace(/\r\n/g, "\n");
  const m = /^((?:[a-z]+:[^\n]*\n)+)---\n/i.exec(text);
  if (!m) return { text: text.trim() };
  const head = Object.fromEntries(
    m[1].trim().split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim().toLowerCase(), l.slice(l.indexOf(":") + 1).trim()]),
  );
  const secs = (v?: string) => (v && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) * 1000 : undefined);
  return { text: text.slice(m[0].length).trim(), ttftMs: secs(head.ttft), totalMs: secs(head.total) };
}

export function loadAnswers(prompts: Prompt[], dirs = { ours: join(LOCAL, "ours"), others: join(HERE, "answers") }) {
  const out = new Map<string, Partial<Record<Contestant, Answer>>>();
  for (const p of prompts) {
    const row: Partial<Record<Contestant, Answer>> = {};
    for (const mode of OUR_MODES) {
      const f = join(dirs.ours, mode, `${p.id}.json`);
      if (!existsSync(f)) continue;
      const a = JSON.parse(readFileSync(f, "utf8")) as Answer & { mode?: string };
      if (typeof a.text !== "string") throw Error(`${f}: "text" must be a string`);
      if (a.mode && a.mode !== mode) throw Error(`${f}: mode "${a.mode}" does not match folder "${mode}"`);
      row[mode] = { text: a.text, ttftMs: a.ttftMs, totalMs: a.totalMs, model: a.model };
    }
    for (const o of OTHERS) {
      const f = join(dirs.others, o, `${p.id}.md`);
      if (existsSync(f)) row[o] = parseOwnerAnswer(readFileSync(f, "utf8"));
    }
    out.set(p.id, row);
  }
  return out;
}

// --- seeded shuffle -------------------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Fisher-Yates with a per-prompt stream, so adding a prompt never reshuffles another. */
export function shuffled<T>(items: readonly T[], seed: string, promptId: string): T[] {
  const rand = mulberry32(hash(`${seed}:${promptId}`));
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeKey(present: Map<string, Contestant[]>, seed: string): Key {
  const labels: Key["labels"] = {};
  for (const [id, who] of present)
    labels[id] = Object.fromEntries(shuffled(who, seed, id).map((c, i) => [String.fromCharCode(65 + i), c]));
  return { seed, createdAt: new Date().toISOString(), labels };
}

// --- blinding -------------------------------------------------------------
const NAMES =
  /\b(chat ?gpt|gpt[-\w.]*|openai|gemini[-\w.]*|google deepmind|deepmind|bard|comet ?row|privateai|tinfoil|deepseek[-\w.]*|gemma[-\w.]*|glm[-\w.]*|kimi[-\w.]*|qwen[-\w.]*|llama[-\w.]*|mistral[-\w.]*|claude|anthropic)\b/gi;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Removes self-identifying names; `extra` holds the model ids our own runs reported. */
export function redact(text: string, extra: string[] = []): { text: string; count: number } {
  let count = 0;
  const hit = () => (count++, "[name removed]");
  let t = text.replace(NAMES, hit);
  for (const e of extra.filter(Boolean)) t = t.replace(new RegExp(escape(e), "gi"), hit);
  return { text: t, count };
}

// --- sheets ---------------------------------------------------------------
const fence = "~~~~~~";
function reference(e: Expected | undefined): string[] {
  if (!e) return [];
  const lines: string[] = [];
  if (e.final !== undefined) lines.push(`- Expected final value: ${e.final}`);
  if (e.mustInclude?.length) lines.push(`- Must also state: ${e.mustInclude.join(", ")}`);
  for (const f of e.facts ?? []) lines.push(`- Fact: ${f}`);
  for (const x of e.elements ?? []) lines.push(`- Element: ${x}`);
  if (e.requires112) lines.push("- Must give the German emergency number 112");
  if (e.seeDoctor) lines.push("- Must suggest seeing a doctor or pharmacist where appropriate");
  if (e.mustNotRefuse) lines.push("- Must not refuse");
  return lines;
}

export function promptSheet(prompts: Prompt[]): string {
  const out = [
    "# Blind benchmark: prompt sheet (generated, do not edit)",
    "",
    "Generated by `npx tsx evaluation/blind-benchmark/make-sheets.ts prompts` from `prompts.json` (frozen 12 November 2026).",
    "",
    "For each prompt, in ChatGPT and in Gemini: start a **new chat**, use the default model the app offers (write its name in `answers/models.md`, not in the answer files), paste the text block exactly, and note the time to the first word and the total time with a stopwatch. Multi-turn prompts: paste the turns one after another in the same chat and copy every reply, separated by a line `--- turn N ---`. Search/browsing stays on its default. Save each answer as `answers/chatgpt/<id>.md` and `answers/gemini/<id>.md` in this form:",
    "",
    "```",
    "ttft: 1.8",
    "total: 12.4",
    "---",
    "<pasted answer>",
    "```",
    "",
    "Times are in seconds; leave a line out if you did not time it. Paste the answer as plain text or Markdown (use the app's copy button).",
    "",
  ];
  prompts.forEach((p, i) => {
    out.push(`## ${i + 1}. ${p.id} (level ${p.level}: ${p.levelName})`, "");
    if (p.searchExpected) out.push("_Research prompt: web search/browsing on._", "");
    turns(p).forEach((t, n, all) => {
      if (all.length > 1) out.push(`Turn ${n + 1}:`, "");
      out.push(fence + "text", t, fence, "");
    });
    out.push(`- [ ] ChatGPT saved to \`answers/chatgpt/${p.id}.md\` (ttft ____ s, total ____ s)`);
    out.push(`- [ ] Gemini saved to \`answers/gemini/${p.id}.md\` (ttft ____ s, total ____ s)`, "");
  });
  return out.join("\n");
}

const csvCell = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const CSV_HEADER = ["promptId", "label", "score1to5", "hallucination", "speedNote", "comment"];

export function scoringSheet(prompts: Prompt[], answers: Map<string, Partial<Record<Contestant, Answer>>>, key: Key) {
  const models = [...answers.values()].flatMap((r) => OUR_MODES.map((m) => r[m]?.model ?? ""));
  let redactions = 0;
  const md = [
    "# Blind benchmark: scoring sheet",
    "",
    "Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.",
    "",
  ];
  const csv = [CSV_HEADER.join(",")];
  prompts.forEach((p, i) => {
    const labels = key.labels[p.id];
    if (!labels) return;
    md.push(`## ${i + 1}. ${p.id} (level ${p.level}: ${p.levelName})`, "");
    const t = typeof p.prompt === "string" ? [p.prompt] : p.prompt;
    t.forEach((x, n) => md.push(t.length > 1 ? `**Turn ${n + 1}:**` : "**Prompt:**", "", fence + "text", x, fence, ""));
    for (const a of p.attachments ?? []) md.push(`_Pasted with the document \`${a.path}\` (read it there)._`, "");
    const ref = reference(p.expected);
    if (ref.length) md.push("**Reference for the scorer:**", "", ...ref, "");
    for (const [label, who] of Object.entries(labels)) {
      const r = redact(answers.get(p.id)?.[who]?.text ?? "", models);
      redactions += r.count;
      md.push(`### Answer ${label}`, "", fence + "markdown", r.text, fence, "");
      csv.push([p.id, label, "", "", "", ""].map(csvCell).join(","));
    }
  });
  return { md: md.join("\n"), csv: csv.join("\n") + "\n", redactions };
}

function main(argv: string[]) {
  const [cmd, ...rest] = argv;
  const flag = (n: string) => rest.includes(n);
  const opt = (n: string) => (rest.indexOf(n) >= 0 ? rest[rest.indexOf(n) + 1] : undefined);
  const prompts = loadPrompts();
  if (cmd === "prompts") {
    writeFileSync(join(HERE, "prompt-sheet.md"), promptSheet(prompts).replace(/\n/g, "\r\n"));
    console.log(`prompt-sheet.md: ${prompts.length} prompts`);
    return;
  }
  if (cmd !== "scoring") throw Error("usage: make-sheets.ts prompts | scoring [--seed s] [--force]");
  const keyFile = join(LOCAL, "key.json");
  const csvFile = join(HERE, "scoring-sheet.csv");
  const scored = existsSync(csvFile) && readFileSync(csvFile, "utf8").split(/\r?\n/).slice(1).some((l) => /^[^,;]*[,;][^,;]*[,;]\s*"?\d/.test(l));
  if ((existsSync(keyFile) || scored) && !flag("--force"))
    throw Error("key.json or a filled scoring-sheet.csv already exists; reshuffling would discard the scoring. Pass --force only if you mean it.");
  const answers = loadAnswers(prompts);
  const present = new Map<string, Contestant[]>();
  const missing: string[] = [];
  for (const p of prompts) {
    const row = answers.get(p.id)!;
    const who = CONTESTANTS.filter((c) => row[c]);
    CONTESTANTS.filter((c) => !row[c]).forEach((c) => missing.push(`${p.id}/${c}`));
    if (who.length) present.set(p.id, who);
  }
  const key = makeKey(present, opt("--seed") ?? randomBytes(8).toString("hex"));
  const sheet = scoringSheet(prompts, answers, key);
  mkdirSync(LOCAL, { recursive: true });
  writeFileSync(keyFile, JSON.stringify(key, null, 2));
  writeFileSync(join(HERE, "scoring-sheet.md"), sheet.md.replace(/\n/g, "\r\n"));
  writeFileSync(csvFile, sheet.csv);
  console.log(`scoring sheet: ${present.size} prompts, ${[...present.values()].flat().length} answers; key in ${keyFile}`);
  if (sheet.redactions) console.log(`${sheet.redactions} self-identifying name(s) replaced with [name removed]`);
  if (missing.length) console.log(`missing ${missing.length} answer(s): ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ", ..." : ""}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
