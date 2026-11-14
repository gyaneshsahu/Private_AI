// Memory across chats (docs/memory-20261114.md): the store in a real test vault, the choice of
// memories for a question, the limits, and what the request carries. Offline: the vault runs on
// fake-indexeddb and the transport is a mock, so nothing here is live provider evidence.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openDB } from "idb";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { emptyConversation, type Conversation } from "../shared/contracts";
import { composeContext, measureContext, newMessage } from "../src/conversation";
import {
  addMemory,
  deleteMemory,
  editMemory,
  forgetAll,
  holdMemories,
  memoriesFor,
  memoriesSchema,
  memoryBlock,
  MEMORY_LIMITS,
  MemoryError,
  pinMemory,
  rememberRequest,
  type Memory,
} from "../src/memory";
import { choosePassages } from "../src/passage-retrieval";
import { savedConversationSchema } from "../src/saved-conversation";
import { Vault } from "../src/vault";
import { decodeVaultBackupContent } from "../src/vault-backup";
import { streamVerifiedConversation, type VerifiedChatPolicy } from "../src/verified-chat";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("tinfoil", () => ({
  fetchAttestationBundle: async () => ({ domain: "inference.tinfoil.sh" }),
  Verifier: class {
    async verifyBundle() {}
    getVerificationDocument() {
      return {
        securityVerified: true,
        releaseDigest: "a".repeat(64),
        configRepo: "tinfoilsh/confidential-model-router",
        hpkePublicKey: "synthetic",
        enclaveHost: "inference.tinfoil.sh",
      };
    }
  },
}));
vi.mock("ehbp", () => ({
  Identity: { fromPublicKeyHex: async () => ({}) },
  Transport: class {
    request = request;
  },
}));

const stores: Vault[] = [];
const create = (id = crypto.randomUUID()) => {
  const v = new Vault();
  v.selectAccount(id);
  stores.push(v);
  return v;
};
beforeEach(() => {
  vi.stubEnv("VITE_MEMORY", "1");
});
afterEach(() => {
  for (const v of stores) v.close(false);
  stores.length = 0;
  holdMemories([]);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  request.mockReset();
});

const secret = "synthetic memory vault passphrase";
const memory = (text: string, pinned = false): Memory => ({
  id: crypto.randomUUID(),
  text,
  at: "2026-11-14T10:00:00.000Z",
  ...(pinned ? { pinned: true as const } : {}),
});
const asking = (question: string, earlier?: string, extra: Partial<Conversation> = {}): Conversation => ({
  ...emptyConversation(),
  ...extra,
  messages: [
    ...(earlier ? [newMessage("user", earlier), newMessage("assistant", "Answer.")] : []),
    newMessage("user", question),
  ],
});

// Synthetic, German and English. None describes a real person.
const SET = [
  "I am vegetarian and allergic to peanuts.",
  "Ich wohne in Leipzig und fahre mit dem Fahrrad zur Arbeit.",
  "My daughter Mira starts school in August.",
  "Meine Kündigungsfrist beim Vermieter beträgt drei Monate.",
  "I work as a nurse on night shifts.",
  "Mein Hund heißt Balu und ist ein Labrador.",
  "My email is anna.example@example.org and my IBAN is DE89370400440532013000.",
  "I prefer short answers in plain language.",
  "Ich lerne Spanisch für eine Reise nach Chile.",
  "My car is a diesel Golf, first registered in Hamburg.",
].map((text) => memory(text));

