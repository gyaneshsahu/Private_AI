// The sync engine in custodial form (src/sync/engine.ts, `custodial: true`) against the real app
// routes with the memory stores, across two simulated devices of one account: each has its own
// Secure database on fake-indexeddb and its own session, and gets the account's key from
// GET /api/secure/key. No passphrase, no device, no code, no recovery key. Synthetic data only.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createApp } from "../server/app";
import { ephemeralCustodyMaster } from "../server/custody";
import { MemorySecureStore } from "../server/secure-store";
import { MemorySyncStore } from "../server/vault-sync";
import { MemoryBlobStore } from "../server/vault-sync-blobs";
import { emptyConversation, type Conversation, type Message } from "../shared/contracts";
import { Vault } from "../src/vault";
import { SyncEngine, type Fetcher } from "../src/sync/engine";
import { addTask, newTask } from "../src/scheduled";
import { FILES_OFF, type FilesView } from "../src/sync/files";
import * as k from "../src/sync/crypto";

const ACCOUNT = "local-development"; // the development server's one account
const closers: (() => Promise<unknown>)[] = [];
const vaults: Vault[] = [];
beforeEach(() => vi.stubGlobal("BroadcastChannel", undefined));
afterEach(async () => {
  for (const v of vaults.splice(0)) v.close(false);
  for (const close of closers.splice(0)) await close();
  vi.unstubAllGlobals();
});

async function serve() {
  const secure = new MemorySecureStore();
  const blobs = new MemoryBlobStore();
  const sync = new MemorySyncStore();
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on(
    "request",
    createApp({
      origin,
      dev: true,
      // Secure Max is on too: nothing of Secure may reach its store.
      vaultSync: { quotaBytes: 200 * 1024 * 1024, maxDevices: 5, store: sync },
      secureStore: { quotaBytes: 200 * 1024 * 1024, filesQuotaBytes: 1024 * 1024 * 1024, master: ephemeralCustodyMaster(), store: secure, blobs },
    }),
  );
  closers.push(() => new Promise((resolve) => server.close(resolve)));
  return { origin, secure, blobs, sync };
}
/** One signed-in browser: its own session, its own databases, the key from the server. */
async function device(origin: string) {
  const status = await fetch(`${origin}/api/status`);
  const cookie = status.headers.getSetCookie()[0].split(";")[0];
  const { csrf } = (await status.json()) as { csrf: string };
  const served = (await (await fetch(`${origin}/api/secure/key`, { headers: { cookie } })).json()) as { key: string };
  const vault = new Vault();
  vault.selectAccount(crypto.randomUUID(), "cometrow-secure"); // its own database: a separate browser
  vaults.push(vault);
  await vault.unlockWithAccountKey(k.fromBase64(served.key));
  const net = { offline: false, bodies: [] as string[], paths: [] as string[], deviceHeaders: 0 };
  const fetcher: Fetcher = async (path, init) => {
    if (net.offline) throw new TypeError("fetch failed");
    net.paths.push(path);
    if (Object.keys(init.headers).some((h) => h.toLowerCase() === "x-sync-device")) net.deviceHeaders++;
    if (init.body) net.bodies.push(typeof init.body === "string" ? init.body : Buffer.from(init.body).toString("latin1"));
    return fetch(`${origin}${path}`, { method: init.method, headers: { ...init.headers, cookie }, body: init.body });
  };
  let files: FilesView = FILES_OFF;
  let applied = 0;
  const engine = new SyncEngine({
    vault,
    accountId: ACCOUNT,
    csrf: () => csrf,
    fetch: fetcher,
    custodial: true,
    storeName: `secure-sync-${crypto.randomUUID()}`,
    onFiles: (view) => (files = view),
    onApplied: () => applied++,
  });
  engine.stop(); // no timers: the test drives every sync
  await engine.init();
  return { vault, engine, net, key: served.key, files: () => files, applied: () => applied };
}
const message = (text: string, role: Message["role"] = "user"): Message => ({ id: crypto.randomUUID(), role, text, status: "complete", included: true, at: new Date().toISOString() });
const chat = (title: string, texts: string[]): Conversation => ({ ...emptyConversation(), title, messages: texts.map((t) => message(t)) });
const titles = async (vault: Vault) => (await vault.readAvailable()).conversations.map((c) => c.title).sort();

