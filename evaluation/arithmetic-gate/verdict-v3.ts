// Verdict for gate v3 (Design B) against THRESHOLD-v3.md: reads one or more
// harness-v2 results files and prints, as Markdown, the outcome table per
// repetition and pooled with Wilson 95 % bounds, the critical-case table, the
// measures against the bar, and every wrong-flagged and silent-wrong
// conversation with its program and rendered answer. Pure reporting: it
// changes nothing and calls nothing.
//
//   node --import tsx evaluation/arithmetic-gate/verdict-v3.ts <results.json> [--bar]
//
// --bar applies the C1 pass bar (n = 90); without it the file is reported only.
import { readFileSync } from "node:fs";
import unseenV3 from "./unseen-v3-20261023.json";

type Outcome = "exact-unflagged" | "exact-flagged" | "wrong-flagged" | "wrong-silent" | "no-answer";
interface Turn {
  turn: number;
  answer: string;
  flags: string[];
  program?: unknown;
  attempts: { failure?: { code: string; detail: string }; transportFailure?: string }[];
}
interface Record_ {
  caseId: string;
  repetition: number;
  turns: Turn[];
  outcome: Outcome;
  score: { pass: boolean; missing?: unknown; forbiddenHits?: unknown };
}
interface Results {
  label: string;
  set: string;
  cell: string;
  model: string;
  retries: number;
  reps: number;
  cases: string[];
  totals: { requests: number; inputTokens: number; outputTokens: number; costUSD: number };
  stopped?: string;
  records: Record_[];
}

/** Wilson score interval, 95 %, as percentages. */
export function wilson(k: number, n: number): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 100 };
  const z = 1.959964;
  const p = k / n;
  const denominator = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { low: (100 * (centre - margin)) / denominator, high: (100 * (centre + margin)) / denominator };
}

const CRITICAL = new Set(
  (unseenV3.cases as { id: string; critical: boolean }[]).filter((c) => c.critical).map((c) => c.id),
);

const KIND = new Map((unseenV3.cases as { id: string; category: string }[]).map((c) => [c.id, c.category]));

export const BAR = {
  silentWrongMax: 0,
  verifiedMin: 60,
  flaggedMax: 27,
  noAnswerMax: 9,
  n: 90,
};

function count(records: Record_[]) {
  const c = (o: Outcome) => records.filter((r) => r.outcome === o).length;
  return {
    n: records.length,
    verified: c("exact-unflagged"),
    falseFlag: c("exact-flagged"),
    wrongFlagged: c("wrong-flagged"),
    silentWrong: c("wrong-silent"),
    noAnswer: c("no-answer"),
  };
}

const pct = (k: number, n: number) => (n ? `${((100 * k) / n).toFixed(1)} %` : "-");
const bounds = (k: number, n: number) => {
  const w = wilson(k, n);
  return `${w.low.toFixed(1)}-${w.high.toFixed(1)} %`;
};

function table(title: string, groups: { name: string; records: Record_[] }[]) {
  const lines = [
    `**${title}**`,
    "",
    "| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const g of groups) {
    const k = count(g.records);
    lines.push(
      `| ${g.name} | ${k.n} | ${k.verified} (${pct(k.verified, k.n)}; ${bounds(k.verified, k.n)}) | ${k.falseFlag} | ${k.wrongFlagged} | ${k.silentWrong} (${bounds(k.silentWrong, k.n)}) | ${k.noAnswer} |`,
    );
  }
  return lines.join("\n");
}

