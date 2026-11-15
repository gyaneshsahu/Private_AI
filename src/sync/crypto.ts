/**
 * The key scheme of end-to-end encrypted sync (docs/vault-sync-20261115.md, "Key scheme").
 * WebCrypto only. The account key (AK) is 32 random bytes that never leave a browser unwrapped;
 * every other key is derived from it with HKDF-SHA-256 or wraps it.
 */
const enc = new TextEncoder();
const SALT = enc.encode("cometrow-sync-v1");
type Bytes = Uint8Array<ArrayBuffer>;

export function random(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(length));
}
export function toBase64(bytes: Uint8Array): string {
  let text = "";
  // Chunks: String.fromCharCode with a 4 MB spread overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}
export function fromBase64(text: string): Bytes {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
const concat = (...parts: Uint8Array[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

export const newAccountKey = () => random(32);

async function hkdf(ikm: Uint8Array, info: string, salt: Uint8Array = SALT): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", ikm as Bytes, "HKDF", false, ["deriveKey", "deriveBits"]).then((base) =>
    crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: salt as Bytes, info: enc.encode(info) },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    ),
  );
}
async function hkdfBits(ikm: Uint8Array, info: string, bits = 256): Promise<Bytes> {
  const base = await crypto.subtle.importKey("raw", ikm as Bytes, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: SALT, info: enc.encode(info) }, base, bits),
  );
}
async function gcmSeal(key: CryptoKey, plain: Uint8Array, aad: string): Promise<Bytes> {
  const nonce = random(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: enc.encode(aad) }, key, plain as Bytes);
  return concat(nonce, new Uint8Array(ct));
}
async function gcmOpen(key: CryptoKey, sealed: Uint8Array, aad: string): Promise<Bytes> {
  if (sealed.length < 28) throw Error("Ciphertext too short.");
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: sealed.slice(0, 12), additionalData: enc.encode(aad) },
      key,
      sealed.slice(12),
    ),
  );
}

/** The local vault's data key on a synced device: from AK, so every unlocker that yields AK opens it. */
export const localVaultKey = (ak: Uint8Array) => hkdf(ak, "local-vault");
/** Seals this device's copy of the last synced version of each item (the merge base). */
export const baseKey = (ak: Uint8Array) => hkdf(ak, "sync-base");
/** Per-item key for a sync item (HKDF info "item|<itemId>"). */
export const itemKey = (ak: Uint8Array, itemId: string) => hkdf(ak, `item|${itemId}`);
/**
 * Stage 3 (not built): per-file key for an encrypted project-file blob stored outside sync_items.
 * AAD for the blob is fileAad(); the file index (names, sizes) lives inside the "projects" item.
 */
export const fileKey = (ak: Uint8Array, fileId: string) => hkdf(ak, `file|${fileId}`);
export const fileAad = (accountId: string, fileId: string, version: number) => `${accountId}|${fileId}|${version}|project-file`;

/** A random-looking item id from AK, so the server cannot link ids to local ids or kinds. */
export async function itemIdFor(ak: Uint8Array, kind: string, localId: string): Promise<string> {
  const b = await hkdfBits(ak, `item-id|${kind}|${localId}`, 128);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** Proves knowledge of AK to the server for device registration; the server keeps only its SHA-256. */
export const accountProof = async (ak: Uint8Array, accountId: string) => toBase64(await hkdfBits(ak, `account-proof|${accountId}`));
/** Proves knowledge of the recovery key; needed to enrol a new device id outside pairing. */
export const recoveryProof = async (rk: Uint8Array, accountId: string) => toBase64(await hkdfBits(rk, `recovery-proof|${accountId}`));
/** A keyed hash of a base snapshot, so the device's sync store holds no plaintext digest. */
export async function baseHash(ak: Uint8Array, text: string): Promise<string> {
  const raw = await hkdfBits(ak, "base-hash");
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text))));
}

export const itemAad = (accountId: string, itemId: string, version: number) => `${accountId}|${itemId}|${version}`;
export async function encryptItem(ak: Uint8Array, accountId: string, itemId: string, version: number, payload: unknown) {
  return toBase64(await gcmSeal(await itemKey(ak, itemId), enc.encode(JSON.stringify(payload)), itemAad(accountId, itemId, version)));
}
export async function decryptItem(ak: Uint8Array, accountId: string, itemId: string, version: number, ciphertext: string): Promise<unknown> {
  const plain = await gcmOpen(await itemKey(ak, itemId), fromBase64(ciphertext), itemAad(accountId, itemId, version));
  return JSON.parse(new TextDecoder().decode(plain));
}

// Device keys: ECDH P-256, private key non-extractable, kept in IndexedDB.
export const newDeviceKeyPair = () =>
  crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]) as Promise<CryptoKeyPair>;
export const exportPublicKey = async (key: CryptoKey) => new Uint8Array(await crypto.subtle.exportKey("raw", key));
const importPublic = (raw: Uint8Array) =>
  crypto.subtle.importKey("raw", raw as Bytes, { name: "ECDH", namedCurve: "P-256" }, true, []);