it("puts everything on a second device after sign-in alone, merges edits both ways and keeps Secure apart from Secure Max", async () => {
  const s = await serve();
  const a = await device(s.origin);
  expect(a.engine.getState().phase).toBe("idle");

  // A saves a chat, a memory, a project with instructions and a file, a task and an incognito chat.
  const first = await a.vault.save(chat("First chat", ["CANARY-CHAT", "an answer"]), null);
  await a.vault.save({ ...chat("Never saved", ["CANARY-INCOGNITO"]), incognito: true }, null).catch(() => {});
  const [project] = await a.vault.changeProjects(() => [{ id: crypto.randomUUID(), name: "Thesis", instructions: "CANARY-INSTRUCTIONS" }]);
  const fileId = crypto.randomUUID();
  await a.vault.changeProjectFiles(() => ({
    [project.id]: [{ id: fileId, name: "Notes.pdf", characters: 12, at: new Date().toISOString(), sources: [{ id: "p0", title: "Notes.pdf", text: "CANARY-FILE!" }] }],
  }));
  await a.vault.writeMemories(() => [{ id: crypto.randomUUID(), text: "CANARY-MEMORY", at: new Date().toISOString() }]);
  await a.vault.writeTasks(
    addTask(
      newTask({
        name: "Word",
        instruction: "CANARY-TASK",
        trigger: { every: 2, unit: "day", time: "10:00", timeZone: "Europe/Berlin" },
        mode: "manual",
        notify: { inApp: true, calendar: false },
        answerMode: "fast",
        useSearch: false,
      }),
    ),
  );
  expect(await a.engine.pendingCount()).toBeGreaterThan(0);
  await a.engine.syncNow();
  expect(a.engine.getState()).toMatchObject({ phase: "idle", pending: 0, devices: [] });
  // Everything went to /api/secure, as ciphertext, with no device header; the key was never sent back.
  expect(a.net.paths.every((p) => p.startsWith("/api/secure/"))).toBe(true);
  expect(a.net.deviceHeaders).toBe(0);
  const sent = a.net.bodies.join("\n");
  for (const canary of ["CANARY-CHAT", "CANARY-INCOGNITO", "CANARY-INSTRUCTIONS", "CANARY-FILE", "CANARY-MEMORY", "CANARY-TASK", "First chat", "Thesis", "Notes.pdf", a.key]) expect(sent).not.toContain(canary);
  expect((await s.secure.usage(ACCOUNT)).usedBytes).toBeGreaterThan(0);
  expect((await s.blobs.usage(ACCOUNT)).count).toBe(1);

  // B signs in: the same key, and everything is there after the first pull. No passphrase, code or key typed.
  const b = await device(s.origin);
  expect(b.key).toBe(a.key);
  expect(b.applied()).toBeGreaterThan(0);
  expect(await titles(b.vault)).toEqual(["First chat"]);
  expect((await b.vault.readMemories()).map((m) => m.text)).toEqual(["CANARY-MEMORY"]);
  expect(await b.vault.readProjects()).toEqual([{ id: project.id, name: "Thesis", instructions: "CANARY-INSTRUCTIONS" }]);
  expect((await b.vault.readTasks()).map((t) => t.instruction)).toEqual(["CANARY-TASK"]);
  // The file is listed and downloaded when asked for.
  expect(b.files().enabled).toBe(true);
  expect(b.files().remote.map((f) => f.name)).toEqual(["Notes.pdf"]);
  expect(await b.engine.downloadFile(fileId)).toBe("ok");
  expect((await b.vault.readProjectFiles())[project.id][0].sources[0].text).toBe("CANARY-FILE!");

  // An edit on B reaches A; an edit on A at the same time is merged, not lost.
  const onB = (await b.vault.readAvailable()).conversations[0];
  await b.vault.save({ ...onB, title: "Renamed on B", messages: [...onB.messages, message("added on B")] }, onB);
  await b.engine.syncNow();
  const mine = await a.vault.save({ ...first, messages: [...first.messages, message("added on A")] }, first);
  await a.engine.syncNow();
  // A still lists its local incognito chat (the vault keeps it on this device; the engine never sends it).
  const merged = (await a.vault.readAvailable()).conversations.find((c) => c.id === mine.id)!;
  expect(merged.title).toBe("Renamed on B");
  expect(merged.messages.map((m) => m.text)).toEqual(expect.arrayContaining(["CANARY-CHAT", "added on A", "added on B"]));
  await b.engine.syncNow();
  expect((await b.vault.readAvailable()).conversations.find((c) => c.id === mine.id)!.messages).toHaveLength(merged.messages.length);

  // A delete on A reaches B.
  await a.vault.delete(merged.id);
  await a.engine.syncNow();
  await b.engine.syncNow();
  expect(await titles(b.vault)).toEqual([]);

  // Offline: changes wait in the vault and go later.
  a.net.offline = true;
  await a.vault.save(chat("Written offline", ["later"]), null);
  await expect(a.engine.syncNow()).rejects.toThrow();
  expect(a.engine.getState()).toMatchObject({ phase: "error", error: "offline", pending: 1 });
  a.net.offline = false;
  await a.engine.syncNow();
  await b.engine.syncNow();
  expect(await titles(b.vault)).toEqual(["Written offline"]);

  // Nothing of Secure is in the Secure Max store, and no Secure Max setup exists.
  expect(await s.sync.proofs(ACCOUNT)).toBeUndefined();
  expect(await s.sync.usage(ACCOUNT)).toEqual({ usedBytes: 0, cursor: 0 });
  // The custodial engine never created a device record or a pairing.
  expect([...a.net.paths, ...b.net.paths].some((p) => /\/(devices|pairings|wrappers|setup|reset)/.test(p))).toBe(false);
});

it("cannot read the account's items with another key, and deletes its local database on eraseLocal", async () => {
  const s = await serve();
  const a = await device(s.origin);
  await a.vault.save(chat("Only for this key", ["text"]), null);
  await a.engine.syncNow();
  // A vault opened with a wrong key (not what the server hands out) applies nothing.
  const status = await fetch(`${s.origin}/api/status`);
  const cookie = status.headers.getSetCookie()[0].split(";")[0];
  const { csrf } = (await status.json()) as { csrf: string };
  const vault = new Vault();
  vault.selectAccount(crypto.randomUUID(), "cometrow-secure");
  vaults.push(vault);
  await vault.unlockWithAccountKey(k.random(32));
  const storeName = `secure-sync-${crypto.randomUUID()}`;
  const stranger = new SyncEngine({
    vault,
    accountId: ACCOUNT,
    csrf: () => csrf,
    custodial: true,
    storeName,
    onFiles: () => {},
    fetch: (path, init) => fetch(`${s.origin}${path}`, { method: init.method, headers: { ...init.headers, cookie }, body: init.body }),
  });
  stranger.stop();
  await stranger.init();
  expect(await titles(vault)).toEqual([]);
  // Sign-out: the engine's own database goes.
  expect((await indexedDB.databases()).some((d) => d.name === storeName)).toBe(true);
  await stranger.eraseLocal();
  expect((await indexedDB.databases()).some((d) => d.name === storeName)).toBe(false);
});
