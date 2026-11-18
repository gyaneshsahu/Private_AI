// Deep research (docs/deep-research-20261114.md): the panel in Research, its progress line and
// the note kept on the answer. German has the same keys.
import { defineText } from "./core";

export const deepResearchText = defineText({
  en: {
    heading: "Deep research",
    intro: (cost: number, searches: number, pages: number, runs: number) =>
      `One question, several web searches and pages, one answer with numbered sources. One run counts as ${cost} requests and makes at most 2 requests to the secure model, ${searches} searches and ${pages} page reads. You can start ${runs} runs in 24 hours.`,
    question: "Research question",
    start: "Start research",
    tooLong:
      "This conversation is too long to add research results. Start a new conversation, or take messages or attachments out of the context.",
    busy: "Wait until the current request has finished.",
    stop: "Stop the research",
    stepPlan: "Planning",
    stepSearch: "Searching",
    stepRead: "Reading pages",
    stepWrite: "Writing the answer",
    searching: (done: number, total: number) => `Searching ${done} of ${total}`,
    reading: (done: number, total: number) => `Reading ${done} of ${total} pages`,
    resultDone: "The research is finished.",
    resultCancelled: "You stopped the research. Nothing more was sent after that.",
    resultTimeout: (minutes: number) =>
      `The research took longer than ${minutes} minutes and was stopped. Nothing more was sent after that.`,
    resultPlanFailed: "The plan could not be made, so nothing was searched. No automatic retry was made.",
    resultSearchFailed: "No search gave results, so no answer was requested. No automatic retry was made.",
    resultWriteFailed:
      "The answer was not completed. The conversation shows what arrived. No automatic retry was made.",
    kept: (n: number) =>
      `${n === 1 ? "The 1 source" : `The ${n} sources`} found so far ${n === 1 ? "was" : "were"} added to this conversation. You can ask about ${n === 1 ? "it" : "them"} with a normal message.`,
    showAnswer: "Show the answer",
    showConversation: "Show the conversation",
    again: "New research",
    attachment: "Deep research results",
    note: (searches: number, searchesFailed: number, pages: number, pagesFailed: number, queries: string) =>
      `Deep research: ${searches === 1 ? "1 search" : `${searches} searches`}${searchesFailed ? ` (${searchesFailed} gave no results)` : ""}, ${pages === 1 ? "1 page" : `${pages} pages`}${pagesFailed ? `; ${pagesFailed} could not be opened` : ""}. Searched for: ${queries}. Of each page, only the passages chosen on this device to match the question were given to the model.`,
  },
  de: {
    heading: "Tiefenrecherche",
    intro: (cost: number, searches: number, pages: number, runs: number) =>
      `Eine Frage, mehrere Websuchen und Seiten, eine Antwort mit nummerierten Quellen. Ein Durchlauf zählt als ${cost} Anfragen und umfasst höchstens 2 Anfragen an das sichere Modell, ${searches} Suchen und ${pages} gelesene Seiten. Sie können ${runs} Durchläufe in 24 Stunden starten.`,
    question: "Recherchefrage",
    start: "Recherche starten",
    tooLong:
      "Diese Unterhaltung ist zu lang, um Rechercheergebnisse hinzuzufügen. Beginnen Sie eine neue Unterhaltung oder nehmen Sie Nachrichten oder Anhänge aus dem Kontext.",
    busy: "Warten Sie, bis die laufende Anfrage abgeschlossen ist.",
    stop: "Recherche stoppen",
    stepPlan: "Planen",
    stepSearch: "Suchen",
    stepRead: "Seiten lesen",
    stepWrite: "Antwort schreiben",
    searching: (done: number, total: number) => `Suche ${done} von ${total}`,
    reading: (done: number, total: number) => `Seite ${done} von ${total} wird gelesen`,
    resultDone: "Die Recherche ist abgeschlossen.",
    resultCancelled: "Sie haben die Recherche gestoppt. Danach wurde nichts mehr gesendet.",
    resultTimeout: (minutes: number) =>
      `Die Recherche dauerte länger als ${minutes} Minuten und wurde gestoppt. Danach wurde nichts mehr gesendet.`,
    resultPlanFailed:
      "Der Plan konnte nicht erstellt werden, deshalb wurde nichts gesucht. Es gab keinen automatischen neuen Versuch.",
    resultSearchFailed:
      "Keine Suche ergab Ergebnisse, deshalb wurde keine Antwort angefordert. Es gab keinen automatischen neuen Versuch.",
    resultWriteFailed:
      "Die Antwort wurde nicht abgeschlossen. Die Unterhaltung zeigt, was angekommen ist. Es gab keinen automatischen neuen Versuch.",
    kept: (n: number) =>
      `${n === 1 ? "Die 1 bisher gefundene Quelle wurde" : `Die ${n} bisher gefundenen Quellen wurden`} dieser Unterhaltung hinzugefügt. Sie können mit einer normalen Nachricht danach fragen.`,
    showAnswer: "Antwort anzeigen",
    showConversation: "Unterhaltung anzeigen",
    again: "Neue Recherche",
    attachment: "Ergebnisse der Tiefenrecherche",
    note: (searches: number, searchesFailed: number, pages: number, pagesFailed: number, queries: string) =>
      `Tiefenrecherche: ${searches === 1 ? "1 Suche" : `${searches} Suchen`}${searchesFailed ? ` (${searchesFailed} ohne Ergebnis)` : ""}, ${pages === 1 ? "1 Seite" : `${pages} Seiten`}${pagesFailed ? `; ${pagesFailed} ließen sich nicht öffnen` : ""}. Gesucht nach: ${queries}. Von jeder Seite gingen nur die Abschnitte an das Modell, die auf diesem Gerät passend zur Frage gewählt wurden.`,
  },
});
