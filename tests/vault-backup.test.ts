import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { openDB } from "idb";
import { Vault } from "../src/vault";
import { emptyConversation } from "../shared/contracts";
import { BACKUP_MAX_BYTES, decodeVaultBackup } from "../src/vault-backup";
import { derive, seal, unseal } from "../src/vault-crypto";

const stores: Vault[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const v of stores.splice(0)) v.close(false);
});
async function vault(password = "synthetic original backup password") {
  const v = new Vault(),
    account = crypto.randomUUID();
  stores.push(v);
  v.selectAccount(account);
  await v.unlock(password);
  return { v, account, password };
}
const draft = () => ({
  ...emptyConversation(),
  title: "SYNTHETIC PRIVATE TITLE",
  draft: "SYNTHETIC PRIVATE DRAFT",
  attachments: [
    {
      id: "file",
      name: "notes.txt",
      selected: true,
      kind: "document" as const,
      sources: [
        {
          id: "s1",
          title: "Notes",
          text: "SYNTHETIC SOURCE",
          userEdited: true,
        },
      ],
    },
  ],
});

async function modifiedBackup(
  text: string,
  password: string,
  change: (payload: any) => void,
) {
  const e = JSON.parse(text);
  const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const key = await derive(password, bytes(e.salt));
  const p = JSON.parse(
    await unseal(
      key,
      { iv: bytes(e.iv), data: bytes(e.data).buffer },
      "privateai-encrypted-backup:v1",
    ),
  );
  change(p);
  const c = await seal(key, JSON.stringify(p), "privateai-encrypted-backup:v1");
  const b64 = (b: Uint8Array) =>
    btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));
  return JSON.stringify({
    ...e,
    iv: b64(c.iv),
    data: b64(new Uint8Array(c.data)),
  });
}

it("restores an encrypted backup under a different destination key without overwriting history or tombstones", async () => {
  const source = await vault(),
    destination = await vault("synthetic different destination password");
  const original = draft();
  await source.v.save(original);
  const existing = { ...draft(), title: "Existing destination" };
  await destination.v.save(existing);
  await destination.v.save(original);
  await destination.v.delete(original.id);
  const text = await source.v.exportBackup();
  for (const secret of [
    original.id,
    original.title,
    original.draft,
    "notes.txt",
    "SYNTHETIC SOURCE",
    source.account,
    source.password,
  ])
    expect(text).not.toContain(secret);
  expect(await destination.v.restoreBackup(text, source.password)).toBe(1);
  destination.v.lock(false);
  await destination.v.unlock(destination.password);
  const saved = await destination.v.list();
  expect(saved).toContainEqual(existing);
  expect(saved.find((c) => c.id !== existing.id)).toEqual({
    ...original,
    id: expect.any(String),
  });
  expect(saved.every((c) => c.id !== original.id)).toBe(true);
  await expect(destination.v.save(original)).rejects.toThrow("deleted");
  expect(await destination.v.restoreBackup(text, source.password)).toBe(1);
  expect(await destination.v.list()).toHaveLength(3);
});

it("rejects incorrect passwords, altered ciphertext, unknown versions and excessive work parameters without writes", async () => {
  const source = await vault(),
    destination = await vault();
  await source.v.save(draft());
  const text = await source.v.exportBackup();
  const e = JSON.parse(text);
  await expect(
    destination.v.restoreBackup(text, "synthetic wrong password"),
  ).rejects.toThrow();
  for (const edited of [
    { ...e, version: 2 },
    { ...e, iterations: 600000000 },
    { ...e, data: (e.data[0] === "A" ? "B" : "A") + e.data.slice(1) },
    { ...e, salt: "!".repeat(24) },
  ])
    await expect(
      destination.v.restoreBackup(JSON.stringify(edited), source.password),
    ).rejects.toThrow();
  expect(await destination.v.list()).toEqual([]);
});

it.each(["sticky", "page-from-search", "llm-context", "query", "snapshot"])(
  "rejects authenticated temporary research (%s) as a whole before storage",
  async (mode) => {
    const source = await vault(),
      destination = await vault();
    await source.v.save(draft());
    const text = await source.v.exportBackup();
    const changed = await modifiedBackup(text, source.password, (p) => {
      const c = p.conversations[0];
      if (mode === "sticky") c.temporarySearch = true;
      if (mode === "page-from-search") {
        c.temporarySearch = true;
        c.attachments[0].sources[0].evidenceKind = "page";
      }
      if (mode === "llm-context")
        c.attachments[0].sources[0].evidenceKind = "llm-context";
      if (mode === "query") c.attachments[0].researchQuery = "synthetic search";
      if (mode === "snapshot")
        c.messages = [
          {
            id: "a",
            role: "assistant",
            text: "synthetic",
            status: "complete",
            included: true,
            sourceSnapshot: [
              {
                id: "p",
                title: "Public page",
                text: "synthetic",
                retrievedAt: "2026-10-19",
                evidenceKind: "search-excerpt",
              },
            ],
          },
        ];
    });
    await expect(
      destination.v.restoreBackup(changed, source.password),
    ).rejects.toThrow("temporary research");
    expect(await destination.v.list()).toEqual([]);
  },
);

