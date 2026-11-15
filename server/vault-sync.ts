// End-to-end encrypted vault sync: the server side (docs/vault-sync-20261115.md, .local/sync-contract.md).
// The server stores ciphertext, wrapped keys and content-free metadata only, and never logs any of
// them: the only log output is fixed counts (server/counters.ts). Mounted only while
// `inference.vaultSync` is on, behind the app's origin, session and CSRF checks.
import express from "express";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { count } from "./counters";

export const SYNC_LIMITS = {
  itemBytes: 4 * 1024 * 1024,
  wrapperBytes: 512,
  labelBytes: 512,
  pageItems: 200,
  pairingMs: 10 * 60_000,
  pendingPairings: 3,
  pairingsPerHour: 5,
  wrongCodesPer10Min: 5,
} as const;

export interface SyncSettings {
  quotaBytes: number;
  maxDevices: number;
}
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
  ciphertext: Buffer | null;
  seq: number;
  updatedAt: number;
}
export interface PairingRow {
  pairingId: string;
  deviceId: string;
  publicKey: Buffer;
  tokenHash: Buffer;
  codeHash: Buffer;
  createdAt: number;
  expiresAt: number;
  state: "pending" | "approved" | "refused";
  wrapper?: Buffer;
  labelCiphertext?: Buffer;
}
export type PutResult =
  | { status: "ok"; version: number }
  | { status: "conflict"; current: { version: number; ciphertext: Buffer | null } }
  | { status: "quota" };

/** Storage for sync. Every write for one account is serialised (PostgreSQL: a row lock on sync_accounts). */
export interface SyncStore {
  authHash(accountId: string): Promise<Buffer | undefined>;
  setup(accountId: string, input: { authHash: Buffer; recoveryWrapper: Buffer; device: DeviceRow; deviceWrapper: Buffer | null }, now: number): Promise<"ok" | "exists">;
  devices(accountId: string): Promise<DeviceRow[]>;
  /** Registers a device or replaces its own wrapper and label; "revoked" for a revoked id. */
  upsertDevice(accountId: string, device: DeviceRow, wrapper: Buffer | null, maxDevices: number): Promise<"ok" | "limit" | "revoked" | "no-account">;
  touchDevice(accountId: string, deviceId: string, now: number): Promise<void>;
  revokeDevice(accountId: string, deviceId: string, now: number): Promise<boolean>;
  wrappers(accountId: string, deviceId?: string): Promise<{ recovery?: Buffer; device?: Buffer }>;
  items(accountId: string, since: number, limit: number): Promise<{ items: ItemRow[]; more: boolean }>;
  /** ciphertext null writes a tombstone. Versions start at 1; baseVersion 0 means "new". */
  putItem(accountId: string, itemId: string, baseVersion: number, ciphertext: Buffer | null, quotaBytes: number, now: number): Promise<PutResult | "no-account">;
  usage(accountId: string): Promise<{ usedBytes: number; cursor: number }>;
  createPairing(accountId: string, row: PairingRow, maxPending: number, now: number): Promise<"ok" | "limit" | "no-account">;
  pairings(accountId: string, now: number): Promise<PairingRow[]>;
  approvePairing(accountId: string, pairingId: string, wrapper: Buffer, labelCiphertext: Buffer, maxDevices: number, now: number): Promise<"ok" | "gone" | "limit">;
  /** The approved wrapper once (the row is deleted), "pending", or "gone" (expired, refused, used, unknown). */
  takePairingResult(accountId: string, pairingId: string, tokenHash: Buffer, now: number): Promise<{ status: "pending" } | { status: "approved"; wrapper: Buffer } | { status: "gone" } | { status: "refused" }>;
  reset(accountId: string): Promise<void>;
}

export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest();
const same = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
/** The same 6-digit code as src/sync/crypto.ts pairingCode. */
export function pairingCode(accountId: string, publicKey: Buffer): string {
  const digest = sha256(`cometrow-pairing-v1|${accountId}|${publicKey.toString("base64")}`);
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}
const codeHash = (pairingId: string, code: string) => sha256(`${pairingId}|${code}`);

