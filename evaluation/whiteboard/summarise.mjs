// Sums results.jsonl per arm: calls, failures, empty answers, tokens, euros, latency.
// Scores are by hand (scores.json); this only adds them up.
//   node evaluation/whiteboard/summarise.mjs
import { readFileSync, writeFileSync } from "node:fs";
const rows = readFileSync(new URL("./results.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const scores = JSON.parse(readFileSync(new URL("./scores.json", import.meta.url), "utf8"));
const last = new Map(rows.filter((r) => !r.failed).map((r) => [`${r.id}/${r.arm}`, r]));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const out = { allCalls: rows.length, failedCalls: rows.filter((r) => r.failed).length, totalEuros: rows.reduce((s, r) => s + (r.euros ?? 0), 0), arms: {} };
for (const set of ["main", "stress"]) for (const arm of ["a", "b", "c", "a1000", "j1000"]) {
  const rs = [...last.values()].filter((r) => r.arm === arm && (set === "stress") === r.id.startsWith("s"));
  if (!rs.length) continue;
  const sc = rs.map((r) => scores[`${r.id}/${r.arm}`]?.score ?? "unscored");
  out.arms[`${set}/${arm}`] = {
    n: rs.length,
    correct: sc.filter((s) => s === "correct").length, partly: sc.filter((s) => s === "partly").length, wrong: sc.filter((s) => s === "wrong").length, unscored: sc.filter((s) => s === "unscored").length,
    empty: rs.filter((r) => !r.content?.trim() || r.finish === "length").length,
    medianImageTokens: median(rs.map((r) => r.usage.prompt_tokens_details?.multimodal_tokens?.image ?? 0)),
    medianPromptTokens: median(rs.map((r) => r.usage.prompt_tokens)),
    medianCompletionTokens: median(rs.map((r) => r.usage.completion_tokens)),
    maxCompletionTokens: Math.max(...rs.map((r) => r.usage.completion_tokens)),
    medianReasoningTokens: median(rs.map((r) => r.usage.completion_tokens_details?.reasoning_tokens ?? 0)),
    meanEuros: rs.reduce((s, r) => s + r.euros, 0) / rs.length,
    maxEuros: Math.max(...rs.map((r) => r.euros)),
    medianMs: median(rs.map((r) => r.ms)), maxMs: Math.max(...rs.map((r) => r.ms)), minMs: Math.min(...rs.map((r) => r.ms)),
  };
}
writeFileSync(new URL("./summary.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
