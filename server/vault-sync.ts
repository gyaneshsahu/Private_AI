// End-to-end encrypted vault sync: the server side (docs/vault-sync-20261115.md, .local/sync-contract.md).
// The server stores ciphertext, wrapped keys and content-free metadata only, and never logs any of
// them: the only log output is fixed counts (server/counters.ts). Mounted only while
// `inference.vaultSync` is on, behind the app's origin, session and CSRF checks.
import express from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { count } from "./counters";
import type { BlobStore } from "./vault-sync-blobs";

export const SYNC_LIMITS = {
  itemBytes: 4 * 1024 * 1024,
  /** AES-GCM: a 12-byte nonce and a 16-byte tag; nothing shorter is a ciphertext (review L1). */
  minCiphertextBytes: 28,
  wrapperBytes: 512,
  labelBytes: 512,
  pageItems: 200,
  /** A page of items stops once this much ciphertext is in it (at least one item; review M8). */
  pageBytes: 8 * 1024 * 1024,
  pairingMs: 10 * 60_000,
  pendingPairings: 3,
  pairingsPerHour: 5,
  /** Approvals and pending-request lookups per account per 10 minutes. */
  approvalsPer10Min: 10,
  lookupsPer10Min: 30,
  /** Writes (items and blobs) per account: a bucket of this many, refilled per second (review M8). */
  writeBurst: 2000,
  writesPerSecond: 20,
  /** Tombstones older than this are purged (review M8). */
  tombstoneMs: 90 * 24 * 3_600_000,
} as const;

/** Stage 3, project files as blobs: a quota of their own, apart from the items' quota. */
export interface BlobSettings {
  quotaBytes: number;
  maxFileBytes: number;
}
export interface SyncSettings {
  quotaBytes: number;
  maxDevices: number;
  /** Absent: project files stay on their device (Stage 1 behaviour). */
  blobs?: BlobSettings & { store: BlobStore };
  /** Tests only: smaller page and write limits. */
  pageBytes?: number;
  writeBurst?: number;
  writesPerSecond?: number;
}
/** AES-GCM adds a 12-byte nonce and a 16-byte tag to every blob. */
export const BLOB_OVERHEAD = 28;
export interface DeviceRow {
  deviceId: string;
  publicKey: Buffer;
  labelCiphertext: Buffer;
  tokenHash: Buffer;
  createdAt: number;
  lastSeenAt: number;
  revokedAt?: number;
}
export interface ItemRow {
  itemId: string;
  version: number;
  /** Always a ciphertext: a tombstone is an encrypted record too (review H4). */
  ciphertext: Buffer;
  /** Says the client; the server cannot check it, devices check the tombstone's AEAD. */
  deleted: boolean;
  seq: number;
  updatedAt: number;
}
export interface PairingRow {
  pairingId: string;
  deviceId: string;
  publicKey: Buffer;
  tokenHash: Buffer;
  /** HKDF of the new device's PBKDF2 master (review H1); the server never sees the code. */
  commitment: Buffer;
  createdAt: number;
  expiresAt: number;
  state: "pending" | "approved" | "refused";
  wrapper?: Buffer;
  labelCiphertext?: Buffer;
  tag?: Buffer;
  approvedBy?: string;
}
export interface SetupInput {
  authHash: Buffer;
  recoveryHash: Buffer;
  recoveryWrapper: Buffer;
  device: DeviceRow;
  deviceWrapper: Buffer | null;
}
export type CurrentItem = { version: number; ciphertext: Buffer | null; deleted: boolean; updatedAt: number };
export type PutResult = { status: "ok"; version: number } | { status: "conflict"; current: CurrentItem } | { status: "quota" };
export type PairingResult =
  | { status: "pending" }
  | { status: "approved"; wrapper: Buffer; tag: Buffer }
  | { status: "gone" }
  | { status: "refused" };

