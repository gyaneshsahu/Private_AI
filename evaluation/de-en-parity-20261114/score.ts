// German-versus-English parity (14 November 2026): scores the answers run-ours.ts wrote for this
// set and prints where the two language versions of a question differ. No model, no network.
//   npx tsx evaluation/de-en-parity-20261114/score.ts [resultsDir] [--mode auto]
// resultsDir defaults to .local/de-en-parity-20261114/ours-privatemode (run-ours.ts --privatemode).
// Also writes <resultsDir>/manual-sheet.md: the manual pairs and every pair whose automatic
// verdicts differ, side by side for a person to judge. Works without results (prints the
// detector comparison only).
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { checkMaths, type MathsExpected } from "../blind-benchmark/maths-check";
import { autoDecision } from "../../src/answer-modes";
import { germanRulesQuestion } from "../../src/german-rules";
import { needsCurrentInformation } from "../../src/when-to-search";

const DIR = "evaluation/de-en-parity-20261114";
const flag = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
const MODE = flag("mode") ?? "auto";
const OUT = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--")) ?? ".local/de-en-parity-20261114/ours-privatemode";

type Lang = "de" | "en";
const LANGS: Lang[] = ["de", "en"];
type Check = {
  mustMatch?: string[];
  mustNotMatch?: Record<Lang, string[]>;
  maxWords?: number;
  sentences?: { count: number; startsWith: string };
  shape?: "four-lowercase-names" | "json-city-country";
};
type Pair = {
  pair: string;
  category: "general" | "maths" | "rules";
  source: { set: string; id: string; language: Lang };
  scoring: "auto" | "manual";
  rule?: ({ kind: "maths"; expected: MathsExpected } | ({ kind: "check" | "fact" } & Check));
  sourceFacts?: string[];
  answerLanguage: "same" | "skip";
};
// What run-ours.ts writes per prompt (the fields used here).
type Result = { text?: string; error?: string; ttftMs?: number; totalMs?: number; label?: string; searched?: boolean; choiceShown?: boolean; suggestionShown?: boolean; uncheckedWarning?: boolean; turnTimings?: { tokens?: number }[] };

const pairs = JSON.parse(readFileSync(`${DIR}/expected.json`, "utf8")).pairs as Pair[];
const prompts = new Map((JSON.parse(readFileSync(`${DIR}/prompts.json`, "utf8")).prompts as { id: string; prompt: string }[]).map((p) => [p.id, p.prompt]));
assert.equal(pairs.length, 40);
assert.equal(prompts.size, 80);
for (const p of pairs) for (const l of LANGS) assert(prompts.has(`${p.pair}-${l}`), `${p.pair}-${l} missing in prompts.json`);

// The function-word rule of evaluation/answer-language-20261113/check.py, code blocks removed.
const DE = new Set("der die das und ist nicht ein eine einer mit zu den dem im für auf sie es wird werden auch oder wenn wie bei von aus".split(" "));
const EN = new Set("the and is not a an with to of in for on it you this that are or if how by from be".split(" "));
export function language(text: string): Lang | "unclear" {
  const words = text.replace(/```[\s\S]*?```/g, " ").toLowerCase().match(/[a-zäöüß]+/g) ?? [];
  const de = words.filter((w) => DE.has(w)).length;
  const en = words.filter((w) => EN.has(w)).length;
  return de + en < 3 ? "unclear" : de > en ? "de" : "en";
}

const found = (pattern: string, text: string) => new RegExp(pattern, "iu").test(text);
export function verdict(p: Pair, lang: Lang, text: string): "correct" | "incorrect" | "manual" {
  const r = p.rule;
  if (p.scoring === "manual" || !r) return "manual";
  if (r.kind === "maths") return checkMaths(text, r.expected, lang).verdict === "correct" ? "correct" : "incorrect";
  const t = text.trim();
  let ok = (r.mustMatch ?? []).every((m) => found(m, t)) && !(r.mustNotMatch?.[lang] ?? []).some((m) => found(m, t));
  if (r.maxWords) ok &&= t.split(/\s+/).length <= r.maxWords;
  if (r.sentences) {
    const s = t.split(/(?<=[.!?])\s+/).filter(Boolean);
    ok &&= s.length === r.sentences.count && s.every((x) => x.startsWith(r.sentences!.startsWith));
  }
  if (r.shape === "four-lowercase-names") ok &&= /^\p{Ll}[\p{Ll} -]*(,\s*\p{Ll}[\p{Ll} -]*){3}$/u.test(t);
  if (r.shape === "json-city-country") {
    let o: Record<string, unknown> | undefined;
    try {
      o = JSON.parse(t);
    } catch {
      /* not JSON only */
    }
    ok &&= !!o && Object.keys(o).sort().join() === "city,country" && o.city === "Paris" && /^(France|Frankreich)$/i.test(String(o.country));
  }
  return ok ? "correct" : "incorrect";
}

