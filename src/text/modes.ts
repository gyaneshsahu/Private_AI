// Secure and Secure Max: the texts of docs/product-modes-20261116.md section 4, copied exactly,
// plus the labels of the Secure Max section and its two settings (owner decision of 16 November:
// a separate sidebar section instead of a lock toggle). Key names carry the wording rule
// (tests/modes-text.test.ts): every Secure Max text starts with "max"; all other keys are Secure
// or neutral and must never say that nobody can read the content. The keys marked "not in
// section 4" need the owner's legal read.
import { defineText } from "./core";

export const modesText = defineText({
  en: {
    maxLabel: "Secure Max",
    maxLine: "Encrypted with a key only you hold. CometRow can't read what you save here.",
    secureLine: "Saved to your account and available on all your devices after sign-in. CometRow holds the key.",
    // Confirmation dialog
    maxDialogTitle: "Use Secure Max?",
    maxIntroTitle: "Open Secure Max?", // not in section 4: first opening of the section
    maxDialogParagraph:
      "In Secure Max, what you save here (your chats, files and memories) is encrypted on your device with a key only you hold. Our server keeps only an encrypted copy, so CometRow cannot read the content. We can still see your account, when you use it, how many items you have saved and how large they are, and how many devices you use and when.",
    maxDifferentHeading: "What is different",
    maxDifferent1: "If you lose all your devices and your recovery key, this data is gone for good. Our support cannot recover it.",
    maxDifferent2: "A new device must be approved on a device you already use, by typing the code the new device shows, or with your recovery key.",
    maxDifferent3: "Removing a device stops it syncing. It does not erase what is already on that device.",
    maxDifferent4: "Scheduled tasks run only while CometRow is open on your device.",
    maxDifferent5: "Search covers these chats only on a device where Secure Max is unlocked.",
    maxDifferent6: "Memories saved in Secure Max are used only in Secure Max chats.",
    maxDifferent7: "A chat or project cannot be switched to Secure later. You can export it.",
    maxUnderstand: "I understand that CometRow cannot recover this data for me.",
    maxConfirm: "Use Secure Max",
    cancel: "Cancel",
    // Secure, wherever it is described
    secureLabel: "Secure", // not in section 4 (the mode's name)
    secureLong:
      "Secure saves your chats, files and memories to your account on our servers, encrypted while stored. CometRow holds the key, so your data is on all your devices as soon as you sign in, and we can restore it for you. It also means our systems can technically access it; we do so only to run the service, and never to train AI or for advertising.",
    // The Secure Max section in the sidebar (not in section 4)
    maxLocked: "Secure Max, locked",
    maxNewChat: "New Secure Max chat",
    maxNewProject: "New Secure Max project",
    maxLockNow: "Lock now",
    maxIsLocked: "Secure Max is locked",
    maxUnlock: "Unlock Secure Max",
    // Settings (not in section 4)
    maxStartLabel: "Open CometRow in Secure Max",
    maxStartLine: "CometRow starts in the Secure Max section. Chats outside it stay as they are.",
    maxResetLabel: "Reset Secure Max",
    maxResetWarning:
      "This deletes everything in Secure Max for good: on our server and on this device. Your other devices lose access, and a fresh, empty Secure Max starts. Our support cannot undo this.",
    maxResetTypeLabel: (phrase: string) => `Type ${phrase} to confirm`,
    maxResetPhrase: "RESET SECURE MAX",
    maxResetSignInFirst: "Sign in again first, then come back here to reset Secure Max.",
    maxResetFailed: "That did not work. Nothing was deleted. Try again.",
  },
  de: {
    maxLabel: "Secure Max",
    maxLine: "Mit einem Schlüssel verschlüsselt, den nur Sie haben. CometRow kann nicht lesen, was Sie hier speichern.",
    secureLine:
      "In Ihrem Konto gespeichert und nach der Anmeldung auf allen Ihren Geräten verfügbar. CometRow verwahrt den Schlüssel.",
    maxDialogTitle: "Secure Max verwenden?",
    maxIntroTitle: "Secure Max öffnen?",
    maxDialogParagraph:
      "In Secure Max wird alles, was Sie hier speichern (Chats, Dateien und Erinnerungen), auf Ihrem Gerät mit einem Schlüssel verschlüsselt, den nur Sie haben. Unser Server bewahrt nur eine verschlüsselte Kopie auf. CometRow kann den Inhalt deshalb nicht lesen. Sichtbar bleiben für uns Ihr Konto, die Zeiten der Nutzung, Anzahl und Größe der gespeicherten Einträge sowie die Anzahl Ihrer Geräte und wann sie zuletzt genutzt wurden.",
    maxDifferentHeading: "Was anders ist",
    maxDifferent1:
      "Wenn Sie alle Ihre Geräte und Ihren Wiederherstellungsschlüssel verlieren, sind diese Daten endgültig verloren. Unser Support kann sie nicht wiederherstellen.",
    maxDifferent2:
      "Ein neues Gerät muss auf einem bereits genutzten Gerät freigegeben werden, indem Sie dort den Code eingeben, den das neue Gerät anzeigt, oder mit Ihrem Wiederherstellungsschlüssel.",
    maxDifferent3:
      "Wenn Sie ein Gerät entfernen, wird es nicht mehr synchronisiert. Was bereits auf dem Gerät liegt, wird dadurch nicht gelöscht.",
    maxDifferent4: "Geplante Aufgaben laufen nur, solange CometRow auf Ihrem Gerät geöffnet ist.",
    maxDifferent5: "Die Suche erfasst diese Chats nur auf einem Gerät, auf dem Secure Max entsperrt ist.",
    maxDifferent6: "In Secure Max gespeicherte Erinnerungen werden nur in Secure-Max-Chats verwendet.",
    maxDifferent7: "Ein Chat oder Projekt kann später nicht auf Secure umgestellt werden. Sie können es exportieren.",
    maxUnderstand: "Mir ist bewusst, dass CometRow diese Daten nicht für mich wiederherstellen kann.",
    maxConfirm: "Secure Max verwenden",
    cancel: "Abbrechen",
    secureLabel: "Secure",
    secureLong:
      "Secure speichert Ihre Chats, Dateien und Erinnerungen in Ihrem Konto auf unseren Servern, verschlüsselt abgelegt. CometRow verwahrt den Schlüssel. Deshalb sind Ihre Daten nach der Anmeldung auf allen Ihren Geräten verfügbar, und wir können sie für Sie wiederherstellen. Das bedeutet auch, dass unsere Systeme technisch darauf zugreifen können. Wir tun das nur, um den Dienst zu betreiben, nie zum Training von KI und nie für Werbung.",
    maxLocked: "Secure Max, gesperrt",
    maxNewChat: "Neuer Secure-Max-Chat",
    maxNewProject: "Neues Secure-Max-Projekt",
    maxLockNow: "Jetzt sperren",
    maxIsLocked: "Secure Max ist gesperrt",
    maxUnlock: "Secure Max entsperren",
    maxStartLabel: "CometRow in Secure Max öffnen",
    maxStartLine: "CometRow startet im Bereich Secure Max. Chats außerhalb bleiben, wie sie sind.",
    maxResetLabel: "Secure Max zurücksetzen",
    maxResetWarning:
      "Damit wird alles in Secure Max endgültig gelöscht: auf unserem Server und auf diesem Gerät. Ihre anderen Geräte verlieren den Zugriff, und ein neues, leeres Secure Max beginnt. Unser Support kann das nicht rückgängig machen.",
    maxResetTypeLabel: (phrase: string) => `Geben Sie ${phrase} ein, um zu bestätigen`,
    maxResetPhrase: "SECURE MAX ZURÜCKSETZEN",
    maxResetSignInFirst: "Melden Sie sich zuerst neu an und kommen Sie dann hierher zurück, um Secure Max zurückzusetzen.",
    maxResetFailed: "Das hat nicht geklappt. Nichts wurde gelöscht. Versuchen Sie es noch einmal.",
  },
});

/** The keys whose text stands word for word in docs/product-modes-20261116.md section 4. */
export const SECTION_4_KEYS = [
  "maxLabel",
  "maxLine",
  "secureLine",
  "maxDialogTitle",
  "maxDialogParagraph",
  "maxDifferentHeading",
  "maxDifferent1",
  "maxDifferent2",
  "maxDifferent3",
  "maxDifferent4",
  "maxDifferent5",
  "maxDifferent6",
  "maxDifferent7",
  "maxUnderstand",
  "maxConfirm",
  "cancel",
  "secureLabel",
  "secureLong",
] as const;

/** The "What is different" list, in order. */
export const MAX_DIFFERENCES = [
  "maxDifferent1",
  "maxDifferent2",
  "maxDifferent3",
  "maxDifferent4",
  "maxDifferent5",
  "maxDifferent6",
  "maxDifferent7",
] as const;
