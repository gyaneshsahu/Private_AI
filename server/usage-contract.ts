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
type Result<T> = T | Promise<T>;
export type { UsageMetrics } from "./usage-metrics";

export interface UsageLedger {
  summary(accountId: string): Result<RequestAllowance>;
  reserve(accountId: string, requestId: string): Result<boolean>;
  dispatch(accountId: string, requestId: string): Result<void>;
  /**
   * Settles the request count. `metrics` is the provider's completed-request
   * metering (tokens, model, published cost) and is recorded only with a
   * `transport_complete` outcome; interrupted requests have none.
   */
  finish(
    accountId: string,
    requestId: string,
    outcome: z.infer<typeof usageOutcome>,
    metrics?: import("./usage-metrics").UsageMetrics,
  ): Result<void>;
}