export function verdict(results: Results, applyBar: boolean): string {
  const records = results.records;
  const reps = [...new Set(records.map((r) => r.repetition))].sort((a, b) => a - b);
  const out: string[] = [];
  out.push(`# ${results.label}: ${results.model}, retry ${results.retries}, ${results.reps} repetition(s), set ${results.set}`);
  out.push("");
  out.push(
    `Requests ${results.totals.requests}, input tokens ${results.totals.inputTokens}, output tokens ${results.totals.outputTokens}, cost USD ${results.totals.costUSD.toFixed(4)}${results.stopped ? `; STOPPED: ${results.stopped}` : ""}`,
  );
  out.push("");
  out.push(
    table("All cases", [
      ...reps.map((rep) => ({ name: `repetition ${rep}`, records: records.filter((r) => r.repetition === rep) })),
      { name: "pooled", records },
    ]),
  );
  out.push("");
  const critical = records.filter((r) => CRITICAL.has(r.caseId));
  out.push(
    table("Critical cases (reported separately; any silent wrong or no-answer is a fail)", [
      ...reps.map((rep) => ({ name: `repetition ${rep}`, records: critical.filter((r) => r.repetition === rep) })),
      { name: "pooled", records: critical },
    ]),
  );
  const kinds = [...new Set(records.map((r) => KIND.get(r.caseId) ?? "unknown"))].sort();
  out.push(table("Per kind (pooled over repetitions)", kinds.map((k) => ({ name: k, records: records.filter((r) => (KIND.get(r.caseId) ?? "unknown") === k) }))));
  out.push("");
  out.push("");
  if (applyBar) {
    const k = count(records);
    const kc = count(critical);
    const flagged = k.falseFlag + k.wrongFlagged;
    const rows: [string, string, string, boolean][] = [
      ["Silent wrong", `0 of ${BAR.n}`, `${k.silentWrong} of ${k.n}`, k.silentWrong <= BAR.silentWrongMax],
      ["Verified by recomputation", `at least ${BAR.verifiedMin} of ${BAR.n}`, `${k.verified} of ${k.n}`, k.verified >= BAR.verifiedMin],
      ["Flagged (false flag plus wrong, flagged)", `at most ${BAR.flaggedMax} of ${BAR.n}`, `${flagged} of ${k.n}`, flagged <= BAR.flaggedMax],
      ["No answer", `at most ${BAR.noAnswerMax} of ${BAR.n}`, `${k.noAnswer} of ${k.n}`, k.noAnswer <= BAR.noAnswerMax],
      ["Critical cases: silent wrong or no-answer", "none of 48", `${kc.silentWrong} silent wrong, ${kc.noAnswer} no answer of ${kc.n}`, kc.silentWrong === 0 && kc.noAnswer === 0],
    ];
    out.push("**Measures against the bar (THRESHOLD-v3.md, C1)**");
    out.push("");
    out.push("| Measure | Bar | Result | Met |");
    out.push("| --- | --- | --- | --- |");
    for (const [m, b, r, met] of rows) out.push(`| ${m} | ${b} | ${r} | ${met ? "yes" : "NO"} |`);
    const complete = k.n === BAR.n;
    const allMet = rows.every((r) => r[3]);
    const silentOk = k.silentWrong === 0 && kc.silentWrong === 0 && kc.noAnswer === 0;
    out.push("");
    out.push(
      `**Verdict: ${!complete ? `INCOMPLETE (${k.n} of ${BAR.n} conversations)` : allMet ? "PASS" : silentOk ? "FAIL on verified or flagged only (silent wrong zero, critical cases clean)" : "FAIL (silent wrong or critical case fail)"}**`,
    );
    out.push("");
  }
  const listed = records.filter((r) => r.outcome === "wrong-flagged" || r.outcome === "wrong-silent" || r.outcome === "no-answer");
  if (listed.length) {
    out.push("**Wrong-flagged, silent-wrong and no-answer conversations**");
    out.push("");
    for (const r of listed) {
      out.push(`- ${r.caseId} r${r.repetition}: ${r.outcome}${CRITICAL.has(r.caseId) ? " (critical)" : ""}`);
      for (const t of r.turns) {
        const failures = t.attempts.flatMap((a) => (a.failure ? [a.failure.code] : a.transportFailure ? [`transport: ${a.transportFailure}`] : []));
        out.push(`  - turn ${t.turn}: answer "${t.answer.replace(/\s+/g, " ").slice(0, 300)}"${t.flags.length ? `; flags: ${t.flags.join(" | ")}` : ""}${failures.length ? `; attempts: ${failures.join(", ")}` : ""}`);
        if (t.program) out.push(`    program: ${JSON.stringify(t.program).slice(0, 600)}`);
      }
      if (r.score.missing) out.push(`  - missing: ${JSON.stringify(r.score.missing).slice(0, 300)}`);
      if (r.score.forbiddenHits) out.push(`  - forbidden: ${JSON.stringify(r.score.forbiddenHits).slice(0, 300)}`);
    }
  }
  return out.join("\n");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("verdict-v3.ts")) {
  const file = process.argv[2];
  if (!file) throw Error("usage: verdict-v3.ts <results.json> [--bar]");
  const results = JSON.parse(readFileSync(file, "utf8")) as Results;
  console.log(verdict(results, process.argv.includes("--bar")));
}
