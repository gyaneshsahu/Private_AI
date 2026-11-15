// The sync engine (src/sync/engine.ts) against the real app routes with the memory store, across
// simulated devices: each device has its own vault and sync database on fake-indexeddb and its own
// session. Setup, pairing, merging, deletes, revocation, recovery, reset, migration, forgotten
// passphrase, sync off, incognito, project files, quota, offline queue and 500 conversations.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { openDB } from "idb";
import { createApp } from "../server/app";
import { MemorySyncStore } from "../server/vault-sync";
import { emptyConversation, type Conversation, type Message } from "../shared/contracts";
import { Vault } from "../src/vault";
import { SyncEngine, SyncError, type Fetcher } from "../src/sync/engine";
import { addTask, newTask, type TaskFields } from "../src/scheduled";
import { branchConversation } from "../src/conversation-branches";
import * as k from "../src/sync/crypto";

const ACCOUNT = "local-development"; // the development server's one account
const PASS = "synthetic sync passphrase one";
const closers: (() => Promise<unknown>)[] = [];
const vaults: Vault[] = [];
beforeEach(() => vi.stubGlobal("BroadcastChannel", undefined));
afterEach(async () => {
  for (const v of vaults.splice(0)) v.close(false);
  for (const close of closers.splice(0)) await close();
  vi.unstubAllGlobals();
});

async function serve(settings = { quotaBytes: 200 * 1024 * 1024, maxDevices: 5 }) {
  const store = new MemorySyncStore();
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, vaultSync: { ...settings, store } }));
  closers.push(() => new Promise((resolve) => server.close(resolve)));
  return { origin, store };
}
type Net = { offline: boolean; bodies: string[] };
async function device(origin: string, name: string) {
  const vault = new Vault();
  vault.selectAccount(crypto.randomUUID()); // its own database: a separate browser
  vaults.push(vault);
  const status = await fetch(`${origin}/api/status`);
  const cookie = status.headers.getSetCookie()[0].split(";")[0];
  const { csrf } = await status.json();
  const net: Net = { offline: false, bodies: [] };
  const fetcher: Fetcher = async (path, init) => {
    if (net.offline) throw new TypeError("fetch failed");
    if (init.body) net.bodies.push(init.body);
    return fetch(`${origin}${path}`, { method: init.method, headers: { ...init.headers, cookie }, body: init.body });
  };
  const engine = new SyncEngine({ vault, accountId: ACCOUNT, csrf: () => csrf, fetch: fetcher, storeName: `sync-${name}-${crypto.randomUUID()}`, pollMs: 10 });
  engine.stop(); // no timers: the test drives every sync
  await engine.init();
  return { vault, engine, net };
}
const message = (text: string, at = new Date().toISOString(), role: Message["role"] = "user"): Message => ({
  id: crypto.randomUUID(),
  role,
  text,
  status: "complete",
  included: true,
  at,
});
const conversation = (title: string, texts: string[]): Conversation => ({ ...emptyConversation(), title, messages: texts.map((t) => message(t)) });
const taskFields: TaskFields = {
  name: "German word",
  instruction: "Give me a new German word, SYNTHETIC-TASK.",
  trigger: { every: 2, unit: "day", time: "10:00", timeZone: "Europe/Berlin" },
  mode: "manual",
  notify: { inApp: true, calendar: false },
  answerMode: "fast",
  useSearch: false,
};
/** A populated passphrase vault: chats, a large project file, a project with instructions, memories, a task. */
async function populate(vault: Vault) {
  await vault.unlock(PASS);
  const [project] = await vault.changeProjects(() => [{ id: crypto.randomUUID(), name: "Thesis", instructions: "Answer in German. SYNTHETIC-INSTRUCTIONS" }]);
  const chats = [conversation("First chat", ["CANARY-CHAT-ONE", "an answer"]), { ...conversation("Project chat", ["CANARY-CHAT-TWO"]), projectId: project.id }];
  for (const c of chats) await vault.save(c, null);
  const big = "CANARY-FILE ".repeat(4000);
  const sources = Array.from({ length: 300 }, (_, i) => ({ id: `p${i}`, title: "Big.pdf", text: big.slice(0, 5000) }));
  await vault.changeProjectFiles(() => ({ [project.id]: [{ id: crypto.randomUUID(), name: "Big.pdf", characters: 1_500_000, at: new Date().toISOString(), sources }] }));
  await vault.writeMemories(() => [
    { id: crypto.randomUUID(), text: "I live in Berlin. CANARY-MEMORY", at: "2026-11-01T10:00:00.000Z" },
    { id: crypto.randomUUID(), text: "I prefer short answers.", pinned: true, at: "2026-11-02T10:00:00.000Z" },
  ]);
  await vault.writeTasks(addTask(newTask(taskFields)));
  return { project, chats };
}
async function contents(vault: Vault) {
  return {
    chats: (await vault.list()).sort((a, b) => a.title.localeCompare(b.title)),
    projects: await vault.readProjects(),
    memories: await vault.readMemories(),
    tasks: await vault.readTasks(),
    files: await vault.readProjectFiles(),
  };
}
const lastGroup = (key: string) => key.slice(-4);
async function setUp(d: Awaited<ReturnType<typeof device>>, remember = true) {
  const { recoveryKey } = await d.engine.setUp({ deviceLabel: "Laptop", rememberDevice: remember });
  expect(await d.engine.confirmRecoveryKeySaved("XXXX")).toBe(false);
  expect(await d.engine.confirmRecoveryKeySaved(lastGroup(recoveryKey).toLowerCase())).toBe(true);
  return recoveryKey;
}
async function pair(a: Awaited<ReturnType<typeof device>>, b: Awaited<ReturnType<typeof device>>) {
  const { code, wait } = await b.engine.startPairing({ deviceLabel: "Phone" });
  expect(code).toMatch(/^\d{6}$/);
  expect(await a.engine.approvePairing(code === "123456" ? "654321" : "123456", "Phone")).toBe("wrong-code");
  expect(await a.engine.approvePairing(code, "Phone")).toBe("approved");
  expect(await wait).toBe("approved");
}

