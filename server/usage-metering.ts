// Usage metering at the relay (docs/usage-metering-20261115.md), switched on by `inference.metering`.
// - Charges: the newest version of shared/usage-weights.json replaces the allowance costs in the
//   report (modes, vision, speech) and the deep-research cost, so one file sets every weight.
// - Records: one usage record per forwarded request (feature, units, weight version, encrypted byte
//   sizes, duration, model). The relay cannot read tokens: Privatemode encrypts them with the reply.
// - Reports: the browser reads the token counts from the decrypted reply and posts them under the
//   request id the relay gave it. They are checked against what the relay measured and stored as
//   accepted or flagged. They never change what was charged.
// - Meter: the signed-in account's own units, per feature, and its last requests.
import express, { type Response } from "express";
import {
  activeWeights,
  planFor,
  type Feature,
  type UsageMeterView,
  type UsagePlan,
  type WeightsVersion,
} from "../shared/usage-config";
import { largestOutputLimit, tierFor, validateQualification, type AnswerMode, type Qualification, type RequestAllowance } from "../shared/contracts";
import type { ResearchStep } from "../shared/deep-research";
import { count } from "./counters";
import type { UsageLedger } from "./usage-contract";
import { implausible, PLAUSIBILITY, usageReportSchema, type NewUsageRecord, type UsageRecord, type UsageRecords } from "./usage-records";

export interface MeteringConfig {
  /** A plan id from shared/usage-plans.json. */
  plan: string;
  /** Pins a version of shared/usage-weights.json; absent, the newest version whose date has passed. */
  weightsVersion?: number;
  records: UsageRecords;
}

/** The weights charging at `now` under this config (the pinned version, or the newest in force). */
export const meteringWeights = (config: Pick<MeteringConfig, "weightsVersion">, now = Date.now()) =>
  activeWeights(now, undefined, config.weightsVersion);

const DAY = 86_400_000;

/** The report with the weights of `w` as its allowance costs; undefined (chat refused) if that makes it invalid. */
export function withWeights(q: Qualification, w: WeightsVersion): Qualification | undefined {
  try {
    return validateQualification({
      ...q,
      ...(q.modes
        ? {
            modes: {
              fast: { ...q.modes.fast, allowanceCost: w.units["chat-fast"] },
              thinking: { ...q.modes.thinking, allowanceCost: w.units["chat-thinking"] },
            },
          }
        : {}),
      ...(q.vision ? { vision: { ...q.vision, allowanceCost: w.units.image } } : {}),
      ...(q.speech ? { speech: { ...q.speech, allowanceCost: w.units.voice } } : {}),
    });
  } catch {
    return undefined;
  }
}

/** The feature of a paid chat request, from what the request declared to the relay. */
export function chatFeature(research: ResearchStep | undefined, image: boolean, mode: AnswerMode | undefined): Feature {
  if (research) return `research-${research}`;
  if (image) return "image";
  return mode === "thinking" ? "chat-thinking" : "chat-fast";
}

const tokens = (r: UsageRecord) => (r.report === "accepted" ? (r.promptTokens ?? 0) + (r.completionTokens ?? 0) : undefined);

/** The meter for one account from its records since the period start (pure; tested offline). */
export function meterView(input: {
  records: UsageRecord[];
  summary: RequestAllowance;
  todayUsed: number;
  dailyLimit?: number;
  plan: UsagePlan;
  weights: WeightsVersion;
  periodStart: number;
  now: number;
  recentCount?: number;
  voice?: UsageMeterView["voice"];
}): UsageMeterView {
  const { records, summary, now, weights } = input;
  const inPeriod = records.filter((r) => r.createdAt >= input.periodStart);
  const features = new Map<Feature, UsageMeterView["features"][number]>();
  for (const r of inPeriod) {
    const row = features.get(r.feature) ?? { feature: r.feature, requests: 0, units: 0, tokens: 0, reported: 0 };
    row.requests++;
    row.units += r.units;
    const used = tokens(r);
    if (used !== undefined) {
      row.tokens += used;
      row.reported++;
    }
    features.set(r.feature, row);
  }
  const lastDay = records.filter((r) => r.createdAt > now - DAY);
  const counted = (feature: Feature) => lastDay.filter((r) => r.feature === feature).length;
  // A code follow-up rides on the paid message before it (within the credit's 90 s, with room for the run).
  const groups: UsageMeterView["recent"] = [];
  let paid: { at: number; feature: Feature } | undefined;
  for (const r of records) {
    const last = groups.at(-1);
    if (r.feature === "code-followup" && last && paid && r.createdAt - paid.at <= 5 * 60_000) {
      last.followUps++;
      last.units += r.units;
      const used = tokens(r);
      last.tokens = last.tokens === undefined || used === undefined ? undefined : last.tokens + used;
      continue;
    }
    groups.push({ at: r.createdAt, feature: r.feature, units: r.units, followUps: 0, ...(tokens(r) !== undefined ? { tokens: tokens(r) } : {}) });
    paid = r.feature.startsWith("chat-") ? { at: r.createdAt, feature: r.feature } : undefined;
  }
  return {
    plan: { id: input.plan.id, name: input.plan.name, caps: input.plan.caps },
    weightsVersion: weights.version,
    units: weights.units,
    freeCodeFollowUps: weights.freeCodeFollowUps,
    week:
      summary.state === "unavailable"
        ? null
        : { used: summary.used, limit: summary.limit, remaining: summary.remaining, resetsAt: summary.resetsAt },
    today: { used: input.todayUsed, ...(input.dailyLimit ? { limit: input.dailyLimit } : {}) },
    features: [...features.values()].sort((a, b) => b.units - a.units || b.requests - a.requests),
    todayCounts: { images: counted("image"), researchRuns: counted("research-plan"), searches: counted("search") },
    recent: groups.slice(-(input.recentCount ?? 8)).reverse(),
    ...(input.voice ? { voice: input.voice } : {}),
  };
}

