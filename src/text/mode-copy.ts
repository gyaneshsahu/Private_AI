// Where saved data lives decides what a text may promise (owner rule of 16 November,
// docs/product-modes-20261116.md section 4, docs/secure-copy-draft-20261116.md):
// - "local": no Secure switch (production today): the encrypted vault on this device.
// - "secure": Secure: saved to the account, encrypted while stored, CometRow holds the key.
// - "max": Secure Max: end-to-end encrypted with a key only the user holds. Only here "cannot read".
import { defineText } from "./core";

export type Storage = "local" | "secure" | "max";

/**
 * The text block for one storage mode: a key `x_secure` (or `x_max`) replaces `x` in that mode.
 * "local" returns the block unchanged, so today's texts stay exactly as they are.
 */
export function forStorage<T extends object>(text: T, storage: Storage = "local"): T {
  if (storage === "local") return text;
  // One object per block and mode, so a render gets the same `t` every time.
  const kept = cache.get(text)?.[storage];
  if (kept) return kept as T;
  const suffix = `_${storage}`;
  const out: Record<string, unknown> = { ...(text as Record<string, unknown>) };
  for (const [key, value] of Object.entries(text)) if (key.endsWith(suffix)) out[key.slice(0, -suffix.length)] = value;
  cache.set(text, { ...cache.get(text), [storage]: out });
  return out as T;
}
const cache = new WeakMap<object, Partial<Record<Storage, object>>>();

/**
 * Per-mode replacements for texts in files this change did not own (src/text/app.ts,
 * src/text/workspace.ts, src/text/account.ts, shared/privacy-copy.ts). Not used yet: the lead
 * resolves them as `forStorage({ ...appText[lang], ...modeCopyText[lang] }, storage).projectCreated`
 * (same for workspaceText, the account blocks and the privacy summary). Keys without a `_secure`
 * or `_max` suffix are not mode texts: `*_pictures` replace the photo notes while pictures are on.
 */
