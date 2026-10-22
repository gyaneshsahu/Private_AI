import "fake-indexeddb/auto";
import { afterEach, describe, it, expect, vi } from "vitest";
import { openDB } from "idb";
import { Vault } from "../src/vault";
import { emptyConversation } from "../shared/contracts";
import { composeContext, forkAt } from "../src/conversation";
const stores: Vault[] = [];
it("atomically refuses a stale cross-tab overwrite, including after a library refresh", async () => {
  const account = crypto.randomUUID(),
    first = store(),
    second = store();
  first.selectAccount(account);
  second.selectAccount(account);
  await first.unlock("synthetic concurrent history password");
  await second.unlock("synthetic concurrent history password");
  const original = await first.save({
    ...emptyConversation(),
    draft: "Original",
  });
  const stale = (await second.list())[0];
  await first.save({ ...original, draft: "First tab preserved" }, original);
  await second.readAvailable(); // Refreshing a library or exporting must not authorize a stale workspace.
  await expect(
    second.save({ ...stale, draft: "Stale overwrite" }, stale),
  ).rejects.toThrow("changed in another tab");
  expect((await first.list())[0].draft).toBe("First tab preserved");
  const copy = await second.save(
    { ...stale, id: crypto.randomUUID(), draft: "Second tab copy" },
    null,
  );
  await second.save({ ...copy, draft: "Copy updated" }, copy);
  expect((await first.list()).map((c) => c.draft).sort()).toEqual([
    "Copy updated",
    "First tab preserved",
  ]);
});
it("allows only one competing update and refuses an unobserved existing identity", async () => {
  const account = crypto.randomUUID(),
    first = store(),
    second = store();
  first.selectAccount(account);
  second.selectAccount(account);
  await first.unlock("synthetic competing history password");
  await second.unlock("synthetic competing history password");
  const original = await first.save(emptyConversation());
  await expect(
    second.save({ ...original, draft: "Blind overwrite" }, null),
  ).rejects.toThrow("changed in another tab");
  const other = (await second.list())[0];
  const results = await Promise.allSettled([
    first.save({ ...original, draft: "A" }, original),
    second.save({ ...other, draft: "B" }, other),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
});
it("saves the written answer of a live search but never its results, links or sticky flag", async () => {
  const v = store();
  v.selectAccount(crypto.randomUUID());
  await v.unlock("synthetic temporary search password");
  const c = { ...emptyConversation(), temporarySearch: true };
  c.messages.push({
    id: "answer",
    role: "assistant",
    text: "SYNTHETIC answer written from a live search",
    status: "complete",
    included: true,
    sourceSnapshot: [
      {
        id: "search-1",
        title: "SYNTHETIC result title",
        text: "SYNTHETIC excerpt",
        url: "https://example.com/synthetic-result",
        evidenceKind: "search-excerpt",
      },
    ],
  });
  c.attachments.push({
    id: "r",
    name: "Public search results",
    selected: true,
    kind: "research",
    researchQuery: "synthetic public query",
    sources: [
      {
        id: "search-1",
        title: "SYNTHETIC result title",
        text: "SYNTHETIC excerpt",
        url: "https://example.com/synthetic-result",
        evidenceKind: "search-excerpt",
      },
    ],
  });
  await v.save(c);
  const saved = (await v.readAvailable()).conversations.find(
    (x) => x.id === c.id,
  )!;
  expect(saved.temporarySearch).toBeUndefined();
  expect(saved.messages[0].text).toContain("written from a live search");
  expect(saved.messages[0].sourceSnapshot).toBeUndefined();
  expect(saved.attachments[0].sources).toEqual([]);
  expect(saved.attachments[0].researchQuery).toBe("synthetic public query");
  expect(saved.attachments[0].liveSearch?.strippedAt).toMatch(/T/);
  expect(JSON.stringify(saved)).not.toContain("SYNTHETIC excerpt");
  expect(JSON.stringify(saved)).not.toContain("example.com/synthetic-result");
  expect(JSON.stringify(saved)).not.toContain("SYNTHETIC result title");
  const fresh = emptyConversation();
  await v.save(fresh);
  expect(
    (await v.readAvailable()).conversations.some((x) => x.id === fresh.id),
  ).toBe(true);
});
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

it("strips search provenance on save even without the sticky flag, including source snapshots and branches", async () => {
  const v = store();
  v.selectAccount(crypto.randomUUID());
  await v.unlock("synthetic provenance backstop password");
  const source = {
    id: "search-1",
    title: "Synthetic",
    text: "SYNTHETIC temporary evidence",
    evidenceKind: "llm-context" as const,
  };
  const c = emptyConversation();
  c.messages.push({
    id: "u",
    role: "user",
    text: "Synthetic question",
    status: "complete",
    included: true,
  });
  c.messages.push({
    id: "a",
    role: "assistant",
    text: "Synthetic answer",
    status: "complete",
    included: true,
    sourceSnapshot: [source],
  });
  await v.save(c);
  let saved = (await v.readAvailable()).conversations.find(
    (x) => x.id === c.id,
  )!;
  expect(saved.messages[1].sourceSnapshot).toBeUndefined();
  expect(JSON.stringify(saved)).not.toContain("SYNTHETIC temporary evidence");
  c.temporarySearch = true;
  const forked = forkAt(c, "u", "Synthetic correction");
  await v.save(forked);
  saved = (await v.readAvailable()).conversations.find((x) => x.id === c.id)!;
  expect(saved.temporarySearch).toBeUndefined();
  for (const branch of [saved, ...(saved.branches?.archived ?? [])])
    expect(JSON.stringify(branch)).not.toContain(
      "SYNTHETIC temporary evidence",
    );
  const direct = emptyConversation();
  direct.attachments.push({
    id: "r",
    name: "Research",
    selected: false,
    sources: [source],
  });
  await v.save(direct);
  const savedDirect = (await v.readAvailable()).conversations.find(
    (x) => x.id === direct.id,
  )!;
  expect(savedDirect.attachments[0].sources).toEqual([]);
  expect(savedDirect.attachments[0].liveSearch).toBeUndefined();
});
