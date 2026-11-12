// Offline routing check (12 November 2026): for every graded prompt in the two blind benchmarks,
// pick the answer of the mode a routing rule chooses and score it with the blind grades already
// collected. Compares the rule against always-Fast, always-Thinking, the Auto that actually ran,
// and the per-prompt best. No model calls.
//   npx tsx evaluation/routing-sim.ts
import { readFileSync } from "node:fs";
import { autoDecision, autoMode } from "../src/answer-modes";
import { parseCsv } from "./blind-benchmark/score";
import type { Conversation } from "../shared/contracts";

type Row = { id: string; set: string; level: string; prompt: string; docs: string[]; web: boolean; scores: Record<string, { score: number; h: boolean }>; label?: string };

function load(set: string, dir: string, csv: string, key: string, labelDir: string): Row[] {
  const prompts = JSON.parse(readFileSync(`${dir}/prompts.json`, "utf8")).prompts as { id: string; level: number; levelName: string; prompt: string | string[]; attachments?: { path: string }[]; searchExpected?: boolean }[];
  const labels = JSON.parse(readFileSync(key, "utf8")).labels as Record<string, Record<string, string>>;
  const [head, ...rows] = parseCsv(readFileSync(csv, "utf8"));
  const c = (n: string) => head.indexOf(n);
  const out = new Map<string, Row>();
  for (const p of prompts)
    out.set(p.id, { id: p.id, set, level: `${p.level} ${p.levelName}`, prompt: Array.isArray(p.prompt) ? p.prompt.at(-1)! : p.prompt, docs: (p.attachments ?? []).map((a) => readFileSync(`${dir}/${a.path}`, "utf8")), web: !!p.searchExpected, scores: {} });
  for (const r of rows) {
    const who = labels[r[c("promptId")]]?.[r[c("label")]];
    const row = out.get(r[c("promptId")]);
    if (who && row) row.scores[who] = { score: Number(r[c("score1to5")]), h: /^y/i.test(r[c("hallucination")]) };
  }
  for (const row of out.values()) {
    try {
      row.label = JSON.parse(readFileSync(`${labelDir}/auto/${row.id}.json`, "utf8")).label;
    } catch { /* no auto answer */ }
  }
  return [...out.values()];
}

// Research prompts ran with approved search results in the conversation; model that too.
export function conversationOf(text: string, docs: string[] = [], web = false): Conversation {
  return {
    id: "sim", title: "sim",
    messages: [{ id: "u", role: "user", text, createdAt: new Date(0).toISOString() }],
    attachments: [
      ...docs.map((d, i) => ({ id: `a${i}`, selected: true, sources: [{ id: `s${i}`, title: "doc", text: d }] })),
      ...(web ? [{ id: "w", selected: true, sources: [{ id: "w1", title: "web", text: "result", url: "https://example.org/" }] }] : []),
    ],
  } as unknown as Conversation;
}

export function simulate(rows: Row[], route: (r: Row) => "fast" | "thinking") {
  const pick = (r: Row, m: string) => r.scores[m];
  const agg = (f: (r: Row) => { score: number; h: boolean } | undefined) => {
    const xs = rows.map(f).filter((x): x is { score: number; h: boolean } => !!x);
    return { mean: xs.reduce((a, b) => a + b.score, 0) / xs.length, h: xs.filter((x) => x.h).length, n: xs.length };
  };
  const thinkingShare = rows.filter((r) => route(r) === "thinking").length / rows.length;
  return {
    fast: agg((r) => pick(r, "fast")),
    thinking: agg((r) => pick(r, "thinking")),
    autoAsRun: agg((r) => pick(r, "auto")),
    rule: agg((r) => pick(r, route(r))),
    best: agg((r) => [pick(r, "fast"), pick(r, "thinking")].filter(Boolean).sort((a, b) => b!.score - a!.score || +a!.h - +b!.h)[0]),
    thinkingShare,
  };
}

if (process.argv[1]?.endsWith("routing-sim.ts")) {
  const rows = [
    ...load("blind-51", "evaluation/blind-benchmark", "evaluation/blind-benchmark/scoring-sheet.csv", ".local/blind-benchmark/key.json", ".local/blind-benchmark/ours"),
    ...load("fresh-27", "evaluation/benchmark-fresh-20261112", "evaluation/benchmark-fresh-20261112/grader-sheet.csv", ".local/benchmark-fresh-20261112/grader-key.json", ".local/benchmark-fresh-20261112/ours"),
    // Run 1 of the fresh set (graded before the run-2 fixes): a second sample of the same prompts.
    ...load("fresh-27-run1", "evaluation/benchmark-fresh-20261112", ".local/benchmark-fresh-20261112/run1-sheets/grader-sheet.csv", ".local/benchmark-fresh-20261112/run1-sheets/grader-key.json", ".local/benchmark-fresh-20261112/ours-run1"),
  ].filter((r) => r.scores.fast && r.scores.thinking);
  const route = (r: Row) => autoMode(conversationOf(r.prompt, r.docs, r.web));
  const fmt = (x: { mean: number; h: number; n: number }) => `${x.mean.toFixed(2)} (hallucinations ${x.h}, n ${x.n})`;
  const all = simulate(rows, route);
  console.log(`all ${rows.length}: fast ${fmt(all.fast)} | thinking ${fmt(all.thinking)} | auto as run ${fmt(all.autoAsRun)} | rule ${fmt(all.rule)} | best ${fmt(all.best)} | rule sends ${(all.thinkingShare * 100).toFixed(0)} % to Thinking`);
  for (const level of [...new Set(rows.map((r) => `${r.set} L${r.level}`))]) {
    const sub = rows.filter((r) => `${r.set} L${r.level}` === level);
    const s = simulate(sub, route);
    console.log(`${level.padEnd(48)} fast ${s.fast.mean.toFixed(2)} thinking ${s.thinking.mean.toFixed(2)} rule ${s.rule.mean.toFixed(2)} (h ${s.rule.h}) thinking ${(s.thinkingShare * 100).toFixed(0)} %`);
  }
  if (process.argv.includes("--list"))
    for (const r of rows) console.log(r.id.padEnd(6), autoDecision(conversationOf(r.prompt, r.docs, r.web)).reason.padEnd(9), route(r).padEnd(8), `F${r.scores.fast.score}${r.scores.fast.h ? "H" : ""} T${r.scores.thinking.score}${r.scores.thinking.h ? "H" : ""}`, r.prompt.slice(0, 70).replace(/\n/g, " "));
}
