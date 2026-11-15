// Usage metering, offline (docs/usage-metering-20261115.md): the weights file and its versions,
// the plans, the usage records store, the plausibility bounds for browser reports, the meter, the
// browser's report body, the weight suggestion and the weekly reconciliation on synthetic data.
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  activeWeights,
  planFor,
  usagePlans,
  usageWeights,
  weightsFileSchema,
  type WeightsFile,
} from "../shared/usage-config";
import { validateQualification } from "../shared/contracts";
import { researchWeights } from "../shared/deep-research";
import { BACKGROUND_LIMITS } from "../server/background-tasks";
import { CONTINUATIONS } from "../server/continuation-credit";
import { withPlan } from "../server/deployment-config";
import { meterView, withWeights } from "../server/usage-metering";
import { implausible, SqliteUsageRecords, type UsageRecord } from "../server/usage-records";
import { usageReportBody } from "../src/usage-report";
import { reconcile, suggestWeights, quotaTokens, euros, formatReconciliation, formatSuggestion } from "../scripts/usage-metering";
import { privatemodeReport } from "./fixtures/privatemode-report";

it("version 1 carries today's weights unchanged: report draft, code credit, background extras, research", () => {
  const v1 = usageWeights.versions[0];
  expect(v1.version).toBe(1);
  expect(v1.units).toMatchObject({ "chat-fast": 1, "chat-thinking": 5, image: 2, voice: 2, "research-run": 15, "code-followup": 0, retry: 0 });
  // The alpha report draft's Fast and Thinking costs (evaluation/qualification-drafts/privatemode-20261112.json).
  const draft = JSON.parse(readFileSync("evaluation/qualification-drafts/privatemode-20261112.json", "utf8"));
  for (const tier of draft.modes.fastCandidates) expect(tier.allowanceCost).toBe(v1.units["chat-fast"]);
  for (const tier of draft.modes.thinkingCandidates) expect(tier.allowanceCost).toBe(v1.units["chat-thinking"]);
  expect(v1.freeCodeFollowUps).toBe(CONTINUATIONS);
  expect([v1.units["background-search"], v1.units["background-attachment"]]).toEqual([BACKGROUND_LIMITS.searchUnits, BACKGROUND_LIMITS.attachmentUnits]);
  // 15 = plan 5 + answer 10, as the relay charges a run today.
  expect(researchWeights(v1.units["research-run"])).toEqual({ plan: 5, answer: 10 });
});

it("the newest version whose date has passed is in force; versions must count up with later dates", () => {
  const v1 = usageWeights.versions[0];
  const file: WeightsFile = {
    ...usageWeights,
    versions: [v1, { ...v1, version: 2, effectiveFrom: "2027-01-01T00:00:00.000Z", units: { ...v1.units, "chat-thinking": 6 } }],
  };
  expect(weightsFileSchema.safeParse(file).success).toBe(true);
  expect(activeWeights(Date.parse("2026-12-31T23:59:59Z"), file).version).toBe(1);
  expect(activeWeights(Date.parse("2027-01-01T00:00:00Z"), file).units["chat-thinking"]).toBe(6);
  // Before every version: version 1.
  expect(activeWeights(0, file).version).toBe(1);
  const bad = (versions: unknown[]) => weightsFileSchema.safeParse({ ...usageWeights, versions }).success;
  expect(bad([{ ...v1, version: 2 }])).toBe(false);
  expect(bad([v1, { ...v1, version: 2 }])).toBe(false); // same date
  expect(bad([{ ...v1, units: { ...v1.units, "chat-thinking": 11 } }])).toBe(false);
  expect(bad([{ ...v1, units: { ...v1.units, image: 0 } }])).toBe(false);
  expect(bad([{ ...v1, units: { ...v1.units, unknown: 1 } }])).toBe(false);
});

it("the weights replace the report's allowance costs; a report they would make invalid refuses chat", () => {
  const q = validateQualification(privatemodeReport({ vision: { model: "glm-5.3-flash", allowanceCost: 3 }, speech: { model: "whisper-large-v3", allowanceCost: 1 } }));
  const v1 = usageWeights.versions[0];
  const weighted = withWeights(q, v1)!;
  expect(weighted.modes).toMatchObject({ fast: { allowanceCost: 1 }, thinking: { allowanceCost: 5 } });
  expect(weighted.vision?.allowanceCost).toBe(2);
  expect(weighted.speech?.allowanceCost).toBe(2);
  // An image cheaper than a Fast message is refused by the report schema: chat stays off.
  expect(withWeights(q, { ...v1, units: { ...v1.units, "chat-fast": 3 } })).toBeUndefined();
});

