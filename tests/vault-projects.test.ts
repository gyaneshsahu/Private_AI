import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import { openDB } from "idb";
import { Vault } from "../src/vault";
import { emptyConversation } from "../shared/contracts";
import { composeContext } from "../src/conversation";
import { encodeVaultBackup } from "../src/vault-backup";
import { derive } from "../src/vault-crypto";
const stores: Vault[] = [];
const create = (id = crypto.randomUUID()) => {
  const v = new Vault();
  v.selectAccount(id);
  stores.push(v);
  return v;
};
afterEach(() => {
  for (const v of stores) v.close(false);
  stores.length = 0;
});
it("encrypts projects and organization, restores new project identities and preserves passphrase rotation", async () => {
  const id = crypto.randomUUID(),
    v = create(id),
    secret = "synthetic vault projects password";
  await v.unlock(secret);
  const [project] = await v.createProject("Synthetic research planning");
  const c = await v.save({
    ...emptyConversation(),
    title: "Notes",
    projectId: project.id,
    pinned: true,
    archived: true,
  });
  const database = await openDB(`privateai-vault-${id}`, 1);
  const records = await database.getAll("meta");
  expect(JSON.stringify(records)).not.toContain(project.name);
  database.close();
  expect(JSON.stringify(composeContext(c, 100000))).not.toContain(project.id);
  const backup = await v.exportBackup();
  expect(backup).not.toContain(project.name);
  const target = create();
  await target.unlock(secret);
  await target.restoreBackup(backup, secret);
  const [restored] = await target.list(),
    [rp] = await target.readProjects();
  expect(rp.name).toBe(project.name);
  expect(rp.id).not.toBe(project.id);
  expect(restored.projectId).toBe(rp.id);
  expect(restored.pinned).toBe(true);
  expect(restored.archived).toBe(true);
  await target.changePassphrase(secret, "changed synthetic project password");
  await target.unlock("changed synthetic project password");
  expect(await target.readProjects()).toEqual([rp]);
  const isolated = create();
  await isolated.unlock(secret);
  expect(await isolated.readProjects()).toEqual([]);
  v.lock(false);
  await expect(v.readProjects()).rejects.toThrow();
});
it("backs up an empty project, refuses invalid names, and strips the sticky search flag when saving into a project", async () => {
  const v = create(),
    secret = "synthetic empty project password";
  await v.unlock(secret);
  await expect(v.createProject("   ")).rejects.toThrow();
  await v.createProject("Empty project");
  const target = create();
  await target.unlock(secret);
  await target.restoreBackup(await v.exportBackup(), secret);
  expect(await target.list()).toEqual([]);
  expect((await target.readProjects())[0].name).toBe("Empty project");
  const organised = {
    ...emptyConversation(),
    temporarySearch: true,
    projectId: (await v.readProjects())[0].id,
  };
  await v.save(organised);
  const saved = (await v.readAvailable()).conversations.find(
    (x) => x.id === organised.id,
  )!;
  expect(saved.temporarySearch).toBeUndefined();
  expect(saved.projectId).toBe(organised.projectId);
});
it("does not lose concurrent project writes", async () => {
  const id = crypto.randomUUID(),
    a = create(id),
    b = create(id);
  await a.unlock("synthetic concurrent projects");
  await b.unlock("synthetic concurrent projects");
  const result = await Promise.allSettled([
    a.createProject("Alpha"),
    b.createProject("Beta"),
  ]);
  const count = result.filter((r) => r.status === "fulfilled").length;
  expect((await a.readProjects()).length).toBe(count);
  expect(count).toBeGreaterThan(0);
});

it("rejects backups that would silently lose project membership", async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive("synthetic project validation", salt);
  await expect(
    encodeVaultBackup(key, salt, [
      { ...emptyConversation(), projectId: crypto.randomUUID() },
    ]),
  ).rejects.toThrow("unknown project");
});

it("renames and removes projects atomically, keeps chats and rejects stale membership", async () => {
  const v = create();
  await v.unlock("synthetic project edit password");
  const [p] = await v.createProject("Original");
  const original = await v.save({
    ...emptyConversation(),
    projectId: p.id,
    pinned: true,
    archived: true,
    draft: "keep draft",
  });
  await v.editProject(p.id, "Renamed");
  expect((await v.readProjects())[0].name).toBe("Renamed");
  await v.editProject(p.id);
  expect(await v.readProjects()).toEqual([]);
  const [chat] = await v.list();
  expect(chat.projectId).toBeUndefined();
  expect(chat.draft).toBe("keep draft");
  expect(chat.archived).toBe(true);
  expect(chat.pinned).toBe(true);
  await expect(v.save(original, original)).rejects.toThrow("no longer exists");
});
it("refuses project removal rather than silently discarding unreadable history", async () => {
  const id = crypto.randomUUID(),
    v = create(id);
  await v.unlock("synthetic corrupt project password");
  const [p] = await v.createProject("Keep me");
  const db = await openDB(`privateai-vault-${id}`, 1);
  await db.put("conversations", { corrupt: true }, "broken");
  db.close();
  await expect(v.editProject(p.id)).rejects.toThrow();
  expect(await v.readProjects()).toEqual([p]);
});
