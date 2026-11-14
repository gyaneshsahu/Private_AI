// The offline banner and the screen-reader line when an answer is finished. German has the same keys.
import { defineText } from "./core";

export const connectionText = defineText({
  en: {
    offline:
      "This device has no internet connection. Nothing can be sent until the connection is back. Your text stays here.",
    answerComplete: "Answer complete",
  },
  de: {
    offline:
      "Dieses Gerät hat keine Internetverbindung. Bis die Verbindung wieder da ist, kann nichts gesendet werden. Ihr Text bleibt hier stehen.",
    answerComplete: "Antwort vollständig",
  },
});
