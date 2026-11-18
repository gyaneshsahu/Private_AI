// The consent record (owner, 18 November 2026): one acceptance at sign-in. The sign-in page says "By
// continuing, you agree to our Terms and Privacy Policy"; signing in there records the versions shown,
// the time and the sign-in method (migration 0026). Nothing else in the app asks for consent.
import type { Pool } from "pg";
import { PRIVACY_VERSION, TERMS_VERSION } from "../shared/legal-versions";

export type ConsentMethod = "google" | "apple" | "email" | "passkey" | "other";

/** The sign-in method from the auth route that created the session. */
export function signInMethod(path?: string): ConsentMethod {
  if (!path) return "other";
  if (path.includes("email-otp")) return "email";
  if (path.includes("passkey")) return "passkey";
  const provider = /\/callback\/(google|apple)(?:$|[/?])/.exec(path)?.[1];
  return (provider as ConsentMethod | undefined) ?? "other";
}

/** Records the current versions for the account once; a later version adds a row at the next sign-in. */
export async function recordConsent(database: Pool, accountId: string, method: ConsentMethod) {
  await database.query(
    "INSERT INTO consent_records(account_id, terms_version, privacy_version, method) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
    [accountId, TERMS_VERSION, PRIVACY_VERSION, method],
  );
}
