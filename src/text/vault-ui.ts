// Vault screens: encrypted backup and restore, passphrase change.
import { defineText } from "./core";

export const vaultBackupText = defineText({
  en: {
    label: "Encrypted backup and restore",
    keepHeading: "Keep an encrypted backup",
    keepIntro:
      "Download saved conversations and projects to your device, protected by this vault’s passphrase. Unsaved work and temporary research are not included. Nothing is uploaded.",
    limits:
      "Up to 100 saved conversations and 10 MiB of content. Keep the file and passphrase safe: there is no passphrase recovery. Deleting history here cannot delete downloaded copies.",
    download: "Download encrypted backup",
    restoreHeading: "Restore into this unlocked vault",
    restoreIntro:
      "Choose your backup and its original passphrase. Conversations are added as new copies with new project identities; existing snapshots and your open workspace stay unchanged. Repeating a restore adds more copies.",
    file: "Encrypted backup file",
    fileError: "Choose a non-empty encrypted backup file of at most 16 MiB.",
    passphrase: "Original backup passphrase",
    confirm: "I want to add copies from this backup to the current vault.",
    restore: "Restore as new copies",
  },
  de: {
    label: "Verschlüsselte Sicherung und Wiederherstellung",
    keepHeading: "Verschlüsselte Sicherung anlegen",
    keepIntro:
      "Laden Sie gespeicherte Unterhaltungen und Projekte auf Ihr Gerät herunter, geschützt durch die Passphrase dieses Tresors. Nicht gespeicherte Arbeit und vorübergehende Websuchen sind nicht enthalten. Es wird nichts hochgeladen.",
    limits:
      "Bis zu 100 gespeicherte Unterhaltungen und 10 MiB Inhalt. Bewahren Sie Datei und Passphrase sicher auf: Eine Passphrase kann nicht wiederhergestellt werden. Wenn Sie hier den Verlauf löschen, werden heruntergeladene Kopien nicht gelöscht.",
    download: "Verschlüsselte Sicherung herunterladen",
    restoreHeading: "In diesen entsperrten Tresor wiederherstellen",
    restoreIntro:
      "Wählen Sie Ihre Sicherung und ihre ursprüngliche Passphrase. Unterhaltungen werden als neue Kopien mit neuen Projektkennungen hinzugefügt; vorhandene Stände und Ihr geöffneter Arbeitsbereich bleiben unverändert. Ein erneutes Wiederherstellen fügt weitere Kopien hinzu.",
    file: "Verschlüsselte Sicherungsdatei",
    fileError: "Wählen Sie eine nicht leere verschlüsselte Sicherungsdatei mit höchstens 16 MiB.",
    passphrase: "Ursprüngliche Passphrase der Sicherung",
    confirm: "Ich möchte Kopien aus dieser Sicherung zum aktuellen Tresor hinzufügen.",
    restore: "Als neue Kopien wiederherstellen",
  },
});

export const vaultSecurityText = defineText({
  en: {
    label: "Vault passphrase security",
    heading: "Change vault passphrase",
    intro: "Choose a different passphrase of at least 12 characters.",
    blocked:
      "Some saved snapshots could not be read. Passphrase changes are unavailable so those records stay untouched. Keep your existing backups.",
    updates:
      "Updates all saved conversations in this browser together, then locks this vault and clears this workspace. Other open tabs receive a lock notification. Save work in every tab first. Account sign-in is separate.",
    older:
      "Older downloaded backups still need their original passphrase. This cannot revoke those copies or recover a forgotten passphrase. Make a fresh encrypted backup after changing it.",
    current: "Current vault passphrase",
    next: "New vault passphrase",
    confirm: "Confirm new vault passphrase",
    mismatch: "The new passphrases do not match.",
    acknowledge:
      "I have saved work I need in every open tab; older backups keep their original passphrase.",
    submit: "Change passphrase and lock",
  },
  de: {
    label: "Sicherheit der Tresor-Passphrase",
    heading: "Tresor-Passphrase ändern",
    intro: "Wählen Sie eine andere Passphrase mit mindestens 12 Zeichen.",
    blocked:
      "Einige gespeicherte Stände konnten nicht gelesen werden. Die Passphrase kann daher nicht geändert werden, damit diese Daten unberührt bleiben. Behalten Sie Ihre vorhandenen Sicherungen.",
    updates:
      "Aktualisiert alle gespeicherten Unterhaltungen in diesem Browser gemeinsam, sperrt dann diesen Tresor und leert diesen Arbeitsbereich. Andere geöffnete Tabs erhalten eine Sperrmeldung. Speichern Sie zuerst Ihre Arbeit in jedem Tab. Die Anmeldung zum Konto ist davon getrennt.",
    older:
      "Ältere heruntergeladene Sicherungen brauchen weiterhin ihre ursprüngliche Passphrase. Diese Änderung kann solche Kopien nicht widerrufen und keine vergessene Passphrase wiederherstellen. Legen Sie nach der Änderung eine neue verschlüsselte Sicherung an.",
    current: "Aktuelle Tresor-Passphrase",
    next: "Neue Tresor-Passphrase",
    confirm: "Neue Tresor-Passphrase bestätigen",
    mismatch: "Die neuen Passphrasen stimmen nicht überein.",
    acknowledge:
      "Ich habe benötigte Arbeit in jedem geöffneten Tab gespeichert; ältere Sicherungen behalten ihre ursprüngliche Passphrase.",
    submit: "Passphrase ändern und sperren",
  },
});
