import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openDB } from "idb";
import { Vault } from "../src/vault";
import { emptyConversation } from "../shared/contracts";
import { branchConversation } from "../src/conversation-branches";
import { decodeVaultBackup } from "../src/vault-backup";
const original = "synthetic original vault secret";
const replacement = "synthetic replacement vault secret";
const vaults: Vault[] = [];
beforeEach(() => vi.stubGlobal("BroadcastChannel", undefined));
afterEach(() => {
  vi.restoreAllMocks();
  for (const v of vaults) v.close(false);
  vaults.length = 0;
  vi.unstubAllGlobals();
});
function vault(account: string) {
  const v = new Vault();
  v.selectAccount(account);
  vaults.push(v);
  return v;
}
async function records(account: string) {
  const db = await openDB(`privateai-vault-${account}`, 1);
  try {
    return {
      meta: await db.getAll("meta"),
      records: await db.getAll("conversations"),
    };
  } finally {
    db.close();
  }
}
it("changes the protection atomically while preserving branches, ciphertext and old backup keys", async () => {
  const account = crypto.randomUUID(),
    v = vault(account);
  await v.unlock(original);
  const c = emptyConversation();
  c.messages = [
    {
      id: "u",
      role: "user",
      text: "Synthetic original",
      status: "complete",
      included: true,
    },
  ];
  const branched = branchConversation(
    c,
    "Synthetic unsent draft",
    "u",
    "Synthetic correction",
  );
  await v.save(branched);
  await v.save({ ...emptyConversation(), draft: "Other saved draft" });
  const contents = await v.list(),
    before = await records(account),
    backup = await v.exportBackup();
  await v.changePassphrase(original, replacement);
  expect(v.unlocked).toBe(false);
  await expect(v.unlock(original)).rejects.toThrow();
  await v.unlock(replacement);
  expect(await v.list()).toEqual(contents);
  const after = await records(account);
  expect(after.meta).not.toEqual(before.meta);
  expect(after.records.map((r) => r.data)).toEqual(
    before.records.map((r) => r.data),
  );
  expect(after.records.map((r) => r.wrapped)).not.toEqual(
    before.records.map((r) => r.wrapped),
  );
  expect(await decodeVaultBackup(backup, original)).toEqual(contents);
  await expect(decodeVaultBackup(backup, replacement)).rejects.toThrow();
  const updatedBackup = await v.exportBackup();
  expect(await decodeVaultBackup(updatedBackup, replacement)).toEqual(contents);
  await expect(decodeVaultBackup(updatedBackup, original)).rejects.toThrow();
});
it("wrong or unchanged passphrases and damaged ciphertext preserve all stored bytes", async () => {
  const account = crypto.randomUUID(),
    v = vault(account);
  await v.unlock(original);
  const c = emptyConversation();
  await v.save(c);
  const before = await records(account);
  await expect(
    v.changePassphrase("incorrect current password", replacement),
  ).rejects.toThrow();
  await expect(v.changePassphrase(original, original)).rejects.toThrow(
    "different",
  );
  await expect(v.changePassphrase(original, "short")).rejects.toThrow("12");
  expect(await records(account)).toEqual(before);
  const db = await openDB(`privateai-vault-${account}`, 1);
  const corrupted = await db.get("conversations", c.id);
  new Uint8Array(corrupted.data.data)[0] ^= 1;
  await db.put("conversations", corrupted, c.id);
  db.close();
  const damaged = await records(account);
  await expect(v.changePassphrase(original, replacement)).rejects.toThrow();
  expect(await records(account)).toEqual(damaged);
  v.lock(false);
  await v.unlock(original);
  expect((await v.readAvailable()).unreadable).toBe(1);
});
it.each(["update", "add", "delete"])(
  "preserves a concurrent %s without partially rotating",
  async (operation) => {
    const account = crypto.randomUUID(),
      v = vault(account),
      other = vault(account);
    await v.unlock(original);
    const c = await v.save(emptyConversation());
    await other.unlock(original);
    const base = (await other.list())[0];
    const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
    const hook = vi
      .spyOn(crypto.subtle, "deriveKey")
      .mockImplementationOnce(async (...args) => {
        const key = await derive(...args);
        if (operation === "update")
          await other.save(
            { ...base, draft: "Concurrent edit retained" },
            base,
          );
        else if (operation === "add")
          await other.save({
            ...emptyConversation(),
            draft: "Concurrent addition retained",
          });
        else await other.delete(c.id);
        return key;
      });
    await expect(v.changePassphrase(original, replacement)).rejects.toThrow(
      "Saved history changed",
    );
    hook.mockRestore();
    v.lock(false);
    await v.unlock(original);
    const saved = await v.list();
    expect(saved).toHaveLength(
      operation === "delete" ? 0 : operation === "add" ? 2 : 1,
    );
    if (operation === "update")
      expect(saved[0].draft).toBe("Concurrent edit retained");
  },
);
it("rolls back every key wrap when a later write fails", async () => {
  const account = crypto.randomUUID(),
    v = vault(account);
  await v.unlock(original);
  await v.save(emptyConversation());
  await v.save(emptyConversation());
  const before = await records(account);
  const put = IDBObjectStore.prototype.put;
  let writes = 0;
  const hook = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === "conversations" && ++writes === 2)
        throw new DOMException("Synthetic storage full", "QuotaExceededError");
      return put.apply(this, args);
    });
  await expect(v.changePassphrase(original, replacement)).rejects.toThrow(
    "Synthetic storage full",
  );
  hook.mockRestore();
  expect(writes).toBe(2);
  expect(await records(account)).toEqual(before);
  v.lock(false);
  await v.unlock(original);
  expect(await v.list()).toHaveLength(2);
});
it("a stale tab cannot write with the old key even when it misses the lock broadcast", async () => {
  const account = crypto.randomUUID(),
    v = vault(account),
    stale = vault(account);
  await v.unlock(original);
  const c = await v.save(emptyConversation());
  const backup = await v.exportBackup();
  await stale.unlock(original);
  await stale.list();
  await v.changePassphrase(original, replacement);
  expect(stale.unlocked).toBe(true);
  await expect(stale.save(emptyConversation())).rejects.toThrow(
    "Vault changed",
  );
  await expect(stale.delete(c.id)).rejects.toThrow("Vault changed");
  await expect(stale.restoreBackup(backup, original)).rejects.toThrow(
    "Vault changed",
  );
  await expect(stale.list()).rejects.toThrow("Vault changed");
  await v.unlock(replacement);
  expect(await v.list()).toHaveLength(1);
});
it("locking during preparation cancels rotation and keeps the old passphrase", async () => {
  const account = crypto.randomUUID(),
    v = vault(account);
  await v.unlock(original);
  await v.save(emptyConversation());
  const before = await records(account),
    derive = crypto.subtle.deriveKey.bind(crypto.subtle);
  const hook = vi
    .spyOn(crypto.subtle, "deriveKey")
    .mockImplementationOnce(async (...args) => {
      const result = await derive(...args);
      v.lock(false);
      return result;
    });
  await expect(v.changePassphrase(original, replacement)).rejects.toThrow(
    "cancelled",
  );
  hook.mockRestore();
  expect(await records(account)).toEqual(before);
  await v.unlock(original);
  expect(await v.list()).toHaveLength(1);
});
it("can rotate an empty vault", async () => {
  const v = vault(crypto.randomUUID());
  await v.unlock(original);
  await v.changePassphrase(original, replacement);
  await v.unlock(replacement);
  expect(await v.list()).toEqual([]);
});

it("only one concurrent passphrase change wins and all records use its key", async () => {
  const account = crypto.randomUUID(),
    first = vault(account),
    second = vault(account);
  await first.unlock(original);
  await first.save(emptyConversation());
  await first.save(emptyConversation());
  await second.unlock(original);
  const alternatives = [replacement, "synthetic other replacement passphrase"];
  const results = await Promise.allSettled([
    first.changePassphrase(original, alternatives[0]),
    second.changePassphrase(original, alternatives[1]),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const winner = results.findIndex((r) => r.status === "fulfilled");
  first.lock(false);
  await first.unlock(alternatives[winner]);
  expect(await first.list()).toHaveLength(2);
  first.lock(false);
  await expect(first.unlock(alternatives[1 - winner])).rejects.toThrow();
});
