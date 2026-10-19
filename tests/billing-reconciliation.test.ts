import { expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import Stripe from "stripe";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { billingEventApiVersion } from "../server/billing-events";
import {
  billingReconcilerPrivilegePlan,
  createTestBillingReader,
  reconcileBillingReceipt,
  type BillingReader,
} from "../server/billing-reconciliation";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
function snapshot() {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "sub_synthetic",
    customer: "cus_synthetic",
    livemode: false,
    status: "active",
    pause_collection: null,
    pending_update: null,
    items: {
      has_more: false,
      data: [
        {
          quantity: 1,
          current_period_start: now - 60,
          current_period_end: now + 3600,
          price: { id: "price_synthetic", livemode: false },
        },
      ],
    },
    latest_invoice: {
      id: "in_synthetic",
      customer: "cus_synthetic",
      livemode: false,
      status: "paid",
      amount_remaining: 0,
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: "sub_synthetic" },
      },
    },
    metadata: { never: "DO-NOT-PERSIST" },
  };
}
async function fixture() {
  const db = await usageDatabase({ empty: true });
  await applyAccountMigrations(db.pool);
  const userId = randomUUID();
  await db.pool.query(
    'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,\'\',\'billing@example.test\',true,NOW(),NOW())',
    [userId],
  );
  await db.pool.query(
    "INSERT INTO billing_customer_binding(customer_id,account_id) VALUES('cus_synthetic',$1)",
    [userId],
  );
  let current: unknown = snapshot();
  const reader = {
    subscription: vi.fn(async () => current),
    invoice: vi.fn(async () => snapshot().latest_invoice),
    checkout: vi.fn(async () => ({
      id: "cs_test_synthetic",
      mode: "subscription",
      livemode: false,
      customer: "cus_synthetic",
      subscription: "sub_synthetic",
    })),
  } satisfies BillingReader;
  return {
    db,
    userId,
    reader,
    change: (value: unknown) => {
      current = value;
    },
    async receipt(
      type = "customer.subscription.updated",
      objectId = "sub_synthetic",
      created = 100,
    ) {
      const eventId = `evt_${randomUUID().replaceAll("-", "")}`;
      await db.pool.query(
        "INSERT INTO billing_event_inbox(event_id,event_type,object_id,event_created,api_version,live_mode) VALUES($1,$2,$3,$4,$5,false)",
        [eventId, type, objectId, created, billingEventApiVersion],
      );
      return eventId;
    },
    run(eventId: string, database = db.pool) {
      return reconcileBillingReceipt({
        database,
        reader,
        eventId,
        knownPriceIds: ["price_synthetic"],
      });
    },
  };
}

it("refuses live or missing SDK keys without network", () => {
  expect(() => createTestBillingReader("sk_live_synthetic")).toThrow(
    "test key",
  );
  expect(() => createTestBillingReader("")).toThrow("test key");
});

it("uses pinned SDK GETs with invoice expansion and no automatic retry through an isolated transport", async () => {
  const requests: {
    url: string;
    method: string | undefined;
    version: string | null;
  }[] = [];
  let fail = false;
  const reader = createTestBillingReader(
    "sk_test_synthetic",
    Stripe.createFetchHttpClient(async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url: String(input),
        method: init?.method,
        version: headers.get("Stripe-Version"),
      });
      return new Response(
        JSON.stringify(
          fail
            ? { error: { type: "api_error", message: "synthetic failure" } }
            : snapshot(),
        ),
        {
          status: fail ? 500 : 200,
          headers: { "content-type": "application/json" },
        },
      );
    }),
  );
  await reader.subscription("sub_synthetic");
  await reader.invoice("in_synthetic");
  await reader.checkout("cs_test_synthetic");
  expect(requests.map((r) => new URL(r.url).pathname)).toEqual([
    "/v1/subscriptions/sub_synthetic",
    "/v1/invoices/in_synthetic",
    "/v1/checkout/sessions/cs_test_synthetic",
  ]);
  expect(new URL(requests[0].url).searchParams.get("expand[0]")).toBe(
    "latest_invoice",
  );
  expect(
    requests.every(
      (r) => r.method === "GET" && r.version === billingEventApiVersion,
    ),
  ).toBe(true);
  fail = true;
  await expect(reader.subscription("sub_synthetic")).rejects.toThrow();
  expect(requests).toHaveLength(4);
});

