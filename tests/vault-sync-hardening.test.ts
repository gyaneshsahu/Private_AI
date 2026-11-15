// The security review of 15 November (docs/vault-sync-20261115.md, section 15) and the wiring
// agent's findings: one test per finding, across simulated devices against the real app routes
// with the memory store (each device: its own vault and sync database on fake-indexeddb, its own
// session). The fetcher of each device can fake or delay a response, to play a malicious or slow
// server and to interleave a local save with a sync.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createHmac, randomBytes } from "node:crypto";
import { openDB } from "idb";
import { createApp } from "../server/app";
import { MemorySyncStore } from "../server/vault-sync";
import { emptyConversation, type Conversation, type Message } from "../shared/contracts";
import { Vault } from "../src/vault";
import { SyncEngine, type Fetcher } from "../src/sync/engine";
import { mergeMessages } from "../src/sync/merge";
import * as k from "../src/sync/crypto";

const ACCOUNT = "local-development"; // the development server's one account
const PASS = "synthetic sync passphrase one";
const LOCAL = "synthetic local passphrase";
const closers: (() => Promise<unknown>)[] = [];
const vaults: Vault[] = [];
beforeEach(() => vi.stubGlobal("BroadcastChannel", undefined));
afterEach(async () => {
  for (const v of vaults.splice(0)) v.close(false);
  for (const close of closers.splice(0)) await close();
  vi.unstubAllGlobals();
});

