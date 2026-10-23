// Live harness for the arithmetic gate and its practice set (owner permit of
// 23 October 2026: practice runs within a USD 5 total cap; the frozen gate runs
// once at the end). Direct supplier API with the key loaded into this process
// by scripts/WindowsSecrets.psm1; never printed. The request path mirrors the
// product: the same system policy (composeContext, constraints-v4), the same
// calculator tool and instruction, the same stream parser and reply consumers,
// so a calculator failure here is the product's failure. The transport differs:
// plain TLS to the API instead of the browser's verified encrypted channel.
//
//   node --import tsx evaluation/arithmetic-gate/harness.ts \
//     --cases practice|gate --cell gemma --arm calculator --reps 1 \
//     --ids practice-01,practice-02 --label gemma-practice-1 --cap 0.50
//
// Writes .local/arithmetic-gate-20261022/<label>/results.json and appends one
// line to .local/arithmetic-gate-20261022/cost-log.jsonl. Stops before a
// request whose worst-case cost would pass the cap.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import gate from "./cases.json";
import practice from "./practice.json";
import unseen from "./unseen-20261023.json";
import publicSet from "./public-20261023.json";
import {
  LIMITS,
  checkLiveCatalog,
  gateModels,
  referencePrices,
  type Cell,
  type Arm,
  type Price,
} from "./prepare-run";
import { scoreConversation, type GateCase } from "./scorer";
import { postcheck } from "../../src/arithmetic/postcheck";
import { composeContext, newMessage } from "../../src/conversation";
import { emptyConversation, type Conversation } from "../../shared/contracts";
import { completionEvents } from "../../src/completion-events";
import { consumeReply } from "../../src/reply-stream";
import {
  CalculatorValidationError,
  calculatorTool,
  consumeCalculatorTurn,
  renderCalculatorTurn,
} from "../../src/calculator-turn";
import { createTinfoilClientAdapter } from "../../src/providers/tinfoil-client";

const ROOT = ".local/arithmetic-gate-20261022";
const PACE_MS = 1500;
const RATE_LIMIT_PAUSE_MS = 30000;
const ORIGIN = "https://inference.tinfoil.sh";
const CALCULATOR_INSTRUCTION =
  " Use ordinary source-linked prose for explanations. For derived numerical answers, optionally call calculate once with exact evidence-grounded operands. The browser displays its result directly; do not write a separate calculated total in prose. No tool is required for writing or missing-information questions. Calculator execution does not verify method applicability. User evidence uses one-based indices of included user turns.";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw Error(`--${name} is required`);
}

export type ReplyRecord = {
  turn: number;
  answer: string;
  usage?: { input: number; output: number; estimatedUSD: number };
  elapsedMs: number;
  failure?: string;
  /** HTTP 429 from the supplier; retried once after a pause and never charged. */
  rateLimited?: number;
  toolCall?: boolean;
  calculatorFailure?: string;
  /** Practice diagnostics (synthetic data only): the raw tool arguments and schema issues. */
  rawArguments?: string;
  schemaIssues?: unknown;
  /** The arguments as validated after normalisation (practice diagnostics). */
  validatedArguments?: string;
};
export type ConversationRecord = {
  caseId: string;
  repetition: number;
  arm: Arm;
  replies: ReplyRecord[];
  score: ReturnType<typeof scoreConversation>;
  postcheck: { flagged: boolean; mismatches: string[] }[];
};

async function request(
  body: unknown,
  key: string,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${ORIGIN}/v1/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-tinfoil-request-usage-metrics": "true",
    },
    body: JSON.stringify(body),
    signal,
  });
}