/** Offline and development store; production uses PostgresSyncStore (server/vault-sync-postgres.ts). */
export class MemorySyncStore implements SyncStore {
  private accounts = new Map<
    string,
    { authHash: Buffer; seq: number; recovery: Buffer; devices: Map<string, DeviceRow>; wrappers: Map<string, Buffer>; items: Map<string, ItemRow>; pairings: Map<string, PairingRow> }
  >();
  async authHash(accountId: string) {
    return this.accounts.get(accountId)?.authHash;
  }
  async setup(accountId: string, input: { authHash: Buffer; recoveryWrapper: Buffer; device: DeviceRow; deviceWrapper: Buffer | null }) {
    if (this.accounts.has(accountId)) return "exists" as const;
    this.accounts.set(accountId, {
      authHash: input.authHash,
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
  async upsertDevice(accountId: string, device: DeviceRow, wrapper: Buffer | null, maxDevices: number) {
    const a = this.accounts.get(accountId);
    if (!a) return "no-account" as const;
    const existing = a.devices.get(device.deviceId);
    if (existing?.revokedAt) return "revoked" as const;
    if (!existing && [...a.devices.values()].filter((d) => !d.revokedAt).length >= maxDevices) return "limit" as const;
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
    return true;
  }
  async wrappers(accountId: string, deviceId?: string) {
    const a = this.accounts.get(accountId);
    if (!a) return {};
    const device = deviceId ? a.wrappers.get(deviceId) : undefined;
    return { recovery: a.recovery, ...(device ? { device } : {}) };
  }
  async items(accountId: string, since: number, limit: number) {
    const all = [...(this.accounts.get(accountId)?.items.values() ?? [])].filter((i) => i.seq > since).sort((x, y) => x.seq - y.seq);
    return { items: all.slice(0, limit).map((i) => ({ ...i })), more: all.length > limit };
  }
  async putItem(accountId: string, itemId: string, baseVersion: number, ciphertext: Buffer | null, quotaBytes: number, now: number): Promise<PutResult | "no-account"> {
    const a = this.accounts.get(accountId);
    if (!a) return "no-account";
    const current = a.items.get(itemId);
    if ((current?.version ?? 0) !== baseVersion)
      return { status: "conflict", current: { version: current?.version ?? 0, ciphertext: current?.ciphertext ?? null } };
    const used = [...a.items.values()].reduce((n, i) => n + (i.ciphertext?.length ?? 0), 0);
    if (ciphertext && used - (current?.ciphertext?.length ?? 0) + ciphertext.length > quotaBytes) return { status: "quota" };
    const row = { itemId, version: baseVersion + 1, ciphertext, seq: ++a.seq, updatedAt: now };
    a.items.set(itemId, row);
    return { status: "ok", version: row.version };
  }
  async usage(accountId: string) {
    const a = this.accounts.get(accountId);
    return { usedBytes: [...(a?.items.values() ?? [])].reduce((n, i) => n + (i.ciphertext?.length ?? 0), 0), cursor: a?.seq ?? 0 };
  }
  async createPairing(accountId: string, row: PairingRow, maxPending: number, now: number) {
    const a = this.accounts.get(accountId);
    if (!a) return "no-account" as const;
    for (const [id, p] of a.pairings) if (p.expiresAt <= now) a.pairings.delete(id);
    if ([...a.pairings.values()].filter((p) => p.state === "pending").length >= maxPending) return "limit" as const;
    a.pairings.set(row.pairingId, row);
    return "ok" as const;
  }
  async pairings(accountId: string, now: number) {
    return [...(this.accounts.get(accountId)?.pairings.values() ?? [])].filter((p) => p.expiresAt > now && p.state === "pending");
  }
  async approvePairing(accountId: string, pairingId: string, wrapper: Buffer, labelCiphertext: Buffer, maxDevices: number, now: number) {
    const a = this.accounts.get(accountId);
    const p = a?.pairings.get(pairingId);
    if (!a || !p || p.state !== "pending" || p.expiresAt <= now) return "gone" as const;
    if (a.devices.has(p.deviceId) || [...a.devices.values()].filter((d) => !d.revokedAt).length >= maxDevices) {
      p.state = "refused";
      return "limit" as const;
    }
    a.devices.set(p.deviceId, { deviceId: p.deviceId, publicKey: p.publicKey, labelCiphertext, tokenHash: p.tokenHash, createdAt: now, lastSeenAt: now });
    a.wrappers.set(p.deviceId, wrapper);
    Object.assign(p, { state: "approved", wrapper, labelCiphertext });
    return "ok" as const;
  }
  async takePairingResult(accountId: string, pairingId: string, tokenHash: Buffer, now: number) {
    const a = this.accounts.get(accountId);
    const p = a?.pairings.get(pairingId);
    if (!a || !p || !same(p.tokenHash, tokenHash)) return { status: "gone" as const };
    if (p.state === "approved") {
      a.pairings.delete(pairingId);
      return { status: "approved" as const, wrapper: p.wrapper! };
    }
    if (p.state === "refused") {
      a.pairings.delete(pairingId);
      return { status: "refused" as const };
    }
    if (p.expiresAt <= now) {
      a.pairings.delete(pairingId);
      return { status: "gone" as const };
    }
    return { status: "pending" as const };
  }
  async reset(accountId: string) {
    this.accounts.delete(accountId);
  }
}

// Strict input: canonical base64 of a bounded decoded size, uuids, fixed shapes.
const base64 = (maxBytes: number, exactBytes?: number) =>
  z
    .string()
    .max(Math.ceil(maxBytes / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
    .transform((value) => Buffer.from(value, "base64"))
    .refine((b) => (exactBytes === undefined ? b.length > 0 : b.length === exactBytes), "Wrong size.");
const uuid = z.uuid();
const publicKey = base64(65, 65).refine((b) => b[0] === 4, "Uncompressed P-256 key required.");
const wrapper = base64(SYNC_LIMITS.wrapperBytes);
const label = base64(SYNC_LIMITS.labelBytes);
const proof = base64(32, 32);
const registration = z
  .object({ deviceId: uuid, devicePublicKey: publicKey, deviceWrapper: wrapper.nullable(), labelCiphertext: label, accountProof: proof })
  .strict();
const setupBody = registration.extend({ recoveryWrapper: wrapper }).strict();
const putBody = z.object({ baseVersion: z.number().int().min(0).max(2 ** 31 - 2), ciphertext: base64(SYNC_LIMITS.itemBytes) }).strict();
const deviceHeader = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;

class Window {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private ms: number) {}
  /** True while under the limit; `record` false only checks. */
  allow(key: string, now: number, record = true) {
    const recent = (this.hits.get(key) ?? []).filter((t) => t > now - this.ms);
    const ok = recent.length < this.max;
    if (ok && record) recent.push(now);
    this.hits.set(key, recent);
    return ok;
  }
  add(key: string, now: number) {
    this.hits.set(key, [...(this.hits.get(key) ?? []).filter((t) => t > now - this.ms), now]);
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
  // A 4 MB item is 5.6 MB of base64 plus the JSON around it.
  const large = express.json({ limit: Math.ceil(SYNC_LIMITS.itemBytes / 3) * 4 + 1024 });
  // shortcut: rate limits live in this process's memory; with several instances move them to the database.
  const pairingCreations = new Window(SYNC_LIMITS.pairingsPerHour, 3_600_000);
  const wrongCodes = new Window(SYNC_LIMITS.wrongCodesPer10Min, 600_000);
  const base = "/api/sync";
  type Ctx = { account: string; now: number; device?: DeviceRow; token?: { deviceId: string; hash: Buffer } };
  const fail = (res: express.Response, status: number, code: string) => void res.status(status).json({ error: code, code });
  /** The X-Sync-Device header "<deviceId>.<token>", parsed; the token is never stored, only its hash. */
  const tokenOf = (req: express.Request) => {
    const m = deviceHeader.exec(String(req.headers["x-sync-device"] ?? ""));
    return m && uuid.safeParse(m[1]).success ? { deviceId: m[1], hash: sha256(m[2]) } : undefined;
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
          const device = ctx.token && (await store.devices(account)).find((d) => d.deviceId === ctx.token!.deviceId);
          if (!device || !same(device.tokenHash, ctx.token!.hash)) return fail(res, 401, "device-unknown");
          if (device.revokedAt) return fail(res, 403, "revoked");
          ctx.device = device;
          if (ctx.now - device.lastSeenAt > 60_000) await store.touchDevice(account, device.deviceId, ctx.now);
        }
        await work(req, res, ctx);
      } catch {
        if (!res.headersSent) fail(res, 503, "unavailable");
      }
    };
  const parse = <T>(schema: z.ZodType<T>, value: unknown, res: express.Response): T | undefined => {
    const r = schema.safeParse(value);
    if (!r.success) fail(res, 400, "invalid");
    return r.success ? r.data : undefined;
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
    handle(false, async (_req, res, { account, token }) => {
      const [hash, devices, usage] = await Promise.all([store.authHash(account), store.devices(account), store.usage(account)]);
      const mine = token && devices.find((d) => d.deviceId === token.deviceId && same(d.tokenHash, token.hash));
      res.json({
        enabled: true,
        hasWrappers: !!hash,
        thisDevice: mine ? (mine.revokedAt ? "revoked" : "ok") : "unknown",
        devices: devices.map((d) => ({
          deviceId: d.deviceId,
          labelCiphertext: d.labelCiphertext.toString("base64"),
          createdAt: new Date(d.createdAt).toISOString(),
          lastSeenAt: new Date(d.lastSeenAt).toISOString(),
          revoked: !!d.revokedAt,
        })),
        quota: { usedBytes: usage.usedBytes, limitBytes: settings.quotaBytes },
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
        { authHash: sha256(b.accountProof), recoveryWrapper: b.recoveryWrapper, device: newDevice(b, token.hash, now), deviceWrapper: b.deviceWrapper },
        now,
      );
      if (result === "exists") return fail(res, 409, "exists");
      count("sync.setup");
      res.status(204).end();
    }),
  );
  // Registers this browser after a recovery-key unlock, or changes its own wrapper ("remember this
  // device" on or off). The proof shows knowledge of AK; the server compares hashes in constant time.
  router.post(
    `${base}/devices`,
    small,
    handle(false, async (req, res, { account, now, token }) => {
      const b = parse(registration, req.body, res);
      if (!b) return;
      if (!token || token.deviceId !== b.deviceId) return fail(res, 400, "invalid");
      const hash = await store.authHash(account);
      if (!hash) return fail(res, 404, "not-set-up");
      if (!same(hash, sha256(b.accountProof))) return fail(res, 403, "wrong-proof");
      const existing = (await store.devices(account)).find((d) => d.deviceId === b.deviceId);
      if (existing && !same(existing.tokenHash, token.hash)) return fail(res, 403, "device-unknown");
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
  router.post(
    `${base}/devices/:deviceId/revoke`,
    handle(true, async (req, res, { account, now }) => {
      if (!uuid.safeParse(req.params.deviceId).success) return fail(res, 404, "unknown");
      if (!(await store.revokeDevice(account, String(req.params.deviceId), now))) return fail(res, 404, "unknown");
      count("sync.device.revoke");
      res.status(204).end();
    }),
  );
  router.get(
    `${base}/items`,
    handle(true, async (req, res, { account }) => {
      const since = Number(req.query.since ?? 0);
      const limit = Math.min(Number(req.query.limit ?? SYNC_LIMITS.pageItems), SYNC_LIMITS.pageItems);
      if (!Number.isSafeInteger(since) || since < 0 || !Number.isInteger(limit) || limit < 1) return fail(res, 400, "invalid");
      const page = await store.items(account, since, limit);
      count("sync.pull");
      res.json({
        items: page.items.map((i) => ({
          itemId: i.itemId,
          version: i.version,
          ciphertext: i.ciphertext ? i.ciphertext.toString("base64") : null,
          deleted: !i.ciphertext,
          updatedAt: new Date(i.updatedAt).toISOString(),
        })),
        cursor: String(page.items.at(-1)?.seq ?? since),
        more: page.more,
      });
    }),
  );
  const write = (res: express.Response, ctx: Ctx, itemId: string, baseVersion: number, ciphertext: Buffer | null) =>
    store.putItem(ctx.account, itemId, baseVersion, ciphertext, settings.quotaBytes, ctx.now).then((r) => {
      if (r === "no-account") return fail(res, 404, "not-set-up");
      if (r.status === "quota") return fail(res, 413, "quota");
      if (r.status === "conflict") {
        count("sync.conflict");
        return void res.status(409).json({
          code: "conflict",
          current: { version: r.current.version, ciphertext: r.current.ciphertext ? r.current.ciphertext.toString("base64") : null },
        });
      }
      count("sync.push");
      res.json({ version: r.version });
    });
  router.put(
    `${base}/items/:itemId`,
    handle(true, async (req, res, ctx) => {
      if (!uuid.safeParse(req.params.itemId).success) return fail(res, 400, "invalid");
      // The size check before parsing: an oversized item is 413, not a generic parse error.
      if (Number(req.headers["content-length"] ?? 0) > Math.ceil(SYNC_LIMITS.itemBytes / 3) * 4 + 1024) return fail(res, 413, "too-large");
      if (!(await new Promise<boolean>((resolve) => large(req, res, (e?: unknown) => resolve(!e))))) return fail(res, 400, "invalid");
      const b = parse(putBody, req.body, res);
      if (b) await write(res, ctx, String(req.params.itemId), b.baseVersion, b.ciphertext);
    }),
  );
  router.delete(
    `${base}/items/:itemId`,
    handle(true, async (req, res, ctx) => {
      const baseVersion = Number(req.query.baseVersion);
      if (!uuid.safeParse(req.params.itemId).success || !Number.isInteger(baseVersion) || baseVersion < 1) return fail(res, 400, "invalid");
      await write(res, ctx, String(req.params.itemId), baseVersion, null);
    }),
  );

  // Pairing. The new device (session only, with its own fresh token) asks; an existing device finds
  // the request by the code the user types and approves it with AK wrapped to the new device's key.
  router.post(
    `${base}/pairings`,
    small,
    handle(false, async (req, res, { account, now, token }) => {
      const b = parse(z.object({ newDevicePublicKey: publicKey, deviceId: uuid }).strict(), req.body, res);
      if (!b) return;
      if (!token || token.deviceId !== b.deviceId) return fail(res, 400, "invalid");
      if (!(await store.authHash(account))) return fail(res, 404, "not-set-up");
      if (!pairingCreations.allow(account, now)) return fail(res, 429, "rate-limited");
      const pairingId = randomUUID();
      const code = pairingCode(account, b.newDevicePublicKey);
      const r = await store.createPairing(
        account,
        { pairingId, deviceId: b.deviceId, publicKey: b.newDevicePublicKey, tokenHash: token.hash, codeHash: codeHash(pairingId, code), createdAt: now, expiresAt: now + SYNC_LIMITS.pairingMs, state: "pending" },
        SYNC_LIMITS.pendingPairings,
        now,
      );
      if (r === "limit") return fail(res, 429, "rate-limited");
      if (r === "no-account") return fail(res, 404, "not-set-up");
      count("sync.pairing.created");
      res.json({ pairingId, code, expiresAt: new Date(now + SYNC_LIMITS.pairingMs).toISOString() });
    }),
  );
  router.post(
    `${base}/pairings/find`,
    small,
    handle(true, async (req, res, { account, now }) => {
      const b = parse(z.object({ code: z.string().regex(/^\d{6}$/) }).strict(), req.body, res);
      if (!b) return;
      if (!wrongCodes.allow(account, now, false)) return fail(res, 429, "rate-limited");
      const pending = await store.pairings(account, now);
      // Every pending request is compared, in constant time, so timing does not reveal a near match.
      const matches = pending.filter((p) => same(p.codeHash, codeHash(p.pairingId, b.code)));
      if (matches.length !== 1) {
        wrongCodes.add(account, now);
        count("sync.pairing.wrong-code");
        return fail(res, 404, "wrong-code");
      }
      const p = matches[0];
      res.json({ pairingId: p.pairingId, deviceId: p.deviceId, newDevicePublicKey: p.publicKey.toString("base64") });
    }),
  );
  router.post(
    `${base}/pairings/:id/approve`,
    small,
    handle(true, async (req, res, { account, now }) => {
      if (!uuid.safeParse(req.params.id).success) return fail(res, 410, "expired");
      const b = parse(z.object({ deviceWrapper: wrapper, labelCiphertext: label }).strict(), req.body, res);
      if (!b) return;
      const r = await store.approvePairing(account, String(req.params.id), b.deviceWrapper, b.labelCiphertext, settings.maxDevices, now);
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
      const r = await store.takePairingResult(account, String(req.params.id), token.hash, now);
      if (r.status === "pending") return void res.status(202).json({ status: "pending" });
      if (r.status === "refused") return fail(res, 403, "refused");
      if (r.status === "gone") {
        count("sync.pairing.expired");
        return fail(res, 410, "expired");
      }
      res.json({ deviceWrapper: r.wrapper.toString("base64") });
    }),
  );
  router.post(
    `${base}/reset`,
    small,
    handle(false, async (req, res, { account }) => {
      if (!parse(z.object({ confirm: z.literal("DELETE SYNCED DATA") }).strict(), req.body, res)) return;
      await store.reset(account);
      count("sync.reset");
      res.status(204).end();
    }),
  );
  return router;
}
