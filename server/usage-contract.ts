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
export const usageUnits = z.number().int().min(1).max(10);
/**
 * A request costing N units is one request row plus N-1 unit rows, so weighting needs no
 * schema change. Unit rows are `<requestId>.<n>` ('.' never appears in a usage ID), inserted
 * settled, and never metered, so spend and the unmetered count skip them.
 */
export const unitRowIds = (requestId: string, units: number) =>
  Array.from({ length: units - 1 }, (_, i) => `${requestId}.${i + 2}`);
export const NOT_UNIT_ROW = "r.request_id NOT LIKE '%.%'";
type Result<T> = T | Promise<T>;
export type { UsageMetrics } from "./usage-metrics";

export interface UsageLedger {
  summary(accountId: string): Result<RequestAllowance>;
  /** A new allowance period; throws on an overlapping period. */
  createAllowance?(input: z.input<typeof usageAllowanceSchema>): Result<void>;
  /** Starts the owner-set automatic allowance when the account has no current or later period. */
  startAutoAllowance?(accountId: string, days: number, requestLimit: number): Result<boolean>;
  /** Reserves `units` (default 1) of the allowance for one request, all or none. */
  reserve(accountId: string, requestId: string, units?: number): Result<boolean>;
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
