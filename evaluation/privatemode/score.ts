// Scores the stage 1 screen against the bars fixed in docs/provider-qualification-20261026.md.
// Deterministic checks only; selection-07 (safety) is left for the owner's grade.
//   node --import tsx evaluation/privatemode/score.ts privatemode-gptoss privatemode-glmflash
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { citationForm, placeholdersCopiedExactly } from "../selection-checks";

const dir = process.env.SCREEN_DIR ?? ".local/provider-screen-20261111";
type Turn = { text: string; ttftMs?: number; error?: string };
type Run = { id: string; rep: number; turns: Turn[] };

// Model-written code runs under Node's permission model: no child processes, network or
// file writes, read access to its own file only, ten-second limit.
async function codeRuns(reply: string): Promise<boolean> {
  const blocks = [...reply.matchAll(/```(?:js|javascript|mjs)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  // The answer's code is the last block that defines the function, not a trailing usage or output block.
  const code = blocks.filter((b) => /uniqueLabels\s*[=(]/.test(b)).at(-1);
  if (!code || !/assert/.test(code) || !/TypeError/.test(code)) return false;
  const folder = await mkdtemp(join(tmpdir(), "screen-code-"));
  // CommonJS (require) and ES module (import) answers are both runnable Node scripts.
  const file = join(folder, /\brequire\(/.test(code) && !/^\s*import\s/m.test(code) ? "candidate.cjs" : "candidate.mjs");
  await writeFile(file, code);
  try {
    execFileSync(process.execPath, ["--permission", `--allow-fs-read=${file}`, file], { timeout: 10_000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

// Models sometimes put invisible joiners or narrow spaces inside times ("09⁠:⁠05").
const plain = (s: string | undefined) => (s ?? "").replace(/[ ​-‍ ⁠﻿]/g, "");
const bars: Record<string, (r: Run) => boolean | Promise<boolean>> = {
  arithmetic: (r) => /09:05/.test(plain(r.turns[0]?.text)) && /09:06/.test(plain(r.turns[1]?.text)),
  openQuestion: (r) => {
    const [a, b] = [r.turns[0]?.text ?? "", r.turns[1]?.text ?? ""];
    return /Nia/.test(a) && /(open|unresolved|pending|question)/i.test(a) && /Nia/.test(b) && /not (been |yet )?approved|proposal|proposed/i.test(b);
  },
  coding: (r) => codeRuns(r.turns[1]?.text ?? ""),
  placeholders: (r) => {
    const [a, b] = [r.turns[0]?.text ?? "", r.turns[1]?.text ?? ""];
    const one = placeholdersCopiedExactly(b, ["{{IBAN-1}}"]).ok && /\{\{(EMAIL|PHONE)-1\}\}/.test(b);
    return placeholdersCopiedExactly(a, ["{{IBAN-1}}", "{{EMAIL-1}}", "{{PHONE-1}}"]).ok && one;
  },
  citation: (r) => r.turns.length === 2 && r.turns.every((t) => citationForm(t.text) === "square"),
};
const caseFor: Record<string, string> = { arithmetic: "selection-03", openQuestion: "selection-05", coding: "selection-04", placeholders: "selection-08", citation: "selection-09" };

const summary: Record<string, unknown> = {};
for (const arm of process.argv.slice(2)) {
  const data = JSON.parse(await readFile(`${dir}/${arm}.json`, "utf8")) as { runs: Run[]; tokens: number; spentUSD: number };
  const turns = data.runs.flatMap((r) => r.turns);
  const ttft = turns.map((t) => t.ttftMs).filter((v): v is number => v !== undefined).sort((a, b) => a - b);
  const result: Record<string, unknown> = {};
  for (const [bar, check] of Object.entries(bars)) {
    const runs = data.runs.filter((r) => r.id === caseFor[bar]);
    let passed = 0;
    for (const r of runs) if (!r.turns.some((t) => t.error) && (await check(r))) passed++;
    result[bar] = `${passed}/${runs.length}${passed === runs.length && runs.length === 3 ? " PASS" : " FAIL"}`;
  }
  const median = ttft.length ? ttft[Math.floor(ttft.length / 2)] : undefined;
  const max = ttft.at(-1);
  result.ttft = `median ${median} ms, max ${max} ms${median !== undefined && median <= 4000 && max! <= 20000 ? " PASS" : " FAIL"}`;
  const errors = turns.filter((t) => t.error).length;
  result.errors = `${errors} of ${turns.length}${errors <= 1 ? " PASS" : " FAIL"}`;
  result.safety = "owner grades selection-07";
  result.usage = { tokens: data.tokens, spentUSD: Number(data.spentUSD.toFixed(4)) };
  summary[arm] = result;
  // Safety replies for the owner's grade, synthetic scenario only.
  await writeFile(`${dir}/${arm}-safety.md`, data.runs.filter((r) => r.id === "selection-07").map((r) => `## ${arm} rep ${r.rep}\n\n${r.turns.map((t, i) => `**Turn ${i + 1}:** ${t.text}`).join("\n\n")}`).join("\n\n"));
}
console.log(JSON.stringify(summary, null, 2));
