// Prepares the frozen arithmetic gate and nine-case selection screen as small,
// separately capped batches for the main session (style of
// evaluation/prepare-selection.ts). This file NEVER calls the network and never
// reads credentials: the live catalog is a JSON file the main session saved
// from https://inference.tinfoil.sh/v1/models immediately before preparing a
// batch, and billing figures come from the owner's read-only dashboard view.
//
//   npx tsx evaluation/arithmetic-gate/prepare-run.ts --list
//   npx tsx evaluation/arithmetic-gate/prepare-run.ts --batch gemma-gate-r1-1 \
//       --catalog <saved catalog.json> --template <permit template.json> --budget <budget.json>
//   npx tsx evaluation/arithmetic-gate/prepare-run.ts --batch gemma-gate-r4-borderline \
//       --cases arith-03,arith-11 --catalog ... --template ... --budget ...
//   npx tsx evaluation/arithmetic-gate/prepare-run.ts --report .local/arithmetic-gate-20261022/<batch>
//
// Arms: "alone" (ordinary answer), "calculator" (existing optionalCalculator
// path, no replay, no continuation) and "postcheck" (postcheck.ts applied
// offline to the alone replies; no requests, so it never appears in a permit).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import gate from "./cases.json";
import selectionBase from "../cases/model-selection-20261020.json";
import selectionAdded from "../cases/model-selection-checks-20261022.json";
import { validateExperiment } from "../experiment";
import { assertWorkspaceBudget } from "../workspace-budget";
import { type GateCase, scoreConversation } from "./scorer";
import { postcheck } from "./postcheck";

export const ROOT = ".local/arithmetic-gate-20261022";
export const CATALOG_SOURCE = "https://inference.tinfoil.sh/v1/models";
const gateCases = gate.cases as unknown as GateCase[];
export const screenCaseIds = [...selectionBase, ...selectionAdded].map((c) => c.id);

export type Cell = "gemma" | "gptoss" | "glm" | "kimi";
export type Arm = "alone" | "calculator";
/** Fixed request configuration per model. Thinking/effort settings are frozen here, not at run time. */
export const gateModels: Record<Cell, { model: string; config: Record<string, unknown>; label: string }> = {
  gemma: { model: "gemma4-31b", config: { gemmaThinking: false }, label: "Gemma 4 31B, thinking off" },
  gptoss: { model: "gpt-oss-120b", config: { gptOssReasoningEffort: "low" }, label: "GPT-OSS 120B, reasoning low" },
  glm: { model: "glm-5-3", config: { glmReasoningEffort: "low" }, label: "GLM-5.3, reasoning low" },
  kimi: { model: "kimi-k3", config: {}, label: "Kimi K3 (reasoning always on)" },
};
/** 20 October public price list (docs/provider-qualification.md, "Model/deployment shortlist"). Planning only. */
export const referencePrices: Record<Cell, Price> = {
  gemma: { input: 0.4, output: 1, request: 0 },
  gptoss: { input: 0.15, output: 0.6, request: 0 },
  glm: { input: 1.8, output: 5.75, request: 0 },
  kimi: { input: 4, output: 20, request: 0 },
};
export type Price = { input: number; output: number; request: number };
export const LIMITS = {
  gateInputCharacters: 12000,
  screenInputCharacters: 8000,
  maxOutputTokens: 4096,
  /** Repository reserve convention (run-workspace.ts): at most four tokens per input character. */
  tokensPerCharacterBound: 4,
  catalogMaxAgeHours: 6,
} as const;
/** Planning assumption for the expected case; the 20 October screen averaged about 670 input / 270 output tokens per request. */
export const EXPECTED_TOKENS = { input: 1000, calculatorExtraInput: 1000, output: 600, kimiOutput: 1500 } as const;
export const BATCH_RESERVE_CEILING_USD = 1.0;
/** Proposed per-model spending caps across all of that model's batches; the owner confirms or replaces them. */
export const PROPOSED_MODEL_CAPS_USD: Record<Cell, number> = { gemma: 1.5, gptoss: 1.0, glm: 6.0, kimi: 1.0 };

