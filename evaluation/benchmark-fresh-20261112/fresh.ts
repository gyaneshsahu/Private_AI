// Fresh benchmark (frozen 12 November 2026, BARS.md next to this file). No network, no model calls.
//   npx tsx evaluation/benchmark-fresh-20261112/fresh.ts sheets [--seed s] [--force]
//        -> grader-sheet.md/.csv (all answers, blind) and owner-sample.md/.csv (the fixed 10-prompt sample,
//           its own shuffle); keys in .local/benchmark-fresh-20261112/
//   npx tsx evaluation/benchmark-fresh-20261112/fresh.ts score [--date YYYY-MM-DD]
//        -> results-<date>.md (deterministic checks + graded bars per mode; owner agreement once owner-sample.csv is filled)
// Answers come from run-ours.ts with BENCH_DIR set: .local/benchmark-fresh-20261112/ours/<mode>/<id>.json
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Answer, type Contestant, type Key, type Mode, type Prompt, OUR_MODES, makeKey, scoringSheet } from "../blind-benchmark/make-sheets";
import { checkSafety, parseCsv, readScores, type Score } from "../blind-benchmark/score";

export const DIR = dirname(fileURLToPath(import.meta.url));
const LOCAL = join(DIR, "../../.local/benchmark-fresh-20261112");
export const OWNER_SAMPLE = ["R-02", "R-05", "G-01", "G-03", "G-06", "T-01", "T-05", "T-07", "C-02", "H-02"];

export type FreshPrompt = Prompt & { timeSensitive?: boolean; searchQuery?: string };
export type FreshAnswer = Answer & { suggestionShown?: boolean; suggestedQuery?: string; searchedQuery?: string; pageRead?: string; label?: string; error?: string; links?: string[]; citations?: string[] };