async function runConversation(
  gateCase: GateCase,
  cell: Cell,
  arm: Arm,
  repetition: number,
  price: Price,
  key: string,
  maxInputCharacters: number,
): Promise<ConversationRecord> {
  const spec = gateModels[cell];
  const adapter = createTinfoilClientAdapter();
  const policy = {
    provider: "tinfoil" as const,
    origin: ORIGIN,
    repository: "tinfoilsh/confidential-model-router",
    releaseDigests: [],
    model: spec.model,
    ...spec.config,
  };
  const pricing = {
    inputPerMillion: price.input,
    outputPerMillion: price.output,
    currency: "USD" as const,
  };
  const conversation: Conversation = emptyConversation();
  const replies: ReplyRecord[] = [];
  for (const [turn, text] of gateCase.turns.entries()) {
    conversation.messages.push(newMessage("user", text));
    const messages = composeContext(
      conversation,
      maxInputCharacters,
      new Date(),
      "constraints-v4",
    );
    if (arm === "calculator") messages[0].content += CALCULATOR_INSTRUCTION;
    const body = {
      model: spec.model,
      messages,
      ...(arm === "calculator"
        ? { tools: [calculatorTool], tool_choice: "auto" }
        : {}),
      ...adapter.modelOptions(policy),
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: LIMITS.maxOutputTokens,
      user_cache_secret: randomUUID(),
    };
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    const record: ReplyRecord = { turn: turn + 1, answer: "", elapsedMs: 0 };
    try {
      // Pace requests; a 429 is a transport refusal, not a model answer: wait
      // and send the identical request once more before recording a failure.
      await new Promise((r) => setTimeout(r, PACE_MS));
      let response = await request(body, key, controller.signal);
      if (response.status === 429) {
        record.rateLimited = (record.rateLimited ?? 0) + 1;
        await response.body?.cancel();
        await new Promise((r) => setTimeout(r, RATE_LIMIT_PAUSE_MS));
        response = await request(body, key, controller.signal);
      }
      const events = completionEvents(response, controller.signal);
      if (arm === "calculator") {
        try {
          const result = await consumeCalculatorTurn(
            events,
            pricing,
            controller.signal,
            [],
            conversation,
            (raw) => {
              record.rawArguments = raw;
            },
            undefined,
            (validated) => {
              record.validatedArguments = validated;
            },
          );
          record.toolCall = !!result.toolCall;
          record.answer = renderCalculatorTurn(result);
          record.usage = result.usage;
        } catch (error) {
          if (error instanceof CalculatorValidationError) {
            record.calculatorFailure = `${error.calculatorFailure}${error.validationDetail ? ":" + String(error.validationDetail) : ""}`;
            record.usage = error.usage;
            record.failure = "calculator-validation";
            record.schemaIssues = error.schemaIssues;
          } else throw error;
        }
      } else {
        let text = "";
        record.usage = await consumeReply(
          events,
          pricing,
          controller.signal,
          (chunk) => {
            text += chunk;
          },
        );
        record.answer = text;
      }
    } catch (error) {
      record.failure = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timer);
      record.elapsedMs = Date.now() - started;
    }
    replies.push(record);
    if (!record.answer) break;
    conversation.messages.push(newMessage("assistant", record.answer));
  }
  const answers = replies.map((r) => r.answer);
  return {
    caseId: gateCase.id,
    repetition,
    arm,
    replies,
    score: scoreConversation(gateCase, answers),
    postcheck: answers.map((answer) => {
      const result = postcheck(answer, gateCase.locale);
      return {
        flagged: result.flagged,
        mismatches: result.mismatches.map((m) => m.text),
      };
    }),
  };
}

