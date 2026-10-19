export const accountDesign = Object.freeze({
  activation: "inactive" as const,
  methods: ["google", "apple", "email", "passkey"] as const,
  automaticEmailLinking: false,
  migrateExistingAccounts: false,
  recoverVaultFromSignIn: false,
  emailMethod: "one-time-code" as const,
});

export const accountAuthBasePath = "/api/auth";
export const accountCallbackPaths = Object.freeze({
  google: `${accountAuthBasePath}/callback/google`,
  apple: `${accountAuthBasePath}/callback/apple`,
});

/** Owner-approved identity for rollout planning; no runtime/provider activation. */
export const productionAccountTarget = Object.freeze({
  origin: "https://app.cometrow.com",
  relyingPartyId: "app.cometrow.com",
  domainPurchase: "owner-confirmed" as const,
  activation: "not-approved" as const,
});

/** The review screen has no authentication transport and is loopback-only. */
export function isAccountPreview(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    url.searchParams.get("account-preview") === "1"
  );
}