export const modeCopyText = defineText({
  en: {
    // src/text/app.ts
    projectCreated_secure: "Project created. Chats in a project are not added to the AI's context automatically.",
    projectCreated_max: "Project created. Chats in a project are not added to the AI's context automatically.",
    organized_secure: "Changes saved.",
    organized_max: "Changes saved.",
    incognitoBanner_secure:
      "Nothing from this chat is saved, not on this device and not in your account. It is gone when you start another chat, reload or sign out. This does not change what the secure server keeps for a short time or the request records we hold.",
    incognitoBanner_max:
      "Nothing from this chat is saved, not on this device and not in your account. It is gone when you start another chat, lock, reload or sign out. This does not change what the secure server keeps for a short time or the request records we hold.",
    projectsNote_secure: "Projects group your chats. They do not send other chats or files to the AI automatically.",
    projectsNote_max: "Projects group your chats. They do not send other chats or files to the AI automatically.",
    appearanceNote_secure: "This appearance choice is kept in this browser. It contains no chat content.",
    appearanceNote_max: "This appearance choice is kept in this browser. It contains no chat content.",
    savedIntro_secure:
      "Your chats are saved to your account automatically, encrypted while stored, and are on all your devices after sign-in. CometRow holds the key.",
    savedIntro_max:
      "Secure Max chats are encrypted with a key only you hold and synced to your approved devices. CometRow cannot read them.",
    titleNote_secure: "Name the conversation. It is saved automatically.",
    titleNote_max: "Name the conversation. It is saved automatically while Secure Max is unlocked.",
    footerNote_secure: "No advertising. No training on your data.",
    footerNote_max: "No advertising. No training on your data.",
    photoNote_pictures:
      "Photo to text reads printed text on this device and asks for the camera only when you press Use camera. To ask about what a picture shows, use Ask about a picture. Dictation, live voice, image creation and sharing are not connected: no permissions or media are collected for them.",
    photoNoteVoice_pictures:
      "Photo to text reads printed text on this device and asks for the camera only when you press Use camera. To ask about what a picture shows, use Ask about a picture. Dictation asks for the microphone only when you press the microphone button. Live voice, image creation and sharing are not connected: no permissions or media are collected for them.",
    // src/text/live-voice.ts menuNote (same rule: only while pictures are on)
    liveVoiceMenuNote_pictures:
      "Photo to text reads printed text on this device and asks for the camera only when you press Use camera. To ask about what a picture shows, use Ask about a picture. Dictation and live voice ask for the microphone only when you press their buttons. Image creation and sharing are not connected: no permissions or media are collected for them.",
    // src/text/workspace.ts
    searchPlaceholder_secure: "Search chats",
    searchPlaceholder_max: "Search Secure Max chats",
    vaultUnlocked_secure: "Saved to your account",
    vaultUnlocked_max: "Secure Max unlocked",
    noSaved_secure: "No chats here yet.",
    noSaved_max: "No chats here yet.",
    // src/text/account.ts
    introSession_secure:
      "Signing in opens your saved chats on any device. Secure Max, if you use it, stays locked until you unlock it.",
    exportBody_secure:
      "One file with the records this service holds about your account: your account identity and contact email, sign-in methods (never their secret keys or tokens), active sessions, security notices, request and usage records with their published cost, billing operations and any closure request. Your saved chats, files and memories are listed only by number, size and time, without their content (a search text passes through the service on the way to the search provider).",
    vaultNote_secure:
      "Your saved chats are kept with your account, so signing in on a new device brings them back. Secure Max has its own key and its own recovery key.",
    // shared/privacy-copy.ts PRIVACY_SUMMARY (binding text, not edited here)
    privacySummary_secure:
      "ID, bank and contact details are masked before a message goes to the AI, and the message is sealed so that only one checked secure server can read it on the way. What you save is stored with your account, encrypted, and CometRow holds the key.",
  },
  de: {
    projectCreated_secure: "Projekt erstellt. Chats eines Projekts werden nicht automatisch in den Kontext der KI aufgenommen.",
    projectCreated_max: "Projekt erstellt. Chats eines Projekts werden nicht automatisch in den Kontext der KI aufgenommen.",
    organized_secure: "Änderungen gespeichert.",
    organized_max: "Änderungen gespeichert.",
    incognitoBanner_secure:
      "Nichts aus diesem Chat wird gespeichert, weder auf diesem Gerät noch in Ihrem Konto. Er ist weg, sobald Sie einen anderen Chat beginnen, neu laden oder sich abmelden. Das ändert nichts daran, was der sichere Server kurzzeitig behält, und nichts an unseren Aufzeichnungen über Anfragen.",
    incognitoBanner_max:
      "Nichts aus diesem Chat wird gespeichert, weder auf diesem Gerät noch in Ihrem Konto. Er ist weg, sobald Sie einen anderen Chat beginnen, sperren, neu laden oder sich abmelden. Das ändert nichts daran, was der sichere Server kurzzeitig behält, und nichts an unseren Aufzeichnungen über Anfragen.",
    projectsNote_secure: "Projekte ordnen Ihre Chats. Sie senden andere Chats oder Dateien nicht automatisch an die KI.",
    projectsNote_max: "Projekte ordnen Ihre Chats. Sie senden andere Chats oder Dateien nicht automatisch an die KI.",
    appearanceNote_secure: "Diese Wahl der Darstellung wird in diesem Browser gespeichert. Sie enthält keine Chat-Inhalte.",
    appearanceNote_max: "Diese Wahl der Darstellung wird in diesem Browser gespeichert. Sie enthält keine Chat-Inhalte.",
    savedIntro_secure:
      "Ihre Chats werden automatisch in Ihrem Konto gespeichert, verschlüsselt abgelegt, und sind nach der Anmeldung auf allen Ihren Geräten. CometRow verwahrt den Schlüssel.",
    savedIntro_max:
      "Secure-Max-Chats werden mit einem Schlüssel verschlüsselt, den nur Sie haben, und mit Ihren freigegebenen Geräten synchronisiert. CometRow kann sie nicht lesen.",
    titleNote_secure: "Geben Sie der Unterhaltung einen Namen. Sie wird automatisch gespeichert.",
    titleNote_max: "Geben Sie der Unterhaltung einen Namen. Sie wird automatisch gespeichert, solange Secure Max entsperrt ist.",
    footerNote_secure: "Keine Werbung. Kein Training mit Ihren Daten.",
    footerNote_max: "Keine Werbung. Kein Training mit Ihren Daten.",
    photoNote_pictures:
      "Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken. Um etwas zum Inhalt eines Bildes zu fragen, verwenden Sie „Frage zu einem Bild stellen“. Diktieren, Gespräche per Stimme, Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.",
    photoNoteVoice_pictures:
      "Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken. Um etwas zum Inhalt eines Bildes zu fragen, verwenden Sie „Frage zu einem Bild stellen“. Das Diktieren fragt erst nach dem Mikrofon, wenn Sie die Mikrofon-Taste drücken. Gespräche per Stimme, Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.",
    liveVoiceMenuNote_pictures:
      "Foto zu Text liest gedruckten Text auf diesem Gerät und fragt erst nach der Kamera, wenn Sie „Kamera verwenden“ drücken. Um etwas zum Inhalt eines Bildes zu fragen, verwenden Sie „Frage zu einem Bild stellen“. Diktieren und Gespräche per Stimme fragen erst nach dem Mikrofon, wenn Sie ihre Tasten drücken. Bilderstellung und Teilen sind nicht angebunden: Dafür werden keine Berechtigungen oder Medien erfasst.",
    searchPlaceholder_secure: "Chats durchsuchen",
    searchPlaceholder_max: "Secure-Max-Chats durchsuchen",
    vaultUnlocked_secure: "In Ihrem Konto gespeichert",
    vaultUnlocked_max: "Secure Max entsperrt",
    noSaved_secure: "Hier gibt es noch keine Chats.",
    noSaved_max: "Hier gibt es noch keine Chats.",
    introSession_secure:
      "Mit der Anmeldung öffnen Sie Ihre gespeicherten Chats auf jedem Gerät. Secure Max bleibt, falls Sie es nutzen, gesperrt, bis Sie es entsperren.",
    exportBody_secure:
      "Eine Datei mit den Daten, die dieser Dienst zu Ihrem Konto speichert: Ihre Kontoidentität und Kontakt-E-Mail-Adresse, Anmeldemethoden (niemals deren geheime Schlüssel oder Tokens), aktive Sitzungen, Sicherheitshinweise, Anfrage- und Nutzungsdaten mit ihren veröffentlichten Kosten, Abrechnungsvorgänge und einen etwaigen Antrag auf Schließung. Ihre gespeicherten Chats, Dateien und Erinnerungen sind nur mit Anzahl, Größe und Zeitpunkt aufgeführt, ohne ihren Inhalt (ein Suchtext läuft auf dem Weg zum Suchanbieter durch den Dienst hindurch).",
    vaultNote_secure:
      "Ihre gespeicherten Chats liegen in Ihrem Konto. Wenn Sie sich auf einem neuen Gerät anmelden, sind sie wieder da. Secure Max hat einen eigenen Schlüssel und einen eigenen Wiederherstellungsschlüssel.",
    privacySummary_secure:
      "Identifikations-, Bank- und Kontaktangaben werden verborgen, bevor eine Nachricht an die KI geht, und die Nachricht wird versiegelt, sodass unterwegs nur ein einziger geprüfter sicherer Server sie lesen kann. Was Sie speichern, liegt verschlüsselt in Ihrem Konto, und CometRow verwahrt den Schlüssel.",
  },
});
