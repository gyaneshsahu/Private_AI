import type { Pool } from "pg";
import { z } from "zod";
import { billingPlanSchema, type BillingPlan } from "../shared/billing";
import { usageId } from "./usage-contract";

/**
 * Entitlement: the step after receipt reconciliation. An `active_observed`
 * test-mode assessment for a known plan becomes a request allowance in the
 * usage ledger, once per subscription period. Nothing here reads the
 * provider, grants chat access or touches live mode.
 */
export interface EntitlementTerms {
  name: string;
  requestLimit: number;
  /** Nominal period length; the allowance never starts before the account's previous one ends. */
  periodMs: number;
}

const day = 86_400_000;
/** Plan table in code. Keys are `BillingPlan.id`; prices come from the configured plan list. */
export const entitlementTerms: Readonly<Record<string, EntitlementTerms>> = {
  "rehearsal-monthly": {
    name: "Rehearsal monthly",
    requestLimit: 200,
    periodMs: 31 * day,
  },
};

/** The ledger surface entitlement needs; both ledgers provide it. */
export interface EntitlementLedger {
  createAllowance(input: {
    accountId: string;
    periodId: string;
    startsAt: number;
    endsAt: number;
    requestLimit: number;
  }): void | Promise<void>;
  hasAllowance(periodId: string): boolean | Promise<boolean>;
  lastAllowanceEnd(
    accountId: string,
    endsAt: number,
  ): number | undefined | Promise<number | undefined>;
}

export const entitlementReceiptSchema = z
  .object({
    accountId: usageId,
    subscriptionId: z.string().regex(/^sub_[A-Za-z0-9_]{1,80}$/),
    priceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
    /** Unix seconds, as Stripe reports `current_period_end`. */
    periodEnd: z.number().int().positive().max(8_640_000_000_000),
    liveMode: z.boolean(),
    outcome: z.string(),
  })
  .strict();
export type EntitlementReceipt = z.infer<typeof entitlementReceiptSchema>;

export type EntitlementResult =
  | {
      outcome: "granted";
      periodId: string;
      plan: string;
      requestLimit: number;
      startsAt: number;
      endsAt: number;
    }
  | {
      outcome: "already_granted";
      periodId: string;
      plan: string;
      requestLimit: number;
    }
  | { outcome: "refused"; reason: string; periodId?: string };

/** Deterministic per subscription period, so repeated receipts cannot grant twice. */
export function entitlementPeriodId(receipt: {
  subscriptionId: string;
  periodEnd: number;
}): string {
  return `ent-${receipt.subscriptionId}-${receipt.periodEnd}`;
}

/**
 * Idempotent, ledger-agnostic grant. Refuses live mode, non-active
 * assessments, unknown prices, plans without terms, past periods and any
 * overlap with an allowance it did not create.
 */
export async function grantEntitlement(config: {
  ledger: EntitlementLedger;
  plans: readonly BillingPlan[];
  receipt: EntitlementReceipt;
  terms?: Readonly<Record<string, EntitlementTerms>>;
  now?: () => number;
}): Promise<EntitlementResult> {
  const receipt = entitlementReceiptSchema.parse(config.receipt);
  const plans = config.plans.map((plan) => billingPlanSchema.parse(plan));
  const terms = config.terms ?? entitlementTerms;
  const now = config.now?.() ?? Date.now();
  if (receipt.liveMode)
    return { outcome: "refused", reason: "live_mode_never_entitled" };
  if (receipt.outcome !== "active_observed")
    return { outcome: "refused", reason: "assessment_not_active" };
  const plan = plans.find((candidate) => candidate.priceId === receipt.priceId);
  if (!plan) return { outcome: "refused", reason: "unknown_price" };
  const term = Object.hasOwn(terms, plan.id) ? terms[plan.id] : undefined;
  if (
    !term ||
    !Number.isSafeInteger(term.requestLimit) ||
    term.requestLimit < 1 ||
    !Number.isSafeInteger(term.periodMs) ||
    term.periodMs < 1
  )
    return { outcome: "refused", reason: "no_entitlement_terms" };
  const periodId = entitlementPeriodId(receipt);
  if (!usageId.safeParse(periodId).success)
    return { outcome: "refused", reason: "subscription_id_unusable" };
  const endsAt = receipt.periodEnd * 1000;
  if (endsAt <= now)
    return { outcome: "refused", reason: "period_not_current", periodId };
  const alreadyGranted: EntitlementResult = {
    outcome: "already_granted",
    periodId,
    plan: plan.id,
    requestLimit: term.requestLimit,
  };
  if (await config.ledger.hasAllowance(periodId)) return alreadyGranted;
  // Renewals continue from the previous allowance; a shorter provider month
  // must not overlap it and a longer one must not leave a gap before it.
  const previousEnd = await config.ledger.lastAllowanceEnd(
    receipt.accountId,
    endsAt,
  );
  const startsAt = Math.max(
    endsAt - term.periodMs,
    previousEnd ?? Number.NEGATIVE_INFINITY,
    0,
  );
  if (startsAt >= endsAt)
    return { outcome: "refused", reason: "period_already_covered", periodId };
  try {
    await config.ledger.createAllowance({
      accountId: receipt.accountId,
      periodId,
      startsAt,
      endsAt,
      requestLimit: term.requestLimit,
    });
  } catch (error) {
    if (await config.ledger.hasAllowance(periodId)) return alreadyGranted;
    if (error instanceof Error && /Overlapping allowance/.test(error.message))
      return { outcome: "refused", reason: "overlapping_allowance", periodId };
    throw error;
  }
  return {
    outcome: "granted",
    periodId,
    plan: plan.id,
    requestLimit: term.requestLimit,
    startsAt,
    endsAt,
  };
}

