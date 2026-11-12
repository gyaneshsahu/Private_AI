// Tables for results-v3-unseen-20261112.md: reads the harness-v3
// results files (five systems x three repetitions; glm-5.3 low added 12 Nov) under
// .local/arithmetic-v3-unseen-20261112/<system>-rep<n>/results.json and prints
// Markdown with the verdict-v3 categories, Wilson 95 % bounds (verdict-v3.ts),
// per kind, repetition consistency, spend and flag classes. Also writes the full
// verdict-v3 listing per system to verdicts/unseen-v3-20261112/<system>.md.
// Pure reporting: calls nothing.
//
//   node --import tsx evaluation/arithmetic-gate/report-v3-unseen-20261112.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import unseenV3 from "./unseen-v3-20261023.json";
import { verdict, wilson } from "./verdict-v3";
import type { ConversationRecordV3, OutcomeV3 } from "./harness-v3";

const ROOT = ".local/arithmetic-v3-unseen-20261112";
export const SYSTEMS = [
  ["tinfoil-fast", "Tinfoil Fast: deepseek-v4-1-flash, thinking off"],
  ["tinfoil-thinking", "Tinfoil Thinking: glm-5-3, effort max"],
  ["privatemode-glm-flash", "Privatemode glm-5.3-flash, effort low"],
  ["privatemode-glm", "Privatemode glm-5.3, effort max"],
  ["privatemode-glm-low", "Privatemode glm-5.3, effort low"],
] as const;
const KIND = new Map(unseenV3.cases.map((c) => [c.id, c.category]));
const CRITICAL = new Set(unseenV3.cases.filter((c) => c.critical).map((c) => c.id));

type Results = {
  label: string;
  model: string;
  retries: number;
  reps: number;
  set: string;
  stopped?: string;
  price: { input: number; output: number; request: number };
  totals: { requests: number; inputTokens: number; outputTokens: number; costUSD: number; listPriceEquivalentEUR?: number; usage?: number };
  records: ConversationRecordV3[];
};

const pct = (k: number, n: number) => (n ? `${((100 * k) / n).toFixed(1)} %` : "-");
const ci = (k: number, n: number) => {
  const w = wilson(k, n);
  return `${w.low.toFixed(1)}-${w.high.toFixed(1)}`;
};
const cell = (k: number, n: number) => `${k} (${pct(k, n)}; ${ci(k, n)})`;

function split(records: ConversationRecordV3[]) {
  const c = (o: OutcomeV3) => records.filter((r) => r.outcome === o).length;
  return { n: records.length, correct: c("exact-unflagged"), falseFlag: c("exact-flagged"), wrongFlagged: c("wrong-flagged"), silent: c("wrong-silent"), noAnswer: c("no-answer") };
}
const row = (name: string, r: ConversationRecordV3[]) => {
  const k = split(r);
  return `| ${name} | ${k.n} | ${cell(k.correct, k.n)} | ${cell(k.falseFlag + k.wrongFlagged, k.n)} (${k.falseFlag} exact, ${k.wrongFlagged} wrong) | ${cell(k.silent, k.n)} | ${cell(k.noAnswer, k.n)} |`;
};
const HEAD = ["| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |", "| --- | --- | --- | --- | --- | --- |"];

