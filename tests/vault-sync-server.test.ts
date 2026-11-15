// Sync server routes (server/vault-sync.ts) with the memory store: validation, quota, device
// limit, pairing expiry, one use and rate limit, revocation, reset, the status field, and that
// nothing is logged but fixed counts.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import { createApp } from "../server/app";
import { MemorySyncStore, syncRoutes } from "../server/vault-sync";
import { takeCounts } from "../server/counters";
import { operatorSql } from "../scripts/account-operator";

const closers: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  vi.restoreAllMocks();
});
async function listen(handler: express.Express) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  closers.push(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${address.port}`;
}
/** The routes alone, with the account taken from a test header and a settable clock. */
async function bare(settings: { quotaBytes: number; maxDevices: number; pageBytes?: number; writeBurst?: number } = { quotaBytes: 10_000, maxDevices: 2 }) {
  let now = 1_700_000_000_000;
  const store = new MemorySyncStore();
  const app = express();
  app.use((req, res, next) => {
    res.locals.accountId = req.headers["x-test-account"];
    next();
  });
  app.use(syncRoutes(store, settings, (res) => res.locals.accountId, () => now));
  const origin = await listen(app);
  const b64 = (n: number, fill?: number) => (fill === undefined ? randomBytes(n) : Buffer.alloc(n, fill)).toString("base64");
  const key = () => Buffer.concat([Buffer.from([4]), randomBytes(64)]).toString("base64");
  const newDevice = () => ({ deviceId: randomUUID(), token: randomBytes(32).toString("base64url") });
  const call = (account: string, method: string, path: string, body?: unknown, device?: { deviceId: string; token: string }) =>
    fetch(`${origin}/api/sync${path}`, {
      method,
      headers: {
        "x-test-account": account,
        "content-type": "application/json",
        ...(device ? { "x-sync-device": `${device.deviceId}.${device.token}` } : {}),
      },
      ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    });
  const proof = b64(32, 7);
  const recoveryProof = b64(32, 9);
  const setup = async (account: string) => {
    const d = newDevice();
    const r = await call(account, "POST", "/setup", { deviceId: d.deviceId, devicePublicKey: key(), deviceWrapper: b64(126), recoveryWrapper: b64(61), labelCiphertext: b64(40), accountProof: proof, recoveryProof }, d);
    return { r, d };
  };
  return { call, setup, b64, key, newDevice, proof, recoveryProof, store, advance: (ms: number) => (now += ms) };
}

describe("sync routes", () => {
  it("sets up once, validates strictly, and keeps accounts apart", async () => {
    const s = await bare();
    const { r, d } = await s.setup("alice");
    expect(r.status).toBe(204);
    expect((await s.setup("alice")).r.status).toBe(409);
    const state = await (await s.call("alice", "GET", "/state", undefined, d)).json();
    expect(state).toMatchObject({ enabled: true, hasWrappers: true, thisDevice: "ok", quota: { usedBytes: 0, limitBytes: 10_000 }, cursor: "0" });
    expect(state.devices).toHaveLength(1);
    expect((await (await s.call("bob", "GET", "/state")).json()).hasWrappers).toBe(false);
    // Bob's session cannot read Alice's items, even with Alice's device header.
    expect((await s.call("bob", "GET", "/items?since=0", undefined, d)).status).toBe(401);
    for (const bad of [
      { deviceId: "not-a-uuid" },
      { devicePublicKey: Buffer.alloc(64, 4).toString("base64") },
      { devicePublicKey: Buffer.alloc(65, 2).toString("base64") }, // not an uncompressed point
      { recoveryWrapper: "not base64!" },
      { recoveryWrapper: s.b64(600) },
      { accountProof: s.b64(31) },
      { extra: true },
    ]) {
      const n = s.newDevice();
      const body = { deviceId: n.deviceId, devicePublicKey: s.key(), deviceWrapper: null, recoveryWrapper: s.b64(61), labelCiphertext: s.b64(40), accountProof: s.proof, recoveryProof: s.recoveryProof, ...bad };
      expect((await s.call("carol", "POST", "/setup", body, n)).status, JSON.stringify(bad)).toBe(400);
    }
    // The device header must name the device being set up.
    const n = s.newDevice();
    expect((await s.call("carol", "POST", "/setup", { deviceId: randomUUID(), devicePublicKey: s.key(), deviceWrapper: null, recoveryWrapper: s.b64(61), labelCiphertext: s.b64(40), accountProof: s.proof, recoveryProof: s.recoveryProof }, n)).status).toBe(400);
    expect((await s.call("", "GET", "/state")).status).toBe(401);
  });

  it("puts with version checks, conflicts with the current copy, tombstones, cursors and quota", async () => {
    const s = await bare({ quotaBytes: 3000, maxDevices: 2 });
    const { d } = await s.setup("alice");
    const id = randomUUID();
    const put = (baseVersion: number, bytes: number, item = id) => s.call("alice", "PUT", `/items/${item}`, { baseVersion, ciphertext: s.b64(bytes) }, d);
    expect((await put(0, 1000)).status).toBe(200);
    const conflict = await put(0, 1000);
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).current.version).toBe(1);
    expect(await (await put(1, 1200)).json()).toEqual({ version: 2 });
    expect((await put(0, 1900, randomUUID())).status).toBe(413); // 1200 + 1900 > 3000
    expect((await put(0, 1700, randomUUID())).status).toBe(200);
    expect((await s.call("alice", "PUT", `/items/not-a-uuid`, { baseVersion: 0, ciphertext: s.b64(30) }, d)).status).toBe(400);
    expect((await s.call("alice", "PUT", `/items/${id}`, { baseVersion: -1, ciphertext: s.b64(30) }, d)).status).toBe(400);
    expect((await s.call("alice", "PUT", `/items/${id}`, "{not json", d)).status).toBe(400);
    // Review L1: shorter than a nonce and a tag is no ciphertext (the database refuses it too).
    expect((await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: s.b64(27) }, d)).status).toBe(400);
    // Over 4 MB: refused before parsing, as "too-large", never "quota" (review M6).
    const huge = await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: "A".repeat(5_700_000) }, d);
    expect(huge.status).toBe(413);
    expect((await huge.json()).code).toBe("too-large");
    // A delete is a PUT of an encrypted tombstone (review H4); nothing to delete at version 0.
    expect((await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: s.b64(40), deleted: true }, d)).status).toBe(400);
    expect((await s.call("alice", "DELETE", `/items/${id}?baseVersion=2`, undefined, d)).status).toBe(404); // no unauthenticated delete route
    const del = await s.call("alice", "PUT", `/items/${id}`, { baseVersion: 2, ciphertext: s.b64(40), deleted: true }, d);
    expect(await del.json()).toEqual({ version: 3 });
    const page = await (await s.call("alice", "GET", "/items?since=0&limit=1", undefined, d)).json();
    expect(page.items).toHaveLength(1);
    expect(page.more).toBe(true);
    const rest = await (await s.call("alice", "GET", `/items?since=${page.cursor}`, undefined, d)).json();
    expect(rest.items.map((i: { deleted: boolean; ciphertext: string }) => [i.deleted, Buffer.from(i.ciphertext, "base64").length])).toEqual([[true, 40]]);
    expect(rest.more).toBe(false);
    // The tombstone frees the item's 1200 bytes and takes its own 40; a tombstone is never refused for quota.
    expect((await (await s.call("alice", "GET", "/state", undefined, d)).json()).quota.usedBytes).toBe(1740);
    expect((await s.call("alice", "GET", "/items?since=-1", undefined, d)).status).toBe(400);
    expect((await s.call("alice", "GET", "/items?since=0")).status).toBe(401); // no device header
  });

  it("enforces the device limit, refuses a revoked device and deletes its wrapper", async () => {
    const s = await bare();
    const { d } = await s.setup("alice");
    const register = (n: { deviceId: string; token: string }, proof = s.proof, recoveryProof: string | undefined = s.recoveryProof) =>
      s.call("alice", "POST", "/devices", { deviceId: n.deviceId, devicePublicKey: s.key(), deviceWrapper: s.b64(126), labelCiphertext: s.b64(40), accountProof: proof, ...(recoveryProof ? { recoveryProof } : {}) }, n);
    const second = s.newDevice();
    expect((await register(second, s.b64(32, 8))).status).toBe(403); // wrong proof of AK
    // AK alone cannot enrol a new id (a removed device that kept AK): the recovery key proof is needed.
    expect((await register(second, s.proof, "")).status).toBe(403);
    expect((await register(second, s.proof, s.b64(32, 1))).status).toBe(403);
    expect((await register(second)).status).toBe(204);
    expect((await register(s.newDevice())).status).toBe(409); // limit 2
    const wrappers = await (await s.call("alice", "GET", `/wrappers?deviceId=${second.deviceId}`, undefined, second)).json();
    expect(Object.keys(wrappers).sort()).toEqual(["device", "recovery"]);
    // Without the device's own token the session gets the recovery wrapper only.
    expect(Object.keys(await (await s.call("alice", "GET", `/wrappers?deviceId=${second.deviceId}`)).json())).toEqual(["recovery"]);
    // Review H4: a device token alone cannot remove a device; a fresh AK proof is needed too.
    expect((await s.call("alice", "POST", `/devices/${second.deviceId}/revoke`, {}, d)).status).toBe(400);
    expect((await s.call("alice", "POST", `/devices/${second.deviceId}/revoke`, { accountProof: s.b64(32, 8) }, d)).status).toBe(403);
    expect((await s.call("alice", "POST", `/devices/${second.deviceId}/revoke`, { accountProof: s.proof })).status).toBe(401); // proof without a device token
    expect((await s.call("alice", "POST", `/devices/${second.deviceId}/revoke`, { accountProof: s.proof }, d)).status).toBe(204);
    const refused = await s.call("alice", "GET", "/items?since=0", undefined, second);
    expect(refused.status).toBe(403);
    expect((await refused.json()).code).toBe("revoked");
    expect((await s.call("alice", "GET", `/wrappers?deviceId=${second.deviceId}`, undefined, second)).status).toBe(403);
    expect((await register(second)).status).toBe(403); // a revoked id cannot come back
    expect((await register(s.newDevice())).status).toBe(204); // its slot is free again
    // A forged token for an existing device is refused.
    expect((await s.call("alice", "GET", "/items?since=0", undefined, { deviceId: d.deviceId, token: "A".repeat(43) })).status).toBe(401);
  });

  it("pairs with a commitment: lists pending requests to a signed-in device, approves with a tag and an AK proof, completes once within 10 minutes, limits creations", async () => {
    const s = await bare({ quotaBytes: 10_000, maxDevices: 5 });
    const { d } = await s.setup("alice");
    const ask = async () => {
      const n = s.newDevice();
      const newDevicePublicKey = s.key();
      const pairingId = randomUUID();
      const commitment = s.b64(32);
      const r = await s.call("alice", "POST", "/pairings", { pairingId, newDevicePublicKey, deviceId: n.deviceId, commitment }, n);
      return { n, r, pairingId, commitment, newDevicePublicKey, body: r.status === 200 ? await r.json() : undefined };
    };
    const first = await ask();
    expect(first.r.status).toBe(200);
    // Review H1/L6: no code ever reaches the server, so nothing about it comes back.
    expect(Object.keys(first.body).sort()).toEqual(["expiresAt", "pairingId"]);
    expect(first.body.pairingId).toBe(first.pairingId);
    // The same pairing id twice is refused (the id is part of the commitment's salt).
    const twin = s.newDevice();
    expect((await s.call("alice", "POST", "/pairings", { pairingId: first.pairingId, newDevicePublicKey: s.key(), deviceId: twin.deviceId, commitment: s.b64(32) }, twin)).status).toBe(409);
    const result = () => s.call("alice", "GET", `/pairings/${first.pairingId}/result`, undefined, first.n);
    expect((await result()).status).toBe(202);
    // Another session's token cannot collect it.
    expect((await s.call("alice", "GET", `/pairings/${first.pairingId}/result`, undefined, s.newDevice())).status).toBe(410);
    // A signed-in device lists the waiting requests (key and commitment, never a code); the session alone cannot.
    expect((await s.call("alice", "GET", "/pairings")).status).toBe(401);
    const listed = await (await s.call("alice", "GET", "/pairings", undefined, d)).json();
    expect(listed.pairings).toEqual([
      expect.objectContaining({ pairingId: first.pairingId, deviceId: first.n.deviceId, newDevicePublicKey: first.newDevicePublicKey, commitment: first.commitment }),
    ]);
    expect((await (await s.call("alice", "GET", "/state", undefined, d)).json()).pairingRequestedAt).toBe(new Date(1_700_000_000_000).toISOString());
    const approval = { deviceWrapper: s.b64(126), labelCiphertext: s.b64(40), tag: s.b64(32) };
    const approve = (body: Record<string, unknown> = { ...approval, accountProof: s.proof }) =>
      s.call("alice", "POST", `/pairings/${first.pairingId}/approve`, body, d);
    // A device token alone cannot mint a device: the AK proof is required.
    expect((await approve({ ...approval })).status).toBe(400);
    expect((await approve({ ...approval, accountProof: s.b64(32, 8) })).status).toBe(403);
    expect((await approve()).status).toBe(204);
    expect((await approve()).status).toBe(410); // one use
    const done = await result();
    expect(done.status).toBe(200);
    expect(await done.json()).toEqual({ deviceWrapper: approval.deviceWrapper, tag: approval.tag });
    // Not a device yet: the new device creates itself only after it checked the tag.
    expect((await s.call("alice", "GET", "/items?since=0", undefined, first.n)).status).toBe(401);
    const complete = (remember: boolean, n = first.n) => s.call("alice", "POST", `/pairings/${first.pairingId}/complete`, { remember }, n);
    expect((await complete(false, s.newDevice())).status).toBe(410);
    expect((await complete(false)).status).toBe(204);
    expect((await complete(false)).status).toBe(410); // once
    expect((await s.call("alice", "GET", "/items?since=0", undefined, first.n)).status).toBe(200);
    // Not remembered: no device wrapper is kept on the server (review L9).
    expect(Object.keys(await (await s.call("alice", "GET", `/wrappers?deviceId=${first.n.deviceId}`, undefined, first.n)).json())).toEqual(["recovery"]);
    // Expiry after 10 minutes, also for an approved request not collected in time (review M7).
    const late = await ask();
    await s.call("alice", "POST", `/pairings/${late.pairingId}/approve`, { ...approval, accountProof: s.proof }, d);
    s.advance(10 * 60_000 + 1);
    expect((await s.call("alice", "GET", `/pairings/${late.pairingId}/result`, undefined, late.n)).status).toBe(410);
    expect((await s.call("alice", "POST", `/pairings/${late.pairingId}/complete`, { remember: true }, late.n)).status).toBe(410);
    // At most 5 pairing requests an hour (3 of them pending at once).
    s.advance(3_600_000);
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await ask()).r.status);
    expect(statuses).toContain(429);
    // Pairing needs sync set up.
    const n = s.newDevice();
    expect((await s.call("bob", "POST", "/pairings", { pairingId: randomUUID(), newDevicePublicKey: s.key(), deviceId: n.deviceId, commitment: s.b64(32) }, n)).status).toBe(404);
  });

  it("an approval is void once its approver is removed (review M7), and approvals are rate-limited", async () => {
    const s = await bare({ quotaBytes: 10_000, maxDevices: 5 });
    const { d } = await s.setup("alice");
    const register = async () => {
      const n = s.newDevice();
      await s.call("alice", "POST", "/devices", { deviceId: n.deviceId, devicePublicKey: s.key(), deviceWrapper: null, labelCiphertext: s.b64(40), accountProof: s.proof, recoveryProof: s.recoveryProof }, n);
      return n;
    };
    const approver = await register();
    const ask = async () => {
      const n = s.newDevice();
      const pairingId = randomUUID();
      await s.call("alice", "POST", "/pairings", { pairingId, newDevicePublicKey: s.key(), deviceId: n.deviceId, commitment: s.b64(32) }, n);
      return { n, pairingId };
    };
    const approval = { deviceWrapper: s.b64(126), labelCiphertext: s.b64(40), tag: s.b64(32), accountProof: s.proof };
    const p = await ask();
    expect((await s.call("alice", "POST", `/pairings/${p.pairingId}/approve`, approval, approver)).status).toBe(204);
    expect((await s.call("alice", "POST", `/devices/${approver.deviceId}/revoke`, { accountProof: s.proof }, d)).status).toBe(204);
    expect((await s.call("alice", "GET", `/pairings/${p.pairingId}/result`, undefined, p.n)).status).toBe(410);
    expect((await s.call("alice", "POST", `/pairings/${p.pairingId}/complete`, { remember: true }, p.n)).status).toBe(410);
    expect((await s.call("alice", "GET", "/items?since=0", undefined, p.n)).status).toBe(401);
    // Ten approvals per 10 minutes per account (one was used above).
    const codes = [];
    for (let i = 0; i < 10; i++) codes.push((await s.call("alice", "POST", `/pairings/${randomUUID()}/approve`, approval, d)).status);
    expect(codes.slice(0, 9).every((c) => c === 410)).toBe(true);
    expect(codes[9]).toBe(429);
  });

  it("refuses an approval past the device limit and tells the new device", async () => {
    const s = await bare({ quotaBytes: 10_000, maxDevices: 1 });
    const { d } = await s.setup("alice");
    const n = s.newDevice();
    const pairingId = randomUUID();
    await s.call("alice", "POST", "/pairings", { pairingId, newDevicePublicKey: s.key(), deviceId: n.deviceId, commitment: s.b64(32) }, n);
    expect((await s.call("alice", "POST", `/pairings/${pairingId}/approve`, { deviceWrapper: s.b64(126), labelCiphertext: s.b64(40), tag: s.b64(32), accountProof: s.proof }, d)).status).toBe(409);
    expect((await s.call("alice", "GET", `/pairings/${pairingId}/result`, undefined, n)).status).toBe(403);
  });

  it("resets only with the confirmation AND a device token with an AK proof or the recovery proof (review C1); counts only, never content", async () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    const s = await bare();
    takeCounts();
    const { d } = await s.setup("alice");
    const canary = Buffer.from("CANARY-CIPHERTEXT-CANARY").toString("base64");
    await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: canary + s.b64(30) }, d);
    const reset = (body: Record<string, unknown>, device?: { deviceId: string; token: string }) => s.call("alice", "POST", "/reset", { confirm: "DELETE SYNCED DATA", ...body }, device);
    expect((await s.call("alice", "POST", "/reset", { confirm: "delete synced data", accountProof: s.proof }, d)).status).toBe(400);
    // The session alone (a taken-over Google account) resets nothing.
    expect((await reset({})).status).toBe(403);
    expect((await reset({}, d)).status).toBe(403);
    expect((await reset({ accountProof: s.proof })).status).toBe(401); // AK proof without a device token
    expect((await reset({ accountProof: s.b64(32, 8) }, d)).status).toBe(403);
    expect((await reset({ recoveryProof: s.b64(32, 1) })).status).toBe(403);
    expect((await (await s.call("alice", "GET", "/state")).json()).hasWrappers).toBe(true);
    expect((await reset({ accountProof: s.proof }, d)).status).toBe(204);
    expect((await (await s.call("alice", "GET", "/state")).json()).hasWrappers).toBe(false);
    expect((await s.call("alice", "GET", "/items?since=0", undefined, d)).status).toBe(401);
    expect((await reset({ accountProof: s.proof }, d)).status).toBe(404);
    // Every device lost: the recovery key's proof alone, with the session.
    await s.setup("alice");
    expect((await reset({ recoveryProof: s.recoveryProof })).status).toBe(204);
    expect(Object.keys(takeCounts()).sort()).toEqual(["sync.push", "sync.reset", "sync.setup"]);
    for (const spy of logs) expect(spy).not.toHaveBeenCalled();
  });

  it("pages by bytes, limits writes per account, and purges tombstones after 90 days (review M8)", async () => {
    const s = await bare({ quotaBytes: 1_000_000, maxDevices: 2, pageBytes: 2500, writeBurst: 6 });
    const { d } = await s.setup("alice");
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of ids) expect((await s.call("alice", "PUT", `/items/${id}`, { baseVersion: 0, ciphertext: s.b64(1000) }, d)).status).toBe(200);
    const first = await (await s.call("alice", "GET", "/items?since=0", undefined, d)).json();
    expect(first.items.map((i: { itemId: string }) => i.itemId)).toEqual(ids.slice(0, 2));
    expect(first.more).toBe(true);
    const second = await (await s.call("alice", "GET", `/items?since=${first.cursor}`, undefined, d)).json();
    expect(second.items.map((i: { itemId: string }) => i.itemId)).toEqual(ids.slice(2));
    // A tombstone, then 90 days: the next write purges it.
    expect((await s.call("alice", "PUT", `/items/${ids[0]}`, { baseVersion: 1, ciphertext: s.b64(40), deleted: true }, d)).status).toBe(200);
    // Six writes in a burst (four so far): the seventh is refused until the bucket refills.
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: s.b64(40) }, d)).status);
    expect(statuses).toEqual([200, 200, 429]);
    s.advance(91 * 24 * 3_600_000);
    expect((await s.call("alice", "PUT", `/items/${ids[1]}`, { baseVersion: 1, ciphertext: s.b64(1000) }, d)).status).toBe(200);
    const left = (await s.store.items("alice", 0, 10, 1e9)).items.map((i) => i.itemId);
    expect(left).not.toContain(ids[0]);
    expect((await (await s.call("alice", "GET", "/state", undefined, d)).json()).quota.usedBytes).toBe(2080);
  });
});

describe("in the app", () => {
  it("is mounted only with the switch, behind the session and CSRF, and the status names its limits", async () => {
    const serve = async (vaultSync?: { quotaBytes: number; maxDevices: number }) => {
      const server = createServer();
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw Error("port");
      const origin = `http://127.0.0.1:${address.port}`;
      server.on("request", createApp({ origin, dev: true, ...(vaultSync ? { vaultSync: { ...vaultSync, store: new MemorySyncStore() } } : {}) }));
      closers.push(() => new Promise((resolve) => server.close(resolve)));
      const status = await fetch(`${origin}/api/status`);
      const cookie = status.headers.getSetCookie()[0].split(";")[0];
      return { origin, cookie, status: await status.json() };
    };
    const without = await serve();
    expect(without.status).not.toHaveProperty("vaultSync");
    expect((await fetch(`${without.origin}/api/sync/state`, { headers: { cookie: without.cookie } })).status).toBe(404);
    const withSync = await serve({ quotaBytes: 200 * 1024 * 1024, maxDevices: 5 });
    expect(withSync.status.vaultSync).toEqual({ quotaBytes: 200 * 1024 * 1024, maxDevices: 5 });
    expect((await fetch(`${withSync.origin}/api/sync/state`)).status).toBe(401); // no session
    expect((await fetch(`${withSync.origin}/api/sync/state`, { headers: { cookie: withSync.cookie } })).status).toBe(200);
    const noCsrf = await fetch(`${withSync.origin}/api/sync/reset`, {
      method: "POST",
      headers: { cookie: withSync.cookie, "content-type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE SYNCED DATA" }),
    });
    expect(noCsrf.status).toBe(403);
  });
});

