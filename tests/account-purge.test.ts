// Closed-account purge (server/account-purge.ts, docs/account-purge-20261116.md). Offline parts here:
// the function SQL keeps the hold, recovery and grace rules, the scheduler logs counts only and
// survives a missing function, the privilege plan installs it, the status names the days. The
// durable part (real PostgreSQL, the runtime role, the cascade) runs only with PRIVATEAI_SYNTHETIC_PG.
import { afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Pool } from "pg";
import { accountPurgeFunctionSql, purgeClosedAccounts, scheduleAccountPurge, ACCOUNT_PURGE_DEFAULT_DAYS } from "../server/account-purge";
import { accountPrivilegePlan } from "../server/account-privileges";
import { createApp } from "../server/app";
import { applyAccountMigrations } from "../server/account-migrations";
import { usageDatabase } from "./fixtures/usage-postgres";

afterEach(() => {
  vi.useRealTimers();
});

describe("closed-account purge, offline", () => {
  it("keeps operator holds, recovery verification and the grace period in the function", () => {
    const sql = accountPurgeFunctionSql("app");
    expect(sql).toContain("SECURITY DEFINER SET search_path = app, pg_temp");
    expect(sql).toContain(`("holdUntil" IS NULL OR "holdUntil" <= clock_timestamp())`);
    expect(sql).toContain(`"requestedAt" + make_interval(days => grace_days) <= clock_timestamp()`);
    expect(sql).toContain(`"purgedAt" IS NULL`);
    expect(sql).toMatch(/IS DISTINCT FROM 'normal' THEN\s+RETURN;/);
    expect(sql).toMatch(/grace_days < 7 OR grace_days > 365/);
    expect(sql).toContain(`DELETE FROM "user" WHERE id = ANY(ids)`);
    expect(sql).toContain(`UPDATE account_closure SET "purgedAt" = clock_timestamp()`);
    // Usage and billing are kept: no direct delete of them.
    expect(sql).not.toMatch(/DELETE FROM (usage|billing)/);
  });
  it("is installed by the privilege plan, callable by the runtime role only", () => {
    const plan = accountPrivilegePlan({ schema: "app", runtimeRole: "runtime", noticeRole: "sender" }).join("\n");
    expect(plan).toContain(`CREATE OR REPLACE FUNCTION "app".purge_closed_accounts(grace_days integer, OUT accounts bigint)`);
    expect(plan).toContain(`REVOKE ALL ON FUNCTION "app".purge_closed_accounts(integer) FROM PUBLIC`);
    expect(plan).toContain(`GRANT EXECUTE ON FUNCTION "app".purge_closed_accounts(integer) TO "runtime"`);
    expect(plan).not.toMatch(/purge_closed_accounts\(integer\) TO "sender"/);
  });
  it("runs at once and daily, logs counts only, and a failure deletes nothing and stops nothing", async () => {
    vi.useFakeTimers();
    const calls: unknown[][] = [];
    let fail = true;
    const database = {
      query: async (...args: unknown[]) => {
        calls.push(args);
        if (fail) throw Error("function purge_closed_accounts(integer) does not exist SECRET_DETAIL");
        return { rows: [{ accounts: 2 }] };
      },
    } as unknown as Pool;
    const lines: string[] = [];
    const stop = scheduleAccountPurge(database, 30, (line) => lines.push(line));
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual([["SELECT accounts::int AS accounts FROM purge_closed_accounts($1)", [30]]]);
    expect(lines).toEqual(["Closed account purge failed; nothing was deleted.\n"]);
    fail = false;
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(calls).toHaveLength(2);
    expect(lines.at(-1)).toBe("Closed accounts purged: 2.\n");
    expect(lines.join("")).not.toContain("SECRET_DETAIL");
    stop();
    await vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60 * 1000);
    expect(calls).toHaveLength(2);
    expect(await purgeClosedAccounts(database, 7)).toBe(2);
  });
  it("names the days in the status only while switched on", async () => {
    const serve = async (accountPurge?: { graceDays: number }) => {
      const server = createServer();
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw Error("port");
      const origin = `http://127.0.0.1:${address.port}`;
      server.on("request", createApp({ origin, dev: true, ...(accountPurge ? { accountPurge } : {}) }));
      try {
        return (await (await fetch(`${origin}/api/status`)).json()) as { accountPurge?: unknown };
      } finally {
        server.closeAllConnections();
        server.close();
      }
    };
    expect(await serve()).not.toHaveProperty("accountPurge");
    expect((await serve({ graceDays: ACCOUNT_PURGE_DEFAULT_DAYS })).accountPurge).toEqual({ graceDays: 30 });
  });
});

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "deletes due closed accounts and everything stored with them under the runtime role, and nothing else",
  async () => {
    const db = await usageDatabase({ empty: true });
    const roles: string[] = [];
    const pools: Pool[] = [];
    try {
      await applyAccountMigrations(db.pool);
      const schema = (await db.pool.query("SELECT current_schema() AS name")).rows[0].name as string;
      const makeRole = async () => {
        const role = "pa_role_" + randomUUID().replaceAll("-", "");
        const password = randomBytes(32).toString("hex");
        await db.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
        roles.push(role);
        const url = new URL(process.env.PRIVATEAI_SYNTHETIC_PG!);
        url.username = role;
        url.password = password;
        const pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema}`, connectionTimeoutMillis: 3000 });
        pools.push(pool);
        return { role, pool };
      };
      const runtime = await makeRole(),
        notice = await makeRole();
      for (const sql of accountPrivilegePlan({ schema, runtimeRole: runtime.role, noticeRole: notice.role })) await db.pool.query(sql);
      const user = async (email: string) =>
        (await db.pool.query(`INSERT INTO "user"(name,email,"emailVerified") VALUES ('Synthetic',$1,true) RETURNING id`, [email])).rows[0].id as string;
      const stored = async (id: string) => {
        await db.pool.query(`INSERT INTO session("expiresAt",token,"updatedAt","userId") VALUES(now()+interval '1 day',$1,now(),$2)`, [randomUUID(), id]);
        await db.pool.query(`INSERT INTO custody_keys(account_id,wrapped_key,master_key_id,created_at) VALUES($1,$2,'0123456789abcdef',1)`, [id, randomBytes(60)]);
        await db.pool.query(`INSERT INTO secure_items(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,1,$3,40,1,1,false)`, [id, randomUUID(), randomBytes(40)]);
        await db.pool.query(`INSERT INTO secure_blobs(account_id,blob_id,size,data,created_at) VALUES($1,$2,40,$3,1)`, [id, randomUUID(), randomBytes(40)]);
      };
      const closed = async (id: string, daysAgo: number, hold?: string) =>
        db.pool.query(
          `INSERT INTO account_closure("userId","requestedAt","purgeAfter","holdUntil") VALUES($1, now()-make_interval(days=>$2), now()-make_interval(days=>$2)+interval '7 days', $3)`,
          [id, daysAgo, hold ?? null],
        );
      const due = await user("purge-due@example.test"),
        recent = await user("purge-recent@example.test"),
        held = await user("purge-held@example.test"),
        open = await user("purge-open@example.test");
      for (const id of [due, recent, held, open]) await stored(id);
      await closed(due, 31);
      await closed(recent, 10);
      await closed(held, 400, "infinity");
      const count = async (table: string, column: string, id: string) =>
        Number((await db.pool.query(`SELECT count(*) AS n FROM ${table} WHERE ${column}=$1`, [id])).rows[0].n);

      // The runtime role cannot do it by hand, only through the function; the notice role not at all.
      await expect(runtime.pool.query(`UPDATE account_closure SET "purgedAt"=now() WHERE "userId"=$1`, [due])).rejects.toThrow(/permission denied/);
      await expect(purgeClosedAccounts(notice.pool, 30)).rejects.toThrow(/permission denied/);
      await expect(purgeClosedAccounts(runtime.pool, 6)).rejects.toThrow(/grace_days/);
      // Not while recovery verification is in progress.
      await db.pool.query("UPDATE account_recovery_control SET mode='quarantined'");
      expect(await purgeClosedAccounts(runtime.pool, 30)).toBe(0);
      expect(await count(`"user"`, "id", due)).toBe(1);
      await db.pool.query("UPDATE account_recovery_control SET mode='normal'");

      expect(await purgeClosedAccounts(runtime.pool, 30)).toBe(1);
      for (const [table, column] of [[`"user"`, "id"], ["session", `"userId"`], ["custody_keys", "account_id"], ["secure_items", "account_id"], ["secure_blobs", "account_id"]])
        expect(await count(table, column, due), table).toBe(0);
      expect((await db.pool.query(`SELECT "purgedAt" FROM account_closure WHERE "userId"=$1`, [due])).rows[0].purgedAt).not.toBeNull();
      // Within the grace period, under an operator hold, or not closed: untouched.
      for (const id of [recent, held, open]) {
        expect(await count(`"user"`, "id", id)).toBe(1);
        expect(await count("secure_items", "account_id", id)).toBe(1);
      }
      // A second pass finds nothing; a shorter period then takes the recent one.
      expect(await purgeClosedAccounts(runtime.pool, 30)).toBe(0);
      expect(await purgeClosedAccounts(runtime.pool, 7)).toBe(1);
      expect(await count(`"user"`, "id", recent)).toBe(0);
      expect(await count(`"user"`, "id", held)).toBe(1);
    } finally {
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
