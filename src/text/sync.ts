// Devices and sync screens and the Stage 0 vault fixes (docs/vault-sync-screens-20261115.md).
import { defineText } from "./core";

/** Stage 0: the locked vault screen, live without the sync switch. */
export const vaultUnlockText = defineText({
  en: {
    newDeviceHeading: "No saved chats on this device yet",
    newDeviceText:
      "Saved chats from your other devices are not here. They stay on the device where you saved them. Creating a vault here starts an empty one.",
    newDeviceHowBackup:
      "To bring them here: create the vault, then on your other device open Saved and download an encrypted backup, and restore that file here under Encrypted backup and restore.",
    newDeviceHowSync: "Or turn on sync in Settings, Devices and sync, and approve this device from your other device.",
    rememberLabel: "Remember this device",
    rememberRisk:
      "No passphrase needed on this browser next time. Anyone who can use this browser profile can open your saved chats. Only choose this on your own device.",
    rememberedText: "This device is remembered. Your saved chats open without the passphrase.",
    openRemembered: "Open saved chats",
    forgotLink: "Forgot your passphrase?",
    forgotHeading: "Forgot your passphrase",
    forgotNoSync:
      "Without the passphrase nobody can open the saved data on this device, not even us. You can delete it and start again with a new passphrase. Backup files made with the old passphrase still need the old passphrase.",
    forgotSyncHint: "After you start again, turn on sync: it gives you a recovery key, so a forgotten passphrase is not a loss next time.",
    forgotWithSync: "Sync is on for your account, so your recovery key can open your saved data again.",
    lastResortHeading: "Last resort",
    resetButton: "Delete this device's saved data and start again",
    resetTitle: "Delete this device's saved data?",
    resetText:
      "This deletes every saved chat, memory, project, project file and scheduled task on this device. It cannot be undone. Your account, your allowance and your other devices are not affected.",
    resetTypeLabel: (word: string) => `Type ${word} to confirm`,
    resetWord: "DELETE",
    resetConfirm: "Delete and start again",
    cancel: "Cancel",
    resetDone: "This device's saved data was deleted. Choose a new passphrase to start again.",
    resetFailed: "The saved data could not be deleted. Close other tabs of CometRow and try again.",
    newPassphraseHeading: "Choose a new passphrase for this device",
    newPassphrase: "New passphrase",
    newPassphraseSave: "Save new passphrase",
    newPassphraseDone: "Your new passphrase is set.",
    newPassphraseFailed: "The new passphrase could not be set. Try again.",
  },
  de: {
    newDeviceHeading: "Noch keine gespeicherten Chats auf diesem Gerät",
    newDeviceText:
      "Gespeicherte Chats von Ihren anderen Geräten sind nicht hier. Sie bleiben auf dem Gerät, auf dem Sie sie gespeichert haben. Wenn Sie hier einen Tresor anlegen, beginnt er leer.",
    newDeviceHowBackup:
      "So holen Sie sie hierher: Legen Sie den Tresor an. Öffnen Sie dann auf Ihrem anderen Gerät Gespeichert, laden Sie eine verschlüsselte Sicherung herunter und stellen Sie diese Datei hier unter Verschlüsselte Sicherung und Wiederherstellung wieder her.",
    newDeviceHowSync:
      "Oder schalten Sie in den Einstellungen unter Geräte und Synchronisierung die Synchronisierung ein und bestätigen Sie dieses Gerät auf Ihrem anderen Gerät.",
    rememberLabel: "Dieses Gerät merken",
    rememberRisk:
      "Beim nächsten Mal ist in diesem Browser keine Passphrase nötig. Wer dieses Browserprofil nutzen kann, kann Ihre gespeicherten Chats öffnen. Wählen Sie das nur auf Ihrem eigenen Gerät.",
    rememberedText: "Dieses Gerät ist gemerkt. Ihre gespeicherten Chats öffnen sich ohne Passphrase.",
    openRemembered: "Gespeicherte Chats öffnen",
    forgotLink: "Passphrase vergessen?",
    forgotHeading: "Passphrase vergessen",
    forgotNoSync:
      "Ohne die Passphrase kann niemand die gespeicherten Daten auf diesem Gerät öffnen, auch wir nicht. Sie können sie löschen und mit einer neuen Passphrase neu beginnen. Sicherungsdateien mit der alten Passphrase brauchen weiterhin die alte Passphrase.",
    forgotSyncHint:
      "Schalten Sie nach dem Neubeginn die Synchronisierung ein: Sie erhalten einen Wiederherstellungsschlüssel, damit eine vergessene Passphrase beim nächsten Mal kein Verlust ist.",
    forgotWithSync:
      "Für Ihr Konto ist die Synchronisierung eingeschaltet. Ihr Wiederherstellungsschlüssel kann Ihre gespeicherten Daten wieder öffnen.",
    lastResortHeading: "Letzter Ausweg",
    resetButton: "Gespeicherte Daten dieses Geräts löschen und neu beginnen",
    resetTitle: "Gespeicherte Daten dieses Geräts löschen?",
    resetText:
      "Damit werden alle gespeicherten Chats, Erinnerungen, Projekte, Projektdateien und geplanten Aufgaben auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen. Ihr Konto, Ihr Kontingent und Ihre anderen Geräte sind nicht betroffen.",
    resetTypeLabel: (word: string) => `Geben Sie zur Bestätigung ${word} ein`,
    resetWord: "LÖSCHEN",
    resetConfirm: "Löschen und neu beginnen",
    cancel: "Abbrechen",
    resetDone: "Die gespeicherten Daten dieses Geräts wurden gelöscht. Wählen Sie eine neue Passphrase, um neu zu beginnen.",
    resetFailed:
      "Die gespeicherten Daten konnten nicht gelöscht werden. Schließen Sie andere Tabs von CometRow und versuchen Sie es erneut.",
    newPassphraseHeading: "Neue Passphrase für dieses Gerät wählen",
    newPassphrase: "Neue Passphrase",
    newPassphraseSave: "Neue Passphrase speichern",
    newPassphraseDone: "Ihre neue Passphrase ist gesetzt.",
    newPassphraseFailed: "Die neue Passphrase konnte nicht gesetzt werden. Versuchen Sie es erneut.",
  },
});

