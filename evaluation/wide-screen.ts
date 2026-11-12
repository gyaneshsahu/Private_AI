// Wide model screen (12 Nov 2026): every chat model at Tinfoil and Privatemode, in its sensible
// settings, on the frozen nine stage-1 cases (3 repetitions), plus one long-answer probe per arm.
// Request and score logic are copied from evaluation/privatemode/screen.ts and score.ts on the
// privatemode-eval branch, unchanged, so results compare with the 11 November screen.
// Keys come from Windows Credential Manager (scripts/WindowsSecrets.psm1), never printed.
//
//   node --import tsx evaluation/wide-screen.ts run --provider tinfoil [--reps 3] [--cap 2]
//   node --import tsx evaluation/wide-screen.ts run --arms tinfoil-llama,tinfoil-kimi-k3
//   node --import tsx evaluation/wide-screen.ts score
//
// Arms in one call run concurrently (one arm per model setting, each arm sequential).
// Privatemode runs through its SDK (attested, encrypted), loaded from the privatemode-parity
// worktree, which has privatemode-ai installed. Writes .local/wide-screen-20261112/<arm>.json
// and, on score, <arm>-safety.md there and evaluation/results/wide-screen-20261112.json.
import { mkdir, readFile, readdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import base from "./cases/model-selection-20261020.json";
import checks from "./cases/model-selection-checks-20261022.json";
import catalog from "./results/model-catalog-20261112.json";
import { citationForm, placeholdersCopiedExactly } from "./selection-checks";
import { composeContext, newMessage } from "../src/conversation";
import { emptyConversation, type Conversation } from "../shared/contracts";

const PRIVATEMODE_SDK = process.env.PRIVATEMODE_SDK ?? "C:/Gyanesh/Startups/Private_AI-pm/node_modules/privatemode-ai/dist/index.js";
// WIDE_SCREEN_DIR keeps a later rerun (e.g. the 12 Nov Fast-tier screen) from overwriting the first screen's files.
const dir = process.env.WIDE_SCREEN_DIR ?? ".local/wide-screen-20261112";
const scoresFile = process.env.WIDE_SCREEN_DIR ? `${dir}/scores.json` : "evaluation/results/wide-screen-20261112.json";

type Arm = { provider: "tinfoil" | "privatemode"; model: string; options: Record<string, unknown> };
const T = (model: string, options: Record<string, unknown> = {}): Arm => ({ provider: "tinfoil", model, options });
const P = (model: string, effort: string): Arm => ({ provider: "privatemode", model, options: { reasoning_effort: effort } });
// Settings are the ones src/providers/tinfoil-client.ts modelOptions sends; kimi has no switch.
const ARMS: Record<string, Arm> = {
  "tinfoil-gptoss-low": T("gpt-oss-120b", { reasoning_effort: "low" }),
  "tinfoil-gptoss-high": T("gpt-oss-120b", { reasoning_effort: "high" }),
  "tinfoil-gemma-off": T("gemma4-31b", { chat_template_kwargs: { enable_thinking: false } }),
  "tinfoil-gemma-on": T("gemma4-31b", { chat_template_kwargs: { enable_thinking: true } }),
  "tinfoil-glm-low": T("glm-5-3", { chat_template_kwargs: { reasoning_effort: "low" } }),
  "tinfoil-glm-high": T("glm-5-3", { chat_template_kwargs: { reasoning_effort: "high" } }),
  "tinfoil-glm-max": T("glm-5-3", { chat_template_kwargs: { reasoning_effort: "max" } }),
  "tinfoil-deepseek-off": T("deepseek-v4-1-flash", { chat_template_kwargs: { thinking: false } }),
  "tinfoil-deepseek-low": T("deepseek-v4-1-flash", { chat_template_kwargs: { thinking: true, reasoning_effort: "low" } }),
  "tinfoil-kimi-k3": T("kimi-k3"),
  "tinfoil-kimi-k3-1-pro": T("kimi-k3-1-pro"),
  "tinfoil-llama": T("llama3-3-70b"),
  // Privatemode GLM reasoning cannot be switched off (low is the minimum); glm-5.2 routes to glm-5.3.
  "privatemode-gptoss-low": P("gpt-oss-120b", "low"),
  "privatemode-gptoss-high": P("gpt-oss-120b", "high"),
  "privatemode-glmflash-low": P("glm-5.3-flash", "low"),
  "privatemode-glmflash-high": P("glm-5.3-flash", "high"),
  "privatemode-glmflash-max": P("glm-5.3-flash", "max"),
  "privatemode-glm-low": P("glm-5.3", "low"),
  "privatemode-glm-high": P("glm-5.3", "high"),
  "privatemode-glm-max": P("glm-5.3", "max"),
};
// Price per 1M tokens: Tinfoil USD from the refreshed catalog; Privatemode EUR list price
// (docs/privatemode-master-notes.md section 6), shown for comparison only: the screen ran on the free quota.
const PRIVATEMODE_EUR: Record<string, { input: number; output: number }> = {
  "gpt-oss-120b": { input: 0.2, output: 0.65 },
  "glm-5.3-flash": { input: 0.2, output: 0.65 },
  "glm-5.3": { input: 1.55, output: 5.74 },
};
function price(arm: Arm) {
  if (arm.provider === "privatemode") return PRIVATEMODE_EUR[arm.model];
  const p = (catalog as any).data.find((m: any) => m.id === arm.model)?.pricing;
  if (!p) throw Error(`no catalog price for ${arm.model}`);
  return { input: p.inputTokenPricePer1M, output: p.outputTokenPricePer1M };
}

const LIMITS = { maxInputCharacters: 8000, maxOutputTokens: 4096 };
const PROBE_RETRY_TOKENS = 16384;
// Synthetic long-answer request: about 600 words of visible answer.
const PROBE =
  "Write a 600-word guide for new volunteers at Elm Row Garden, a fictional community garden. Cover how the weekly watering rota works, how to log harvests in the shared notebook, and what to do on a heat-wave day. Use a short heading for each part and plain prose. Invent all details.";

type Turn = {
  text: string; ttftMs?: number; totalMs: number; usage?: { input: number; output: number };
  error?: string; finish?: string; reasoningChars?: number; cost?: number;
};
type Probe = Turn & { maxTokens: number; words: number };
type Result = {
  arm: string; provider: Arm["provider"]; model: string; options: Record<string, unknown>; startedAt: string; reps: number;
  currency: "USD" | "EUR list price"; spent: number; tokens: number; outputTokens: number;
  runs: { id: string; rep: number; turns: Turn[] }[]; probes: Probe[];
};

// Shared reader for OpenAI-style streams: first visible answer text marks time to first token.
async function readStream(chunks: AsyncIterable<any>, started: number, turn: Turn) {
  for await (const chunk of chunks) {
    const delta = chunk.choices?.[0]?.delta;
    if (delta?.content) {
      turn.ttftMs ??= Math.round(performance.now() - started);
      turn.text += delta.content;
    }
    const reasoning = delta?.reasoning ?? delta?.reasoning_content;
    if (reasoning) turn.reasoningChars = (turn.reasoningChars ?? 0) + reasoning.length;
    if (chunk.choices?.[0]?.finish_reason) turn.finish = chunk.choices[0].finish_reason;
    if (chunk.usage) turn.usage = { input: chunk.usage.prompt_tokens ?? 0, output: chunk.usage.completion_tokens ?? 0 };
  }
}

async function* sse(response: Response) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(part, { stream: true });
    let end;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      for (const line of event.split("\n"))
        if (line.startsWith("data: ") && line !== "data: [DONE]") yield JSON.parse(line.slice(6));
    }
  }
}

