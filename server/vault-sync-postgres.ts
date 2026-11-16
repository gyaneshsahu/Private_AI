import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { DeviceRow, PairingResult, PairingRow, PutResult, SetupInput, SyncStore } from "./vault-sync";
import type { CustodyRow, SecureStore } from "./secure-store";
import type { BlobPut, BlobStore, ObjectStorage } from "./vault-sync-blobs";

const deviceFrom = (r: Record<string, unknown>): DeviceRow => ({
  deviceId: r.device_id as string,
  publicKey: r.public_key as Buffer,
  labelCiphertext: r.label_ciphertext as Buffer,
  tokenHash: r.token_hash as Buffer,
  createdAt: Number(r.created_at),
  lastSeenAt: Number(r.last_seen_at),
  ...(r.revoked_at === null ? {} : { revokedAt: Number(r.revoked_at) }),
});
const pairingFrom = (r: Record<string, unknown>): PairingRow => ({
  pairingId: r.pairing_id as string,
  deviceId: r.device_id as string,
  publicKey: r.new_device_public_key as Buffer,
  tokenHash: r.token_hash as Buffer,
  commitment: r.commitment as Buffer,
  createdAt: Number(r.created_at),
  expiresAt: Number(r.expires_at),
  state: r.state as PairingRow["state"],
  ...(r.wrapped_for_new_device ? { wrapper: r.wrapped_for_new_device as Buffer } : {}),
  ...(r.label_ciphertext ? { labelCiphertext: r.label_ciphertext as Buffer } : {}),
  ...(r.tag ? { tag: r.tag as Buffer } : {}),
  ...(r.approved_by ? { approvedBy: r.approved_by as string } : {}),
});
const same = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
type AccountRow = { used_bytes: string | number; blob_bytes?: string | number };

