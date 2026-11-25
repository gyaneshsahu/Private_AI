// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0028 and the PostgreSQL store of the analytics
// day totals (server/analytics.ts) under the runtime role's grants: adding to a day, reading a
// range, deleting old days, the schema's own checks, and that no column could hold an account.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresAnalyticsStore } from "../server/analytics";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)("keeps day totals of counters under the runtime role, with no account in them", async () => {
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
    const store = new PostgresAnalyticsStore(runtime.pool);

    await store.add("2026-11-24", { "search.failed": 2, "use.canvas.opened": 1 });
    await store.add("2026-11-24", { "search.failed": 3 });
    await store.add("2026-11-25", { "chat.fast.completed": 7 });
    await store.add("2026-11-25", {});
    // Many adds at once land as one sum.
    await Promise.all(Array.from({ length: 20 }, () => store.add("2026-11-25", { "chat.fast.completed": 1 })));
    expect(await store.read("2026-11-24")).toEqual({
      "2026-11-24": { "search.failed": 5, "use.canvas.opened": 1 },
      "2026-11-25": { "chat.fast.completed": 27 },
    });
    expect(await store.read("2026-11-25")).toEqual({ "2026-11-25": { "chat.fast.completed": 27 } });
    await store.prune("2026-11-25");
    expect(Object.keys(await store.read("2026-01-01"))).toEqual(["2026-11-25"]);

    // The table is a day, a fixed-shape name and a number: nothing else fits.
    const columns = (await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'analytics_daily' ORDER BY 1", [schema])).rows.map((r) => r.column_name);
    expect(columns).toEqual(["day", "name", "value"]);
    await expect(runtime.pool.query("INSERT INTO analytics_daily(day,name,value) VALUES ('2026-11-25','Pia Example <pia@example.test>',1)")).rejects.toThrow();
    await expect(runtime.pool.query("INSERT INTO analytics_daily(day,name,value) VALUES ('2026-11-25','x',-1)")).rejects.toThrow();
    await expect(notice.pool.query("SELECT 1 FROM analytics_daily")).rejects.toThrow(/permission denied/);
  } finally {
    await Promise.all(pools.map((pool) => pool.end()));
    for (const role of roles) {
      await db.pool.query(`DROP OWNED BY "${role}"`);
      await db.pool.query(`DROP ROLE "${role}"`);
    }
    await db.dispose();
  }
});
