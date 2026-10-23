// Live harness for Design A (arithmetic v2, 23 October 2026). One structured
// output call per turn: the user's text with span ids, a JSON schema whose
// reference enum is fixed per request, the model's program validated and
// evaluated by src/arithmetic/design-a.ts, the answer rendered only from
// computed values. Optional retry: the validation error is returned to the
// model once (--retry 1) and the second reply is validated the same way.
//
// Direct supplier API with the key loaded into this process by
// scripts/WindowsSecrets.psm1 (Invoke-WithPrivateAiSecret -Name TINFOIL_API_KEY);
// never printed. Pacing 1500 ms, one 429 retry after a pause, a cap check
// before every conversation, one line per batch appended to the SAME cost log
// as the earlier gate runs. Dev set only: the frozen gate, the unseen set and
// the public set are refused here.
//
//   node --import tsx evaluation/arithmetic-gate/harness-v2.ts \
//     --cases dev --cell gptoss --label gptoss-dev-a-1 --cap 0.20 [--retry 1] [--ids dev2-01,dev2-02] [--reps 1]
//
// Writes .local\arithmetic-v2-20261023\<label>\results.json
// and appends to .local\arithmetic-gate-20261022\cost-log.jsonl.
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import devSet from "./dev-v2-20261023.json";
import { LIMITS, checkLiveCatalog, gateModels, referencePrices, type Cell, type Price } from "./prepare-run";
import { scoreConversation, type GateCase } from "./scorer";
import {
  DesignAError,
  designAInstruction,
  designASchema,
  designAUserMessage,
  renderDesignA,
  type DesignAOutcome,
} from "../../src/arithmetic/design-a";
import { annotateTurn, conversationSpans } from "../../src/arithmetic/spans";
import { createTinfoilClientAdapter } from "../../src/providers/tinfoil-client";

export const ROOT = ".local/arithmetic-v2-20261023";
export const COST_LOG = ".local/arithmetic-gate-20261022/cost-log.jsonl";
const PACE_MS = 1500;
const RATE_LIMIT_PAUSE_MS = 30000;
const ORIGIN = "https://inference.tinfoil.sh";
const MAX_OUTPUT_TOKENS = 2048;
const MAX_PROMPT_CHARACTERS = 12000;

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw Error(`--${name} is required`);
}

