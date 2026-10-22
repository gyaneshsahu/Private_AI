import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { BillingPlan } from "../shared/billing";
import {
  applyBillingEntitlement,
  entitlementPeriodId,
  entitlementTerms,
  grantEntitlement,
} from "../server/billing-entitlement";
import { SqliteUsageLedger } from "../server/usage-ledger";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { billingEventApiVersion } from "../server/billing-events";
import { usageDatabase } from "./fixtures/usage-postgres";

const day = 86_400_000;
const plan: BillingPlan = {
  id: "rehearsal-monthly",
  name: "Rehearsal monthly",
  priceId: "price_synthetic",
  amountMinor: 500,
  currency: "EUR",
  interval: "month",
};
const nowMs = 1_800_000_000_000;
const periodEnd = Math.floor(nowMs / 1000) + 20 * 86_400;
const receipt = {
  accountId: "alice",
  subscriptionId: "sub_synthetic",
  priceId: "price_synthetic",
  periodEnd,
  liveMode: false,
  outcome: "active_observed",
};

it("defines the rehearsal plan terms in code", () => {
  expect(entitlementTerms["rehearsal-monthly"]).toEqual({
    name: "Rehearsal monthly",
    requestLimit: 200,
    periodMs: 31 * day,
  });
  expect(entitlementPeriodId(receipt)).toBe(`ent-sub_synthetic-${periodEnd}`);
});