it("rejects authenticated malformed, duplicate and over-count payloads", async () => {
  const source = await vault(),
    destination = await vault();
  await source.v.save(draft());
  const text = await source.v.exportBackup();
  for (const change of [
    (p: any) => {
      p.conversations[0].messages = null;
    },
    (p: any) => {
      p.conversations.push(p.conversations[0]);
    },
    (p: any) => {
      p.conversations = Array.from({ length: 101 }, (_, i) => ({
        ...p.conversations[0],
        id: String(i),
      }));
    },
  ]) {
    await expect(
      destination.v.restoreBackup(
        await modifiedBackup(text, source.password, change),
        source.password,
      ),
    ).rejects.toThrow();
    expect(await destination.v.list()).toEqual([]);
  }
});

it("rejects oversized files before expensive key derivation", async () => {
  const derive = vi.spyOn(crypto.subtle, "deriveKey");
  await expect(
    decodeVaultBackup(" ".repeat(BACKUP_MAX_BYTES + 1), "synthetic password"),
  ).rejects.toThrow("16 MiB");
  expect(derive).not.toHaveBeenCalled();
});

it("restores after browser database loss and releases unlock connections", async () => {
  const source = await vault();
  const original = draft();
  await source.v.save(original);
  const text = await source.v.exportBackup();
  source.v.lock(false);
  await new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase(
      `privateai-vault-${source.account}`,
    );
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error);
    deletion.onblocked = () => reject(Error("A vault connection was leaked"));
  });
  await source.v.unlock("synthetic recreated vault password");
  expect(await source.v.list()).toEqual([]);
  await source.v.restoreBackup(text, source.password);
  expect((await source.v.list())[0]).toEqual({
    ...original,
    id: expect.any(String),
  });
});

it("a failed re-unlock cannot leave the previous encryption key accessible", async () => {
  const { v } = await vault();
  await expect(v.unlock("synthetic wrong password")).rejects.toThrow();
  expect(v.unlocked).toBe(false);
  await expect(v.exportBackup()).rejects.toThrow("Unlock");
  await expect(v.save(draft())).rejects.toThrow("Unlock");
});

it("keeps unreadable stored records unchanged and refuses a falsely complete backup", async () => {
  const { v, account } = await vault();
  await v.save(draft());
  const database = await openDB(`privateai-vault-${account}`, 1);
  await database.put("conversations", { corrupt: true }, "broken");
  await expect(v.exportBackup()).rejects.toThrow("Unreadable");
  expect(await database.get("conversations", "broken")).toEqual({
    corrupt: true,
  });
  database.close();
});

it("cancels export and restore on lock or account change", async () => {
  const source = await vault(),
    destination = await vault();
  await source.v.save(draft());
  const text = await source.v.exportBackup();
  const exporting = source.v.exportBackup();
  source.v.lock(false);
  await expect(exporting).rejects.toThrow();
  const restoring = destination.v.restoreBackup(text, source.password);
  destination.v.lock(false);
  destination.v.selectAccount(crypto.randomUUID());
  await expect(restoring).rejects.toThrow("vault changed");
  destination.v.selectAccount(destination.account);
  await destination.v.unlock(destination.password);
  expect(await destination.v.list()).toEqual([]);
});

it.each(["quota", "lock"])(
  "rolls back all restored copies after a mid-transaction %s failure",
  async (mode) => {
    const source = await vault(),
      destination = await vault();
    await source.v.save(draft());
    await source.v.save(draft());
    const existing = draft();
    await destination.v.save(existing);
    const text = await source.v.exportBackup();
    const original = IDBObjectStore.prototype.add;
    let additions = 0;
    vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args
    ) {
      if (this.name === "conversations" && ++additions === 2) {
        if (mode === "quota")
          throw new DOMException("Synthetic quota", "QuotaExceededError");
        destination.v.lock(false);
      }
      return original.apply(this, args);
    });
    await expect(
      destination.v.restoreBackup(text, source.password),
    ).rejects.toThrow();
    vi.restoreAllMocks();
    if (!destination.v.unlocked)
      await destination.v.unlock(destination.password);
    expect(await destination.v.list()).toEqual([existing]);
  },
);