const WRAP_VERSION = 1;
const deviceAad = (accountId: string, deviceId: string) => `device-wrapper|${accountId}|${deviceId}`;

/** AK wrapped to a device's public key: ephemeral ECDH, HKDF (salt = ephemeral public key), AES-GCM. */
export async function wrapToDevice(ak: Uint8Array, devicePublicKey: Uint8Array, accountId: string, deviceId: string) {
  const eph = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"])) as CryptoKeyPair;
  const ephRaw = await exportPublicKey(eph.publicKey);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: await importPublic(devicePublicKey) }, eph.privateKey, 256),
  );
  const key = await hkdf(shared, deviceAad(accountId, deviceId), ephRaw);
  return toBase64(concat(Uint8Array.of(WRAP_VERSION), ephRaw, await gcmSeal(key, ak, deviceAad(accountId, deviceId))));
}
export async function unwrapWithDevice(blob: string, privateKey: CryptoKey, accountId: string, deviceId: string): Promise<Bytes> {
  const raw = fromBase64(blob);
  if (raw[0] !== WRAP_VERSION || raw.length < 1 + 65 + 28) throw Error("Unknown wrapper.");
  const ephRaw = raw.slice(1, 66);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: await importPublic(ephRaw) }, privateKey, 256));
  const key = await hkdf(shared, deviceAad(accountId, deviceId), ephRaw);
  return gcmOpen(key, raw.slice(66), deviceAad(accountId, deviceId));
}

// Recovery key: 128 random bits as 26 Crockford base32 characters plus 2 check characters.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CHECK_PRIME = 1021;
const checksum = (values: number[]) => values.reduce((sum, v, i) => (sum + (i + 1) * v) % CHECK_PRIME, 0);
export function encodeRecoveryKey(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw Error("A recovery key has 16 bytes.");
  let bits = 0n;
  for (const b of bytes) bits = (bits << 8n) | BigInt(b);
  bits <<= 2n; // 130 bits: 26 characters
  const values = Array.from({ length: 26 }, (_, i) => Number((bits >> BigInt(5 * (25 - i))) & 31n));
  const check = checksum(values);
  const chars = [...values, check >> 5, check & 31].map((v) => ALPHABET[v]).join("");
  return chars.match(/.{4}/g)!.join("-");
}
/** The 16 bytes, or null when the text is not a recovery key (wrong length, character or check). */
export function decodeRecoveryKey(text: string): Bytes | null {
  const clean = text.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{28}$/.test(clean)) return null;
  const values = [...clean].map((c) => ALPHABET.indexOf(c));
  const data = values.slice(0, 26);
  if (checksum(data) !== values[26] * 32 + values[27] || (data[25] & 3) !== 0) return null;
  let bits = 0n;
  for (const v of data) bits = (bits << 5n) | BigInt(v);
  bits >>= 2n;
  const out = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    out[i] = Number(bits & 255n);
    bits >>= 8n;
  }
  return out;
}
export const newRecoveryKey = () => {
  const bytes = random(16);
  return { bytes, text: encodeRecoveryKey(bytes) };
};
const recoveryAad = (accountId: string) => `recovery-wrapper|${accountId}`;
const recoveryWrapKey = (rk: Uint8Array, accountId: string) => hkdf(rk, recoveryAad(accountId), enc.encode("cometrow-recovery-v1"));
export async function wrapWithRecovery(ak: Uint8Array, rk: Uint8Array, accountId: string) {
  return toBase64(concat(Uint8Array.of(WRAP_VERSION), await gcmSeal(await recoveryWrapKey(rk, accountId), ak, recoveryAad(accountId))));
}
export async function unwrapWithRecovery(blob: string, rk: Uint8Array, accountId: string): Promise<Bytes> {
  const raw = fromBase64(blob);
  if (raw[0] !== WRAP_VERSION) throw Error("Unknown wrapper.");
  return gcmOpen(await recoveryWrapKey(rk, accountId), raw.slice(1), recoveryAad(accountId));
}

// Device labels are encrypted with AK, so the server never sees "Anna's iPhone".
const labelAad = (accountId: string, deviceId: string) => `device-label|${accountId}|${deviceId}`;
export async function encryptLabel(ak: Uint8Array, accountId: string, deviceId: string, label: string) {
  return toBase64(await gcmSeal(await hkdf(ak, "device-label"), enc.encode(label.slice(0, 80)), labelAad(accountId, deviceId)));
}
export async function decryptLabel(ak: Uint8Array, accountId: string, deviceId: string, blob: string): Promise<string> {
  return new TextDecoder().decode(await gcmOpen(await hkdf(ak, "device-label"), fromBase64(blob), labelAad(accountId, deviceId)));
}

/**
 * The 6-digit pairing code (short authentication string) from the new device's public key: the
 * new device shows it, the approving device recomputes it from the key the server hands over, so a
 * swapped key gives a different code. server/vault-sync.ts computes the same value.
 */
export async function pairingCode(accountId: string, publicKey: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`cometrow-pairing-v1|${accountId}|${toBase64(publicKey)}`)));
  const n = ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}