/** Stage 0: backup limits, parts and project files, live without the sync switch. */
export const backupPartsText = defineText({
  en: {
    limitsUpFront:
      "Each backup file holds up to 100 saved chats and 10 MB of content. With more, the backup is split into several files: download each one and keep them together.",
    includeFiles: "Include project files",
    includeFilesNote: "Makes the file larger. Older versions of CometRow cannot restore a backup with project files.",
    parts: (count: number) =>
      `Your saved data needs ${count} backup files. Download each one. To restore, restore every file; restoring a file twice adds nothing twice.`,
    downloadPart: (index: number, count: number) => `Download part ${index} of ${count}`,
    downloaded: (index: number, count: number) => `Part ${index} of ${count} downloaded`,
    empty: "There is nothing to back up yet. Save a chat, a memory, a project or a task first.",
    unreadable: "Some saved chats could not be read, so a complete backup is not possible. Nothing was changed.",
    tooLarge:
      "One saved chat is larger than 10 MB, the limit for a backup file. This is a known limit. Shorten or delete that chat, or keep this device's data as it is.",
    filesTooLarge:
      "With project files the backup would be larger than 10 MB. Untick Include project files and download again. Add the files to the project again after restoring.",
    failed: "The backup could not be made. Try again.",
  },
  de: {
    limitsUpFront:
      "Jede Sicherungsdatei enthält bis zu 100 gespeicherte Chats und 10 MB Inhalt. Bei mehr wird die Sicherung auf mehrere Dateien aufgeteilt: Laden Sie jede herunter und bewahren Sie sie zusammen auf.",
    includeFiles: "Projektdateien einschließen",
    includeFilesNote:
      "Macht die Datei größer. Ältere Versionen von CometRow können eine Sicherung mit Projektdateien nicht wiederherstellen.",
    parts: (count: number) =>
      `Ihre gespeicherten Daten brauchen ${count} Sicherungsdateien. Laden Sie jede herunter. Stellen Sie zum Wiederherstellen jede Datei wieder her; eine Datei zweimal wiederherzustellen fügt nichts doppelt hinzu.`,
    downloadPart: (index: number, count: number) => `Teil ${index} von ${count} herunterladen`,
    downloaded: (index: number, count: number) => `Teil ${index} von ${count} heruntergeladen`,
    empty:
      "Es gibt noch nichts zu sichern. Speichern Sie zuerst einen Chat, eine Erinnerung, ein Projekt oder eine Aufgabe.",
    unreadable:
      "Einige gespeicherte Chats konnten nicht gelesen werden, daher ist keine vollständige Sicherung möglich. Es wurde nichts geändert.",
    tooLarge:
      "Ein gespeicherter Chat ist größer als 10 MB, die Grenze für eine Sicherungsdatei. Das ist eine bekannte Grenze. Kürzen oder löschen Sie diesen Chat oder lassen Sie die Daten dieses Geräts, wie sie sind.",
    filesTooLarge:
      "Mit Projektdateien wäre die Sicherung größer als 10 MB. Entfernen Sie das Häkchen bei Projektdateien einschließen und laden Sie erneut herunter. Fügen Sie die Dateien nach dem Wiederherstellen dem Projekt wieder hinzu.",
    failed: "Die Sicherung konnte nicht erstellt werden. Versuchen Sie es erneut.",
  },
});