it("stores memories encrypted in the vault, reads them back, and reads and writes nothing while locked", async () => {
  const id = crypto.randomUUID();
  const v = create(id);
  // Never unlocked: no vault exists yet, and nothing is created by asking.
  await expect(v.readMemories()).rejects.toThrow();
  await expect(v.writeMemories(addMemory("I am vegetarian."))).rejects.toThrow();
  await v.unlock(secret);
  // A vault from before this feature has no record: that reads as no memories.
  expect(await v.readMemories()).toEqual([]);
  const first = await v.writeMemories(addMemory("  I am vegetarian\nand allergic to peanuts.  "));
  expect(first.map((m) => m.text)).toEqual(["I am vegetarian and allergic to peanuts."]);
  const second = await v.writeMemories(addMemory("Ich wohne in Leipzig."));
  await v.writeMemories(pinMemory(second[1].id, true));
  await v.writeMemories(editMemory(first[0].id, "I am vegan."));
  const database = await openDB(`privateai-vault-${id}`, 1);
  const raw = JSON.stringify(await database.getAll("meta")) + JSON.stringify(await database.getAll("conversations"));
  database.close();
  expect(raw).not.toMatch(/vegan|vegetarian|Leipzig/);
  // Another tab or a later visit: the same passphrase reads them, a wrong one does not.
  const later = create(id);
  await expect(later.unlock("a wrong synthetic passphrase")).rejects.toThrow();
  await expect(later.readMemories()).rejects.toThrow();
  await later.unlock(secret);
  expect((await later.readMemories()).map(({ text, pinned }) => ({ text, pinned }))).toEqual([
    { text: "I am vegan.", pinned: undefined },
    { text: "Ich wohne in Leipzig.", pinned: true },
  ]);
  later.lock(false);
  await expect(later.readMemories()).rejects.toThrow();
  await expect(later.writeMemories(forgetAll())).rejects.toThrow();
  // The memories survive a change of the passphrase.
  await v.unlock(secret);
  await v.changePassphrase(secret, "a changed synthetic passphrase");
  await v.unlock("a changed synthetic passphrase");
  expect((await v.readMemories()).map((m) => m.text)).toEqual(["I am vegan.", "Ich wohne in Leipzig."]);
});

it("refuses duplicates, empty and overlong memories, a fourth pin and more than the limit", async () => {
  const v = create();
  await v.unlock(secret);
  const problem = async (change: (list: Memory[]) => Memory[]) =>
    v.writeMemories(change).then(
      () => "saved",
      (error) => (error instanceof MemoryError ? error.problem : `other: ${error}`),
    );
  expect(await problem(addMemory("I am vegetarian."))).toBe("saved");
  expect(await problem(addMemory("  i am   VEGETARIAN. "))).toBe("duplicate");
  expect(await problem(addMemory("   "))).toBe("empty");
  expect(await problem(addMemory("x".repeat(MEMORY_LIMITS.characters + 1)))).toBe("long");
  expect(await problem(addMemory("x".repeat(MEMORY_LIMITS.characters)))).toBe("saved");
  expect(await problem(editMemory(crypto.randomUUID(), "Gone"))).toBe("gone");
  for (const text of ["two", "three", "four"]) await v.writeMemories(addMemory(`Pin ${text}`));
  const list = await v.readMemories();
  for (const m of list.slice(0, MEMORY_LIMITS.pinned)) await v.writeMemories(pinMemory(m.id, true));
  expect(await problem(pinMemory(list[3].id, true))).toBe("pins");
  await v.writeMemories(pinMemory(list[0].id, false));
  expect(await problem(pinMemory(list[3].id, true))).toBe("saved");
  expect((await v.writeMemories(deleteMemory(list[3].id))).some((m) => m.id === list[3].id)).toBe(false);
  // The limit on the number of memories, checked on the pure change.
  const full = Array.from({ length: MEMORY_LIMITS.count }, (_, i) => memory(`Memory ${i}`));
  expect(() => addMemory("One more")(full)).toThrow(MemoryError);
  expect(memoriesSchema.safeParse([...full, memory("One more")]).success).toBe(false);
  // Total size in the vault is bounded by count times length.
  expect(MEMORY_LIMITS.count * MEMORY_LIMITS.characters).toBe(60000);
});