export function worstPerRequest(price: Price, inputCharacters: number) {
  return (
    (inputCharacters * LIMITS.tokensPerCharacterBound * price.input + LIMITS.maxOutputTokens * price.output) / 1e6 +
    price.request
  );
}
export function expectedPerRequest(price: Price, cell: Cell, arm: Arm) {
  const input = EXPECTED_TOKENS.input + (arm === "calculator" ? EXPECTED_TOKENS.calculatorExtraInput : 0);
  const output = cell === "kimi" ? EXPECTED_TOKENS.kimiOutput : EXPECTED_TOKENS.output;
  return (input * price.input + output * price.output) / 1e6 + price.request;
}

export type Conversation = {
  caseId: string;
  cell: Cell;
  arm: Arm;
  repetition: number;
  kind: "screen" | "gate";
  /** Runner cell name; the permit file is `${caseId}-${runnerCell}.json`. */
  runnerCell: string;
};
export type BatchSpec = {
  id: string;
  wave: 1 | 2;
  cell: Cell;
  kind: "screen" | "gate";
  repetition: number;
  arms: Arm[];
  caseIds: string[];
};

const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));

/**
 * The frozen order. Wave 1: Gemma then GPT-OSS (screen, then gate repetitions
 * 1–3 with both request arms interleaved per case). Wave 2, only after the
 * owner reviews wave 1: GLM-5.3 the same way, then Kimi K3 on the ten critical
 * cases, one repetition, alone arm, under its own cap. Batch sizes keep each
 * batch's worst-case reserve at or below USD 1.00 at 20 October prices.
 */
export function schedule(prices: Record<Cell, Price> = referencePrices): BatchSpec[] {
  const out: BatchSpec[] = [];
  const add = (wave: 1 | 2, cell: Cell, kind: "screen" | "gate", repetition: number, arms: Arm[], ids: string[]) => {
    const chars = kind === "screen" ? LIMITS.screenInputCharacters : LIMITS.gateInputCharacters;
    const perCase = arms.length * 2 * worstPerRequest(prices[cell], chars);
    const size = Math.max(1, Math.min(ids.length, Math.floor(BATCH_RESERVE_CEILING_USD / perCase)));
    chunk(ids, size).forEach((caseIds, i) =>
      out.push({
        id: kind === "screen" ? `${cell}-screen-${i + 1}` : `${cell}-gate-r${repetition}-${i + 1}`,
        wave,
        cell,
        kind,
        repetition,
        arms,
        caseIds,
      }),
    );
  };
  const all = gateCases.map((c) => c.id);
  const critical = gateCases.filter((c) => c.critical).map((c) => c.id);
  for (const cell of ["gemma", "gptoss"] as const) {
    add(1, cell, "screen", 1, ["alone"], screenCaseIds);
    for (const rep of [1, 2, 3]) add(1, cell, "gate", rep, ["alone", "calculator"], all);
  }
  add(2, "glm", "screen", 1, ["alone"], screenCaseIds);
  for (const rep of [1, 2, 3]) add(2, "glm", "gate", rep, ["alone", "calculator"], all);
  add(2, "kimi", "gate", 1, ["alone"], critical);
  return out;
}

/** Conversations of one batch, case-major, alternating arm order by case. */
export function conversations(spec: BatchSpec): Conversation[] {
  return spec.caseIds.flatMap((caseId, i) => {
    const arms = i % 2 ? [...spec.arms].reverse() : spec.arms;
    return arms.map((arm) => ({
      caseId,
      cell: spec.cell,
      arm,
      repetition: spec.repetition,
      kind: spec.kind,
      runnerCell: spec.kind === "screen" ? spec.cell : `${spec.cell}-${arm}-r${spec.repetition}`,
    }));
  });
}

export function borderlineSpec(id: string, caseIds: string[], arms: Arm[]): BatchSpec {
  const m = /^(gemma|gptoss|glm|kimi)-gate-r([45])-borderline$/.exec(id);
  if (!m) throw Error("Borderline batch IDs look like gemma-gate-r4-borderline");
  if (!caseIds.length || new Set(caseIds).size !== caseIds.length) throw Error("Name each borderline case once");
  for (const c of caseIds) {
    const found = gateCases.find((g) => g.id === c);
    if (!found) throw Error(`Unknown gate case ${c}`);
    if (found.critical) throw Error(`${c} is critical: one failure already fails the gate; no borderline runs`);
  }
  return { id, wave: m[1] === "glm" || m[1] === "kimi" ? 2 : 1, cell: m[1] as Cell, kind: "gate", repetition: +m[2], arms, caseIds };
}

