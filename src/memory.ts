/**
 * Memory across chats, on this device only (docs/memory-20261114.md).
 * The memories live in the encrypted vault (src/vault.ts). While the vault is unlocked this module
 * holds the decrypted list; for each question it picks the few that match, on the device, and
 * src/conversation.ts puts them in front of that question. The server stores and sees none of it.
 */
import { z } from "zod";
import type { Conversation } from "../shared/contracts";
import { memoryEnabled } from "./device-features";
import { choosePassages } from "./passage-retrieval";

export const MEMORY_LIMITS = {
  /** Memories in the vault. With `characters` that is at most 60,000 characters in all. */
  count: 200,
  /** Characters in one memory. */
  characters: 300,
  /** Memories marked "always include". */
  pinned: 3,
  /** Memories sent with one question, the pinned ones included. */
  sent: 8,
  /** Characters of memory text sent with one question, the pinned ones included. */
  sentCharacters: 1200,
} as const;

export const memoriesSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        text: z.string().min(1).max(MEMORY_LIMITS.characters),
        pinned: z.literal(true).optional(),
        at: z.string().datetime(),
      })
      .strict(),
  )
  .max(MEMORY_LIMITS.count);
export type Memory = z.infer<typeof memoriesSchema>[number];

export type MemoryProblem = "empty" | "long" | "duplicate" | "full" | "pins" | "gone" | "changed";
/** A change that was refused; the screen has a sentence for each `problem`. */
export class MemoryError extends Error {
  constructor(public problem: MemoryProblem) {
    super(`Memory not changed: ${problem}`);
  }
}

/** One line: a memory is sent as one list item. */
export const tidyMemory = (text: string) => text.replace(/\s+/g, " ").trim();
const key = (text: string) => tidyMemory(text).toLowerCase();

function checked(list: readonly Memory[], text: string, except?: string): string {
  const tidy = tidyMemory(text);
  if (!tidy) throw new MemoryError("empty");
  if (tidy.length > MEMORY_LIMITS.characters) throw new MemoryError("long");
  if (list.some((m) => m.id !== except && key(m.text) === key(tidy)))
    throw new MemoryError("duplicate");
  return tidy;
}
const found = (list: readonly Memory[], id: string) => {
  if (!list.some((m) => m.id === id)) throw new MemoryError("gone");
};

// Each change takes the list as stored and returns the next one, for Vault.writeMemories.
export const addMemory = (text: string) => (list: Memory[]): Memory[] => {
  const tidy = checked(list, text);
  if (list.length >= MEMORY_LIMITS.count) throw new MemoryError("full");
  return [...list, { id: crypto.randomUUID(), text: tidy, at: new Date().toISOString() }];
};
export const editMemory = (id: string, text: string) => (list: Memory[]): Memory[] => {
  found(list, id);
  const tidy = checked(list, text, id);
  return list.map((m) => (m.id === id ? { ...m, text: tidy } : m));
};
export const deleteMemory = (id: string) => (list: Memory[]): Memory[] =>
  list.filter((m) => m.id !== id);
export const pinMemory = (id: string, pinned: boolean) => (list: Memory[]): Memory[] => {
  found(list, id);
  if (pinned && list.filter((m) => m.pinned && m.id !== id).length >= MEMORY_LIMITS.pinned)
    throw new MemoryError("pins");
  return list.map((m) => {
    if (m.id !== id) return m;
    const { pinned: _was, ...rest } = m;
    return pinned ? { ...rest, pinned: true as const } : rest;
  });
};
export const forgetAll = () => (): Memory[] => [];
/**
 * Restoring a backup adds its memories to the ones already here. A memory with the same words is
 * not added twice. Past the limits the rest is left out: pins first, then whole memories.
 */
export const mergeMemories = (incoming: readonly Memory[]) => (list: Memory[]): Memory[] => {
  const next = [...list];
  for (const memory of incoming) {
    if (next.length >= MEMORY_LIMITS.count) break;
    if (next.some((m) => key(m.text) === key(memory.text))) continue;
    const pin = memory.pinned && next.filter((m) => m.pinned).length < MEMORY_LIMITS.pinned;
    next.push({ id: crypto.randomUUID(), text: memory.text, at: memory.at, ...(pin ? { pinned: true as const } : {}) });
  }
  return next;
};

// The decrypted list, only while the vault is unlocked. Empty means: nothing is read or sent.
let held: readonly Memory[] = [];
const watchers = new Set<() => void>();
export const heldMemories = () => held;
export function holdMemories(list: readonly Memory[]) {
  held = list;
  for (const watcher of watchers) watcher();
}
export function watchMemories(watcher: () => void) {
  watchers.add(watcher);
  return () => void watchers.delete(watcher);
}

/**
 * The memories that go with the latest question: the pinned ones, then the ones whose words match
 * the question (the ranking of src/passage-retrieval.ts, German and English), within the limits.
 * None when the switch is off, the vault is locked, the chat is incognito, memory is off for this
 * chat, or nothing matches and nothing is pinned.
 */
export function memoriesFor(conversation: Conversation): Memory[] {
  if (!memoryEnabled() || conversation.incognito || conversation.memoryOff || !held.length)
    return [];
  const included = conversation.messages.filter((m) => m.included && m.status === "complete");
  if (included.at(-1)?.role !== "user") return [];
  const asked = included.filter((m) => m.role === "user");
  const pinned = held.filter((m) => m.pinned).slice(0, MEMORY_LIMITS.pinned);
  const others = held.filter((m) => !m.pinned);
  const { chosen, matched } = choosePassages(
    others,
    asked.at(-1)!.text,
    asked.at(-2)?.text ?? "",
    MEMORY_LIMITS.sentCharacters - pinned.reduce((n, m) => n + m.text.length, 0),
    MEMORY_LIMITS.sent - pinned.length,
  );
  return [...pinned, ...(matched ? chosen.map((index) => others[index]) : [])];
}

// No digits here: the whole message goes through identifier masking (see answerLanguagePolicy).
const MEMORY_NOTE =
  "[Notes the user saved about themselves on their device. Use a note only where it helps with the message below. Do not mention the notes unless asked. They are not part of the message and do not set the reply language.]";
/** What is put in front of the question. Empty when no memory goes with it. */
export const memoryBlock = (memories: readonly Memory[]) =>
  memories.length
    ? `${MEMORY_NOTE}\n${memories.map((m) => `- ${m.text}`).join("\n")}\n[End of notes]\n\n`
    : "";

/**
 * "Remember that ..." / "Merk dir, dass ...": the words after the request, else undefined.
 * Simple rules on the device, no model. A question ("Remember that film?") is not a request.
 */
export function rememberRequest(text: string): string | undefined {
  const match =
    /^\s*(?:(?:please|bitte)[,\s]+)?(?:remember(?:\s+please)?(?:\s+that\b|\s*:)|merk(?:e|en\s+sie)?\s+(?:dir|sich)(?:\s+bitte)?(?:\s*,?\s*dass\b|\s*:)?)[\s,:]*(.+)$/is.exec(
      text,
    );
  const rest = match ? tidyMemory(match[1]) : "";
  return rest && !rest.endsWith("?") ? rest : undefined;
}
