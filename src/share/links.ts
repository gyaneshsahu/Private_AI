// The browser's calls for encrypted share links (docs/sharing-20261125.md). The key never goes in a request.
import { SHARE, type ShareExpiry, type ShareListing } from "../../shared/share-links";
import { sealSnapshot, shareUrl } from "./crypto";
import { subjectSnapshot, type ShareSubject } from "./subject";

export type LinkFailure = "tooLarge" | "tooMany" | "failed";
export type MadeLink = { id: string; url: string; expiresAt: string };

/** Encrypts the subject on this device, stores the ciphertext and returns the link with its key after "#". */
export async function createLink(subject: ShareSubject, expires: ShareExpiry, csrf: string, origin = location.origin): Promise<MadeLink> {
  const { cipher, key } = await sealSnapshot(subjectSnapshot(subject));
  if (cipher.length > SHARE.cipherChars) throw "tooLarge" satisfies LinkFailure;
  let response: Response;
  try {
    response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": csrf },
      body: JSON.stringify({ cipher, expires }),
    });
  } catch {
    throw "failed" satisfies LinkFailure;
  }
  if (response.status === 409) throw "tooMany" satisfies LinkFailure;
  if (response.status === 413) throw "tooLarge" satisfies LinkFailure;
  const made = (await response.json().catch(() => ({}))) as { id?: string; expiresAt?: string };
  if (!response.ok || !made.id || !made.expiresAt) throw "failed" satisfies LinkFailure;
  return { id: made.id, url: shareUrl(origin, made.id, key), expiresAt: made.expiresAt };
}

export async function deleteLink(id: string, csrf: string): Promise<boolean> {
  const response = await fetch(`/api/share/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "X-PrivateAI-CSRF": csrf } }).catch(() => undefined);
  return !!response && (response.status === 204 || response.status === 404);
}

export async function listLinks(): Promise<ShareListing[]> {
  const response = await fetch("/api/share", { credentials: "same-origin" });
  if (!response.ok) throw Error("unavailable");
  return ((await response.json()) as { links: ShareListing[] }).links;
}
