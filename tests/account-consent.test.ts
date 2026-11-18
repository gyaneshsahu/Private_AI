// The consent record (server/account-consent.ts): which sign-in route counts as which method, and the
// one insert with the current versions. The database side runs in tests/account-auth-postgres.test.ts.
import { expect, it } from "vitest";
import { recordConsent, signInMethod } from "../server/account-consent";
import { PRIVACY_VERSION, TERMS_VERSION } from "../shared/legal-versions";

it("names the sign-in method from the auth route", () => {
  expect(signInMethod("/sign-in/email-otp")).toBe("email");
  expect(signInMethod("/callback/google")).toBe("google");
  expect(signInMethod("/callback/apple")).toBe("apple");
  expect(signInMethod("/passkey/verify-authentication")).toBe("passkey");
  expect(signInMethod("/callback/googlefake")).toBe("other");
  expect(signInMethod(undefined)).toBe("other");
});

it("records the current Terms and Privacy versions once per version pair", async () => {
  const calls: unknown[][] = [];
  const database = { query: async (sql: string, params: unknown[]) => (calls.push([sql, params]), { rows: [] }) };
  await recordConsent(database as never, "00000000-0000-4000-8000-000000000001", "google");
  expect(calls).toHaveLength(1);
  expect(String(calls[0][0])).toMatch(/INSERT INTO consent_records.*ON CONFLICT DO NOTHING/);
  expect(calls[0][1]).toEqual(["00000000-0000-4000-8000-000000000001", TERMS_VERSION, PRIVACY_VERSION, "google"]);
  expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(PRIVACY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
