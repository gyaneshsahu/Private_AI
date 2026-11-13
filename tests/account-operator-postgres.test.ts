import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { createSyntheticAccountAuth } from "../server/account-auth";
import { operatorSql } from "../scripts/account-operator";

describe.runIf(!!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "account operator SQL on the synthetic database",
  () => {
    let db: Awaited<ReturnType<typeof usageDatabase>>,
      server: Server,
      origin: string;
    const codes = new Map<string, string>();
    beforeAll(async () => {
      db = await usageDatabase({ empty: true });
      await applyAccountMigrations(db.pool);
      const app = express();
      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((done) => server.once("listening", done));
      const address = server.address();
      if (!address || typeof address === "string") throw Error("No listener");
      origin = `http://localhost:${address.port}`;
      app.use(
        createSyntheticAccountAuth({
          origin,
          secret: randomBytes(48).toString("hex"),
          database: db.pool,
          deliverCode: async ({ email, otp }) => {
            codes.set(email, otp);
          },
        }).router,
      );
    });
    beforeEach(async () => {
      await db.pool.query('DELETE FROM "rateLimit"');
    });
    afterAll(async () => {
      if (server) await new Promise<void>((done) => server.close(() => done()));
      if (db) await db.dispose();
    });

    const call = (path: string, cookie = "", body?: object) =>
      fetch(`${origin}/api/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          origin,
          cookie,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const sendCode = (email: string) =>
      call("auth/email-otp/send-verification-otp", "", { email, type: "sign-in" });
    async function signIn(email: string) {
      expect((await sendCode(email)).status).toBe(200);
      const response = await call("auth/sign-in/email-otp", "", {
        email,
        otp: codes.get(email),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      return { email, cookie, userId: data.user.id as string };
    }
    const run = (command: "suspend" | "unsuspend" | "erase", email: string) =>
      db.pool.query(operatorSql(command, email));

    /** Gives one account a row in every account-keyed table; returns the values that identify it. */
    async function populate(user: { email: string; userId: string }) {
      const q = (sql: string, params: unknown[]) => db.pool.query(sql, params);
      const session = (
        await q('SELECT id FROM session WHERE "userId"=$1 LIMIT 1', [user.userId])
      ).rows[0].id as string;
      const passkey = randomUUID();
      const customer = `cus_${randomBytes(8).toString("hex")}`;
      const period = `p-${randomUUID()}`;
      const request = `r-${randomUUID()}`;
      const event = `evt_${randomBytes(8).toString("hex")}`;
      const now = Date.now();
      await q(
        `INSERT INTO account (id,"accountId","providerId","userId","updatedAt") VALUES($1,$2,'google',$3,clock_timestamp())`,
        [randomUUID(), `google-${randomUUID()}`, user.userId],
      );
      await q(
        `INSERT INTO passkey (id,name,"publicKey","userId","credentialID",counter,"deviceType","backedUp","createdAt")
        VALUES($1::uuid,'Test key','synthetic-public',$2,$1::text,0,'singleDevice',false,clock_timestamp())`,
        [passkey, user.userId],
      );
      await q(
        `INSERT INTO account_security_event ("userId","sessionId",kind,"recipientEmail") VALUES($1,$2,'credential_removed',$3)`,
        [user.userId, session, user.email],
      );
      await q(`INSERT INTO account_credential_change ("userId") VALUES($1)`, [user.userId]);
      await q(`INSERT INTO consumer_request_count (session_id,count) VALUES($1,1)`, [session]);
      await q(
        `INSERT INTO research_consent (id,session_id,commitment,expires_at) VALUES($1,$2,$3,clock_timestamp()+interval '1 hour')`,
        [randomBytes(24).toString("hex"), session, randomBytes(32).toString("hex")],
      );
      await q(
        `INSERT INTO verification (identifier,value,"expiresAt") VALUES('sign-in-otp-'||$1,'000000:0',clock_timestamp()+interval '5 minutes'),
        ('oauth-state-'||$3,json_build_object('link',json_build_object('userId',$2::text))::text,clock_timestamp()+interval '10 minutes')`,
        [user.email, user.userId, randomUUID()],
      );
      await q("INSERT INTO usage_accounts VALUES($1)", [user.userId]);
      await q("INSERT INTO usage_allowances VALUES($1,$2,$3,$4,10)", [
        user.userId,
        period,
        now - 1000,
        now + 86400000,
      ]);
      await q(
        "INSERT INTO usage_requests VALUES($1,$2,$3,'transport_complete',$4,$4)",
        [request, user.userId, period, now],
      );
      await q("INSERT INTO usage_metrics VALUES($1,10,20,'test-model',0.001,0,$2)", [
        request,
        now,
      ]);
      await q("INSERT INTO billing_customer_binding (customer_id,account_id) VALUES($1,$2)", [
        customer,
        user.userId,
      ]);
      await q(
        "INSERT INTO billing_operation (id,account_id,kind,state,customer_id) VALUES($1,$2,'customer','closed',$3)",
        [randomUUID(), user.userId, customer],
      );
      await q(
        "INSERT INTO billing_event_inbox (event_id,event_type,object_id,event_created,api_version,live_mode) VALUES($1,'customer.updated',$2,1,'test',false)",
        [event, customer],
      );
      await q(
        "INSERT INTO billing_assessment (event_id,outcome,reason,customer_id,attempt) VALUES($1,'review','test',$2,1)",
        [event, customer],
      );
      return [user.userId, user.email, session, passkey, customer, period, request];
    }

    /** Rows in every table of the schema whose JSON mentions any of the terms. */
    async function mentions(terms: string[]) {
      const tables = (
        await db.pool.query(
          "SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename",
        )
      ).rows.map((row: { tablename: string }) => row.tablename);
      const found: Record<string, number> = {};
      for (const table of tables) {
        const n = (
          await db.pool.query(
            `SELECT count(*)::int AS n FROM "${table}" x WHERE EXISTS (
              SELECT 1 FROM unnest($1::text[]) term WHERE strpos(lower(row_to_json(x)::text), lower(term))>0)`,
            [terms],
          )
        ).rows[0].n;
        if (n) found[table] = n;
      }
      return found;
    }

    it("suspends one account at once, leaves the other working, and unsuspends", async () => {
      const a = await signIn("suspend-a@example.test"),
        b = await signIn("suspend-b@example.test");
      expect((await call("account/access", a.cookie)).status).toBe(200);
      await run("suspend", "Suspend-A@example.test");
      expect((await call("account/access", a.cookie)).status).toBe(401);
      expect((await call("account/access", b.cookie)).status).toBe(200);
      expect(
        (await db.pool.query('SELECT 1 FROM session WHERE "userId"=$1', [a.userId])).rowCount,
      ).toBe(0);
      expect((await sendCode(a.email)).status).toBe(403);
      // Running it twice is harmless.
      await run("suspend", a.email);

      await run("unsuspend", a.email);
      const again = await signIn(a.email);
      expect((await call("account/access", again.cookie)).status).toBe(200);
      expect((await call("account/access", b.cookie)).status).toBe(200);
    });

    it("unsuspend leaves a closure the person requested", async () => {
      const c = await signIn("closed-c@example.test");
      await db.pool.query(
        `INSERT INTO account_closure ("userId","requestedAt","purgeAfter")
        SELECT $1,s,s+interval '7 days' FROM (SELECT clock_timestamp() AS s) t`,
        [c.userId],
      );
      await run("unsuspend", c.email);
      expect(
        (await db.pool.query('SELECT 1 FROM account_closure WHERE "userId"=$1', [c.userId]))
          .rowCount,
      ).toBe(1);
    });

    it("erases everything for one account, keeps its closure receipt, and leaves the other untouched", async () => {
      const a = await signIn("erase-a@example.test"),
        b = await signIn("erase-b@example.test");
      const aTerms = await populate(a),
        bTerms = await populate(b);
      await run("suspend", a.email);
      const bBefore = await mentions(bTerms);
      for (const table of [
        "user",
        "session",
        "account",
        "passkey",
        "account_security_event",
        "account_credential_change",
        "account_email_proof",
        "consumer_request_count",
        "research_consent",
        "verification",
        "usage_accounts",
        "usage_allowances",
        "usage_requests",
        "usage_metrics",
        "billing_customer_binding",
        "billing_operation",
        "billing_assessment",
      ])
        expect(bBefore[table], table).toBeGreaterThan(0);

      await run("erase", a.email);

      const left = await mentions(aTerms);
      // Kept by design: the closure receipt (opaque ID and times), and the provider's test-mode event, which is not keyed to an account.
      expect(left).toEqual({ account_closure: 1, billing_event_inbox: 1 });
      expect(
        (
          await db.pool.query(
            'SELECT "purgedAt" IS NOT NULL AS purged FROM account_closure WHERE "userId"=$1',
            [a.userId],
          )
        ).rows[0].purged,
      ).toBe(true);
      expect(await mentions(bTerms)).toEqual(bBefore);
      expect((await call("account/access", b.cookie)).status).toBe(200);

      // The address can be invited again as a new account.
      const fresh = await signIn(a.email);
      expect(fresh.userId).not.toBe(a.userId);
    });
  },
);
