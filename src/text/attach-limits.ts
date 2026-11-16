// FE-06 and FE-10 (16 November): why a "+" item is off, and the Conversation files page's own button.
import { defineText } from "./core";

export const attachLimitText = defineText({
  en: {
    fileLimit: (n: number) => `Up to ${n} files per chat. Remove one on Conversation files to add another.`,
    screenshotLimit: (n: number) => `Up to ${n} screenshots per chat.`,
    chooseFiles: "Choose files",
    dropHere: "or drop them here",
  },
  de: {
    fileLimit: (n: number) => `Höchstens ${n} Dateien pro Chat. Entfernen Sie eine unter „Dateien der Unterhaltung“, um eine weitere hinzuzufügen.`,
    screenshotLimit: (n: number) => `Höchstens ${n} Bildschirmfotos pro Chat.`,
    chooseFiles: "Dateien auswählen",
    dropHere: "oder hier ablegen",
  },
});