it("includes memories in the encrypted backup and adds them on restore without duplicates", async () => {
  const v = create();
  await v.unlock(secret);
  await v.save({ ...emptyConversation(), title: "Synthetic chat" });
  // A backup of a vault without memories has no memories field, as before this feature.
  expect(await decodeVaultBackupContent(await v.exportBackup(), secret)).toMatchObject({ memories: [] });
  await v.writeMemories(addMemory("I am vegetarian."));
  const [, pinned] = await v.writeMemories(addMemory("Ich wohne in Leipzig."));
  await v.writeMemories(pinMemory(pinned.id, true));
  const backup = await v.exportBackup();
  expect(backup).not.toMatch(/vegetarian|Leipzig/);
  const target = create();
  await target.unlock(secret);
  await target.writeMemories(addMemory("i am vegetarian."));
  await target.writeMemories(addMemory("My dog is called Balu."));
  expect(await target.restoreBackup(backup, secret)).toBe(1);
  const restored = await target.readMemories();
  expect(restored.map(({ text, pinned }) => ({ text, pinned }))).toEqual([
    { text: "i am vegetarian.", pinned: undefined },
    { text: "My dog is called Balu.", pinned: undefined },
    { text: "Ich wohne in Leipzig.", pinned: true },
  ]);
  expect(restored[2].id).not.toBe(pinned.id);
  // Restoring the same backup again adds no memory twice.
  await target.restoreBackup(backup, secret);
  expect(await target.readMemories()).toHaveLength(3);
});

it("forget all leaves no memory record in the vault data, and deleting the vault removes everything", async () => {
  const id = crypto.randomUUID();
  const v = create(id);
  await v.unlock(secret);
  await v.writeMemories(addMemory("I am vegetarian."));
  const keys = async () => {
    const database = await openDB(`privateai-vault-${id}`, 1);
    try {
      return (await database.getAllKeys("meta")).map(String);
    } finally {
      database.close();
    }
  };
  expect(await keys()).toContain("memories");
  expect(await v.writeMemories(forgetAll())).toEqual([]);
  expect(await keys()).not.toContain("memories");
  expect(await v.readMemories()).toEqual([]);
  expect(await decodeVaultBackupContent(await v.exportBackup(), secret)).toMatchObject({ memories: [] });
  await v.writeMemories(addMemory("Ich wohne in Leipzig."));
  await v.eraseEverything();
  await v.unlock(secret);
  expect(await v.readMemories()).toEqual([]);
});

it("chooses the right memory for German and English questions and none for unrelated ones", () => {
  holdMemories(SET);
  const cases: [string, number][] = [
    ["Suggest a vegetarian dinner without peanuts.", 0],
    ["Wie komme ich in Leipzig mit dem Fahrrad zum Bahnhof?", 1],
    ["When does school start for Mira?", 2],
    ["Wie lange ist die Frist für die Kuendigung meiner Wohnung?", 3],
    ["Which jobs suit a nurse who is tired of night shifts?", 4],
    ["Welches Futter ist gut für einen Labrador?", 5],
    ["Tipps für die Reise nach Chile, bitte.", 8],
    ["What does it cost to insure a diesel car in Hamburg?", 9],
  ];
  for (const [question, expected] of cases) {
    // The best match alone, then what is really sent: it, and nothing unrelated beside it.
    expect(choosePassages(SET, question, "", MEMORY_LIMITS.sentCharacters, 1).chosen, question).toEqual([expected]);
    expect(memoriesFor(asking(question)), question).toEqual([SET[expected]]);
  }
  for (const question of [
    "What is the boiling point of water at sea level?",
    "Erkläre mir die Photosynthese.",
    "Write a haiku about autumn rain.",
    "Wie viele Bundesländer hat Deutschland?",
  ])
    expect(memoriesFor(asking(question)), question).toEqual([]);
  // A short follow-up keeps the topic of the question before it.
  expect(memoriesFor(asking("And for breakfast?", "Suggest a vegetarian dinner."))).toEqual([SET[0]]);
});

it("keeps to the caps: at most 8 memories and 1,200 characters, pinned ones first and always", () => {
  const long = Array.from({ length: 30 }, (_, i) => memory(`Berlin note ${i}: ${"x".repeat(180)}`));
  holdMemories(long);
  const sent = memoriesFor(asking("What do you know about Berlin?"));
  expect(sent.length).toBeGreaterThan(0);
  expect(sent.reduce((n, m) => n + m.text.length, 0)).toBeLessThanOrEqual(MEMORY_LIMITS.sentCharacters);
  const short = Array.from({ length: 30 }, (_, i) => memory(`Berlin fact ${i}`));
  const pins = [memory("I prefer short answers.", true), memory("Ich heiße Anna.", true)];
  holdMemories([...short, ...pins]);
  const withPins = memoriesFor(asking("What do you know about Berlin?"));
  expect(withPins).toHaveLength(MEMORY_LIMITS.sent);
  expect(withPins.slice(0, 2)).toEqual(pins);
  // Pinned memories go with an unrelated question too; nothing else does.
  expect(memoriesFor(asking("Write a haiku about autumn rain."))).toEqual(pins);
});