const out: string[] = [];
const refusedCount: Record<string, number> = {};
const refused = (r: ConversationRecordV3) => r.turns.some((t) => t.attempts.some((a) => /Spend limit reached|insufficient_quota|HTTP 402|API access is paused/.test(a.transportFailure ?? "")));
const all: Record<string, { results: Results[]; records: ConversationRecordV3[] }> = {};
for (const [sys] of SYSTEMS) {
  // <sys>-rep<n>-resume[-b] holds the conversations rerun after the Tinfoil key's spend limit was raised; merged into its rep.
  const load = (f: string) => (existsSync(f) ? [JSON.parse(readFileSync(f, "utf8")) as Results] : []);
  const results = [1, 2, 3].flatMap((n) => {
    // -resume-b: Thinking reps 2 and 3 resumed in parallel with rep 1 (same ids, same settings).
    // -resume-c: reserved for finishing Thinking after the account's billing-period limit is lifted.
    const parts = ["", "-resume", "-resume-b", "-resume-c"].flatMap((s) => load(`${ROOT}/${sys}-rep${n}${s}/results.json`));
    if (!parts.length) return [];
    const totals = { requests: 0, inputTokens: 0, outputTokens: 0, costUSD: 0, listPriceEquivalentEUR: 0, usage: 0 };
    for (const p of parts) {
      for (const k of ["requests", "inputTokens", "outputTokens", "costUSD", "listPriceEquivalentEUR"] as const) totals[k] += p.totals[k] ?? 0;
      // The harness logs refused requests (other than 429) at the worst case; usage x price is what was actually consumed.
      totals.usage += (p.totals.inputTokens * p.price.input + p.totals.outputTokens * p.price.output) / 1e6;
    }
    return [{ ...parts[0], label: `${sys}-rep${n}`, totals, stopped: parts.map((p) => p.stopped).filter(Boolean).join("; ") || undefined, records: parts.flatMap((p) => p.records) }];
  });
  // A conversation touched by a supplier refusal (key spend limit) measured nothing; it is set aside, not counted as a model no-answer.
  refusedCount[sys] = results.flatMap((r) => r.records).filter(refused).length;
  for (const r of results) r.records = r.records.filter((x) => !refused(x));
  all[sys] = { results, records: results.flatMap((r) => r.records) };
}

out.push("### Per system (pooled over the repetitions; percentages with Wilson 95 % bounds; conversations refused by the supplier excluded)", "", ...HEAD);
for (const [sys, name] of SYSTEMS) out.push(row(name, all[sys].records));
out.push("", "| System | Measured (of 90) | Conversation records refused by a Tinfoil limit (set aside; initial run plus resumes) |", "| --- | --- | --- |");
for (const [sys, name] of SYSTEMS) out.push(`| ${name} | ${all[sys].records.length} | ${refusedCount[sys] ?? 0} |`);

const key = (r: ConversationRecordV3) => `${r.caseId} r${r.repetition}`;
const common = SYSTEMS.map(([sys]) => new Set(all[sys].records.map(key))).reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
out.push("", `### Same conversations on all ${SYSTEMS.length} systems (${common.size} case-repetition pairs measured everywhere)`, "", ...HEAD);
for (const [sys, name] of SYSTEMS) out.push(row(name, all[sys].records.filter((r) => common.has(key(r)))));

out.push("", "### Per repetition", "", ...HEAD);
for (const [sys, name] of SYSTEMS) for (const r of all[sys].results) out.push(row(`${name}, ${r.label.replace(`${sys}-`, "")}${r.stopped ? " (STOPPED)" : ""}`, r.records));

out.push("", "### Critical cases (16 cases x 3 = 48 per system when complete)", "", ...HEAD);
for (const [sys, name] of SYSTEMS) out.push(row(name, all[sys].records.filter((r) => CRITICAL.has(r.caseId))));

const kinds = [...new Set(unseenV3.cases.map((c) => c.category))].sort();
out.push("", "### Per question kind (pooled over repetitions; n = cases x 3)", "");
for (const [sys, name] of SYSTEMS) {
  out.push(`**${name}**`, "", ...HEAD);
  for (const k of kinds) out.push(row(k, all[sys].records.filter((r) => KIND.get(r.caseId) === k)));
  out.push("");
}
out.push(`**All ${SYSTEMS.length} systems together, per kind**`, "", ...HEAD);
const pooled = Object.values(all).flatMap((s) => s.records);
for (const k of kinds) out.push(row(k, pooled.filter((r) => KIND.get(r.caseId) === k)));