/** Runs `work` in a transaction holding the account's row lock; undefined when the account has no sync. */
async function locked<T>(database: Pool, accountId: string, work: (c: PoolClient, account: AccountRow) => Promise<T>, accounts = "sync_accounts"): Promise<T | undefined> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(`SELECT * FROM ${accounts} WHERE account_id=$1 FOR UPDATE`, [accountId]);
    const result = found.rowCount ? await work(client, found.rows[0] as AccountRow) : undefined;
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Sync storage in PostgreSQL (migration 0023). Writes for one account hold a row lock on sync_accounts. */
export class PostgresSyncStore implements SyncStore {
  /** `t`: the account and item tables (fixed names from this file, never input); Secure passes its own. */
  constructor(
    protected database: Pool,
    private t = { accounts: "sync_accounts", items: "sync_items" },
  ) {}
  private locked<T>(accountId: string, work: (c: PoolClient, account: AccountRow) => Promise<T>) {
    return locked(this.database, accountId, work, this.t.accounts);
  }
  async proofs(accountId: string) {
    const row = (await this.database.query("SELECT auth_hash,recovery_hash FROM sync_accounts WHERE account_id=$1", [accountId])).rows[0];
    return row ? { auth: row.auth_hash as Buffer, recovery: row.recovery_hash as Buffer } : undefined;
  }
  async setup(accountId: string, input: SetupInput, now: number) {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query(
        "INSERT INTO sync_accounts(account_id,auth_hash,recovery_hash,created_at) VALUES($1,$2,$3,$4) ON CONFLICT (account_id) DO NOTHING",
        [accountId, input.authHash, input.recoveryHash, now],
      );
      if (!created.rowCount) {
        await client.query("ROLLBACK");
        return "exists" as const;
      }
      const d = input.device;
      await client.query(
        "INSERT INTO sync_devices(account_id,device_id,public_key,label_ciphertext,token_hash,created_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$6)",
        [accountId, d.deviceId, d.publicKey, d.labelCiphertext, d.tokenHash, now],
      );
      await client.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,blob,created_at) VALUES($1,$2,'recovery',$3,$4)", [randomUUID(), accountId, input.recoveryWrapper, now]);
      if (input.deviceWrapper)
        await client.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,device_id,blob,created_at) VALUES($1,$2,'device',$3,$4,$5)", [
          randomUUID(),
          accountId,
          d.deviceId,
          input.deviceWrapper,
          now,
        ]);
      await client.query("COMMIT");
      return "ok" as const;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async devices(accountId: string) {
    return (await this.database.query("SELECT * FROM sync_devices WHERE account_id=$1 ORDER BY created_at, device_id", [accountId])).rows.map(deviceFrom);
  }
  private async activeDevices(c: PoolClient, accountId: string) {
    return Number((await c.query("SELECT count(*) AS n FROM sync_devices WHERE account_id=$1 AND revoked_at IS NULL", [accountId])).rows[0].n);
  }
  private async putWrapper(c: PoolClient, accountId: string, deviceId: string, wrapper: Buffer | null, now: number) {
    await c.query("DELETE FROM sync_wrappers WHERE account_id=$1 AND kind='device' AND device_id=$2", [accountId, deviceId]);
    if (wrapper)
      await c.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,device_id,blob,created_at) VALUES($1,$2,'device',$3,$4,$5)", [
        randomUUID(),
        accountId,
        deviceId,
        wrapper,
        now,
      ]);
  }
  async upsertDevice(accountId: string, device: DeviceRow, wrapper: Buffer | null, maxDevices: number) {
    return (
      (await this.locked(accountId, async (c) => {
        const existing = (await c.query("SELECT revoked_at FROM sync_devices WHERE account_id=$1 AND device_id=$2", [accountId, device.deviceId])).rows[0];
        if (existing && existing.revoked_at !== null) return "revoked" as const;
        if (existing)
          await c.query("UPDATE sync_devices SET public_key=$3,label_ciphertext=$4,token_hash=$5 WHERE account_id=$1 AND device_id=$2", [
            accountId,
            device.deviceId,
            device.publicKey,
            device.labelCiphertext,
            device.tokenHash,
          ]);
        else {
          if ((await this.activeDevices(c, accountId)) >= maxDevices) return "limit" as const;
          await c.query(
            "INSERT INTO sync_devices(account_id,device_id,public_key,label_ciphertext,token_hash,created_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [accountId, device.deviceId, device.publicKey, device.labelCiphertext, device.tokenHash, device.createdAt, device.lastSeenAt],
          );
        }
        await this.putWrapper(c, accountId, device.deviceId, wrapper, device.lastSeenAt);
        return "ok" as const;
      })) ?? "no-account"
    );
  }
  async touchDevice(accountId: string, deviceId: string, now: number) {
    await this.database.query("UPDATE sync_devices SET last_seen_at=$3 WHERE account_id=$1 AND device_id=$2 AND last_seen_at<$3", [accountId, deviceId, now]);
  }
  async revokeDevice(accountId: string, deviceId: string, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        const r = await c.query("UPDATE sync_devices SET revoked_at=coalesce(revoked_at,$3) WHERE account_id=$1 AND device_id=$2", [accountId, deviceId, now]);
        await c.query("DELETE FROM sync_wrappers WHERE account_id=$1 AND kind='device' AND device_id=$2", [accountId, deviceId]);
        // An approval this device gave and the new device has not collected yet goes with it (review M7).
        await c.query("DELETE FROM sync_pairings WHERE account_id=$1 AND approved_by=$2", [accountId, deviceId]);
        return r.rowCount === 1;
      })) ?? false
    );
  }
  async wrappers(accountId: string, deviceId?: string) {
    const rows = (
      await this.database.query("SELECT kind,blob FROM sync_wrappers WHERE account_id=$1 AND (kind='recovery' OR device_id=$2)", [accountId, deviceId ?? null])
    ).rows;
    const recovery = rows.find((r) => r.kind === "recovery")?.blob as Buffer | undefined;
    const device = rows.find((r) => r.kind === "device")?.blob as Buffer | undefined;
    return { ...(recovery ? { recovery } : {}), ...(device ? { device } : {}) };
  }
  async items(accountId: string, since: number, limit: number, maxBytes: number) {
    // The running sum stops a page at about maxBytes of ciphertext (review M8); at least one row.
    const rows = (
      await this.database.query(
        `SELECT item_id,version,ciphertext,deleted,seq,updated_at, sum(size) OVER (ORDER BY seq) AS running FROM ${this.t.items} WHERE account_id=$1 AND seq>$2 ORDER BY seq LIMIT $3`,
        [accountId, since, limit + 1],
      )
    ).rows;
    let taken = 0;
    while (taken < Math.min(rows.length, limit) && (taken === 0 || Number(rows[taken].running) <= maxBytes)) taken++;
    return {
      items: rows.slice(0, taken).map((r) => ({
        itemId: r.item_id as string,
        version: r.version as number,
        ciphertext: r.ciphertext as Buffer,
        deleted: r.deleted as boolean,
        seq: Number(r.seq),
        updatedAt: Number(r.updated_at),
      })),
      more: rows.length > taken,
    };
  }
  async putItem(accountId: string, itemId: string, baseVersion: number, ciphertext: Buffer, deleted: boolean, quotaBytes: number, now: number, purgeBefore: number) {
    return (
      (await this.locked(accountId, async (c, account): Promise<PutResult> => {
        const current = (await c.query(`SELECT version,ciphertext,deleted,updated_at,size FROM ${this.t.items} WHERE account_id=$1 AND item_id=$2`, [accountId, itemId])).rows[0];
        if ((current?.version ?? 0) !== baseVersion)
          return {
            status: "conflict",
            current: { version: current?.version ?? 0, ciphertext: current?.ciphertext ?? null, deleted: current?.deleted ?? false, updatedAt: Number(current?.updated_at ?? 0) },
          };
        // Old tombstones go (review M8), a hundred at a time, never the row being written.
        const purged = await c.query(
          `DELETE FROM ${this.t.items} WHERE account_id=$1 AND item_id IN (SELECT item_id FROM ${this.t.items} WHERE account_id=$1 AND deleted AND updated_at<$2 AND item_id<>$3 LIMIT 100) RETURNING size`,
          [accountId, purgeBefore, itemId],
        );
        const freed = purged.rows.reduce((n, r) => n + Number(r.size), 0);
        const used = Number(account.used_bytes) - freed - Number(current?.size ?? 0) + ciphertext.length;
        // A tombstone is always accepted: it frees space.
        if (!deleted && used > quotaBytes) {
          if (freed) await c.query(`UPDATE ${this.t.accounts} SET used_bytes=used_bytes-$2 WHERE account_id=$1`, [accountId, freed]);
          return { status: "quota" };
        }
        const seq = Number((await c.query(`UPDATE ${this.t.accounts} SET seq=seq+1, used_bytes=$2 WHERE account_id=$1 RETURNING seq`, [accountId, used])).rows[0].seq);
        await c.query(
          `INSERT INTO ${this.t.items}(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (account_id,item_id) DO UPDATE SET version=EXCLUDED.version,ciphertext=EXCLUDED.ciphertext,size=EXCLUDED.size,seq=EXCLUDED.seq,updated_at=EXCLUDED.updated_at,deleted=EXCLUDED.deleted`,
          [accountId, itemId, baseVersion + 1, ciphertext, ciphertext.length, seq, now, deleted],
        );
        return { status: "ok", version: baseVersion + 1 };
      })) ?? "no-account"
    );
  }
  async usage(accountId: string) {
    const r = (await this.database.query(`SELECT seq, used_bytes FROM ${this.t.accounts} WHERE account_id=$1`, [accountId])).rows[0];
    return { usedBytes: Number(r?.used_bytes ?? 0), cursor: Number(r?.seq ?? 0) };
  }
  async createPairing(accountId: string, row: PairingRow, maxPending: number, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        await c.query("DELETE FROM sync_pairings WHERE account_id=$1 AND expires_at<=$2", [accountId, now]);
        if ((await c.query("SELECT 1 FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2", [accountId, row.pairingId])).rowCount) return "taken" as const;
        const pending = Number((await c.query("SELECT count(*) AS n FROM sync_pairings WHERE account_id=$1 AND state='pending'", [accountId])).rows[0].n);
        if (pending >= maxPending) return "limit" as const;
        await c.query(
          "INSERT INTO sync_pairings(pairing_id,account_id,device_id,new_device_public_key,token_hash,commitment,state,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8)",
          [row.pairingId, accountId, row.deviceId, row.publicKey, row.tokenHash, row.commitment, row.createdAt, row.expiresAt],
        );
        return "ok" as const;
      })) ?? "no-account"
    );
  }
  async pairings(accountId: string, now: number) {
    return (
      await this.database.query("SELECT * FROM sync_pairings WHERE account_id=$1 AND state='pending' AND expires_at>$2 ORDER BY created_at", [accountId, now])
    ).rows.map(pairingFrom);
  }
  async approvePairing(accountId: string, pairingId: string, approval: { wrapper: Buffer; labelCiphertext: Buffer; tag: Buffer; approvedBy: string }, maxDevices: number, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        const p = (
          await c.query("SELECT * FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2 AND state='pending' AND expires_at>$3", [accountId, pairingId, now])
        ).rows[0];
        if (!p) return "gone" as const;
        const taken = (await c.query("SELECT 1 FROM sync_devices WHERE account_id=$1 AND device_id=$2", [accountId, p.device_id])).rowCount;
        if (taken || (await this.activeDevices(c, accountId)) >= maxDevices) {
          await c.query("UPDATE sync_pairings SET state='refused' WHERE account_id=$1 AND pairing_id=$2", [accountId, pairingId]);
          return "limit" as const;
        }
        await c.query(
          "UPDATE sync_pairings SET state='approved',wrapped_for_new_device=$3,label_ciphertext=$4,tag=$5,approved_by=$6 WHERE account_id=$1 AND pairing_id=$2",
          [accountId, pairingId, approval.wrapper, approval.labelCiphertext, approval.tag, approval.approvedBy],
        );
        return "ok" as const;
      })) ?? "gone"
    );
  }
  /** Inside the account lock: the pairing as the new device may see it; expired, refused or orphaned rows are deleted. */
  private async result(c: PoolClient, accountId: string, pairingId: string, tokenHash: Buffer, now: number): Promise<PairingResult & { row?: Record<string, unknown> }> {
    const p = (await c.query("SELECT * FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2", [accountId, pairingId])).rows[0];
    if (!p || !same(p.token_hash as Buffer, tokenHash)) return { status: "gone" };
    const drop = () => c.query("DELETE FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2", [accountId, pairingId]);
    if (p.state === "refused") {
      await drop();
      return { status: "refused" };
    }
    let approverOk = true;
    if (p.state === "approved") {
      const a = (await c.query("SELECT revoked_at FROM sync_devices WHERE account_id=$1 AND device_id=$2", [accountId, p.approved_by])).rows[0];
      approverOk = !!a && a.revoked_at === null;
    }
    // Review M7: an approval is collectable only before expiry and while its approver is not revoked.
    if (Number(p.expires_at) <= now || !approverOk) {
      await drop();
      return { status: "gone" };
    }
    if (p.state === "pending") return { status: "pending" };
    return { status: "approved", wrapper: p.wrapped_for_new_device as Buffer, tag: p.tag as Buffer, row: p };
  }
  async pairingResult(accountId: string, pairingId: string, tokenHash: Buffer, now: number): Promise<PairingResult> {
    return (
      (await this.locked(accountId, async (c) => {
        const { row: _row, ...r } = await this.result(c, accountId, pairingId, tokenHash, now);
        return r as PairingResult;
      })) ?? { status: "gone" }
    );
  }
  async completePairing(accountId: string, pairingId: string, tokenHash: Buffer, remember: boolean, maxDevices: number, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        const r = await this.result(c, accountId, pairingId, tokenHash, now);
        if (r.status !== "approved") return r.status === "refused" ? ("refused" as const) : ("gone" as const);
        const p = r.row!;
        await c.query("DELETE FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2", [accountId, pairingId]);
        const taken = (await c.query("SELECT 1 FROM sync_devices WHERE account_id=$1 AND device_id=$2", [accountId, p.device_id])).rowCount;
        if (taken || (await this.activeDevices(c, accountId)) >= maxDevices) return "limit" as const;
        await c.query(
          "INSERT INTO sync_devices(account_id,device_id,public_key,label_ciphertext,token_hash,created_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$6)",
          [accountId, p.device_id, p.new_device_public_key, p.label_ciphertext, p.token_hash, now],
        );
        if (remember) await this.putWrapper(c, accountId, p.device_id as string, p.wrapped_for_new_device as Buffer, now);
        return "ok" as const;
      })) ?? "gone"
    );
  }
  async reset(accountId: string) {
    // The children cascade from sync_accounts.
    await this.database.query("DELETE FROM sync_accounts WHERE account_id=$1", [accountId]);
  }
}