async function serve() {
  const store = new MemorySyncStore();
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, vaultSync: { quotaBytes: 200 * 1024 * 1024, maxDevices: 5, store } }));
  closers.push(() => new Promise((resolve) => server.close(resolve)));
  return { origin, store };
}
type Response = Awaited<ReturnType<Fetcher>>;
const fake = (status: number, body: unknown): Response => ({ status, json: async () => body });
async function device(origin: string, name: string) {
  const vault = new Vault();
  vault.selectAccount(crypto.randomUUID()); // its own database: a separate browser
  vaults.push(vault);
  const status = await fetch(`${origin}/api/status`);
  const cookie = status.headers.getSetCookie()[0].split(";")[0];
  const { csrf } = await status.json();
  const net = {
    headers: [] as Record<string, string>[],
    /** Return a response to fake it, undefined to pass the request through. */
    hook: undefined as undefined | ((path: string, init: { method: string; body?: string | Uint8Array }) => Promise<Response | undefined> | Response | undefined),
    /** Items per page (the engine asks for 200). */
    pageItems: 0,
  };
  const fetcher: Fetcher = async (path, init) => {
    net.headers.push(init.headers);
    const faked = await net.hook?.(path, init);
    if (faked) return faked;
    const sent = net.pageItems ? path.replace("limit=200", `limit=${net.pageItems}`) : path;
    return fetch(`${origin}${sent}`, { method: init.method, headers: { ...init.headers, cookie }, body: init.body });
  };
  const storeName = `sync-${name}-${crypto.randomUUID()}`;
  const engine = new SyncEngine({ vault, accountId: ACCOUNT, csrf: () => csrf, fetch: fetcher, storeName, pollMs: 10 });
  engine.stop(); // no timers: the test drives every sync
  await engine.init();
  /** A raw request with this browser's session, as an attacker holding a captured device header would send it. */
  const raw = (method: string, path: string, body: unknown, header?: string) =>
    fetch(`${origin}/api/sync${path}`, {
      method,
      headers: { cookie, "x-privateai-csrf": csrf, "content-type": "application/json", ...(header ? { "x-sync-device": header } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const lastHeader = () => [...net.headers].reverse().find((h) => h["X-Sync-Device"])?.["X-Sync-Device"];
  return { vault, engine, net, storeName, raw, lastHeader };
}
type Device = Awaited<ReturnType<typeof device>>;
const message = (text: string, at = new Date().toISOString()): Message => ({ id: crypto.randomUUID(), role: "user", text, status: "complete", included: true, at });
const conversation = (title: string, texts: string[]): Conversation => ({ ...emptyConversation(), title, messages: texts.map((t) => message(t)) });
async function populate(vault: Vault, remember?: boolean) {
  await vault.unlock(PASS, remember);
  const [project] = await vault.changeProjects(() => [{ id: crypto.randomUUID(), name: "Thesis", instructions: "Answer in German." }]);
  for (const c of [conversation("First chat", ["CANARY-ONE", "an answer"]), { ...conversation("Project chat", ["CANARY-TWO"]), projectId: project.id }]) await vault.save(c, null);
  await vault.writeMemories(() => [{ id: crypto.randomUUID(), text: "I live in Berlin.", at: "2026-11-01T10:00:00.000Z" }]);
  return project;
}
async function contents(vault: Vault) {
  return {
    chats: (await vault.list()).sort((a, b) => a.title.localeCompare(b.title)),
    projects: await vault.readProjects(),
    memories: await vault.readMemories(),
  };
}
const titles = async (vault: Vault) => (await vault.list()).map((c) => c.title).sort();
async function setUp(d: Device, remember = true) {
  const { recoveryKey } = await d.engine.setUp({ deviceLabel: "Laptop", rememberDevice: remember });
  expect(await d.engine.confirmRecoveryKeySaved(recoveryKey.slice(-4))).toBe(true);
  return recoveryKey;
}
async function pair(a: Device, b: Device, remember = true) {
  const { code, wait } = await b.engine.startPairing({ deviceLabel: "Phone", rememberDevice: remember });
  expect(await a.engine.approvePairing(code, "Phone")).toBe("approved");
  expect(await wait).toBe("approved");
}
async function itemOf(d: Device, kind: string, localId: string, store: MemorySyncStore) {
  const itemId = await k.itemIdFor(d.vault.accountKey()!, kind, localId);
  const row = (await store.items(ACCOUNT, 0, 10_000, 1e12)).items.find((i) => i.itemId === itemId)!;
  return { itemId, row };
}

describe("C1: a reset or removal elsewhere never costs a device its data", () => {
  it("A and B synced; A resets; B keeps all data, locks and unlocks, shows the detached state, and joins a new setup without losing data", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const before = await contents(b.vault);
    expect(before.chats).toHaveLength(2);
    await a.engine.resetSync("DELETE SYNCED DATA", { localPassphrase: `${LOCAL} A` });
    await b.engine.syncNow().catch(() => {});
    expect(b.engine.getState()).toMatchObject({ phase: "error", error: "reset-elsewhere", detached: "reset-elsewhere" });
    expect(b.vault.unlocked).toBe(true);
    expect(await contents(b.vault)).toEqual(before);
    // Locked and opened again with its own key, also by a fresh engine (the next visit), offline.
    b.vault.lock();
    expect(await b.engine.unlockThisDevice()).toBe("ok");
    expect(await contents(b.vault)).toEqual(before);
    b.vault.lock();
    const next = new SyncEngine({ vault: b.vault, accountId: ACCOUNT, csrf: () => "", fetch: async () => Promise.reject(new TypeError("offline")), storeName: b.storeName });
    next.stop();
    await next.init();
    expect(b.vault.unlocked).toBe(true);
    expect(await contents(b.vault)).toEqual(before);
    expect(next.getState()).toMatchObject({ detached: "reset-elsewhere" });
    // B starts a new setup: everything it had is kept, under the new account key.
    const oldKey = b.vault.accountKey();
    await setUp(b);
    expect(b.vault.hasAccountKey(oldKey!)).toBe(false);
    expect(await contents(b.vault)).toEqual(before);
    expect(b.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
    expect(b.engine.getState().detached).toBeUndefined();
    // A (which reset) joins B's new setup and keeps its data too.
    await pair(b, a);
    expect(await titles(a.vault)).toEqual(before.chats.map((c) => c.title));
  }, 60_000);

  it("a device that is not remembered, locked when the reset happens and without a local passphrase, opens with the old recovery key (kept here)", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const recoveryKey = await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b, false);
    const before = await contents(b.vault);
    b.vault.lock();
    await a.engine.resetSync("DELETE SYNCED DATA", { localPassphrase: `${LOCAL} A` });
    expect(await b.engine.unlockThisDevice()).toBe("not-remembered");
    expect(await b.engine.unlockWithRecoveryKey(recoveryKey, { deviceLabel: "Phone", rememberDevice: false })).toBe("ok");
    expect(await contents(b.vault)).toEqual(before);
  }, 60_000);
});

describe("after a reload (the sealed token read from disk)", () => {
  it("the recovery key on a locked device that is not remembered reuses its device id, and the token from disk syncs", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const recoveryKey = await setUp(a, false);
    const ids = (await store.devices(ACCOUNT)).map((d) => d.deviceId);
    a.vault.lock();
    // The next visit: a new engine on the same sync database, nothing in memory.
    const status = await fetch(`${origin}/api/status`);
    const cookie = status.headers.getSetCookie()[0].split(";")[0];
    const { csrf } = await status.json();
    const next = new SyncEngine({
      vault: a.vault,
      accountId: ACCOUNT,
      csrf: () => csrf,
      fetch: (path, init) => fetch(`${origin}${path}`, { method: init.method, headers: { ...init.headers, cookie }, body: init.body }),
      storeName: a.storeName,
    });
    next.stop();
    await next.init();
    expect(next.getState().phase).toBe("locked");
    expect(await next.unlockWithRecoveryKey(recoveryKey, { deviceLabel: "Laptop", rememberDevice: false })).toBe("ok");
    expect((await store.devices(ACCOUNT)).map((d) => d.deviceId)).toEqual(ids);
    await a.vault.save(conversation("After the reload", ["x"]), null);
    await next.syncNow();
    expect(next.getState()).toMatchObject({ phase: "idle", pending: 0 });
  }, 60_000);

  it("a locked synced vault that is not remembered opens again by an approval (every visit)", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b, false);
    const before = await contents(b.vault);
    b.vault.lock();
    await pair(a, b, false);
    expect(b.vault.unlocked).toBe(true);
    expect(await contents(b.vault)).toEqual(before);
  }, 60_000);

  it("an item held for a newer app version is read again after the upgrade (the next start)", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const target = (await a.vault.list()).find((c) => c.title === "First chat")!;
    await a.vault.save({ ...target, title: "Read after the upgrade" });
    await a.engine.syncNow();
    // As an older app version would have left it: the new version seen, held, not applied.
    const { itemId, row } = await itemOf(a, "conversation", target.id, store);
    await b.engine.syncNow(); // applies it; now put it back as held at that version with the old content
    const database = await openDB(b.storeName, 1);
    const base = await database.get("base", itemId);
    database.close();
    const old = (await b.vault.list()).find((c) => c.id === target.id)!;
    await b.vault.save({ ...old, title: "First chat" });
    const reopened = await openDB(b.storeName, 1);
    await reopened.put("base", { ...base, version: row.version, hold: true, hash: "old", sealed: undefined }, itemId);
    reopened.close();
    const next = new SyncEngine({ vault: b.vault, accountId: ACCOUNT, csrf: () => "", fetch: (b.engine as unknown as { fetcher: Fetcher }).fetcher, storeName: b.storeName });
    next.stop();
    await next.init();
    await next.syncNow();
    expect((await b.vault.list()).find((c) => c.id === target.id)?.title).toBe("Read after the upgrade");
    expect(next.getState().needsUpgrade).toBeUndefined();
  }, 60_000);
});