out.push("", "### Repetition-to-repetition consistency (cases answered in all three repetitions)", "");
out.push("| System | Cases in 3 reps | Same outcome in all 3 | Same exact/wrong in all 3 | Same figures shown in all 3 (bold lines; method text ignored) | Correct in all 3 | Silently wrong in at least one |", "| --- | --- | --- | --- | --- | --- | --- |");
for (const [sys, name] of SYSTEMS) {
  const by = new Map<string, ConversationRecordV3[]>();
  for (const r of all[sys].records) by.set(r.caseId, [...(by.get(r.caseId) ?? []), r]);
  const full = [...by.values()].filter((v) => v.length === 3);
  const same = (f: (r: ConversationRecordV3) => string) => full.filter((v) => new Set(v.map(f)).size === 1).length;
  const exact = (r: ConversationRecordV3) => (r.outcome.startsWith("exact") ? "exact" : r.outcome);
  out.push(
    `| ${name} | ${full.length} | ${same((r) => r.outcome)} | ${same(exact)} | ${same((r) => r.turns.map((t) => (t.answer.match(/\*\*[^*]+\*\*/g) ?? []).join(" ")).join("\u0000"))} | ${full.filter((v) => v.every((r) => r.outcome === "exact-unflagged")).length} | ${full.filter((v) => v.some((r) => r.outcome === "wrong-silent")).length} |`,
  );
}

out.push("", "### Spend (from the results files; the same lines are in the cost log)", "");
out.push("| System | Requests | Input tokens | Output tokens | USD by usage x price | USD as logged by the harness | Note |", "| --- | --- | --- | --- | --- | --- | --- |");
for (const [sys, name] of SYSTEMS) {
  const t = all[sys].results.map((r) => r.totals);
  const s = (f: (x: Results["totals"]) => number) => t.reduce((a, x) => a + f(x), 0);
  const eur = s((x) => x.listPriceEquivalentEUR ?? 0);
  out.push(`| ${name} | ${s((x) => x.requests)} | ${s((x) => x.inputTokens)} | ${s((x) => x.outputTokens)} | ${eur ? "0 (free quota)" : s((x) => x.usage ?? 0).toFixed(4)} | ${s((x) => x.costUSD).toFixed(4)} | ${eur ? `free token quota; list-price equivalent EUR ${eur.toFixed(4)}` : "live catalog price; the logged figure counts each HTTP 402 refusal at the worst case"} |`);
}

out.push("", "### Flags that fired (conversations per flag class combination)", "");
out.push("| System | Flag classes on exact answers (false flags) | Flag classes on wrong answers (caught) | Validation failures (call:code, attempts) |", "| --- | --- | --- | --- |");
for (const [sys, name] of SYSTEMS) {
  const ff: Record<string, number> = {}, cb: Record<string, number> = {}, vf: Record<string, number> = {};
  for (const r of all[sys].records) {
    const classes = [...new Set(r.turns.flatMap((t) => t.flagClasses))].sort().join("+") || "none";
    if (r.outcome === "exact-flagged") ff[classes] = (ff[classes] ?? 0) + 1;
    if (r.outcome === "wrong-flagged") cb[classes] = (cb[classes] ?? 0) + 1;
    for (const t of r.turns) for (const a of t.attempts) {
      const code = a.failure ? `${a.call}:${a.failure.code}` : a.transportFailure ? `${a.call}:transport` : undefined;
      if (code) vf[code] = (vf[code] ?? 0) + 1;
    }
  }
  const fmt = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  out.push(`| ${name} | ${fmt(ff)} | ${fmt(cb)} | ${fmt(vf)} |`);
}

console.log(out.join("\n"));

mkdirSync("evaluation/arithmetic-gate/verdicts/unseen-v3-20261112", { recursive: true });
for (const [sys] of SYSTEMS) {
  const r = all[sys].results;
  if (!r.length) continue;
  const merged = { ...r[0], cell: sys, label: `${sys} (rerun of unseen-v3, 12 November 2026)`, reps: r.length, stopped: r.map((x) => x.stopped).filter(Boolean).join("; ") || undefined, totals: { requests: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 }, records: all[sys].records, cases: r[0].records.map((x) => x.caseId) };
  for (const x of r) for (const k of ["requests", "inputTokens", "outputTokens", "costUSD"] as const) merged.totals[k] += x.totals[k];
  writeFileSync(`evaluation/arithmetic-gate/verdicts/unseen-v3-20261112/${sys}.md`, verdict(merged as Parameters<typeof verdict>[0], true) + "\n");
}
