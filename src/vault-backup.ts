import { textFor } from "./text/core";
import { vaultText } from "./text/vault";
import { projectFilesSchema, projectsSchema, type Project, type ProjectFiles } from "./projects";
import { memoriesSchema, type Memory } from "./memory";
import { scheduledTasksSchema } from "./scheduled";
import type { ScheduledTask } from "../shared/scheduled-tasks";
import { z } from "zod";
import { derive, seal, unseal } from "./vault-crypto";
import {
  containsTemporaryResearch,
  savedConversationSchema,
} from "./saved-conversation";
import type { Conversation } from "../shared/contracts";

export const BACKUP_MAX_BYTES = 16 * 1024 * 1024;
export const BACKUP_MAX_CONVERSATIONS = 100;
const payloadLimit = 10 * 1024 * 1024;
export const BACKUP_MAX_CONTENT_BYTES = payloadLimit;
/** Why a backup could not be made, for a plain message on the backup screen. */
export class BackupError extends Error {
  constructor(readonly code: "empty" | "unreadable" | "tooLarge" | "filesTooLarge") {
    super(code);
  }
}
const projectFilesRecord = z.record(z.string().uuid(), projectFilesSchema);
const aad = "privateai-encrypted-backup:v1";
const envelope = z
  .object({
    format: z.literal("privateai-encrypted-backup"),
    version: z.literal(1),
    kdf: z.literal("PBKDF2-SHA256"),
    iterations: z.literal(600000),
    cipher: z.literal("AES-256-GCM"),
    salt: z.string().length(24),
    iv: z.string().length(16),
    data: z.string().min(24).max(BACKUP_MAX_BYTES),
  })
  .strict();
const payload = z
  .object({
    version: z.literal(1),
    projects: projectsSchema.optional(),
    // Written only when there are memories, so a backup without them is unchanged.
    memories: memoriesSchema.optional(),
    // Scheduled tasks (src/scheduled.ts): also written only when there are some.
    scheduledTasks: scheduledTasksSchema.optional(),
    // Project files, only when the user chose to include them (older apps cannot read such a file).
    projectFiles: projectFilesRecord.optional(),
    conversations: z
      .array(savedConversationSchema)
      .max(BACKUP_MAX_CONVERSATIONS),
  })
  .strict();

function encode(bytes: Uint8Array<ArrayBuffer>): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  return btoa(chunks.join(""));
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value))
    throw Error(textFor(vaultText).invalidBackup);
  const bytes = Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0),
  );
  if (encode(bytes) !== value) throw Error(textFor(vaultText).invalidBackup);
  return bytes;
}
function validate(value: unknown): {
  conversations: Conversation[];
  projects: Project[];
  memories: Memory[];
  scheduledTasks: ScheduledTask[];
  projectFiles: ProjectFiles;
} {
  const result = payload.parse(value);
  if (
    new Set(result.conversations.map((c) => c.id)).size !==
      result.conversations.length ||
    Object.keys(result.projectFiles ?? {}).some((id) => !result.projects?.some((p) => p.id === id)) ||
    result.conversations.some(containsTemporaryResearch) ||
    result.conversations.some(
      (c) => c.projectId && !result.projects?.some((p) => p.id === c.projectId),
    )
  )
    throw Error(
      textFor(vaultText).backupContents,
    );
  // Preserve historical fields after validation, as with existing saved snapshots.
  return {
    conversations: (value as { conversations: Conversation[] }).conversations,
    projects: result.projects ?? [],
    memories: result.memories ?? [],
    scheduledTasks: result.scheduledTasks ?? [],
    projectFiles: result.projectFiles ?? {},
  };
}
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
/**
 * Splits saved chats into backup files of at most 100 chats and 10 MiB each. Every part carries
 * the projects, memories and tasks (a restore skips what is already there); project files go only
 * in the first part. Refuses when one chat, or the first part with the files, cannot fit.
 */
export function planBackupParts(
  conversations: Conversation[],
  shared: { projects: Project[]; memories: Memory[]; scheduledTasks: ScheduledTask[] },
  projectFiles: ProjectFiles = {},
  limit = payloadLimit,
): Conversation[][] {
  // Room for the JSON around the lists ({"version":1,"conversations":[...],...}).
  const base = bytes({ version: 1, conversations: [], ...shared }) + 64;
  const files = Object.keys(projectFiles).length ? bytes(projectFiles) + 20 : 0;
  if (base + files > limit) throw new BackupError(files ? "filesTooLarge" : "tooLarge");
  const parts: Conversation[][] = [[]];
  let used = base + files;
  for (const conversation of conversations) {
    const size = bytes(conversation) + 1;
    if (base + size > limit) throw new BackupError("tooLarge");
    if (parts.at(-1)!.length >= BACKUP_MAX_CONVERSATIONS || used + size > limit) {
      parts.push([]);
      used = base;
    }
    parts.at(-1)!.push(conversation);
    used += size;
  }
  return parts;
}
export async function encodeVaultBackup(
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  conversations: Conversation[],
  projects: Project[] = [],
  memories: Memory[] = [],
  scheduledTasks: ScheduledTask[] = [],
  projectFiles: ProjectFiles = {},
): Promise<string> {
  const content = {
    version: 1,
    conversations,
    projects,
    ...(memories.length ? { memories } : {}),
    ...(scheduledTasks.length ? { scheduledTasks } : {}),
    ...(Object.keys(projectFiles).length ? { projectFiles } : {}),
  };
  validate(content);
  const text = JSON.stringify(content);
  if (
    salt.length !== 16 ||
    new TextEncoder().encode(text).byteLength > payloadLimit
  )
    throw Error(textFor(vaultText).backupTooLarge);
  const encrypted = await seal(key, text, aad);
  return JSON.stringify({
    format: "privateai-encrypted-backup",
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: 600000,
    cipher: "AES-256-GCM",
    salt: encode(salt),
    iv: encode(encrypted.iv),
    data: encode(new Uint8Array(encrypted.data)),
  });
}
export async function decodeVaultBackupContent(
  text: string,
  passphrase: string,
): Promise<{
  conversations: Conversation[];
  projects: Project[];
  memories: Memory[];
  scheduledTasks: ScheduledTask[];
  projectFiles: ProjectFiles;
}> {
  if (
    text.length > BACKUP_MAX_BYTES ||
    new TextEncoder().encode(text).byteLength > BACKUP_MAX_BYTES
  )
    throw Error(textFor(vaultText).backupFileTooLarge);
  if (passphrase.length < 12) throw Error(textFor(vaultText).invalidBackupPassphrase);
  const metadata = envelope.parse(JSON.parse(text));
  const salt = decode(metadata.salt),
    iv = decode(metadata.iv),
    data = decode(metadata.data);
  if (salt.length !== 16 || iv.length !== 12 || data.length > payloadLimit + 16)
    throw Error(textFor(vaultText).invalidBackupBounds);
  const key = await derive(passphrase, salt);
  const decoded = await unseal(key, { iv, data: data.buffer }, aad);
  return validate(JSON.parse(decoded));
}

export async function decodeVaultBackup(
  text: string,
  passphrase: string,
): Promise<Conversation[]> {
  return (await decodeVaultBackupContent(text, passphrase)).conversations;
}