describe("W4 after a move out of sync and a direct move", () => {
  it("keeps version tracking for a chat read before turning sync off or before adoptAccountKey", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    await a.vault.setLocalPassphrase(LOCAL);
    const read = (await a.vault.list()).find((c) => c.title === "First chat")!;
    await a.engine.turnOffSyncOnThisDevice({ localPassphrase: LOCAL });
    await a.vault.save({ ...read, title: "Saved after sync off" });
    const again = (await a.vault.list()).find((c) => c.id === read.id)!;
    await a.vault.adoptAccountKey(k.newAccountKey());
    await a.vault.save({ ...again, title: "Saved after a direct move" });
    expect((await a.vault.list()).find((c) => c.id === read.id)?.title).toBe("Saved after a direct move");
  }, 60_000);
});

describe("C1: deleting the synced copy needs a proof", () => {
  it("a locked device deletes the synced copy only with the recovery key (forgotten passphrase)", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const recoveryKey = await setUp(a, false);
    a.vault.lock();
    await expect(a.engine.deleteEverythingOnThisDevice({ alsoDeleteSyncedData: true })).rejects.toMatchObject({ code: "locked" });
    expect(await store.proofs(ACCOUNT)).toBeDefined();
    await expect(a.engine.deleteEverythingOnThisDevice({ alsoDeleteSyncedData: true, recoveryKey: k.encodeRecoveryKey(k.newRecoveryKey().bytes) })).rejects.toMatchObject({ code: "wrong-key" });
    await a.engine.deleteEverythingOnThisDevice({ alsoDeleteSyncedData: true, recoveryKey });
    expect(await store.proofs(ACCOUNT)).toBeUndefined();
    expect(await a.vault.exists()).toBe(false);
  }, 60_000);
});