async function main() {
  const key = process.env.TINFOIL_API_KEY;
  if (!key) throw Error("TINFOIL_API_KEY is not loaded into this process");
  const setName = arg("cases");
  const cell = arg("cell") as Cell;
  const arm = arg("arm") as Arm;
  const reps = Number(arg("reps", "1"));
  const label = arg("label");
  const cap = Number(arg("cap"));
  const idsArg = arg("ids", "");
  const set =
    setName === "gate"
      ? gate
      : setName === "practice"
        ? practice
        : setName === "unseen"
          ? unseen
          : setName === "public"
            ? publicSet
            : undefined;
  if (!set) throw Error("--cases must be practice, gate, unseen or public");
  if (!gateModels[cell]) throw Error(`unknown cell ${cell}`);
  if (arm !== "alone" && arm !== "calculator")
    throw Error("--arm alone|calculator");
  const cases = (set.cases as unknown as GateCase[]).filter(
    (c) => !idsArg || idsArg.split(",").includes(c.id),
  );
  if (!cases.length) throw Error("no cases selected");
  await mkdir(`${ROOT}/${label}`, { recursive: true });
  // Live catalog: refuse an experimental or missing model; take today's price.
  const catalogResponse = await fetch(`${ORIGIN}/v1/models`, {
    headers: { authorization: `Bearer ${key}` },
  });
  if (!catalogResponse.ok) throw Error(`catalog ${catalogResponse.status}`);
  const catalog = {
    observedAt: new Date().toISOString(),
    source: `${ORIGIN}/v1/models`,
    data: ((await catalogResponse.json()) as { data: unknown[] }).data,
  };
  await writeFile(
    `${ROOT}/${label}/catalog.json`,
    JSON.stringify(catalog, null, 2),
  );
  let price: Price;
  try {
    const check = checkLiveCatalog(catalog, cell);
    price = check.price;
    if (check.changes.length)
      console.log("price changes:", check.changes.join("; "));
  } catch (error) {
    const entry = catalog.data.find(
      (m) => (m as { id?: string }).id === gateModels[cell].model,
    );
    console.log("catalog check failed:", (error as Error).message);
    console.log("catalog entry:", JSON.stringify(entry));
    if (!entry || /experimental/i.test(JSON.stringify(entry))) throw error;
    price = referencePrices[cell];
    console.log("using reference price", JSON.stringify(price));
  }
  const maxInputCharacters =
    setName === "gate"
      ? LIMITS.gateInputCharacters
      : LIMITS.gateInputCharacters;
  const worstPerRequest =
    (maxInputCharacters * LIMITS.tokensPerCharacterBound * price.input +
      LIMITS.maxOutputTokens * price.output) /
      1e6 +
    price.request;
  const records: ConversationRecord[] = [];
  let costUSD = 0,
    input = 0,
    output = 0,
    requests = 0;
  let stopped: string | undefined;
  outer: for (let repetition = 1; repetition <= reps; repetition++)
    for (const gateCase of cases) {
      if (costUSD + 2 * worstPerRequest > cap) {
        stopped = `cap ${cap} would be passed by the next conversation (worst case ${(2 * worstPerRequest).toFixed(4)}); spent ${costUSD.toFixed(4)}`;
        break outer;
      }
      const record = await runConversation(
        gateCase,
        cell,
        arm,
        repetition,
        price,
        key,
        maxInputCharacters,
      );
      records.push(record);
      for (const reply of record.replies) {
        requests++;
        input += reply.usage?.input ?? 0;
        output += reply.usage?.output ?? 0;
        // No usage means no answer; a refused request (rate limit) costs nothing,
        // any other failure is charged at the worst case to stay conservative.
        costUSD += reply.usage
          ? (reply.usage.input * price.input +
              reply.usage.output * price.output) /
              1e6 +
            price.request
          : /limiting requests/.test(reply.failure ?? "")
            ? 0
            : worstPerRequest;
      }
      console.log(
        `${gateCase.id} r${repetition} ${arm}: ${record.score.pass ? "PASS" : "FAIL"}` +
          ` postcheck=${record.postcheck.map((p) => (p.flagged ? "flag" : "ok")).join("/")}` +
          ` cost so far ${costUSD.toFixed(4)}`,
      );
    }
  const totals = {
    requests,
    inputTokens: input,
    outputTokens: output,
    costUSD: Number(costUSD.toFixed(6)),
  };
  const passed = records.filter((r) => r.score.pass).length;
  const out = {
    label,
    set: setName,
    cell,
    model: gateModels[cell].model,
    config: gateModels[cell].config,
    arm,
    reps,
    price,
    startedAt: new Date().toISOString(),
    cases: cases.map((c) => c.id),
    passed,
    total: records.length,
    totals,
    stopped,
    records,
  };
  await writeFile(
    `${ROOT}/${label}/results.json`,
    JSON.stringify(out, null, 2),
  );
  await appendFile(
    `${ROOT}/cost-log.jsonl`,
    JSON.stringify({
      batchId: label,
      at: new Date().toISOString(),
      set: setName,
      cell,
      arm,
      ...totals,
      basis:
        "stream usage x live catalog price; cached-input discount ignored (over-estimate)",
    }) + "\n",
  );
  console.log(
    JSON.stringify({
      label,
      passed,
      total: records.length,
      ...totals,
      stopped,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
