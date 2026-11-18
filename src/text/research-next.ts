// "+" > "Deep research" (FE-07, docs/deep-research-in-chat-20261116.md): the next Send opens the
// deep research progress line in the conversation, started at once; the answer is written straight into it.
import { defineText } from "./core";

export const researchNextText = defineText({
  en: {
    armed: (cost: number) =>
      `Your next message starts deep research. One run counts as ${cost} requests.`,
    cancel: "Do not start deep research",
    tooLong: (limit: number) => `A research question can have at most ${limit.toLocaleString("en")} characters. Shorten the message, or send it as a normal message.`,
  },
  de: {
    armed: (cost: number) =>
      `Ihre nächste Nachricht startet eine Tiefenrecherche. Ein Durchlauf zählt als ${cost} Anfragen.`,
    cancel: "Keine Tiefenrecherche starten",
    tooLong: (limit: number) =>
      `Eine Recherchefrage darf höchstens ${limit.toLocaleString("de")} Zeichen haben. Kürzen Sie die Nachricht oder senden Sie sie als normale Nachricht.`,
  },
});
