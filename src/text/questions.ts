// Titles and buttons of the app's own questions (src/App.tsx `ask`), which replaced the browser's
// window.confirm on 16 November (FE-14, SS-16, CC-24). The question texts stay in their own blocks.
import { defineText } from "./core";

export const questionText = defineText({
  en: {
    discardTitle: "Discard changes?",
    discard: "Discard",
    stopTitle: "Stop the answer?",
    stop: "Stop and start new chat",
    canvasTitle: "Replace the canvas text?",
    canvasReplace: "Replace",
    signOutTitle: "Sign out anyway?",
    signOut: "Sign out",
    cancel: "Cancel",
  },
  de: {
    discardTitle: "Änderungen verwerfen?",
    discard: "Verwerfen",
    stopTitle: "Antwort stoppen?",
    stop: "Stoppen und neuen Chat beginnen",
    canvasTitle: "Text im Canvas ersetzen?",
    canvasReplace: "Ersetzen",
    signOutTitle: "Trotzdem abmelden?",
    signOut: "Abmelden",
    cancel: "Abbrechen",
  },
});
