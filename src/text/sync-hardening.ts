// Sync after the security review of 15 November (docs/vault-sync-20261115.md, section 15): the
// states and refusals the screens show. Which state shows which text: see that section's table
// "Texts for the screens". Wired by the lead (src/SyncScreens.tsx, src/SyncPairing.tsx).
import { defineText } from "./core";

export const syncHardeningText = defineText({
  en: {
    // SyncState.detached === "removed" (error "removed").
    detachedRemoved:
      "This device was removed from sync on another device. Everything on it stays here and opens as before. Nothing syncs until you add it again.",
    // SyncState.detached === "reset-elsewhere" (error "reset-elsewhere").
    detachedResetElsewhere:
      "Sync was reset on another device. Everything on this device stays here and opens as before. To sync again, set up sync or approve this device from another one.",
    // Detached, not remembered, no local passphrase.
    detachedKeepAccess: "Set a local passphrase now, so you can always open the data on this device.",
    syncAgain: "Sync this device again",
    // SyncState.needsUpgrade > 0.
    needsUpgrade: (count: number) =>
      count === 1
        ? "1 synced item comes from a newer version of CometRow. It is left as it is. Reload the page to update."
        : `${count} synced items come from a newer version of CometRow. They are left as they are. Reload the page to update.`,
    // error "item-too-large".
    itemTooLarge: "A chat is too large to sync (limit 4 MB). It stays on this device.",
    // startPairing's wait rejected with SyncError "pairing-unverified".
    pairingUnverified: "The approval could not be checked, so it was not used. Nothing on this device changed. Get a new code and try again.",
    // Under the 8-character code on the new device, and next to the code field on the approving one.
    codeHint: "8 letters and numbers. Upper or lower case both work.",
    // SyncState.pairingRequestedAt, in the approval prompt.
    pairingRequestedAt: (time: string) => `Requested at ${time}.`,
    // turnOffSyncOnThisDevice refused with "needs-local-passphrase".
    turnOffNeedsPassphrase: "Enter your local passphrase. From then on it opens the data on this device, without sync.",
    // resetSync, revokeDevice, approvePairing refused with "locked".
    unlockFirst: "Unlock this device first.",
    // resetSync on a device that is not signed in to sync: ask for the recovery key.
    resetNeedsRecoveryKey: "No signed-in device here. Enter your recovery key to delete the synced copy.",
    // "wrong-key" (recovery key) and "wrong-proof".
    wrongRecoveryKey: "This recovery key does not fit this account.",
    wrongProof: "This device could not prove it holds your sync key. Unlock it and try again.",
    // "rate-limited".
    rateLimited: "Too many attempts. Wait a few minutes and try again.",
  },
  de: {
    detachedRemoved:
      "Dieses Gerät wurde auf einem anderen Gerät aus der Synchronisierung entfernt. Alles bleibt hier und öffnet sich wie bisher. Bis Sie es wieder hinzufügen, wird nichts synchronisiert.",
    detachedResetElsewhere:
      "Die Synchronisierung wurde auf einem anderen Gerät zurückgesetzt. Alles auf diesem Gerät bleibt hier und öffnet sich wie bisher. Um wieder zu synchronisieren, richten Sie die Synchronisierung ein oder geben Sie dieses Gerät auf einem anderen frei.",
    detachedKeepAccess: "Legen Sie jetzt eine lokale Passphrase fest, damit Sie die Daten auf diesem Gerät immer öffnen können.",
    syncAgain: "Dieses Gerät wieder synchronisieren",
    needsUpgrade: (count: number) =>
      count === 1
        ? "1 synchronisierter Eintrag stammt aus einer neueren Version von CometRow. Er bleibt unverändert. Laden Sie die Seite neu, um zu aktualisieren."
        : `${count} synchronisierte Einträge stammen aus einer neueren Version von CometRow. Sie bleiben unverändert. Laden Sie die Seite neu, um zu aktualisieren.`,
    itemTooLarge: "Ein Chat ist zu groß zum Synchronisieren (Grenze 4 MB). Er bleibt auf diesem Gerät.",
    pairingUnverified:
      "Die Freigabe konnte nicht geprüft werden und wurde daher nicht verwendet. Auf diesem Gerät hat sich nichts geändert. Holen Sie einen neuen Code und versuchen Sie es erneut.",
    codeHint: "8 Buchstaben und Ziffern. Groß- oder Kleinschreibung spielt keine Rolle.",
    pairingRequestedAt: (time: string) => `Angefragt um ${time}.`,
    turnOffNeedsPassphrase: "Geben Sie Ihre lokale Passphrase ein. Ab dann öffnet sie die Daten auf diesem Gerät, ohne Synchronisierung.",
    unlockFirst: "Entsperren Sie zuerst dieses Gerät.",
    resetNeedsRecoveryKey: "Hier ist kein angemeldetes Gerät. Geben Sie Ihren Wiederherstellungsschlüssel ein, um die synchronisierte Kopie zu löschen.",
    wrongRecoveryKey: "Dieser Wiederherstellungsschlüssel passt nicht zu diesem Konto.",
    wrongProof: "Dieses Gerät konnte nicht nachweisen, dass es Ihren Synchronisierungsschlüssel hat. Entsperren Sie es und versuchen Sie es erneut.",
    rateLimited: "Zu viele Versuche. Warten Sie einige Minuten und versuchen Sie es erneut.",
  },
});
