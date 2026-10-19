import { z } from "zod";

// Inactive domain model. A maintained verifier must authenticate assertions
// before any future adapter may use these records; parsing is not verification.
const accountId = z.string().uuid();
export const consumerAccountSchema = z
  .object({
    id: accountId,
    status: z.enum(["active", "suspended", "deletion_pending"]),
    verifiedEmail: z.email().max(254),
    emailVerifiedAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const socialIdentitySchema = z.discriminatedUnion("provider", [
  z
    .object({
      provider: z.literal("google"),
      issuer: z.literal("https://accounts.google.com"),
      subject: z.string().min(1).max(255),
      accountId,
    })
    .strict(),
  z
    .object({
      provider: z.literal("apple"),
      issuer: z.literal("https://appleid.apple.com"),
      subject: z.string().min(1).max(255),
      accountId,
    })
    .strict(),
]);
export type SocialIdentity = z.infer<typeof socialIdentitySchema>;

/** Stable provider identity; email and display name are deliberately absent. */
export function socialIdentityKey(input: unknown): string {
  const identity = socialIdentitySchema.parse(input);
  return JSON.stringify([identity.issuer, identity.subject]);
}

export type LinkDecision =
  "already-linked" | "link-after-verification" | "reauthenticate" | "conflict";

/** Offline policy specification, not an OAuth callback or authentication API.
 * Future persistence must enforce identity uniqueness inside a transaction.
 */
export function assessExplicitLink(input: {
  targetAccountId: string;
  existingIdentityAccountId?: string;
  sessionAccountId?: string;
  reauthenticatedAt?: number;
  now: number;
}): LinkDecision {
  accountId.parse(input.targetAccountId);
  if (input.existingIdentityAccountId) {
    accountId.parse(input.existingIdentityAccountId);
    if (input.existingIdentityAccountId !== input.targetAccountId)
      return "conflict";
  }
  if (
    input.sessionAccountId !== input.targetAccountId ||
    !Number.isSafeInteger(input.now) ||
    input.now < 0 ||
    !Number.isSafeInteger(input.reauthenticatedAt) ||
    input.reauthenticatedAt! < 0 ||
    input.reauthenticatedAt! > input.now ||
    input.now - input.reauthenticatedAt! >= 5 * 60_000
  )
    return "reauthenticate";
  return input.existingIdentityAccountId
    ? "already-linked"
    : "link-after-verification";
}