let privatemode: any;
async function call(arm: Arm, out: Result, messages: { role: string; content: string }[], maxTokens: number): Promise<Turn> {
  const turn: Turn = { text: "", totalMs: 0 };
  const body = {
    model: arm.model, messages, ...arm.options, stream: true,
    stream_options: { include_usage: true }, max_completion_tokens: maxTokens,
  };
  let started = performance.now();
  try {
    if (arm.provider === "tinfoil") {
      const key = process.env.TINFOIL_API_KEY;
      if (!key) throw Error("TINFOIL_API_KEY not loaded");
      let response: Response;
      // A rate-limit refusal (429, per model per key) is not a model failure: wait as told and retry, timing restarts.
      for (let attempt = 1; ; attempt++) {
        response = await fetch("https://inference.tinfoil.sh/v1/chat/completions", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "text/event-stream" },
          body: JSON.stringify({ ...body, user_cache_secret: randomUUID() }),
          signal: AbortSignal.timeout(300_000),
        });
        if (response.status !== 429 || attempt === 6) break;
        const wait = Number((await response.text()).match(/Retry after (\d+)/)?.[1] ?? 5) + 1;
        await new Promise((resolve) => setTimeout(resolve, wait * 1000));
        started = performance.now();
      }
      if (!response.ok) throw Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
      await readStream(sse(response), started, turn);
    } else {
      if (!privatemode) {
        const { PrivatemodeAI } = await import(pathToFileURL(PRIVATEMODE_SDK).href);
        privatemode = new PrivatemodeAI({ apiKey: process.env.PRIVATEMODE_API_KEY! });
      }
      const stream = await privatemode.chat.completions.create(body, { timeout: 300_000 });
      await readStream(stream, started, turn);
    }
    if (turn.finish === "length") turn.error = "truncated at the output limit";
    if (!turn.text) turn.error ??= "empty reply";
  } catch (error) {
    turn.error = error instanceof Error ? error.message.slice(0, 300) : String(error);
  }
  turn.totalMs = Math.round(performance.now() - started);
  if (turn.usage) {
    const p = price(arm);
    turn.cost = (turn.usage.input * p.input + turn.usage.output * p.output) / 1e6;
    out.tokens += turn.usage.input + turn.usage.output;
    out.outputTokens += turn.usage.output;
    out.spent += turn.cost;
  }
  return turn;
}

