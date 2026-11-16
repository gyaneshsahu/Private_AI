// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0025, the runtime role's grants and the
// PostgreSQL stores of Secure mode (server/vault-sync-postgres.ts PostgresSecureStore and
// secureBlobStore): one key per account under concurrency, the runtime role cannot change a
// wrapped key, items and blobs with running quotas, accounts apart, schema checks, the cascade
// from "user" and the operator erase. Secure and sync never share a row.
// NOT run by the build agent (rule 4); the lead runs it with `npm run test:durable`.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresSecureStore, secureBlobStore } from "../server/vault-sync-postgres";
import { ephemeralCustodyMaster, newAccountKey, unwrapAccountKey, wrapAccountKey } from "../server/custody";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "keeps one wrapped key per account and stores Secure items and blobs under the runtime role",
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
      const a = await user("secure-a@example.test"),
        b = await user("secure-b@example.test");
      const master = ephemeralCustodyMaster();
      const store = new PostgresSecureStore(runtime.pool);
      const blobs = secureBlobStore(runtime.pool);
      const row = (account: string) => ({ wrappedKey: wrapAccountKey(master, account, newAccountKey()), masterKeyId: master.id, createdAt: 1 });

      // No custody row: no key, no items, no blobs.
      expect(await store.custody(a)).toBeUndefined();
      expect(await store.putItem(a, randomUUID(), 0, randomBytes(40), false, 1000, 1, 0)).toBe("no-account");
      expect(await blobs.put(a, randomUUID(), randomBytes(40), 1000, 1)).toBe("no-account");

      // Two first sign-ins at once: one row, both read the same key.
      const [first, second] = await Promise.all([store.createCustody(a, row(a)), store.createCustody(a, row(a))]);
      expect(first.wrappedKey.equals(second.wrappedKey)).toBe(true);
      const keyA = unwrapAccountKey(master, a, first.masterKeyId, first.wrappedKey);
      expect(keyA).toHaveLength(32);
      expect((await store.createCustody(a, row(a))).wrappedKey.equals(first.wrappedKey)).toBe(true);
      await store.createCustody(b, row(b));
      // A row moved to another account does not open (the account id is in the AAD).
      expect(() => unwrapAccountKey(master, b, first.masterKeyId, first.wrappedKey)).toThrow();

      // The runtime role updates counters only: never the wrapped key or its key id, and it deletes no key.
      await expect(runtime.pool.query("UPDATE custody_keys SET wrapped_key=$2 WHERE account_id=$1", [a, randomBytes(60)])).rejects.toThrow(/permission denied/);
      await expect(runtime.pool.query("UPDATE custody_keys SET master_key_id='0000000000000000' WHERE account_id=$1", [a])).rejects.toThrow(/permission denied/);
      await expect(runtime.pool.query("DELETE FROM custody_keys WHERE account_id=$1", [a])).rejects.toThrow(/permission denied/);
      await expect(notice.pool.query("SELECT 1 FROM custody_keys")).rejects.toThrow(/permission denied/);
      await expect(notice.pool.query("SELECT 1 FROM secure_items")).rejects.toThrow(/permission denied/);
      // Schema checks: a wrapped key is exactly 60 bytes; no short ciphertext.
      await expect(db.pool.query("UPDATE custody_keys SET wrapped_key=$2 WHERE account_id=$1", [a, randomBytes(59)])).rejects.toThrow(/check/);
      await expect(runtime.pool.query("INSERT INTO secure_items(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,1,$3,27,1,1,false)", [a, randomUUID(), randomBytes(27)])).rejects.toThrow(/check/);

      // Items: versions, conflicts, the running quota with two concurrent writers, accounts apart.
      const item = randomUUID();
      expect(await store.putItem(a, item, 0, randomBytes(100), false, 250, 10, 0)).toEqual({ status: "ok", version: 1 });
      expect(await store.putItem(a, item, 0, randomBytes(100), false, 250, 11, 0)).toMatchObject({ status: "conflict", current: { version: 1 } });
      const racing = await Promise.all([store.putItem(a, randomUUID(), 0, randomBytes(100), false, 250, 12, 0), store.putItem(a, randomUUID(), 0, randomBytes(100), false, 250, 12, 0)]);
      expect(racing.map((r) => (r as { status: string }).status).sort()).toEqual(["ok", "quota"]);
      expect(await store.usage(a)).toEqual({ usedBytes: 200, cursor: 2 });
      expect((await store.items(b, 0, 200, 8_000_000)).items).toEqual([]);
      expect(await store.putItem(b, item, 0, randomBytes(50), false, 250, 13, 0)).toEqual({ status: "ok", version: 1 });
      // Pages by bytes, and a tombstone that is purged at a later write.
      expect((await store.items(a, 0, 200, 150)).items).toHaveLength(1);
      expect(await store.putItem(a, item, 1, randomBytes(40), true, 250, 20, 0)).toEqual({ status: "ok", version: 2 });
      expect(await store.putItem(a, randomUUID(), 0, randomBytes(30), false, 250, 30, 25)).toMatchObject({ status: "ok" });
      expect((await store.items(a, 0, 200, 8_000_000)).items.some((i) => i.itemId === item)).toBe(false);

      // Blobs: their own running total on the custody row, accounts apart.
      const blob = randomUUID();
      const bytes = randomBytes(300);
      expect(await blobs.put(a, blob, bytes, 500, 40)).toBe("ok");
      expect(await blobs.put(a, randomUUID(), randomBytes(300), 500, 41)).toBe("quota");
      expect((await blobs.get(a, blob))!.equals(bytes)).toBe(true);
      expect(await blobs.get(b, blob)).toBeUndefined();
      expect(await blobs.usage(a)).toEqual({ count: 1, usedBytes: 300 });
      expect(await blobs.delete(b, blob)).toBe(false);

      // Secure and sync share nothing.
      expect(Number((await db.pool.query("SELECT count(*) AS n FROM sync_accounts")).rows[0].n)).toBe(0);
      expect(Number((await db.pool.query("SELECT count(*) AS n FROM sync_items")).rows[0].n)).toBe(0);

      // The operator erase removes one account only; the other keeps its key and data.
      await db.pool.query(operatorSql("erase", "secure-a@example.test"));
      for (const table of ["custody_keys", "secure_items", "secure_blobs"]) {
        expect(Number((await db.pool.query(`SELECT count(*) AS n FROM ${table} WHERE account_id=$1`, [a])).rows[0].n), table).toBe(0);
      }
      expect(await store.custody(b)).toBeDefined();
      expect((await store.items(b, 0, 200, 8_000_000)).items).toHaveLength(1);
      // Deleting the user (the closure purge) cascades to the key, the items and the blobs.
      await blobs.put(b, randomUUID(), randomBytes(40), 500, 50);
      await db.pool.query(`DELETE FROM "user" WHERE id=$1`, [b]);
      for (const table of ["custody_keys", "secure_items", "secure_blobs"])
        expect(Number((await db.pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n), table).toBe(0);
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