/** Storage for sync. Every write for one account is serialised (PostgreSQL: a row lock on sync_accounts). */
export interface SyncStore {
  /** SHA-256 of the AK proof and of the recovery-key proof; undefined while sync is not set up. */
  proofs(accountId: string): Promise<{ auth: Buffer; recovery: Buffer } | undefined>;
  setup(accountId: string, input: SetupInput, now: number): Promise<"ok" | "exists">;
  devices(accountId: string): Promise<DeviceRow[]>;
  /** Registers a device or replaces its own wrapper and label; "revoked" for a revoked id. */
  upsertDevice(accountId: string, device: DeviceRow, wrapper: Buffer | null, maxDevices: number): Promise<"ok" | "limit" | "revoked" | "no-account">;
  touchDevice(accountId: string, deviceId: string, now: number): Promise<void>;
  /** Revokes the device, deletes its wrapper and every pairing it approved (review M7). */
  revokeDevice(accountId: string, deviceId: string, now: number): Promise<boolean>;
  wrappers(accountId: string, deviceId?: string): Promise<{ recovery?: Buffer; device?: Buffer }>;
  /** Items after `since` in change order, at most `limit` and about `maxBytes` of ciphertext (at least one). */
  items(accountId: string, since: number, limit: number, maxBytes: number): Promise<{ items: ItemRow[]; more: boolean }>;
  /** Versions start at 1; baseVersion 0 means "new". Purges tombstones older than `purgeBefore`. */
  putItem(
    accountId: string,
    itemId: string,
    baseVersion: number,
    ciphertext: Buffer,
    deleted: boolean,
    quotaBytes: number,
    now: number,
    purgeBefore: number,
  ): Promise<PutResult | "no-account">;
  usage(accountId: string): Promise<{ usedBytes: number; cursor: number }>;
  createPairing(accountId: string, row: PairingRow, maxPending: number, now: number): Promise<"ok" | "limit" | "taken" | "no-account">;
  /** Pending, unexpired requests. */
  pairings(accountId: string, now: number): Promise<PairingRow[]>;
  approvePairing(
    accountId: string,
    pairingId: string,
    approval: { wrapper: Buffer; labelCiphertext: Buffer; tag: Buffer; approvedBy: string },
    maxDevices: number,
    now: number,
  ): Promise<"ok" | "gone" | "limit">;
  /** What the new device may collect (no side effect but cleanup): checks its token, expiry and that the approver was not revoked. */
  pairingResult(accountId: string, pairingId: string, tokenHash: Buffer, now: number): Promise<PairingResult>;
  /** After the new device checked the tag: creates its device row (and wrapper when remembered) and deletes the pairing. */
  completePairing(accountId: string, pairingId: string, tokenHash: Buffer, remember: boolean, maxDevices: number, now: number): Promise<"ok" | "gone" | "limit" | "refused">;
  reset(accountId: string): Promise<void>;
}

export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest();
const same = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

