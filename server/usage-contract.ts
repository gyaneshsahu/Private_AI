import { z } from "zod";
import type { RequestAllowance } from "../shared/contracts";

export const usageId = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const timestamp = z.number().int().nonnegative().max(8_640_000_000_000_000);
export const usageAllowanceSchema = z
  .object({
    accountId: usageId,
    periodId: usageId,
    startsAt: timestamp,
    endsAt: timestamp,
    requestLimit: z.number().int().positive().max(1_000_000),
  })
  .strict()
  .refine(
    (value) => value.endsAt > value.startsAt,
    "Invalid allowance period.",
  );
export const usageOutcome = z.enum(["transport_complete", "uncertain"]);
// Up to 20: deep research is charged whole at its start (owner, 18 November; config cost 2 to 20).
export const usageUnits = z.number().int().min(1).max(20);
/**
 * A request costing N units is one request row plus N-1 unit rows, so weighting needs no
 * schema change. Unit rows are `<requestId>.<n>` ('.' never appears in a usage ID), inserted
 * settled, and never metered, so spend and the unmetered count skip them.
 */
export const unitRowIds = (requestId: string, units: number) =>
  Array.from({ length: units - 1 }, (_, i) => `${requestId}.${i + 2}`);
export const NOT_UNIT_ROW = "r.request_id NOT LIKE '%.%'";
/**
 * A continuation of a run that was already counted (owner, 18 November: a started task always
 * finishes): the deep research answer, and later parts of a started task when the allowance ran out
 * during it. Its row is `run-<uuid>`: dispatched, settled, metered and inside the spend guard like any
 * request, but it is not an allowance unit, so the balance never goes below 0 because of it.
 */
export const RUN_PREFIX = "run-";
export const runRequestId = (uuid: string) => `${RUN_PREFIX}${uuid}`;
export const COUNTED_ROW = "r.request_id NOT LIKE 'run-%'";
/**
 * A voice chunk's request ID carries its voice units (2-second steps of the user's recording):
 * `voice-<units>-<uuid>`. Content-free like the token counts, and durable with the request, so the
 * daily voice budget survives a restart without a schema change.
 */
export const voiceRequestId = (units: number, uuid: string) => `voice-${units}-${uuid}`;
// A later part of a started recording is a continuation (`run-voice-<units>-<uuid>`): its units still
// count toward the daily voice time, but it is never refused for it (owner, 18 November).
export const VOICE_ROWS = "(r.request_id LIKE 'voice-%' OR r.request_id LIKE 'run-voice-%')";
export const voiceUnitsOf = (requestId: string) => Number(/^(?:run-)?voice-(\d+)-/.exec(requestId)?.[1] ?? 0);
type Result<T> = T | Promise<T>;
export type { UsageMetrics } from "./usage-metrics";

export interface UsageLedger {
  summary(accountId: string): Result<RequestAllowance>;
  /** A new allowance period; throws on an overlapping period. */
  createAllowance?(input: z.input<typeof usageAllowanceSchema>): Result<void>;
  /** Starts the owner-set automatic allowance when the account has no current or later period. */
  startAutoAllowance?(accountId: string, days: number, requestLimit: number): Result<boolean>;
  /** Reserves `units` (default 1) of the allowance for one request, all or none (callers ask for at most what is left: server/usage-charge.ts). */
  reserve(accountId: string, requestId: string, units?: number): Result<boolean>;
  /** A `run-` row for a continuation of a counted run: no limit check, needs a current period, not a unit. */
  reserveContinuation?(accountId: string, requestId: string): Result<boolean>;
  /** When the oldest unit counted in the last `windowMs` was reserved (when a rolling daily cap frees up). */
  oldestInLast?(accountId: string, windowMs: number): Result<number | undefined>;
  /** Allowance units this account reserved in the last `windowMs`, whatever their outcome (daily cap). */
  usedInLast?(accountId: string, windowMs: number): Result<number>;
  /** Voice units (from voice request IDs) this account reserved in the last `windowMs` (daily voice budget). */
  voiceUnitsInLast?(accountId: string, windowMs: number): Result<number>;
  dispatch(accountId: string, requestId: string): Result<void>;
  /** Completed-request metering for one of the account's own requests; another account's request ID reads as absent. */
  metrics(
    accountId: string,
    requestId: string,
  ): Result<import("./usage-metrics").UsageMetrics | undefined>;
  /**
   * Settles the request count. `metrics` is the provider's completed-request
   * metering (tokens, model, published cost) and is recorded only with a
   * `transport_complete` outcome; interrupted requests have none.
   */
  /**
   * Spend across all accounts for requests created in [since, until): the sum of
   * metered cost (decimal string) and how many requests have no metered cost.
   * Required wherever chat runs in production (server/app.ts refuses otherwise).
   */
  spend?(
    since: number,
    until: number,
  ): Result<{ meteredUSD: string; unmetered: number }>;
  finish(
    accountId: string,
    requestId: string,
    outcome: z.infer<typeof usageOutcome>,
    metrics?: import("./usage-metrics").UsageMetrics,
  ): Result<void>;
}
