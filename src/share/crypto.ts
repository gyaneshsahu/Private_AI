// A shared snapshot is encrypted here, in the browser (docs/sharing-20261125.md): AES-256-GCM with
// a fresh key per link. The key goes into the link after "#", a part of an address that browsers
// keep to themselves, so the server stores bytes it cannot read. Works in Node too (tests).
import { shareSnapshot, type ShareSnapshot } from "../../shared/share-links";

const b64url = (bytes: Uint8Array) => {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
const bytesOf = (text: string) => Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));

/** Encrypts a snapshot. `cipher` is for the server; `key` is for the link's fragment only. */
export async function sealSnapshot(snapshot: ShareSnapshot): Promise<{ cipher: string; key: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(snapshot))));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return { cipher: b64url(out), key: b64url(raw) };
}

/** Opens what the server returned with the key from the link. Throws when the key or the bytes are wrong. */
export async function openSnapshot(cipher: string, key: string): Promise<ShareSnapshot> {
  const all = bytesOf(cipher);
  const raw = bytesOf(key);
  if (raw.length !== 32 || all.length < 13) throw Error("unreadable");
  const imported = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(0, 12) }, imported, all.slice(12));
  return shareSnapshot.parse(JSON.parse(new TextDecoder().decode(plain)));
}

export const shareUrl = (origin: string, id: string, key: string) => `${origin}/s/${id}#${key}`;