/** The output limit a report is checked against: the feature's own mode where it has one. */
function outputLimit(q: Qualification | undefined, feature: Feature): number | undefined {
  if (!q) return undefined;
  const fast = ["chat-fast", "image", "research-plan"].includes(feature);
  const thinking = ["chat-thinking", "research-answer"].includes(feature);
  return fast ? tierFor(q, "fast").maxOutputTokens : thinking ? tierFor(q, "thinking").maxOutputTokens : largestOutputLimit(q);
}

export function createMetering(deps: {
  config: MeteringConfig;
  usage?: UsageLedger;
  /** The weighted report (or undefined while chat is not qualified). */
  qualification: () => Qualification | undefined;
  dailyLimit?: number;
  accountOf: (res: Response) => string | undefined;
  /**
   * While voice input is on: its daily budget and the units used, read exactly as the status reads
   * them for "Voice today", so the meter and the microphone show the same numbers.
   */
  voice?: { dailyUnits: number; chunkSeconds: number; on: () => boolean; used: (res: Response) => Promise<number> };
  now?: () => number;
}) {
  const { records } = deps.config;
  const plan = planFor(deps.config.plan);
  // An unknown pinned weights version stops the server at start, never later inside a request.
  meteringWeights(deps.config);
  const now = deps.now ?? Date.now;
  const weights = () => meteringWeights(deps.config, now());
  const router = express.Router();

  router.post("/api/usage/report", async (req, res) => {
    const who = deps.accountOf(res);
    const parsed = usageReportSchema.safeParse(req.body);
    if (!who || !parsed.success) return void res.status(400).json({ error: "Invalid usage report." });
    try {
      const record = await records.get(who, parsed.data.requestId);
      if (!record) return void res.status(404).json({ error: "Unknown request." });
      if (record.report !== "none") return void res.status(409).json({ error: "Already reported." });
      // Voice is measured by the relay (the chunk's 2-second units, checked against its size) and
      // billed by audio length: the browser has nothing to add.
      if (record.feature === "voice") return void res.status(409).json({ error: "Voice usage is measured by the server." });
      if (now() - record.createdAt > PLAUSIBILITY.reportWindowMs) {
        count("metering.report_late");
        return void res.status(410).json({ error: "Report window closed." });
      }
      const note = implausible(record, parsed.data, outputLimit(deps.qualification(), record.feature));
      await records.report(who, parsed.data.requestId, parsed.data, note ? "flagged" : "accepted", note);
      count(note ? `metering.report_flagged_${note}` : "metering.report_accepted");
      res.status(204).end();
    } catch {
      res.status(503).json({ error: "Usage records unavailable." });
    }
  });

  router.get("/api/usage/meter", async (_req, res) => {
    const who = deps.accountOf(res);
    if (!who) return void res.status(401).json({ error: "Sign in to see your usage." });
    try {
      const at = now();
      const summary: RequestAllowance = deps.usage ? await deps.usage.summary(who) : { state: "unavailable" };
      // The period started `days` before it resets (the automatic allowance); without one, the last 7 days.
      const periodStart = summary.state === "unavailable" ? at - 7 * DAY : Date.parse(summary.resetsAt) - plan.units.days * DAY;
      const view = meterView({
        records: await records.since(who, Math.min(periodStart, at - DAY)),
        summary,
        todayUsed: (await deps.usage?.usedInLast?.(who, DAY)) ?? 0,
        dailyLimit: deps.dailyLimit,
        plan,
        weights: weights(),
        periodStart,
        now: at,
        ...(deps.voice && deps.voice.on()
          ? {
              voice: {
                dailyUnits: deps.voice.dailyUnits,
                chunkSeconds: deps.voice.chunkSeconds,
                ...(await deps.voice.used(res).then(
                  (usedUnits) => ({ usedUnits }),
                  () => ({}),
                )),
              },
            }
          : {}),
      });
      res.json(view);
    } catch {
      res.status(503).json({ error: "Usage is unavailable right now." });
    }
  });

  return {
    plan,
    weights,
    router,
    /** Records one forwarded request; never throws and never delays the reply. */
    record(input: Omit<NewUsageRecord, "weightVersion">) {
      void Promise.resolve()
        .then(() => records.record({ ...input, weightVersion: weights().version }))
        .catch(() => count("metering.record_failed"));
    },
  };
}
export type Metering = ReturnType<typeof createMetering>;
