// Vault sync Stage 3, project files as encrypted blobs, across simulated devices: each device has its
// own vault and sync database on fake-indexeddb, against the real app routes with the memory stores.
// A adds a file, B sees it listed and not downloaded, B opens it and gets the exact bytes, deletes on
// either side reach the other and the blob, quota, the per-file limit, offline then online.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createApp } from "../server/app";
import { MemorySyncStore } from "../server/vault-sync";
import { MemoryBlobStore } from "../server/vault-sync-blobs";
import { Vault } from "../src/vault";
import { SyncEngine, SyncError, type Fetcher } from "../src/sync/engine";
import type { FilesView } from "../src/sync/files";
import { heldProjects, holdProjects, setInstructions, type ProjectFile } from "../src/projects";

const ACCOUNT = "local-development";
const PASS = "synthetic sync passphrase one";
const closers: (() => Promise<unknown>)[] = [];
const vaults: Vault[] = [];
beforeEach(() => vi.stubGlobal("BroadcastChannel", undefined));
afterEach(async () => {
  for (const v of vaults.splice(0)) v.close(false);
  for (const close of closers.splice(0)) await close();
  vi.unstubAllGlobals();
  holdProjects({ projects: [], files: {} });
});

async function serve(blobs = { quotaBytes: 1024 * 1024 * 1024, maxFileBytes: 10 * 1024 * 1024 }) {
  const store = new MemorySyncStore();
  const blobStore = new MemoryBlobStore();
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, vaultSync: { quotaBytes: 200 * 1024 * 1024, maxDevices: 5, store, blobs: { ...blobs, store: blobStore } } }));
  closers.push(() => new Promise((resolve) => server.close(resolve)));
  return { origin, store, blobStore };
}
async function device(origin: string, name: string) {
  const vault = new Vault();
  vault.selectAccount(crypto.randomUUID());
  vaults.push(vault);
  const status = await fetch(`${origin}/api/status`);
  const cookie = status.headers.getSetCookie()[0].split(";")[0];
  const { csrf } = await status.json();
  const net = { offline: false, bodies: [] as string[], requests: [] as string[] };
  const fetcher: Fetcher = async (path, init) => {
    if (net.offline) throw new TypeError("fetch failed");
    net.requests.push(`${init.method} ${path}`);
    if (init.body) net.bodies.push(typeof init.body === "string" ? init.body : Buffer.from(init.body).toString("latin1"));
    return fetch(`${origin}${path}`, { method: init.method, headers: { ...init.headers, cookie }, body: init.body });
  };
  const views: FilesView[] = [];
  const engine = new SyncEngine({ vault, accountId: ACCOUNT, csrf: () => csrf, fetch: fetcher, storeName: `sync-${name}-${crypto.randomUUID()}`, pollMs: 10, onFiles: (v) => views.push(v) });
  engine.stop();
  await engine.init();
  return { vault, engine, net, views };
}
type Device = Awaited<ReturnType<typeof device>>;
async function setUp(d: Device) {
  const { recoveryKey } = await d.engine.setUp({ deviceLabel: "Laptop", rememberDevice: true });
  expect(await d.engine.confirmRecoveryKeySaved(recoveryKey.slice(-4))).toBe(true);
}
async function pair(a: Device, b: Device) {
  const { code, wait } = await b.engine.startPairing({ deviceLabel: "Phone" });
  expect(await a.engine.approvePairing(code, "Phone")).toBe("approved");
  expect(await wait).toBe("approved");
}
const makeFile = (name: string, text: string, passages = 2): ProjectFile => ({
  id: crypto.randomUUID(),
  name,
  characters: text.length * passages,
  at: new Date().toISOString(),
  sources: Array.from({ length: passages }, (_, i) => ({ id: `p${i}`, title: name, text })),
});
async function addFile(vault: Vault, projectId: string, file: ProjectFile) {
  await vault.changeProjectFiles((all) => ({ ...all, [projectId]: [...(all[projectId] ?? []), file] }));
}
async function removeFile(vault: Vault, projectId: string, id: string) {
  await vault.changeProjectFiles((all) => ({ ...all, [projectId]: (all[projectId] ?? []).filter((f) => f.id !== id) }));
}
async function withProject(d: Device) {
  await d.vault.unlock(PASS);
  const [project] = await d.vault.changeProjects(() => [{ id: crypto.randomUUID(), name: "Thesis" }]);
  return project;
}

