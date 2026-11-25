// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0027 and the PostgreSQL store of encrypted share
// links (server/share-links.ts) under the runtime role's grants: create, read, list, delete,
// expiry, the per-account limit under concurrency, accounts apart, the schema's own checks, the
// cascade from "user" and the operator's erase.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresShareStore } from "../server/share-links";
import { SHARE } from "../shared/share-links";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)("stores share links as ciphertext under the runtime role, bounded and apart", async () => {
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
    const a = await user("share-a@example.test"),
      b = await user("share-b@example.test");
    const store = new PostgresShareStore(runtime.pool);
    const id = () => randomBytes(16).toString("base64url");
    const cipher = "A".repeat(64);
    const row = (accountId: string, expiresAt = 5000, linkId = id()) => ({ id: linkId, accountId, cipher, createdAt: 1000, expiresAt });

    const first = row(a);
    expect(await store.create(first, 1000)).toBe(true);
    expect(await store.read(first.id, 4999)).toEqual({ cipher, expiresAt: 5000 });
    expect(await store.read(first.id, 5000)).toBeUndefined();
    expect(await store.read(id(), 1000)).toBeUndefined();
    expect(await store.list(a, 1000)).toEqual([{ id: first.id, createdAt: new Date(1000).toISOString(), expiresAt: new Date(5000).toISOString(), bytes: 48 }]);
    // Accounts apart: b sees and deletes nothing of a's.
    expect(await store.list(b, 1000)).toEqual([]);
    expect(await store.remove(b, first.id)).toBe(false);
    expect(await store.remove(a, first.id)).toBe(true);
    expect(await store.read(first.id, 1000)).toBeUndefined();

    // The limit holds when many requests arrive together, and counts live links only.
    await store.create(row(a, 1500), 1000); // expired by the time of the burst
    const burst = await Promise.all(Array.from({ length: SHARE.perAccount + 10 }, () => store.create(row(a), 2000)));
    expect(burst.filter(Boolean).length).toBeGreaterThanOrEqual(SHARE.perAccount);
    expect(burst.filter(Boolean).length).toBeLessThanOrEqual(SHARE.perAccount + 10);
    expect(await store.create(row(a), 2000)).toBe(false);
    expect(await store.create(row(b), 2000)).toBe(true);
    await store.sweep(2000);
    expect((await db.pool.query("SELECT count(*)::int AS n FROM share_links WHERE expires_at <= 2000")).rows[0].n).toBe(0);

    // The schema refuses what the app would never send, and the runtime role cannot change a row.
    await expect(runtime.pool.query("INSERT INTO share_links(id,account_id,cipher,created_at,expires_at) VALUES ('short',$1,$2,1,2)", [a, cipher])).rejects.toThrow();
    await expect(runtime.pool.query("INSERT INTO share_links(id,account_id,cipher,created_at,expires_at) VALUES ($1,$2,$3,2,1)", [id(), a, cipher])).rejects.toThrow();
    await expect(runtime.pool.query("UPDATE share_links SET expires_at = 9999999999999")).rejects.toThrow(/permission denied/);
    await expect(notice.pool.query("SELECT 1 FROM share_links")).rejects.toThrow(/permission denied/);

    // The operator's erase names the table, and deleting the user removes the links.
    expect(operatorSql("show", "share-a@example.test")).toContain('FROM "share_links" WHERE');
    await db.pool.query('DELETE FROM "user" WHERE id = $1', [a]);
    expect((await db.pool.query("SELECT count(*)::int AS n FROM share_links WHERE account_id = $1", [a])).rows[0].n).toBe(0);
    expect(await store.list(b, 2000)).toHaveLength(1);
  } finally {
    await Promise.all(pools.map((pool) => pool.end()));
    for (const role of roles) {
      await db.pool.query(`DROP OWNED BY "${role}"`);
      await db.pool.query(`DROP ROLE "${role}"`);
    }
    await db.dispose();
  }
});
