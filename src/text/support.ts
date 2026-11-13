// Help and problem reporting (src/SupportPanel.tsx, src/support-report.ts). The English areas,
// symptoms and guidance stay in src/support-report.ts; German mirrors their keys.
import { defineText } from "./core";
import type { SupportArea, SupportSymptom } from "../support-report";

export const supportAreasDe = {
  conversation: "Chat oder eine Antwort",
  research: "Websuche oder Quellenangaben",
  documents: "Dokumente oder Bilder",
  saved: "Gespeicherte Unterhaltungen oder Sicherung",
  account: "Anmeldung oder Kontozugang",
  billing: "Nutzung oder Zahlung",
  accessibility: "Tastatur, Screenreader oder Darstellung",
  privacy: "Anliegen zu Datenschutz oder Sicherheit",
} satisfies Record<SupportArea, string>;

export const supportSymptomsDe = {
  unavailable: "Eine Funktion war nicht verfügbar",
  incomplete: "Eine Antwort oder ein Vorgang wurde nicht abgeschlossen",
  incorrect: "Eine Antwort war falsch oder irreführend",
  unsafe: "Eine Antwort könnte Schaden anrichten",
  access: "Ich konnte auf etwas nicht zugreifen",
  usability: "Ein Bedienelement war schwer zu benutzen",
  other: "Ein anderes Problem",
} satisfies Record<SupportSymptom, string>;

export const supportGuidanceDe = {
  conversation: [
    "Eine fehlende oder abgebrochene Antwort ist keine fertige Antwort. Ein neuer Versuch startet eine neue Anfrage und kann Ihr Kontingent erneut belasten; CometRow wiederholt nicht automatisch.",
    "Prüfen Sie wichtige Antworten anhand verlässlicher Belege. Bei akuter Gefahr wenden Sie sich an den örtlichen Notruf oder eine Vertrauensperson; diese App kann keine Hilfe für Sie rufen.",
  ],
  research: [
    "Öffnen Sie die zitierte Quelle und vergleichen Sie die Aussage mit den tatsächlichen Belegen und Daten. Eine funktionierende Quellenangabe beweist nicht, dass eine Antwort stimmt.",
    "Die Websuche ist vorübergehend. Beim Neuladen oder Verlassen kann die Sitzung verloren gehen; gespeicherter Verlauf und automatische Exporte sind für Unterhaltungen mit Suche nicht verfügbar. Fügen Sie gefundene Texte nicht in eine Support-Notiz ein.",
  ],
  documents: [
    "Prüfen Sie den extrahierten Text und korrigieren Sie Fehler, bevor Sie ihn senden. Das Importieren einer Datei sendet sie nicht an das Modell.",
    "Unterstützte Formate und Grenzen sehen Sie unter „Kontext“. Versuchen Sie, ein Importproblem mit einer kleinen synthetischen Datei nachzustellen; hängen Sie Ihr Originaldokument nicht an eine Meldung an.",
  ],
  saved: [
    "Löschen Sie den Browserspeicher nicht, während Sie fehlende gespeicherte Arbeit untersuchen. Vorübergehende Entwürfe sind keine gespeicherten Stände; speichern Sie ausdrücklich, bevor Sie gehen, wenn Speichern verfügbar ist.",
    "Die Wiederherstellung der Anmeldung kann Ihre Tresor-Passphrase nicht wiederherstellen. Eine heruntergeladene verschlüsselte Sicherung braucht ihre ursprüngliche Passphrase. Das Wiederherstellen fügt Kopien zu einem entsperrten Tresor hinzu; vorhandene Stände werden nicht überschrieben.",
  ],
  account: [
    "Nutzen Sie eine Anmeldemethode, die bereits mit Ihrem Konto verknüpft ist. Geben Sie Bestätigungscodes, Wiederherstellungsdaten oder Passkeys niemals an den Support weiter.",
    "Die Wiederherstellung des Kontos und die Wiederherstellung des lokalen Tresors sind getrennt. Bei Verdacht auf einen Missbrauch Ihres Kontos nutzen Sie die Wiederherstellung des Kontos und prüfen aktive Sitzungen und verknüpfte Anmeldemethoden.",
  ],
  billing: [
    "Ein Kontingent zählt Versuche, nicht garantiert fertige Antworten und kein Guthaben in Geld. Abgebrochene Anfragen können gezählt bleiben.",
    "Bei einer ausstehenden oder unsicheren Zahlung wiederholen Sie den Bezahlvorgang nicht mehrfach. Prüfen Sie den Kontostatus und bitten Sie die Koordination der Erprobung, es zu prüfen. Senden Sie keine Kartendaten.",
  ],
  accessibility: [
    "Beschreiben Sie das Bedienelement und die Aufgabe mit einem synthetischen Beispiel. Wenn es hilft, können Sie der Koordination freiwillig Browser, Screenreader und Gerät nennen; diese Notiz erfasst sie nicht.",
    "Ein Wechsel zwischen Bereichen des Arbeitsbereichs behält Ihren Entwurf. Das Sperren des Tresors verwirft nicht gespeicherte Arbeit; lesen Sie die Warnung, bevor Sie bestätigen.",
  ],
  privacy: [
    "Brechen Sie die betroffene Aktion ab, wenn Sie eine ungewollte Offenlegung vermuten. Senden Sie den offengelegten Inhalt, Schlüssel oder Tokens nicht in einer Meldung.",
    "Teilen Sie der Koordination der Erprobung ohne private Inhalte mit, welche Aktion wann ungefähr stattfand. Das Sperren löscht keine Inhalte, die Sie bereits in die Zwischenablage kopiert oder heruntergeladen haben.",
  ],
} satisfies Record<SupportArea, readonly string[]>;

