import { it, expect } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import Stripe from "stripe";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import {
  billingEventApiVersion,
  billingReceiverPrivilegePlan,
  createSyntheticBillingReceiver,
} from "../server/billing-events";

const enabled = !!process.env.PRIVATEAI_SYNTHETIC_PG;
const secret = `whsec_${randomBytes(32).toString("hex")}`;
const event = (overrides: Record<string, unknown> = {}) => ({
  id: `evt_${randomUUID().replaceAll("-", "")}`,
  object: "event",
  type: "invoice.paid",
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  api_version: billingEventApiVersion,
  data: {
    object: {
      id: "in_synthetic",
      customer_email: "DO-NOT-PERSIST@example.test",
      metadata: { prompt: "NEVER-PERSIST-CONTENT" },
      total: 1200,
    },
  },
  ...overrides,
});
async function fixture() {
  const db = await usageDatabase({ empty: true });
  await applyAccountMigrations(db.pool);
  const servers: ReturnType<typeof createServer>[] = [];
  const stop = async () => {
    for (const server of servers)
      if (server.listening)
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
  };
  const extra: Pool[] = [],
    roles: string[] = [];
  return {
    db,
    stop,
    async start(pool = db.pool, mutateParser = false) {
      const app = express();
      app.disable("x-powered-by");
      const server = createServer(app);
      servers.push(server);
      if (mutateParser) app.use(express.json());
      app.use(
        createSyntheticBillingReceiver({
          database: pool,
          signingSecret: secret,
        }),
      );
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      if (!address || typeof address === "string") throw Error("No listener");
      return async (
        value: object | string,
        options: {
          timestamp?: number;
          signingSecret?: string;
          signature?: string;
        } = {},
      ) => {
        const payload =
          typeof value === "string" ? value : JSON.stringify(value);
        const signature =
          options.signature ??
          Stripe.webhooks.generateTestHeaderString({
            payload,
            secret: options.signingSecret ?? secret,
            timestamp: options.timestamp ?? Math.floor(Date.now() / 1000),
          });
        return fetch(`http://127.0.0.1:${address.port}/api/billing/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Stripe-Signature": signature,
          },
          body: payload,
        });
      };
    },
    async role() {
      const schema = (await db.pool.query("SELECT current_schema() AS name"))
        .rows[0].name;
      const name = `pa_billing_${randomUUID().replaceAll("-", "")}`;
      const password = randomBytes(32).toString("hex");
      await db.pool.query(
        `CREATE ROLE "${name}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
      roles.push(name);
      for (const sql of billingReceiverPrivilegePlan(schema, name))
        await db.pool.query(sql);
      const url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG!);
      url.username = name;
      url.password = password;
      const pool = new Pool({
        connectionString: url.toString(),
        options: `-c search_path=${schema}`,
        connectionTimeoutMillis: 3000,
      });
      extra.push(pool);
      return pool;
    },
    async close() {
      await stop();
      await Promise.all(extra.map((pool) => pool.end()));
      for (const name of roles) {
        await db.pool.query(`DROP OWNED BY "${name}"`);
        await db.pool.query(`DROP ROLE "${name}"`);
      }
      await db.dispose();
    },
  };
}

it("requires explicit signing secrets and safe role identifiers", () => {
  expect(() =>
    createSyntheticBillingReceiver({ database: {} as Pool, signingSecret: "" }),
  ).toThrow();
  expect(() =>
    billingReceiverPrivilegePlan("public;DROP", "receiver"),
  ).toThrow();
});

it.skipIf(!enabled)(
  "verifies raw signed bytes, freshness, account/mode/version and body bounds before writing any receipt",
  async () => {
    const f = await fixture();
    try {
      const post = await f.start();
      const valid = event();
      const signed = Stripe.webhooks.generateTestHeaderString({
        payload: JSON.stringify(valid),
        secret,
      });
      const cases: Array<[object | string, Parameters<typeof post>[1]]> = [
        [valid, { signingSecret: `${secret}wrong` }],
        [{ ...valid, created: valid.created + 1 }, { signature: signed }],
        [valid, { timestamp: Math.floor(Date.now() / 1000) - 360 }],
        [valid, { timestamp: Math.floor(Date.now() / 1000) + 120 }],
        [{ ...valid, livemode: true }, {}],
        [{ ...valid, account: "acct_connected" }, {}],
        [{ ...valid, context: "acct_unexpected" }, {}],
        [{ ...valid, api_version: "unsupported" }, {}],
        [{ ...valid, data: { object: { id: "sub_wrongtype" } } }, {}],
        ["not JSON", {}],
      ];
      for (const [body, options] of cases)
        expect((await post(body, options)).status).toBe(400);
      expect((await post("x".repeat(262145))).status).toBe(413);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await post(
            event({
              type: "customer.created",
              data: { object: { id: "cus_unused" } },
            }),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox",
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await f.close();
    }
  },
);

it.skipIf(!enabled)(
  "acknowledges only durable minimal receipts, deduplicates concurrent deliveries across pools and grants no usage",
  async () => {
    const f = await fixture();
    try {
      const post = await f.start();
      const replica = await f.start(f.db.connect());
      const value = event();
      const replies = await Promise.all(
        Array.from({ length: 12 }, (_, index) =>
          (index % 2 ? replica : post)(value).then(async (r) => ({
            code: r.status,
            body: await r.json(),
          })),
        ),
      );
      expect(replies.every((r) => r.code === 200)).toBe(true);
      expect(replies.filter((r) => r.body.state === "pending")).toHaveLength(1);
      expect(replies.filter((r) => r.body.state === "duplicate")).toHaveLength(
        11,
      );
      const other = f.db.connect();
      const row = (await other.query("SELECT * FROM billing_event_inbox"))
        .rows[0];
      expect(row.event_id).toBe(value.id);
      expect(row.state).toBe("pending");
      expect(JSON.stringify(row)).not.toMatch(
        /DO-NOT-PERSIST|NEVER-PERSIST|customer_email|1200/,
      );
      expect(
        (await post({ ...value, data: { object: { id: "in_different" } } }))
          .status,
      ).toBe(409);
      expect(
        (
          await post(
            event({
              type: "customer.subscription.deleted",
              created: value.created - 100,
              data: { object: { id: "sub_same" } },
            }),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await post(
            event({
              type: "customer.subscription.updated",
              created: value.created - 200,
              data: { object: { id: "sub_same" } },
            }),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox WHERE state='pending'",
          )
        ).rows[0].n,
      ).toBe(3);
      expect(
        (await f.db.pool.query("SELECT count(*)::int n FROM usage_allowances"))
          .rows[0].n,
      ).toBe(0);
    } finally {
      await f.close();
    }
  },
);

it.skipIf(!enabled)(
  "fails closed on recovery quarantine and storage failure without losing earlier receipts",
  async () => {
    const f = await fixture();
    try {
      const pool = f.db.connect(),
        post = await f.start(pool),
        value = event();
      await f.db.pool.query(
        "UPDATE account_recovery_control SET mode='quarantined'",
      );
      expect((await post(value)).status).toBe(503);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox",
          )
        ).rows[0].n,
      ).toBe(0);
      await f.db.pool.query(
        "UPDATE account_recovery_control SET mode='normal'",
      );
      const held = await f.db.pool.connect();
      try {
        await held.query("BEGIN");
        await held.query("SELECT mode FROM account_recovery_control FOR UPDATE");
        expect((await post(value)).status).toBe(503);
      } finally {
        await held.query("ROLLBACK");
        held.release();
      }
      expect((await post(value)).status).toBe(200);
      await f.db.close(pool);
      expect((await post(event())).status).toBe(503);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox",
          )
        ).rows[0].n,
      ).toBe(1);
      await f.stop();
      const restarted = await f.start(f.db.connect());
      const replay = await restarted(value);
      expect(replay.status).toBe(200);
      expect((await replay.json()).state).toBe("duplicate");
    } finally {
      await f.close();
    }
  },
);

it.skipIf(!enabled)(
  "works under an insert/read-only receiver role with no auth, allowance or receipt-update access",
  async () => {
    const f = await fixture();
    try {
      const pool = await f.role(),
        post = await f.start(pool);
      const value = event();
      expect((await post(value)).status).toBe(200);
      expect((await post(value)).status).toBe(200);
      for (const sql of [
        'SELECT * FROM "session"',
        "UPDATE billing_event_inbox SET state='reconciled'",
        "DELETE FROM billing_event_inbox",
        "DELETE FROM usage_allowances",
        "UPDATE account_recovery_control SET mode='quarantined'",
      ])
        await expect(pool.query(sql)).rejects.toThrow(/permission denied/);
    } finally {
      await f.close();
    }
  },
);

it.skipIf(!enabled)(
  "rejects a mistakenly parsed body rather than verifying a reserialized approximation",
  async () => {
    const f = await fixture();
    try {
      const post = await f.start(f.db.pool, true);
      expect((await post(event())).status).toBe(400);
      expect(
        (
          await f.db.pool.query(
            "SELECT count(*)::int n FROM billing_event_inbox",
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await f.close();
    }
  },
);
