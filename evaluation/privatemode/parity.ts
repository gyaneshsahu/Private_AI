// Parity matrix (overnight task 1, 12 November): the provider-neutral live checks that so far
// ran on Tinfoil only, run on Privatemode through our relay in a real browser, and on Tinfoil
// over plain TLS, both parsed by the app's own stream code. Synthetic cases only.
//   Privatemode: free quota (organisation spend budget zero). Tinfoil: capped by --cap.
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { Invoke-WithPrivateAiSecret -Name TINFOIL_API_KEY -Action {
//     npx tsx evaluation/privatemode/parity.ts --cap 0.15 } }
// Results: .local/parity-20261112/<arm>.json (screen format, so score.ts can score them).
import { createHash, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:https";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import express from "express";
import { chromium } from "@playwright/test";
import { PrivatemodeAI } from "privatemode-ai";
import { privatemodeRelay } from "./spike-relay";
import { localTLS } from "../../tests/fixtures/local-tls";
import base from "../cases/model-selection-20261020.json";
import checks from "../cases/model-selection-checks-20261022.json";
import { composeContext, newMessage } from "../../src/conversation";
import { emptyConversation, type Conversation } from "../../shared/contracts";
import { completionEvents } from "../../src/completion-events";
import { consumeReply } from "../../src/reply-stream";

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
const cap = Number(arg("cap") ?? 0.15);
const only = arg("arms")?.split(",");
const pmKey = process.env.PRIVATEMODE_API_KEY ?? "";
const tfKey = process.env.TINFOIL_API_KEY ?? "";
if (!pmKey || !tfKey) throw Error("Load PRIVATEMODE_API_KEY and TINFOIL_API_KEY with scripts/WindowsSecrets.psm1");

type Arm = { name: string; provider: "privatemode" | "tinfoil"; model: string; price?: { input: number; output: number } };
const ARMS: Arm[] = [
  { name: "pm-gptoss", provider: "privatemode", model: "gpt-oss-120b" },
  { name: "pm-glmflash", provider: "privatemode", model: "glm-5.3-flash" },
  { name: "tf-gptoss", provider: "tinfoil", model: "gpt-oss-120b", price: { input: 0.15, output: 0.6 } },
].filter((a) => !only || only.includes(a.name)) as Arm[];
const MAX_INPUT = 8000;
const MAX_OUTPUT = 4096;

type Turn = { text: string; ttftMs?: number; totalMs: number; usage?: { input: number; output: number }; error?: string; message?: string };
type Messages = { role: string; content: string }[];

// ---- Privatemode: relay + browser, as in tests/privatemode-browser.test.ts ----
let server: Server | undefined;
let tls: Awaited<ReturnType<typeof localTLS>> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>> | undefined;
let manifestDigest = "";
async function startPrivatemode() {
  const probe = new PrivatemodeAI({ apiKey: pmKey, enableWasmLogging: false });
  await probe.verify();
  const manifest = probe.manifestBytes!;
  probe.close();
  manifestDigest = createHash("sha256").update(manifest).digest("hex");
  const bundle = await build({
    entryPoints: ["tests/fixtures/parity-page.ts"],
    bundle: true, format: "esm", platform: "browser", external: ["node:*"], write: false, logLevel: "silent",
  });
  const wasm = await readFile("node_modules/privatemode-ai/dist/privatemode.wasm");
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'");
    next();
  });
  app.get("/", (_req, res) => res.type("html").send('<!doctype html><script type="module" src="/page.js"></script>'));
  app.get("/page.js", (_req, res) => res.type("js").send(bundle.outputFiles[0].text));
  app.use(privatemodeRelay({ apiKey: pmKey, allowedModels: ["gpt-oss-120b", "glm-5.3-flash"], manifest: () => manifest, wasm: () => wasm }));
  tls = await localTLS();
  server = createServer({ key: tls.key, cert: tls.cert }, app);
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  page = await context.newPage();
  await page.goto(`https://localhost:${(server.address() as { port: number }).port}`);
  await page.waitForFunction(() => typeof (window as any).runTurn === "function");
}
async function privatemodeTurn(model: string, messages: Messages, maxTokens: number, abortAfterChars?: number): Promise<Turn> {
  const out = (await page!.evaluate(
    (input) => (window as any).runTurn(input),
    { releaseDigests: [manifestDigest], model, effort: "low", messages, maxTokens, abortAfterChars },
  )) as Turn & { usage?: { input: number; output: number } };
  return out;
}

// ---- Tinfoil: plain TLS, same parser ----
async function tinfoilTurn(model: string, messages: Messages, maxTokens: number, abortAfterChars?: number): Promise<Turn> {
  const controller = new AbortController();
  const started = performance.now();
  const turn: Turn = { text: "", totalMs: 0 };
  try {
    const response = await fetch("https://inference.tinfoil.sh/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${tfKey}`, "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify({
        model, messages, max_completion_tokens: maxTokens, reasoning_effort: "low",
        stream: true, stream_options: { include_usage: true }, user_cache_secret: randomUUID(),
      }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]),
    });
    const usage = await consumeReply(completionEvents(response, controller.signal), { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" }, controller.signal, (chunk) => {
      turn.ttftMs ??= Math.round(performance.now() - started);
      turn.text += chunk;
      if (abortAfterChars && turn.text.length >= abortAfterChars) controller.abort();
    });
    if (usage) turn.usage = { input: usage.input, output: usage.output };
  } catch (error) {
    const e = error as Error & { code?: string };
    turn.error = e.code ?? e.name;
    turn.message = String(e.message).slice(0, 200);
  }
  turn.totalMs = Math.round(performance.now() - started);
  return turn;
}

