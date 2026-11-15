// Sync server routes (server/vault-sync.ts) with the memory store: validation, quota, device
// limit, pairing expiry, one use and rate limit, revocation, reset, the status field, and that
// nothing is logged but fixed counts.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import { createApp } from "../server/app";
import { MemorySyncStore, pairingCode, syncRoutes } from "../server/vault-sync";
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
async function bare(settings = { quotaBytes: 10_000, maxDevices: 2 }) {
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
  const setup = async (account: string) => {
    const d = newDevice();
    const r = await call(account, "POST", "/setup", { deviceId: d.deviceId, devicePublicKey: key(), deviceWrapper: b64(126), recoveryWrapper: b64(61), labelCiphertext: b64(40), accountProof: proof }, d);
    return { r, d };
  };
  return { call, setup, b64, key, newDevice, proof, store, advance: (ms: number) => (now += ms) };
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
      const body = { deviceId: n.deviceId, devicePublicKey: s.key(), deviceWrapper: null, recoveryWrapper: s.b64(61), labelCiphertext: s.b64(20), accountProof: s.proof, ...bad };
      expect((await s.call("carol", "POST", "/setup", body, n)).status, JSON.stringify(bad)).toBe(400);
    }
    // The device header must name the device being set up.
    const n = s.newDevice();
    expect((await s.call("carol", "POST", "/setup", { deviceId: randomUUID(), devicePublicKey: s.key(), deviceWrapper: null, recoveryWrapper: s.b64(61), labelCiphertext: s.b64(20), accountProof: s.proof }, n)).status).toBe(400);
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
    // Over 4 MB: refused before parsing.
    expect((await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: "A".repeat(5_700_000) }, d)).status).toBe(413);
    const del = await s.call("alice", "DELETE", `/items/${id}?baseVersion=2`, undefined, d);
    expect(await del.json()).toEqual({ version: 3 });
    const page = await (await s.call("alice", "GET", "/items?since=0&limit=1", undefined, d)).json();
    expect(page.items).toHaveLength(1);
    expect(page.more).toBe(true);
    const rest = await (await s.call("alice", "GET", `/items?since=${page.cursor}`, undefined, d)).json();
    expect(rest.items.map((i: { deleted: boolean }) => i.deleted)).toEqual([true]);
    expect(rest.more).toBe(false);
    // After the tombstone frees 1200 bytes the quota has room again.
    expect((await (await s.call("alice", "GET", "/state", undefined, d)).json()).quota.usedBytes).toBe(1700);
    expect((await s.call("alice", "GET", "/items?since=-1", undefined, d)).status).toBe(400);
    expect((await s.call("alice", "GET", "/items?since=0")).status).toBe(401); // no device header
  });

  it("enforces the device limit, refuses a revoked device and deletes its wrapper", async () => {
    const s = await bare();
    const { d } = await s.setup("alice");
    const register = (n: { deviceId: string; token: string }, proof = s.proof) =>
      s.call("alice", "POST", "/devices", { deviceId: n.deviceId, devicePublicKey: s.key(), deviceWrapper: s.b64(126), labelCiphertext: s.b64(20), accountProof: proof }, n);
    const second = s.newDevice();
    expect((await register(second, s.b64(32, 8))).status).toBe(403); // wrong proof of AK
    expect((await register(second)).status).toBe(204);
    expect((await register(s.newDevice())).status).toBe(409); // limit 2
    const wrappers = await (await s.call("alice", "GET", `/wrappers?deviceId=${second.deviceId}`, undefined, second)).json();
    expect(Object.keys(wrappers).sort()).toEqual(["device", "recovery"]);
    // Without the device's own token the session gets the recovery wrapper only.
    expect(Object.keys(await (await s.call("alice", "GET", `/wrappers?deviceId=${second.deviceId}`)).json())).toEqual(["recovery"]);
    expect((await s.call("alice", "POST", `/devices/${second.deviceId}/revoke`, undefined, d)).status).toBe(204);
    const refused = await s.call("alice", "GET", "/items?since=0", undefined, second);
    expect(refused.status).toBe(403);
    expect((await refused.json()).code).toBe("revoked");
    expect((await s.call("alice", "GET", `/wrappers?deviceId=${second.deviceId}`, undefined, second)).status).toBe(403);
    expect((await register(second)).status).toBe(403); // a revoked id cannot come back
    expect((await register(s.newDevice())).status).toBe(204); // its slot is free again
    // A forged token for an existing device is refused.
    expect((await s.call("alice", "GET", "/items?since=0", undefined, { deviceId: d.deviceId, token: "A".repeat(43) })).status).toBe(401);
  });

  it("pairs once within 10 minutes, checks the code, limits attempts and creations", async () => {
    const s = await bare({ quotaBytes: 10_000, maxDevices: 5 });
    const { d } = await s.setup("alice");
    const ask = async () => {
      const n = s.newDevice();
      const newDevicePublicKey = s.key();
      const r = await s.call("alice", "POST", "/pairings", { newDevicePublicKey, deviceId: n.deviceId }, n);
      return { n, r, newDevicePublicKey, body: r.status === 200 ? await r.json() : undefined };
    };
    const first = await ask();
    expect(first.r.status).toBe(200);
    expect(first.body.code).toBe(pairingCode("alice", Buffer.from(first.newDevicePublicKey, "base64")));
    const result = () => s.call("alice", "GET", `/pairings/${first.body.pairingId}/result`, undefined, first.n);
    expect((await result()).status).toBe(202);
    // Another session's token cannot collect it.
    expect((await s.call("alice", "GET", `/pairings/${first.body.pairingId}/result`, undefined, s.newDevice())).status).toBe(410);
    const wrong = first.body.code === "000000" ? "000001" : "000000";
    expect((await s.call("alice", "POST", "/pairings/find", { code: wrong }, d)).status).toBe(404);
    expect((await s.call("alice", "POST", "/pairings/find", { code: "12345" }, d)).status).toBe(400);
    const found = await (await s.call("alice", "POST", "/pairings/find", { code: first.body.code }, d)).json();
    expect(found).toEqual({ pairingId: first.body.pairingId, deviceId: first.n.deviceId, newDevicePublicKey: first.newDevicePublicKey });
    // Only an existing device can look up or approve.
    expect((await s.call("alice", "POST", "/pairings/find", { code: first.body.code })).status).toBe(401);
    const approve = () => s.call("alice", "POST", `/pairings/${first.body.pairingId}/approve`, { deviceWrapper: s.b64(126), labelCiphertext: s.b64(20) }, d);
    expect((await approve()).status).toBe(204);
    expect((await approve()).status).toBe(410); // one use
    const done = await result();
    expect(done.status).toBe(200);
    expect((await done.json()).deviceWrapper).toBeTruthy();
    expect((await result()).status).toBe(410); // collected once
    // The new device now works with its own token.
    expect((await s.call("alice", "GET", "/items?since=0", undefined, first.n)).status).toBe(200);
    // Expiry after 10 minutes.
    const late = await ask();
    s.advance(10 * 60_000 + 1);
    expect((await s.call("alice", "POST", "/pairings/find", { code: late.body.code }, d)).status).toBe(404);
    expect((await s.call("alice", "GET", `/pairings/${late.body.pairingId}/result`, undefined, late.n)).status).toBe(410);
    // Five wrong codes in ten minutes, then even the right one waits.
    s.advance(3_600_000);
    const target = await ask();
    for (let i = 0; i < 5; i++) await s.call("alice", "POST", "/pairings/find", { code: target.body.code === "999999" ? "999998" : "999999" }, d);
    expect((await s.call("alice", "POST", "/pairings/find", { code: target.body.code }, d)).status).toBe(429);
    // At most 5 pairing requests an hour (3 of them pending at once).
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await ask()).r.status);
    expect(statuses).toContain(429);
    // Pairing needs sync set up.
    const n = s.newDevice();
    expect((await s.call("bob", "POST", "/pairings", { newDevicePublicKey: s.key(), deviceId: n.deviceId }, n)).status).toBe(404);
  });

  it("refuses an approval past the device limit and tells the new device", async () => {
    const s = await bare({ quotaBytes: 10_000, maxDevices: 1 });
    const { d } = await s.setup("alice");
    const n = s.newDevice();
    const newDevicePublicKey = s.key();
    const { pairingId, code } = await (await s.call("alice", "POST", "/pairings", { newDevicePublicKey, deviceId: n.deviceId }, n)).json();
    expect((await s.call("alice", "POST", "/pairings/find", { code }, d)).status).toBe(200);
    expect((await s.call("alice", "POST", `/pairings/${pairingId}/approve`, { deviceWrapper: s.b64(126), labelCiphertext: s.b64(20) }, d)).status).toBe(409);
    expect((await s.call("alice", "GET", `/pairings/${pairingId}/result`, undefined, n)).status).toBe(403);
  });

  it("resets only with the exact confirmation and logs fixed counts only, never content", async () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    const s = await bare();
    takeCounts();
    const { d } = await s.setup("alice");
    const canary = Buffer.from("CANARY-CIPHERTEXT-CANARY").toString("base64");
    await s.call("alice", "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: canary + s.b64(30) }, d);
    expect((await s.call("alice", "POST", "/reset", { confirm: "delete synced data" })).status).toBe(400);
    expect((await s.call("alice", "POST", "/reset", { confirm: "DELETE SYNCED DATA" })).status).toBe(204);
    expect((await (await s.call("alice", "GET", "/state")).json()).hasWrappers).toBe(false);
    expect((await s.call("alice", "GET", "/items?since=0", undefined, d)).status).toBe(401);
    expect(Object.keys(takeCounts()).sort()).toEqual(["sync.push", "sync.reset", "sync.setup"]);
    for (const spy of logs) expect(spy).not.toHaveBeenCalled();
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
