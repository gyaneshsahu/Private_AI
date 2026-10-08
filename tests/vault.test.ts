import "fake-indexeddb/auto";
import { afterEach, describe, it, expect, vi } from "vitest";
import { openDB } from "idb";
import { Vault } from "../src/vault";
import { emptyConversation } from "../shared/contracts";
import { composeContext } from "../src/conversation";
const stores: Vault[] = [];
function store() {
  const v = new Vault();
  stores.push(v);
  return v;
}
afterEach(async () => {
  stores.forEach((v) => v.close());
  stores.length = 0; /* Each test uses distinct records; IndexedDB connections stay managed by idb. */
});
describe("real WebCrypto vault, synthetic inputs only", () => {
  it("keeps intact snapshots usable and preserves corrupted or invalid encrypted records unchanged", async () => {
    const v = store(),
      account = crypto.randomUUID();
    v.selectAccount(account);
    await v.unlock("synthetic partial recovery password");
    const intact = {
      ...emptyConversation(),
      draft: "SYNTHETIC retained draft",
    };
    const corrupt = emptyConversation();
    const malformed = emptyConversation();
    await v.save(intact);
    await v.save(corrupt);
    // Simulate a prior writer's structurally invalid, but authentically encrypted, payload.
    await v.save({
      ...malformed,
      messages: null,
    } as unknown as typeof malformed);
    const database = await openDB(`privateai-vault-${account}`, 1);
    const record = await database.get("conversations", corrupt.id);
    new Uint8Array(record.data.data)[0] ^= 1;
    await database.put("conversations", record, corrupt.id);
    const originalMalformed = await database.get("conversations", malformed.id);
    try {
      const result = await v.readAvailable();
      expect(result.unreadable).toBe(2);
      expect(result.conversations).toEqual([intact]);
      expect(JSON.stringify(result.conversations[0])).toBe(
        JSON.stringify(intact),
      );
      await expect(v.list()).rejects.toThrow(/could not be read/);
      await v.save({ ...intact, draft: "SYNTHETIC updated draft" });
      expect((await v.readAvailable()).conversations[0].draft).toBe(
        "SYNTHETIC updated draft",
      );
      expect(await database.get("conversations", corrupt.id)).toEqual(record);
      expect(await database.get("conversations", malformed.id)).toEqual(
        originalMalformed,
      );
    } finally {
      database.close();
    }
  });
  it.each(["save", "delete"] as const)(
    "cancels %s if locking happens while IndexedDB opens",
    async (operation) => {
      const v = store();
      v.selectAccount(crypto.randomUUID());
      const password = "synthetic storage opening password";
      await v.unlock(password);
      const original = { ...emptyConversation(), title: "Retained original" };
      await v.save(original);
      const open = indexedDB.open.bind(indexedDB);
      const intercepted = vi
        .spyOn(indexedDB, "open")
        .mockImplementation((...args) => {
          intercepted.mockRestore();
          const request = open(...args);
          request.addEventListener("success", () => v.lock(false), {
            once: true,
          });
          return request;
        });
      try {
        const pending =
          operation === "save"
            ? v.save({ ...original, title: "Must not replace" })
            : v.delete(original.id);
        await expect(pending).rejects.toThrow(/locked|cancelled/);
        await v.unlock(password);
        expect(
          (await v.list()).find((item) => item.id === original.id)?.title,
        ).toBe("Retained original");
      } finally {
        intercepted.mockRestore();
      }
    },
  );
  it("cancels queued deletion on lock/account switch without deleting either account's same-ID snapshot", async () => {
    const v = store();
    const alice = "cccccccc-cccc-4ccc-accc-cccccccccccc";
    const bob = "dddddddd-dddd-4ddd-addd-dddddddddddd";
    const password = "synthetic race vault password";
    const c = emptyConversation();
    v.selectAccount(alice);
    await v.unlock(password);
    await v.save({ ...c, title: "Alice retained" });
    v.lock(false);
    v.selectAccount(bob);
    await v.unlock(password);
    await v.save({ ...c, title: "Bob retained" });
    v.lock(false);
    v.selectAccount(alice);
    await v.unlock(password);
    const deletion = v.delete(c.id);
    v.lock(false);
    v.selectAccount(bob);
    await expect(deletion).rejects.toThrow(/cancelled/);
    await expect(v.delete(c.id)).rejects.toThrow(/Unlock/);
    await v.unlock(password);
    expect((await v.list()).find((item) => item.id === c.id)?.title).toBe(
      "Bob retained",
    );
    v.lock(false);
    v.selectAccount(alice);
    await v.unlock(password);
    expect((await v.list()).find((item) => item.id === c.id)?.title).toBe(
      "Alice retained",
    );
  });
  it("isolates saved workspaces by account even when vault passphrases match", async () => {
    const alice = store(),
      bob = store();
    alice.selectAccount("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
    bob.selectAccount("bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb");
    await alice.unlock("same synthetic vault password");
    const c = emptyConversation();
    c.title = "Alice synthetic workspace";
    await alice.save(c);
    alice.lock();
    await bob.unlock("same synthetic vault password");
    expect(await bob.list()).toEqual([]);
    bob.lock();
    await alice.unlock("same synthetic vault password");
    expect((await alice.list()).map((item) => item.id)).toContain(c.id);
  });
  it("encrypts content and per-conversation keys, rejects wrong password, reloads and deletes", async () => {
    const v = store();
    await v.unlock("correct horse battery staple");
    const c = emptyConversation();
    c.title = "SECRET TITLE 927";
    c.draft = "UNSENT DRAFT 732";
    expect(JSON.stringify(composeContext(c, 20000))).not.toContain(c.draft);
    c.messages = [
      {
        id: "m",
        role: "user",
        text: "PRIVATE MESSAGE 821",
        included: true,
        status: "complete",
      },
    ];
    await v.save(c);
    const database = await openDB("privateai-vault", 1);
    const raw = await database.get("conversations", c.id);
    expect(new TextDecoder().decode(raw.data.data)).not.toContain(
      "PRIVATE MESSAGE",
    );
    expect(JSON.stringify(raw)).not.toContain("SECRET TITLE");
    expect(new TextDecoder().decode(raw.data.data)).not.toContain(c.draft);
    v.lock(false);
    await expect(v.list()).rejects.toThrow();
    await expect(v.unlock("wrong password long enough")).rejects.toThrow();
    await v.unlock("correct horse battery staple");
    expect((await v.list()).find((x) => x.id === c.id)?.draft).toBe(c.draft);
    expect((await v.list()).find((x) => x.id === c.id)?.messages[0].text).toBe(
      "PRIVATE MESSAGE 821",
    );
    await v.delete(c.id);
    expect((await v.list()).find((x) => x.id === c.id)).toBeUndefined();
    expect(await database.get("conversations", c.id)).toBeUndefined();
    await expect(v.save(c)).rejects.toThrow(/deleted/);
    database.close();
  });
  it("locking interrupts a pending encrypted save and tampered ciphertext fails authentication", async () => {
    const v = store();
    await v.unlock("correct horse battery staple");
    const c = emptyConversation();
    const pending = v.save(c);
    v.lock(false);
    await expect(pending).rejects.toThrow();
    await v.unlock("correct horse battery staple");
    await v.save(c);
    const database = await openDB("privateai-vault", 1);
    const raw = await database.get("conversations", c.id);
    new Uint8Array(raw.data.data)[0] ^= 1;
    await database.put("conversations", raw, c.id);
    await expect(v.list()).rejects.toThrow();
    await v.delete(c.id);
    database.close();
  });
});