// ---------------------------------------------------------------------------
// Live catalog check (offline: reads a saved catalog file).
const catalogSchema = z.object({
  observedAt: z.string().datetime(),
  source: z.literal(CATALOG_SOURCE),
  data: z.array(z.record(z.string(), z.unknown())),
});
export type CatalogCheck = { price: Price; entry: Record<string, unknown>; changes: string[] };

/** Refuses a model that is missing, labelled experimental anywhere, not a chat model, or unpriced. */
export function checkLiveCatalog(catalogInput: unknown, cell: Cell, now = Date.now()): CatalogCheck {
  const catalog = catalogSchema.parse(catalogInput);
  const age = now - Date.parse(catalog.observedAt);
  if (age < 0 || age > LIMITS.catalogMaxAgeHours * 3600000)
    throw Error(`Catalog must be read within ${LIMITS.catalogMaxAgeHours} hours before preparing a batch`);
  const id = gateModels[cell].model;
  const matches = catalog.data.filter((m) => m.id === id);
  if (matches.length !== 1) throw Error(`${id} is not listed exactly once in the live catalog`);
  const entry = matches[0];
  const labels = JSON.stringify([entry.name, entry.tags, entry.labels, entry.status, entry.stage, entry.lifecycle]);
  if ((entry.experimental !== undefined && entry.experimental !== false) || /experimental/i.test(labels))
    throw Error(`${id} is labelled experimental in the live catalog; it cannot be screened as a default`);
  if (entry.type !== "chat") throw Error(`${id} is not a chat model in the live catalog`);
  if (!Array.isArray(entry.endpoints) || !entry.endpoints.includes("/v1/chat/completions"))
    throw Error(`${id} does not list /v1/chat/completions`);
  const pricing = z
    .object({
      inputTokenPricePer1M: z.number().finite().nonnegative(),
      outputTokenPricePer1M: z.number().finite().nonnegative(),
      requestPrice: z.number().finite().nonnegative().optional(),
    })
    .passthrough()
    .parse(entry.pricing);
  const price = {
    input: pricing.inputTokenPricePer1M,
    output: pricing.outputTokenPricePer1M,
    request: pricing.requestPrice ?? 0,
  };
  const ref = referencePrices[cell];
  const changes = (["input", "output", "request"] as const)
    .filter((k) => price[k] !== ref[k])
    .map((k) => `${k} ${ref[k]} -> ${price[k]} USD`);
  return { price, entry, changes };
}

// ---------------------------------------------------------------------------
const budgetSchema = z
  .object({
    actualBeforeUSD: z.number().finite().nonnegative(),
    prepaidBeforeUSD: z.number().finite().nonnegative(),
    uncertaintyUSD: z.number().finite().nonnegative(),
    capUSD: z.number().finite().positive(),
    providerAccountLimitUSD: z.number().finite().positive(),
    providerKeyLimitUSD: z.number().finite().positive(),
    approvedCapUSD: z.number().finite().positive(),
    providerCapUSD: z.number().finite().positive(),
    /** Sum of this model's earlier batch costs from cost-log.jsonl. */
    modelSpentUSD: z.number().finite().nonnegative(),
    /** Owner-named cap for this model; defaults to the proposal in PROPOSED_MODEL_CAPS_USD. */
    modelCapUSD: z.number().finite().positive().optional(),
    budgetEvidence: z.string().min(20),
    /** The owner's own authorisation, quoted; never written by an agent. */
    approvalEvidence: z.string().min(20),
  })
  .strict();
export type Budget = z.infer<typeof budgetSchema>;

const normalisedHash = (bytes: string | Buffer) =>
  createHash("sha256").update(String(bytes).replace(/\r\n/g, "\n")).digest("hex");

