// Live harness for Design B (arithmetic v3, 23 October 2026): two calls per
// turn with no shared output. Call 1 is the Design A program extraction
// (shown figures); call 2 is the independent chain-formula extraction (the
// cross-check); each gets one feedback retry (--retry 1). Both are evaluated
// by src/arithmetic; the answer is rendered by renderDesignB with the
// deterministic method checks. Pacing 1500 ms, one 429 retry, a cap check
// before every conversation, one line per batch appended to the SAME cost
// log as the earlier runs (set v3-<cases>). Dev sets only until the owner
// approves THRESHOLD-v3.md; the frozen sets are refused here.
//
//   node --import tsx evaluation/arithmetic-gate/harness-v3.ts \
//     --cases dev-v3|dev --cell gptoss --label gptoss-dev-b-1 --cap 0.10 [--retry 1] [--ids ...] [--reps 1]
//
// Writes .local\arithmetic-v3-20261023\<label>\results.json.
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import devV2 from "./dev-v2-20261023.json";
import devV3 from "./dev-v3-20261023.json";
import unseenV3 from "./unseen-v3-20261023.json";
import { checkLiveCatalog, gateModels, referencePrices, type Cell, type Price } from "./prepare-run";
import { scoreConversation, type GateCase } from "./scorer";
import { DesignAError, designAInstruction, designASchema, designAUserMessage, extractDesignA, type DesignAExtraction } from "../../src/arithmetic/design-a";
import { designBInstruction, designBSchema, designBUserMessage, extractDesignB, renderDesignB, type DesignBExtraction, type DesignBOutcome, type FlagClass } from "../../src/arithmetic/design-b";
import { annotateTurn, conversationSpans, type Span } from "../../src/arithmetic/spans";
import { createTinfoilClientAdapter } from "../../src/providers/tinfoil-client";

export const ROOT = ".local/arithmetic-v3-20261023";
export const COST_LOG = ".local/arithmetic-gate-20261022/cost-log.jsonl";
const PACE_MS = 1500;
const RATE_LIMIT_PAUSE_MS = 30000;
const ORIGIN = "https://inference.tinfoil.sh";
const maxOutputTokens = (cell: Cell) => (cell === "kimi" ? 4096 : 2048);
const MAX_PROMPT_TOKENS = 4000;

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw Error(`--${name} is required`);
}

export type AttemptRecord = {
  call: "A" | "B";
  raw: string;
  usage?: { input: number; output: number };
  elapsedMs: number;
  rateLimited?: number;
  transportFailure?: string;
  failure?: { code: string; detail: string };
};
export type TurnRecord = {
  turn: number;
  attempts: AttemptRecord[];
  answer: string;
  flags: string[];
  flagClasses: FlagClass[];
  methodRules: string[];
  results?: DesignBOutcome["results"];
  programA?: DesignBOutcome["programA"];
  programB?: DesignBOutcome["programB"];
  spans: string[];
};
export type OutcomeV3 = "exact-unflagged" | "exact-flagged" | "wrong-flagged" | "wrong-silent" | "no-answer";
export type ConversationRecordV3 = {
  caseId: string;
  repetition: number;
  turns: TurnRecord[];
  score: ReturnType<typeof scoreConversation>;
  outcome: OutcomeV3;
};

type Message = { role: "system" | "user" | "assistant"; content: string };