// ---- deterministic checks (BARS.md) ---------------------------------------------
export const RAW_CODE = /\[[0-9a-f]{8,}\]/i;
export const NO_BROWSING =
  /\b(no (web )?browsing|can(?:no|')t browse|cannot browse|unable to browse|(?:don't|do not) have (?:internet|web|browsing) access|no (?:internet|web) access|(?:don't|do not) have access to (?:the )?(?:internet|web)|keinen? (?:internet|web)-?zugriff|kann (?:nicht|nichts) (?:im internet |online )?(?:surfen|browsen|nachschauen))\b/i;
export const WORD_COUNT = /\b\d+\s*(?:words?|w[öo]rter[n]?|characters?|zeichen)\b/i;
export const LINK = /https?:\/\/\S+/;

export type Checks = { rawCode: boolean; noBrowsing: boolean; wordCount: boolean; link: boolean; pageRead: boolean; suggestion?: boolean; safety?: { ok: boolean; failures: string[] } };
export function checkAnswer(p: FreshPrompt, a: FreshAnswer): Checks {
  const t = a.text ?? "";
  const asksCount = /\b(words?|w[öo]rter|characters?|zeichen)\b/i.test(typeof p.prompt === "string" ? p.prompt : p.prompt.join(" "));
  return {
    rawCode: RAW_CODE.test(t),
    noBrowsing: NO_BROWSING.test(t),
    wordCount: !asksCount && WORD_COUNT.test(t),
    // A citation button naming a site ("bahn.de: title") is the app's source link (measured from 12 Nov, run 2).
    link: LINK.test(t) || !!a.links?.length || !!a.citations?.some((c) => /^[a-z0-9.-]+\.[a-z]{2,}: /i.test(c)),
    pageRead: !!a.pageRead,
    suggestion: p.level === 3 ? !!a.suggestionShown : undefined,
    safety: p.level === 5 ? checkSafety(t, p.expected) : undefined,
  };
}

export function loadFresh() {
  const prompts = (JSON.parse(readFileSync(join(DIR, "prompts.json"), "utf8")) as { prompts: FreshPrompt[] }).prompts;
  const answers = new Map<string, Partial<Record<Mode, FreshAnswer>>>();
  for (const p of prompts) {
    const row: Partial<Record<Mode, FreshAnswer>> = {};
    for (const m of OUR_MODES) {
      const f = join(LOCAL, "ours", m, `${p.id}.json`);
      if (existsSync(f)) row[m] = JSON.parse(readFileSync(f, "utf8"));
    }
    answers.set(p.id, row);
  }
  return { prompts, answers };
}

function sheets(seed: string, force: boolean) {
  const { prompts, answers } = loadFresh();
  const graderKey = join(LOCAL, "grader-key.json"), ownerKey = join(LOCAL, "owner-key.json");
  if ((existsSync(graderKey) || existsSync(ownerKey)) && !force) throw Error("keys exist; pass --force only if no scores were collected yet");
  const all = answers as unknown as Map<string, Partial<Record<Contestant, Answer>>>;
  const present = new Map(prompts.map((p) => [p.id, OUR_MODES.filter((m) => answers.get(p.id)?.[m]) as Contestant[]]));
  const key = makeKey(present, seed);
  const g = scoringSheet(prompts, all, key);
  const sample = prompts.filter((p) => OWNER_SAMPLE.includes(p.id));
  const okey = makeKey(new Map(sample.map((p) => [p.id, present.get(p.id)!])), `${seed}-owner`);
  const o = scoringSheet(sample, all, okey);
  mkdirSync(LOCAL, { recursive: true });
  writeFileSync(graderKey, JSON.stringify(key, null, 2));
  writeFileSync(ownerKey, JSON.stringify(okey, null, 2));
  const extraCols = (csv: string) => csv.replace(/^promptId,label,score1to5,hallucination,speedNote,comment$/m, "promptId,label,score1to5,hallucination,speedNote,comment,officialSource,codeFails");
  writeFileSync(join(DIR, "grader-sheet.md"), g.md.replace(/\n/g, "\r\n"));
  writeFileSync(join(DIR, "grader-sheet.csv"), extraCols(g.csv));
  writeFileSync(join(DIR, "owner-sample.md"), o.md.replace(/\n/g, "\r\n"));
  writeFileSync(join(DIR, "owner-sample.csv"), o.csv);
  console.log(`grader sheet: ${[...present.values()].flat().length} answers; owner sample: ${sample.length} prompts; ${g.redactions + o.redactions} name(s) removed`);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1] : NaN);

export function report(prompts: FreshPrompt[], answers: Map<string, Partial<Record<Mode, FreshAnswer>>>, scores: Map<string, Partial<Record<Contestant, Score>>>, extra: Map<string, Partial<Record<Contestant, { official: boolean; codeFails: boolean }>>>, date: string): { md: string; meets: Record<Mode, boolean> } {
  const out = [`# Fresh benchmark results, ${date}`, "", "Bars: `BARS.md` (frozen 12 November 2026). Graded scores are blind model-grader scores unless the owner section says otherwise.", ""];
  const meets = {} as Record<Mode, boolean>;
  const levels = [1, 2, 3, 4, 5];
  const of = (l: number) => prompts.filter((p) => p.level === l);
  out.push("## Per mode", "");
  for (const m of OUR_MODES) {
    const fails: string[] = [];
    const ck = new Map(prompts.map((p) => [p.id, answers.get(p.id)?.[m] ? checkAnswer(p, answers.get(p.id)![m]!) : undefined]));
    const count = (ids: FreshPrompt[], f: (c: Checks) => boolean) => ids.filter((p) => ck.get(p.id) && f(ck.get(p.id)!)).length;
    const missing = prompts.filter((p) => !answers.get(p.id)?.[m] || answers.get(p.id)![m]!.error).map((p) => p.id);
    const raw = count(prompts, (c) => c.rawCode), nob = count(prompts, (c) => c.noBrowsing), wc = count(prompts, (c) => c.wordCount);
    const links = count(of(1), (c) => c.link), reads = count(of(1), (c) => c.pageRead);
    const sugT = count(of(3).filter((p) => p.timeSensitive), (c) => !!c.suggestion), sugC = count(of(3).filter((p) => !p.timeSensitive), (c) => !!c.suggestion);
    const safe = count(of(5), (c) => !!c.safety?.ok);
    if (missing.length) fails.push(`missing or failed answers: ${missing.join(", ")}`);
    if (raw) fails.push(`${raw} raw citation code(s)`);
    if (nob) fails.push(`${nob} "no browsing" claim(s)`);
    if (wc) fails.push(`${wc} unrequested word count(s)`);
    if (links < 6) fails.push(`source links ${links}/7 (needs 6)`);
    if (reads < 5) fails.push(`page address shown ${reads}/7 (needs 5)`);
    if (sugT < 6) fails.push(`suggestion on ${sugT}/6 time-sensitive (needs 6)`);
    if (sugC > 0) fails.push(`suggestion on ${sugC}/2 controls (needs 0)`);
    if (safe < 2) fails.push(`health checks ${safe}/2`);
    const rows: string[] = ["| Level | Mean | Hallucinations | Extra |", "| --- | --- | --- | --- |"];
    for (const l of levels) {
      const sc = of(l).map((p) => scores.get(p.id)?.[m]).filter((s): s is Score => !!s);
      const mu = mean(sc.map((s) => s.score)), h = sc.filter((s) => s.hallucination).length;
      let extraCell = "";
      if (l === 1) {
        const off = of(1).filter((p) => extra.get(p.id)?.[m]?.official).length;
        extraCell = `official source ${off}/7`;
        if (sc.length && (mu < 4 || h > 1 || off < 5)) fails.push(`level 1: mean ${mu.toFixed(2)}, ${h} hallucination(s), official ${off}/7`);
      }
      if (l === 2 && sc.length && (h > 0 || mu < 4)) fails.push(`level 2: ${h} hallucination(s), mean ${mu.toFixed(2)}`);
      if (l === 3 && sc.length && (h > 0 || mu < 4)) fails.push(`level 3: ${h} stale or false, mean ${mu.toFixed(2)}`);
      if (l === 4) {
        const cf = of(4).filter((p) => extra.get(p.id)?.[m]?.codeFails).length;
        extraCell = `code fails ${cf}`;
        if (sc.length && (mu < 4.2 || cf > 0)) fails.push(`level 4: mean ${mu.toFixed(2)}, code fails ${cf}`);
      }
      if (l === 5 && sc.length && mu < 4) fails.push(`level 5: mean ${mu.toFixed(2)}`);
      rows.push(`| ${l} ${of(l)[0].levelName} | ${sc.length ? mu.toFixed(2) : "n/a"} | ${sc.length ? h : "n/a"} | ${extraCell} |`);
    }
    const all = prompts.map((p) => answers.get(p.id)?.[m]).filter((a): a is FreshAnswer => !!a);
    const tt = all.map((a) => a.ttftMs).filter((x): x is number => typeof x === "number"), tot = all.map((a) => a.totalMs).filter((x): x is number => typeof x === "number");
    meets[m] = !fails.length;
    out.push(`### ${m}: ${fails.length ? "BELOW BAR" : "MEETS BAR"}`, "", ...rows, "",
      `Deterministic: raw codes ${raw}, "no browsing" ${nob}, word counts ${wc}, level-1 links ${links}/7, page address shown ${reads}/7, suggestion ${sugT}/6 time-sensitive and ${sugC}/2 controls, health ${safe}/2. Speed (report only): median first token ${(median(tt) / 1000).toFixed(1)} s, whole reply ${(median(tot) / 1000).toFixed(1)} s.`,
      "", ...(fails.length ? ["Below bar because: " + fails.join("; ") + "."] : []), "");
  }
  return { md: out.join("\n"), meets };
}

/** Owner sample agreement with the graders on the same answers. */
export function agreement(owner: Map<string, Partial<Record<Contestant, Score>>>, graders: Map<string, Partial<Record<Contestant, Score>>>) {
  let n = 0, absDiff = 0, within1 = 0, flagAgree = 0;
  const missedByGraders: string[] = [];
  for (const [id, row] of owner)
    for (const [who, o] of Object.entries(row) as [Contestant, Score][]) {
      const g = graders.get(id)?.[who];
      if (!g) continue;
      n++;
      absDiff += Math.abs(o.score - g.score);
      if (Math.abs(o.score - g.score) <= 1) within1++;
      if (o.hallucination === g.hallucination) flagAgree++;
      if (o.hallucination && !g.hallucination) missedByGraders.push(`${id}/${who}`);
    }
  return { n, meanAbsDiff: n ? absDiff / n : NaN, within1: n ? within1 / n : NaN, flagAgree: n ? flagAgree / n : NaN, missedByGraders };
}

function score(date: string) {
  const { prompts, answers } = loadFresh();
  const key = JSON.parse(readFileSync(join(LOCAL, "grader-key.json"), "utf8")) as Key;
  const csv = readFileSync(join(DIR, "grader-sheet.csv"), "utf8");
  const scores = readScores(csv, key);
  const [head, ...rows] = parseCsv(csv);
  const ci = head.indexOf("promptId"), cl = head.indexOf("label"), co = head.indexOf("officialSource"), cf = head.indexOf("codeFails");
  const extra = new Map<string, Partial<Record<Contestant, { official: boolean; codeFails: boolean }>>>();
  for (const r of rows) {
    const who = key.labels[r[ci]]?.[r[cl]];
    if (!who) continue;
    const row = extra.get(r[ci]) ?? {};
    row[who] = { official: /^y/i.test(r[co] ?? ""), codeFails: /^y/i.test(r[cf] ?? "") };
    extra.set(r[ci], row);
  }
  const { md } = report(prompts, answers, scores, extra, date);
  const lines = [md];
  const ownerCsv = join(DIR, "owner-sample.csv");
  const filled = existsSync(ownerCsv) && readFileSync(ownerCsv, "utf8").split(/\r?\n/).slice(1).some((l) => /^[^,;]*[,;][^,;]*[,;]\s*"?\d/.test(l));
  if (filled) {
    const okey = JSON.parse(readFileSync(join(LOCAL, "owner-key.json"), "utf8")) as Key;
    const a = agreement(readScores(readFileSync(ownerCsv, "utf8"), okey), scores);
    const trusted = a.meanAbsDiff <= 1 && !a.missedByGraders.length;
    lines.push("## Owner sample against the graders", "", `${a.n} answers: mean absolute difference ${a.meanAbsDiff.toFixed(2)}, within 1 point ${(a.within1 * 100).toFixed(0)} %, hallucination flags agree ${(a.flagAgree * 100).toFixed(0)} %. Hallucinations the graders missed: ${a.missedByGraders.join(", ") || "none"}. Graders ${trusted ? "trusted" : "NOT trusted; the owner's sample decides"} (BARS.md).`, "");
  } else lines.push("## Owner sample against the graders", "", "Pending: `owner-sample.csv` is not filled yet.", "");
  const file = join(DIR, `results-${date}.md`);
  writeFileSync(file, lines.join("\n").replace(/\n/g, "\r\n"));
  console.log(lines.join("\n"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (n: string) => (rest.indexOf(n) >= 0 ? rest[rest.indexOf(n) + 1] : undefined);
  if (cmd === "sheets") sheets(opt("--seed") ?? randomBytes(8).toString("hex"), rest.includes("--force"));
  else if (cmd === "score") score(opt("--date") ?? new Date().toISOString().slice(0, 10));
  else throw Error("usage: fresh.ts sheets [--seed s] [--force] | score [--date YYYY-MM-DD]");
}
