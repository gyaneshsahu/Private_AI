// Messages from the encrypted vault and its backups (src/vault.ts, src/vault-backup.ts).
import { defineText } from "./core";

export const vaultText = defineText({
  en: {
    savedChangedElsewhere:
      "This saved conversation changed in another tab. Save your work as a new conversation to keep both versions.",
    changedInTab: "Vault changed in another tab. Lock and unlock before continuing.",
    lockBeforeSwitch: "Lock the vault before switching accounts.",
    invalidScope: "Invalid account scope.",
    shortPassphrase:
      "Use a passphrase of at least 12 characters. There is no recovery service.",
    unlockFailed: "Vault unlock failed.",
    unlockCancelled: "Unlock cancelled.",
    temporaryNotRemoved:
      "Temporary research could not be removed from this conversation, so it was not saved.",
    pictureNotSaved: "This conversation holds a picture, and pictures are never stored. It was not saved.",
    unlockBeforeSaving: "Unlock your vault before saving.",
    projectGone: "Project no longer exists. Remove its assignment before saving.",
    lockedBeforeSave: "Vault locked before save completed.",
    conversationDeleted:
      "This conversation was deleted. Create a new conversation instead.",
    unreadableSnapshots: "Some saved snapshots could not be read.",
    locked: "Vault is locked.",
    wasLocked: "Vault was locked.",
    backupMaximum: (maximum: number) =>
      `Backup supports at most ${maximum} saved conversations.`,
    temporaryReopen: "Temporary research snapshot cannot be reopened.",
    identityMismatch: "Snapshot identity mismatch.",
    unlockFirst: "Unlock your vault first.",
    changed: "Vault changed.",
    projectsChangedRetry: "Projects changed in another tab. Unlock again and retry.",
    changedDuringProject: "Vault changed during project update.",
    projectGoneRefresh: "Project no longer exists. Unlock again to refresh.",
    unreadableHistoryRemoval: "Unreadable history prevents safe project removal.",
    projectsChanged: "Projects changed in another tab.",
    historyChangedRemoval: "History changed during removal. Try again.",
    unlockBeforeBackup: "Unlock your vault before creating a backup.",
    unreadableBackup:
      "Unreadable snapshots prevent a complete backup. Existing data was not changed.",
    backupCancelled: "Backup cancelled because the vault changed.",
    unlockDestination: "Unlock the destination vault before restoring.",
    restoreCancelled: "Restore cancelled because the vault changed.",
    projectsChangedRestore: "Projects changed during restore.",
    unlockTheVault: "Unlock the vault first.",
    differentPassphrase: "Choose a different passphrase of at least 12 characters.",
    passphraseCancelled: "Passphrase change cancelled because the vault changed.",
    wrongPassphrase: "Current passphrase is incorrect.",
    historyChangedPassphrase:
      "Saved history changed. Review it before changing the passphrase.",
    projectsChangedPassphrase: "Projects changed during passphrase update.",
    unlockBeforeDeleting: "Unlock your vault before deleting.",
    deletionCancelled: "Deletion cancelled because the vault changed.",
    invalidBackup: "Invalid encrypted backup.",
    backupContents:
      "Backup contains duplicate identities, an unknown project or temporary research.",
    backupTooLarge: "Backup exceeds the 10 MiB conversation limit.",
    backupFileTooLarge: "Backup file exceeds 16 MiB.",
    invalidBackupPassphrase: "Invalid backup passphrase.",
    invalidBackupBounds: "Invalid encrypted backup bounds.",
  },
  de: {
    savedChangedElsewhere:
      "Diese gespeicherte Unterhaltung wurde in einem anderen Tab geändert. Speichern Sie Ihre Arbeit als neue Unterhaltung, um beide Fassungen zu behalten.",
    changedInTab:
      "Der Tresor wurde in einem anderen Tab geändert. Sperren und entsperren Sie ihn, bevor Sie fortfahren.",
    lockBeforeSwitch: "Sperren Sie den Tresor, bevor Sie das Konto wechseln.",
    invalidScope: "Ungültiger Kontobereich.",
    shortPassphrase:
      "Verwenden Sie eine Passphrase mit mindestens 12 Zeichen. Es gibt keinen Wiederherstellungsdienst.",
    unlockFailed: "Der Tresor konnte nicht entsperrt werden.",
    unlockCancelled: "Entsperren abgebrochen.",
    temporaryNotRemoved:
      "Die vorübergehende Recherche konnte nicht aus dieser Unterhaltung entfernt werden, daher wurde sie nicht gespeichert.",
    pictureNotSaved: "Diese Unterhaltung enthält ein Bild, und Bilder werden nie gespeichert. Sie wurde nicht gespeichert.",
    unlockBeforeSaving: "Entsperren Sie Ihren Tresor, bevor Sie speichern.",
    projectGone:
      "Das Projekt existiert nicht mehr. Entfernen Sie die Zuordnung, bevor Sie speichern.",
    lockedBeforeSave: "Der Tresor wurde gesperrt, bevor das Speichern abgeschlossen war.",
    conversationDeleted:
      "Diese Unterhaltung wurde gelöscht. Erstellen Sie stattdessen eine neue Unterhaltung.",
    unreadableSnapshots: "Einige gespeicherte Stände konnten nicht gelesen werden.",
    locked: "Der Tresor ist gesperrt.",
    wasLocked: "Der Tresor wurde gesperrt.",
    backupMaximum: (maximum: number) =>
      `Eine Sicherung umfasst höchstens ${maximum} gespeicherte Unterhaltungen.`,
    temporaryReopen:
      "Ein Stand mit vorübergehender Recherche kann nicht wieder geöffnet werden.",
    identityMismatch: "Die Kennung des gespeicherten Stands stimmt nicht überein.",
    unlockFirst: "Entsperren Sie zuerst Ihren Tresor.",
    changed: "Der Tresor wurde geändert.",
    projectsChangedRetry:
      "Die Projekte wurden in einem anderen Tab geändert. Entsperren Sie erneut und versuchen Sie es noch einmal.",
    changedDuringProject: "Der Tresor wurde während der Projektänderung geändert.",
    projectGoneRefresh:
      "Das Projekt existiert nicht mehr. Entsperren Sie erneut, um die Ansicht zu aktualisieren.",
    unreadableHistoryRemoval:
      "Ein unlesbarer Verlauf verhindert das sichere Entfernen des Projekts.",
    projectsChanged: "Die Projekte wurden in einem anderen Tab geändert.",
    historyChangedRemoval:
      "Der Verlauf hat sich beim Entfernen geändert. Versuchen Sie es erneut.",
    unlockBeforeBackup: "Entsperren Sie Ihren Tresor, bevor Sie eine Sicherung erstellen.",
    unreadableBackup:
      "Unlesbare Stände verhindern eine vollständige Sicherung. Vorhandene Daten wurden nicht geändert.",
    backupCancelled: "Sicherung abgebrochen, weil sich der Tresor geändert hat.",
    unlockDestination: "Entsperren Sie den Zieltresor, bevor Sie wiederherstellen.",
    restoreCancelled: "Wiederherstellung abgebrochen, weil sich der Tresor geändert hat.",
    projectsChangedRestore: "Die Projekte wurden während der Wiederherstellung geändert.",
    unlockTheVault: "Entsperren Sie zuerst den Tresor.",
    differentPassphrase: "Wählen Sie eine andere Passphrase mit mindestens 12 Zeichen.",
    passphraseCancelled:
      "Änderung der Passphrase abgebrochen, weil sich der Tresor geändert hat.",
    wrongPassphrase: "Die aktuelle Passphrase ist falsch.",
    historyChangedPassphrase:
      "Der gespeicherte Verlauf hat sich geändert. Prüfen Sie ihn, bevor Sie die Passphrase ändern.",
    projectsChangedPassphrase:
      "Die Projekte wurden während der Änderung der Passphrase geändert.",
    unlockBeforeDeleting: "Entsperren Sie Ihren Tresor, bevor Sie löschen.",
    deletionCancelled: "Löschen abgebrochen, weil sich der Tresor geändert hat.",
    invalidBackup: "Ungültige verschlüsselte Sicherung.",
    backupContents:
      "Die Sicherung enthält doppelte Kennungen, ein unbekanntes Projekt oder vorübergehende Recherche.",
    backupTooLarge: "Die Sicherung überschreitet die Grenze von 10 MiB für Unterhaltungen.",
    backupFileTooLarge: "Die Sicherungsdatei ist größer als 16 MiB.",
    invalidBackupPassphrase: "Ungültige Passphrase für die Sicherung.",
    invalidBackupBounds: "Ungültige Grenzen der verschlüsselten Sicherung.",
  },
});