it("grants once per subscription period through the SQLite ledger and refuses everything else", async () => {
  let clock = nowMs;
  const ledger = new SqliteUsageLedger(":memory:", () => clock);
  const run = (
    override: Partial<typeof receipt> = {},
    extra: Partial<Parameters<typeof grantEntitlement>[0]> = {},
  ) =>
    grantEntitlement({
      ledger,
      plans: [plan],
      receipt: { ...receipt, ...override },
      now: () => clock,
      ...extra,
    });
  try {
    expect(await run({ liveMode: true })).toEqual({
      outcome: "refused",
      reason: "live_mode_never_entitled",
    });
    expect(await run({ outcome: "inactive_observed" })).toEqual({
      outcome: "refused",
      reason: "assessment_not_active",
    });
    expect(await run({ priceId: "price_other" })).toEqual({
      outcome: "refused",
      reason: "unknown_price",
    });
    expect(await run({}, { plans: [{ ...plan, id: "unknown-plan" }] })).toEqual(
      { outcome: "refused", reason: "no_entitlement_terms" },
    );
    expect(
      await run({ periodEnd: Math.floor(nowMs / 1000) - 1 }),
    ).toMatchObject({ outcome: "refused", reason: "period_not_current" });
    expect(ledger.summary("alice")).toEqual({ state: "unavailable" });

    const granted = await run();
    expect(granted).toEqual({
      outcome: "granted",
      periodId: `ent-sub_synthetic-${periodEnd}`,
      plan: "rehearsal-monthly",
      requestLimit: 200,
      startsAt: periodEnd * 1000 - 31 * day,
      endsAt: periodEnd * 1000,
    });
    expect(ledger.summary("alice")).toMatchObject({
      state: "active",
      limit: 200,
      used: 0,
      resetsAt: new Date(periodEnd * 1000).toISOString(),
    });
    // The same receipt, or another receipt for the same period, grants nothing more.
    expect(await run()).toEqual({
      outcome: "already_granted",
      periodId: `ent-sub_synthetic-${periodEnd}`,
      plan: "rehearsal-monthly",
      requestLimit: 200,
    });
    expect(ledger.reserve("alice", "r1")).toBe(true);
    expect(ledger.summary("alice")).toMatchObject({ used: 1, limit: 200 });

    // Renewal after a short provider month continues from the previous end, no overlap, no gap.
    const renewal = periodEnd + 28 * 86_400;
    const extended = await run({ periodEnd: renewal });
    expect(extended).toMatchObject({
      outcome: "granted",
      periodId: `ent-sub_synthetic-${renewal}`,
      startsAt: periodEnd * 1000,
      endsAt: renewal * 1000,
    });
    clock = periodEnd * 1000 + 1;
    expect(ledger.summary("alice")).toMatchObject({
      state: "active",
      used: 0,
      limit: 200,
      resetsAt: new Date(renewal * 1000).toISOString(),
    });

    // An allowance the entitlement step did not create is never overwritten or extended.
    clock = nowMs;
    ledger.createAllowance({
      accountId: "bob",
      periodId: "operator-grant",
      startsAt: 0,
      endsAt: periodEnd * 1000 + 10 * day,
      requestLimit: 5,
    });
    expect(await run({ accountId: "bob", subscriptionId: "sub_bob" })).toEqual({
      outcome: "refused",
      reason: "overlapping_allowance",
      periodId: `ent-sub_bob-${periodEnd}`,
    });
    expect(ledger.summary("bob")).toMatchObject({ limit: 5 });
    expect(
      await run({
        accountId: "bob",
        subscriptionId: "sub_bob",
        periodEnd: periodEnd + 10 * 86_400,
      }),
    ).toMatchObject({ outcome: "refused", reason: "period_already_covered" });
    await expect(run({ subscriptionId: "sub_live;drop" })).rejects.toThrow();
  } finally {
    ledger.close();
  }
});

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
it.skipIf(!enabled)(
  "turns a reconciled active test-mode receipt into a PostgreSQL allowance exactly once",
  async () => {
    const db = await usageDatabase({ empty: true });
    try {
      await applyAccountMigrations(db.pool);
      const ledger = new PostgresUsageLedger(db.pool, () => nowMs);
      const userId = randomUUID();
      await db.pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,\'\',\'entitlement@example.test\',true,NOW(),NOW())',
        [userId],
      );
      await db.pool.query(
        "INSERT INTO billing_customer_binding(customer_id,account_id) VALUES('cus_synthetic',$1)",
        [userId],
      );
      const inbox = async (
        state: "pending" | "reconciled" | "blocked",
        assessment?: {
          outcome: string;
          subscriptionId?: string;
          priceId?: string;
        },
      ) => {
        const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
        await db.pool.query(
          "INSERT INTO billing_event_inbox(event_id,event_type,object_id,event_created,api_version,live_mode,state) VALUES($1,'customer.subscription.updated','sub_synthetic',100,$2,false,$3)",
          [eventId, billingEventApiVersion, state],
        );
        if (assessment)
          await db.pool.query(
            `INSERT INTO billing_assessment(event_id,outcome,reason,subscription_id,customer_id,price_id,period_end,attempt)
            VALUES($1,$2,'synthetic',$3,'cus_synthetic',$4,$5,1)`,
            [
              eventId,
              assessment.outcome,
              assessment.subscriptionId ?? "sub_synthetic",
              assessment.priceId ?? "price_synthetic",
              periodEnd,
            ],
          );
        return eventId;
      };
      const apply = (eventId: string) =>
        applyBillingEntitlement({
          database: db.pool,
          ledger,
          eventId,
          plans: [plan],
          now: () => nowMs,
        });
      expect(await apply("evt_missing")).toEqual({
        outcome: "refused",
        reason: "receipt_unknown",
      });
      expect(await apply(await inbox("pending"))).toEqual({
        outcome: "refused",
        reason: "receipt_not_reconciled",
      });
      expect(
        await apply(await inbox("blocked", { outcome: "review" })),
      ).toEqual({ outcome: "refused", reason: "receipt_not_reconciled" });
      expect(
        await apply(
          await inbox("reconciled", { outcome: "inactive_observed" }),
        ),
      ).toEqual({ outcome: "refused", reason: "assessment_not_active" });
      expect(await ledger.summary(userId)).toEqual({ state: "unavailable" });

      const active = await inbox("reconciled", { outcome: "active_observed" });
      expect(await apply(active)).toEqual({
        outcome: "granted",
        periodId: `ent-sub_synthetic-${periodEnd}`,
        plan: "rehearsal-monthly",
        requestLimit: 200,
        startsAt: periodEnd * 1000 - 31 * day,
        endsAt: periodEnd * 1000,
      });
      expect(await ledger.summary(userId)).toMatchObject({
        state: "active",
        limit: 200,
        used: 0,
      });
      const replays = await Promise.all([
        apply(active),
        apply(await inbox("reconciled", { outcome: "active_observed" })),
      ]);
      expect(replays.map((r) => r.outcome)).toEqual([
        "already_granted",
        "already_granted",
      ]);
      expect(
        (
          await db.pool.query(
            "SELECT count(*)::int AS n FROM usage_allowances WHERE account_id=$1",
            [userId],
          )
        ).rows[0].n,
      ).toBe(1);
      // Assessments are read, never consumed or rewritten.
      expect(
        (
          await db.pool.query(
            "SELECT count(*)::int AS n FROM billing_assessment WHERE outcome='active_observed'",
          )
        ).rows[0].n,
      ).toBe(2);
      await db.pool.query('INSERT INTO account_closure("userId") VALUES($1)', [
        userId,
      ]);
      expect(
        await apply(
          await inbox("reconciled", {
            outcome: "active_observed",
            subscriptionId: "sub_renewed",
          }),
        ),
      ).toEqual({ outcome: "refused", reason: "unbound_or_closed_account" });
      await db.pool.query(
        "UPDATE account_recovery_control SET mode='quarantined'",
      );
      await expect(apply(active)).rejects.toThrow("Recovery quarantine");
    } finally {
      await db.dispose();
    }
  },
);
