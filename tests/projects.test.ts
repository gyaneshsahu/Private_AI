// Projects with instructions and files (docs/projects-20261114.md): the store in a real test vault,
// what goes with a question, the limits and what the request carries. Offline: the vault runs on
// fake-indexeddb and the transport is a mock, so nothing here is live provider evidence.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openDB } from "idb";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { emptyConversation, type Attachment, type Conversation } from "../shared/contracts";
import { composeContext, measureContext, newMessage, passageNotes, selectedSources } from "../src/conversation";
import { holdMemories, memoryBlock, type Memory } from "../src/memory";
import { PASSAGE_BUDGET, splitPassages } from "../src/passage-retrieval";
import {
  addProjectFile,
  charactersOf,
  projectFilesSchema,
  removeProjectFile,
  type ProjectFile,
  holdProjects,
  PROJECT_LIMITS,
  ProjectError,
  projectInstructionsBlock,
  projectsSchema,
  setInstructions,
  type Project,
} from "../src/projects";
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
  vi.stubEnv("VITE_PROJECTS", "1");
});
afterEach(() => {
  for (const v of stores) v.close(false);
  stores.length = 0;
  holdProjects({ projects: [], files: {} });
  holdMemories([]);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  request.mockReset();
});

const secret = "synthetic project vault passphrase";
const INSTRUCTIONS = "Antworte immer auf Deutsch. Ich bereite einen Mietstreit mit meinem Vermieter vor.";
const project: Project = { id: crypto.randomUUID(), name: "Mietstreit", instructions: INSTRUCTIONS };
const asking = (question: string, extra: Partial<Conversation> = {}): Conversation => ({
  ...emptyConversation(),
  projectId: project.id,
  ...extra,
  messages: [newMessage("user", "Hello."), newMessage("assistant", "Hi."), newMessage("user", question)],
});
const problem = (run: () => unknown) => {
  try {
    run();
    return "ok";
  } catch (error) {
    return error instanceof ProjectError ? error.problem : `other: ${error}`;
  }
};

it("reads old project records, stores instructions encrypted, keeps them through a passphrase change", async () => {
  const id = crypto.randomUUID();
  const v = create(id);
  await expect(v.changeProjects((p) => p)).rejects.toThrow();
  await v.unlock(secret);
  // createProject writes the old format: id and name only. It still reads.
  const [created] = await v.createProject("Steuer 2026");
  expect(created).toEqual({ id: created.id, name: "Steuer 2026" });
  expect(await v.readProjects()).toEqual([created]);
  await v.changeProjects(setInstructions(created.id, `  ${INSTRUCTIONS}\n`));
  expect(await v.readProjects()).toEqual([{ ...created, instructions: INSTRUCTIONS }]);
  const database = await openDB(`privateai-vault-${id}`, 1);
  const raw = JSON.stringify(await database.getAll("meta"));
  database.close();
  expect(raw).not.toMatch(/Mietstreit|Deutsch|Steuer/);
  // Rename keeps the instructions; a later tab reads both.
  await v.editProject(created.id, "Steuer 2027");
  const later = create(id);
  await later.unlock(secret);
  expect(await later.readProjects()).toEqual([{ id: created.id, name: "Steuer 2027", instructions: INSTRUCTIONS }]);
  later.lock(false);
  await v.changePassphrase(secret, "a changed synthetic passphrase");
  await v.unlock("a changed synthetic passphrase");
  expect((await v.readProjects())[0].instructions).toBe(INSTRUCTIONS);
  // Empty text removes the field again; the record is the old shape.
  await v.changeProjects(setInstructions(created.id, "   "));
  expect(await v.readProjects()).toEqual([{ id: created.id, name: "Steuer 2027" }]);
});

it("refuses overlong instructions and a project that is gone; the schema holds the cap", () => {
  const list = [{ id: project.id, name: "P" }];
  expect(problem(() => setInstructions(project.id, "x".repeat(PROJECT_LIMITS.instructions))(list))).toBe("ok");
  expect(problem(() => setInstructions(project.id, "x".repeat(PROJECT_LIMITS.instructions + 1))(list))).toBe("long");
  expect(problem(() => setInstructions(crypto.randomUUID(), "x")(list))).toBe("gone");
  expect(projectsSchema.safeParse([{ ...list[0], instructions: "x".repeat(2001) }]).success).toBe(false);
  expect(projectsSchema.safeParse([{ ...list[0], instructions: "" }]).success).toBe(false);
  expect(PROJECT_LIMITS.instructions).toBe(2000);
});

