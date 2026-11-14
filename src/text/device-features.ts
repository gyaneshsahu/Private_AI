// Read aloud and PDF export (docs/read-aloud-and-pdf-export-20261114.md).
import { defineText } from "./core";

export const deviceText = defineText({
  en: {
    readAloud: "Read aloud",
    pause: "Pause reading",
    noVoice: (language: "de" | "en") =>
      `No on-device voice for ${language === "de" ? "German" : "English"} is installed on this device, so CometRow does not read this answer aloud. CometRow never uses online voices. You can add a voice in the device settings (Windows: Time & language, then Speech. Mac, iPhone and iPad: Accessibility, then Spoken Content) and reload this page.`,
    voiceUnknown:
      "This browser does not reliably say whether its voices stay on the device. CometRow does not read aloud here, so that the answer text is sent nowhere.",
    // Spoken in the answer's language in place of things that are not prose.
    spokenLink: "link",
    spokenCode: "Code block omitted.",
    spokenFormula: "formula",
    spokenTable: "Table.",
    spokenMasked: "masked value",
    exportPdf: "Export as PDF",
    exportConversation: "Export conversation as PDF",
    question: "Question",
    answer: "Answer",
    incomplete: "This answer is incomplete.",
    sources: "Sources",
    conversationFrom: (date: string) => `Conversation from ${date}`,
    footer: (date: string) => `Exported from CometRow on ${date}. Answers can contain errors.`,
  },
  de: {
    readAloud: "Vorlesen",
    pause: "Vorlesen anhalten",
    noVoice: (language: "de" | "en") =>
      `Auf diesem Gerät ist keine Stimme für ${language === "de" ? "Deutsch" : "Englisch"} installiert, die auf dem Gerät selbst arbeitet. CometRow liest diese Antwort deshalb nicht vor. CometRow verwendet nie Online-Stimmen. Sie können eine Stimme in den Einstellungen des Geräts hinzufügen (Windows: Zeit und Sprache, dann Spracherkennung. Mac, iPhone und iPad: Bedienungshilfen, dann Gesprochene Inhalte) und diese Seite neu laden.`,
    voiceUnknown:
      "Dieser Browser gibt nicht verlässlich an, ob seine Stimmen auf dem Gerät bleiben. CometRow liest hier nicht vor, damit der Text der Antwort nirgendwohin gesendet wird.",
    spokenLink: "Link",
    spokenCode: "Codeblock ausgelassen.",
    spokenFormula: "Formel",
    spokenTable: "Tabelle.",
    spokenMasked: "verborgener Wert",
    exportPdf: "Als PDF exportieren",
    exportConversation: "Unterhaltung als PDF exportieren",
    question: "Frage",
    answer: "Antwort",
    incomplete: "Diese Antwort ist unvollständig.",
    sources: "Quellen",
    conversationFrom: (date: string) => `Unterhaltung vom ${date}`,
    footer: (date: string) => `Am ${date} aus CometRow exportiert. Antworten können Fehler enthalten.`,
  },
});
