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
import { sha256, type DeviceRow, type PairingRow } from "../server/vault-sync";
import { operatorSql } from "../scripts/account-operator";

it.skipIf(!process.env.PRIVATEAI_SYNTHETIC_PG)(
  "stores ciphertext with version checks, running quota, tombstones and their purge, byte pages, devices, commitment pairings completed once, reset and erase under the runtime role",
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
      // Items: versions, one winner of two concurrent writes, quota, tombstones (encrypted records), cursor order.
      const far = -1; // no purge in this part
      const item = randomUUID();
      expect(await store.putItem(a, item, 0, randomBytes(100), false, 1000, 2, far)).toEqual({ status: "ok", version: 1 });
      const both = await Promise.all([store.putItem(a, item, 1, randomBytes(100), false, 1000, 3, far), other.putItem(a, item, 1, randomBytes(100), false, 1000, 3, far)]);
      expect(both.map((r) => (typeof r === "string" ? r : r.status)).sort()).toEqual(["conflict", "ok"]);
      const conflict = await store.putItem(a, item, 1, randomBytes(100), false, 1000, 4, far);
      expect(conflict).toMatchObject({ status: "conflict", current: { version: 2, deleted: false, updatedAt: 3 } });
      expect(await store.putItem(a, randomUUID(), 0, randomBytes(950), false, 1000, 4, far)).toEqual({ status: "quota" });
      // A tombstone (40 bytes of ciphertext) is accepted even at the quota and frees the item's bytes.
      expect(await store.putItem(a, item, 2, randomBytes(40), true, 10, 5, far)).toEqual({ status: "ok", version: 3 });
      // The running total (sync_accounts.used_bytes) equals the rows, without a SUM per write.
      expect((await store.usage(a)).usedBytes).toBe(40);
      expect((await db.pool.query("SELECT used_bytes FROM sync_accounts WHERE account_id=$1", [a])).rows[0].used_bytes).toBe("40");
      const page = await store.items(a, 0, 10, 1e9);
      expect(page.items.map((i) => [i.version, i.deleted, i.ciphertext.length])).toEqual([[3, true, 40]]);
      expect(await store.items(b, 0, 10, 1e9)).toEqual({ items: [], more: false });
      expect(await store.putItem(randomUUID(), item, 0, randomBytes(30), false, 1000, 1, far)).toBe("no-account");
      // Pages stop at about maxBytes (at least one item).
      const big = [randomUUID(), randomUUID()];
      for (const id of big) await store.putItem(a, id, 0, randomBytes(300), false, 10_000, 6, far);
      const firstPage = await store.items(a, 0, 10, 350);
      expect(firstPage.items).toHaveLength(2); // 40 + 300
      expect(firstPage.more).toBe(true);
      expect((await store.items(a, 0, 10, 1)).items).toHaveLength(1);
      // Tombstones older than the purge line go at the next write, and their bytes leave the total.
      expect(await store.putItem(a, big[0], 1, randomBytes(300), false, 10_000, 7, 6)).toEqual({ status: "ok", version: 2 });
      expect((await store.items(a, 0, 10, 1e9)).items.map((i) => i.itemId)).not.toContain(item);
      expect((await store.usage(a)).usedBytes).toBe(600);
      // Devices: limit, revoke deletes the wrapper, a revoked id stays out.
      const second = device();
      expect(await store.upsertDevice(a, second, randomBytes(126), 2)).toBe("ok");
      expect(await store.upsertDevice(a, device(), null, 2)).toBe("limit");
      expect((await store.wrappers(a, second.deviceId)).device).toBeTruthy();
      // Pairing: approved once by `second`, collected once; the device row is made at completion.
      const pairing = (over: Partial<PairingRow> = {}): PairingRow => ({
        pairingId: randomUUID(),
        deviceId: randomUUID(),
        publicKey: Buffer.concat([Buffer.from([4]), randomBytes(64)]),
        tokenHash: sha256("t"),
        commitment: randomBytes(32),
        createdAt: 10,
        expiresAt: 600_010,
        state: "pending",
        ...over,
      });
      const approval = (by = first.deviceId) => ({ wrapper: randomBytes(126), labelCiphertext: randomBytes(40), tag: randomBytes(32), approvedBy: by });
      const p = pairing();
      expect(await store.createPairing(a, p, 3, 10)).toBe("ok");
      expect(await store.createPairing(a, { ...p, deviceId: randomUUID() }, 3, 10)).toBe("taken");
      // The same pairing id in another account is another row (the key includes the account).
      expect(await store.createPairing(b, p, 3, 10)).toBe("ok");
      expect((await store.pairings(a, 20)).map((x) => [x.pairingId, x.commitment])).toEqual([[p.pairingId, p.commitment]]);
      expect(await store.pairingResult(a, p.pairingId, sha256("t"), 20)).toEqual({ status: "pending" });
      const approvals = await Promise.all([store.approvePairing(a, p.pairingId, approval(), 5, 30), other.approvePairing(a, p.pairingId, approval(), 5, 30)]);
      expect(approvals.sort()).toEqual(["gone", "ok"]);
      expect(await store.pairingResult(a, p.pairingId, sha256("wrong"), 40)).toEqual({ status: "gone" });
      expect((await store.pairingResult(a, p.pairingId, sha256("t"), 40)).status).toBe("approved");
      expect((await store.devices(a)).some((d) => d.deviceId === p.deviceId)).toBe(false);
      expect(await store.completePairing(a, p.pairingId, sha256("t"), false, 5, 41)).toBe("ok");
      expect(await store.completePairing(a, p.pairingId, sha256("t"), false, 5, 42)).toBe("gone");
      expect((await store.devices(a)).some((d) => d.deviceId === p.deviceId)).toBe(true);
      expect((await store.wrappers(a, p.deviceId)).device).toBeUndefined(); // not remembered: no wrapper kept
      // Expired before collection: gone, also when approved (review M7).
      const late = pairing();
      await store.createPairing(a, late, 3, 10);
      await store.approvePairing(a, late.pairingId, approval(), 5, 20);
      expect(await store.pairingResult(a, late.pairingId, sha256("t"), 700_000)).toEqual({ status: "gone" });
      // Approved by a device that is then revoked: the row goes with the revocation (review M7).
      const byRevoked = pairing();
      await store.createPairing(a, byRevoked, 3, 10);
      expect(await store.approvePairing(a, byRevoked.pairingId, approval(second.deviceId), 9, 20)).toBe("ok");
      expect(await store.revokeDevice(a, second.deviceId, 25)).toBe(true);
      expect((await store.wrappers(a, second.deviceId)).device).toBeUndefined();
      expect(await store.upsertDevice(a, second, randomBytes(126), 9)).toBe("revoked");
      expect(await store.completePairing(a, byRevoked.pairingId, sha256("t"), true, 9, 30)).toBe("gone");
      // The database refuses what the schema does not allow, past the code's own checks.
      await expect(db.pool.query("INSERT INTO sync_items(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,1,NULL,0,1,1,true)", [a, randomUUID()])).rejects.toThrow();
      await expect(db.pool.query("INSERT INTO sync_items(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,1,$3,27,1,1,false)", [a, randomUUID(), randomBytes(27)])).rejects.toThrow(); // review L1
      await expect(db.pool.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,blob,created_at) VALUES($1,$2,'recovery',$3,1)", [randomUUID(), a, randomBytes(10)])).rejects.toThrow(); // second recovery wrapper
      await expect(db.pool.query("UPDATE sync_pairings SET state='approved' WHERE account_id=$1", [a])).resolves.toBeDefined(); // no rows left pending: nothing to break
      await store.createPairing(a, pairing(), 3, 10);
      await expect(db.pool.query("UPDATE sync_pairings SET state='approved' WHERE account_id=$1 AND state='pending'", [a])).rejects.toThrow(); // approved needs wrapper, label, tag, approver
      // The notice role sees nothing.
      await expect(notice.pool.query("SELECT * FROM sync_items")).rejects.toMatchObject({ code: "42501" });      // Reset removes every sync row of the account (cascade), and only of it.
      await store.reset(b);
      expect(await store.proofs(b)).toBeUndefined();
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_devices WHERE account_id=$1", [b])).rows[0].n).toBe(0);
      expect((await db.pool.query("SELECT count(*)::int AS n FROM sync_devices WHERE account_id=$1", [a])).rows[0].n).toBeGreaterThan(0);
      // The operator erase removes every sync row of A, and leaves B's new setup.
      await setup(b);
      await store.putItem(b, randomUUID(), 0, randomBytes(50), false, 1000, 50, -1);
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