describe("project files as encrypted blobs", () => {
  it("A adds a file, B lists it, opens it with the exact bytes, deletes it, and A's copy and the blob are gone", async () => {
    const { origin, blobStore } = await serve();
    const a = await device(origin, "a");
    const project = await withProject(a);
    const notes = makeFile("CANARY-NAME-Notes.txt", "CANARY-FILE-TEXT about tenancy law. ".repeat(100));
    await addFile(a.vault, project.id, notes);
    await setUp(a);
    expect(await blobStore.usage(ACCOUNT)).toMatchObject({ count: 1 });
    // Nothing readable left the device: not the text, not the name.
    for (const canary of ["CANARY-FILE-TEXT", "CANARY-NAME"]) expect(a.net.bodies.join("\n")).not.toContain(canary);
    expect(a.engine.fileView()).toMatchObject({ enabled: true, remote: [], states: {} });
    expect(a.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });

    // B: the file is listed at once and not downloaded.
    const b = await device(origin, "b");
    await pair(a, b);
    expect(await b.vault.readProjectFiles()).toEqual({});
    const listed = b.engine.fileView().remote;
    expect(listed.map((f) => [f.name, f.projectId, f.characters])).toEqual([[notes.name, project.id, notes.characters]]);
    expect(b.engine.fileView().states).toEqual({});
    expect(b.net.requests.some((r) => r.includes("/blobs/"))).toBe(false); // lazy: nothing downloaded yet

    // B opens it: downloaded with progress, checked, kept in B's vault, held for questions.
    expect(await b.engine.downloadFile(notes.id)).toBe("ok");
    expect(b.views.some((v) => v.states[notes.id]?.state === "downloading")).toBe(true);
    expect((await b.vault.readProjectFiles())[project.id]).toEqual([notes]);
    expect(heldProjects().files[project.id]).toEqual([notes]);
    expect(b.engine.fileView().remote).toEqual([]);
    await b.engine.syncNow();
    expect(b.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
    expect(await blobStore.usage(ACCOUNT)).toMatchObject({ count: 1 }); // a download uploads nothing

    // B deletes it: the blob goes after B's list is accepted, and A's copy goes at A's next sync.
    await removeFile(b.vault, project.id, notes.id);
    await b.engine.syncNow();
    expect(await blobStore.usage(ACCOUNT)).toEqual({ count: 0, usedBytes: 0 });
    await a.engine.syncNow();
    expect(await a.vault.readProjectFiles()).toEqual({});
    expect(a.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
  }, 60_000);

  it("deletes a file B never downloaded, keeps a file added during an instructions edit without a project copy, and downloads for a chat", async () => {
    const { origin, blobStore } = await serve();
    const a = await device(origin, "a");
    const project = await withProject(a);
    await setUp(a);
    const b = await device(origin, "b");
    await pair(a, b);
    const first = makeFile("First.txt", "first file text ".repeat(50));
    const second = makeFile("Second.txt", "second file text ".repeat(50));
    await addFile(a.vault, project.id, first);
    await addFile(a.vault, project.id, second);
    // At the same time B edits the project's instructions.
    await b.vault.changeProjects(setInstructions(project.id, "Answer in German."));
    await a.engine.syncNow();
    await b.engine.syncNow();
    await a.engine.syncNow();
    for (const d of [a, b]) {
      expect((await d.vault.readProjects()).map((p) => [p.name, p.instructions])).toEqual([["Thesis", "Answer in German."]]);
    }
    expect(b.engine.fileView().remote.map((f) => f.name).sort()).toEqual(["First.txt", "Second.txt"]);
    // B removes "First.txt" without ever downloading it.
    await b.engine.removeRemoteFile(first.id);
    expect(b.engine.fileView().remote.map((f) => f.name)).toEqual(["Second.txt"]);
    await b.engine.syncNow();
    expect(await blobStore.usage(ACCOUNT)).toMatchObject({ count: 1 });
    await a.engine.syncNow();
    expect((await a.vault.readProjectFiles())[project.id].map((f) => f.name)).toEqual(["Second.txt"]);
    // Before a question in a project chat, every file of the project is downloaded.
    expect(await b.engine.ensureProjectFiles(project.id)).toBe(true);
    expect((await b.vault.readProjectFiles())[project.id]).toEqual([second]);
    // A blob changed on the server is refused, not kept.
    const third = makeFile("Third.txt", "third file text ".repeat(50));
    await addFile(a.vault, project.id, third);
    await a.engine.syncNow();
    await b.engine.syncNow();
    const entry = b.engine.fileView().remote.find((f) => f.id === third.id)!;
    await blobStore.put(ACCOUNT, entry.blobId, Buffer.alloc(entry.size + 28, 1), Number.MAX_SAFE_INTEGER);
    expect(await b.engine.downloadFile(third.id)).toBe("failed");
    expect(b.engine.fileView().states[third.id]).toEqual({ state: "error", reason: "damaged" });
    expect((await b.vault.readProjectFiles())[project.id].map((f) => f.name)).toEqual(["Second.txt"]);
  }, 60_000);

  it("refuses a file above the limit with its own state, waits when the quota is full, and uploads after being offline", async () => {
    const { origin, blobStore } = await serve({ quotaBytes: 6000, maxFileBytes: 4000 });
    const a = await device(origin, "a");
    const project = await withProject(a);
    const small = makeFile("Small.txt", "x".repeat(1000)); // about 2.2 KB as a blob
    const big = makeFile("Big.txt", "y".repeat(3000)); // above 4,000 bytes
    await addFile(a.vault, project.id, small);
    await addFile(a.vault, project.id, big);
    await setUp(a);
    expect(a.engine.fileView().states).toEqual({ [big.id]: { state: "too-large" } });
    expect(a.engine.fileView().quota).toMatchObject({ count: 1, limitBytes: 6000, maxFileBytes: 4000 });
    expect(a.engine.getState()).toMatchObject({ phase: "idle", pending: 0 }); // too large never waits
    // Two more small files: the second does not fit the quota and waits, counted as pending.
    const next = makeFile("Next.txt", "z".repeat(1000));
    const over = makeFile("Over.txt", "w".repeat(1000));
    await addFile(a.vault, project.id, next);
    await addFile(a.vault, project.id, over);
    await a.engine.syncNow();
    expect(a.engine.fileView().states[over.id]).toEqual({ state: "quota" });
    expect(a.engine.getState().pending).toBe(1);
    expect(await blobStore.usage(ACCOUNT)).toMatchObject({ count: 2 });
    // Freed space: the waiting file goes up at the next sync.
    await removeFile(a.vault, project.id, small.id);
    await a.engine.syncNow();
    await a.engine.syncNow();
    expect(a.engine.fileView().states).toEqual({ [big.id]: { state: "too-large" } });
    expect(await blobStore.usage(ACCOUNT)).toMatchObject({ count: 2 });

    // Offline: the new file waits in the vault, counted; online it goes and B sees it.
    a.net.offline = true;
    await removeFile(a.vault, project.id, next.id);
    const offline = makeFile("Offline.txt", "o".repeat(500));
    await addFile(a.vault, project.id, offline);
    await expect(a.engine.syncNow()).rejects.toBeInstanceOf(SyncError);
    expect(a.engine.getState()).toMatchObject({ phase: "error", error: "offline" });
    expect(a.engine.getState().pending).toBeGreaterThanOrEqual(1);
    a.net.offline = false;
    await a.engine.syncNow();
    expect(a.engine.getState()).toMatchObject({ phase: "idle", pending: 0 });
    const b = await device(origin, "b");
    await pair(a, b);
    expect(b.engine.fileView().remote.map((f) => f.name).sort()).toEqual(["Offline.txt", "Over.txt"]);
    expect(await b.engine.downloadFile(offline.id)).toBe("ok");
    expect((await b.vault.readProjectFiles())[project.id]).toEqual([offline]);
  }, 60_000);
});