it("plans: the alpha plan is today's configuration; a plan replaces the quotas and a cap of 0 switches the feature off", () => {
  expect(usagePlans.map((p) => p.id)).toEqual(["alpha", "free", "premium"]);
  expect(planFor("alpha")).toMatchObject({ units: { period: 150, days: 7, daily: 40 }, caps: { imagesPerDay: 10, researchRunsPerDay: 3, searchesPerDay: 24 } });
  expect(() => planFor("gold")).toThrow();
  const inference = {
    apiKey: "x",
    allowance: { requestLimit: 999, days: 3 },
    images: { maxBytes: 280_000, dailyImages: 50 },
    voice: { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 600 },
    research: { cost: 15, dailyRuns: 9, dailySearches: 99 },
  };
  expect(withPlan(inference)).toBe(inference);
  expect(withPlan(inference, { enabled: false, plan: "free" })).toBe(inference);
  expect(withPlan(inference, { enabled: true })).toEqual({
    apiKey: "x",
    metering: { plan: "alpha" },
    allowance: { requestLimit: 150, days: 7, dailyLimit: 40 },
    images: { maxBytes: 280_000, dailyImages: 10 },
    voice: { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 300 },
    research: { cost: 15, dailyRuns: 3, dailySearches: 24 },
  });
  // The free proposal has no deep research.
  const free = withPlan(inference, { enabled: true, plan: "free" });
  expect(free).not.toHaveProperty("research");
  expect(free).toMatchObject({ allowance: { requestLimit: 60, dailyLimit: 20 }, images: { dailyImages: 3 } });
});

const record = (over: Partial<UsageRecord> = {}): UsageRecord => ({
  requestId: "r1",
  accountId: "alice",
  createdAt: 1000,
  feature: "chat-fast",
  units: 1,
  weightVersion: 1,
  outcome: "complete",
  model: "glm-5.3-flash",
  requestBytes: 8_000,
  responseBytes: 60_000,
  durationMs: 4_000,
  report: "none",
  ...over,
});

it("plausibility: a report must fit the encrypted sizes, the output limit and the time the relay measured", () => {
  const ok = { requestId: "r1", promptTokens: 1500, completionTokens: 600 };
  expect(implausible(record(), ok, 1024)).toBeUndefined();
  expect(implausible(record({ outcome: "interrupted" }), ok)).toBe("not_complete");
  expect(implausible(record(), { ...ok, cachedTokens: 1501 })).toBe("cached_above_prompt");
  expect(implausible(record(), { ...ok, reasoningTokens: 601 })).toBe("reasoning_above_completion");
  // More prompt tokens than encrypted bytes, or far too few for the bytes sent.
  expect(implausible(record(), { ...ok, promptTokens: 8_001 })).toBe("prompt_above_bytes");
  expect(implausible(record({ requestBytes: 100_000 }), ok)).toBe("prompt_below_bytes");
  // A picture is many bytes and few tokens: no lower bound there.
  expect(implausible(record({ feature: "image", requestBytes: 300_000 }), ok)).toBeUndefined();
  expect(implausible(record(), ok, 500)).toBe("completion_above_limit");
  expect(implausible(record({ responseBytes: 5_000_000 }), ok)).toBe("completion_below_bytes");
  expect(implausible(record({ durationMs: 100 }), { ...ok, completionTokens: 2_500 })).toBe("too_fast");
  // Nothing measured: only the internal checks apply.
  expect(implausible(record({ requestBytes: undefined, responseBytes: undefined, durationMs: undefined }), { ...ok, promptTokens: 1e6 })).toBeUndefined();
});