/** Devices and sync, shown only when the deployment has sync (status.vaultSync). */
export const syncText = defineText({
  en: {
    section: "Devices and sync",
    // Turn on
    offIntro:
      "Sync keeps your saved chats, memory, projects and scheduled tasks the same on your phone, tablet and computer. They are encrypted on your device before they leave it.",
    unlockFirst: "Open your saved chats first (Saved), then turn on sync here.",
    turnOn: "Turn on sync",
    explainHeading: "Turn on sync",
    explainWhat:
      "What syncs: saved chats, memory, projects and their instructions, scheduled tasks and settings. Not yet: project files. Never: incognito chats.",
    explainServer:
      "What our server keeps: an encrypted copy that we cannot read, locked with a key we never receive. What we can see: how many items you store, their sizes, when they change, how many devices you have and when each was last used. What we cannot see: any content, chat titles, device names or keys.",
    explainRecovery:
      "Next you get a recovery key. If you lose all your devices, the recovery key is the only way back to your saved data. Nobody else can recover it, not even us.",
    deviceName: "Name of this device",
    deviceNameHint: "Shown in your devices list, encrypted. For example: Laptop at home.",
    continue: "Continue",
    cancel: "Cancel",
    working: "Please wait…",
    keyHeading: "Your recovery key",
    keyOnce: "This key is shown only once. Save it now.",
    keyGroups: (count: number) => `Recovery key in ${count} groups`,
    keyGroup: (index: number, chars: string) => `Group ${index}: ${chars}`,
    copy: "Copy",
    copied: "Copied.",
    copyFailed: "Copying is not possible here. Write the key down or download it.",
    download: "Download as a file",
    print: "Print",
    keyWarning:
      "Do not keep the key on this device or in the same place as it. If both are lost or stolen together, the key does not help. Print it and keep the paper somewhere safe, or store it in a password manager on another device.",
    keyFileTitle: "CometRow recovery key",
    keyFileText:
      "Keep this key somewhere safe and away from your devices. It is the only way back to your saved data if you lose all your devices.",
    saved: "I have saved it",
    confirmHeading: "Check that you saved it",
    confirmLabel: "Type the last group of your recovery key",
    confirmButton: "Turn on sync",
    confirmWrong: "That does not match the last group. Look at the key you saved.",
    showAgain: "Show the key again",
    onDone: "Sync is on. This device is the first in your list.",
    setupFailed: "Sync could not be turned on. Nothing was changed. Try again.",
    // New device
    newHeading: "Your saved data is on your other devices",
    newText:
      "Sync is on for your account. To open your saved chats here, approve this device from a device where CometRow is open, or use your recovery key.",
    approveFromOther: "Approve from another device",
    useRecovery: "Use your recovery key",
    notNow: "Not now",
    notNowNote: "Not now gives you an empty vault on this device. It is not synced and does not show your other devices' chats.",
    codeHeading: "Approve this device",
    codeLabel: "Code for your other device",
    codeSteps:
      "On your other device, open CometRow. It shows A new device wants access. Enter this code there, check it matches, and approve.",
    codeExpiry: "The code works for 10 minutes and only once.",
    waiting: "Waiting for approval…",
    approved: "This device is approved. Your saved data is arriving.",
    expired: "The code expired. Get a new code to try again.",
    refused: "The approval did not work. Get a new code, or use your recovery key.",
    newCode: "Get a new code",
    back: "Back",
    pairingFailed: "A code could not be made. Check your connection and try again.",
    notSyncedLabel: "Not synced: this device keeps its own saved chats.",
    getFromOther: "Get my saved data from my other devices",
    // Recovery key input
    recoveryHeading: "Use your recovery key",
    recoveryLabel: "Recovery key",
    recoveryHint: "26 letters and digits, in groups. Spaces and dashes do not matter.",
    hintShort: (missing: number) => `${missing} more ${missing === 1 ? "character" : "characters"} to go.`,
    hintLong: (extra: number) => `${extra} ${extra === 1 ? "character" : "characters"} too many.`,
    hintCharacter: (character: string) => `${character} is not used in recovery keys. They use the letters A to Z and the digits 2 to 7.`,
    hintTypo: "This key does not check out. Look for a mistyped character.",
    hintOk: "The key looks complete.",
    unlock: "Open my saved data",
    wrongKey: "This recovery key does not open your saved data. Check each group and try again.",
    recovered: "Your recovery key worked. Your saved data is arriving.",
    recoveryFailed: "The recovery key could not be checked. Check your connection and try again.",
    // Existing device: approve
    promptHeading: "A new device wants access",
    promptText: "Enter the code it shows.",
    promptWarning:
      "Only approve a device you are holding right now. If you did not just ask for this on another device, do not approve: someone may be trying to get into your account.",
    promptCode: "Code shown on the new device",
    promptName: "Name for the new device",
    promptNameDefault: "New device",
    approve: "Approve",
    dismiss: "Not now",
    approvedOther: "Approved. The new device can now open your saved data.",
    wrongCode: "That code does not match. Check the code on the new device and try again.",
    expiredOther: "The request expired. Start again on the new device.",
    approveFailed: "The approval did not go through. Try again.",
    approveNew: "Approve a new device",
    // Devices list and status
    statusHeading: "Status",
    devicesHeading: "Your devices",
    thisDevice: "This device",
    added: (date: string) => `Added ${date}`,
    lastSeen: (date: string) => `Last seen ${date}`,
    revoked: "Removed",
    revoke: (name: string) => `Remove ${name}`,
    revokeShort: "Remove",
    revokeTitle: (name: string) => `Remove ${name}?`,
    revokeText:
      "Removing a device stops it from syncing and deletes its key on our server, so it cannot get new changes. It does not delete the saved data already on that device: whoever can open that device can still read it. If the device was lost or stolen, also secure your Google account.",
    revokeConfirm: "Remove device",
    revokeDone: "The device was removed.",
    revokeFailed: "The device could not be removed. Try again.",
    lastSync: (time: string) => `Last synced ${time}`,
    neverSynced: "Not synced yet.",
    pending: (count: number) => (count ? `${count} ${count === 1 ? "change" : "changes"} waiting to sync.` : "No changes waiting."),
    quota: (used: string, limit: string, left: string) => `${used} of ${limit} used, ${left} left.`,
    quotaLabel: "Storage used for sync",
    syncNow: "Sync now",
    turnOffHere: "Turn off sync on this device",
    turnOffTitle: "Turn off sync on this device?",
    turnOffText:
      "Your saved data stays on this device but stops syncing. Your other devices keep syncing. To sync here again you need approval from another device or your recovery key.",
    turnOffConfirm: "Turn off sync here",
    turnedOff: "Sync is off on this device. Your saved data stays here.",
    reset: "Delete synced data on the server",
    resetTitle: "Delete synced data on the server?",
    resetText:
      "This deletes the encrypted copy of your saved data on our server and every device key. Data on your devices stays there, but no device syncs any more and your recovery key stops working. Use this only if you lost your recovery key and all your devices, or want to start over.",
    resetTypeLabel: (phrase: string) => `Type ${phrase} to confirm`,
    resetPhrase: "DELETE SYNCED DATA",
    resetConfirm: "Delete synced data",
    resetDone: "The synced data on the server was deleted.",
    actionFailed: "That did not work. Try again.",
    // Errors in plain words
    errorOffline: "You are offline. Changes sync when you are back online.",
    errorQuota: "Your sync storage is full. New changes stay on this device until you delete saved chats or files.",
    errorRevoked: "This device was removed from sync on another device. Your saved data stays here, but it no longer syncs.",
    errorConflict: "The same item changed on two devices. Both versions were kept: look for the conflict copy.",
    errorOther: "Sync stopped because of a problem. Try Sync now.",
    // Indicator
    indicatorLabel: (state: string) => `Sync: ${state}. Open devices and sync`,
    stateSynced: "Synced",
    stateSyncing: "Syncing",
    stateOffline: "Offline",
    stateError: "Sync problem",
    stateLocked: "Locked",
    stateApproval: "Not synced here",
  },
  de: {
    section: "Geräte und Synchronisierung",
    offIntro:
      "Die Synchronisierung hält Ihre gespeicherten Chats, Erinnerungen, Projekte und geplanten Aufgaben auf Telefon, Tablet und Computer gleich. Sie werden auf Ihrem Gerät verschlüsselt, bevor sie es verlassen.",
    unlockFirst: "Öffnen Sie zuerst Ihre gespeicherten Chats (Gespeichert) und schalten Sie dann hier die Synchronisierung ein.",
    turnOn: "Synchronisierung einschalten",
    explainHeading: "Synchronisierung einschalten",
    explainWhat:
      "Was synchronisiert wird: gespeicherte Chats, Erinnerungen, Projekte mit ihren Anweisungen, geplante Aufgaben und Einstellungen. Noch nicht: Projektdateien. Nie: Inkognito-Chats.",
    explainServer:
      "Was unser Server aufbewahrt: eine verschlüsselte Kopie, die wir nicht lesen können, verschlossen mit einem Schlüssel, den wir nie erhalten. Was wir sehen: wie viele Einträge Sie speichern, wie groß sie sind, wann sie sich ändern, wie viele Geräte Sie haben und wann jedes zuletzt genutzt wurde. Was wir nicht sehen: Inhalte, Chat-Titel, Gerätenamen oder Schlüssel.",
    explainRecovery:
      "Als Nächstes erhalten Sie einen Wiederherstellungsschlüssel. Wenn Sie alle Ihre Geräte verlieren, ist er der einzige Weg zurück zu Ihren gespeicherten Daten. Niemand sonst kann ihn wiederherstellen, auch wir nicht.",
    deviceName: "Name dieses Geräts",
    deviceNameHint: "Erscheint verschlüsselt in Ihrer Geräteliste. Zum Beispiel: Laptop zu Hause.",
    continue: "Weiter",
    cancel: "Abbrechen",
    working: "Bitte warten…",
    keyHeading: "Ihr Wiederherstellungsschlüssel",
    keyOnce: "Dieser Schlüssel wird nur einmal angezeigt. Sichern Sie ihn jetzt.",
    keyGroups: (count: number) => `Wiederherstellungsschlüssel in ${count} Gruppen`,
    keyGroup: (index: number, chars: string) => `Gruppe ${index}: ${chars}`,
    copy: "Kopieren",
    copied: "Kopiert.",
    copyFailed: "Kopieren ist hier nicht möglich. Schreiben Sie den Schlüssel auf oder laden Sie ihn herunter.",
    download: "Als Datei herunterladen",
    print: "Drucken",
    keyWarning:
      "Bewahren Sie den Schlüssel nicht auf diesem Gerät oder am selben Ort wie das Gerät auf. Gehen beide zusammen verloren oder werden gestohlen, hilft der Schlüssel nicht. Drucken Sie ihn aus und bewahren Sie das Papier sicher auf, oder speichern Sie ihn in einem Passwort-Manager auf einem anderen Gerät.",
    keyFileTitle: "CometRow-Wiederherstellungsschlüssel",
    keyFileText:
      "Bewahren Sie diesen Schlüssel sicher und getrennt von Ihren Geräten auf. Er ist der einzige Weg zurück zu Ihren gespeicherten Daten, wenn Sie alle Ihre Geräte verlieren.",
    saved: "Ich habe ihn gesichert",
    confirmHeading: "Prüfen, ob Sie ihn gesichert haben",
    confirmLabel: "Geben Sie die letzte Gruppe Ihres Wiederherstellungsschlüssels ein",
    confirmButton: "Synchronisierung einschalten",
    confirmWrong: "Das stimmt nicht mit der letzten Gruppe überein. Sehen Sie sich den gesicherten Schlüssel an.",
    showAgain: "Schlüssel noch einmal zeigen",
    onDone: "Die Synchronisierung ist eingeschaltet. Dieses Gerät steht als erstes in Ihrer Liste.",
    setupFailed: "Die Synchronisierung konnte nicht eingeschaltet werden. Es wurde nichts geändert. Versuchen Sie es erneut.",
    newHeading: "Ihre gespeicherten Daten sind auf Ihren anderen Geräten",
    newText:
      "Für Ihr Konto ist die Synchronisierung eingeschaltet. Um Ihre gespeicherten Chats hier zu öffnen, bestätigen Sie dieses Gerät auf einem Gerät, auf dem CometRow geöffnet ist, oder nutzen Sie Ihren Wiederherstellungsschlüssel.",
    approveFromOther: "Auf einem anderen Gerät bestätigen",
    useRecovery: "Wiederherstellungsschlüssel nutzen",
    notNow: "Nicht jetzt",
    notNowNote:
      "Mit Nicht jetzt erhalten Sie auf diesem Gerät einen leeren Tresor. Er wird nicht synchronisiert und zeigt die Chats Ihrer anderen Geräte nicht.",
    codeHeading: "Dieses Gerät bestätigen",
    codeLabel: "Code für Ihr anderes Gerät",
    codeSteps:
      "Öffnen Sie CometRow auf Ihrem anderen Gerät. Dort erscheint Ein neues Gerät möchte Zugriff. Geben Sie dort diesen Code ein, prüfen Sie, dass er übereinstimmt, und bestätigen Sie.",
    codeExpiry: "Der Code gilt 10 Minuten und nur einmal.",
    waiting: "Warten auf Bestätigung…",
    approved: "Dieses Gerät ist bestätigt. Ihre gespeicherten Daten kommen an.",
    expired: "Der Code ist abgelaufen. Holen Sie einen neuen Code, um es erneut zu versuchen.",
    refused: "Die Bestätigung hat nicht geklappt. Holen Sie einen neuen Code oder nutzen Sie Ihren Wiederherstellungsschlüssel.",
    newCode: "Neuen Code holen",
    back: "Zurück",
    pairingFailed: "Es konnte kein Code erstellt werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    notSyncedLabel: "Nicht synchronisiert: Dieses Gerät hat eigene gespeicherte Chats.",
    getFromOther: "Meine gespeicherten Daten von meinen anderen Geräten holen",
    recoveryHeading: "Wiederherstellungsschlüssel nutzen",
    recoveryLabel: "Wiederherstellungsschlüssel",
    recoveryHint: "26 Buchstaben und Ziffern in Gruppen. Leerzeichen und Bindestriche spielen keine Rolle.",
    hintShort: (missing: number) => `Noch ${missing} ${missing === 1 ? "Zeichen" : "Zeichen"}.`,
    hintLong: (extra: number) => `${extra} ${extra === 1 ? "Zeichen" : "Zeichen"} zu viel.`,
    hintCharacter: (character: string) =>
      `${character} kommt in Wiederherstellungsschlüsseln nicht vor. Sie bestehen aus den Buchstaben A bis Z und den Ziffern 2 bis 7.`,
    hintTypo: "Dieser Schlüssel geht nicht auf. Suchen Sie nach einem Tippfehler.",
    hintOk: "Der Schlüssel sieht vollständig aus.",
    unlock: "Meine gespeicherten Daten öffnen",
    wrongKey: "Dieser Wiederherstellungsschlüssel öffnet Ihre gespeicherten Daten nicht. Prüfen Sie jede Gruppe und versuchen Sie es erneut.",
    recovered: "Ihr Wiederherstellungsschlüssel hat funktioniert. Ihre gespeicherten Daten kommen an.",
    recoveryFailed: "Der Wiederherstellungsschlüssel konnte nicht geprüft werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    promptHeading: "Ein neues Gerät möchte Zugriff",
    promptText: "Geben Sie den Code ein, den es anzeigt.",
    promptWarning:
      "Bestätigen Sie nur ein Gerät, das Sie gerade in der Hand halten. Wenn Sie das nicht eben auf einem anderen Gerät angefragt haben, bestätigen Sie nicht: Jemand versucht vielleicht, in Ihr Konto zu gelangen.",
    promptCode: "Code auf dem neuen Gerät",
    promptName: "Name für das neue Gerät",
    promptNameDefault: "Neues Gerät",
    approve: "Bestätigen",
    dismiss: "Nicht jetzt",
    approvedOther: "Bestätigt. Das neue Gerät kann jetzt Ihre gespeicherten Daten öffnen.",
    wrongCode: "Dieser Code stimmt nicht. Prüfen Sie den Code auf dem neuen Gerät und versuchen Sie es erneut.",
    expiredOther: "Die Anfrage ist abgelaufen. Beginnen Sie auf dem neuen Gerät neu.",
    approveFailed: "Die Bestätigung ist nicht durchgegangen. Versuchen Sie es erneut.",
    approveNew: "Ein neues Gerät bestätigen",
    statusHeading: "Status",
    devicesHeading: "Ihre Geräte",
    thisDevice: "Dieses Gerät",
    added: (date: string) => `Hinzugefügt ${date}`,
    lastSeen: (date: string) => `Zuletzt gesehen ${date}`,
    revoked: "Entfernt",
    revoke: (name: string) => `${name} entfernen`,
    revokeShort: "Entfernen",
    revokeTitle: (name: string) => `${name} entfernen?`,
    revokeText:
      "Wenn Sie ein Gerät entfernen, synchronisiert es nicht mehr, und sein Schlüssel auf unserem Server wird gelöscht; es erhält also keine neuen Änderungen. Die gespeicherten Daten, die schon auf dem Gerät sind, werden nicht gelöscht: Wer das Gerät öffnen kann, kann sie weiter lesen. Wenn das Gerät verloren oder gestohlen wurde, sichern Sie auch Ihr Google-Konto.",
    revokeConfirm: "Gerät entfernen",
    revokeDone: "Das Gerät wurde entfernt.",
    revokeFailed: "Das Gerät konnte nicht entfernt werden. Versuchen Sie es erneut.",
    lastSync: (time: string) => `Zuletzt synchronisiert ${time}`,
    neverSynced: "Noch nicht synchronisiert.",
    pending: (count: number) =>
      count ? `${count} ${count === 1 ? "Änderung wartet" : "Änderungen warten"} auf die Synchronisierung.` : "Keine Änderungen warten.",
    quota: (used: string, limit: string, left: string) => `${used} von ${limit} belegt, ${left} frei.`,
    quotaLabel: "Speicher für die Synchronisierung",
    syncNow: "Jetzt synchronisieren",
    turnOffHere: "Synchronisierung auf diesem Gerät ausschalten",
    turnOffTitle: "Synchronisierung auf diesem Gerät ausschalten?",
    turnOffText:
      "Ihre gespeicherten Daten bleiben auf diesem Gerät, werden aber nicht mehr synchronisiert. Ihre anderen Geräte synchronisieren weiter. Um hier wieder zu synchronisieren, brauchen Sie die Bestätigung eines anderen Geräts oder Ihren Wiederherstellungsschlüssel.",
    turnOffConfirm: "Hier ausschalten",
    turnedOff: "Die Synchronisierung ist auf diesem Gerät aus. Ihre gespeicherten Daten bleiben hier.",
    reset: "Synchronisierte Daten auf dem Server löschen",
    resetTitle: "Synchronisierte Daten auf dem Server löschen?",
    resetText:
      "Damit werden die verschlüsselte Kopie Ihrer gespeicherten Daten auf unserem Server und alle Geräteschlüssel gelöscht. Die Daten auf Ihren Geräten bleiben dort, aber kein Gerät synchronisiert mehr, und Ihr Wiederherstellungsschlüssel funktioniert nicht mehr. Nutzen Sie das nur, wenn Sie Ihren Wiederherstellungsschlüssel und alle Geräte verloren haben oder neu beginnen möchten.",
    resetTypeLabel: (phrase: string) => `Geben Sie zur Bestätigung ${phrase} ein`,
    resetPhrase: "SYNCHRONISIERTE DATEN LÖSCHEN",
    resetConfirm: "Synchronisierte Daten löschen",
    resetDone: "Die synchronisierten Daten auf dem Server wurden gelöscht.",
    actionFailed: "Das hat nicht geklappt. Versuchen Sie es erneut.",
    errorOffline: "Sie sind offline. Änderungen werden synchronisiert, sobald Sie wieder online sind.",
    errorQuota:
      "Ihr Speicher für die Synchronisierung ist voll. Neue Änderungen bleiben auf diesem Gerät, bis Sie gespeicherte Chats oder Dateien löschen.",
    errorRevoked:
      "Dieses Gerät wurde auf einem anderen Gerät aus der Synchronisierung entfernt. Ihre gespeicherten Daten bleiben hier, werden aber nicht mehr synchronisiert.",
    errorConflict:
      "Derselbe Eintrag wurde auf zwei Geräten geändert. Beide Fassungen wurden behalten: Suchen Sie nach der Konfliktkopie.",
    errorOther: "Die Synchronisierung wurde wegen eines Problems angehalten. Versuchen Sie Jetzt synchronisieren.",
    indicatorLabel: (state: string) => `Synchronisierung: ${state}. Geräte und Synchronisierung öffnen`,
    stateSynced: "Synchronisiert",
    stateSyncing: "Wird synchronisiert",
    stateOffline: "Offline",
    stateError: "Problem bei der Synchronisierung",
    stateLocked: "Gesperrt",
    stateApproval: "Hier nicht synchronisiert",
  },
});
