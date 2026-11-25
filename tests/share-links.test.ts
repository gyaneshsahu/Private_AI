// Encrypted share links (docs/sharing-20261125.md), the server side with the in-memory store: the
// switch, creating, the public read without a session, the owner's list (never the content),
// delete, expiry, the per-account limit, accounts apart, and what the server refuses.
import { createServer } from "node:http";
import { afterEach, expect, it } from "vitest";
import { createApp } from "../server/app";
import { MemoryShareStore, type ShareStore } from "../server/share-links";
import { SHARE, shareCreateRequest, shareSnapshot } from "../shared/share-links";

const servers: { close(): void }[] = [];
afterEach(() => servers.splice(0).forEach((s) => s.close()));
const CIPHER = "A".repeat(64);

async function start(store?: ShareStore) {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  server.on("request", createApp({ origin, dev: true, ...(store ? { shareLinks: { store } } : {}) }));
  servers.push(server);
  const first = await fetch(`${origin}/api/status`);
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const status = (await first.json()) as { csrf: string; shareLinks?: true };
  const call = (method: string, path: string, body?: unknown, csrf = status.csrf) =>
    fetch(origin + path, {
      method,
      headers: { cookie, "x-privateai-csrf": csrf, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { origin, status, call };
}

it("the switch: off by default, with no route and no public address", async () => {
  const off = await start();
  expect(off.status.shareLinks).toBeUndefined();
  expect((await off.call("POST", "/api/share", { cipher: CIPHER, expires: "day" })).status).toBe(404);
  expect((await fetch(`${off.origin}/s/${"a".repeat(22)}/data`)).status).toBe(404);
  expect((await start(new MemoryShareStore())).status.shareLinks).toBe(true);
});

it("create, read without a session, list without content, delete", async () => {
  const s = await start(new MemoryShareStore());
  const made = await s.call("POST", "/api/share", { cipher: CIPHER, expires: "week" });
  expect(made.status).toBe(201);
  expect(made.headers.get("cache-control")).toBe("no-store");
  const { id, expiresAt } = (await made.json()) as { id: string; expiresAt: string };
  expect(id).toMatch(SHARE.id);
  expect(Date.parse(expiresAt) - Date.now()).toBeGreaterThan(6.9 * 86_400_000);
  expect(Date.parse(expiresAt) - Date.now()).toBeLessThan(7.1 * 86_400_000);
  // Anyone with the link: no cookie, no token. Only the ciphertext and its expiry come back.
  const read = await fetch(`${s.origin}/s/${id}/data`);
  expect(read.status).toBe(200);
  expect(read.headers.get("cache-control")).toBe("no-store");
  expect(read.headers.get("referrer-policy")).toBe("no-referrer");
  expect(await read.json()).toEqual({ cipher: CIPHER, expiresAt });
  // The owner's list says when and how large, never what.
  const list = (await (await s.call("GET", "/api/share")).json()) as { links: Record<string, unknown>[] };
  expect(list.links).toHaveLength(1);
  expect(Object.keys(list.links[0]).sort()).toEqual(["bytes", "createdAt", "expiresAt", "id"]);
  expect(JSON.stringify(list)).not.toContain(CIPHER);
  // Deleted: gone for everyone, at once.
  expect((await s.call("DELETE", `/api/share/${id}`)).status).toBe(204);
  expect((await fetch(`${s.origin}/s/${id}/data`)).status).toBe(404);
  expect((await s.call("DELETE", `/api/share/${id}`)).status).toBe(404);
  expect(((await (await s.call("GET", "/api/share")).json()) as { links: unknown[] }).links).toEqual([]);
});

it("what the server refuses: bad bodies, a wrong token, unknown and malformed ids", async () => {
  const s = await start(new MemoryShareStore());
  for (const bad of [{}, { cipher: CIPHER }, { cipher: "short", expires: "day" }, { cipher: CIPHER + "+/=", expires: "day" }, { cipher: CIPHER, expires: "year" }, { cipher: CIPHER, expires: "day", title: "x" }])
    expect((await s.call("POST", "/api/share", bad)).status, JSON.stringify(bad)).toBe(400);
  expect((await s.call("POST", "/api/share", { cipher: CIPHER, expires: "day" }, "wrong")).status).toBe(403);
  expect((await fetch(`${s.origin}/s/${"b".repeat(22)}/data`)).status).toBe(404);
  expect((await fetch(`${s.origin}/s/not-an-id/data`)).status).toBe(404);
  expect(shareCreateRequest.safeParse({ cipher: "A".repeat(SHARE.cipherChars + 1), expires: "day" }).success).toBe(false);
});

it("the store: expiry, the per-account limit, accounts apart, the sweep", async () => {
  const store = new MemoryShareStore();
  const row = (id: string, accountId: string, expiresAt: number) => ({ id, accountId, cipher: CIPHER, createdAt: 1, expiresAt });
  expect(await store.create(row("one", "a", 1000), 10)).toBe(true);
  expect(await store.read("one", 999)).toEqual({ cipher: CIPHER, expiresAt: 1000 });
  // At its expiry a link is gone, before any sweep.
  expect(await store.read("one", 1000)).toBeUndefined();
  expect(await store.list("a", 1000)).toEqual([]);
  // Another account cannot delete it or see it in its list.
  expect(await store.remove("b", "one")).toBe(false);
  expect(await store.list("b", 10)).toEqual([]);
  // The limit counts live links only.
  for (let i = 0; i < SHARE.perAccount; i++) expect(await store.create(row(`live-${i}`, "a", 5000), 2000)).toBe(true);
  expect(await store.create(row("over", "a", 5000), 2000)).toBe(false);
  expect(await store.create(row("other", "b", 5000), 2000)).toBe(true);
  await store.sweep(2000);
  expect(await store.read("one", 0)).toBeUndefined(); // swept
  expect(await store.list("a", 2000)).toHaveLength(SHARE.perAccount);
  await store.sweep(6000);
  expect(await store.list("a", 0)).toEqual([]);
});

it("the snapshot format: one of three kinds, bounded, nothing extra", () => {
  const base = { v: 1, title: "Trip", sharedAt: new Date().toISOString() };
  expect(shareSnapshot.safeParse({ ...base, kind: "answer", turns: [{ role: "assistant", text: "Hello" }] }).success).toBe(true);
  expect(shareSnapshot.safeParse({ ...base, kind: "image", image: { type: "image/png", data: "AAAA" } }).success).toBe(true);
  expect(shareSnapshot.safeParse({ ...base, kind: "image", image: { type: "image/gif", data: "AAAA" } }).success).toBe(false);
  expect(shareSnapshot.safeParse({ ...base, v: 2, kind: "chat" }).success).toBe(false);
  expect(shareSnapshot.safeParse({ ...base, kind: "chat", accountId: "x" }).success).toBe(false);
  expect(shareSnapshot.safeParse({ ...base, kind: "chat", turns: [{ role: "system", text: "x" }] }).success).toBe(false);
});
