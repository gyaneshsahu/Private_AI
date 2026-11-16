// Secure mode, the server side (server/custody.ts, server/secure-store.ts) with the memory store:
// the key goes only to the signed-in account, accounts stay apart, nothing is cached, a wrong master
// key never mints a new key, quotas and write limits hold, nothing is logged but fixed counts, and
// without the switch there are no routes. Synthetic data only.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import express from "express";
import { createApp } from "../server/app";
import { custodyMaster, custodyMasterFromEnv, ephemeralCustodyMaster, newAccountKey, unwrapAccountKey, wrapAccountKey, WRAPPED_KEY_BYTES } from "../server/custody";
import { MemorySecureStore, secureRoutes, type SecureSettings } from "../server/secure-store";
import { MemoryBlobStore } from "../server/vault-sync-blobs";
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
const settingsWith = (over: Partial<SecureSettings> = {}): SecureSettings => ({
  quotaBytes: 10_000,
  filesQuotaBytes: 10_000,
  master: ephemeralCustodyMaster(),
  store: new MemorySecureStore(),
  blobs: new MemoryBlobStore(),
  ...over,
});
/** The routes alone, with the account taken from a test header. */
async function bare(settings = settingsWith()) {
  const app = express();
  app.use((req, res, next) => {
    res.locals.accountId = req.headers["x-test-account"];
    next();
  });
  app.use(secureRoutes(settings, (res) => res.locals.accountId));
  const origin = await listen(app);
  const call = (account: string | undefined, method: string, path: string, body?: unknown) =>
    fetch(`${origin}/api/secure${path}`, {
      method,
      headers: { ...(account ? { "x-test-account": account } : {}), "content-type": body instanceof Uint8Array ? "application/octet-stream" : "application/json" },
      ...(body === undefined ? {} : { body: body instanceof Uint8Array ? (body as Uint8Array<ArrayBuffer>) : typeof body === "string" ? body : JSON.stringify(body) }),
    });
  const key = async (account: string) => ((await (await call(account, "GET", "/key")).json()) as { key: string }).key;
  return { call, key, settings };
}
const b64 = (n: number) => randomBytes(n).toString("base64");

