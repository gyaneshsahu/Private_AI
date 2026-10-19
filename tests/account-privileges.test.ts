import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createServer } from "node:http";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { finishSignInRecovery } from "../server/account-recovery";
import {
  dispatchOneSecurityNotice,
  syntheticNoticeTransport,
} from "../server/security-notices";
import { PostgresUsageLedger } from "../server/usage-postgres";
import { createSyntheticConsumerWorkspace } from "../server/consumer-workspace";

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
      await runtimeUsage.finish(
        status.accountId,
        "role-request",
        "transport_complete",
      );
      expect(await runtimeUsage.summary(status.accountId)).toMatchObject({
        used: 1,
      });
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
      for (const sql of [
        "CREATE TABLE forbidden(id integer)",
        'ALTER TABLE "user" ADD COLUMN forbidden text',
        "UPDATE account_recovery_control SET mode='normal'",
        "UPDATE usage_allowances SET request_limit=1000000",
        "DELETE FROM usage_requests",
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
      ])
        await expect(notice.pool.query(sql)).rejects.toMatchObject({
          code: "42501",
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