describe("H1: pairing authenticated both ways", () => {
  it("refuses a result the server made up (its own account key, a tag from what it stores) and leaves a non-empty local vault untouched", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const aId = (await store.devices(ACCOUNT))[0].deviceId;
    const b = await device(origin, "b");
    await populate(b.vault); // a passphrase vault with data, unlocked
    const before = await contents(b.vault);
    const { wait } = await b.engine.startPairing({ deviceLabel: "Phone" });
    const [row] = await store.pairings(ACCOUNT, Date.now());
    // Everything the server holds: B's public key, the commitment, the pairing id. Not the code.
    const evil = k.newAccountKey();
    const wrapper = await k.wrapToDevice(evil, row.publicKey, ACCOUNT, row.deviceId);
    const tagKey = createHmac("sha256", row.commitment).update("cometrow-pair-tag-v1").digest();
    const tag = createHmac("sha256", tagKey).update(`result|${row.pairingId}|${row.publicKey.toString("base64")}|${wrapper}`).digest();
    expect(await store.approvePairing(ACCOUNT, row.pairingId, { wrapper: Buffer.from(wrapper, "base64"), labelCiphertext: randomBytes(40), tag, approvedBy: aId }, 5, Date.now())).toBe("ok");
    await expect(wait).rejects.toMatchObject({ code: "pairing-unverified" });
    expect(await b.vault.mode()).toBe("passphrase");
    expect(b.vault.accountKey()).toBeUndefined();
    expect(await contents(b.vault)).toEqual(before);
    expect((await store.devices(ACCOUNT)).map((d) => d.deviceId)).toEqual([aId]); // never completed
    expect(b.engine.getState().phase).toBe("needs-approval");
  }, 60_000);

  it("refuses to approve when the server swapped the new device's key; the real pairing then works", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    const { code, wait } = await b.engine.startPairing({ deviceLabel: "Phone" });
    const pairings = (store as unknown as { accounts: Map<string, { pairings: Map<string, { publicKey: Buffer }> }> }).accounts.get(ACCOUNT)!.pairings;
    const [row] = [...pairings.values()];
    const real = row.publicKey;
    row.publicKey = Buffer.from(await k.exportPublicKey((await k.newDeviceKeyPair()).publicKey));
    expect(await a.engine.approvePairing(code, "Phone")).toBe("wrong-code");
    row.publicKey = real;
    expect(await a.engine.approvePairing(` ${code.slice(0, 4).toLowerCase()}-${code.slice(4)} `, "Phone")).toBe("approved");
    expect(await wait).toBe("approved");
    expect(await contents(b.vault)).toEqual(await contents(a.vault));
  }, 60_000);
});

