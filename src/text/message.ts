// One message in the conversation: collapsing a long own message, editing in place, the cost in
// the retry labels and the report entry (docs/chat-feature-gaps-20261114.md, packages C and D).
// German has the same keys.
import { defineText } from "./core";

export const messageText = defineText({
  en: {
    showMore: "Show more",
    showLess: "Show less",
    /** Appended to a label in brackets, e.g. "Send (uses 1 request)". */
    uses: (units: number) => `uses ${units} ${units === 1 ? "request" : "requests"}`,
    sendEdit: "Send",
    editNote: "Your earlier version and its answer stay available under Conversation branches.",
    report: "Report a problem",
    reportLabel: "Report a problem with this answer",
  },
  de: {
    showMore: "Mehr anzeigen",
    showLess: "Weniger anzeigen",
    uses: (units: number) => `verbraucht ${units} ${units === 1 ? "Anfrage" : "Anfragen"}`,
    sendEdit: "Senden",
    editNote: "Ihre frühere Fassung und deren Antwort bleiben unter „Zweige der Unterhaltung“ erhalten.",
    report: "Problem melden",
    reportLabel: "Problem melden zu dieser Antwort",
  },
});
