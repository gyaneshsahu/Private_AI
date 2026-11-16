// Chat core fixes of 16 November: one plain sentence per failed answer, the question before a new
// chat stops an answer, the hint after a picture had no readable text. German has the same keys.
import { defineText } from "./core";

const tryAgainHelpEn = "Try again in a minute. If it keeps happening, see Help.";
const tryAgainHelpDe =
  "Versuchen Sie es in einer Minute erneut. Wenn es weiter passiert, sehen Sie unter Hilfe nach.";

export const chatCoreText = defineText({
  en: {
    // One sentence per failure kind (src/chat-failures.ts). "Stopped by you." and
    // "Response timed out." stay as before: tests and saved exports use them.
    failureStopped: "Stopped by you.",
    failureTimeout: "Response timed out. Try again in a minute.",
    failureBusy: "The service is busy right now. Try again in a minute.",
    failureCapacity: "CometRow has reached its capacity for now. Please try again later.",
    failureUnavailable: "The service is not available right now. Try again in a minute.",
    failureIncomplete: "The answer was cut off before it finished.",
    failureEmpty: "No answer came back. Try again.",
    failureError: `Something went wrong. ${tryAgainHelpEn}`,
    failureMore: "What this means",
    failureExplanation:
      "This attempt is not a completed answer and is not used as context for later messages.",
    tryAgainHelp: tryAgainHelpEn,
    stopForNew: "Stop the current answer and start a new chat?",
    stopForNewUnsaved:
      "Stop the current answer and start a new chat? Unsaved changes in this chat are discarded.",
    pictureHint: "Is this a picture? You can ask about what is in it instead.",
  },
  de: {
    failureStopped: "Von Ihnen gestoppt.",
    failureTimeout: "Zeitüberschreitung bei der Antwort. Versuchen Sie es in einer Minute erneut.",
    failureBusy: "Der Dienst ist gerade ausgelastet. Versuchen Sie es in einer Minute erneut.",
    failureCapacity: "CometRow hat vorerst seine Kapazitätsgrenze erreicht. Bitte versuchen Sie es später erneut.",
    failureUnavailable:
      "Der Dienst ist gerade nicht erreichbar. Versuchen Sie es in einer Minute erneut.",
    failureIncomplete: "Die Antwort brach ab, bevor sie fertig war.",
    failureEmpty: "Es kam keine Antwort. Versuchen Sie es erneut.",
    failureError: `Etwas ist schiefgegangen. ${tryAgainHelpDe}`,
    failureMore: "Was das bedeutet",
    failureExplanation:
      "Dieser Versuch ist keine vollständige Antwort und wird nicht als Kontext für spätere Nachrichten verwendet.",
    tryAgainHelp: tryAgainHelpDe,
    stopForNew: "Die laufende Antwort stoppen und einen neuen Chat beginnen?",
    stopForNewUnsaved:
      "Die laufende Antwort stoppen und einen neuen Chat beginnen? Ungespeicherte Änderungen in diesem Chat gehen verloren.",
    pictureHint: "Ist das ein Bild? Sie können stattdessen fragen, was darauf zu sehen ist.",
  },
});
