// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0029 and the PostgreSQL store of tester
// feedback (server/feedback.ts) under the runtime role's grants: add with and without a
// screenshot, the daily bound, the list with the sender's address read from the account, delete,
// the schema's own checks, the cascade from "user" and the operator's erase.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresFeedbackStore, type FeedbackRow } from "../server/feedback";
import { FEEDBACK } from "../shared/feedback";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)("stores feedback with its account under the runtime role, bounded per day", async () => {
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
    const a = await user("feedback-a@example.test"),
      b = await user("feedback-b@example.test");
    const store = new PostgresFeedbackStore(runtime.pool);
    const png = Buffer.from([137, 80, 78, 71, 1, 2, 3]);
    const row = (accountId: string, createdAt: number, change: Partial<FeedbackRow> = {}): FeedbackRow => ({
      id: randomUUID(),
      accountId,
      createdAt,
      category: "problem",
      text: "The send button did nothing.",
      lang: "en",
      width: 1280,
      height: 900,
      ...change,
    });

    const first = row(a, 1000, { rating: 2, screenshot: { type: "image/png", data: png.toString("base64") } });
    const second = row(b, 2000, { category: "idea", text: "Mehr Farben", lang: "de", width: 375, height: 812 });
    expect(await store.add(first, 0)).toBe(true);
    expect(await store.add(second, 0)).toBe(true);
    expect(await store.list()).toEqual([
      { id: second.id, createdAt: new Date(2000).toISOString(), from: "feedback-b@example.test", category: "idea", text: "Mehr Farben", hasScreenshot: false, lang: "de", width: 375, height: 812 },
      { id: first.id, createdAt: new Date(1000).toISOString(), from: "feedback-a@example.test", category: "problem", text: "The send button did nothing.", rating: 2, hasScreenshot: true, lang: "en", width: 1280, height: 900 },
    ]);
    const shot = await store.screenshot(first.id);
    expect(shot?.type).toBe("image/png");
    expect(shot?.bytes.equals(png)).toBe(true);
    expect(await store.screenshot(second.id)).toBeUndefined();

    // The day's bound counts this account's entries since the given time only.
    for (let i = 1; i < FEEDBACK.perDay; i++) expect(await store.add(row(a, 5000 + i), 900)).toBe(true);
    expect(await store.add(row(a, 9000), 900)).toBe(false);
    expect(await store.add(row(a, 9000), 8000)).toBe(true);
    expect(await store.add(row(b, 9000), 900)).toBe(true);

    expect(await store.remove(first.id)).toBe(true);
    expect(await store.remove(first.id)).toBe(false);
    expect(await store.screenshot(first.id)).toBeUndefined();

    // The schema refuses what the form cannot send, and the runtime role cannot change an entry.
    const raw = (change: string) =>
      runtime.pool.query(`INSERT INTO feedback(id,account_id,created_at,category,body,lang,width,height${change ? ",rating" : ""}) VALUES ($1,$2,1,${change ? "'idea','x','en',100,100," + change : "'praise','x','en',100,100"})`, [randomUUID(), a]);
    await expect(raw("")).rejects.toThrow();
    await expect(raw("9")).rejects.toThrow();
    await expect(runtime.pool.query("INSERT INTO feedback(id,account_id,created_at,category,body,lang,width,height,screenshot) VALUES ($1,$2,1,'idea','x','en',100,100,'\\x00')", [randomUUID(), a])).rejects.toThrow();
    await expect(runtime.pool.query("UPDATE feedback SET body = 'changed'")).rejects.toThrow(/permission denied/);
    await expect(notice.pool.query("SELECT 1 FROM feedback")).rejects.toThrow(/permission denied/);

    // The operator's erase names the table, and deleting the user removes his feedback.
    expect(operatorSql("show", "feedback-a@example.test")).toContain('FROM "feedback" WHERE');
    await db.pool.query('DELETE FROM "user" WHERE id = $1', [a]);
    expect((await db.pool.query("SELECT count(*)::int AS n FROM feedback WHERE account_id = $1", [a])).rows[0].n).toBe(0);
    expect((await store.list()).every((e) => e.from === "feedback-b@example.test")).toBe(true);
  } finally {
    await Promise.all(pools.map((pool) => pool.end()));
    for (const role of roles) {
      await db.pool.query(`DROP OWNED BY "${role}"`);
      await db.pool.query(`DROP ROLE "${role}"`);
    }
    await db.dispose();
  }
});