describe("sync between devices", () => {
  it("sets up on A with migration, pairs B, merges edits on both, deletes, revokes B, recovers on C and resets", async () => {
    const { origin, store } = await serve();
    const a = await device(origin, "a");
    const before = await populate(a.vault);
    const filesBefore = await a.vault.readProjectFiles();
    const recoveryKey = await setUp(a);
    expect(await a.vault.mode()).toBe("sync");
    // Migration kept everything, project files included (they stay on the device).
    const afterSetup = await contents(a.vault);
    expect(afterSetup.chats.map((c) => c.title)).toEqual(["First chat", "Project chat"]);
    expect(afterSetup.files).toEqual(filesBefore);
    expect(afterSetup.projects[0].instructions).toContain("SYNTHETIC-INSTRUCTIONS");
    // The server holds ciphertext only: no canary, no instruction, no file text in anything sent.
    const sent = a.net.bodies.join("\n");
    for (const canary of ["CANARY-CHAT", "CANARY-MEMORY", "SYNTHETIC-INSTRUCTIONS", "SYNTHETIC-TASK", "CANARY-FILE", "Laptop", recoveryKey])
      expect(sent).not.toContain(canary);
    expect(a.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
    expect((await store.items(ACCOUNT, 0, 100)).items).toHaveLength(5); // 2 chats, projects, memories, tasks

    // B: a new browser, approved by A with the code.
    const b = await device(origin, "b");
    expect(b.engine.getState().phase).toBe("needs-approval");
    await pair(a, b);
    const onB = await contents(b.vault);
    expect(onB.chats.map((c) => c.title)).toEqual(["First chat", "Project chat"]);
    expect(onB.chats[1].projectId).toBe(before.project.id);
    expect(onB.projects).toEqual(afterSetup.projects);
    expect(onB.memories).toEqual(afterSetup.memories);
    expect(onB.tasks).toEqual(afterSetup.tasks);
    expect(onB.files).toEqual({}); // project files are not synced (Stage 3)
    await a.engine.refresh();
    expect(a.engine.getState().devices.map((d) => d.label).sort()).toEqual(["Laptop", "Phone"]);

    // Edits on both devices to the same chat and the same memory.
    const chatA = (await a.vault.list()).find((c) => c.title === "First chat")!;
    const chatB = (await b.vault.list()).find((c) => c.title === "First chat")!;
    await a.vault.save({ ...chatA, title: "Renamed on A", messages: [...chatA.messages, message("CANARY-FROM-A")] });
    await b.vault.save({ ...chatB, messages: [...chatB.messages, message("CANARY-FROM-B")] });
    const memA = await a.vault.readMemories();
    await a.vault.writeMemories(() => memA.map((m, i) => (i === 0 ? { ...m, text: "I live in Hamburg.", at: "2026-11-10T10:00:00.000Z" } : m)));
    const memB = await b.vault.readMemories();
    await b.vault.writeMemories(() => [
      ...memB.map((m, i) => (i === 0 ? { ...m, text: "I live in Munich.", at: "2026-11-11T10:00:00.000Z" } : m)),
      { id: crypto.randomUUID(), text: "New on B.", at: "2026-11-11T11:00:00.000Z" },
    ]);
    await a.engine.syncNow();
    await b.engine.syncNow(); // B merges A's version: conflict
    await a.engine.syncNow();
    await b.engine.syncNow();
    const merged = (await a.vault.list()).find((c) => c.title === "Renamed on A")!;
    expect(new Set(merged.messages.map((m) => m.text))).toEqual(new Set(["CANARY-CHAT-ONE", "an answer", "CANARY-FROM-A", "CANARY-FROM-B"]));
    expect((await b.vault.list()).find((c) => c.id === merged.id)).toEqual(merged);
    const memories = await a.vault.readMemories();
    // Both changed the first memory: the newer (Munich) wins, Hamburg is kept as a copy.
    expect(memories.map((m) => m.text).sort()).toEqual(["I live in Hamburg.", "I live in Munich.", "I prefer short answers.", "New on B."]);
    expect(await b.vault.readMemories()).toEqual(memories);

    // Branches: B retries from the first message; A adds to the old branch; both are kept.
    const onBnow = (await b.vault.list()).find((c) => c.id === merged.id)!;
    await b.vault.save(branchConversation(onBnow, "", onBnow.messages[0].id, "CANARY-BRANCH-EDIT"));
    const onAnow = (await a.vault.list()).find((c) => c.id === merged.id)!;
    await a.vault.save({ ...onAnow, messages: [...onAnow.messages, message("CANARY-A-LATER")] });
    await b.engine.syncNow();
    await a.engine.syncNow();
    await b.engine.syncNow();
    const branched = (await a.vault.list()).find((c) => c.id === merged.id)!;
    const everything = JSON.stringify(branched);
    for (const text of ["CANARY-BRANCH-EDIT", "CANARY-A-LATER", "CANARY-FROM-B"]) expect(everything).toContain(text);
    expect(branched.branches?.archived.length).toBeGreaterThanOrEqual(1);
    expect((await b.vault.list()).find((c) => c.id === merged.id)).toEqual(branched);

    // Deletes are tombstones: A deletes; B's older offline edit loses, a newer one is kept as a copy.
    const projectChat = (await a.vault.list()).find((c) => c.title === "Project chat")!;
    await a.vault.delete(projectChat.id);
    await a.engine.syncNow();
    const onBproject = (await b.vault.list()).find((c) => c.id === projectChat.id)!;
    await b.vault.save({ ...onBproject, messages: [...onBproject.messages, message("CANARY-OLD-EDIT", "2026-01-01T00:00:00.000Z")] });
    await b.engine.syncNow();
    expect((await b.vault.list()).some((c) => c.id === projectChat.id || JSON.stringify(c).includes("CANARY-OLD-EDIT"))).toBe(false);
    const third = conversation("Third", ["three"]);
    await a.vault.save(third, null);
    await a.engine.syncNow();
    await b.engine.syncNow();
    const thirdOnB = (await b.vault.list()).find((c) => c.id === third.id)!;
    await b.vault.save({ ...thirdOnB, messages: [...thirdOnB.messages, message("CANARY-NEWER-EDIT", "2099-01-01T00:00:00.000Z")] });
    await a.vault.delete(third.id);
    await a.engine.syncNow();
    await b.engine.syncNow();
    const listB = await b.vault.list();
    expect(listB.some((c) => c.id === third.id)).toBe(false);
    expect(listB.find((c) => c.title === "Third (conflict copy)")?.messages.map((m) => m.text)).toContain("CANARY-NEWER-EDIT");
    await a.engine.syncNow();
    expect((await a.vault.list()).some((c) => c.title === "Third (conflict copy)")).toBe(true);

    // Revoke B from A: B's next request is refused, B locks and forgets its key; its local data stays.
    const bId = b.engine.getState().devices.find((d) => d.thisDevice)?.deviceId ?? (await b.engine.refresh(), b.engine.getState().devices.find((d) => d.thisDevice)!.deviceId);
    await a.engine.revokeDevice(bId);
    await expect(b.engine.syncNow()).rejects.toMatchObject({ code: "revoked" });
    expect(b.vault.unlocked).toBe(false);
    expect(b.engine.getState()).toMatchObject({ phase: "needs-approval", error: "revoked" });

    // Recovery on a fresh device C, with a typo first.
    const c = await device(origin, "c");
    const typo = recoveryKey.slice(0, 2) + (recoveryKey[2] === "A" ? "B" : "A") + recoveryKey.slice(3);
    expect(await c.engine.unlockWithRecoveryKey(typo, { deviceLabel: "Tablet", rememberDevice: true })).toBe("wrong-key");
    expect(await c.engine.unlockWithRecoveryKey(k.encodeRecoveryKey(k.newRecoveryKey().bytes), { deviceLabel: "Tablet", rememberDevice: true })).toBe("wrong-key");
    expect(await c.engine.unlockWithRecoveryKey(recoveryKey, { deviceLabel: "Tablet", rememberDevice: true })).toBe("ok");
    expect((await c.vault.list()).map((x) => x.id).sort()).toEqual((await a.vault.list()).map((x) => x.id).sort());
    expect(await c.vault.readMemories()).toEqual(memories);

    // Reset (all synced data and wrappers gone); C keeps its local data under a local passphrase.
    await expect(c.engine.resetSync("delete")).rejects.toMatchObject({ code: "wrong-confirmation" });
    await expect(c.engine.resetSync("DELETE SYNCED DATA")).rejects.toMatchObject({ code: "needs-local-passphrase" });
    await c.engine.resetSync("DELETE SYNCED DATA", { localPassphrase: "synthetic local passphrase C" });
    expect((await store.items(ACCOUNT, 0, 100)).items).toHaveLength(0);
    expect(await store.authHash(ACCOUNT)).toBeUndefined();
    await a.engine.refresh();
    expect(a.engine.getState().phase).toBe("off");
    c.vault.lock();
    await c.vault.unlock("synthetic local passphrase C");
    expect((await c.vault.list()).length).toBeGreaterThan(0);
  }, 60_000);

  it("a remembered device unlocks itself on the next visit; a forgotten local passphrase is replaced with the recovery key", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await populate(a.vault);
    const before = await contents(a.vault);
    const recoveryKey = await setUp(a, false); // not remembered: the local passphrase opens it
    await a.vault.setLocalPassphrase("synthetic local passphrase");
    a.vault.lock();
    await expect(a.vault.unlock(PASS)).rejects.toThrow(); // the old passphrase no longer opens it
    await expect(a.vault.unlock("a forgotten passphrase")).rejects.toThrow();
    // Forgot it: the recovery key opens this locked device, keeps all data, sets a new passphrase.
    expect(await a.engine.unlockWithRecoveryKey(recoveryKey, { deviceLabel: "Laptop", rememberDevice: false })).toBe("ok");
    expect(await contents(a.vault)).toEqual(before);
    await a.vault.setLocalPassphrase("synthetic new local passphrase");
    a.vault.lock();
    await a.vault.unlock("synthetic new local passphrase");
    expect(await contents(a.vault)).toEqual(before);
    // Changing it with the old one works too; a wrong old one is refused.
    await expect(a.vault.changePassphrase("wrong old passphrase", "synthetic third passphrase")).rejects.toThrow();
    await a.vault.unlock("synthetic new local passphrase");
    await a.vault.changePassphrase("synthetic new local passphrase", "synthetic third passphrase");
    await a.vault.unlock("synthetic third passphrase");
    expect((await a.vault.list()).length).toBe(2);

    // Remembered: a new engine for the same browser unlocks without any secret.
    const b = await device(origin, "b");
    await pair(a, b);
    const storeName = (b.engine as unknown as { storeName: string }).storeName;
    b.vault.lock();
    const again = new SyncEngine({ vault: b.vault, accountId: ACCOUNT, csrf: () => "", fetch: async () => { throw new TypeError("offline"); }, storeName });
    again.stop();
    await again.init(); // offline: the cached wrapper and the device key open the vault
    expect(b.vault.unlocked).toBe(true);
    expect((await b.vault.list()).length).toBe(2);
  }, 60_000);
});