// Self-check of the scoring rules on canned replies (runs every time; cheap).
const pair = (id: string) => pairs.find((p) => p.pair === id)!;
assert.equal(verdict(pair("P-M03"), "de", "Rechnung …\nErgebnis: 5.627,54 €"), "correct");
assert.equal(verdict(pair("P-M03"), "en", "Final answer: €5,627.45"), "incorrect");
assert.equal(verdict(pair("P-M11"), "en", "Discount €49.60, so you pay €2,430.40."), "correct");
assert.equal(verdict(pair("P-R07"), "de", "Ab 8 Punkten wird die Fahrerlaubnis entzogen."), "correct");
assert.equal(verdict(pair("P-R07"), "en", "Check the official source for the exact threshold."), "incorrect");
assert.equal(verdict(pair("P-G04"), "de", "erdbeere, kirsche, himbeere, tomate"), "correct");
assert.equal(verdict(pair("P-G06"), "en", '{"city": "Paris", "country": "France"}'), "correct");
assert.equal(verdict(pair("P-G05"), "en", "Bees feed us. Bees are important. Bees buzz."), "incorrect");
assert.equal(language("Das ist ein Satz und der ist nicht lang."), "de");
assert.equal(language("This is a sentence and it is not long."), "en");

const median = (v: number[]) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : undefined);
const s = (ms?: number) => (ms === undefined ? "-" : `${(ms / 1000).toFixed(1)} s`);
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

// 1. What the app's on-device rules do with each version (same code as the app; no answers needed).
// A German-rules hit changes three things at once: Send asks first, Auto picks Thinking, and
// without web results the model is told not to state figures as facts.
const device = (text: string) => {
  const d = autoDecision({ messages: [{ id: "1", role: "user", text }], attachments: [] } as never);
  return { rules: germanRulesQuestion(text), current: needsCurrentInformation(text), auto: `${d.mode} (${d.reason})` };
};
const predicted = new Map(pairs.map((p) => [p.pair, { de: device(prompts.get(`${p.pair}-de`)!), en: device(prompts.get(`${p.pair}-en`)!) }]));
const uneven = pairs.filter((p) => JSON.stringify(predicted.get(p.pair)!.de) !== JSON.stringify(predicted.get(p.pair)!.en));
console.log(`# German-versus-English parity\n\n## On-device rules, German against English version (computed from the prompts)\n`);
console.log(`Rules detector fires: German ${pairs.filter((p) => predicted.get(p.pair)!.de.rules).length} of 40, English ${pairs.filter((p) => predicted.get(p.pair)!.en.rules).length} of 40. Pairs treated differently: ${uneven.length}.\n`);
if (uneven.length)
  console.log(table(["Pair", "Rules detector de / en", "Needs current information de / en", "Auto picks de / en"], uneven.map((p) => {
    const { de, en } = predicted.get(p.pair)!;
    return [p.pair, `${de.rules} / ${en.rules}`, `${de.current} / ${en.current}`, `${de.auto} / ${en.auto}`];
  })) + "\n");

