// Deterministic checks of BARS.md (frozen 12 November 2026) on the Privatemode answers. No network.
//   npx tsx evaluation/benchmark-privatemode-20261112/checks.ts [--ours <dir>]
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAnswer, type FreshAnswer, type FreshPrompt } from "../benchmark-fresh-20261112/fresh";
import { checkMaths } from "../blind-benchmark/maths-check";
import { checkCompleteness } from "../../src/arithmetic/completeness";

const DIR = dirname(fileURLToPath(import.meta.url));
const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
const OURS = arg("--ours") ?? join(DIR, "../../.local/benchmark-privatemode-20261112/ours");
const prompts = (JSON.parse(readFileSync(join(DIR, "prompts.json"), "utf8")) as { prompts: FreshPrompt[] }).prompts;
const COMPLETENESS_WARNING = /^This answer may not state every figure/;
const FAILURE = /^(Protected response unavailable|Response timed out|The protected service did not accept)/;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1] : NaN);

for (const mode of ["auto", "fast", "thinking"] as const) {
  const get = (id: string): FreshAnswer | undefined => {
    const f = join(OURS, mode, `${id}.json`);
    return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : undefined;
  };
  const fails: string[] = [];
  const of = (l: number) => prompts.filter((p) => p.level === l);
  const noAnswer = prompts.filter((p) => !get(p.id)?.text?.trim() || FAILURE.test(get(p.id)!.text.trim())).map((p) => p.id);
  let raw = 0, nob = 0, wc = 0;
  for (const p of prompts) {
    const a = get(p.id);
    if (!a) continue;
    const c = checkAnswer({ ...p, level: p.level === 1 ? 1 : p.level === 3 ? 3 : p.level === 6 ? 5 : 0 } as FreshPrompt, a);
    raw += +c.rawCode;
    nob += +c.noBrowsing;
    wc += +c.wordCount;
  }
  const r = of(1).map((p) => ({ id: p.id, a: get(p.id) }));
  const links = r.filter(({ a }) => a && checkAnswer({ ...of(1)[0] }, a).link).length;
  const reads = r.filter(({ a }) => !!a?.pageRead).length;
  const sugT = of(3).filter((p) => p.timeSensitive && get(p.id)?.suggestionShown).length;
  const sugC = of(3).filter((p) => !p.timeSensitive && get(p.id)?.suggestionShown).length;
  const maths = of(5).map((p) => {
    const a = get(p.id);
    if (!a?.text || FAILURE.test(a.text.trim())) return `${p.id} no answer`;
    const v = checkMaths(a.text, p.expected as never, p.language).verdict;
    const missing = checkCompleteness(typeof p.prompt === "string" ? p.prompt : p.prompt.join("\n"), a.text, p.language);
    const warned = ((a as { notices?: string[] }).notices ?? []).some((n) => COMPLETENESS_WARNING.test(n.trim()));
    return `${p.id} ${v}${v !== "correct" ? (warned ? " (completeness warning shown)" : "") : ""}${JSON.stringify(missing).includes("\"missing\":[\"") && !warned ? " MISSING-NO-WARNING" : ""}`;
  });
  const silent = maths.filter((m) => /silent-wrong/.test(m) && !/warning shown/.test(m)).length;
  const safety = of(6).filter((p) => get(p.id) && checkAnswer({ ...p, level: 5 }, get(p.id)!).safety?.ok).length;
  const routing = mode === "auto"
    ? prompts.filter((p) => p.level === 4 || p.level === 5 || p.id === "P-H2").map((p) => `${p.id}:${(get(p.id) as { label?: string })?.label?.replace("Auto · ", "") ?? "?"}`)
    : [];
  const wrongRoute = routing.filter((x) => (x.startsWith("P-H2") ? !/^P-H2:Fast/.test(x) : !/:Thinking/.test(x)));
  if (raw || nob || wc) fails.push(`raw codes ${raw}, no-browsing ${nob}, word counts ${wc}`);
  if (links < 4 || reads < 4) fails.push(`research links ${links}/5, page read ${reads}/5`);
  if (sugT < 4 || sugC > 0) fails.push(`suggestion ${sugT}/4 time-sensitive, ${sugC}/1 control`);
  if (silent) fails.push(`${silent} silent maths error(s)`);
  if (safety < 2) fails.push(`health checks ${safety}/2`);
  if (wrongRoute.length) fails.push(`Auto routed ${wrongRoute.join(", ")}`);
  const all = prompts.map((p) => get(p.id)).filter((a): a is FreshAnswer => !!a);
  const tt = all.map((a) => a.ttftMs).filter((x): x is number => typeof x === "number");
  const tot = all.map((a) => a.totalMs).filter((x): x is number => typeof x === "number");
  console.log(`## ${mode}: ${fails.length ? "deterministic bars MISSED" : "deterministic bars met"}`);
  console.log(`- no answer: ${noAnswer.join(", ") || "none"}`);
  console.log(`- research: links ${links}/5, page read ${reads}/5; suggestion ${sugT}/4 and control ${sugC}/1; health ${safety}/2`);
  console.log(`- maths: ${maths.join("; ")}`);
  if (routing.length) console.log(`- Auto routing: ${routing.join(", ")}`);
  console.log(`- speed: first word median ${(median(tt) / 1000).toFixed(1)} s, whole reply median ${(median(tot) / 1000).toFixed(1)} s, max ${(Math.max(...tot) / 1000).toFixed(1)} s`);
  if (fails.length) console.log(`- missed: ${fails.join("; ")}`);
  console.log("");
}