describe("sync off and limits", () => {
  it("leaves a vault that never turns sync on exactly as before", async () => {
    const id = crypto.randomUUID();
    const v = new Vault();
    v.selectAccount(id);
    vaults.push(v);
    await populate(v);
    expect(v.onSync).toBeUndefined();
    expect(v.accountKey()).toBeUndefined();
    expect(await v.mode()).toBe("passphrase");
    const database = await openDB(`privateai-vault-${id}`, 1);
    const meta = await database.get("meta", "vault");
    database.close();
    expect(Object.keys(meta).sort()).toEqual(["check", "salt"]);
    expect((await indexedDB.databases()).some((d) => d.name?.startsWith("cometrow-sync"))).toBe(false);
    await expect(v.setLocalPassphrase("synthetic local passphrase")).rejects.toThrow();
    await v.changePassphrase(PASS, "synthetic other passphrase");
    await v.unlock("synthetic other passphrase");
    expect((await v.list()).length).toBe(2);
  });

  it("never syncs incognito chats or project files, surfaces quota errors and queues offline changes", async () => {
    const { origin, store } = await serve({ quotaBytes: 1500, maxDevices: 5 });
    const a = await device(origin, "a");
    await populate(a.vault);
    await setUp(a).catch(() => {});
    // The chats plus lists exceed 1500 bytes: quota surfaced, the rest waits.
    expect(a.engine.getState()).toMatchObject({ phase: "error", error: "quota" });
    expect(a.engine.getState().pending).toBeGreaterThan(0);
    const { origin: roomy } = await serve();
    const b = await device(roomy, "b");
    await b.vault.unlock(PASS);
    await b.vault.save({ ...conversation("Secret", ["CANARY-INCOGNITO"]), incognito: true }, null);
    await b.vault.save(conversation("Normal", ["normal"]), null);
    await setUp(b);
    expect(b.net.bodies.join()).not.toContain("CANARY-INCOGNITO");
    void store;
    // Offline: changes stay in the vault and are counted; back online they go.
    b.net.offline = true;
    await b.vault.save(conversation("Offline one", ["x"]), null);
    await b.vault.save(conversation("Offline two", ["y"]), null);
    await expect(b.engine.syncNow()).rejects.toBeInstanceOf(SyncError);
    expect(b.engine.getState()).toMatchObject({ phase: "error", error: "offline", pending: 2 });
    b.net.offline = false;
    await b.engine.syncNow();
    expect(b.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
    // What reached the server decrypts to chats and lists only, never a project file.
    const ak = b.vault.accountKey()!;
    const kinds = new Set<string>();
    const { store: _s } = { store };
    const items = (await (b.engine as unknown as { bases(): Promise<Map<string, { kind?: string }>> }).bases()).values();
    for (const base of items) kinds.add(String(base.kind));
    expect([...kinds].sort()).toEqual(["conversation", "memories", "projects", "scheduled-tasks"].filter((x) => kinds.has(x)).sort());
    expect(kinds.has("conversation")).toBe(true);
    expect(ak).toHaveLength(32);
  }, 60_000);

  it("syncs a vault of 500 conversations to a second device in reasonable time", async () => {
    const { origin } = await serve();
    const a = await device(origin, "a");
    await a.vault.unlock(PASS);
    const text = "A typical answer with a few sentences of text. ".repeat(40);
    for (let i = 0; i < 500; i++) await a.vault.save(conversation(`Chat ${i}`, ["question", text, "follow-up", text]), null);
    let started = performance.now();
    await setUp(a);
    const push = performance.now() - started;
    const b = await device(origin, "b");
    started = performance.now();
    await pair(a, b);
    const pull = performance.now() - started;
    expect((await b.vault.list()).length).toBe(500);
    started = performance.now();
    await a.engine.syncNow(); // nothing changed: one pull page, no pushes
    const idle = performance.now() - started;
    console.info(`500 conversations: setup and push ${Math.round(push)} ms, pairing and pull ${Math.round(pull)} ms, idle sync ${Math.round(idle)} ms`);
    expect(push).toBeLessThan(60_000);
    expect(pull).toBeLessThan(60_000);
  }, 180_000);
});