it("carries instructions in the backup and restores them; delete project and delete everything remove them", async () => {
  const v = create();
  await v.unlock(secret);
  const [p] = await v.createProject("Mietstreit");
  await v.changeProjects(setInstructions(p.id, INSTRUCTIONS));
  await v.save({ ...emptyConversation(), title: "Synthetic chat", projectId: p.id });
  const backup = await v.exportBackup();
  expect(backup).not.toMatch(/Mietstreit|Deutsch/);
  expect((await decodeVaultBackupContent(backup, secret)).projects).toEqual([
    { id: p.id, name: "Mietstreit", instructions: INSTRUCTIONS },
  ]);
  const target = create();
  await target.unlock(secret);
  expect(await target.restoreBackup(backup, secret)).toBe(1);
  const [restored] = await target.readProjects();
  expect(restored.instructions).toBe(INSTRUCTIONS);
  expect((await target.list())[0].projectId).toBe(restored.id);
  // Deleting the project keeps its chat as an ordinary chat and drops the instructions.
  await target.editProject(restored.id);
  expect(await target.readProjects()).toEqual([]);
  expect((await target.list())[0].projectId).toBeUndefined();
  await v.eraseEverything();
  await v.unlock(secret);
  expect(await v.readProjects()).toEqual([]);
});

it("puts the instructions in front of the latest question, before the memory notes, and counts them", () => {
  holdProjects({ projects: [project] });
  const c = asking("Wie lange ist meine Kündigungsfrist?");
  const block = projectInstructionsBlock(c);
  expect(block).toContain(`\n${INSTRUCTIONS}\n[End of project instructions]`);
  // No digits in the fixed wording: masking would otherwise treat them as identifiers.
  expect(block.replace(INSTRUCTIONS, "")).not.toMatch(/\d/);
  const messages = composeContext(c, 100000);
  expect(messages.at(-1)).toEqual({ role: "user", content: block + "Wie lange ist meine Kündigungsfrist?" });
  expect(messages.slice(0, -1).some((m) => m.content.includes(INSTRUCTIONS))).toBe(false);
  // The system message is byte for byte the same with and without a project.
  holdProjects({ projects: [] });
  const plain = composeContext(c, 100000);
  expect(plain[0]).toEqual(messages[0]);
  const size = plain.reduce((n, m) => n + m.content.length, 0);
  holdProjects({ projects: [project] });
  expect(() => composeContext(c, size + block.length - 1)).toThrow();
  expect(composeContext(c, size + block.length)).toHaveLength(plain.length);
  // Memory notes come after the instructions, both before the question.
  const memory: Memory = { id: crypto.randomUUID(), text: "Meine Kündigungsfrist beträgt drei Monate.", at: "2026-11-14T10:00:00.000Z" };
  vi.stubEnv("VITE_MEMORY", "1");
  holdMemories([memory]);
  expect(composeContext(c, 100000).at(-1)!.content).toBe(
    block + memoryBlock([memory]) + "Wie lange ist meine Kündigungsfrist?",
  );
  // The review counts both, and the parts still add up.
  const base = { ...c, messages: c.messages.slice(0, 2) };
  const measured = measureContext(base, "Wie lange ist meine Kündigungsfrist?");
  expect(measured.breakdown.project).toBe(block.length);
  expect(measured.breakdown.memory).toBe(memoryBlock([memory]).length);
  expect(Object.values(measured.breakdown).reduce((a, b) => a + b, 0)).toBe(measured.characters);
  // Evaluation variants never get project instructions.
  expect(JSON.stringify(composeContext(c, 100000, new Date(), "constraints-v4"))).not.toContain(INSTRUCTIONS);
});

