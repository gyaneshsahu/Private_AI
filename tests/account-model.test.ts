import { expect, it } from "vitest";
import { accountDesign, isAccountPreview } from "../shared/account-design";
import {
  assessExplicitLink,
  consumerAccountSchema,
  socialIdentityKey,
} from "../server/account-model";
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";

it("keeps preview loopback-only without enabling any account migration or recovery", () => {
  expect(accountDesign.activation).toBe("inactive");
  expect(accountDesign.automaticEmailLinking).toBe(false);
  expect(accountDesign.migrateExistingAccounts).toBe(false);
  expect(accountDesign.recoverVaultFromSignIn).toBe(false);
  expect(
    isAccountPreview(new URL("http://127.0.0.1:4173/?account-preview=1")),
  ).toBe(true);
  for (const url of [
    "https://private-ai-deployment.onrender.com/?account-preview=1",
    "http://localhost.attacker.test/?account-preview=1",
    "http://127.0.0.1:4173/",
    "https://localhost/?account-preview=1",
  ])
    expect(isAccountPreview(new URL(url))).toBe(false);
});

it("keys social identities by issuer and subject without accepting profile or credential payloads", () => {
  const google = {
    provider: "google",
    issuer: "https://accounts.google.com",
    subject: "123",
    accountId: alice,
  };
  expect(socialIdentityKey(google)).not.toBe(
    socialIdentityKey({
      ...google,
      provider: "apple",
      issuer: "https://appleid.apple.com",
    }),
  );
  expect(() =>
    socialIdentityKey({ ...google, email: "someone@example.test" }),
  ).toThrow();
  expect(() =>
    socialIdentityKey({ ...google, accessToken: "synthetic-secret" }),
  ).toThrow();
  expect(() =>
    socialIdentityKey({ ...google, issuer: "https://untrusted.example" }),
  ).toThrow();
});

it("requires account-bound recent reauthentication and forbids taking an existing identity", () => {
  const link = {
    targetAccountId: alice,
    sessionAccountId: alice,
    reauthenticatedAt: 1_000_000,
    now: 1_000_001,
  };
  expect(assessExplicitLink(link)).toBe("link-after-verification");
  expect(
    assessExplicitLink({ ...link, existingIdentityAccountId: alice }),
  ).toBe("already-linked");
  expect(assessExplicitLink({ ...link, existingIdentityAccountId: bob })).toBe(
    "conflict",
  );
  expect(assessExplicitLink({ ...link, sessionAccountId: bob })).toBe(
    "reauthenticate",
  );
  for (const reauthenticatedAt of [
    undefined,
    NaN,
    Infinity,
    -1,
    link.now + 1,
    link.now - 300_000,
  ])
    expect(assessExplicitLink({ ...link, reauthenticatedAt })).toBe(
      "reauthenticate",
    );
});

it("keeps the proposed consumer account separate from vault secrets and invitation records", () => {
  const record = {
    id: alice,
    status: "active",
    verifiedEmail: "relay@example.test",
    emailVerifiedAt: "2026-10-19T10:00:00Z",
    createdAt: "2026-10-19T10:00:00Z",
  };
  expect(consumerAccountSchema.parse(record)).toEqual(record);
  expect(() =>
    consumerAccountSchema.parse({ ...record, vaultPassphrase: "synthetic" }),
  ).toThrow();
  expect(() =>
    consumerAccountSchema.parse({ ...record, token: "old-invite" }),
  ).toThrow();
});
