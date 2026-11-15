// Durable suite (PRIVATEAI_SYNTHETIC_PG): migration 0023, the runtime role's grants, the PostgreSQL
// sync store (server/vault-sync-postgres.ts) and the operator erase. NOT run by the build agent
// (rule 4); the lead runs it with `npm run test:durable`.
import { expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { usageDatabase } from "./fixtures/usage-postgres";
import { applyAccountMigrations } from "../server/account-migrations";
import { accountPrivilegePlan } from "../server/account-privileges";
import { PostgresSyncStore } from "../server/vault-sync-postgres";
import { sha256, type DeviceRow } from "../server/vault-sync";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "stores ciphertext with version checks, quota, devices, pairings once, reset and erase under the runtime role",
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
      const a = await user("sync-a@example.test"),
        b = await user("sync-b@example.test");
      const store = new PostgresSyncStore(runtime.pool);
      const other = new PostgresSyncStore(runtime.pool);
      const device = (over: Partial<DeviceRow> = {}): DeviceRow => ({
        deviceId: randomUUID(),
        publicKey: Buffer.concat([Buffer.from([4]), randomBytes(64)]),
        labelCiphertext: randomBytes(40),
        tokenHash: sha256(randomBytes(32)),
        createdAt: 1,
        lastSeenAt: 1,
        ...over,
      });
      const first = device();
      const setup = (account: string, d = device()) =>
        store.setup(account, { authHash: sha256("proof"), recoveryHash: sha256("recovery"), recoveryWrapper: randomBytes(61), device: d, deviceWrapper: randomBytes(126) }, 1);
      expect(await setup(a, first)).toBe("ok");
      expect(await setup(a)).toBe("exists");
      expect(await setup(b)).toBe("ok");
      expect((await store.proofs(a))?.recovery).toEqual(sha256("recovery"));
      // Items: versions, one winner of two concurrent writes, quota, tombstones, cursor order.
      const item = randomUUID();
      expect(await store.putItem(a, item, 0, randomBytes(100), 1000, 2)).toEqual({ status: "ok", version: 1 });
      const both = await Promise.all([store.putItem(a, item, 1, randomBytes(100), 1000, 3), other.putItem(a, item, 1, randomBytes(100), 1000, 3)]);
      expect(both.map((r) => (typeof r === "string" ? r : r.status)).sort()).toEqual(["conflict", "ok"]);
      expect(await store.putItem(a, randomUUID(), 0, randomBytes(950), 1000, 4)).toEqual({ status: "quota" });
      expect(await store.putItem(a, item, 2, null, 1000, 5)).toEqual({ status: "ok", version: 3 });
      expect((await store.usage(a)).usedBytes).toBe(0);
      const page = await store.items(a, 0, 10);
      expect(page.items.map((i) => [i.version, i.ciphertext])).toEqual([[3, null]]);
      expect(await store.items(b, 0, 10)).toEqual({ items: [], more: false });
      expect(await store.putItem(randomUUID(), item, 0, randomBytes(30), 1000, 1)).toBe("no-account");
      // Devices: limit, revoke deletes the wrapper, a revoked id stays out.
      const second = device();
      expect(await store.upsertDevice(a, second, randomBytes(126), 2)).toBe("ok");
      expect(await store.upsertDevice(a, device(), null, 2)).toBe("limit");
      expect((await store.wrappers(a, second.deviceId)).device).toBeTruthy();
      expect(await store.revokeDevice(a, second.deviceId, 9)).toBe(true);
      expect((await store.wrappers(a, second.deviceId)).device).toBeUndefined();
      expect(await store.upsertDevice(a, second, randomBytes(126), 3)).toBe("revoked");
      // Pairing: approved once, collected once; limit refusal is visible to the new device.
      const pairing = { pairingId: randomUUID(), deviceId: randomUUID(), publicKey: Buffer.concat([Buffer.from([4]), randomBytes(64)]), tokenHash: sha256("t"), codeHash: sha256("c"), createdAt: 10, expiresAt: 600_010, state: "pending" as const };
      expect(await store.createPairing(a, pairing, 3, 10)).toBe("ok");
      expect((await store.pairings(a, 20)).map((p) => p.pairingId)).toEqual([pairing.pairingId]);
      expect(await store.takePairingResult(a, pairing.pairingId, sha256("t"), 20)).toEqual({ status: "pending" });
      const approvals = await Promise.all([
        store.approvePairing(a, pairing.pairingId, randomBytes(126), randomBytes(20), 5, 30),
        other.approvePairing(a, pairing.pairingId, randomBytes(126), randomBytes(20), 5, 30),
      ]);
      expect(approvals.sort()).toEqual(["gone", "ok"]);
      expect(await store.takePairingResult(a, pairing.pairingId, sha256("wrong"), 40)).toEqual({ status: "gone" });
      expect((await store.takePairingResult(a, pairing.pairingId, sha256("t"), 40)).status).toBe("approved");
      expect(await store.takePairingResult(a, pairing.pairingId, sha256("t"), 41)).toEqual({ status: "gone" });
      const late = { ...pairing, pairingId: randomUUID(), deviceId: randomUUID() };
      await store.createPairing(a, late, 3, 10);
      expect(await store.approvePairing(a, late.pairingId, randomBytes(126), randomBytes(20), 5, 700_000)).toBe("gone");
      // The database refuses what the schema does not allow, past the code's own checks.
      await expect(db.pool.query("INSERT INTO sync_items(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,1,NULL,5,1,1,false)", [a, randomUUID()])).rejects.toThrow();
      await expect(db.pool.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,blob,created_at) VALUES($1,$2,'recovery',$3,1)", [randomUUID(), a, randomBytes(10)])).rejects.toThrow(); // second recovery wrapper
      // The notice role sees nothing.
      await expect(notice.pool.query("SELECT * FROM sync_items")).rejects.toMatchObject({ code: "42501" });
      // Reset removes every sync row of the account (cascade), and only of it.
      await store.reset(b);
      expect(await store.proofs(b)).toBeUndefined();
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_devices WHERE account_id=$1", [b])).rows[0].n).toBe(0);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_devices WHERE account_id=$1", [a])).rows[0].n).toBeGreaterThan(0);
      // The operator erase removes every sync row of A, and leaves B's new setup.
      await setup(b);
      await store.putItem(b, randomUUID(), 0, randomBytes(50), 1000, 50);
      await db.pool.query(operatorSql("erase", "sync-a@example.test"));
      for (const table of ["sync_accounts", "sync_items", "sync_devices", "sync_wrappers", "sync_pairings"]) {
        expect((await db.pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE account_id=$1`, [a])).rows[0].n, table).toBe(0);
      }
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_items WHERE account_id=$1", [b])).rows[0].n).toBe(1);
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