describe("H2 and H3: a local save during a sync is never overwritten", () => {
  it("H3: a chat saved here while the pull runs survives, with the other device's edit", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const onA = (await a.vault.list()).find((c) => c.title === "First chat")!;
    await a.vault.save({ ...onA, messages: [...onA.messages, message("CANARY-FROM-A")] });
    await a.engine.syncNow();
    // B: a reply is saved in that chat right after the cycle took its snapshot (the streaming save).
    let once = true;
    b.net.hook = async (path) => {
      if (once && path.startsWith("/api/sync/items?")) {
        once = false;
        const onB = (await b.vault.list()).find((c) => c.id === onA.id)!;
        await b.vault.save({ ...onB, messages: [...onB.messages, message("CANARY-DURING-PULL")] });
      }
      return undefined;
    };
    await b.engine.syncNow().catch(() => {});
    await b.engine.syncNow();
    await a.engine.syncNow();
    for (const v of [a.vault, b.vault]) {
      const texts = (await v.list()).find((c) => c.id === onA.id)!.messages.map((m) => m.text);
      expect(texts).toEqual(expect.arrayContaining(["CANARY-FROM-A", "CANARY-DURING-PULL"]));
    }
  }, 60_000);

  it("H2: when the vault write is refused, the merge base stays, so the other device's edit is not overwritten at the next push", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    await a.vault.writeMemories((m) => [...m, { id: crypto.randomUUID(), text: "From A", at: "2026-11-12T10:00:00.000Z" }]);
    await a.engine.syncNow();
    await b.vault.writeMemories((m) => [...m, { id: crypto.randomUUID(), text: "From B", at: "2026-11-12T11:00:00.000Z" }]);
    let once = true;
    b.net.hook = async (path) => {
      if (once && path.startsWith("/api/sync/items?")) {
        once = false;
        await b.vault.writeMemories((m) => [...m, { id: crypto.randomUUID(), text: "During pull on B", at: "2026-11-12T12:00:00.000Z" }]);
      }
      return undefined;
    };
    await b.engine.syncNow().catch(() => {});
    await b.engine.syncNow();
    await a.engine.syncNow();
    for (const v of [a.vault, b.vault]) expect((await v.readMemories()).map((m) => m.text)).toEqual(expect.arrayContaining(["From A", "From B", "During pull on B"]));
  }, 60_000);
});

describe("H4: a token holder cannot delete, remove or read at rest", () => {
  it("keeps no usable token at rest and sends no device header while locked", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a, false);
    const database = await openDB(a.storeName, 1);
    const record = await database.get("device", "this");
    database.close();
    expect(record).not.toHaveProperty("token");
    expect(record.sealedToken).toBeTruthy();
    const token = a.lastHeader()!.split(".")[1];
    expect(token).toHaveLength(43);
    expect(JSON.stringify(record)).not.toContain(token);
    a.vault.lock();
    a.net.headers.length = 0;
    await a.engine.refresh();
    await a.engine.syncNow();
    expect(a.net.headers.some((h) => h["X-Sync-Device"])).toBe(false);
    expect(a.engine.getState().phase).toBe("locked"); // locked, not detached
    await expect(a.engine.revokeDevice(crypto.randomUUID())).rejects.toMatchObject({ code: "locked" });
  }, 60_000);

  it("ignores a tombstone that does not open under the item's key; the chat stays and is pushed back", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const target = (await a.vault.list()).find((c) => c.title === "First chat")!;
    const { itemId, row } = await itemOf(a, "conversation", target.id, store);
    // With B's captured header (and B's session), a forged delete: whatever delete the server takes.
    const header = b.lastHeader()!;
    const put = await b.raw("PUT", `/items/${itemId}`, { baseVersion: row.version, ciphertext: randomBytes(60).toString("base64"), deleted: true }, header);
    if (put.status === 400) await b.raw("DELETE", `/items/${itemId}?baseVersion=${row.version}`, undefined, header);
    await a.engine.syncNow();
    await b.engine.syncNow();
    for (const v of [a.vault, b.vault]) expect((await v.list()).some((c) => c.id === target.id)).toBe(true);
    expect((await itemOf(a, "conversation", target.id, store)).row.deleted).toBe(false);
  }, 60_000);
});