it("puts the block in front of the latest question only, counts it, and refuses when it does not fit", () => {
  holdMemories(SET);
  const c = asking("Suggest a vegetarian dinner without peanuts.", "Hello there.");
  const block = memoryBlock([SET[0]]);
  expect(block).toContain("- I am vegetarian and allergic to peanuts.");
  expect(block).toMatch(/Do not mention the notes unless asked/);
  // No digits in the fixed wording: masking would otherwise treat them as identifiers.
  expect(memoryBlock([])).toBe("");
  expect(block.replace(SET[0].text, "")).not.toMatch(/\d/);
  const messages = composeContext(c, 100000);
  expect(messages.at(-1)).toEqual({ role: "user", content: block + c.messages[2].text });
  expect(messages.slice(0, -1).some((m) => m.content.includes("vegetarian and allergic"))).toBe(false);
  // The system message is the same with and without memory.
  holdMemories([]);
  const plain = composeContext(c, 100000);
  expect(plain[0]).toEqual(messages[0]);
  const size = plain.reduce((n, m) => n + m.content.length, 0);
  holdMemories(SET);
  expect(() => composeContext(c, size + block.length - 1)).toThrow();
  expect(composeContext(c, size + block.length)).toHaveLength(plain.length);
  // The context review counts the block for a draft, and the parts still add up.
  const base = { ...c, messages: c.messages.slice(0, 2) };
  const measured = measureContext(base, "Suggest a vegetarian dinner without peanuts.");
  expect(measured.breakdown.memory).toBe(block.length);
  expect(Object.values(measured.breakdown).reduce((a, b) => a + b, 0)).toBe(measured.characters);
  expect(measureContext(base, "Write a haiku about autumn rain.").breakdown.memory).toBe(0);
  // Evaluation variants never get memory.
  expect(JSON.stringify(composeContext(c, 100000, new Date(), "constraints-v4"))).not.toContain("vegetarian and allergic");
});

it("sends no memory in an incognito chat, with memory off for the chat, with the switch off or with a locked vault", () => {
  holdMemories([...SET, memory("Always there.", true)]);
  const question = "Suggest a vegetarian dinner without peanuts.";
  expect(memoriesFor(asking(question))).toHaveLength(2);
  for (const extra of [{ incognito: true }, { memoryOff: true as const }]) {
    expect(memoriesFor(asking(question, undefined, extra))).toEqual([]);
    expect(JSON.stringify(composeContext(asking(question, undefined, extra), 100000))).not.toMatch(/Always there|allergic/);
    expect(measureContext(asking("Hi", undefined, extra), question).breakdown.memory).toBe(0);
  }
  vi.stubEnv("VITE_MEMORY", "");
  expect(memoriesFor(asking(question))).toEqual([]);
  vi.stubEnv("VITE_MEMORY", "1");
  // Locked vault: the app holds no memories (src/MemoryPanel.tsx drops them on lock).
  holdMemories([]);
  expect(memoriesFor(asking(question))).toEqual([]);
  // The per-chat switch and the per-answer note are saved with the chat; the note holds ids only.
  const saved = { ...asking(question, undefined, { memoryOff: true }), createdAt: new Date().toISOString() };
  saved.messages.push({ ...newMessage("assistant", "Answer."), memoriesUsed: [SET[0].id] });
  expect(savedConversationSchema.safeParse(saved).success).toBe(true);
  expect(JSON.stringify(saved)).not.toContain("allergic");
});