async function request(body: unknown, key: string, signal: AbortSignal): Promise<Response> {
  return fetch(`${ORIGIN}/v1/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

async function callModel(call: "A" | "B", messages: Message[], schema: unknown, cell: Cell, key: string): Promise<AttemptRecord> {
  const spec = gateModels[cell];
  const adapter = createTinfoilClientAdapter();
  const policy = { provider: "tinfoil" as const, origin: ORIGIN, repository: "tinfoilsh/confidential-model-router", releaseDigests: [], model: spec.model, ...spec.config };
  const body = {
    model: spec.model,
    messages,
    response_format: { type: "json_schema", json_schema: { name: call === "A" ? "arithmetic_program_v2" : "arithmetic_chains_v3", strict: true, schema } },
    ...adapter.modelOptions(policy),
    stream: false,
    max_completion_tokens: maxOutputTokens(cell),
    user_cache_secret: randomUUID(),
  };
  const record: AttemptRecord = { call, raw: "", elapsedMs: 0 };
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    await new Promise((r) => setTimeout(r, PACE_MS));
    let response = await request(body, key, controller.signal);
    if (response.status === 429) {
      record.rateLimited = 1;
      await response.body?.cancel();
      await new Promise((r) => setTimeout(r, RATE_LIMIT_PAUSE_MS));
      response = await request(body, key, controller.signal);
    }
    const text = await response.text();
    if (!response.ok) {
      record.transportFailure = `HTTP ${response.status}: ${text.slice(0, 300)}`;
      return record;
    }
    const json = JSON.parse(text) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    record.raw = json.choices?.[0]?.message?.content ?? "";
    if (json.usage) record.usage = { input: json.usage.prompt_tokens ?? 0, output: json.usage.completion_tokens ?? 0 };
    if (json.choices?.[0]?.finish_reason === "length") record.transportFailure = "output truncated at the token limit";
  } catch (error) {
    record.transportFailure = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timer);
    record.elapsedMs = Date.now() - started;
  }
  return record;
}

/** One call with up to `retries` feedback retries; returns the extraction or undefined, recording every attempt. */
async function extractWithRetry<T>(
  call: "A" | "B",
  messages: Message[],
  schema: unknown,
  cell: Cell,
  key: string,
  retries: number,
  extract: (raw: string) => T,
  attempts: AttemptRecord[],
): Promise<T | undefined> {
  const thread = [...messages];
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await callModel(call, thread, schema, cell, key);
    attempts.push(result);
    if (result.transportFailure === "output truncated at the token limit") {
      result.failure = { code: "TRUNCATED", detail: "the reply ran past the output limit" };
      delete result.transportFailure;
      thread.push({ role: "assistant", content: result.raw.slice(0, 2000) }, { role: "user", content: "That reply was cut off before it was complete. Return the JSON again, short and complete, with nothing but the fields of the schema." });
      continue;
    }
    if (result.transportFailure) return undefined;
    try {
      return extract(result.raw);
    } catch (error) {
      if (!(error instanceof DesignAError)) throw error;
      result.failure = { code: error.code, detail: error.detail };
      thread.push(
        { role: "assistant", content: result.raw },
        {
          role: "user",
          content:
            error.code === "CANNOT_ANSWER"
              ? "You reported that the question cannot be answered. Every span listed, including those from earlier messages, may be used, and a follow-up is answered from those spans alone. If it can be computed, return it with limitation none; otherwise reply cannot_answer again."
              : `That reply was rejected: ${error.code}: ${error.detail}. Return a corrected JSON reply for the same question, using only the span ids and constants listed.`,
        },
      );
    }
  }
  return undefined;
}

function spanLines(spans: Span[]): string {
  // The same span table call 1 sees, built from the Design A user message.
  const message = designAUserMessage("", 1, spans);
  const from = message.indexOf("Spans available");
  const block = message.slice(from).split("\n\n")[0];
  return block.split("\n").slice(1).join("\n");
}

export async function runConversation(gateCase: GateCase, cell: Cell, repetition: number, key: string, retries: number): Promise<ConversationRecordV3> {
  const turns: TurnRecord[] = [];
  const historyA: Message[] = [{ role: "system", content: designAInstruction() }];
  const historyB: Message[] = [{ role: "system", content: designBInstruction() }];
  for (const [i, text] of gateCase.turns.entries()) {
    const turn = i + 1;
    const turnTexts = gateCase.turns.slice(0, turn);
    const spans = conversationSpans(turnTexts, gateCase.locale);
    const annotated = annotateTurn(text, spans, turn);
    const userA = designAUserMessage(annotated, turn, spans);
    const userB = designBUserMessage(annotated, turn, spans, spanLines(spans));
    const record: TurnRecord = { turn, attempts: [], answer: "", flags: [], flagClasses: [], methodRules: [], spans: spans.map((s) => `${s.id}=${s.value}${s.ambiguous ? "?" : ""}`) };
    const a: DesignAExtraction | undefined = await extractWithRetry("A", [...historyA, { role: "user", content: userA }], designASchema(spans), cell, key, retries, (raw) => extractDesignA(raw, spans, gateCase.locale), record.attempts);
    if (a) {
      const b: DesignBExtraction | undefined = await extractWithRetry("B", [...historyB, { role: "user", content: userB }], designBSchema(spans), cell, key, retries, (raw) => extractDesignB(raw, spans), record.attempts);
      const outcome = renderDesignB(a, b, turnTexts, spans, gateCase.locale);
      record.answer = outcome.answer;
      record.flags = outcome.flags;
      record.flagClasses = outcome.flagClasses;
      record.methodRules = outcome.methodFlags.map((m) => m.rule);
      record.results = outcome.results;
      record.programA = outcome.programA;
      record.programB = outcome.programB;
    }
    turns.push(record);
    if (!record.answer) break;
    historyA.push({ role: "user", content: userA }, { role: "assistant", content: record.answer });
    historyB.push({ role: "user", content: userB }, { role: "assistant", content: record.answer });
  }
  const answers = turns.map((t) => t.answer);
  const score = scoreConversation(gateCase, answers);
  const delivered = turns.length === gateCase.turns.length && answers.every(Boolean);
  const flagged = turns.some((t) => t.flags.length > 0);
  const outcome: OutcomeV3 = !delivered ? "no-answer" : score.pass ? (flagged ? "exact-flagged" : "exact-unflagged") : flagged ? "wrong-flagged" : "wrong-silent";
  return { caseId: gateCase.id, repetition, turns, score, outcome };
}

export function summarise(records: ConversationRecordV3[]) {
  const count = (o: OutcomeV3) => records.filter((r) => r.outcome === o).length;
  const failures: Record<string, number> = {};
  const falseFlagCauses: Record<string, number> = {};
  const caughtBy: Record<string, number> = {};
  for (const r of records) {
    for (const t of r.turns) for (const a of t.attempts) if (a.failure) failures[`${a.call}:${a.failure.code}`] = (failures[`${a.call}:${a.failure.code}`] ?? 0) + 1;
    const classes = [...new Set(r.turns.flatMap((t) => t.flagClasses))].sort().join("+") || "none";
    if (r.outcome === "exact-flagged") falseFlagCauses[classes] = (falseFlagCauses[classes] ?? 0) + 1;
    if (r.outcome === "wrong-flagged") caughtBy[classes] = (caughtBy[classes] ?? 0) + 1;
  }
  return {
    conversations: records.length,
    exact: count("exact-unflagged") + count("exact-flagged"),
    verifiedByRecomputation: count("exact-unflagged"),
    falseFlag: count("exact-flagged"),
    flaggedWrong: count("wrong-flagged"),
    silentWrong: count("wrong-silent"),
    noAnswer: count("no-answer"),
    falseFlagCauses,
    caughtBy,
    validationFailures: failures,
  };
}

async function main() {
  const key = process.env.TINFOIL_API_KEY;
  if (!key) throw Error("TINFOIL_API_KEY is not loaded into this process");
  const setName = arg("cases");
  const cell = arg("cell") as Cell;
  const reps = Number(arg("reps", "1"));
  const label = arg("label");
  const cap = Number(arg("cap"));
  const retries = Number(arg("retry", "1"));
  const idsArg = arg("ids", "");
  // Dev sets only: unseen-v3 is admitted only after the owner approves THRESHOLD-v3.md.
  // unseen-v3 admitted on 24 October after the owner approved THRESHOLD-v3.md as written.
  if (!["dev-v3", "dev", "unseen-v3"].includes(setName)) throw Error("harness-v3 runs --cases dev-v3, dev or unseen-v3 only");
  if (!gateModels[cell]) throw Error(`unknown cell ${cell}`);
  if (![0, 1].includes(retries)) throw Error("--retry 0|1");
  const cases = ((setName === "dev-v3" ? devV3 : setName === "unseen-v3" ? unseenV3 : devV2).cases as unknown as GateCase[]).filter((c) => !idsArg || idsArg.split(",").includes(c.id));
  if (!cases.length) throw Error("no cases selected");
  await mkdir(`${ROOT}/${label}`, { recursive: true });
  const catalogResponse = await fetch(`${ORIGIN}/v1/models`, { headers: { authorization: `Bearer ${key}` } });
  if (!catalogResponse.ok) throw Error(`catalog ${catalogResponse.status}`);
  const catalog = { observedAt: new Date().toISOString(), source: `${ORIGIN}/v1/models`, data: ((await catalogResponse.json()) as { data: unknown[] }).data };
  await writeFile(`${ROOT}/${label}/catalog.json`, JSON.stringify(catalog, null, 2));
  let price: Price;
  try {
    price = checkLiveCatalog(catalog, cell).price;
  } catch (error) {
    const entry = catalog.data.find((m) => (m as { id?: string }).id === gateModels[cell].model);
    console.log("catalog check failed:", (error as Error).message);
    if (!entry || /experimental/i.test(JSON.stringify(entry))) throw error;
    price = referencePrices[cell];
  }
  const worstPerRequest = (MAX_PROMPT_TOKENS * price.input + maxOutputTokens(cell) * price.output) / 1e6 + price.request;
  const requestsPerConversation = 4 * (1 + retries);
  const records: ConversationRecordV3[] = [];
  let costUSD = 0, input = 0, output = 0, requests = 0;
  let stopped: string | undefined;
  outer: for (let repetition = 1; repetition <= reps; repetition++)
    for (const gateCase of cases) {
      if (costUSD + requestsPerConversation * worstPerRequest > cap) {
        stopped = `cap ${cap} would be passed by the next conversation (worst case ${(requestsPerConversation * worstPerRequest).toFixed(4)}); spent ${costUSD.toFixed(4)}`;
        break outer;
      }
      const record = await runConversation(gateCase, cell, repetition, key, retries);
      records.push(record);
      for (const turn of record.turns)
        for (const attempt of turn.attempts) {
          requests++;
          input += attempt.usage?.input ?? 0;
          output += attempt.usage?.output ?? 0;
          costUSD += attempt.usage ? (attempt.usage.input * price.input + attempt.usage.output * price.output) / 1e6 + price.request : /429|limiting requests/.test(attempt.transportFailure ?? "") ? 0 : worstPerRequest;
        }
      const classes = [...new Set(record.turns.flatMap((t) => t.flagClasses))].join("+");
      console.log(`${gateCase.id} r${repetition}: ${record.outcome}${classes ? ` [${classes}]` : ""}${record.turns.flatMap((t) => t.attempts.filter((a) => a.failure).map((a) => ` {${a.call}:${a.failure!.code}}`)).join("")} cost so far ${costUSD.toFixed(4)}`);
    }
  const totals = { requests, inputTokens: input, outputTokens: output, costUSD: Number(costUSD.toFixed(6)) };
  const summary = summarise(records);
  const out = { label, set: setName, design: "B", cell, model: gateModels[cell].model, config: gateModels[cell].config, retries, reps, price, startedAt: new Date().toISOString(), cases: cases.map((c) => c.id), summary, totals, stopped, records };
  await writeFile(`${ROOT}/${label}/results.json`, JSON.stringify(out, null, 2));
  await appendFile(COST_LOG, JSON.stringify({ batchId: label, at: new Date().toISOString(), set: `v3-${setName}`, cell, arm: `design-b-retry${retries}`, ...totals, basis: "non-stream usage x live catalog price; cached-input discount ignored (over-estimate)" }) + "\n");
  console.log(JSON.stringify({ label, ...summary, ...totals, stopped }));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("harness-v3.ts"))
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
