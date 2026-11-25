// Activity (docs/activity-states-20261126.md): the live line, the "Thought for N s" line, loading.
import { defineText } from "./core";

export const activityText = defineText({
  en: {
    thinking: "Thinking…",
    thought: (seconds: number) => (seconds < 1 ? "Thought for a moment" : seconds === 1 ? "Thought for 1 s" : `Thought for ${seconds} s`),
    stepThinking: "Thinking",
    stepWriting: "Writing",
    readSources: (n: number) => (n === 1 ? "Read 1 source" : `Read ${n} sources`),
    reasoning: "How it reasoned",
    steps: "What it did",
    creatingImage: "Creating the image…",
    loadingChats: "Loading your chats",
  },
  de: {
    thinking: "Denkt nach…",
    thought: (seconds: number) => (seconds < 1 ? "Kurz nachgedacht" : seconds === 1 ? "1 s nachgedacht" : `${seconds} s nachgedacht`),
    stepThinking: "Nachdenken",
    stepWriting: "Schreiben",
    readSources: (n: number) => (n === 1 ? "1 Quelle gelesen" : `${n} Quellen gelesen`),
    reasoning: "So wurde überlegt",
    steps: "Das wurde getan",
    creatingImage: "Das Bild wird erstellt…",
    loadingChats: "Ihre Chats werden geladen",
  },
});