const policy: VerifiedChatPolicy = {
  origin: "https://inference.tinfoil.sh",
  repository: "tinfoilsh/confidential-model-router",
  releaseDigests: ["a".repeat(64)],
  model: "synthetic",
  maxInputCharacters: 20000,
  maxOutputTokens: 4096,
  pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
};
const reply = () => {
  const chunk = (content: string, finish: "stop" | null = null): ChatCompletionChunk => ({
    id: "fixture",
    object: "chat.completion.chunk",
    created: 0,
    model: "fixture-only",
    choices: [{ index: 0, delta: { content }, finish_reason: finish }],
  });
  const items = [
    chunk("Fine. "),
    chunk("Done.", "stop"),
    { ...chunk(""), choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } },
  ];
  return new Response(items.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("") + "data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream" },
  });
};
async function sentBody(conversation: Conversation) {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  request.mockReset();
  request.mockResolvedValueOnce(reply());
  const kept: unknown[] = [];
  await streamVerifiedConversation(
    conversation, policy, "synthetic-csrf", new AbortController().signal,
    () => {}, () => {}, () => {},
    undefined, undefined, undefined, undefined, undefined, undefined,
    (summary) => kept.push(summary),
  );
  expect(request).toHaveBeenCalledTimes(1);
  const [url, init] = request.mock.calls[0];
  return { url: String(url), body: JSON.parse(init.body) as { messages: { role: string; content: string }[] }, kept };
}

it("through the app's own request path: the block is in the request only when the switch is on, and identifiers in a memory are masked", async () => {
  holdMemories(SET);
  const c = asking("What is my email address and my IBAN?");
  expect(memoriesFor(c)).toEqual([SET[6]]);
  const on = await sentBody(c);
  const last = on.body.messages.at(-1)!;
  expect(last.role).toBe("user");
  expect(last.content).toContain("[Notes the user saved about themselves on their device.");
  expect(last.content).toContain("- My email is ");
  expect(last.content.endsWith("What is my email address and my IBAN?")).toBe(true);
  // Masked like any other text: neither identifier leaves the device.
  expect(JSON.stringify(on.body)).not.toMatch(/anna\.example@example\.org|DE89370400440532013000/);
  expect(on.kept).toEqual([expect.objectContaining({ EMAIL: 1, IBAN: 1 })]);
  // The only request is the one encrypted request to the model.
  expect(on.url).toBe("http://localhost/api/inference/v1/chat/completions");
  vi.stubEnv("VITE_MEMORY", "");
  const off = await sentBody(c);
  expect(JSON.stringify(off.body)).not.toMatch(/Notes the user saved|My email is/);
  expect(off.body.messages.at(-1)!.content).toBe("What is my email address and my IBAN?");
  vi.stubEnv("VITE_MEMORY", "1");
  for (const extra of [{ incognito: true }, { memoryOff: true as const }]) {
    const none = await sentBody(asking("What is my email address and my IBAN?", undefined, extra));
    expect(JSON.stringify(none.body)).not.toMatch(/Notes the user saved|My email is/);
  }
});

it("recognises a request to remember in English and German, and not a question or an ordinary message", () => {
  for (const [text, words] of [
    ["Remember that I am vegetarian.", "I am vegetarian."],
    ["please remember that my sister is called Lea", "my sister is called Lea"],
    ["Remember: no peanuts", "no peanuts"],
    ["Merk dir, dass ich Vegetarier bin.", "ich Vegetarier bin."],
    ["Merke dir bitte: Ich wohne in Leipzig", "Ich wohne in Leipzig"],
    ["Bitte merk dir, dass mein Hund Balu heißt", "mein Hund Balu heißt"],
    ["Merken Sie sich, dass ich nachts arbeite.", "ich nachts arbeite."],
    ["Merk dir  Ich mag\nkurze Antworten", "Ich mag kurze Antworten"],
  ])
    expect(rememberRequest(text), text).toBe(words);
  for (const text of [
    "Remember that film we talked about?",
    "Do you remember that I am vegetarian",
    "I can't remember: what is the capital of Chile",
    "Remember the Alamo",
    "Was soll ich mir merken?",
    "Merk dir",
    "",
  ])
    expect(rememberRequest(text), text).toBeUndefined();
});