it.skipIf(!enabled)(
  "observes current paid state once across replicas, stores no content and grants no allowance",
  async () => {
    const f = await fixture();
    try {
      const event = await f.receipt();
      const results = await Promise.all([
        f.run(event),
        f.run(event, f.db.connect()),
      ]);
      expect(results.map((r) => r.outcome).sort()).toEqual([
        "active_observed",
        "not_pending",
      ]);
      expect(f.reader.subscription).toHaveBeenCalledTimes(1);
      const saved = (await f.db.pool.query("SELECT * FROM billing_assessment"))
        .rows;
      expect(saved).toHaveLength(1);
      expect(JSON.stringify(saved)).not.toContain("DO-NOT-PERSIST");
      expect(
        (await f.db.pool.query("SELECT count(*)::int n FROM usage_allowances"))
          .rows[0].n,
      ).toBe(0);
      expect(await f.run(event, f.db.connect())).toEqual({
        outcome: "not_pending",
      });
    } finally {
      await f.db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "late old invoice and checkout events retrieve current cancellation instead of restoring access",
  async () => {
    const f = await fixture();
    try {
      await f.run(await f.receipt());
      f.change({
        id: "sub_synthetic",
        customer: "cus_synthetic",
        livemode: false,
        status: "canceled",
      });
      for (const [type, object] of [
        ["invoice.paid", "in_synthetic"],
        ["checkout.session.completed", "cs_test_synthetic"],
      ]) {
        expect(await f.run(await f.receipt(type, object, 1))).toMatchObject({
          outcome: "inactive_observed",
          reason: "canceled",
        });
      }
      expect(f.reader.invoice).toHaveBeenCalledTimes(1);
      expect(f.reader.checkout).toHaveBeenCalledTimes(1);
    } finally {
      await f.db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "rejects wrong customer ownership, closure and cross-object invoice claims",
  async () => {
    const f = await fixture();
    try {
      const wrong = snapshot();
      wrong.latest_invoice.customer = "cus_other";
      f.change(wrong);
      expect(await f.run(await f.receipt())).toMatchObject({
        outcome: "review",
        reason: "invoice_identity_mismatch",
      });
      f.change(snapshot());
      await f.db.pool.query("DELETE FROM billing_customer_binding");
      expect(await f.run(await f.receipt())).toMatchObject({
        outcome: "review",
        reason: "unbound_or_closed_account",
      });
      await f.db.pool.query(
        "INSERT INTO billing_customer_binding(customer_id,account_id) VALUES('cus_synthetic',$1)",
        [f.userId],
      );
      await f.db.pool.query(
        'INSERT INTO account_closure("userId") VALUES($1)',
        [f.userId],
      );
      expect(await f.run(await f.receipt())).toMatchObject({
        outcome: "review",
        reason: "unbound_or_closed_account",
      });
      await f.db.pool.query('DELETE FROM "user" WHERE id=$1', [f.userId]);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_customer_binding",
          )
        ).rows[0].n,
      ).toBe(1);
      expect(await f.run(await f.receipt())).toMatchObject({
        outcome: "review",
        reason: "unbound_or_closed_account",
      });
    } finally {
      await f.db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "holds unsupported plans, periods, unpaid invoices, pending changes and live objects for review",
  async () => {
    const f = await fixture();
    try {
      const variants = [
        { ...snapshot(), livemode: true },
        { ...snapshot(), status: "trialing" },
        { ...snapshot(), pause_collection: { behavior: "void" } },
        { ...snapshot(), pending_update: { expires_at: 99 } },
        {
          ...snapshot(),
          items: { has_more: true, data: snapshot().items.data },
        },
        {
          ...snapshot(),
          items: {
            has_more: false,
            data: [{ ...snapshot().items.data[0], quantity: 2 }],
          },
        },
        {
          ...snapshot(),
          items: {
            has_more: false,
            data: [
              {
                ...snapshot().items.data[0],
                price: { id: "price_other", livemode: false },
              },
            ],
          },
        },
        {
          ...snapshot(),
          items: {
            has_more: false,
            data: [{ ...snapshot().items.data[0], current_period_end: 1 }],
          },
        },
        {
          ...snapshot(),
          latest_invoice: {
            ...snapshot().latest_invoice,
            status: "open",
            amount_remaining: 12,
          },
        },
      ];
      for (const value of variants) {
        f.change(value);
        expect((await f.run(await f.receipt())).outcome).toBe("review");
      }
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox WHERE state='blocked'",
          )
        ).rows[0].n,
      ).toBe(variants.length);
    } finally {
      await f.db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "does not resolve refund/dispute policy by guessing or reading an unrelated subscription",
  async () => {
    const f = await fixture();
    try {
      for (const [type, object] of [
        ["charge.refunded", "ch_synthetic"],
        ["charge.dispute.created", "dp_synthetic"],
        ["charge.dispute.closed", "dp_synthetic"],
      ]) {
        expect(await f.run(await f.receipt(type, object))).toEqual({
          outcome: "review",
          reason: "refund_or_dispute_requires_policy",
        });
      }
      expect(f.reader.subscription).not.toHaveBeenCalled();
    } finally {
      await f.db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "retains failed reads without automatic retry and records explicit later attempt",
  async () => {
    const f = await fixture();
    try {
      const event = await f.receipt();
      f.reader.subscription.mockRejectedValueOnce(
        Error("SECRET provider response"),
      );
      expect(await f.run(event)).toEqual({
        outcome: "unavailable",
        reason: "provider_read_unconfirmed",
      });
      expect(f.reader.subscription).toHaveBeenCalledTimes(1);
      expect(
        (
          await f.db.pool.query(
            "SELECT state FROM billing_event_inbox WHERE event_id=$1",
            [event],
          )
        ).rows[0].state,
      ).toBe("pending");
      expect(await f.run(event)).toMatchObject({ outcome: "active_observed" });
      const rows = (
        await f.db.pool.query(
          "SELECT * FROM billing_assessment ORDER BY attempt",
        )
      ).rows;
      expect(rows.map((row) => [row.attempt, row.outcome])).toEqual([
        [1, "unavailable"],
        [2, "active_observed"],
      ]);
      expect(JSON.stringify(rows)).not.toContain("SECRET");
    } finally {
      await f.db.dispose();
    }
  },
);

it.skipIf(!enabled)(
  "bounds hung provider read and never persists its late completion",
  async () => {
    const f = await fixture();
    try {
      let resolve!: (value: unknown) => void;
      f.reader.subscription.mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      const event = await f.receipt();
      expect(await f.run(event)).toMatchObject({ outcome: "unavailable" });
      resolve(snapshot());
      await new Promise((done) => setTimeout(done, 10));
      expect(
        (await f.db.pool.query("SELECT outcome FROM billing_assessment"))
          .rows[0].outcome,
      ).toBe("unavailable");
    } finally {
      await f.db.dispose();
    }
  },
  10000,
);

it.skipIf(!enabled)("quarantine prevents even provider reads", async () => {
  const f = await fixture();
  try {
    const event = await f.receipt();
    await f.db.pool.query(
      "UPDATE account_recovery_control SET mode='quarantined'",
    );
    await expect(f.run(event)).rejects.toThrow("quarantine");
    expect(f.reader.subscription).not.toHaveBeenCalled();
    expect(
      (await f.db.pool.query("SELECT count(*)::int n FROM billing_assessment"))
        .rows[0].n,
    ).toBe(0);
  } finally {
    await f.db.dispose();
  }
});

it.skipIf(!enabled)(
  "restricted reconciler can assess but cannot bind customers, grant usage or read credentials",
  async () => {
    const f = await fixture();
    const role = `pa_reconcile_${randomUUID().replaceAll("-", "")}`;
    const password = randomBytes(24).toString("hex");
    let limited: Pool | undefined;
    try {
      const schema = (await f.db.pool.query("SELECT current_schema() AS name"))
        .rows[0].name;
      await f.db.pool.query(
        `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
      for (const sql of billingReconcilerPrivilegePlan(schema, role))
        await f.db.pool.query(sql);
      const url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG!);
      url.username = role;
      url.password = password;
      limited = new Pool({
        connectionString: url.toString(),
        options: `-c search_path=${schema}`,
      });
      expect(await f.run(await f.receipt(), limited)).toMatchObject({
        outcome: "active_observed",
      });
      await expect(limited.query('SELECT email FROM "user"')).rejects.toThrow(
        "permission denied",
      );
      await expect(
        limited.query("DELETE FROM billing_customer_binding"),
      ).rejects.toThrow("permission denied");
      await expect(
        limited.query(
          "INSERT INTO usage_accounts(account_id) VALUES('forbidden')",
        ),
      ).rejects.toThrow("permission denied");
      await expect(
        limited.query("UPDATE billing_event_inbox SET object_id='sub_other'"),
      ).rejects.toThrow("permission denied");
    } finally {
      await limited?.end();
      await f.db.pool.query(`DROP OWNED BY "${role}"`);
      await f.db.pool.query(`DROP ROLE "${role}"`);
      await f.db.dispose();
    }
  },
);
