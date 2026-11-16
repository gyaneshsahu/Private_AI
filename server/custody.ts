// Secure mode, the server-held key (docs/secure-store-20261116.md). Each account has one random
// 32-byte key. The database keeps it only wrapped (AES-256-GCM) under a master key that lives in
// the environment, never in the database or a config file. A copy of the database alone therefore
// opens nothing; the running server, which has both, can unwrap it. Nothing here is ever logged.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface CustodyMaster {
  key: Buffer;
  /** Names the master key without revealing it (rotation later: rows say which key wrapped them). */
  id: string;
}
export const CUSTODY_ENV = "PRIVATEAI_CUSTODY_KEY";
/** Nonce (12) + the wrapped 32-byte key + tag (16). */
export const WRAPPED_KEY_BYTES = 60;

export function custodyMaster(key: Buffer): CustodyMaster {
  if (key.length !== 32) throw Error("The custody key must be 32 bytes.");
  return { key, id: createHash("sha256").update("cometrow-custody-key-id|").update(key).digest("hex").slice(0, 16) };
}
/** The master key from the environment: base64 of exactly 32 bytes. The error never repeats the value. */
export function custodyMasterFromEnv(env: Record<string, string | undefined>): CustodyMaster {
  const text = env[CUSTODY_ENV]?.trim() ?? "";
  const key = Buffer.from(text, "base64");
  if (!text || key.toString("base64") !== text || key.length !== 32) throw Error(`${CUSTODY_ENV} must be base64 of 32 random bytes.`);
  return custodyMaster(key);
}
/** For the development switch and tests only: gone at restart, and with it every key it wrapped. */
export const ephemeralCustodyMaster = () => custodyMaster(randomBytes(32));

const aad = (accountId: string, masterKeyId: string) => Buffer.from(`custody-v1|${accountId}|${masterKeyId}`);
export const newAccountKey = () => randomBytes(32);
export function wrapAccountKey(master: CustodyMaster, accountId: string, accountKey: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", master.key, nonce).setAAD(aad(accountId, master.id));
  return Buffer.concat([nonce, cipher.update(accountKey), cipher.final(), cipher.getAuthTag()]);
}
/** Throws for another master key, another account or a changed row; the caller answers 503 and changes nothing. */
export function unwrapAccountKey(master: CustodyMaster, accountId: string, masterKeyId: string, wrapped: Buffer): Buffer {
  if (masterKeyId !== master.id || wrapped.length !== WRAPPED_KEY_BYTES) throw Error("Custody key unavailable.");
  const decipher = createDecipheriv("aes-256-gcm", master.key, wrapped.subarray(0, 12))
    .setAAD(aad(accountId, masterKeyId))
    .setAuthTag(wrapped.subarray(WRAPPED_KEY_BYTES - 16));
  try {
    return Buffer.concat([decipher.update(wrapped.subarray(12, WRAPPED_KEY_BYTES - 16)), decipher.final()]);
  } catch {
    throw Error("Custody key unavailable.");
  }
}