it("the records store: one row per request, own account only, reported once, numbers only", () => {
  let now = 1000;
  const store = new SqliteUsageRecords(":memory:", () => now);
  try {
    const { report: _r, createdAt: _c, ...input } = record();
    store.record(input);
    store.record({ ...input, units: 9 }); // a repeated id is ignored
    store.record({ ...input, requestId: "b1", accountId: "bob" });
    expect(store.get("alice", "r1")).toEqual(record());
    expect(store.get("bob", "r1")).toBeUndefined();
    now = 2000;
    expect(store.report("alice", "r1", { requestId: "r1", promptTokens: 10, completionTokens: 5, cachedTokens: 2 }, "accepted")).toBe(true);
    expect(store.report("alice", "r1", { requestId: "r1", promptTokens: 1, completionTokens: 1 }, "accepted")).toBe(false);
    expect(store.report("alice", "b1", { requestId: "b1", promptTokens: 1, completionTokens: 1 }, "accepted")).toBe(false);
    expect(store.get("alice", "r1")).toMatchObject({ promptTokens: 10, completionTokens: 5, cachedTokens: 2, report: "accepted" });
    expect(() => store.report("bob", "b1", { requestId: "b1", promptTokens: 1, completionTokens: 1 }, "flagged", "Bad Note")).toThrow();
    expect(() => store.record({ ...input, requestId: "x", feature: "unknown" as "chat-fast" })).toThrow();
    expect(store.since("alice", 0).map((r) => r.requestId)).toEqual(["r1"]);
    expect(store.between(0, 1001).map((r) => r.requestId)).toEqual(["b1", "r1"]);
    expect(store.between(1001, 5000)).toEqual([]);
  } finally {
    store.close();
  }
});

it("the meter: units per feature this period, today's capped counts, and a calculation folded into one line", () => {
  const plan = planFor("alpha");
  const day = 86_400_000;
  const now = 10 * day;
  const accepted = { report: "accepted" as const, promptTokens: 1000, completionTokens: 200 };
  const records = [
    record({ requestId: "old", createdAt: now - 9 * day, ...accepted }), // before the period
    record({ requestId: "t1", createdAt: now - 2 * day, feature: "chat-thinking", units: 5, ...accepted }),
    record({ requestId: "f1", createdAt: now - 3600_000, ...accepted }),
    record({ requestId: "c1", createdAt: now - 3600_000 + 20_000, feature: "code-followup", units: 0, ...accepted }),
    record({ requestId: "c2", createdAt: now - 3600_000 + 40_000, feature: "code-followup", units: 0, ...accepted }),
    record({ requestId: "i1", createdAt: now - 60_000, feature: "image", units: 2 }),
    record({ requestId: "s1", createdAt: now - 30_000, feature: "search", units: 0 }),
  ];
  const view = meterView({
    records,
    summary: { state: "active", limit: 150, used: 8, remaining: 142, pending: 0, uncertain: 0, resetsAt: new Date(now + 5 * day).toISOString(), meteredRequests: 0, promptTokens: 0, completionTokens: 0, unmeteredRequests: 0 },
    todayUsed: 3,
    dailyLimit: 40,
    plan,
    weights: usageWeights.versions[0],
    periodStart: now - 2 * day,
    now,
  });
  expect(view.week).toEqual({ used: 8, limit: 150, remaining: 142, resetsAt: new Date(now + 5 * day).toISOString() });
  expect(view.today).toEqual({ used: 3, limit: 40 });
  expect(view.features).toEqual([
    { feature: "chat-thinking", requests: 1, units: 5, tokens: 1200, reported: 1 },
    { feature: "image", requests: 1, units: 2, tokens: 0, reported: 0 },
    { feature: "chat-fast", requests: 1, units: 1, tokens: 1200, reported: 1 },
    { feature: "code-followup", requests: 2, units: 0, tokens: 2400, reported: 2 },
    { feature: "search", requests: 1, units: 0, tokens: 0, reported: 0 },
  ]);
  expect(view.todayCounts).toEqual({ images: 1, researchRuns: 0, searches: 1 });
  expect(view.recent.slice(0, 3)).toEqual([
    { at: now - 30_000, feature: "search", units: 0, followUps: 0 },
    { at: now - 60_000, feature: "image", units: 2, followUps: 0 },
    { at: now - 3600_000, feature: "chat-fast", units: 1, followUps: 2, tokens: 3600 },
  ]);
});

it("the browser reports whole numbers only, and only for a reply the relay marked", () => {
  const usage = { prompt_tokens: 900, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 120 } };
  expect(usageReportBody("abc", usage)).toEqual({ requestId: "abc", promptTokens: 900, completionTokens: 300, cachedTokens: 0, reasoningTokens: 120 });
  expect(usageReportBody(null, usage)).toBeUndefined();
  expect(usageReportBody("abc", undefined)).toBeUndefined();
  expect(usageReportBody("abc", { prompt_tokens: 1.5, completion_tokens: 2 })).toBeUndefined();
  expect(usageReportBody("abc", { prompt_tokens: 1, completion_tokens: 2, prompt_tokens_details: null })).toEqual({ requestId: "abc", promptTokens: 1, completionTokens: 2 });
});

