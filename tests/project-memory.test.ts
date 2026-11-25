// Memory per project (docs/project-memory-20261126.md): a project's memories go with questions in
// that project's chats and nowhere else; general memories go everywhere; with the switch off a
// project's memories are used nowhere; the same words may be kept in two projects; "Forget all"
// keeps what belongs to projects; a deleted project takes its memories with it; a saved list with
// project memories is still a valid list.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyConversation, type Conversation } from "../shared/contracts";
import { newMessage } from "../src/conversation";
import { addMemory, forgetAll, forgetProject, holdMemories, memoriesFor, memoriesSchema, MemoryError, type Memory } from "../src/memory";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const memory = (text: string, projectId?: string): Memory => ({ id: crypto.randomUUID(), text, at: new Date().toISOString(), ...(projectId ? { projectId } : {}) });
const LIST = [memory("I am vegetarian."), memory("The dinner report is for the board, keep it formal.", A), memory("The dinner party is for twelve guests.", B)];
const asking = (projectId?: string): Conversation => ({ ...emptyConversation(), ...(projectId ? { projectId } : {}), messages: [newMessage("user", "Suggest a vegetarian dinner for the report and the party.")] });
const texts = (c: Conversation) => memoriesFor(c).map((m) => m.text).sort();

beforeEach(() => {
  vi.stubEnv("VITE_MEMORY", "1");
  vi.stubEnv("VITE_PROJECTS", "1");
  vi.stubEnv("VITE_PROJECT_MEMORY", "1");
  holdMemories(LIST);
});
afterEach(() => {
  vi.unstubAllEnvs();
  holdMemories([]);
});

it("a project's memories are used in that project's chats and nowhere else", () => {
  expect(texts(asking(A))).toEqual([LIST[0].text, LIST[1].text].sort());
  expect(texts(asking(B))).toEqual([LIST[0].text, LIST[2].text].sort());
  // Outside any project: the general memory only.
  expect(texts(asking())).toEqual([LIST[0].text]);
});

it("with the switch off, memories that belong to a project are used nowhere", () => {
  vi.stubEnv("VITE_PROJECT_MEMORY", "");
  expect(texts(asking(A))).toEqual([LIST[0].text]);
  expect(texts(asking())).toEqual([LIST[0].text]);
});

it("a pinned project memory is not pinned into other chats", () => {
  holdMemories([{ ...LIST[1], pinned: true }, LIST[0]]);
  expect(memoriesFor(asking()).some((m) => m.projectId)).toBe(false);
  expect(memoriesFor(asking(A))[0].projectId).toBe(A);
});

it("the same words can be kept in two projects, not twice in one", () => {
  const twice = addMemory("Keep it short.", B)(addMemory("Keep it short.", A)([]));
  expect(twice.map((m) => m.projectId)).toEqual([A, B]);
  expect(() => addMemory("keep it  short.", A)(twice)).toThrow(MemoryError);
  expect(addMemory("Keep it short.")(twice)).toHaveLength(3);
});

it("Forget all keeps what belongs to projects; a deleted project takes its own", () => {
  expect(forgetAll()(LIST).map((m) => m.projectId)).toEqual([A, B]);
  expect(forgetProject(A)(LIST).map((m) => m.projectId)).toEqual([undefined, B]);
});

it("a list with project memories is a valid saved list, and a bad project id is refused", () => {
  expect(memoriesSchema.safeParse(LIST).success).toBe(true);
  expect(memoriesSchema.safeParse([{ ...LIST[0], projectId: "not-an-id" }]).success).toBe(false);
});
