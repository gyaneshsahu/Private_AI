// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0024, the runtime role's grants and the
// PostgreSQL blob store (server/vault-sync-postgres.ts PostgresBlobStore), with the bytes in the
// table and with an object store, the sweep queue fed by the delete trigger, reset and the operator
// erase. NOT run by the build agent (rule 4); the lead runs it with `npm run test:durable`.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresBlobStore, PostgresSyncStore } from "../server/vault-sync-postgres";
import { sha256 } from "../server/vault-sync";
import type { ObjectStorage } from "../server/vault-sync-blobs";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "stores blobs with quota under the runtime role, in the table or in object storage, and deletes them on delete, reset and erase",
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
      const a = await user("blobs-a@example.test"),
        b = await user("blobs-b@example.test");
      const sync = new PostgresSyncStore(runtime.pool);
      const device = () => ({ deviceId: randomUUID(), publicKey: Buffer.concat([Buffer.from([4]), randomBytes(64)]), labelCiphertext: randomBytes(40), tokenHash: sha256(randomBytes(32)), createdAt: 1, lastSeenAt: 1 });
      const setup = (account: string) =>
        sync.setup(account, { authHash: sha256("proof"), recoveryHash: sha256("recovery"), recoveryWrapper: randomBytes(61), device: device(), deviceWrapper: randomBytes(126) }, 1);
      expect(await setup(a)).toBe("ok");
      expect(await setup(b)).toBe("ok");

      // Bytes in the table: put, replace counted once, quota, concurrent writers, get, delete.
      const inTable = new PostgresBlobStore(runtime.pool);
      const one = randomUUID();
      const data = randomBytes(1000);
      expect(await inTable.put(a, one, randomBytes(400), 2500, 2)).toBe("ok");
      expect(await inTable.put(a, one, data, 2500, 3)).toBe("ok");
      expect(await inTable.usage(a)).toEqual({ count: 1, usedBytes: 1000 });
      expect(await inTable.get(a, one)).toEqual(data);
      expect(await inTable.get(b, one)).toBeUndefined();
      const racers = await Promise.all([inTable.put(a, randomUUID(), randomBytes(1000), 2500, 4), new PostgresBlobStore(runtime.pool).put(a, randomUUID(), randomBytes(1000), 2500, 4)]);
      expect(racers.sort()).toEqual(["ok", "quota"]);
      expect(await inTable.put(randomUUID(), randomUUID(), data, 2500, 5)).toBe("no-account");
      expect(await inTable.delete(a, one)).toBe(true);
      expect(await inTable.delete(a, one)).toBe(false);
      // The schema refuses what the code does not write: no bytes and no key, a size that differs.
      await expect(db.pool.query("INSERT INTO sync_blobs(account_id,blob_id,size,data,object_key,created_at) VALUES($1,$2,100,NULL,NULL,1)", [a, randomUUID()])).rejects.toThrow();
      await expect(db.pool.query("INSERT INTO sync_blobs(account_id,blob_id,size,data,object_key,created_at) VALUES($1,$2,100,$3,NULL,1)", [a, randomUUID(), randomBytes(99)])).rejects.toThrow();
      // The notice role sees nothing.
      await expect(notice.pool.query("SELECT * FROM sync_blobs")).rejects.toMatchObject({ code: "42501" });
      await expect(notice.pool.query("SELECT * FROM sync_blob_sweep")).rejects.toMatchObject({ code: "42501" });

      // Bytes in object storage: the row is the index (data NULL), deletes go through the sweep queue.
      const bucket = new Map<string, Buffer>();
      const objects: ObjectStorage = {
        put: async (key, bytes) => void bucket.set(key, bytes),
        get: async (key) => bucket.get(key),
        delete: async (key) => void bucket.delete(key),
      };
      const inBucket = new PostgresBlobStore(runtime.pool, objects);
      const two = randomUUID();
      expect(await inBucket.put(b, two, data, 1_000_000, 6)).toBe("ok");
      const row = (await db.pool.query("SELECT data,object_key FROM sync_blobs WHERE account_id=$1 AND blob_id=$2", [b, two])).rows[0];
      expect(row.data).toBeNull();
      expect(bucket.get(row.object_key)).toEqual(data);
      expect(await inBucket.get(b, two)).toEqual(data);
      // Replacing the blob queues the old object, and the sweep after the put removes it.
      expect(await inBucket.put(b, two, randomBytes(500), 1_000_000, 7)).toBe("ok");
      expect(bucket.size).toBe(1);
      expect(bucket.has(row.object_key)).toBe(false);
      expect(await inBucket.delete(b, two)).toBe(true);
      expect(bucket.size).toBe(0);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_blob_sweep")).rows[0].n).toBe(0);
      // A failing bucket leaves the key queued; the next sweep finishes the job.
      await inBucket.put(b, randomUUID(), data, 1_000_000, 8);
      const failing = new PostgresBlobStore(runtime.pool, { ...objects, delete: async () => Promise.reject(Error("down")) });
      await failing.deleteAll(b);
      expect(bucket.size).toBe(1);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_blob_sweep")).rows[0].n).toBe(1);
      expect(await inBucket.sweep()).toBe(1);
      expect(bucket.size).toBe(0);
      // Reset (cascade from sync_accounts) queues the account's objects too.
      await inBucket.put(b, randomUUID(), data, 1_000_000, 9);
      await sync.reset(b);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_blobs WHERE account_id=$1", [b])).rows[0].n).toBe(0);
      expect(await inBucket.sweep()).toBe(1);
      expect(bucket.size).toBe(0);

      // The operator erase (schema owner, printed SQL) removes A's rows and queues A's objects; B is untouched.
      expect(await setup(b)).toBe("ok");
      await inTable.put(b, randomUUID(), data, 1_000_000, 10);
      await inTable.put(a, randomUUID(), data, 1_000_000, 10);
      await inBucket.put(a, randomUUID(), data, 1_000_000, 10);
      await db.pool.query(operatorSql("erase", "blobs-a@example.test"));
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_blobs WHERE account_id=$1", [a])).rows[0].n).toBe(0);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_blobs WHERE account_id=$1", [b])).rows[0].n).toBe(1);
      expect(await inBucket.sweep()).toBe(1);
      expect(bucket.size).toBe(0);
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
