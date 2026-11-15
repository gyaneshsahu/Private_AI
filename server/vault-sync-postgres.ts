import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { DeviceRow, PairingRow, PutResult, SyncStore } from "./vault-sync";

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
  codeHash: r.code_hash as Buffer,
  createdAt: Number(r.created_at),
  expiresAt: Number(r.expires_at),
  state: r.state as PairingRow["state"],
  ...(r.wrapped_for_new_device ? { wrapper: r.wrapped_for_new_device as Buffer } : {}),
  ...(r.label_ciphertext ? { labelCiphertext: r.label_ciphertext as Buffer } : {}),
});

/** Sync storage in PostgreSQL (migration 0023). Writes for one account hold a row lock on sync_accounts. */
export class PostgresSyncStore implements SyncStore {
  constructor(private database: Pool) {}
  /** Runs `work` in a transaction holding the account's lock; undefined when the account has no sync. */
  private async locked<T>(accountId: string, work: (c: PoolClient) => Promise<T>): Promise<T | undefined> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT 1 FROM sync_accounts WHERE account_id=$1 FOR UPDATE", [accountId]);
      const result = found.rowCount ? await work(client) : undefined;
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async authHash(accountId: string) {
    return (await this.database.query("SELECT auth_hash FROM sync_accounts WHERE account_id=$1", [accountId])).rows[0]?.auth_hash as Buffer | undefined;
  }
  async setup(accountId: string, input: { authHash: Buffer; recoveryWrapper: Buffer; device: DeviceRow; deviceWrapper: Buffer | null }, now: number) {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query(
        "INSERT INTO sync_accounts(account_id,auth_hash,created_at) VALUES($1,$2,$3) ON CONFLICT (account_id) DO NOTHING",
        [accountId, input.authHash, now],
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
          const active = Number((await c.query("SELECT count(*) AS n FROM sync_devices WHERE account_id=$1 AND revoked_at IS NULL", [accountId])).rows[0].n);
          if (active >= maxDevices) return "limit" as const;
          await c.query(
            "INSERT INTO sync_devices(account_id,device_id,public_key,label_ciphertext,token_hash,created_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [accountId, device.deviceId, device.publicKey, device.labelCiphertext, device.tokenHash, device.createdAt, device.lastSeenAt],
          );
        }
        await c.query("DELETE FROM sync_wrappers WHERE account_id=$1 AND kind='device' AND device_id=$2", [accountId, device.deviceId]);
        if (wrapper)
          await c.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,device_id,blob,created_at) VALUES($1,$2,'device',$3,$4,$5)", [
            randomUUID(),
            accountId,
            device.deviceId,
            wrapper,
            device.lastSeenAt,
          ]);
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
  async items(accountId: string, since: number, limit: number) {
    const rows = (
      await this.database.query("SELECT item_id,version,ciphertext,seq,updated_at FROM sync_items WHERE account_id=$1 AND seq>$2 ORDER BY seq LIMIT $3", [
        accountId,
        since,
        limit + 1,
      ])
    ).rows;
    return {
      items: rows.slice(0, limit).map((r) => ({
        itemId: r.item_id as string,
        version: r.version as number,
        ciphertext: (r.ciphertext as Buffer | null) ?? null,
        seq: Number(r.seq),
        updatedAt: Number(r.updated_at),
      })),
      more: rows.length > limit,
    };
  }
  async putItem(accountId: string, itemId: string, baseVersion: number, ciphertext: Buffer | null, quotaBytes: number, now: number) {
    return (
      (await this.locked(accountId, async (c): Promise<PutResult> => {
        const current = (await c.query("SELECT version,ciphertext FROM sync_items WHERE account_id=$1 AND item_id=$2", [accountId, itemId])).rows[0];
        if ((current?.version ?? 0) !== baseVersion)
          return { status: "conflict", current: { version: current?.version ?? 0, ciphertext: current?.ciphertext ?? null } };
        if (ciphertext) {
          const used = Number((await c.query("SELECT coalesce(sum(size),0) AS n FROM sync_items WHERE account_id=$1", [accountId])).rows[0].n);
          if (used - (current?.ciphertext?.length ?? 0) + ciphertext.length > quotaBytes) return { status: "quota" };
        }
        const seq = Number((await c.query("UPDATE sync_accounts SET seq=seq+1 WHERE account_id=$1 RETURNING seq", [accountId])).rows[0].seq);
        await c.query(
          `INSERT INTO sync_items(account_id,item_id,version,ciphertext,size,seq,updated_at,deleted) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (account_id,item_id) DO UPDATE SET version=EXCLUDED.version,ciphertext=EXCLUDED.ciphertext,size=EXCLUDED.size,seq=EXCLUDED.seq,updated_at=EXCLUDED.updated_at,deleted=EXCLUDED.deleted`,
          [accountId, itemId, baseVersion + 1, ciphertext, ciphertext?.length ?? 0, seq, now, !ciphertext],
        );
        return { status: "ok", version: baseVersion + 1 };
      })) ?? "no-account"
    );
  }
  async usage(accountId: string) {
    const r = (
      await this.database.query(
        "SELECT a.seq, coalesce((SELECT sum(size) FROM sync_items i WHERE i.account_id=a.account_id),0) AS used FROM sync_accounts a WHERE a.account_id=$1",
        [accountId],
      )
    ).rows[0];
    return { usedBytes: Number(r?.used ?? 0), cursor: Number(r?.seq ?? 0) };
  }
  async createPairing(accountId: string, row: PairingRow, maxPending: number, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        await c.query("DELETE FROM sync_pairings WHERE account_id=$1 AND expires_at<=$2", [accountId, now]);
        const pending = Number((await c.query("SELECT count(*) AS n FROM sync_pairings WHERE account_id=$1 AND state='pending'", [accountId])).rows[0].n);
        if (pending >= maxPending) return "limit" as const;
        await c.query(
          "INSERT INTO sync_pairings(pairing_id,account_id,device_id,new_device_public_key,token_hash,code_hash,state,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8)",
          [row.pairingId, accountId, row.deviceId, row.publicKey, row.tokenHash, row.codeHash, row.createdAt, row.expiresAt],
        );
        return "ok" as const;
      })) ?? "no-account"
    );
  }
  async pairings(accountId: string, now: number) {
    return (
      await this.database.query("SELECT * FROM sync_pairings WHERE account_id=$1 AND state='pending' AND expires_at>$2", [accountId, now])
    ).rows.map(pairingFrom);
  }
  async approvePairing(accountId: string, pairingId: string, wrapper: Buffer, labelCiphertext: Buffer, maxDevices: number, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        const p = (await c.query("SELECT * FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2 AND state='pending' AND expires_at>$3", [accountId, pairingId, now]))
          .rows[0];
        if (!p) return "gone" as const;
        const active = Number((await c.query("SELECT count(*) AS n FROM sync_devices WHERE account_id=$1 AND revoked_at IS NULL", [accountId])).rows[0].n);
        const taken = (await c.query("SELECT 1 FROM sync_devices WHERE account_id=$1 AND device_id=$2", [accountId, p.device_id])).rowCount;
        if (taken || active >= maxDevices) {
          await c.query("UPDATE sync_pairings SET state='refused' WHERE pairing_id=$1", [pairingId]);
          return "limit" as const;
        }
        await c.query(
          "INSERT INTO sync_devices(account_id,device_id,public_key,label_ciphertext,token_hash,created_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$6)",
          [accountId, p.device_id, p.new_device_public_key, labelCiphertext, p.token_hash, now],
        );
        await c.query("INSERT INTO sync_wrappers(wrapper_id,account_id,kind,device_id,blob,created_at) VALUES($1,$2,'device',$3,$4,$5)", [
          randomUUID(),
          accountId,
          p.device_id,
          wrapper,
          now,
        ]);
        await c.query("UPDATE sync_pairings SET state='approved',wrapped_for_new_device=$2,label_ciphertext=$3 WHERE pairing_id=$1", [pairingId, wrapper, labelCiphertext]);
        return "ok" as const;
      })) ?? "gone"
    );
  }
  async takePairingResult(accountId: string, pairingId: string, tokenHash: Buffer, now: number) {
    return (
      (await this.locked(accountId, async (c) => {
        const p = (await c.query("SELECT * FROM sync_pairings WHERE account_id=$1 AND pairing_id=$2", [accountId, pairingId])).rows[0];
        if (!p || p.token_hash.length !== tokenHash.length || !timingSafeEqual(p.token_hash, tokenHash)) return { status: "gone" as const };
        if (p.state === "pending" && Number(p.expires_at) > now) return { status: "pending" as const };
        await c.query("DELETE FROM sync_pairings WHERE pairing_id=$1", [pairingId]);
        if (p.state === "approved") return { status: "approved" as const, wrapper: p.wrapped_for_new_device as Buffer };
        return { status: p.state === "refused" ? ("refused" as const) : ("gone" as const) };
      })) ?? { status: "gone" as const }
    );
  }
  async reset(accountId: string) {
    // The children cascade from sync_accounts.
    await this.database.query("DELETE FROM sync_accounts WHERE account_id=$1", [accountId]);
  }
}
