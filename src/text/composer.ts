// The message box: the Enter hint, the length limit, dropping files, jump to latest and the
// short "Copied" on a button. German has the same keys.
import { defineText } from "./core";

export const composerText = defineText({
  en: {
    enterHint: "Enter sends · Shift+Enter makes a new line",
    limitCut: (max: string) =>
      `The message was cut at ${max} characters. Attach long text as a file instead.`,
    remaining: (left: string) => `${left} characters left`,
    dropHere: "Drop files here to add them to this conversation",
    dropBusy: "Wait until the current step is finished, then add the file again.",
    jumpLatest: "Jump to latest",
    copied: "Copied",
  },
  de: {
    enterHint: "Enter sendet · Umschalt+Enter macht eine neue Zeile",
    limitCut: (max: string) =>
      `Die Nachricht wurde bei ${max} Zeichen abgeschnitten. Hängen Sie langen Text besser als Datei an.`,
    remaining: (left: string) => `Noch ${left} Zeichen`,
    dropHere: "Dateien hier ablegen, um sie dieser Unterhaltung hinzuzufügen",
    dropBusy: "Warten Sie, bis der laufende Schritt fertig ist, und fügen Sie die Datei dann erneut hinzu.",
    jumpLatest: "Zur neuesten Nachricht",
    copied: "Kopiert",
  },
});
