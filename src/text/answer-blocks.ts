// Answer blocks (docs/answer-blocks-20261126.md): the few words the blocks need of their own.
import { defineText } from "./core";

export const answerBlocksText = defineText({
  en: {
    diagram: "Diagram",
    quiz: "Quick check",
    showAnswer: "Show the answer",
    explore: "Cases",
    leadsTo: (from: string, to: string, label?: string) => `${from} leads to ${to}${label ? ` (${label})` : ""}`,
  },
  de: {
    diagram: "Schaubild",
    quiz: "Kurztest",
    showAnswer: "Antwort zeigen",
    explore: "Fälle",
    leadsTo: (from: string, to: string, label?: string) => `${from} führt zu ${to}${label ? ` (${label})` : ""}`,
  },
});