async function runArm(armName: string, reps: number, cap: number) {
  const arm = ARMS[armName];
  const p = price(arm);
  const out: Result = {
    arm: armName, provider: arm.provider, model: arm.model, options: arm.options, startedAt: new Date().toISOString(), reps,
    currency: arm.provider === "tinfoil" ? "USD" : "EUR list price", spent: 0, tokens: 0, outputTokens: 0, runs: [], probes: [],
  };
  const save = () => writeFile(`${dir}/${armName}.json`, JSON.stringify(out, null, 2));
  // Worst case per request (4 characters per token is generous); only Tinfoil spends money.
  const worst = (tokens: number) => (arm.provider === "tinfoil" ? ((LIMITS.maxInputCharacters / 4) * p.input + tokens * p.output) / 1e6 : 0);
  const fixtures = [...base, ...checks] as (typeof base)[number][];
  let halted = false;
  stop: for (let rep = 1; rep <= reps; rep++)
    for (const fixture of fixtures) {
      let conversation: Conversation = {
        ...emptyConversation(),
        attachments: fixture.sources.length ? [{ selected: true, sources: fixture.sources } as any] : [],
      };
      const run = { id: fixture.id, rep, turns: [] as Turn[] };
      out.runs.push(run);
      for (const text of fixture.turns) {
        if (out.spent + worst(LIMITS.maxOutputTokens) > cap) {
          console.log(`${armName} stopping: next request could pass the cap ${cap} (spent ${out.spent.toFixed(4)})`);
          break stop;
        }
        conversation = { ...conversation, messages: [...conversation.messages, newMessage("user", text)] };
        const turn = await call(arm, out, composeContext(conversation, LIMITS.maxInputCharacters, new Date(), "constraints-v4"), LIMITS.maxOutputTokens);
        run.turns.push(turn);
        console.log(`${armName} rep${rep} ${fixture.id} t${run.turns.length}: ttft ${turn.ttftMs ?? "-"} ms, total ${turn.totalMs} ms${turn.error ? `, ERROR ${turn.error}` : ""}`);
        // An authentication or quota/budget/payment failure stops the arm instead of repeating it.
        if (turn.error && /HTTP 40[123]|Unauthorized|\b402\b|quota|budget|payment/i.test(turn.error)) {
          console.log(`${armName} stopping: refused (${turn.error.slice(0, 300)})`);
          halted = true;
          break stop;
        }
        if (turn.error) break; // an incomplete first turn stops the dependent second turn
        conversation = { ...conversation, messages: [...conversation.messages, newMessage("assistant", turn.text)] };
      }
      await save();
    }
  // Long-answer probe at the screen's output limit; if it is cut off, once more with room to see what it needs.
  for (const maxTokens of [LIMITS.maxOutputTokens, PROBE_RETRY_TOKENS]) {
    if (halted || out.spent + worst(maxTokens) > cap) break;
    const conversation = { ...emptyConversation(), messages: [newMessage("user", PROBE)] } as Conversation;
    const turn = await call(arm, out, composeContext(conversation, LIMITS.maxInputCharacters, new Date(), "constraints-v4"), maxTokens);
    const probe = { ...turn, maxTokens, words: turn.text.split(/\s+/).filter(Boolean).length };
    out.probes.push(probe);
    console.log(`${armName} probe ${maxTokens}: ${probe.finish} ${probe.words} words, ${probe.usage?.output ?? "-"} output tokens${probe.error ? `, ERROR ${probe.error}` : ""}`);
    if (probe.finish !== "length") break;
  }
  await save();
  console.log(`done ${armName}: spent ${out.currency} ${out.spent.toFixed(4)}, tokens ${out.tokens}`);
}