/**
 * PostgreSQL step: reads the latest assessment of one reconciled test-mode
 * receipt, resolves the bound open account and grants through the ledger.
 * Assessments stay untouched; the allowance row is the durable record.
 */
export async function applyBillingEntitlement(config: {
  database: Pool;
  ledger: EntitlementLedger;
  eventId: string;
  plans: readonly BillingPlan[];
  terms?: Readonly<Record<string, EntitlementTerms>>;
  now?: () => number;
}): Promise<EntitlementResult> {
  z.string()
    .regex(/^evt_[A-Za-z0-9]{1,200}$/)
    .parse(config.eventId);
  const client = await config.database.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout='5s'");
    await client.query("SET LOCAL lock_timeout='2s'");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext(current_schema()), 73513)",
    );
    const gate = await client.query(
      "SELECT mode FROM account_recovery_control WHERE singleton=true FOR SHARE",
    );
    if (gate.rows[0]?.mode !== "normal") throw Error("Recovery quarantine");
    const receipt = (
      await client.query(
        `SELECT i.state,i.live_mode,a.outcome,a.customer_id,a.subscription_id,a.price_id,a.period_end
        FROM billing_event_inbox i
        LEFT JOIN LATERAL (SELECT * FROM billing_assessment WHERE event_id=i.event_id ORDER BY attempt DESC LIMIT 1) a ON true
        WHERE i.event_id=$1`,
        [config.eventId],
      )
    ).rows[0] as
      | {
          state: string;
          live_mode: boolean;
          outcome: string | null;
          customer_id: string | null;
          subscription_id: string | null;
          price_id: string | null;
          period_end: string | number | null;
        }
      | undefined;
    if (!receipt) {
      await client.query("COMMIT");
      return { outcome: "refused", reason: "receipt_unknown" };
    }
    if (receipt.live_mode) {
      await client.query("COMMIT");
      return { outcome: "refused", reason: "live_mode_never_entitled" };
    }
    if (receipt.state !== "reconciled" || !receipt.outcome) {
      await client.query("COMMIT");
      return { outcome: "refused", reason: "receipt_not_reconciled" };
    }
    if (
      receipt.outcome !== "active_observed" ||
      !receipt.customer_id ||
      !receipt.subscription_id ||
      !receipt.price_id ||
      receipt.period_end == null
    ) {
      await client.query("COMMIT");
      return { outcome: "refused", reason: "assessment_not_active" };
    }
    const binding = await client.query(
      `SELECT b.account_id::text AS account_id FROM billing_customer_binding b
      JOIN "user" u ON u.id=b.account_id WHERE b.customer_id=$1
      AND NOT EXISTS(SELECT 1 FROM account_closure c WHERE c."userId"=b.account_id) FOR SHARE OF b,u`,
      [receipt.customer_id],
    );
    if (!binding.rowCount) {
      await client.query("COMMIT");
      return { outcome: "refused", reason: "unbound_or_closed_account" };
    }
    const result = await grantEntitlement({
      ledger: config.ledger,
      plans: config.plans,
      terms: config.terms,
      now: config.now,
      receipt: {
        accountId: String(binding.rows[0].account_id),
        subscriptionId: receipt.subscription_id,
        priceId: receipt.price_id,
        periodEnd: Number(receipt.period_end),
        liveMode: false,
        outcome: receipt.outcome,
      },
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