/**
 * Project-file blobs (migration 0024). Without `objects` the bytes are in sync_blobs.data; with
 * object storage (S3Objects, Hetzner) the bucket holds them under a random key and the row is the
 * index. Every deleted row with a key (also through the cascade of an account erase) queues the key
 * in sync_blob_sweep, and sweep() deletes those objects, so no object outlives its row for long.
 * The account's blob total is a running column (sync_accounts.blob_bytes), kept under its row lock.
 */
export class PostgresBlobStore implements BlobStore {
  constructor(
    private database: Pool,
    private objects?: ObjectStorage,
    private t = { accounts: "sync_accounts", blobs: "sync_blobs" },
  ) {
    // An erase by the operator SQL or the inactive-account purge queues keys without this process.
    if (objects) setInterval(() => void this.sweep().catch(() => {}), 3_600_000).unref();
  }
  private locked<T>(accountId: string, work: (c: PoolClient, account: AccountRow) => Promise<T>) {
    return locked(this.database, accountId, work, this.t.accounts);
  }
  async put(accountId: string, blobId: string, data: Buffer, quotaBytes: number, now: number): Promise<BlobPut> {
    const result = await this.locked(accountId, async (c, account): Promise<BlobPut> => {
      const existing = (await c.query(`SELECT size FROM ${this.t.blobs} WHERE account_id=$1 AND blob_id=$2`, [accountId, blobId])).rows[0];
      const used = Number(account.blob_bytes ?? 0) - Number(existing?.size ?? 0);
      if (used + data.length > quotaBytes) return "quota";
      const key = this.objects ? randomUUID().replaceAll("-", "") : null;
      // shortcut: an object stored here whose transaction then fails stays in the bucket unreferenced; rare, add a listing sweep if it matters.
      if (key) await this.objects!.put(key, data);
      // A replaced blob's old object key is queued for the sweep by the delete trigger.
      await c.query(`DELETE FROM ${this.t.blobs} WHERE account_id=$1 AND blob_id=$2`, [accountId, blobId]);
      await c.query(`INSERT INTO ${this.t.blobs}(account_id,blob_id,size,data,object_key,created_at) VALUES($1,$2,$3,$4,$5,$6)`, [
        accountId,
        blobId,
        data.length,
        key ? null : data,
        key,
        now,
      ]);
      await c.query(`UPDATE ${this.t.accounts} SET blob_bytes=$2 WHERE account_id=$1`, [accountId, used + data.length]);
      return "ok";
    });
    if (result === undefined) return "no-account";
    if (result === "ok") await this.sweep().catch(() => {});
    return result;
  }
  async get(accountId: string, blobId: string) {
    const row = (await this.database.query(`SELECT data,object_key FROM ${this.t.blobs} WHERE account_id=$1 AND blob_id=$2`, [accountId, blobId])).rows[0];
    if (!row) return undefined;
    return row.data ? (row.data as Buffer) : this.objects?.get(row.object_key as string);
  }
  async delete(accountId: string, blobId: string) {
    const gone = await this.locked(accountId, async (c) => {
      const r = await c.query(`DELETE FROM ${this.t.blobs} WHERE account_id=$1 AND blob_id=$2 RETURNING size`, [accountId, blobId]);
      if (r.rowCount) await c.query(`UPDATE ${this.t.accounts} SET blob_bytes=greatest(blob_bytes-$2,0) WHERE account_id=$1`, [accountId, Number(r.rows[0].size)]);
      return r.rowCount === 1;
    });
    await this.sweep().catch(() => {});
    return !!gone;
  }
  async usage(accountId: string) {
    const r = (
      await this.database.query(
        `SELECT (SELECT count(*) FROM ${this.t.blobs} b WHERE b.account_id=a.account_id) AS n, a.blob_bytes AS used FROM ${this.t.accounts} a WHERE a.account_id=$1`,
        [accountId],
      )
    ).rows[0];
    return { count: Number(r?.n ?? 0), usedBytes: Number(r?.used ?? 0) };
  }
  async deleteAll(accountId: string) {
    await this.locked(accountId, async (c) => {
      await c.query(`DELETE FROM ${this.t.blobs} WHERE account_id=$1`, [accountId]);
      await c.query(`UPDATE ${this.t.accounts} SET blob_bytes=0 WHERE account_id=$1`, [accountId]);
    });
    await this.sweep().catch(() => {});
  }
  /** Deletes queued objects in the bucket; a failure leaves the key queued for the next sweep. */
  async sweep(limit = 100) {
    if (!this.objects) return 0;
    const keys = (await this.database.query("SELECT object_key FROM sync_blob_sweep ORDER BY queued_at LIMIT $1", [limit])).rows.map(
      (r) => r.object_key as string,
    );
    for (const key of keys) {
      await this.objects.delete(key);
      await this.database.query("DELETE FROM sync_blob_sweep WHERE object_key=$1", [key]);
    }
    return keys.length;
  }
}

