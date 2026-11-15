// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0021, the restricted runtime role's grants, the
// PostgreSQL store and the operator erase. NOT run by the build agent (rule 4); the lead runs it.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresBackgroundStore, type TaskRow } from "../server/background-store";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "stores, claims once, trims, purges, re-seals and erases background tasks under the runtime role",
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
      const a = await user("background-a@example.test"),
        b = await user("background-b@example.test");
      const store = new PostgresBackgroundStore(runtime.pool);
      const other = new PostgresBackgroundStore(runtime.pool);
      const row = (accountId: string, runAfter: number, over: Partial<TaskRow> = {}): TaskRow => ({
        taskId: randomUUID(),
        accountId,
        payload: `k1.${"n".repeat(16)}.${"c".repeat(40)}`,
        nextDueAt: runAfter,
        runAfter,
        paused: false,
        skips: 0,
        consent: { version: "2026-11-15-draft", at: 1, sensitive: true },
        createdAt: 1,
        ...over,
      });
      const first = row(a, 100);
      expect(await store.insertTask(first, 3)).toBe("ok");
      expect(await store.insertTask(first, 3)).toBe("exists");
      // Two inserts at once for the same account never pass the limit.
      const both = await Promise.all([store.insertTask(row(a, 200), 2), other.insertTask(row(a, 300), 2)]);
      expect(both.sort()).toEqual(["full", "ok"]);
      expect(await store.tasks(a)).toHaveLength(2);
      expect(await store.task(b, first.taskId)).toBeUndefined();
      expect(await store.updateTask(b, first.taskId, { paused: true })).toBe(false);
      expect(await store.updateTask(a, first.taskId, { skips: 2, consent: { version: "v2", at: 5, sensitive: false } })).toBe(true);
      expect(await store.task(a, first.taskId)).toMatchObject({ skips: 2, consent: { version: "v2", at: 5, sensitive: false } });
      // One claim per due task across two processes; a closing account is never claimed.
      const closing = row(b, 10);
      await store.insertTask(closing, 3);
      await db.pool.query(`INSERT INTO account_closure ("userId","requestedAt","purgeAfter") VALUES ($1, clock_timestamp(), clock_timestamp() + interval '7 days')`, [b]);
      const claims = await Promise.all([store.claimDue(1000, 60_000), other.claimDue(1000, 60_000)]);
      expect(claims.map((c) => c?.taskId).filter(Boolean).sort()).toHaveLength(2);
      expect(new Set(claims.map((c) => c?.taskId)).size).toBe(2);
      expect(claims.some((c) => c?.accountId === b)).toBe(false);
      expect(await store.claimDue(1000, 60_000)).toBeUndefined();
      await store.release(first.taskId, { runAfter: 5000, nextDueAt: 4000, lastRunAt: 1000 });
      expect(await store.task(a, first.taskId)).toMatchObject({ runAfter: 5000, lastRunAt: 1000 });
      // Results: newest 7 kept, ack deletes, purge deletes expired, sealed values re-sealed.
      for (let i = 0; i < 9; i++)
        await store.insertResult(
          { resultId: randomUUID(), taskId: first.taskId, accountId: a, ranAt: 1000 + i, status: "done", text: `k1.n.${"t".repeat(20)}`, promptTokens: 1, completionTokens: 2, expiresAt: 2000 + i },
          7,
        );
      let results = await store.results(a);
      expect(results).toHaveLength(7);
      expect(results[0].ranAt).toBe(1002);
      await store.ack(b, results[0].resultId);
      expect(await store.results(a)).toHaveLength(7);
      await store.ack(a, results[0].resultId);
      expect(await store.purge(2004)).toBe(2);
      results = await store.results(a);
      expect(results).toHaveLength(4);
      const stale = await store.staleSealed("k2");
      expect(stale.filter((s) => s.kind === "result")).toHaveLength(4);
      await store.reseal("task", first.taskId, `k2.${"n".repeat(16)}.${"d".repeat(40)}`);
      expect((await store.staleSealed("k2")).some((s) => s.id === first.taskId)).toBe(false);
      // A refused value: no content in a reason, only a fixed code.
      await expect(
        db.pool.query(`INSERT INTO background_results (result_id,task_id,account_id,ran_at,status,reason,expires_at) VALUES ($1,$2,$3,1,'failed','Contains text!',2)`, [randomUUID(), first.taskId, a]),
      ).rejects.toThrow();
      // The notice role sees nothing.
      await expect(notice.pool.query("SELECT * FROM background_tasks")).rejects.toMatchObject({ code: "42501" });
      // Deleting a task deletes its results.
      await store.deleteTask(a, first.taskId);
      expect(await store.results(a)).toHaveLength(0);
      // The operator erase removes every background row of the account, and only of it.
      await store.insertTask(row(a, 100), 3);
      await db.pool.query(operatorSql("erase", "background-a@example.test"));
      expect((await db.pool.query("SELECT count(*)::int AS n FROM background_tasks WHERE account_id=$1", [a])).rows[0].n).toBe(0);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM background_tasks WHERE account_id=$1", [b])).rows[0].n).toBe(1);
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
