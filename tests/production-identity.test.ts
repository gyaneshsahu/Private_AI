import { expect, it } from "vitest";
import type { Pool } from "pg";
import {
  accountCallbackPaths,
  accountDesign,
  productionAccountTarget,
  isAccountPreview,
} from "../shared/account-design";
import { createSyntheticAccountAuth } from "../server/account-auth";

it("keeps approved production identity outside the synthetic authentication and preview boundaries", () => {
  expect(accountDesign.activation).toBe("inactive");
  expect(accountDesign.migrateExistingAccounts).toBe(false);
  expect(productionAccountTarget.activation).toBe("not-approved");
  expect(
    isAccountPreview(
      new URL(`${productionAccountTarget.origin}/?account-preview=1`),
    ),
  ).toBe(false);
  expect(() =>
    createSyntheticAccountAuth({
      origin: productionAccountTarget.origin,
      database: {} as Pool,
      secret: "synthetic-config-only-01234567890123456789",
      deliverCode: async () => {
        throw Error("Delivery must not occur");
      },
    }),
  ).toThrow("loopback");
});

it("keeps callback and passkey identities on the exact approved HTTPS host", () => {
  const origin = new URL(productionAccountTarget.origin);
  expect(origin.protocol).toBe("https:");
  expect(origin.hostname).toBe(productionAccountTarget.relyingPartyId);
  expect(origin.origin).toBe(productionAccountTarget.origin);
  for (const path of Object.values(accountCallbackPaths)) {
    const callback = new URL(path, origin);
    expect(callback.origin).toBe(origin.origin);
    expect(callback.search).toBe("");
    expect(callback.hash).toBe("");
  }
});