/**
 * Secure mode (migration 0025, docs/secure-store-20261116.md): the same item code on the tables
 * custody_keys (the account row, with the wrapped key) and secure_items. The runtime role may
 * insert a custody row and update its counters, never its wrapped key (server/account-privileges.ts).
 */
export class PostgresSecureStore extends PostgresSyncStore implements SecureStore {
  constructor(database: Pool) {
    super(database, { accounts: "custody_keys", items: "secure_items" });
  }
  async custody(accountId: string): Promise<CustodyRow | undefined> {
    const r = (await this.database.query("SELECT wrapped_key,master_key_id,created_at,default_mode FROM custody_keys WHERE account_id=$1", [accountId])).rows[0];
    return r ? { wrappedKey: r.wrapped_key as Buffer, masterKeyId: r.master_key_id as string, createdAt: Number(r.created_at), defaultMode: r.default_mode as CustodyRow["defaultMode"] } : undefined;
  }
  async createCustody(accountId: string, row: CustodyRow) {
    // Two first sign-ins at once: one row wins, both read it back.
    await this.database.query("INSERT INTO custody_keys(account_id,wrapped_key,master_key_id,created_at) VALUES($1,$2,$3,$4) ON CONFLICT (account_id) DO NOTHING", [
      accountId,
      row.wrappedKey,
      row.masterKeyId,
      row.createdAt,
    ]);
    return (await this.custody(accountId))!;
  }
  async setDefaultMode(accountId: string, mode: "secure" | "max") {
    return (await this.database.query("UPDATE custody_keys SET default_mode=$2 WHERE account_id=$1", [accountId, mode])).rowCount === 1;
  }
}
/** Secure project files: rows in secure_blobs (no object storage in this version), counted on custody_keys.blob_bytes. */
export const secureBlobStore = (database: Pool) => new PostgresBlobStore(database, undefined, { accounts: "custody_keys", blobs: "secure_blobs" });