export type AttemptRecord = {
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
  results?: DesignAOutcome["results"];
  program?: DesignAOutcome["program"];
  spans: string[];
};
export type OutcomeV2 = "exact-unflagged" | "exact-flagged" | "wrong-flagged" | "wrong-silent" | "no-answer";
export type ConversationRecordV2 = {
  caseId: string;
  repetition: number;
  turns: TurnRecord[];
  score: ReturnType<typeof scoreConversation>;
  outcome: OutcomeV2;
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

async function callModel(messages: Message[], schema: unknown, cell: Cell, key: string): Promise<AttemptRecord> {
  const spec = gateModels[cell];
  const adapter = createTinfoilClientAdapter();
  const policy = { provider: "tinfoil" as const, origin: ORIGIN, repository: "tinfoilsh/confidential-model-router", releaseDigests: [], model: spec.model, ...spec.config };
  const body = {
    model: spec.model,
    messages,
    response_format: { type: "json_schema", json_schema: { name: "arithmetic_program_v2", strict: true, schema } },
    ...adapter.modelOptions(policy),
    stream: false,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    user_cache_secret: randomUUID(),
  };
  const record: AttemptRecord = { raw: "", elapsedMs: 0 };
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
    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string | null }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
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

export async function runConversation(
  gateCase: GateCase,
  cell: Cell,
  repetition: number,
  key: string,
  retries: number,
): Promise<ConversationRecordV2> {
  const turns: TurnRecord[] = [];
  const history: Message[] = [{ role: "system", content: designAInstruction() }];
  for (const [i, text] of gateCase.turns.entries()) {
    const turn = i + 1;
    const spans = conversationSpans(gateCase.turns.slice(0, turn), gateCase.locale);
    const userMessage = designAUserMessage(annotateTurn(text, spans, turn), turn, spans);
    const schema = designASchema(spans);
    const messages: Message[] = [...history, { role: "user", content: userMessage }];
    const record: TurnRecord = { turn, attempts: [], answer: "", flags: [], spans: spans.map((s) => `${s.id}=${s.value}${s.ambiguous ? "?" : ""}`) };
    let outcome: DesignAOutcome | undefined;
    for (let attempt = 0; attempt <= retries && !outcome; attempt++) {
      const result = await callModel(messages, schema, cell, key);
      record.attempts.push(result);
      if (result.transportFailure === "output truncated at the token limit") {
        // A model failure, not a transport one: the retry asks for a shorter program.
        result.failure = { code: "TRUNCATED", detail: "the reply ran past the output limit" };
        delete result.transportFailure;
        messages.push(
          { role: "assistant", content: result.raw.slice(0, 2000) },
          { role: "user", content: "That reply was cut off before it was complete. Return the JSON program again, short and complete, with nothing but the fields of the schema." },
        );
        continue;
      }
      if (result.transportFailure) break;
      try {
        outcome = renderDesignA(result.raw, spans, gateCase.locale);
      } catch (error) {
        if (!(error instanceof DesignAError)) throw error;
        result.failure = { code: error.code, detail: error.detail };
        if (error.code === "CANNOT_ANSWER") break;
        messages.push(
          { role: "assistant", content: result.raw },
          { role: "user", content: `That program was rejected: ${error.code}: ${error.detail}. Return a corrected JSON program for the same question, using only the span ids and constants listed.` },
        );
      }
    }
    if (outcome) {
      record.answer = outcome.answer;
      record.flags = outcome.flags;
      record.results = outcome.results;
      record.program = outcome.program;
    }
    turns.push(record);
    if (!record.answer) break;
    history.push({ role: "user", content: userMessage }, { role: "assistant", content: record.answer });
  }
  const answers = turns.map((t) => t.answer);
  const score = scoreConversation(gateCase, answers);
  const delivered = turns.length === gateCase.turns.length && answers.every(Boolean);
  const flagged = turns.some((t) => t.flags.length > 0);
  const outcome: OutcomeV2 = !delivered ? "no-answer" : score.pass ? (flagged ? "exact-flagged" : "exact-unflagged") : flagged ? "wrong-flagged" : "wrong-silent";
  return { caseId: gateCase.id, repetition, turns, score, outcome };
}

export function summarise(records: ConversationRecordV2[]) {
  const count = (o: OutcomeV2) => records.filter((r) => r.outcome === o).length;
  const failures: Record<string, number> = {};
  for (const r of records) for (const t of r.turns) for (const a of t.attempts) if (a.failure) failures[a.failure.code] = (failures[a.failure.code] ?? 0) + 1;
  return {
    conversations: records.length,
    exact: count("exact-unflagged") + count("exact-flagged"),
    verifiedByRecomputation: count("exact-unflagged"),
    falseFlag: count("exact-flagged"),
    flaggedWrong: count("wrong-flagged"),
    silentWrong: count("wrong-silent"),
    noAnswer: count("no-answer"),
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
  const retries = Number(arg("retry", "0"));
  const idsArg = arg("ids", "");
  if (setName !== "dev") throw Error("harness-v2 runs the dev set only (--cases dev); gate v2 needs the owner's approval of THRESHOLD-v2.md");
  if (!gateModels[cell]) throw Error(`unknown cell ${cell}`);
  if (![0, 1].includes(retries)) throw Error("--retry 0|1");
  const cases = (devSet.cases as unknown as GateCase[]).filter((c) => !idsArg || idsArg.split(",").includes(c.id));
  if (!cases.length) throw Error("no cases selected");
  await mkdir(`${ROOT}/${label}`, { recursive: true });
  const catalogResponse = await fetch(`${ORIGIN}/v1/models`, { headers: { authorization: `Bearer ${key}` } });
  if (!catalogResponse.ok) throw Error(`catalog ${catalogResponse.status}`);
  const catalog = { observedAt: new Date().toISOString(), source: `${ORIGIN}/v1/models`, data: ((await catalogResponse.json()) as { data: unknown[] }).data };
  await writeFile(`${ROOT}/${label}/catalog.json`, JSON.stringify(catalog, null, 2));
  let price: Price;
  try {
    const check = checkLiveCatalog(catalog, cell);
    price = check.price;
    if (check.changes.length) console.log("price changes:", check.changes.join("; "));
  } catch (error) {
    const entry = catalog.data.find((m) => (m as { id?: string }).id === gateModels[cell].model);
    console.log("catalog check failed:", (error as Error).message);
    if (!entry || /experimental/i.test(JSON.stringify(entry))) throw error;
    price = referencePrices[cell];
    console.log("using reference price", JSON.stringify(price));
  }
  const worstPerRequest = (MAX_PROMPT_CHARACTERS * LIMITS.tokensPerCharacterBound * price.input + MAX_OUTPUT_TOKENS * price.output) / 1e6 + price.request;
  const requestsPerConversation = 2 * (1 + retries);
  const records: ConversationRecordV2[] = [];
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
          costUSD += attempt.usage
            ? (attempt.usage.input * price.input + attempt.usage.output * price.output) / 1e6 + price.request
            : /429|limiting requests/.test(attempt.transportFailure ?? "")
              ? 0
              : worstPerRequest;
        }
      console.log(`${gateCase.id} r${repetition}: ${record.outcome}${record.turns.flatMap((t) => t.attempts.filter((a) => a.failure).map((a) => ` [${a.failure!.code}]`)).join("")} cost so far ${costUSD.toFixed(4)}`);
    }
  const totals = { requests, inputTokens: input, outputTokens: output, costUSD: Number(costUSD.toFixed(6)) };
  const summary = summarise(records);
  const out = {
    label,
    set: setName,
    design: "A",
    cell,
    model: gateModels[cell].model,
    config: gateModels[cell].config,
    retries,
    reps,
    price,
    startedAt: new Date().toISOString(),
    cases: cases.map((c) => c.id),
    summary,
    totals,
    stopped,
    records,
  };
  await writeFile(`${ROOT}/${label}/results.json`, JSON.stringify(out, null, 2));
  await appendFile(
    COST_LOG,
    JSON.stringify({ batchId: label, at: new Date().toISOString(), set: `v2-${setName}`, cell, arm: `design-a-retry${retries}`, ...totals, basis: "non-stream usage x live catalog price; cached-input discount ignored (over-estimate)" }) + "\n",
  );
  console.log(JSON.stringify({ label, ...summary, ...totals, stopped }));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("harness-v2.ts"))
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