it("sends nothing for an incognito chat, a chat moved out, another project, with the switch off or locked", () => {
  holdProjects({ projects: [project, { id: crypto.randomUUID(), name: "Other" }] });
  const question = "Wie lange ist meine Kündigungsfrist?";
  expect(projectInstructionsBlock(asking(question))).not.toBe("");
  for (const extra of [{ incognito: true }, { projectId: undefined }, { projectId: crypto.randomUUID() }]) {
    expect(projectInstructionsBlock(asking(question, extra))).toBe("");
    expect(JSON.stringify(composeContext(asking(question, extra), 100000))).not.toContain(INSTRUCTIONS);
    expect(measureContext(asking(question, extra)).breakdown.project).toBe(0);
  }
  vi.stubEnv("VITE_PROJECTS", "");
  expect(projectInstructionsBlock(asking(question))).toBe("");
  vi.stubEnv("VITE_PROJECTS", "1");
  holdProjects({ projects: [] });
  expect(projectInstructionsBlock(asking(question))).toBe("");
  // The note under the answer is saved with the chat as a flag only.
  const saved = { ...asking(question), createdAt: new Date().toISOString() };
  saved.messages.push({ ...newMessage("assistant", "Answer."), projectInstructionsSent: true });
  expect(savedConversationSchema.safeParse(saved).success).toBe(true);
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
async function sentBody(conversation: Conversation, limit = policy.maxInputCharacters) {
  vi.stubGlobal("location", { host: "localhost", origin: "http://localhost" });
  request.mockReset();
  request.mockResolvedValueOnce(reply());
  const kept: unknown[] = [];
  await streamVerifiedConversation(
    conversation, { ...policy, maxInputCharacters: limit }, "synthetic-csrf", new AbortController().signal,
    () => {}, () => {}, () => {},
    undefined, undefined, undefined, undefined, undefined, undefined,
    (summary) => kept.push(summary),
  );
  expect(request).toHaveBeenCalledTimes(1);
  const [url, init] = request.mock.calls[0];
  return { url: String(url), body: JSON.parse(init.body) as { messages: { role: string; content: string }[] }, kept };
}

it("through the app's request path: instructions only with the switch on, masked, beside memory and a document", async () => {
  const masked = {
    ...project,
    instructions: "Schreibe Briefe mit meiner Adresse anna.example@example.org und IBAN DE89370400440532013000.",
  };
  holdProjects({ projects: [masked] });
  const c = asking("Schreibe einen kurzen Brief an den Vermieter wegen der Kündigungsfrist.");
  const on = await sentBody(c);
  const last = on.body.messages.at(-1)!;
  expect(last.content).toContain("[Instructions the user wrote for every chat in this project.");
  expect(last.content.endsWith("Schreibe einen kurzen Brief an den Vermieter wegen der Kündigungsfrist.")).toBe(true);
  expect(JSON.stringify(on.body)).not.toMatch(/anna\.example@example\.org|DE89370400440532013000/);
  expect(on.kept).toEqual([expect.objectContaining({ EMAIL: 1, IBAN: 1 })]);
  expect(on.url).toBe("http://localhost/api/inference/v1/chat/completions");
  vi.stubEnv("VITE_PROJECTS", "");
  const off = await sentBody(c);
  expect(JSON.stringify(off.body)).not.toMatch(/Instructions the user wrote|Schreibe Briefe/);
  vi.stubEnv("VITE_PROJECTS", "1");
  for (const extra of [{ incognito: true }, { projectId: undefined }]) {
    const none = await sentBody(asking("Schreibe einen Brief.", extra));
    expect(JSON.stringify(none.body)).not.toMatch(/Instructions the user wrote|Schreibe Briefe/);
  }
  // Memory, project instructions and an attached document together, within the input limit.
  vi.stubEnv("VITE_MEMORY", "1");
  holdProjects({ projects: [project] });
  holdMemories([{ id: crypto.randomUUID(), text: "Mein Vermieter heißt Herr Beispiel.", at: "2026-11-14T10:00:00.000Z" }]);
  const withAll = asking("Schreibe einen Brief an meinen Vermieter wegen der Kündigungsfrist.", {
    attachments: [
      {
        id: crypto.randomUUID(),
        name: "mietvertrag.txt",
        selected: true,
        sources: [{ id: "s1", title: "mietvertrag.txt", text: "Die Kündigungsfrist beträgt drei Monate zum Monatsende." }],
      },
    ],
  });
  const size = measureContext(withAll).characters;
  const all = await sentBody(withAll, size);
  const text = JSON.stringify(all.body);
  expect(text).toContain(INSTRUCTIONS);
  expect(text).toContain("Herr Beispiel");
  expect(text).toContain("drei Monate zum Monatsende");
  const final = all.body.messages.at(-1)!.content;
  expect(final.indexOf(INSTRUCTIONS)).toBeLessThan(final.indexOf("Herr Beispiel"));
  // One character less and nothing is sent.
  request.mockReset();
  await expect(sentBody(withAll, size - 1)).rejects.toThrow();
});

// ---- Project files ----
const doc = (name: string, pages: string[], kind: Attachment["kind"] = "document"): Attachment => ({
  id: crypto.randomUUID(),
  name,
  selected: true,
  kind,
  sources: pages.map((text, index) => ({ id: crypto.randomUUID().slice(0, 8), title: name, text, page: index + 1 })),
});
const filler = (topic: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${topic} Absatz ${i}. Allgemeiner Text ohne besonderen Inhalt, nur zum Auffüllen der Seite.`).join("\n\n");
// Synthetic, German and English. None describes a real person or a real contract.
const LEASE = doc("mietvertrag.pdf", [
  filler("Präambel", 6),
  "§ 5 Kündigung. Die Kündigungsfrist für den Mieter beträgt drei Monate zum Monatsende.",
  "§ 7 Kaution. Die Mietsicherheit beträgt zwei Nettokaltmieten und wird auf einem Sparbuch angelegt.",
]);
const POLICY = doc("insurance-policy.docx", [
  filler("Introduction", 6),
  "Section 4 Water damage. Burst pipes are covered up to EUR 20,000 per claim, excluding gradual seepage.",
  "Section 9 Bicycle theft. Bicycles are covered only when locked to a fixed object.",
]);
const TAX = doc("steuer-notizen.txt", ["Werbungskosten: Arbeitszimmer, Fahrtkosten mit der Entfernungspauschale."]);
const filesFor = (...docs: Attachment[]) =>
  docs.reduce<ProjectFile[]>((list, d) => addProjectFile(d, 0)(list), []);

it("stores project files encrypted, keeps them through a passphrase change, removes them with the project", async () => {
  const id = crypto.randomUUID();
  const v = create(id);
  await v.unlock(secret);
  const [p] = await v.createProject("Mietstreit");
  // A vault from before this feature has no files record.
  expect(await v.readProjectFiles()).toEqual({});
  await expect(v.changeProjectFiles(() => ({ [crypto.randomUUID()]: filesFor(TAX) }))).rejects.toThrow(ProjectError);
  await v.changeProjectFiles((all) => ({ ...all, [p.id]: addProjectFile(LEASE, 0)(all[p.id] ?? []) }));
  await v.changeProjectFiles((all) => ({ ...all, [p.id]: addProjectFile(TAX, 0)(all[p.id] ?? []) }));
  const database = await openDB(`privateai-vault-${id}`, 1);
  const raw = JSON.stringify(await database.getAll("meta"));
  database.close();
  expect(raw).not.toMatch(/Kündigungsfrist|Werbungskosten|mietvertrag/);
  const later = create(id);
  await later.unlock(secret);
  const files = (await later.readProjectFiles())[p.id];
  expect(files.map((f) => f.name)).toEqual(["mietvertrag.pdf", "steuer-notizen.txt"]);
  expect(files[0].sources.find((s) => s.text.startsWith("§ 5"))?.page).toBe(2);
  later.lock(false);
  await v.changePassphrase(secret, "a changed synthetic passphrase");
  await v.unlock("a changed synthetic passphrase");
  expect((await v.readProjectFiles())[p.id]).toHaveLength(2);
  // Removing a file; removing the last leaves no record.
  await v.changeProjectFiles((all) => ({ ...all, [p.id]: removeProjectFile(files[1].id)(all[p.id]) }));
  expect((await v.readProjectFiles())[p.id].map((f) => f.name)).toEqual(["mietvertrag.pdf"]);
  // The backup holds the project and its instructions, not its files.
  await v.save({ ...emptyConversation(), title: "Synthetic chat", projectId: p.id });
  const backup = await decodeVaultBackupContent(await v.exportBackup(), "a changed synthetic passphrase");
  expect(JSON.stringify(backup)).not.toContain("Kündigungsfrist");
  // Deleting the project deletes its files in the same step.
  await v.editProject(p.id);
  expect(await v.readProjectFiles()).toEqual({});
  const keys = await openDB(`privateai-vault-${id}`, 1).then(async (d) => {
    const all = (await d.getAllKeys("meta")).map(String);
    d.close();
    return all;
  });
  expect(keys).not.toContain("project-files");
  const [q] = await v.createProject("Again");
  await v.changeProjectFiles(() => ({ [q.id]: filesFor(TAX) }));
  await v.eraseEverything();
  await v.unlock(secret);
  expect(await v.readProjectFiles()).toEqual({});
});

it("keeps to the file limits: 20 files, 1,500,000 characters per project, 3,000,000 over all, no duplicates, no pictures", () => {
  expect(problem(() => addProjectFile(doc("photo.png", ["text"], "screenshot"), 0)([]))).toBe("image");
  const one = filesFor(TAX);
  expect(problem(() => addProjectFile({ ...TAX, id: crypto.randomUUID() }, 0)(one))).toBe("duplicate");
  const many = Array.from({ length: PROJECT_LIMITS.files }, (_, i) => doc(`f${i}.txt`, ["x"])).reduce<ProjectFile[]>(
    (list, d) => addProjectFile(d, 0)(list),
    [],
  );
  expect(problem(() => addProjectFile(doc("one-more.txt", ["x"]), 0)(many))).toBe("files");
  // 500,000 characters is the largest single document; three fill a project.
  const big = (name: string) => doc(name, [("Wort ".repeat(199) + "Ende.\n\n").repeat(500).slice(0, 500_000)]);
  expect(big("a").sources[0].text.length).toBe(500_000);
  const full = ["a.txt", "b.txt", "c.txt"].reduce<ProjectFile[]>((list, n) => addProjectFile(big(n), 0)(list), []);
  expect(charactersOf(full)).toBeLessThanOrEqual(PROJECT_LIMITS.characters);
  expect(problem(() => addProjectFile(doc("d.txt", ["x".repeat(20_000)]), 0)(full))).toBe("characters");
  expect(problem(() => addProjectFile(big("e.txt"), 2_600_000)([]))).toBe("vault");
  expect(projectFilesSchema.safeParse(full).success).toBe(true);
  // Every passage fits the passage size, and ids are unique in the project (they are what answers cite).
  const ids = full.flatMap((f) => f.sources.map((s) => s.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(Math.max(...full.flatMap((f) => f.sources.map((s) => s.text.length)))).toBeLessThanOrEqual(1200);
});

it("chooses passages across the project's files for German and English questions, inside the shared budget", () => {
  const files = filesFor(LEASE, POLICY, TAX);
  holdProjects({ projects: [project], files: { [project.id]: files } });
  const sent = (c: Conversation) => selectedSources(c).map((s) => s.text);
  const cases: [string, string][] = [
    ["Wie lange ist die Kündigungsfrist?", "§ 5 Kündigung"],
    ["Wie hoch ist die Kaution?", "§ 7 Kaution"],
    ["Is water damage from a burst pipe covered?", "Section 4 Water damage"],
    ["Is my bicycle covered against theft?", "Section 9 Bicycle theft"],
    ["Kann ich das Arbeitszimmer als Werbungskosten absetzen?", "Werbungskosten"],
  ];
  for (const [question, expected] of cases) {
    const texts = sent(asking(question));
    expect(texts.some((t) => t.startsWith(expected)), question).toBe(true);
    expect(texts.join("").length, question).toBeLessThanOrEqual(PASSAGE_BUDGET);
  }
  // The note says which file and page was used, and names no file that was not used.
  const notes = passageNotes(asking("Wie lange ist die Kündigungsfrist?"), true, "de");
  expect(notes.join(" ")).toContain("mietvertrag.pdf");
  expect(notes.join(" ")).toMatch(/Seite 2\b/);
  expect(notes.join(" ")).not.toContain("insurance-policy.docx");
  // Nothing matches: no project passage is sent (an attached document would send its start).
  expect(sent(asking("Xylophon Quokka Zebrastreifen"))).toEqual([]);
  // A large document attached to the chat shares the same budget with the project files.
  const own = { ...doc("eigene-notizen.txt", [filler("Kündigung Notiz", 200)]), large: true };
  own.sources = own.sources.flatMap((s) => splitPassages(s.text).map((text, i) => ({ ...s, id: `own${i}`, text })));
  const both = asking("Wie lange ist die Kündigungsfrist?", { attachments: [own] });
  const texts = sent(both);
  expect(texts.join("").length).toBeLessThanOrEqual(PASSAGE_BUDGET);
  expect(texts.some((t) => t.startsWith("§ 5 Kündigung"))).toBe(true);
  // The chat itself is not changed: project files are added for choosing and sending only.
  expect(both.attachments).toEqual([own]);
  // Removed file, moved-out chat, incognito, switch off: none of its text goes.
  holdProjects({ files: { [project.id]: removeProjectFile(files[0].id)(files) } });
  expect(sent(asking("Wie lange ist die Kündigungsfrist?")).join("")).not.toContain("§ 5");
  holdProjects({ files: { [project.id]: files } });
  for (const extra of [{ incognito: true }, { projectId: undefined }])
    expect(sent(asking("Wie lange ist die Kündigungsfrist?", extra))).toEqual([]);
  vi.stubEnv("VITE_PROJECTS", "");
  expect(sent(asking("Wie lange ist die Kündigungsfrist?"))).toEqual([]);
});

it("sends project passages in the request only with the switch on, and counts them in the review", async () => {
  holdProjects({ projects: [project], files: { [project.id]: filesFor(LEASE, POLICY) } });
  const c = asking("Wie lange ist die Kündigungsfrist?");
  const on = JSON.stringify((await sentBody(c)).body);
  expect(on).toContain("Die Kündigungsfrist für den Mieter beträgt drei Monate");
  expect(on).not.toContain("Burst pipes");
  expect(measureContext(c).breakdown.references).toBeGreaterThan(0);
  vi.stubEnv("VITE_PROJECTS", "");
  const off = JSON.stringify((await sentBody(c)).body);
  expect(off).not.toContain("Kündigungsfrist für den Mieter");
  expect(measureContext(c).breakdown.references).toBe(0);
});

it("measures storage and time for a full project (Node, fake storage; a phone is slower)", async () => {
  const big = (name: string) => doc(name, [filler(`Vertrag ${name}`, 5000).slice(0, 500_000)]);
  const files = ["a.txt", "b.txt", "c.txt"].reduce<ProjectFile[]>((list, n) => addProjectFile(big(n), 0)(list), []);
  const v = create();
  await v.unlock(secret);
  const [p] = await v.createProject("Full");
  const json = JSON.stringify({ [p.id]: files });
  let started = performance.now();
  await v.changeProjectFiles(() => ({ [p.id]: files }));
  const write = performance.now() - started;
  started = performance.now();
  await v.readProjectFiles();
  const read = performance.now() - started;
  holdProjects({ projects: [project], files: { [project.id]: files } });
  started = performance.now();
  selectedSources(asking("Wie lange ist die Kündigungsfrist im Vertrag a?"));
  const choose = performance.now() - started;
  started = performance.now();
  selectedSources(asking("Und was gilt für Vertrag b?"));
  const again = performance.now() - started;
  console.log(
    `full project: ${charactersOf(files)} characters, record ${(json.length / 1e6).toFixed(2)} MB of JSON, ` +
      `write ${write.toFixed(0)} ms, read ${read.toFixed(0)} ms, first choice ${choose.toFixed(0)} ms, next ${again.toFixed(0)} ms`,
  );
  expect(json.length).toBeLessThan(2_000_000);
});