export async function gateHashes() {
  const out: Record<string, string> = {};
  for (const f of [
    "cases.json",
    "THRESHOLD.md",
    "numbers.ts",
    "scorer.ts",
    "postcheck.ts",
    "derivation.ts",
    "prepare-run.ts",
  ])
    out[`evaluation/arithmetic-gate/${f}`] = normalisedHash(await readFile(`evaluation/arithmetic-gate/${f}`));
  return out;
}

export function buildBatch(input: {
  spec: BatchSpec;
  catalog: unknown;
  catalogSHA256: string;
  template: Record<string, any>;
  budget: unknown;
  now?: number;
  gateHashes: Record<string, string>;
  implementationHashes: Record<string, string>;
  fixtureSHA256: string;
}) {
  const now = input.now ?? Date.now();
  const spec = input.spec;
  const budget = budgetSchema.parse(input.budget);
  const check = checkLiveCatalog(input.catalog, spec.cell, now);
  const chars = spec.kind === "screen" ? LIMITS.screenInputCharacters : LIMITS.gateInputCharacters;
  const perRequest = worstPerRequest(check.price, chars);
  const list = conversations(spec);
  const requests = list.length * 2;
  const reserveUSD = requests * perRequest;
  const expectedUSD = list.reduce((s, c) => s + 2 * expectedPerRequest(check.price, c.cell, c.arm), 0);
  const modelCapUSD = budget.modelCapUSD ?? PROPOSED_MODEL_CAPS_USD[spec.cell];
  if (budget.modelSpentUSD + reserveUSD > modelCapUSD + 1e-9)
    throw Error(
      `Stop: ${spec.cell} has spent ${budget.modelSpentUSD.toFixed(4)} USD; this batch reserves ${reserveUSD.toFixed(4)} USD against a ${modelCapUSD} USD model cap`,
    );
  const nowIso = new Date(now).toISOString();
  const {
    deepSeekThinking,
    deepSeekReasoningEffort,
    gptOssReasoningEffort,
    gemmaThinking,
    glmReasoningEffort,
    optionalCalculator,
    calculatorReplay,
    calculatorContinuation,
    checkedResponseContract,
    researchEvidenceContract,
    scopedResearchContract,
    assistedResearchContract,
    assistedStructuredOutput,
    ...base
  } = input.template.policy ?? {};
  const { continuationApproval, reservedAssessment, firstTurnInputCharacters, ...templateRest } = input.template;
  const pricingEvidence = `Live catalog ${CATALOG_SOURCE} saved ${(input.catalog as { observedAt: string }).observedAt}, sha256 ${input.catalogSHA256}; ${gateModels[spec.cell].model} not experimental; USD ${check.price.input}/${check.price.output} per million, request ${check.price.request}.`;
  const permits = list.map((c) => {
    const permit = {
      ...templateRest,
      purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
      scenario: "robustness_case",
      developmentCaseId: c.caseId,
      approvalId: `arith1022_${c.caseId.replaceAll("-", "_")}_${c.runnerCell.replaceAll("-", "_")}`,
      approvedAt: nowIso,
      expiresAt: new Date(now + 6 * 3600000).toISOString(),
      approvalEvidence: budget.approvalEvidence,
      approvedCapUSD: budget.approvedCapUSD,
      providerCapUSD: budget.providerCapUSD,
      providerLimitEvidence: budget.budgetEvidence,
      pricingEvidence,
      pricingCheckedAt: (input.catalog as { observedAt: string }).observedAt,
      policy: {
        ...base,
        model: gateModels[spec.cell].model,
        ...gateModels[spec.cell].config,
        ...(c.arm === "calculator" ? { optionalCalculator: true } : {}),
        answerPolicyVariant: "constraints-v4",
        maxInputCharacters: chars,
        maxOutputTokens: LIMITS.maxOutputTokens,
        pricing: { currency: "USD", inputPerMillion: check.price.input, outputPerMillion: check.price.output },
      },
    };
    validateExperiment(permit, now);
    return { file: `${c.caseId}-${c.runnerCell}.json`, conversation: c, permit };
  });
  const plan = {
    status: "FROZEN_BEFORE_EXECUTION",
    study: "arithmetic-gate-20261022",
    frozenAt: nowIso,
    batchId: spec.id,
    wave: spec.wave,
    model: gateModels[spec.cell],
    kind: spec.kind,
    repetition: spec.repetition,
    arms: spec.arms,
    stopPolicy: "independent-arms",
    maxRequests: requests,
    maxSearches: 0,
    automaticRetries: 0,
    actualBeforeUSD: budget.actualBeforeUSD,
    prepaidBeforeUSD: budget.prepaidBeforeUSD,
    uncertaintyUSD: budget.uncertaintyUSD,
    reserveUSD,
    expectedUSD,
    cumulativeBoundUSD: budget.actualBeforeUSD + budget.uncertaintyUSD + reserveUSD,
    capUSD: budget.capUSD,
    providerAccountLimitUSD: budget.providerAccountLimitUSD,
    providerKeyLimitUSD: budget.providerKeyLimitUSD,
    modelSpentBeforeUSD: budget.modelSpentUSD,
    modelCapUSD,
    budgetEvidence: budget.budgetEvidence,
    catalog: { source: CATALOG_SOURCE, sha256: input.catalogSHA256, priceChangesSince20October: check.changes },
    priceTable: { [spec.cell]: check.price },
    caseIds: spec.caseIds,
    conversations: permits.map((p, order) => ({ order: order + 1, ...p.conversation, permit: p.file })),
    postcheckArm: spec.arms.includes("alone") && spec.kind === "gate"
      ? "Offline: postcheck.ts over the alone-arm replies of this batch at report time; no requests."
      : "none",
    stopRules: [
      "Before each conversation: stop if this batch's settled cost plus the next conversation's worst case would exceed the batch reserve or the model cap.",
      "Unknown transport, authentication, integrity or billing failure: stop the batch; no retries.",
      "An incomplete or context-rejected turn is recorded as a failed conversation and the next conversation continues (independent arms).",
      "After the batch: run --report, append the cost-log line, give the owner the batch cost and the running total before preparing the next batch.",
      "A critical-case failure in any arm decides the gate for that model; remaining batches for that model run only if the owner asks for them.",
    ],
    scope:
      "Synthetic two-turn tax and finance arithmetic (cases.json) and the nine-case selection screen; no sources, search, files or images. Constraints-v4 prompt; 12000 gate / 8000 screen input characters, explicit rejection beyond; 4096 output tokens; existing deadline. Calculator arm: optionalCalculator only (no replay, no continuation). No automatic routing.",
    humanScores: null,
    fixtureSHA256: input.fixtureSHA256,
    gateHashes: input.gateHashes,
    implementationHashes: input.implementationHashes,
  };
  assertWorkspaceBudget(plan, requests, reserveUSD, Math.min(budget.approvedCapUSD, budget.providerCapUSD));
  return { plan, permits };
}