// Synthetic week: 30 Fast at 1,000 tokens, 30 Thinking at 2,000, 30 calculations of 3 requests.
function syntheticWeek() {
  const rows: UsageRecord[] = [];
  let t = 0;
  const add = (over: Partial<UsageRecord>) => rows.push(record({ requestId: `r${rows.length}`, createdAt: (t += 1000), report: "accepted", ...over }));
  for (let i = 0; i < 30; i++) {
    add({ promptTokens: 800, completionTokens: 200 });
    add({ feature: "chat-thinking", units: 5, model: "glm-5.3", promptTokens: 1000, completionTokens: 1000 });
    add({ promptTokens: 1000, completionTokens: 200 });
    add({ feature: "code-followup", units: 0, promptTokens: 1000, completionTokens: 200 });
    add({ feature: "code-followup", units: 0, promptTokens: 1000, completionTokens: 200 });
  }
  add({ report: "none" }); // complete, not reported: estimated
  add({ report: "none", outcome: "interrupted" });
  return rows;
}

it("reconciliation: totals per feature in portal tokens and euros, estimates for unreported requests, the gap to the portal", () => {
  const prices = usageWeights.prices;
  expect(quotaTokens(record({ report: "accepted", promptTokens: 1000, completionTokens: 100, cachedTokens: 500 }), prices)).toBe(1000 - 500 + 125 + 100);
  expect(euros(record({ report: "accepted", promptTokens: 1e6, completionTokens: 1e6 }), prices)).toBeCloseTo(0.85);
  expect(quotaTokens(record({ feature: "voice", audioSeconds: 120 }), prices)).toBe(5600);
  const result = reconcile(syntheticWeek(), prices, { tokens: 300_000, eur: 1 });
  const fast = result.features.find((f) => f.feature === "chat-fast")!;
  expect(fast).toMatchObject({ requests: 62, units: 62, reported: 60, unreported: 1, incomplete: 1, quotaTokens: 30 * 1000 + 30 * 1200 });
  expect(result.total.quotaTokens).toBe(30 * (1000 + 2000 + 3600));
  // The unreported Fast request is estimated at the Fast median (1,100 between 1,000 and 1,200).
  expect(result.total.estimatedTokens).toBe(1100);
  expect(result.appTokens).toBe(198_000 + 1100);
  expect(result.tokenGap).toBe(300_000 - 199_100);
  expect(result.tokenGapPercent).toBeCloseTo(33.6, 1);
  const text = formatReconciliation(result, "2026-11-16", "2026-11-23", { tokens: 300_000, eur: 1 });
  expect(text).toContain("Gap (portal minus app): 100,900 tokens, 33.6 %");
  expect(text).toContain("1 requests were interrupted or refused");
});

it("suggestion: medians per use, ratios to a Fast message, a proposal for the next version; too few uses suggest nothing", () => {
  const result = suggestWeights(syntheticWeek(), usageWeights, { basis: "tokens", minUses: 20, now: Date.parse("2026-11-20T00:00:00Z") });
  const row = (key: string) => result.table.find((r) => r.key === key)!;
  // The unreported Fast request has no measurement; the paid first request of each calculation is a Fast message too.
  expect(row("chat-fast")).toMatchObject({ uses: 60, tokens: 1100 });
  expect(row("chat-thinking")).toMatchObject({ uses: 30, tokens: 2000, suggested: 2 });
  expect(row("code-turn-fast")).toMatchObject({ uses: 30, tokens: 3600 });
  expect(row("code-turn-fast").tokenRatio).toBeCloseTo(3.27, 2);
  expect(row("image")).toMatchObject({ uses: 0, enough: false, suggested: undefined });
  expect(result.proposal).toMatchObject({ version: 2, effectiveFrom: "SET_ON_APPROVAL", units: { "chat-thinking": 2, image: 2, "chat-fast": 1 } });
  expect(result.changed).toBe(true);
  // By euros a Thinking message is far dearer (glm-5.3 against glm-5.3-flash), capped at 10.
  expect(suggestWeights(syntheticWeek(), usageWeights, { basis: "euros" }).table.find((r) => r.key === "chat-thinking")?.suggested).toBe(10);
  expect(formatSuggestion(result)).toContain('"version": 2');
});