export const supportText = defineText({
  en: {
    notSelected: "Not selected",
    note: (area: string, symptom: string) =>
      `CometRow support note (format 1)\nArea: ${area}\nProblem: ${symptom}\n\nThis note contains selected categories only. No conversation, source, document, account identifier, credential or device details are attached. It has not been submitted.\n\nWhen contacting the evaluation coordinator, describe the steps using a synthetic example. Do not include passwords, verification codes, payment details, private transcripts or temporary search content.`,
    heading: "Help and problem reporting",
    intro:
      "Find a recovery step or prepare a note to share. Nothing here sends a report or attaches your workspace.",
    area: "Problem area",
    whatYouCanDo: "What you can do",
    whatHappened: "What happened",
    review: "Review your support note",
    copied:
      "Support note copied. Nothing was submitted. Your clipboard is controlled by your device.",
    copyFailed:
      "Copy was unavailable. Select the note above and copy it manually. Nothing was submitted.",
    copy: "Copy support note",
    contact:
      "A staffed support contact and response times have not been published. During this restricted evaluation, share the reviewed note with the person coordinating your access. This is not an emergency or monitored reporting service.",
  },
  de: {
    notSelected: "Nicht ausgewählt",
    note: (area: string, symptom: string) =>
      `CometRow Support-Notiz (Format 1)\nBereich: ${area}\nProblem: ${symptom}\n\nDiese Notiz enthält nur die ausgewählten Kategorien. Es sind keine Unterhaltung, Quelle, kein Dokument, keine Kontokennung, keine Anmeldedaten und keine Geräteangaben angehängt. Sie wurde nicht übermittelt.\n\nWenn Sie sich an die Koordination der Erprobung wenden, beschreiben Sie die Schritte mit einem synthetischen Beispiel. Geben Sie keine Passwörter, Bestätigungscodes, Zahlungsdaten, privaten Verläufe oder vorübergehenden Suchinhalte an.`,
    heading: "Hilfe und Problemmeldung",
    intro:
      "Finden Sie einen Schritt zur Behebung oder bereiten Sie eine Notiz zum Teilen vor. Hier wird keine Meldung gesendet und Ihr Arbeitsbereich nicht angehängt.",
    area: "Problembereich",
    whatYouCanDo: "Was Sie tun können",
    whatHappened: "Was ist passiert",
    review: "Ihre Support-Notiz prüfen",
    copied:
      "Die Support-Notiz wurde kopiert. Es wurde nichts übermittelt. Ihre Zwischenablage wird von Ihrem Gerät verwaltet.",
    copyFailed:
      "Kopieren war nicht möglich. Markieren Sie die Notiz oben und kopieren Sie sie von Hand. Es wurde nichts übermittelt.",
    copy: "Support-Notiz kopieren",
    contact:
      "Ein besetzter Support-Kontakt und Antwortzeiten wurden noch nicht veröffentlicht. Teilen Sie die geprüfte Notiz während dieser eingeschränkten Erprobung mit der Person, die Ihren Zugang koordiniert. Dies ist kein Notruf und kein überwachter Meldedienst.",
  },
});