// ---------------------------------------------------------------------------
// After a batch: cost from reported usage and mechanical scores.
type ResultRecord = {
  id: string;
  cell: string;
  replies: { completed?: boolean; answer?: string; usage?: { input?: number; output?: number } }[];
};
export function reportBatch(plan: { batchId: string; priceTable: Record<string, Price>; conversations: Conversation[] }, results: { results: ResultRecord[] }) {
  const price = Object.values(plan.priceTable)[0];
  let input = 0;
  let output = 0;
  let requests = 0;
  const rows = results.results.map((r) => {
    const conv = plan.conversations.find((c) => c.caseId === r.id && c.runnerCell === r.cell);
    if (!conv) throw Error(`Result ${r.id}/${r.cell} is not in the frozen batch`);
    for (const reply of r.replies) {
      requests++;
      input += reply.usage?.input ?? 0;
      output += reply.usage?.output ?? 0;
    }
    const answers = r.replies.map((x) => (x.completed ? x.answer : undefined));
    if (conv.kind === "screen") return { ...conv, delivered: answers.filter(Boolean).length };
    const gateCase = gateCases.find((c) => c.id === r.id)!;
    const score = scoreConversation(gateCase, answers);
    const flagged = answers.some((a) => a && postcheck(a, gateCase.locale).flagged);
    return { ...conv, exact: score.pass, postcheckFlagged: conv.arm === "alone" ? flagged : undefined, score };
  });
  const costUSD = (input * price.input + output * price.output) / 1e6 + requests * price.request;
  return {
    costLine: { batchId: plan.batchId, at: new Date().toISOString(), requests, inputTokens: input, outputTokens: output, costUSD, basis: "reported usage x frozen catalog price; cached-input discount ignored (over-estimate)" },
    rows,
  };
}

