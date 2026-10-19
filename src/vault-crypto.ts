const encoder = new TextEncoder();
export type Cipher = { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };
function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}
export async function seal(
  key: CryptoKey,
  value: string,
  aad: string,
): Promise<Cipher> {
  const iv = random(12);
  return {
    iv,
    data: await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
      key,
      encoder.encode(value),
    ),
  };
}
export async function unseal(
  key: CryptoKey,
  value: Cipher,
  aad: string,
): Promise<string> {
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: value.iv, additionalData: encoder.encode(aad) },
      key,
      value.data,
    ),
  );
}
export async function derive(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