type MemoryAccount = {
  proofs: { auth: Buffer; recovery: Buffer };
  seq: number;
  recovery: Buffer;
  devices: Map<string, DeviceRow>;
  wrappers: Map<string, Buffer>;
  items: Map<string, ItemRow>;
  pairings: Map<string, PairingRow>;
};
/** Offline and development store; production uses PostgresSyncStore (server/vault-sync-postgres.ts). */
export class MemorySyncStore implements SyncStore {
  private accounts = new Map<string, MemoryAccount>();
  async proofs(accountId: string) {
    return this.accounts.get(accountId)?.proofs;
  }
  async setup(accountId: string, input: SetupInput) {
    if (this.accounts.has(accountId)) return "exists" as const;
    this.accounts.set(accountId, {
      proofs: { auth: input.authHash, recovery: input.recoveryHash },
      seq: 0,
      recovery: input.recoveryWrapper,
      devices: new Map([[input.device.deviceId, input.device]]),
      wrappers: new Map(input.deviceWrapper ? [[input.device.deviceId, input.deviceWrapper]] : []),
      items: new Map(),
      pairings: new Map(),
    });
    return "ok" as const;
  }
  async devices(accountId: string) {
    return [...(this.accounts.get(accountId)?.devices.values() ?? [])].map((d) => ({ ...d }));
  }
  private active(a: MemoryAccount) {
    return [...a.devices.values()].filter((d) => !d.revokedAt).length;
  }
  async upsertDevice(accountId: string, device: DeviceRow, wrapper: Buffer | null, maxDevices: number) {
    const a = this.accounts.get(accountId);
    if (!a) return "no-account" as const;
    const existing = a.devices.get(device.deviceId);
    if (existing?.revokedAt) return "revoked" as const;
    if (!existing && this.active(a) >= maxDevices) return "limit" as const;
    a.devices.set(device.deviceId, existing ? { ...existing, labelCiphertext: device.labelCiphertext, publicKey: device.publicKey, tokenHash: device.tokenHash } : device);
    if (wrapper) a.wrappers.set(device.deviceId, wrapper);
    else a.wrappers.delete(device.deviceId);
    return "ok" as const;
  }
  async touchDevice(accountId: string, deviceId: string, now: number) {
    const d = this.accounts.get(accountId)?.devices.get(deviceId);
    if (d) d.lastSeenAt = now;
  }
  async revokeDevice(accountId: string, deviceId: string, now: number) {
    const a = this.accounts.get(accountId);
    const d = a?.devices.get(deviceId);
    if (!a || !d) return false;
    d.revokedAt ??= now;
    a.wrappers.delete(deviceId);
    for (const [id, p] of a.pairings) if (p.approvedBy === deviceId) a.pairings.delete(id);
    return true;
  }
  async wrappers(accountId: string, deviceId?: string) {
    const a = this.accounts.get(accountId);
    if (!a) return {};
    const device = deviceId ? a.wrappers.get(deviceId) : undefined;
    return { recovery: a.recovery, ...(device ? { device } : {}) };
  }
  async items(accountId: string, since: number, limit: number, maxBytes: number) {
    const all = [...(this.accounts.get(accountId)?.items.values() ?? [])].filter((i) => i.seq > since).sort((x, y) => x.seq - y.seq);
    const page: ItemRow[] = [];
    let bytes = 0;
    for (const i of all) {
      if (page.length >= limit || (page.length && bytes + i.ciphertext.length > maxBytes)) break;
      bytes += i.ciphertext.length;
      page.push({ ...i });
    }
    return { items: page, more: all.length > page.length };
  }
  async putItem(accountId: string, itemId: string, baseVersion: number, ciphertext: Buffer, deleted: boolean, quotaBytes: number, now: number, purgeBefore: number): Promise<PutResult | "no-account"> {
    const a = this.accounts.get(accountId);
    if (!a) return "no-account";
    const current = a.items.get(itemId);
    if ((current?.version ?? 0) !== baseVersion)
      return {
        status: "conflict",
        current: { version: current?.version ?? 0, ciphertext: current?.ciphertext ?? null, deleted: current?.deleted ?? false, updatedAt: current?.updatedAt ?? 0 },
      };
    for (const [id, i] of a.items) if (id !== itemId && i.deleted && i.updatedAt < purgeBefore) a.items.delete(id);
    const used = [...a.items.values()].reduce((n, i) => n + i.ciphertext.length, 0);
    if (!deleted && used - (current?.ciphertext.length ?? 0) + ciphertext.length > quotaBytes) return { status: "quota" };
    const row = { itemId, version: baseVersion + 1, ciphertext, deleted, seq: ++a.seq, updatedAt: now };
    a.items.set(itemId, row);
    return { status: "ok", version: row.version };
  }
  async usage(accountId: string) {
    const a = this.accounts.get(accountId);
    return { usedBytes: [...(a?.items.values() ?? [])].reduce((n, i) => n + i.ciphertext.length, 0), cursor: a?.seq ?? 0 };
  }
  async createPairing(accountId: string, row: PairingRow, maxPending: number, now: number) {
    const a = this.accounts.get(accountId);
    if (!a) return "no-account" as const;
    for (const [id, p] of a.pairings) if (p.expiresAt <= now) a.pairings.delete(id);
    if (a.pairings.has(row.pairingId)) return "taken" as const;
    if ([...a.pairings.values()].filter((p) => p.state === "pending").length >= maxPending) return "limit" as const;
    a.pairings.set(row.pairingId, { ...row });
    return "ok" as const;
  }
  async pairings(accountId: string, now: number) {
    return [...(this.accounts.get(accountId)?.pairings.values() ?? [])].filter((p) => p.expiresAt > now && p.state === "pending").map((p) => ({ ...p }));
  }
  async approvePairing(accountId: string, pairingId: string, approval: { wrapper: Buffer; labelCiphertext: Buffer; tag: Buffer; approvedBy: string }, maxDevices: number, now: number) {
    const a = this.accounts.get(accountId);
    const p = a?.pairings.get(pairingId);
    if (!a || !p || p.state !== "pending" || p.expiresAt <= now) return "gone" as const;
    if (a.devices.has(p.deviceId) || this.active(a) >= maxDevices) {
      p.state = "refused";
      return "limit" as const;
    }
    Object.assign(p, { state: "approved", wrapper: approval.wrapper, labelCiphertext: approval.labelCiphertext, tag: approval.tag, approvedBy: approval.approvedBy });
    return "ok" as const;
  }
  async pairingResult(accountId: string, pairingId: string, tokenHash: Buffer, now: number): Promise<PairingResult> {
    const a = this.accounts.get(accountId);
    const p = a?.pairings.get(pairingId);
    if (!a || !p || !same(p.tokenHash, tokenHash)) return { status: "gone" };
    if (p.state === "refused") {
      a.pairings.delete(pairingId);
      return { status: "refused" };
    }
    const approver = p.approvedBy ? a.devices.get(p.approvedBy) : undefined;
    if (p.expiresAt <= now || (p.state === "approved" && (!approver || approver.revokedAt))) {
      a.pairings.delete(pairingId);
      return { status: "gone" };
    }
    return p.state === "approved" ? { status: "approved", wrapper: p.wrapper!, tag: p.tag! } : { status: "pending" };
  }
  async completePairing(accountId: string, pairingId: string, tokenHash: Buffer, remember: boolean, maxDevices: number, now: number) {
    const r = await this.pairingResult(accountId, pairingId, tokenHash, now);
    if (r.status !== "approved") return r.status === "refused" ? ("refused" as const) : ("gone" as const);
    const a = this.accounts.get(accountId)!;
    const p = a.pairings.get(pairingId)!;
    a.pairings.delete(pairingId);
    if (a.devices.has(p.deviceId) || this.active(a) >= maxDevices) return "limit" as const;
    a.devices.set(p.deviceId, { deviceId: p.deviceId, publicKey: p.publicKey, labelCiphertext: p.labelCiphertext!, tokenHash: p.tokenHash, createdAt: now, lastSeenAt: now });
    if (remember) a.wrappers.set(p.deviceId, p.wrapper!);
    return "ok" as const;
  }
  async reset(accountId: string) {
    this.accounts.delete(accountId);
  }
}

