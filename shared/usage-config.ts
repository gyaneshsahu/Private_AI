// Usage metering configuration (docs/usage-metering-20261115.md): feature weights as versioned
// configuration (shared/usage-weights.json) and quotas per plan (shared/usage-plans.json). Both
// files are parsed strictly when this module loads, so a broken file stops the server at start.
import { z } from "zod";
import rawWeights from "./usage-weights.json";
import rawPlans from "./usage-plans.json";

/** What a usage record can be for. Stable keys: records and scripts use them. */
export const FEATURES = [
  "chat-fast",
  "chat-thinking",
  "code-followup",
  "retry",
  "image",
  "voice",
  "research-plan",
  "research-answer",
  "background-run",
  "search",
  "page-fetch",
  // A created image (docs/image-creation-20261117.md): its own daily limit, no chat allowance units.
  "image-create",
] as const;
export type Feature = (typeof FEATURES)[number];
/** Set by the relay on a metered reply: the browser reports the reply's decrypted token counts under this id. */
export const REQUEST_ID_HEADER = "x-privateai-request";

/** Charge rules: per request, except research-run (a whole run, charged at its start) and the background extras. */
const unitKeys = [
  "chat-fast",
  "chat-thinking",
  "image",
  "voice",
  "research-run",
  "code-followup",
  "retry",
  "background-search",
  "background-attachment",
  "search",
  "page-fetch",
] as const;
const unit = z.number().int().min(0).max(20);
const versionSchema = z
  .object({
    version: z.number().int().min(1),
    effectiveFrom: z.iso.datetime(),
    approvedBy: z.string().min(10).max(600),
    units: z.object(Object.fromEntries(unitKeys.map((key) => [key, unit])) as Record<(typeof unitKeys)[number], typeof unit>).strict(),
    freeCodeFollowUps: z.number().int().min(0).max(5),
    basis: z.record(
      z.string(),
      z.object({ tokensPerUse: z.number().nonnegative(), uses: z.number().int().nonnegative(), source: z.string().min(5) }).strict(),
    ),
  })
  .strict()
  // Requests that reserve allowance cost 1 to 10 units each (shared/contracts.ts); a research run is two requests.
  .refine((v) => ["chat-fast", "chat-thinking", "image", "voice"].every((k) => v.units[k as "image"] >= 1 && v.units[k as "image"] <= 10))
  .refine((v) => v.units["research-run"] >= 2 && v.units["research-run"] <= 20 && v.units.image >= v.units["chat-fast"]);
const price = z
  .object({
    inputPerMillion: z.number().nonnegative().optional(),
    outputPerMillion: z.number().nonnegative().optional(),
    cachedPerMillion: z.number().nonnegative().optional(),
    perAudioMinute: z.number().nonnegative().optional(),
    perImage: z.number().nonnegative().optional(),
  })
  .strict();
export const weightsFileSchema = z
  .object({
    note: z.string(),
    // Dated versions, like the weights: a record is priced by the list in force when it was made.
    prices: z
      .array(
        z
          .object({
            version: z.number().int().min(1),
            effectiveFrom: z.iso.datetime(),
            source: z.string(),
            currency: z.literal("EUR"),
            audioTokensPerMinute: z.number().positive(),
            models: z.record(z.string(), price),
          })
          .strict(),
      )
      .min(1),
    versions: z.array(versionSchema).min(1),
  })
  .strict()
  .refine(
    (file) =>
      [file.versions, file.prices].every((list) =>
        list.every((v, i) => v.version === i + 1 && (i === 0 || v.effectiveFrom > list[i - 1].effectiveFrom)),
      ),
    "Versions must count up from 1 with later effective dates.",
  );
export type WeightsVersion = z.infer<typeof versionSchema>;
export type WeightsFile = z.infer<typeof weightsFileSchema>;
export const usageWeights: WeightsFile = weightsFileSchema.parse(rawWeights);
export type Prices = WeightsFile["prices"][number];
/** The price list in force at `at` (a record's own time): the newest whose date has passed, the first before any. */
export function pricesAt(at = Date.now(), file: WeightsFile = usageWeights): Prices {
  return [...file.prices].reverse().find((p) => Date.parse(p.effectiveFrom) <= at) ?? file.prices[0];
}
/** List-price euros (before VAT) for chat tokens on one model: input, cached input and output each at its own price. */
export function chatEuros(prices: Prices, model: string, promptTokens: number, completionTokens: number, cachedTokens = 0): number | undefined {
  const price = prices.models[model];
  if (price?.inputPerMillion === undefined || price.outputPerMillion === undefined) return undefined;
  return (
    ((promptTokens - cachedTokens) * price.inputPerMillion +
      cachedTokens * (price.cachedPerMillion ?? price.inputPerMillion) +
      completionTokens * price.outputPerMillion) /
    1e6
  );
}

