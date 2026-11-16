// SS-14 (16 November): the session ended while the app was open. The sign-in page says why in one
// line, and the unsent message comes back after signing in again on this tab.
import { defineText } from "./core";

export const sessionExpiryText = defineText({
  en: {
    expired: "You were signed out. Sign in again to continue.",
    draftRestored: "Your unsent message is back in the message box.",
  },
  de: {
    expired: "Sie wurden abgemeldet. Melden Sie sich erneut an, um fortzufahren.",
    draftRestored: "Ihre nicht gesendete Nachricht steht wieder im Eingabefeld.",
  },
});
