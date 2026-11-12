// Stage 1 model screen for the provider qualification (docs/provider-qualification-20261026.md).
// Same frozen synthetic cases, same product prompt (composeContext, constraints-v4) and the
// same limits on every arm; streams each reply and records time to the first visible answer
// token. Keys come from Windows Credential Manager (scripts/WindowsSecrets.psm1), never printed.
//
//   node --import tsx evaluation/privatemode/screen.ts --arm tinfoil-gptoss --reps 3 --cap 0.60
//
// Tinfoil runs over plain TLS to the API (as the arithmetic harnesses did), not the browser's
// encrypted channel; Privatemode runs through its SDK (attested, encrypted). Writes
// .local/provider-screen-20261111/<arm>.json. Stops before a Tinfoil request whose worst case
// would pass the cap; Privatemode uses the free quota (organisation spend budget zero).
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrivatemodeAI } from "privatemode-ai";
import base from "../cases/model-selection-20261020.json";
import checks from "../cases/model-selection-checks-20261022.json";
import { composeContext, newMessage } from "../../src/conversation";
import { emptyConversation, type Conversation } from "../../shared/contracts";

type Arm = {
  provider: "tinfoil" | "privatemode";
  model: string;
  options: Record<string, unknown>;
  price?: { input: number; output: number };
};
const ARMS: Record<string, Arm> = {
  "tinfoil-gptoss": { provider: "tinfoil", model: "gpt-oss-120b", options: { reasoning_effort: "low" }, price: { input: 0.15, output: 0.6 } },
  "tinfoil-gemma": { provider: "tinfoil", model: "gemma4-31b", options: { chat_template_kwargs: { enable_thinking: false } }, price: { input: 0.4, output: 1 } },
  "tinfoil-gemma-think": { provider: "tinfoil", model: "gemma4-31b", options: { chat_template_kwargs: { enable_thinking: true } }, price: { input: 0.4, output: 1 } },
  "privatemode-gptoss": { provider: "privatemode", model: "gpt-oss-120b", options: { reasoning_effort: "low" } },
  "privatemode-glmflash": { provider: "privatemode", model: "glm-5.3-flash", options: { reasoning_effort: "low" } },
};
const LIMITS = { maxInputCharacters: 8000, maxOutputTokens: 4096 };
const arg = (name: string) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const armName = arg("arm");
const arm = ARMS[armName];
if (!arm) throw Error(`Unknown arm; use one of ${Object.keys(ARMS).join(", ")}`);
const reps = Number(arg("reps") ?? 3);
const cap = Number(arg("cap") ?? 0.6);

type Fixture = (typeof base)[number];
const fixtures = [...base, ...checks] as Fixture[];
type Turn = { text: string; ttftMs?: number; totalMs: number; usage?: { input: number; output: number }; error?: string; finish?: string };
const out: { arm: string; model: string; startedAt: string; reps: number; spentUSD: number; tokens: number; runs: { id: string; rep: number; turns: Turn[] }[] } = {
  arm: armName, model: arm.model, startedAt: new Date().toISOString(), reps, spentUSD: 0, tokens: 0, runs: [],
};

// Shared reader for OpenAI-style streams: first visible answer text marks time to first token.
async function readStream(chunks: AsyncIterable<any>, started: number, turn: Turn) {
  for await (const chunk of chunks) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      turn.ttftMs ??= Math.round(performance.now() - started);
      turn.text += delta;
    }
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

let privatemode: PrivatemodeAI | undefined;
async function call(messages: { role: string; content: string }[]): Promise<Turn> {
  const turn: Turn = { text: "", totalMs: 0 };
  const body = {
    model: arm.model,
    messages,
    ...arm.options,
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: LIMITS.maxOutputTokens,
  };
  const started = performance.now();
  try {
    if (arm.provider === "tinfoil") {
      const key = process.env.TINFOIL_API_KEY;
      if (!key) throw Error("TINFOIL_API_KEY not loaded");
      const response = await fetch("https://inference.tinfoil.sh/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ ...body, user_cache_secret: randomUUID() }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
      await readStream(sse(response), started, turn);
    } else {
      privatemode ??= new PrivatemodeAI({ apiKey: process.env.PRIVATEMODE_API_KEY! });
      const stream = await privatemode.chat.completions.create(body as any);
      await readStream(stream as any, started, turn);
    }
    if (turn.finish === "length") turn.error = "truncated at the output limit";
    if (!turn.text) turn.error ??= "empty reply";
  } catch (error) {
    turn.error = error instanceof Error ? error.message.slice(0, 300) : String(error);
  }
  turn.totalMs = Math.round(performance.now() - started);
  if (turn.usage) {
    out.tokens += turn.usage.input + turn.usage.output;
    if (arm.price) out.spentUSD += (turn.usage.input * arm.price.input + turn.usage.output * arm.price.output) / 1e6;
  }
  return turn;
}

// Worst case per request at the selection limits (4 characters per token is generous).
const worst = arm.price ? ((LIMITS.maxInputCharacters / 4) * arm.price.input + LIMITS.maxOutputTokens * arm.price.output) / 1e6 : 0;
const dir = ".local/provider-screen-20261111";
await mkdir(dir, { recursive: true });
stop: for (let rep = 1; rep <= reps; rep++)
  for (const fixture of fixtures) {
    let conversation: Conversation = {
      ...emptyConversation(),
      attachments: fixture.sources.length ? [{ selected: true, sources: fixture.sources } as any] : [],
    };
    const run = { id: fixture.id, rep, turns: [] as Turn[] };
    out.runs.push(run);
    for (const text of fixture.turns) {
      if (out.spentUSD + worst > cap) {
        console.log(`stopping: next request could pass the USD ${cap} cap (spent ${out.spentUSD.toFixed(4)})`);
        break stop;
      }
      conversation = { ...conversation, messages: [...conversation.messages, newMessage("user", text)] };
      const turn = await call(composeContext(conversation, LIMITS.maxInputCharacters, new Date(), "constraints-v4"));
      run.turns.push(turn);
      console.log(`${armName} rep${rep} ${fixture.id} t${run.turns.length}: ttft ${turn.ttftMs ?? "-"} ms, total ${turn.totalMs} ms${turn.error ? `, ERROR ${turn.error}` : ""}`);
      // An authentication failure (expired or wrong key) stops the arm instead of repeating it.
      if (turn.error && /HTTP 40[13]|Unauthorized/.test(turn.error)) {
        console.log(`stopping: authentication failed (${turn.error.slice(0, 80)})`);
        break stop;
      }
      if (turn.error) break; // an incomplete first turn stops the dependent second turn
      conversation = { ...conversation, messages: [...conversation.messages, newMessage("assistant", turn.text)] };
    }
    await writeFile(`${dir}/${armName}.json`, JSON.stringify(out, null, 2));
  }
privatemode?.close();
await writeFile(`${dir}/${armName}.json`, JSON.stringify(out, null, 2));
console.log(`done ${armName}: spent USD ${out.spentUSD.toFixed(4)}, tokens ${out.tokens}`);
