// The account page's own questions (src/AccountAccess.tsx), which replaced window.confirm on 16 November.
import { defineText } from "./core";

export const accountConfirmText = defineText({
  en: {
    signOutText: "That session loses access to your account. Anything already copied to its device is not erased.",
    removeTitle: "Remove this sign-in method?",
  },
  de: {
    signOutText: "Die Sitzung verliert den Zugang zu Ihrem Konto. Was bereits auf ihr Gerät kopiert wurde, wird nicht gelöscht.",
    removeTitle: "Diese Anmeldemethode entfernen?",
  },
});
