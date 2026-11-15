// Encryption at rest for background tasks (docs/background-tasks-20261115.md, section 4): the
// task text, search text, attachment and results are sealed with AES-256-GCM under a server key
// from a deployment secret file, with a fresh 96-bit nonce per value and the key id in front for
// rotation. The additional data binds each value to its account, row and field, so a value copied
// into another row does not open. A database dump alone reveals none of it; the server process,
// which holds the key, can still read everything.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface BackgroundKeyRing {
  /** Id of the key new values are sealed with: the first line of the file. */
  current: string;
  keys: Map<string, Buffer>;
}

const KEY_ID = /^[a-z0-9-]{1,16}$/;

/**
 * Key file: one key per line, `<id>:<32 bytes in base64>`, the first line is the current key, the
 * others only open older values. Make one with
 * `node -p "'k1:'+require('crypto').randomBytes(32).toString('base64')"`.
 */
export function parseKeyRing(text: string): BackgroundKeyRing {
  const keys = new Map<string, Buffer>();
  let current = "";
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const at = line.indexOf(":");
    const id = line.slice(0, at);
    const key = Buffer.from(line.slice(at + 1), "base64");
    if (at < 1 || !KEY_ID.test(id) || key.length !== 32 || keys.has(id)) throw Error("Invalid background task key file.");
    keys.set(id, key);
    current ||= id;
  }
  if (!current || keys.size > 4) throw Error("Invalid background task key file.");
  return { current, keys };
}

/** A random key ring for one process (development server and tests): values die with the process. */
export const ephemeralKeyRing = (): BackgroundKeyRing => ({ current: "dev", keys: new Map([["dev", randomBytes(32)]]) });

const aadFor = (context: string) => Buffer.from(`cometrow-background-v1|${context}`, "utf8");

export function seal(ring: BackgroundKeyRing, plaintext: string, context: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.keys.get(ring.current)!, nonce);
  cipher.setAAD(aadFor(context));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${ring.current}.${nonce.toString("base64url")}.${body.toString("base64url")}`;
}

/** Throws on an unknown key, a changed value or a value from another row or field. */
export function open(ring: BackgroundKeyRing, sealed: string, context: string): string {
  const [id, nonce, body] = sealed.split(".");
  const key = ring.keys.get(id);
  const data = Buffer.from(body ?? "", "base64url");
  if (!key || !nonce || data.length < 16) throw Error("Sealed value unavailable.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "base64url"));
  decipher.setAAD(aadFor(context));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString("utf8");
}

export const sealedKeyId = (sealed: string) => sealed.slice(0, sealed.indexOf("."));