describe("M2, M3, L5: conflicts and deletes", () => {
  it("M2: a 409 with an older version than the one synced here is not applied (no rollback)", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const onA = (await a.vault.list()).find((c) => c.title === "First chat")!;
    const v1 = (await itemOf(a, "conversation", onA.id, store)).row;
    await a.vault.save({ ...onA, title: "Title v2" });
    await a.engine.syncNow();
    await b.engine.syncNow();
    const onB = (await b.vault.list()).find((c) => c.id === onA.id)!;
    expect(onB.title).toBe("Title v2");
    await b.vault.save({ ...onB, messages: [...onB.messages, message("CANARY-B-EDIT")] });
    // The server answers B's push with the old version 1 as "current".
    b.net.hook = (path, init) =>
      init.method === "PUT" && path === `/api/sync/items/${v1.itemId}` ? fake(409, { code: "conflict", current: { version: 1, ciphertext: v1.ciphertext.toString("base64"), deleted: false } }) : undefined;
    await b.engine.syncNow().catch(() => {});
    const now = (await b.vault.list()).find((c) => c.id === onA.id)!;
    expect(now.title).toBe("Title v2");
    expect(now.messages.map((m) => m.text)).toContain("CANARY-B-EDIT");
    b.net.hook = undefined;
    await b.engine.syncNow();
    await a.engine.syncNow();
    const onAnow = (await a.vault.list()).find((c) => c.id === onA.id)!;
    expect([onAnow.title, onAnow.messages.map((m) => m.text).includes("CANARY-B-EDIT")]).toEqual(["Title v2", true]);
  }, 60_000);

  it("L5: a chat renamed here (no new message) and deleted elsewhere is kept as a copy", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const target = (await a.vault.list()).find((c) => c.title === "First chat")!;
    await a.vault.delete(target.id);
    await a.engine.syncNow();
    const onB = (await b.vault.list()).find((c) => c.id === target.id)!;
    await b.vault.save({ ...onB, title: "Renamed on B" });
    await b.engine.syncNow();
    const list = await b.vault.list();
    expect(list.some((c) => c.id === target.id)).toBe(false);
    expect(list.map((c) => c.title)).toContain("Renamed on B (conflict copy)");
  }, 60_000);

  it("M3: a tombstone on a list is invalid; the list keeps syncing", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    // Made with AK (a buggy or hostile client): it opens, but a list is never deleted.
    const { itemId, row } = await itemOf(a, "memories", "memories", store);
    const ciphertext = await k.encryptTombstone(a.vault.accountKey()!, ACCOUNT, itemId, row.version + 1, { kind: "conversation", at: new Date().toISOString() });
    const put = await a.raw("PUT", `/items/${itemId}`, { baseVersion: row.version, ciphertext, deleted: true }, a.lastHeader());
    if (put.status === 400) await a.raw("DELETE", `/items/${itemId}?baseVersion=${row.version}`, undefined, a.lastHeader());
    await b.engine.syncNow();
    await b.vault.writeMemories((m) => [...m, { id: crypto.randomUUID(), text: "Still syncing", at: "2026-11-13T10:00:00.000Z" }]);
    await b.engine.syncNow();
    expect(b.engine.getState().pending).toBe(0);
    await a.engine.syncNow();
    expect((await a.vault.readMemories()).map((m) => m.text)).toContain("Still syncing");
  }, 60_000);
});

describe("M4, M5, M6: pages, newer clients, sizes", () => {
  it("M4: a chat whose project arrives on a later page keeps its project", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    const project = await populate(a.vault);
    await setUp(a);
    // The project list changes after the chat was pushed, so it comes after the chat in change order.
    await a.vault.changeProjects((list) => list.map((p) => ({ ...p, instructions: "Answer in English." })));
    await a.engine.syncNow();
    const c = await device(origin, "c");
    c.net.pageItems = 1;
    await pair(a, c);
    expect((await c.vault.list()).find((x) => x.title === "Project chat")?.projectId).toBe(project.id);
    await a.engine.syncNow();
    expect((await a.vault.list()).find((x) => x.title === "Project chat")?.projectId).toBe(project.id);
  }, 60_000);

  it("M5: an item from a newer app version is held, not applied or overwritten; everything else keeps syncing", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const target = (await a.vault.list()).find((c) => c.title === "First chat")!;
    const { itemId, row } = await itemOf(a, "conversation", target.id, store);
    const future = await k.encryptItem(a.vault.accountKey()!, ACCOUNT, itemId, row.version + 1, { kind: "conversation", data: { ...target, title: "From the future", canvas: { text: "notes", layout: "two-columns" } } });
    expect((await a.raw("PUT", `/items/${itemId}`, { baseVersion: row.version, ciphertext: future }, a.lastHeader())).status).toBe(200);
    await a.vault.save(conversation("Another chat", ["new"]), null);
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(await titles(b.vault)).toContain("Another chat");
    expect(b.engine.getState()).toMatchObject({ phase: "idle", needsUpgrade: 1 });
    const onB = (await b.vault.list()).find((c) => c.id === target.id)!;
    expect(onB.title).toBe("First chat");
    await b.vault.save({ ...onB, title: "Edited on the old app" });
    await b.engine.syncNow();
    expect((await itemOf(a, "conversation", target.id, store)).row.version).toBe(row.version + 1); // not overwritten
  }, 60_000);

  it("M6: an item refused as too large is not reported as a full storage", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a);
    await a.vault.save(conversation("Big", ["x"]), null);
    a.net.hook = (path, init) => (init.method === "PUT" && path.startsWith("/api/sync/items/") ? fake(413, { error: "too-large", code: "too-large" }) : undefined);
    await a.engine.syncNow().catch(() => {});
    expect(a.engine.getState()).toMatchObject({ phase: "error", error: "item-too-large" });
  }, 60_000);
});