// ---- Scoring: bars and checks unchanged from evaluation/privatemode/score.ts ----

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
type Run = Result["runs"][number];
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

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined;
};

async function score() {
  const arms = (await readdir(dir)).filter((f) => /^[a-z0-9-]+\.json$/.test(f)).map((f) => f.slice(0, -5));
  const summary: Record<string, unknown> = {};
  for (const arm of Object.keys(ARMS).filter((a) => arms.includes(a))) {
    const data = JSON.parse(await readFile(`${dir}/${arm}.json`, "utf8")) as Result;
    const turns = data.runs.flatMap((r) => r.turns);
    const ttft = turns.map((t) => t.ttftMs).filter((v): v is number => v !== undefined).sort((a, b) => a - b);
    const result: Record<string, unknown> = { model: data.model, options: data.options };
    for (const [bar, check] of Object.entries(bars)) {
      const runs = data.runs.filter((r) => r.id === caseFor[bar]);
      let passed = 0;
      for (const r of runs) if (!r.turns.some((t) => t.error) && (await check(r))) passed++;
      result[bar] = `${passed}/${runs.length}${passed === runs.length && runs.length === 3 ? " PASS" : " FAIL"}`;
    }
    const med = median(ttft);
    const max = ttft.at(-1);
    result.ttft = `median ${med} ms, max ${max} ms${med !== undefined && med <= 4000 && max! <= 20000 ? " PASS" : " FAIL"}`;
    const errors = turns.filter((t) => t.error).length;
    result.errors = `${errors} of ${turns.length}${errors <= 1 ? " PASS" : " FAIL"}`;
    result.safety = "owner grades selection-07";
    // Speed, length and cost per reply (screen turns only, not the probe).
    const done = turns.filter((t) => t.usage);
    result.speed = { ttftMedianMs: med, ttftMaxMs: max, totalMedianMs: median(turns.map((t) => t.totalMs)) };
    result.outputTokensPerReply = { median: median(done.map((t) => t.usage!.output)), max: Math.max(...done.map((t) => t.usage!.output)) };
    result.costPerReply = `${data.currency} ${(done.reduce((s, t) => s + (t.cost ?? 0), 0) / done.length).toFixed(5)}`;
    result.longAnswer = data.probes.map((p) => `${p.maxTokens}: ${p.finish ?? "no finish"}, ${p.words} words, ${p.usage?.output ?? "-"} output tokens, ${p.totalMs} ms${p.error ? ` (${p.error})` : ""}`);
    result.usage = { tokens: data.tokens, outputTokens: data.outputTokens, spent: `${data.currency} ${data.spent.toFixed(4)}` };
    summary[arm] = result;
    // Safety replies for the owner's grade, synthetic scenario only.
    await writeFile(`${dir}/${arm}-safety.md`, data.runs.filter((r) => r.id === "selection-07").map((r) => `## ${arm} rep ${r.rep}\n\n${r.turns.map((t, i) => `**Turn ${i + 1}:** ${t.text}`).join("\n\n")}`).join("\n\n"));
  }
  await writeFile(scoresFile, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
}

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
await mkdir(dir, { recursive: true });
if (process.argv[2] === "score") await score();
else if (process.argv[2] === "run") {
  const provider = arg("provider");
  const names = arg("arms")?.split(",") ?? Object.keys(ARMS).filter((a) => ARMS[a].provider === provider);
  const unknown = names.filter((a) => !ARMS[a]);
  if (!names.length || unknown.length) throw Error(`Unknown arm ${unknown.join(", ")}; use --provider tinfoil|privatemode or --arms of ${Object.keys(ARMS).join(", ")}`);
  await Promise.all(names.map((a) => runArm(a, Number(arg("reps") ?? 3), Number(arg("cap") ?? 2))));
  privatemode?.close();
} else throw Error("usage: wide-screen.ts run|score");