// 2. The answers.
const read = (id: string): Result | undefined => {
  const f = `${OUT}/${MODE}/${id}.json`;
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Result) : undefined;
};
const mode = (label?: string) => (/Thinking|Gründlich/.test(label ?? "") ? "Thinking" : /Fast|Schnell/.test(label ?? "") ? "Fast" : "?");
const rows = pairs.flatMap((p) =>
  LANGS.map((lang) => {
    const a = read(`${p.pair}-${lang}`);
    const text = a?.text?.trim() ?? "";
    const answered = !!a && !a.error && !!text;
    const got = answered ? language(text) : undefined;
    return {
      p, lang, a, text, answered,
      verdict: answered ? verdict(p, lang, text) : undefined,
      // "unclear" (too few function words, e.g. a bare result line) counts neither way.
      languageOk: !answered || p.answerLanguage === "skip" || got === "unclear" ? undefined : got === lang,
      mode: answered ? mode(a!.label) : undefined,
      tokens: a?.turnTimings?.[0]?.tokens,
    };
  }),
);
const answered = rows.filter((r) => r.answered);
console.log(`## Answers in ${OUT}/${MODE}\n`);
if (!answered.length) console.log(`No answers found (${existsSync(OUT) ? "the folder has none for this set" : "the folder does not exist"}). Run the set first; see README.md.\n`);
else {
  const n = <T,>(xs: T[], f: (x: T) => unknown) => xs.filter(f).length;
  console.log(table(
    ["Category", "Language", "Answered", "Correct", "Incorrect", "Manual", "Answer language right", "Fast / Thinking", "First word median", "Whole reply median", "Tokens median", "Searched", "Asked first", "Unchecked warning"],
    [...(["general", "maths", "rules"] as const), "all" as const].flatMap((c) =>
      LANGS.map((lang) => {
        const all = rows.filter((r) => (c === "all" || r.p.category === c) && r.lang === lang);
        const got = all.filter((r) => r.answered);
        const checked = got.filter((r) => r.languageOk !== undefined);
        const num = (f: (r: (typeof got)[number]) => number | undefined) => got.map(f).filter((v): v is number => typeof v === "number");
        return [c, lang, `${got.length} of ${all.length}`, n(got, (r) => r.verdict === "correct"), n(got, (r) => r.verdict === "incorrect"), n(got, (r) => r.verdict === "manual"), `${n(checked, (r) => r.languageOk)} of ${checked.length}`, `${n(got, (r) => r.mode === "Fast")} / ${n(got, (r) => r.mode === "Thinking")}`, s(median(num((r) => r.a!.ttftMs))), s(median(num((r) => r.a!.totalMs))), median(num((r) => r.tokens)) ?? "-", n(got, (r) => r.a!.searched), n(got, (r) => r.a!.choiceShown), n(got, (r) => r.a!.uncheckedWarning)];
      }),
    ),
  ) + "\n");
  console.log("Correct and Incorrect cover the automatic rules only. For rules, Incorrect means the recorded figure is not in the answer, which is also what a careful answer without a source looks like: read those pairs on the sheet.\n");

  // 3. Pairs whose two versions differ.
  const by = (id: string, lang: Lang) => rows.find((r) => r.p.pair === id && r.lang === lang)!;
  const differ: string[][] = [];
  const unevenVerdict: Pair[] = [];
  for (const p of pairs) {
    const de = by(p.pair, "de"), en = by(p.pair, "en");
    const add = (what: string, a: unknown, b: unknown) => differ.push([p.pair, what, String(a ?? "-"), String(b ?? "-")]);
    if (de.answered !== en.answered) add("answered", de.answered ? "yes" : (de.a?.error ?? "no answer").slice(0, 60), en.answered ? "yes" : (en.a?.error ?? "no answer").slice(0, 60));
    for (const r of [de, en]) if (r.languageOk === false) add(`answer language (${r.lang} question)`, r.lang === "de" ? language(r.text) : "", r.lang === "en" ? language(r.text) : "");
    if (!de.answered || !en.answered) continue;
    if (de.verdict !== en.verdict) (add("verdict", de.verdict, en.verdict), unevenVerdict.push(p));
    if (de.mode !== en.mode) add("mode Auto picked", de.mode, en.mode);
    if (!!de.a!.searched !== !!en.a!.searched) add("searched", !!de.a!.searched, !!en.a!.searched);
    if (!!de.a!.choiceShown !== !!en.a!.choiceShown) add("asked to search first", !!de.a!.choiceShown, !!en.a!.choiceShown);
    if (!!de.a!.suggestionShown !== !!en.a!.suggestionShown) add("search suggestion shown", !!de.a!.suggestionShown, !!en.a!.suggestionShown);
    if (!!de.a!.uncheckedWarning !== !!en.a!.uncheckedWarning) add("unchecked-figures warning", !!de.a!.uncheckedWarning, !!en.a!.uncheckedWarning);
  }
  console.log(`## Pairs where German and English differ (${new Set(differ.map((d) => d[0])).size} of 40)\n`);
  console.log(differ.length ? table(["Pair", "What", "German", "English"], differ) + "\n" : "None.\n");

  // 4. The sheet for a person: manual pairs, and pairs whose automatic verdicts differ.
  const sheet = [`# German-versus-English parity: pairs to judge by hand`, "", `Answers from ${OUT}/${MODE}. For each pair: is one answer clearly better, and why (content, completeness, tone, language)?`, ""];
  for (const p of [...pairs.filter((x) => x.scoring === "manual"), ...unevenVerdict]) {
    sheet.push(`## ${p.pair} (${p.category}; source ${p.source.id}, written in ${p.source.language})`, "", p.scoring === "manual" ? "Manual pair." : "Automatic verdicts differ.", "", `Expected: ${(p.sourceFacts ?? []).join("; ") || JSON.stringify(p.rule)}`, "");
    for (const lang of LANGS) {
      const r = by(p.pair, lang);
      sheet.push(`### ${lang === "de" ? "German" : "English"}${r.answered ? ` (${r.mode}, ${r.verdict})` : ""}`, "", `Question: ${prompts.get(`${p.pair}-${lang}`)!.replace(/\n+/g, " / ")}`, "", r.answered ? r.text : `No answer${r.a?.error ? `: ${r.a.error}` : ""}.`, "");
    }
    sheet.push("Better: German / English / same. Note:", "");
  }
  writeFileSync(`${OUT}/manual-sheet.md`, sheet.join("\r\n"));
  console.log(`Sheet for manual judging: ${OUT}/manual-sheet.md (${pairs.filter((x) => x.scoring === "manual").length} manual pairs, ${unevenVerdict.length} with differing verdicts).`);
}
