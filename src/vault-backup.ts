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
    conversations: z
      .array(savedConversationSchema)
      .min(1)
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
    throw Error("Invalid encrypted backup.");
  const bytes = Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0),
  );
  if (encode(bytes) !== value) throw Error("Invalid encrypted backup.");
  return bytes;
}
function validate(value: unknown): Conversation[] {
  const result = payload.parse(value);
  if (
    new Set(result.conversations.map((c) => c.id)).size !==
      result.conversations.length ||
    result.conversations.some(containsTemporaryResearch)
  )
    throw Error("Backup contains duplicate identities or temporary research.");
  // Preserve historical fields after validation, as with existing saved snapshots.
  return (value as { conversations: Conversation[] }).conversations;
}
export async function encodeVaultBackup(
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  conversations: Conversation[],
): Promise<string> {
  const content = { version: 1, conversations };
  validate(content);
  const text = JSON.stringify(content);
  if (
    salt.length !== 16 ||
    new TextEncoder().encode(text).byteLength > payloadLimit
  )
    throw Error("Backup exceeds the 10 MiB conversation limit.");
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
export async function decodeVaultBackup(
  text: string,
  passphrase: string,
): Promise<Conversation[]> {
  if (
    text.length > BACKUP_MAX_BYTES ||
    new TextEncoder().encode(text).byteLength > BACKUP_MAX_BYTES
  )
    throw Error("Backup file exceeds 16 MiB.");
  if (passphrase.length < 12) throw Error("Invalid backup passphrase.");
  const metadata = envelope.parse(JSON.parse(text));
  const salt = decode(metadata.salt),
    iv = decode(metadata.iv),
    data = decode(metadata.data);
  if (salt.length !== 16 || iv.length !== 12 || data.length > payloadLimit + 16)
    throw Error("Invalid encrypted backup bounds.");
  const key = await derive(passphrase, salt);
  const decoded = await unseal(key, { iv, data: data.buffer }, aad);
  return validate(JSON.parse(decoded));
}