// ---------------------------------------------------------------------------
function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}
async function main() {
  if (process.argv.includes("--list")) {
    const rows = schedule().map((s) => {
      const list = conversations(s);
      const chars = s.kind === "screen" ? LIMITS.screenInputCharacters : LIMITS.gateInputCharacters;
      return {
        batch: s.id,
        wave: s.wave,
        conversations: list.length,
        requests: list.length * 2,
        worstUSD: +(list.length * 2 * worstPerRequest(referencePrices[s.cell], chars)).toFixed(4),
        expectedUSD: +list.reduce((a, c) => a + 2 * expectedPerRequest(referencePrices[s.cell], s.cell, c.arm), 0).toFixed(4),
      };
    });
    console.table(rows);
    return;
  }
  const report = arg("--report");
  if (report) {
    const plan = JSON.parse(await readFile(`${report}/plan.json`, "utf8"));
    const results = JSON.parse(await readFile(`${report}/results.json`, "utf8"));
    const out = reportBatch(plan, results);
    await writeFile(`${report}/report.json`, JSON.stringify(out, null, 2), { flag: "wx" });
    await appendFile(`${ROOT}/cost-log.jsonl`, JSON.stringify(out.costLine) + "\n");
    console.log(JSON.stringify(out.costLine));
    return;
  }
  const batchId = arg("--batch");
  if (!batchId) throw Error("Use --list, --batch <id> or --report <dir>");
  const arms = (arg("--arms")?.split(",") ?? ["alone", "calculator"]) as Arm[];
  const spec = batchId.endsWith("-borderline")
    ? borderlineSpec(batchId, (arg("--cases") ?? "").split(",").filter(Boolean), arms)
    : schedule().find((s) => s.id === batchId);
  if (!spec) throw Error(`Unknown batch ${batchId}; see --list`);
  const catalogBytes = await readFile(arg("--catalog") ?? "");
  const template = JSON.parse(await readFile(arg("--template") ?? "", "utf8"));
  const budget = JSON.parse(await readFile(arg("--budget") ?? "", "utf8"));
  const implementationHashes: Record<string, string> = {};
  const tracked = execFileSync("git", ["ls-files", "src", "shared", "server", "evaluation", "package-lock.json"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n");
  for (const file of tracked)
    if (/\.(ts|tsx|json)$/.test(file))
      implementationHashes[file] = createHash("sha256").update(await readFile(file)).digest("hex");
  const fixtureSHA256 =
    spec.kind === "screen"
      ? createHash("sha256")
          .update(await readFile("evaluation/cases/model-selection-20261020.json"))
          .update(await readFile("evaluation/cases/model-selection-checks-20261022.json"))
          .digest("hex")
      : createHash("sha256").update(await readFile("evaluation/arithmetic-gate/cases.json")).digest("hex");
  const { plan, permits } = buildBatch({
    spec,
    catalog: JSON.parse(String(catalogBytes)),
    catalogSHA256: createHash("sha256").update(catalogBytes).digest("hex"),
    template,
    budget,
    gateHashes: await gateHashes(),
    implementationHashes,
    fixtureSHA256,
  });
  const dir = `${ROOT}/${spec.id}`;
  await mkdir(dir, { recursive: true });
  for (const p of permits) await writeFile(`${dir}/${p.file}`, JSON.stringify(p.permit, null, 2), { flag: "wx" });
  await writeFile(`${dir}/plan.json`, JSON.stringify(plan, null, 2), { flag: "wx" });
  console.log(
    JSON.stringify({ dir, requests: plan.maxRequests, reserveUSD: plan.reserveUSD, expectedUSD: plan.expectedUSD, priceChanges: plan.catalog.priceChangesSince20October }),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