describe("M7, L2, L3, L9: unlockers", () => {
  it("M7, L3: the Stage-0 remembered key goes when sync is turned on; the vault opens with AK and keeps its local passphrase", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault, true); // "remember this device" before sync
    expect(await a.vault.isRemembered()).toBe(true);
    await setUp(a, true);
    expect(await a.vault.isRemembered()).toBe(false);
    await a.vault.setLocalPassphrase(LOCAL);
    a.vault.lock();
    expect(await a.vault.unlockRemembered()).toBe(false);
    expect(await a.engine.unlockThisDevice()).toBe("ok");
    expect(a.vault.accountKey()).toHaveLength(32);
    await a.engine.syncNow();
    a.vault.lock();
    await a.vault.unlock(LOCAL); // the local passphrase was not dropped
    expect(await titles(a.vault)).toEqual(["First chat", "Project chat"]);
  }, 60_000);

  it("L2: a device-key unlock cannot replace the local passphrase without the current one; the recovery key can", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const recoveryKey = await setUp(a, true);
    await a.vault.setLocalPassphrase(LOCAL);
    a.vault.lock();
    expect(await a.engine.unlockThisDevice()).toBe("ok");
    await expect(a.vault.setLocalPassphrase(`${LOCAL} two`)).rejects.toThrow();
    await expect(a.vault.setLocalPassphrase(null)).rejects.toThrow();
    await a.vault.setLocalPassphrase(`${LOCAL} two`, LOCAL);
    a.vault.lock();
    expect(await a.engine.unlockWithRecoveryKey(recoveryKey, { deviceLabel: "Laptop", rememberDevice: true })).toBe("ok");
    await a.vault.setLocalPassphrase(`${LOCAL} three`);
    a.vault.lock();
    await a.vault.unlock(`${LOCAL} three`);
  }, 60_000);

  it("L9: turning sync off makes the vault a passphrase vault again: no account key left on the device", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a, true);
    const b = await device(origin, "b");
    await pair(a, b);
    const before = await contents(b.vault);
    await b.vault.setLocalPassphrase(LOCAL);
    await expect(b.engine.turnOffSyncOnThisDevice()).rejects.toMatchObject({ code: "needs-local-passphrase" });
    await expect(b.engine.turnOffSyncOnThisDevice({ localPassphrase: `${LOCAL} wrong` })).rejects.toThrow();
    await b.engine.turnOffSyncOnThisDevice({ localPassphrase: LOCAL });
    expect(await b.vault.mode()).toBe("passphrase");
    expect(b.vault.accountKey()).toBeUndefined();
    b.vault.lock();
    await b.vault.unlock(LOCAL);
    expect(await contents(b.vault)).toEqual(before);
    expect((await store.devices(ACCOUNT)).filter((d) => !d.revokedAt)).toHaveLength(1);
  }, 60_000);
});

describe("L4: message merge", () => {
  const m = (id: string, text: string, at = "2026-11-10T10:00:00.000Z"): Message => ({ id, role: "user", text, status: "complete", included: true, at });
  it("keeps a message edited here and deleted elsewhere", () => {
    const base = [m("1", "one"), m("2", "two")];
    const local = [m("1", "one"), m("2", "two, edited here", "2026-11-11T10:00:00.000Z")];
    const remote = [m("1", "one")];
    expect(mergeMessages(base, local, remote).map((x) => x.text)).toEqual(["one", "two, edited here"]);
  });
  it("puts a new message whose predecessor was deleted elsewhere after the rest, not first", () => {
    const base = [m("1", "one"), m("2", "two")];
    const local = [m("1", "one"), m("2", "two"), m("3", "new here")];
    const remote = [m("1", "one"), m("4", "new there")];
    // After the nearest earlier message still there ("one").
    expect(mergeMessages(base, local, remote).map((x) => x.text)).toEqual(["one", "new here", "new there"]);
    expect(mergeMessages([m("1", "one")], [m("1", "one"), m("3", "new here")], [m("4", "other")]).map((x) => x.text)).toEqual(["other", "new here"]);
  });
});

