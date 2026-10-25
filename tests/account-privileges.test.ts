import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createServer } from "node:http";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan, describeConnectedRole } from "../server/account-privileges";
import { finishSignInRecovery } from "../server/account-recovery";
import {
  dispatchOneSecurityNotice,
  syntheticNoticeTransport,
} from "../server/security-notices";
import { purgeExpiredRequests } from "../server/request-retention";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { createSyntheticConsumerWorkspace } from "../server/consumer-workspace";
import { inspectProductionDatabase } from "../server/production-operations";

it("rejects ambiguous identities and unsafe SQL identifiers", () => {
  expect(() =>
    accountPrivilegePlan({
      schema: "public;DROP",
      runtimeRole: "runtime",
      noticeRole: "sender",
    }),
  ).toThrow();
  expect(() =>
    accountPrivilegePlan({
      schema: "public",
      runtimeRole: "same",
      noticeRole: "same",
    }),
  ).toThrow();
});

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "authenticates and dispatches with separate non-owner roles that cannot change schema, recovery mode or allowances",
  async () => {
    const db = await usageDatabase({ empty: true });
    const roles: string[] = [],
      pools: Pool[] = [];
    const server = createServer();
    let listening = false;
    try {
      await applyAccountMigrations(db.pool);
      const schema = (await db.pool.query("SELECT current_schema() AS name"))
        .rows[0].name as string;
      const makeRole = async () => {
        const role = "pa_role_" + randomUUID().replaceAll("-", "");
        const password = randomBytes(32).toString("hex");
        await db.pool.query(
          `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
        );
        roles.push(role);
        const url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG!);
        url.username = role;
        url.password = password;
        const pool = new Pool({
          connectionString: url.toString(),
          options: `-c search_path=${schema}`,
          connectionTimeoutMillis: 3000,
        });
        pools.push(pool);
        return { role, pool };
      };
      const runtime = await makeRole(),
        notice = await makeRole();
      for (const sql of accountPrivilegePlan({
        schema,
        runtimeRole: runtime.role,
        noticeRole: notice.role,
      }))
        await db.pool.query(sql);
      expect(await inspectProductionDatabase(runtime.pool)).toBe(true);
      // The hosted role check (plan 7.6): the restricted roles report restricted, the owner does not.
      expect(await describeConnectedRole(runtime.pool)).toMatchObject({ role: runtime.role, restricted: true, createInSchema: false, superuser: false });
      expect(await describeConnectedRole(notice.pool)).toMatchObject({ role: notice.role, restricted: true });
      expect((await describeConnectedRole(db.pool)).restricted).toBe(false);
      expect(await inspectProductionDatabase(notice.pool)).toBe(false);
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      listening = true;
      const address = server.address();
      if (!address || typeof address === "string") throw Error("port");
      const origin = `http://localhost:${address.port}`;
      let code = "";
      const workspace = createSyntheticConsumerWorkspace({
        origin,
        database: runtime.pool,
        secret: randomBytes(48).toString("base64url"),
        deliverCode: async (m) => {
          code = m.otp;
        },
      });
      server.on("request", workspace.app);
      const call = (path: string, body: unknown) =>
        fetch(origin + "/api/auth/" + path, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      expect(
        (
          await call("email-otp/send-verification-otp", {
            email: "roles@example.test",
            type: "sign-in",
          })
        ).status,
      ).toBe(200);
      const signed = await call("sign-in/email-otp", {
        email: "roles@example.test",
        otp: code,
      });
      expect(signed.status).toBe(200);
      const cookie = signed.headers
        .getSetCookie()
        .map((v) => v.split(";")[0])
        .join("; ");
      const statusResponse = await fetch(origin + "/api/status", {
        headers: { cookie },
      });
      expect(statusResponse.status).toBe(200);
      const status = await statusResponse.json();
      const session = (
        await runtime.pool.query('SELECT id FROM "session" WHERE "userId"=$1', [
          status.accountId,
        ])
      ).rows[0].id;
      const ownerUsage = new PostgresUsageLedger(db.pool),
        runtimeUsage = new PostgresUsageLedger(runtime.pool);
      await ownerUsage.createAllowance({
        accountId: status.accountId,
        periodId: "roles",
        startsAt: Date.now() - 1000,
        endsAt: Date.now() + 60000,
        requestLimit: 2,
      });
      expect(await runtimeUsage.reserve(status.accountId, "role-request")).toBe(
        true,
      );
      await runtimeUsage.dispatch(status.accountId, "role-request");
      // Every ledger path the production runtime uses runs under the restricted role:
      // settlement with metering, metered summary, metrics read-back, an uncertain
      // settlement without metering, and the entitlement helpers.
      await runtimeUsage.finish(
        status.accountId,
        "role-request",
        "transport_complete",
        {
          promptTokens: 12,
          completionTokens: 34,
          model: "SYNTHETIC_ONLY",
          costUsd: "0.000046",
        },
      );
      expect(await runtimeUsage.summary(status.accountId)).toMatchObject({
        used: 1,
        meteredRequests: 1,
        promptTokens: 12,
        completionTokens: 34,
        costUsd: "0.000046",
        unmeteredRequests: 0,
      });
      expect(await runtimeUsage.metrics(status.accountId, "role-request")).toEqual({
        promptTokens: 12,
        completionTokens: 34,
        model: "SYNTHETIC_ONLY",
        costUsd: "0.000046",
      });
      expect(await runtimeUsage.reserve(status.accountId, "role-lost")).toBe(
        true,
      );
      await runtimeUsage.dispatch(status.accountId, "role-lost");
      await runtimeUsage.finish(status.accountId, "role-lost", "uncertain");
      expect(await runtimeUsage.metrics(status.accountId, "role-lost")).toBeUndefined();
      expect(await runtimeUsage.summary(status.accountId)).toMatchObject({
        used: 2,
        uncertain: 1,
        meteredRequests: 1,
        unmeteredRequests: 1,
      });
      expect(await runtimeUsage.hasAllowance("roles")).toBe(true);
      expect(await runtimeUsage.hasAllowance("absent")).toBe(false);
      expect(
        await runtimeUsage.lastAllowanceEnd(
          status.accountId,
          Date.now() + 60000,
        ),
      ).toBeGreaterThan(Date.now());
      expect(
        await finishSignInRecovery(runtime.pool, status.accountId, session),
      ).toBe("completed");
      const accepted: string[] = [];
      expect(
        await dispatchOneSecurityNotice(
          notice.pool,
          syntheticNoticeTransport(async (m) => {
            accepted.push(m.to);
          }),
        ),
      ).toBe("accepted");
      expect(accepted).toEqual(["roles@example.test"]);
      // The account export reads every table it lists under the restricted
      // runtime role, including the billing tables granted for it.
      const exported = await fetch(origin + "/api/account/export", {
        headers: { origin, cookie },
      });
      expect(exported.status).toBe(200);
      const bundle = await exported.json();
      expect(bundle.usage.requests).toHaveLength(2);
      expect(bundle.usage.allowances.map((a: { period_id: string }) => a.period_id)).toEqual(["roles"]);
      expect(bundle.billing).toEqual({ customerBinding: null, operations: [] });

      for (const sql of [
        "CREATE TABLE forbidden(id integer)",
        'ALTER TABLE "user" ADD COLUMN forbidden text',
        "UPDATE account_recovery_control SET mode='normal'",
        "UPDATE usage_allowances SET request_limit=1000000",
        "DELETE FROM usage_requests",
        "UPDATE usage_metrics SET cost_usd=0",
        "DELETE FROM usage_metrics",
        "UPDATE account_security_event SET \"deliveryState\"='pending'",
      ])
        await expect(runtime.pool.query(sql)).rejects.toMatchObject({
          code: "42501",
        });
      for (const sql of [
        'SELECT * FROM "session"',
        'SELECT * FROM "verification"',
        'SELECT * FROM "passkey"',
        "UPDATE account_recovery_control SET mode='normal'",
        "DELETE FROM account_security_event",
        "SELECT * FROM usage_requests",
        "SELECT * FROM usage_metrics",
        "SELECT * FROM purge_expired_requests()",
      ])
        await expect(notice.pool.query(sql)).rejects.toMatchObject({
          code: "42501",
        });
      // The runtime may run the fixed 90-day purge, though it cannot DELETE usage rows itself.
      expect(await purgeExpiredRequests(runtime.pool)).toEqual({
        requests: 0,
        metrics: 0,
        held: 0,
      });
      await expect(
        runtimeUsage.createAllowance({
          accountId: status.accountId,
          periodId: "forbidden",
          startsAt: Date.now() + 60001,
          endsAt: Date.now() + 120000,
          requestLimit: 999,
        }),
      ).rejects.toMatchObject({ code: "42501" });
    } finally {
      if (listening)
        await new Promise<void>((resolve) => server.close(() => resolve()));
      await Promise.all(pools.map((pool) => pool.end()));
      for (const role of roles) {
        await db.pool.query(`DROP OWNED BY "${role}"`);
        await db.pool.query(`DROP ROLE "${role}"`);
      }
      await db.dispose();
    }
  },
  30000,
);