// Strict input: canonical base64 of a bounded decoded size, uuids, fixed shapes.
const base64 = (maxBytes: number, exactBytes?: number, minBytes = 1) =>
  z
    .string()
    .max(Math.ceil(maxBytes / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
    .transform((value) => Buffer.from(value, "base64"))
    .refine((b) => (exactBytes === undefined ? b.length >= minBytes : b.length === exactBytes), "Wrong size.");
const uuid = z.uuid();
const publicKey = base64(65, 65).refine((b) => b[0] === 4, "Uncompressed P-256 key required.");
const wrapper = base64(SYNC_LIMITS.wrapperBytes, undefined, SYNC_LIMITS.minCiphertextBytes);
const label = base64(SYNC_LIMITS.labelBytes, undefined, SYNC_LIMITS.minCiphertextBytes);
const proof = base64(32, 32);
const registration = z
  .object({ deviceId: uuid, devicePublicKey: publicKey, deviceWrapper: wrapper.nullable(), labelCiphertext: label, accountProof: proof, recoveryProof: proof.optional() })
  .strict();
const setupBody = registration.extend({ recoveryWrapper: wrapper, recoveryProof: proof }).strict();
const putBody = z
  .object({
    baseVersion: z.number().int().min(0).max(2 ** 31 - 2),
    ciphertext: base64(SYNC_LIMITS.itemBytes, undefined, SYNC_LIMITS.minCiphertextBytes),
    deleted: z.boolean().optional(),
  })
  .strict()
  // A tombstone replaces an item that exists: there is nothing to delete at version 0.
  .refine((b) => !b.deleted || b.baseVersion >= 1, "Nothing to delete.");
const deviceHeader = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;
const RESET_CONFIRMATION = "DELETE SYNCED DATA";

class Window {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private ms: number) {}
  /** True while under the limit (and records the hit). */
  allow(key: string, now: number) {
    const recent = (this.hits.get(key) ?? []).filter((t) => t > now - this.ms);
    const ok = recent.length < this.max;
    if (ok) recent.push(now);
    this.hits.set(key, recent);
    return ok;
  }
}
/** A token bucket per account: bursts for a first sync, a steady rate after. */
class Bucket {
  private state = new Map<string, { tokens: number; at: number }>();
  constructor(private capacity: number, private perSecond: number) {}
  take(key: string, now: number) {
    const s = this.state.get(key) ?? { tokens: this.capacity, at: now };
    const tokens = Math.min(this.capacity, s.tokens + ((now - s.at) / 1000) * this.perSecond);
    const ok = tokens >= 1;
    this.state.set(key, { tokens: ok ? tokens - 1 : tokens, at: now });
    return ok;
  }
}

const fail = (res: express.Response, status: number, code: string) => void res.status(status).json({ error: code, code });
const parse = <T>(schema: z.ZodType<T>, value: unknown, res: express.Response): T | undefined => {
  const r = schema.safeParse(value);
  if (!r.success) fail(res, 400, "invalid");
  return r.success ? r.data : undefined;
};
/** Body-parser errors (bad JSON, too large) end here, never in Express's default handler, which logs the body in production. */
export const bodyErrors = (error: { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
  fail(res, error?.type === "entity.too.large" ? 413 : 400, "invalid");

export type ContentCtx = { account: string; now: number };
export interface ContentRoutes {
  /** "/api/sync" or "/api/secure". */
  base: string;
  /** Prefix of the content-free counts: "sync" or "secure". */
  counts: string;
  store: Pick<SyncStore, "items" | "putItem">;
  quotaBytes: number;
  blobs?: BlobSettings & { store: BlobStore };
  pageBytes?: number;
  writeBurst?: number;
  writesPerSecond?: number;
  /** Who may call: sync checks the device token, Secure the signed-in session only. */
  guard: (work: (req: express.Request, res: express.Response, ctx: ContentCtx) => Promise<void>) => express.RequestHandler;
}
/**
 * The item and blob routes of the hardened sync (pages by bytes, version checks, quota, the
 * per-account write limit, strict input), shared by Secure Max (device token) and Secure (session).
 */
export function contentRoutes(router: express.Router, o: ContentRoutes) {
  const base = o.base;
  // A 4 MB item is 5.6 MB of base64 plus the JSON around it.
  const large = express.json({ limit: Math.ceil(SYNC_LIMITS.itemBytes / 3) * 4 + 1024 });
  const writes = new Bucket(o.writeBurst ?? SYNC_LIMITS.writeBurst, o.writesPerSecond ?? SYNC_LIMITS.writesPerSecond);
  const pageBytes = o.pageBytes ?? SYNC_LIMITS.pageBytes;
  /** Per-account write limit (items and blobs); false has answered 429. */
  const writeAllowed = (res: express.Response, ctx: ContentCtx) => {
    if (writes.take(ctx.account, ctx.now)) return true;
    fail(res, 429, "rate-limited");
    return false;
  };
  router.get(
    `${base}/items`,
    o.guard(async (req, res, { account }) => {
      const since = Number(req.query.since ?? 0);
      const limit = Math.min(Number(req.query.limit ?? SYNC_LIMITS.pageItems), SYNC_LIMITS.pageItems);
      if (!Number.isSafeInteger(since) || since < 0 || !Number.isInteger(limit) || limit < 1) return fail(res, 400, "invalid");
      const page = await o.store.items(account, since, limit, pageBytes);
      count(`${o.counts}.pull`);
      res.json({
        items: page.items.map((i) => ({
          itemId: i.itemId,
          version: i.version,
          ciphertext: i.ciphertext.toString("base64"),
          deleted: i.deleted,
          seq: i.seq,
          updatedAt: new Date(i.updatedAt).toISOString(),
        })),
        cursor: String(page.items.at(-1)?.seq ?? since),
        more: page.more,
      });
    }),
  );
  // One write route for content and tombstones: a delete is a PUT of an encrypted tombstone.
  router.put(
    `${base}/items/:itemId`,
    o.guard(async (req, res, ctx) => {
      if (!uuid.safeParse(req.params.itemId).success) return fail(res, 400, "invalid");
      // The size check before parsing: an oversized item is 413 "too-large", never "quota" (review M6).
      if (Number(req.headers["content-length"] ?? 0) > Math.ceil(SYNC_LIMITS.itemBytes / 3) * 4 + 1024) return fail(res, 413, "too-large");
      if (!writeAllowed(res, ctx)) return;
      const error = await new Promise<unknown>((resolve) => large(req, res, resolve));
      if (error) return (error as { type?: string }).type === "entity.too.large" ? fail(res, 413, "too-large") : fail(res, 400, "invalid");
      const b = parse(putBody, req.body, res);
      if (!b) return;
      const r = await o.store.putItem(ctx.account, String(req.params.itemId), b.baseVersion, b.ciphertext, !!b.deleted, o.quotaBytes, ctx.now, ctx.now - SYNC_LIMITS.tombstoneMs);
      if (r === "no-account") return fail(res, 404, "not-set-up");
      if (r.status === "quota") return fail(res, 413, "quota");
      if (r.status === "conflict") {
        count(`${o.counts}.conflict`);
        return void res.status(409).json({
          code: "conflict",
          current: {
            version: r.current.version,
            ciphertext: r.current.ciphertext ? r.current.ciphertext.toString("base64") : null,
            deleted: r.current.deleted,
            ...(r.current.version ? { updatedAt: new Date(r.current.updatedAt).toISOString() } : {}),
          },
        });
      }
      count(`${o.counts}.${b.deleted ? "delete" : "push"}`);
      res.json({ version: r.version });
    }),
  );

  // Stage 3: project files as encrypted blobs, raw bytes, under the device token like items.
  const blobs = o.blobs;
  if (blobs) {
    const maxBody = blobs.maxFileBytes + BLOB_OVERHEAD;
    const raw = express.raw({ type: () => true, limit: maxBody });
    const blobIdOf = (req: express.Request) => (uuid.safeParse(req.params.blobId).success ? String(req.params.blobId) : undefined);
    router.put(
      `${base}/blobs/:blobId`,
      o.guard(async (req, res, ctx) => {
        const blobId = blobIdOf(req);
        if (!blobId) return fail(res, 400, "invalid");
        if (Number(req.headers["content-length"] ?? 0) > maxBody) return fail(res, 413, "too-large");
        if (!writeAllowed(res, ctx)) return;
        const error = await new Promise<unknown>((resolve) => raw(req, res, resolve));
        const tooLarge = (error as { type?: string } | undefined)?.type === "entity.too.large";
        if (error) return tooLarge ? fail(res, 413, "too-large") : fail(res, 400, "invalid");
        const body = req.body as unknown;
        if (!Buffer.isBuffer(body) || body.length < BLOB_OVERHEAD) return fail(res, 400, "invalid");
        const r = await blobs.store.put(ctx.account, blobId, body, blobs.quotaBytes, ctx.now);
        if (r === "quota") return fail(res, 413, "quota");
        if (r === "no-account") return fail(res, 404, "not-set-up");
        count(`${o.counts}.blob.put`);
        res.status(204).end();
      }),
    );
    router.get(
      `${base}/blobs/:blobId`,
      o.guard(async (req, res, { account }) => {
        const blobId = blobIdOf(req);
        if (!blobId) return fail(res, 400, "invalid");
        const data = await blobs.store.get(account, blobId);
        if (!data) return fail(res, 404, "unknown");
        count(`${o.counts}.blob.get`);
        // shortcut: the whole blob is read into memory (at most maxFileMb plus 28 bytes); stream from object storage if files grow.
        res.type("application/octet-stream").send(data);
      }),
    );
    router.delete(
      `${base}/blobs/:blobId`,
      o.guard(async (req, res, ctx) => {
        const blobId = blobIdOf(req);
        if (!blobId) return fail(res, 400, "invalid");
        if (!writeAllowed(res, ctx)) return;
        if (!(await blobs.store.delete(ctx.account, blobId))) return fail(res, 404, "unknown");
        count(`${o.counts}.blob.delete`);
        res.status(204).end();
      }),
    );
  }
}

export function syncRoutes(
  store: SyncStore,
  settings: SyncSettings,
  accountOf: (res: express.Response) => string | undefined,
  clock: () => number = Date.now,
) {
  const router = express.Router();
  const small = express.json({ limit: "16kb" });
  // shortcut: rate limits live in this process's memory; with several instances move them to the database.
  const pairingCreations = new Window(SYNC_LIMITS.pairingsPerHour, 3_600_000);
  const approvals = new Window(SYNC_LIMITS.approvalsPer10Min, 600_000);
  const lookups = new Window(SYNC_LIMITS.lookupsPer10Min, 600_000);
  const base = "/api/sync";
  type Ctx = { account: string; now: number; device?: DeviceRow; token?: { deviceId: string; hash: Buffer } };
  /** The X-Sync-Device header "<deviceId>.<token>", parsed; the token is never stored, only its hash. */
  const tokenOf = (req: express.Request) => {
    const m = deviceHeader.exec(String(req.headers["x-sync-device"] ?? ""));
    return m && uuid.safeParse(m[1]).success ? { deviceId: m[1], hash: sha256(m[2]) } : undefined;
  };
  /** The calling device, when the header names a known, matching device (revoked or not). */
  const deviceOf = async (account: string, token?: { deviceId: string; hash: Buffer }) => {
    const device = token && (await store.devices(account)).find((d) => d.deviceId === token.deviceId);
    return device && same(device.tokenHash, token!.hash) ? device : undefined;
  };
  const handle =
    (needsDevice: boolean, work: (req: express.Request, res: express.Response, ctx: Ctx) => Promise<void>): express.RequestHandler =>
    async (req, res) => {
      const account = accountOf(res);
      if (!account) return fail(res, 401, "signed-out");
      res.setHeader("Cache-Control", "no-store");
      try {
        const ctx: Ctx = { account, now: clock(), token: tokenOf(req) };
        if (needsDevice) {
          const device = await deviceOf(account, ctx.token);
          if (!device) return fail(res, 401, "device-unknown");
          if (device.revokedAt) return fail(res, 403, "revoked");
          ctx.device = device;
          if (ctx.now - device.lastSeenAt > 60_000) await store.touchDevice(account, device.deviceId, ctx.now);
        }
        await work(req, res, ctx);
      } catch {
        if (!res.headersSent) fail(res, 503, "unavailable");
      }
    };
  /** A fresh proof of AK (review H4): needed for revocation, approval and reset, never stored by a device. */
  const provesAccountKey = async (account: string, accountProof: Buffer) => {
    const proofs = await store.proofs(account);
    return !!proofs && same(proofs.auth, sha256(accountProof));
  };
  const newDevice = (b: z.infer<typeof registration>, tokenHash: Buffer, now: number): DeviceRow => ({
    deviceId: b.deviceId,
    publicKey: b.devicePublicKey,
    labelCiphertext: b.labelCiphertext,
    tokenHash,
    createdAt: now,
    lastSeenAt: now,
  });

  router.get(
    `${base}/state`,
    handle(false, async (_req, res, { account, token, now }) => {
      const [hash, devices, usage, files] = await Promise.all([
        store.proofs(account),
        store.devices(account),
        store.usage(account),
        settings.blobs?.store.usage(account),
      ]);
      const mine = token && devices.find((d) => d.deviceId === token.deviceId && same(d.tokenHash, token.hash));
      // Only to a signed-in device, and only whether one is waiting and since when: no key, no commitment.
      const pending = mine && !mine.revokedAt ? await store.pairings(account, now) : [];
      const newest = pending.reduce((t, p) => Math.max(t, p.createdAt), 0);
      res.json({
        enabled: true,
        hasWrappers: !!hash,
        thisDevice: mine ? (mine.revokedAt ? "revoked" : "ok") : "unknown",
        pairingPending: pending.length > 0,
        ...(newest ? { pairingRequestedAt: new Date(newest).toISOString() } : {}),
        devices: devices.map((d) => ({
          deviceId: d.deviceId,
          labelCiphertext: d.labelCiphertext.toString("base64"),
          createdAt: new Date(d.createdAt).toISOString(),
          lastSeenAt: new Date(d.lastSeenAt).toISOString(),
          revoked: !!d.revokedAt,
        })),
        quota: { usedBytes: usage.usedBytes, limitBytes: settings.quotaBytes },
        // Stage 3: present only when project files sync; a quota of their own.
        ...(settings.blobs && files
          ? { files: { count: files.count, usedBytes: files.usedBytes, limitBytes: settings.blobs.quotaBytes, maxFileBytes: settings.blobs.maxFileBytes } }
          : {}),
        cursor: String(usage.cursor),
      });
    }),
  );
  router.post(
    `${base}/setup`,
    small,
    handle(false, async (req, res, { account, now, token }) => {
      const b = parse(setupBody, req.body, res);
      if (!b) return;
      if (!token || token.deviceId !== b.deviceId) return fail(res, 400, "invalid");
      const result = await store.setup(
        account,
        { authHash: sha256(b.accountProof), recoveryHash: sha256(b.recoveryProof), recoveryWrapper: b.recoveryWrapper, device: newDevice(b, token.hash, now), deviceWrapper: b.deviceWrapper },
        now,
      );
      if (result === "exists") return fail(res, 409, "exists");
      count("sync.setup");
      res.status(204).end();
    }),
  );
  // Registers this browser after a recovery-key unlock, or changes its own wrapper ("remember this
  // device" on or off). The AK proof is always required; a NEW device id also needs the proof derived
  // from the recovery key, so a removed device that kept AK cannot enrol itself again under a new id.
  // The server compares hashes in constant time.
  router.post(
    `${base}/devices`,
    small,
    handle(false, async (req, res, { account, now, token }) => {
      const b = parse(registration, req.body, res);
      if (!b) return;
      if (!token || token.deviceId !== b.deviceId) return fail(res, 400, "invalid");
      const proofs = await store.proofs(account);
      if (!proofs) return fail(res, 404, "not-set-up");
      if (!same(proofs.auth, sha256(b.accountProof))) return fail(res, 403, "wrong-proof");
      const existing = (await store.devices(account)).find((d) => d.deviceId === b.deviceId);
      if (existing && !same(existing.tokenHash, token.hash)) return fail(res, 403, "device-unknown");
      if (!existing && !(b.recoveryProof && same(proofs.recovery, sha256(b.recoveryProof)))) return fail(res, 403, "wrong-proof");
      const result = await store.upsertDevice(account, newDevice(b, token.hash, now), b.deviceWrapper, settings.maxDevices);
      if (result === "limit") return fail(res, 409, "device-limit");
      if (result === "revoked") return fail(res, 403, "revoked");
      if (result === "no-account") return fail(res, 404, "not-set-up");
      res.status(204).end();
    }),
  );
  router.get(
    `${base}/wrappers`,
    handle(false, async (req, res, { account, token }) => {
      const deviceId = typeof req.query.deviceId === "string" ? req.query.deviceId : undefined;
      if (deviceId !== undefined && !uuid.safeParse(deviceId).success) return fail(res, 400, "invalid");
      // A device wrapper only to that device itself (its token), never to the session alone.
      let own: string | undefined;
      if (deviceId) {
        const d = (await store.devices(account)).find((x) => x.deviceId === deviceId);
        if (d?.revokedAt) return fail(res, 403, "revoked");
        if (d && token?.deviceId === deviceId && same(d.tokenHash, token.hash)) own = deviceId;
      }
      const w = await store.wrappers(account, own);
      if (!w.recovery) return fail(res, 404, "not-set-up");
      res.json({ recovery: w.recovery.toString("base64"), ...(w.device ? { device: w.device.toString("base64") } : {}) });
    }),
  );
  // Removing a device needs a device token AND a fresh proof of AK (review H4): a stolen, locked
  // device that is not remembered holds no usable token, and a token alone cannot remove devices.
  router.post(
    `${base}/devices/:deviceId/revoke`,
    small,
    handle(true, async (req, res, { account, now }) => {
      if (!uuid.safeParse(req.params.deviceId).success) return fail(res, 404, "unknown");
      const b = parse(z.object({ accountProof: proof }).strict(), req.body, res);
      if (!b) return;
      if (!(await provesAccountKey(account, b.accountProof))) return fail(res, 403, "wrong-proof");
      if (!(await store.revokeDevice(account, String(req.params.deviceId), now))) return fail(res, 404, "unknown");
      count("sync.device.revoke");
      res.status(204).end();
    }),
  );
  // Pairing (review H1). The new device (session only, with its own fresh token) asks with its key
  // and a commitment; an existing device lists the waiting requests, finds the one whose commitment
  // matches the code the user typed, and approves it with AK wrapped to that key plus a tag only the
  // holder of the code can check. The server never sees the code.
  router.post(
    `${base}/pairings`,
    small,
    handle(false, async (req, res, { account, now, token }) => {
      const b = parse(z.object({ pairingId: uuid, deviceId: uuid, newDevicePublicKey: publicKey, commitment: proof }).strict(), req.body, res);
      if (!b) return;
      if (!token || token.deviceId !== b.deviceId) return fail(res, 400, "invalid");
      if (!(await store.proofs(account))) return fail(res, 404, "not-set-up");
      if (!pairingCreations.allow(account, now)) return fail(res, 429, "rate-limited");
      const expiresAt = now + SYNC_LIMITS.pairingMs;
      const r = await store.createPairing(
        account,
        { pairingId: b.pairingId, deviceId: b.deviceId, publicKey: b.newDevicePublicKey, tokenHash: token.hash, commitment: b.commitment, createdAt: now, expiresAt, state: "pending" },
        SYNC_LIMITS.pendingPairings,
        now,
      );
      if (r === "limit") return fail(res, 429, "rate-limited");
      if (r === "taken") return fail(res, 409, "taken");
      if (r === "no-account") return fail(res, 404, "not-set-up");
      count("sync.pairing.created");
      res.json({ pairingId: b.pairingId, expiresAt: new Date(expiresAt).toISOString() });
    }),
  );
  router.get(
    `${base}/pairings`,
    handle(true, async (_req, res, { account, now }) => {
      if (!lookups.allow(account, now)) return fail(res, 429, "rate-limited");
      const pending = await store.pairings(account, now);
      res.json({
        pairings: pending.map((p) => ({
          pairingId: p.pairingId,
          deviceId: p.deviceId,
          newDevicePublicKey: p.publicKey.toString("base64"),
          commitment: p.commitment.toString("base64"),
          createdAt: new Date(p.createdAt).toISOString(),
          expiresAt: new Date(p.expiresAt).toISOString(),
        })),
      });
    }),
  );
  router.post(
    `${base}/pairings/:id/approve`,
    small,
    handle(true, async (req, res, { account, now, device }) => {
      if (!uuid.safeParse(req.params.id).success) return fail(res, 410, "expired");
      const b = parse(z.object({ deviceWrapper: wrapper, labelCiphertext: label, tag: proof, accountProof: proof }).strict(), req.body, res);
      if (!b) return;
      if (!approvals.allow(account, now)) return fail(res, 429, "rate-limited");
      // A token alone cannot mint a new device: the approver proves AK too.
      if (!(await provesAccountKey(account, b.accountProof))) return fail(res, 403, "wrong-proof");
      const r = await store.approvePairing(
        account,
        String(req.params.id),
        { wrapper: b.deviceWrapper, labelCiphertext: b.labelCiphertext, tag: b.tag, approvedBy: device!.deviceId },
        settings.maxDevices,
        now,
      );
      if (r === "gone") return fail(res, 410, "expired");
      if (r === "limit") return fail(res, 409, "device-limit");
      count("sync.pairing.approved");
      res.status(204).end();
    }),
  );
  router.get(
    `${base}/pairings/:id/result`,
    handle(false, async (req, res, { account, now, token }) => {
      if (!uuid.safeParse(req.params.id).success || !token) return fail(res, 410, "expired");
      const r = await store.pairingResult(account, String(req.params.id), token.hash, now);
      if (r.status === "pending") return void res.status(202).json({ status: "pending" });
      if (r.status === "refused") return fail(res, 403, "refused");
      if (r.status === "gone") {
        count("sync.pairing.expired");
        return fail(res, 410, "expired");
      }
      res.json({ deviceWrapper: r.wrapper.toString("base64"), tag: r.tag.toString("base64") });
    }),
  );
  router.post(
    `${base}/pairings/:id/complete`,
    small,
    handle(false, async (req, res, { account, now, token }) => {
      if (!uuid.safeParse(req.params.id).success || !token) return fail(res, 410, "expired");
      const b = parse(z.object({ remember: z.boolean() }).strict(), req.body, res);
      if (!b) return;
      const r = await store.completePairing(account, String(req.params.id), token.hash, b.remember, settings.maxDevices, now);
      if (r === "gone") return fail(res, 410, "expired");
      if (r === "refused") return fail(res, 403, "refused");
      if (r === "limit") return fail(res, 409, "device-limit");
      count("sync.pairing.completed");
      res.status(204).end();
    }),
  );
  // Reset (review C1): the typed confirmation plus EITHER a device token with a fresh AK proof (the
  // normal case) OR the recovery key's proof (every device lost). The session alone resets nothing.
  router.post(
    `${base}/reset`,
    small,
    handle(false, async (req, res, { account, token }) => {
      const b = parse(z.object({ confirm: z.literal(RESET_CONFIRMATION), accountProof: proof.optional(), recoveryProof: proof.optional() }).strict(), req.body, res);
      if (!b) return;
      const proofs = await store.proofs(account);
      if (!proofs) return fail(res, 404, "not-set-up");
      let allowed = false;
      if (b.accountProof) {
        const device = await deviceOf(account, token);
        if (!device) return fail(res, 401, "device-unknown");
        if (device.revokedAt) return fail(res, 403, "revoked");
        allowed = same(proofs.auth, sha256(b.accountProof));
      } else if (b.recoveryProof) allowed = same(proofs.recovery, sha256(b.recoveryProof));
      if (!allowed) return fail(res, 403, "wrong-proof");
      // Blobs first: with object storage their keys are only known while the index rows exist.
      await settings.blobs?.store.deleteAll(account);
      await store.reset(account);
      count("sync.reset");
      res.status(204).end();
    }),
  );
  // Items and project-file blobs: the same code serves Secure (server/secure-store.ts) without a device.
  contentRoutes(router, { ...settings, base, counts: "sync", store, guard: (work) => handle(true, work) });
  router.use(bodyErrors);
  return router;
}