describe("in production mode", () => {
  it("answers bad or oversized JSON with a code and logs nothing (no body in the logs)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    try {
      const s = await bare();
      const { d } = await s.setup("alice");
      for (const [path, body] of [
        ["/setup", '{"deviceId":"CANARY-BODY'],
        ["/devices", "x".repeat(20_000)],
        ["/pairings", '{"pairingId":'],
        ["/reset", "{bad"],
      ] as const) {
        const r = await s.call("alice", "POST", path, body, d);
        expect([400, 413], path).toContain(r.status);
        expect(await r.text()).not.toContain("CANARY");
      }
      for (const spy of logs) expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("tells a signed-in device, and only it, that a pairing request waits", async () => {
    const s = await bare();
    const { d } = await s.setup("alice");
    expect((await (await s.call("alice", "GET", "/state", undefined, d)).json()).pairingPending).toBe(false);
    const n = s.newDevice();
    await s.call("alice", "POST", "/pairings", { pairingId: randomUUID(), newDevicePublicKey: s.key(), deviceId: n.deviceId, commitment: s.b64(32) }, n);
    expect((await (await s.call("alice", "GET", "/state", undefined, d)).json()).pairingPending).toBe(true);
    expect((await (await s.call("alice", "GET", "/state")).json()).pairingPending).toBe(false);
  });
});

describe("account erase", () => {
  it("deletes every sync table for the account, children before sync_accounts, before the user row", () => {
    const erase = operatorSql("erase", "plain@example.test");
    const at = (table: string) => erase.indexOf(`DELETE FROM "${table}"`);
    for (const table of ["sync_pairings", "sync_wrappers", "sync_devices", "sync_items"]) {
      expect(at(table), table).toBeGreaterThan(-1);
      expect(at(table)).toBeLessThan(at("sync_accounts"));
    }
    expect(at("sync_accounts")).toBeLessThan(at("user"));
  });
});
