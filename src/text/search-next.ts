// "+" > "Search the web" (FE-07, docs/round3-wiring-20261116.md): the next Send opens the in-chat
// approval card for exactly the typed text, instead of leaving the chat for the Research page.
import { defineText } from "./core";

export const searchNextText = defineText({
  en: {
    menu: "Search the web",
    armed: "Your next message searches the web first. After Send you see and approve the exact search text.",
    cancel: "Do not search the web",
    heading: "Search the web first?",
    without: "Answer without searching",
  },
  de: {
    menu: "Im Web suchen",
    armed: "Ihre nächste Nachricht sucht zuerst im Web. Nach dem Senden sehen Sie den genauen Suchtext und geben ihn frei.",
    cancel: "Nicht im Web suchen",
    heading: "Zuerst im Web suchen?",
    without: "Ohne Websuche antworten",
  },
});
