import "fake-indexeddb/auto";
import { afterEach, describe, it, expect } from "vitest";
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
  it("isolates saved workspaces by account even when vault passphrases match", async () => {
    const alice = store(),
      bob = store();
    alice.selectAccount("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
    bob.selectAccount("bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb");
    await alice.unlock("same synthetic vault password");
    const c = emptyConversation();
    c.title = "Alice synthetic workspace";
    await alice.save(c);
    alice.lock(false);
    await bob.unlock("same synthetic vault password");
    expect(await bob.list()).toEqual([]);
    bob.lock(false);
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
