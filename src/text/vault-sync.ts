// Messages from the vault when sync keys it (src/vault.ts, docs/vault-sync-20261115.md).
import { defineText } from "./core";

export const vaultSyncText = defineText({
  en: {
    noLocalPassphrase:
      "This device has no passphrase. Unlock it with your recovery key or approve it from another device.",
    passphraseVaultLocked: "Unlock your vault with your passphrase first.",
    notSynced: "Sync is not set up in this vault.",
  },
  de: {
    noLocalPassphrase:
      "Dieses Gerät hat keine Passphrase. Entsperren Sie es mit Ihrem Wiederherstellungsschlüssel oder bestätigen Sie es auf einem anderen Gerät.",
    passphraseVaultLocked: "Entsperren Sie Ihren Tresor zuerst mit Ihrer Passphrase.",
    notSynced: "In diesem Tresor ist die Synchronisierung nicht eingerichtet.",
  },
});