/**
 * The version in force at `now`: the newest whose effective date has passed (version 1 before any),
 * or the version the deployment pins (`inference.metering.weightsVersion`), whatever the date.
 */
export function activeWeights(now = Date.now(), file: WeightsFile = usageWeights, pinned?: number): WeightsVersion {
  if (pinned !== undefined) {
    const version = file.versions.find((v) => v.version === pinned);
    if (!version) throw Error(`Unknown weights version: ${pinned}`);
    return version;
  }
  return [...file.versions].reverse().find((v) => Date.parse(v.effectiveFrom) <= now) ?? file.versions[0];
}
/** The weights version numbers in shared/usage-weights.json (the deployment config may pin one). */
export const WEIGHT_VERSIONS = usageWeights.versions.map((v) => v.version);
/** One weights version by number (records keep theirs), or undefined when the file has none. */
export const weightsVersion = (version: number, file: WeightsFile = usageWeights) => file.versions.find((v) => v.version === version);

const planSchema = z
  .object({
    // The id rule of billing plans (shared/billing.ts), so a plan can later name its billing plan.
    id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    name: z.string().min(1).max(80),
    status: z.string().max(300),
    units: z
      .object({
        period: z.number().int().min(1).max(10_000),
        days: z.number().int().min(1).max(31),
        daily: z.number().int().min(1).max(10_000),
      })
      .strict(),
    // 0 switches the feature off for this plan. Upper bounds follow server/deployment-config.ts.
    caps: z
      .object({
        imagesPerDay: z.number().int().min(0).max(100),
        voiceMinutesPerDay: z.number().int().min(0).max(120),
        researchRunsPerDay: z.number().int().min(0).max(20),
        searchesPerDay: z.number().int().min(0).max(500),
        backgroundTasks: z.number().int().min(0).max(3),
      })
      .strict(),
  })
  .strict()
  // Deep research searches; a plan with research needs searches.
  .refine((p) => !p.caps.researchRunsPerDay || p.caps.searchesPerDay > 0);
export type UsagePlan = z.infer<typeof planSchema>;
export const usagePlans: UsagePlan[] = z
  .object({ note: z.string(), plans: z.array(planSchema).min(1) })
  .strict()
  .refine((file) => new Set(file.plans.map((p) => p.id)).size === file.plans.length)
  .parse(rawPlans).plans;
export const PLAN_IDS = usagePlans.map((p) => p.id);

/** What GET /api/usage/meter returns: the signed-in account's own numbers, nothing else. */
export interface UsageMeterView {
  plan: { id: string; name: string; caps: UsagePlan["caps"] };
  weightsVersion: number;
  units: WeightsVersion["units"];
  freeCodeFollowUps: number;
  /** The allowance period (the "week"); null without an active allowance. */
  week: { used: number; limit: number; remaining: number; resetsAt: string } | null;
  /** Units in the last 24 hours (the daily cap is rolling); `limit` absent without a daily cap. */
  today: { used: number; limit?: number };
  /** This period per feature; tokens only over requests whose browser report was accepted. */
  features: { feature: Feature; requests: number; units: number; tokens: number; reported: number }[];
  /** Requests per capped feature in the last 24 hours. */
  todayCounts: { images: number; researchRuns: number; searches: number };
  /**
   * While voice input is on: the daily voice budget in 2-second units, from the same source as the
   * status's `voice.usedUnits` ("Voice today"); `usedUnits` absent when usage cannot be read.
   */
  voice?: { dailyUnits: number; chunkSeconds: number; usedUnits?: number };
  /** Newest first. A calculation's free code follow-ups are folded into the message that paid for them. */
  recent: { at: number; feature: Feature; units: number; followUps: number; tokens?: number }[];
}

export function planFor(id: string): UsagePlan {
  const plan = usagePlans.find((p) => p.id === id);
  if (!plan) throw Error(`Unknown usage plan: ${id}`);
  return plan;
}