describe("custody key", () => {
  it("wraps and unwraps, and fails for another master key, account, key id or a changed byte", () => {
    const master = custodyMaster(randomBytes(32));
    const account = randomUUID();
    const key = newAccountKey();
    const wrapped = wrapAccountKey(master, account, key);
    expect(wrapped).toHaveLength(WRAPPED_KEY_BYTES);
    expect(wrapped.includes(key)).toBe(false);
    expect(unwrapAccountKey(master, account, master.id, wrapped).equals(key)).toBe(true);
    // A fresh nonce every time.
    expect(wrapAccountKey(master, account, key).equals(wrapped)).toBe(false);
    const other = custodyMaster(randomBytes(32));
    expect(other.id).not.toBe(master.id);
    expect(() => unwrapAccountKey(other, account, master.id, wrapped)).toThrow("Custody key unavailable.");
    // Even when the row is relabelled for the other master key, the AEAD refuses.
    expect(() => unwrapAccountKey(other, account, other.id, wrapped)).toThrow("Custody key unavailable.");
    expect(() => unwrapAccountKey(master, randomUUID(), master.id, wrapped)).toThrow("Custody key unavailable.");
    const flipped = Buffer.from(wrapped);
    flipped[20] ^= 1;
    expect(() => unwrapAccountKey(master, account, master.id, flipped)).toThrow("Custody key unavailable.");
    expect(() => unwrapAccountKey(master, account, master.id, wrapped.subarray(1))).toThrow("Custody key unavailable.");
  });
  it("reads the master key only as base64 of 32 bytes and never repeats it in an error", () => {
    const good = randomBytes(32).toString("base64");
    expect(custodyMasterFromEnv({ PRIVATEAI_CUSTODY_KEY: ` ${good}\n` }).key.toString("base64")).toBe(good);
    expect(custodyMasterFromEnv({ PRIVATEAI_CUSTODY_KEY: good }).id).toMatch(/^[0-9a-f]{16}$/);
    for (const bad of [undefined, "", randomBytes(31).toString("base64"), randomBytes(33).toString("base64"), randomBytes(32).toString("hex"), `${good.slice(0, -2)}!!`]) {
      let message = "";
      try {
        custodyMasterFromEnv({ PRIVATEAI_CUSTODY_KEY: bad });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe("PRIVATEAI_CUSTODY_KEY must be base64 of 32 random bytes.");
    }
  });
});

describe("secure routes", () => {
  it("hands the key only to the signed-in account, the same key every time, never cached, one per account", async () => {
    const s = await bare();
    const a = randomUUID(),
      b = randomUUID();
    const signedOut = await s.call(undefined, "GET", "/key");
    expect([signedOut.status, signedOut.headers.get("cache-control")]).toEqual([401, "no-store"]);
    expect((await s.call(undefined, "GET", "/items?since=0")).status).toBe(401);
    const first = await s.call(a, "GET", "/key");
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");
    const body = (await first.json()) as { key: string; accountId: string };
    expect(body.accountId).toBe(a);
    expect(Buffer.from(body.key, "base64")).toHaveLength(32);
    expect(await s.key(a)).toBe(body.key);
    // Two first sign-ins at once get the same key.
    const [x, y] = await Promise.all([s.key(b), s.key(b)]);
    expect(x).toBe(y);
    expect(x).not.toBe(body.key);
    // The store holds the key only wrapped.
    const row = (await s.settings.store.custody(a))!;
    expect(row.wrappedKey.includes(Buffer.from(body.key, "base64"))).toBe(false);
    expect(row.masterKeyId).toBe(s.settings.master.id);
  });

  it("answers 503 under a wrong master key and never replaces the stored key", async () => {
    const store = new MemorySecureStore();
    const right = ephemeralCustodyMaster();
    const a = randomUUID();
    const before = await (await bare(settingsWith({ store, master: right }))).key(a);
    const wrong = await bare(settingsWith({ store, master: ephemeralCustodyMaster() }));
    const refused = await wrong.call(a, "GET", "/key");
    expect(refused.status).toBe(503);
    expect(await refused.json()).toEqual({ error: "unavailable", code: "unavailable" });
    // With the right master key again, the same key as before: nothing was overwritten.
    expect(await (await bare(settingsWith({ store, master: right }))).key(a)).toBe(before);
  });

  it("stores items per account with versions, pages, quota and the write limit, and no item before the key exists", async () => {
    const s = await bare(settingsWith({ quotaBytes: 300, writeBurst: 8, writesPerSecond: 0 }));
    const a = randomUUID(),
      b = randomUUID();
    const item = randomUUID();
    expect((await s.call(a, "PUT", `/items/${item}`, { baseVersion: 0, ciphertext: b64(100) })).status).toBe(404);
    await s.key(a);
    await s.key(b);
    const put = await s.call(a, "PUT", `/items/${item}`, { baseVersion: 0, ciphertext: b64(100) });
    expect(put.status).toBe(200);
    expect(put.headers.get("cache-control")).toBe("no-store");
    expect(await put.json()).toEqual({ version: 1 });
    // Strict input, as in sync: 27 bytes is no ciphertext, extra fields are refused, ids are uuids.
    expect((await s.call(a, "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: b64(27) })).status).toBe(400);
    expect((await s.call(a, "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: b64(40), extra: 1 })).status).toBe(400);
    expect((await s.call(a, "PUT", "/items/not-a-uuid", { baseVersion: 0, ciphertext: b64(40) })).status).toBe(400);
    // A stale base version is a conflict that carries the current ciphertext.
    const conflict = await s.call(a, "PUT", `/items/${item}`, { baseVersion: 0, ciphertext: b64(100) });
    expect(conflict.status).toBe(409);
    expect(((await conflict.json()) as { current: { version: number } }).current.version).toBe(1);
    // The other account sees nothing of it and can use the same item id.
    expect(((await (await s.call(b, "GET", "/items?since=0")).json()) as { items: unknown[] }).items).toEqual([]);
    expect((await s.call(b, "PUT", `/items/${item}`, { baseVersion: 0, ciphertext: b64(50) })).status).toBe(200);
    const mine = (await (await s.call(a, "GET", "/items?since=0")).json()) as { items: { itemId: string; version: number }[]; more: boolean };
    expect(mine.items.map((i) => [i.itemId, i.version])).toEqual([[item, 1]]);
    // Quota: 300 bytes for the account.
    const full = await s.call(a, "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: b64(250) });
    expect(full.status).toBe(413);
    expect(((await full.json()) as { code: string }).code).toBe("quota");
    const state = (await (await s.call(a, "GET", "/state")).json()) as { quota: object; files: object; cursor: string };
    expect(state.quota).toEqual({ usedBytes: 100, limitBytes: 300 });
    expect(state.files).toEqual({ count: 0, usedBytes: 0, limitBytes: 10_000, maxFileBytes: 10 * 1024 * 1024 });
    // A delete is an encrypted tombstone, as in sync; there is no DELETE route for items.
    expect((await s.call(a, "PUT", `/items/${item}`, { baseVersion: 1, ciphertext: b64(40), deleted: true })).status).toBe(200);
    expect((await s.call(a, "DELETE", `/items/${item}`)).status).toBe(404);
    // The write limit (a burst of 8 here, no refill): account a has used 3 accepted writes and 2 refused ones.
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await s.call(a, "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: b64(28) })).status);
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.filter((x) => x === 200).length).toBeLessThan(6);
  });

  it("pages items by bytes", async () => {
    const s = await bare(settingsWith({ quotaBytes: 100_000, pageBytes: 250 }));
    const a = randomUUID();
    await s.key(a);
    for (let i = 0; i < 5; i++) expect((await s.call(a, "PUT", `/items/${randomUUID()}`, { baseVersion: 0, ciphertext: b64(100) })).status).toBe(200);
    let cursor = "0";
    let seen = 0;
    let pages = 0;
    for (;;) {
      const page = (await (await s.call(a, "GET", `/items?since=${cursor}`)).json()) as { items: unknown[]; cursor: string; more: boolean };
      expect(page.items.length).toBeLessThanOrEqual(2);
      seen += page.items.length;
      pages++;
      cursor = page.cursor;
      if (!page.more) break;
    }
    expect(seen).toBe(5);
    expect(pages).toBe(3);
  });

  it("stores file blobs per account with their own quota and size limit", async () => {
    const s = await bare(settingsWith({ filesQuotaBytes: 500, maxFileBytes: 300 }));
    const a = randomUUID(),
      b = randomUUID();
    await s.key(a);
    await s.key(b);
    const blob = randomUUID();
    const bytes = randomBytes(200);
    expect((await s.call(a, "PUT", `/blobs/${blob}`, new Uint8Array(bytes))).status).toBe(204);
    const got = await s.call(a, "GET", `/blobs/${blob}`);
    expect(got.status).toBe(200);
    expect(got.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await got.arrayBuffer()).equals(bytes)).toBe(true);
    expect((await s.call(b, "GET", `/blobs/${blob}`)).status).toBe(404);
    expect((await s.call(a, "PUT", `/blobs/${randomUUID()}`, new Uint8Array(27))).status).toBe(400);
    const large = await s.call(a, "PUT", `/blobs/${randomUUID()}`, new Uint8Array(400));
    expect([large.status, ((await large.json()) as { code: string }).code]).toEqual([413, "too-large"]);
    expect((await s.call(a, "PUT", `/blobs/${randomUUID()}`, new Uint8Array(randomBytes(200)))).status).toBe(204);
    const full = await s.call(a, "PUT", `/blobs/${randomUUID()}`, new Uint8Array(randomBytes(200)));
    expect([full.status, ((await full.json()) as { code: string }).code]).toEqual([413, "quota"]);
    expect((await s.call(b, "DELETE", `/blobs/${blob}`)).status).toBe(404);
    expect((await s.call(a, "DELETE", `/blobs/${blob}`)).status).toBe(204);
    expect((await s.call(a, "GET", `/blobs/${blob}`)).status).toBe(404);
  });

  it("logs nothing but fixed counts, also for bad bodies in production mode", async () => {
    const output: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, method).mockImplementation((...a) => void output.push(a.join(" ")));
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      takeCounts();
      const s = await bare();
      const a = randomUUID();
      const key = await s.key(a);
      const item = randomUUID();
      const secret = "SYNTHETIC-SECRET-BODY";
      await s.call(a, "PUT", `/items/${item}`, { baseVersion: 0, ciphertext: b64(64) });
      await s.call(a, "PUT", `/items/${item}`, { baseVersion: 0, ciphertext: b64(64) });
      await s.call(a, "PUT", `/items/${item}`, { baseVersion: 1, ciphertext: b64(40), deleted: true });
      await s.call(a, "GET", "/items?since=0");
      const blob = randomUUID();
      await s.call(a, "PUT", `/blobs/${blob}`, new Uint8Array(40));
      await s.call(a, "GET", `/blobs/${blob}`);
      await s.call(a, "DELETE", `/blobs/${blob}`);
      const bad = await s.call(a, "PUT", `/items/${randomUUID()}`, `{"baseVersion":0,"ciphertext":"${secret}`);
      expect(bad.status).toBe(400);
      expect(await bad.text()).not.toContain(secret);
      expect(takeCounts()).toEqual({
        "secure.key": 1,
        "secure.push": 1,
        "secure.conflict": 1,
        "secure.delete": 1,
        "secure.pull": 1,
        "secure.blob.put": 1,
        "secure.blob.get": 1,
        "secure.blob.delete": 1,
      });
      expect(output.join("\n")).not.toContain(secret);
      expect(output.join("\n")).not.toContain(key);
      expect(output).toEqual([]);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("is mounted only with the switch, behind the session, origin and CSRF checks, and the status names its limits", async () => {
    const serve = async (on: boolean) => {
      const server = createServer();
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw Error("port");
      const origin = `http://127.0.0.1:${address.port}`;
      server.on("request", createApp({ origin, dev: true, ...(on ? { secureStore: settingsWith({ quotaBytes: 200 * 1024 * 1024, filesQuotaBytes: 1024 * 1024 * 1024 }) } : {}) }));
      closers.push(() => new Promise((resolve) => server.close(resolve)));
      const status = await fetch(`${origin}/api/status`);
      const cookie = status.headers.getSetCookie()[0].split(";")[0];
      return { origin, cookie, status: (await status.json()) as { csrf: string; secureStore?: unknown } };
    };
    const off = await serve(false);
    expect(off.status).not.toHaveProperty("secureStore");
    for (const path of ["/key", "/state", "/items?since=0"]) expect((await fetch(`${off.origin}/api/secure${path}`, { headers: { cookie: off.cookie } })).status).toBe(404);
    const on = await serve(true);
    expect(on.status.secureStore).toEqual({ quotaBytes: 200 * 1024 * 1024, filesQuotaBytes: 1024 * 1024 * 1024 });
    const key = await fetch(`${on.origin}/api/secure/key`, { headers: { cookie: on.cookie } });
    expect(key.status).toBe(200);
    expect(key.headers.get("cache-control")).toBe("no-store");
    // Another origin is refused before the route, also for the key.
    expect((await fetch(`${on.origin}/api/secure/key`, { headers: { cookie: on.cookie, origin: "https://elsewhere.example" } })).status).toBe(403);
    // A write needs the CSRF token.
    const put = (csrf?: string) =>
      fetch(`${on.origin}/api/secure/items/${randomUUID()}`, {
        method: "PUT",
        headers: { cookie: on.cookie, origin: on.origin, "content-type": "application/json", ...(csrf ? { "x-privateai-csrf": csrf } : {}) },
        body: JSON.stringify({ baseVersion: 0, ciphertext: b64(40) }),
      });
    expect((await put()).status).toBe(403);
    expect((await put(on.status.csrf)).status).toBe(200);
  });

  it("is covered by the operator erase, children before the key", () => {
    const erase = operatorSql("erase", "plain@example.test");
    const at = (table: string) => erase.indexOf(`DELETE FROM "${table}"`);
    expect(at("secure_items")).toBeGreaterThan(0);
    expect(at("secure_blobs")).toBeGreaterThan(0);
    expect(at("custody_keys")).toBeGreaterThan(Math.max(at("secure_items"), at("secure_blobs")));
    expect(at(`user`)).toBeGreaterThan(at("custody_keys"));
    const show = operatorSql("show", "plain@example.test");
    for (const table of ["custody_keys", "secure_items", "secure_blobs"]) expect(show).toContain(`FROM "${table}" WHERE`);
  });
});