describe("wiring findings", () => {
  it("1: the recovery key's last group is accepted with O, I and L for 0 and 1", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    let key = "";
    for (let i = 0; i < 200 && !/[01]/.test(key.slice(-4)); i++) key = (await a.engine.setUp({ deviceLabel: "Laptop", rememberDevice: true })).recoveryKey;
    expect(key.slice(-4)).toMatch(/[01]/);
    const typed = key.slice(-4).replace(/0/g, "o").replace(/1/g, "L");
    expect(await a.engine.confirmRecoveryKeySaved(` ${typed.slice(0, 2)} ${typed.slice(2)} `)).toBe(true);
  }, 60_000);

  it("3, 6: the state says whether this device is remembered, and when a pairing request was made", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a, true);
    expect(a.engine.getState().remembered).toBe(true);
    const b = await device(origin, "b");
    const waiting = await b.engine.startPairing({ deviceLabel: "Phone" });
    void waiting.wait.catch(() => {});
    await a.engine.refresh();
    expect(a.engine.getState()).toMatchObject({ pairingRequested: true });
    expect(Date.parse(a.engine.getState().pairingRequestedAt!)).toBeGreaterThan(Date.now() - 60_000);
    await a.engine.setRememberDevice(false);
    expect(a.engine.getState().remembered).toBe(false);
  }, 60_000);

  it("4: the open chat saves right after sync was turned on (version tracking survives the move)", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const open = (await a.vault.list()).find((c) => c.title === "First chat")!;
    await setUp(a);
    // Based on the copy read before the move, and then on what this tab saw last.
    await a.vault.save({ ...open, title: "Saved after turning sync on" }, open);
    await a.vault.save({ ...open, title: "Saved again" });
    expect((await a.vault.list()).find((c) => c.id === open.id)?.title).toBe("Saved again");
  }, 60_000);

  it("5: a state request sent before this device was registered cannot undo the registration", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const recoveryKey = await setUp(a);
    const c = await device(origin, "c");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let held = true;
    c.net.hook = async (path) => {
      if (held && path === "/api/sync/state") {
        held = false;
        await gate; // the 10 s poll, slow, sent before the recovery unlock
      }
      return undefined;
    };
    const slow = c.engine.refresh();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await c.engine.unlockWithRecoveryKey(recoveryKey, { deviceLabel: "Tablet", rememberDevice: true })).toBe("ok");
    release();
    await slow;
    await c.engine.syncNow();
    expect(c.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
    expect(c.engine.getState().detached).toBeUndefined();
  }, 60_000);

  it("7: no sync database is created on load before sync is used", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    expect((await indexedDB.databases()).some((d) => d.name === a.storeName)).toBe(false);
    await populate(a.vault);
    await setUp(a);
    expect((await indexedDB.databases()).some((d) => d.name === a.storeName)).toBe(true);
  }, 60_000);
});

describe("texts (src/text/sync-hardening.ts)", () => {
  it("has every text in English and German, translated, with its numbers", async () => {
    const { syncHardeningText: t } = await import("../src/text/sync-hardening");
    const numbers = (text: string) => (text.match(/\d+/g) ?? []).sort();
    expect(Object.keys(t.de).sort()).toEqual(Object.keys(t.en).sort());
    for (const [key, en] of Object.entries(t.en)) {
      const de = (t.de as Record<string, unknown>)[key];
      const [e, d] = typeof en === "function" ? [String((en as (x: never) => string)(7 as never)), String((de as (x: never) => string)(7 as never))] : [en, de as string];
      expect(d, key).not.toBe(e);
      expect(numbers(d), key).toEqual(numbers(e));
      expect(`${e} ${d}`, key).not.toMatch(/—/); // no em dashes
    }
    expect(t.en.detachedResetElsewhere.toLowerCase()).toContain("reset");
  });
});