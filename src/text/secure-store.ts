// Texts of the Secure wiring (docs/secure-store-20261116.md). The mode names and descriptions are
// in src/text/modes.ts. Nothing here may say or imply that nobody can read Secure content.
import { defineText } from "./core";

export const secureStoreText = defineText({
  en: {
    captionSecure: "Secure · Saved to your account automatically",
    captionMax: "Secure Max · Saved automatically while unlocked",
    captionMaxLocked: "Secure Max · Not saved until Secure Max is unlocked",
    searchMax: "Search Secure Max chats",
    maxProjects: "Secure Max projects",
    maxChats: "Secure Max chats",
    maxEmpty: "No Secure Max chats yet.",
    otherMode: "A chat stays in its mode. It cannot move to a project in the other mode.",
    unavailable: "Your saved chats could not be loaded. Check the connection and reload the page.",
    saveFailed: "This chat could not be saved yet. CometRow will try again after the next message.",
    unsentSignOut: "Some changes have not reached your account yet. If you sign out now, they are deleted from this device. Sign out anyway?",
    maxResetDone: "Secure Max was reset on our server and on this device. Unlock Secure Max to start a new one. Your Secure chats are unchanged.",
  },
  de: {
    captionSecure: "Secure · Wird automatisch in Ihrem Konto gespeichert",
    captionMax: "Secure Max · Wird automatisch gespeichert, solange entsperrt",
    captionMaxLocked: "Secure Max · Wird erst gespeichert, wenn Secure Max entsperrt ist",
    searchMax: "Secure-Max-Chats durchsuchen",
    maxProjects: "Secure-Max-Projekte",
    maxChats: "Secure-Max-Chats",
    maxEmpty: "Noch keine Secure-Max-Chats.",
    otherMode: "Ein Chat bleibt in seinem Modus. Er kann nicht in ein Projekt des anderen Modus verschoben werden.",
    unavailable: "Ihre gespeicherten Chats konnten nicht geladen werden. Prüfen Sie die Verbindung und laden Sie die Seite neu.",
    saveFailed: "Dieser Chat konnte noch nicht gespeichert werden. CometRow versucht es nach der nächsten Nachricht erneut.",
    unsentSignOut: "Einige Änderungen sind noch nicht in Ihrem Konto angekommen. Wenn Sie sich jetzt abmelden, werden sie auf diesem Gerät gelöscht. Trotzdem abmelden?",
    maxResetDone: "Secure Max wurde auf unserem Server und auf diesem Gerät zurückgesetzt. Entsperren Sie Secure Max, um neu zu beginnen. Ihre Secure-Chats bleiben unverändert.",
  },
});