// ---- cases ----
type Fixture = (typeof base)[number];
const fixtures = [...base, ...checks] as Fixture[];
// Long conversation: a fact stated in the first user turn, recalled after 22 more turns (fits in 8000 characters).
const longTurns: Messages = [{ role: "user", content: "Synthetic note for later: the bike storage code is 4417 and the spare key is with Dana." }, { role: "assistant", content: "Noted: bike storage code 4417, spare key with Dana." }];
for (let i = 1; i <= 11; i++)
  longTurns.push(
    { role: "user", content: `Synthetic planning step ${i}: list one small errand for day ${i} of a quiet week, in one sentence.` },
    { role: "assistant", content: `Day ${i}: pick up a parcel, water the plants, and reply to one message before noon; nothing else is planned for that day.` },
  );
longTurns.push({ role: "user", content: "What was the bike storage code, and who has the spare key? Answer in one sentence." });

const results: Record<string, unknown> = {};
const dir = ".local/parity-20261112";
await mkdir(dir, { recursive: true });
let tinfoilUSD = 0;
const tfWorst = ((MAX_INPUT / 4) * 0.15 + MAX_OUTPUT * 0.6) / 1e6;
try {
  if (ARMS.some((a) => a.provider === "privatemode")) await startPrivatemode();
  for (const arm of ARMS) {
    const call = (messages: Messages, maxTokens = MAX_OUTPUT, abortAfterChars?: number) => {
      if (arm.provider === "tinfoil") {
        if (tinfoilUSD + tfWorst > cap) throw Error(`cap USD ${cap} would be passed`);
        return tinfoilTurn(arm.model, messages, maxTokens, abortAfterChars).then((t) => {
          if (t.usage) tinfoilUSD += (t.usage.input * 0.15 + t.usage.output * 0.6) / 1e6;
          else tinfoilUSD += tfWorst; // unknown usage counts at the worst case
          return t;
        });
      }
      return privatemodeTurn(arm.model, messages, maxTokens, abortAfterChars);
    };
    const out = { arm: arm.name, model: arm.model, provider: arm.provider, startedAt: new Date().toISOString(), reps: 1, runs: [] as { id: string; rep: number; turns: Turn[] }[], extra: {} as Record<string, unknown> };
    for (const fixture of fixtures) {
      let conversation: Conversation = { ...emptyConversation(), attachments: fixture.sources.length ? [{ selected: true, sources: fixture.sources } as any] : [] };
      const run = { id: fixture.id, rep: 1, turns: [] as Turn[] };
      out.runs.push(run);
      for (const text of fixture.turns) {
        conversation = { ...conversation, messages: [...conversation.messages, newMessage("user", text)] };
        const turn = await call(composeContext(conversation, MAX_INPUT, new Date(), "constraints-v4"));
        run.turns.push(turn);
        console.log(`${arm.name} ${fixture.id} t${run.turns.length}: ttft ${turn.ttftMs ?? "-"} ms, total ${turn.totalMs} ms${turn.error ? `, ERROR ${turn.error} ${turn.message}` : ""}`);
        if (turn.error) break;
        conversation = { ...conversation, messages: [...conversation.messages, newMessage("assistant", turn.text)] };
      }
    }
    // Stop mid-reply, then the next request must work.
    const story = [{ role: "user", content: "Synthetic test. Write a 300-word story about a lighthouse keeper." }];
    const stopped = await call(story, MAX_OUTPUT, 200);
    const after = await call([{ role: "user", content: "Synthetic test. Reply with exactly the word: again" }], 256);
    out.extra.stop = { error: stopped.error, charsBeforeStop: stopped.text.length, nextOk: !after.error && /again/i.test(after.text) };
    // Cut-off reply at a tiny output limit.
    const cut = await call([{ role: "user", content: "Synthetic test. List the numbers from 1 to 200 separated by commas." }], 16);
    out.extra.cutoff = { error: cut.error, message: cut.message, chars: cut.text.length };
    // Long conversation recall.
    const long = await call(longTurns, 512);
    out.extra.longConversation = {
      inputCharacters: longTurns.reduce((n, m) => n + m.content.length, 0),
      recalled: /4417/.test(long.text) && /Dana/.test(long.text),
      error: long.error,
      ttftMs: long.ttftMs,
    };
    console.log(`${arm.name} extra ${JSON.stringify(out.extra)}`);
    await writeFile(`${dir}/${arm.name}.json`, JSON.stringify(out, null, 2));
    results[arm.name] = out.extra;
  }
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server!.close(r));
  await tls?.dispose();
}
console.log(`done. Tinfoil spend about USD ${tinfoilUSD.toFixed(4)} (unknown usage counted at the worst case); Privatemode on the free quota.`);
