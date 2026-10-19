export const accountDesign = Object.freeze({
  activation: "inactive" as const,
  methods: ["google", "apple", "email", "passkey"] as const,
  automaticEmailLinking: false,
  migrateExistingAccounts: false,
  recoverVaultFromSignIn: false,
  emailMethod: "one-time-code" as const,
});

/** The review screen has no authentication transport and is loopback-only. */
export function isAccountPreview(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    url.searchParams.get("account-preview") === "1"
  );
}
