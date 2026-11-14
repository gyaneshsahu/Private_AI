// Deep research (docs/deep-research-20261114.md): the panel in Research, its approval step,
// the step list and the note kept on the answer. German has the same keys.
import { defineText } from "./core";

export const deepResearchText = defineText({
  en: {
    heading: "Deep research",
    intro: (cost: number, searches: number, pages: number, runs: number) =>
      `One question, several web searches and pages, one answer with numbered sources. One run counts as ${cost} requests and makes at most 2 requests to the secure model, ${searches} searches and ${pages} page reads. You can start ${runs} runs in 24 hours.`,
    question: "Research question",
    planNote:
      "The first step sends your question to the secure model, which proposes the search texts. Nothing is searched until you have seen and approved every text.",
    plan: "Plan the research",
    notEnough: (cost: number, left: number) =>
      `A run counts as ${cost} requests, and ${left} are left in your allowance.`,
    tooLong:
      "This conversation is too long to add research results. Start a new conversation, or take messages or attachments out of the context.",
    busy: "Wait until the current request has finished.",
    approveHeading: "Search the web for these texts?",
    approveNote: (pages: number) =>
      `Exactly these texts go to Brave Search through our server. You can change or remove each one. Our server then opens up to ${pages} result pages, preferring official sites, and reads their text. Those sites see our server's address, not yours. Nothing else from your conversation goes into a search, and no further search is made without asking you again.`,
    field: (n: number) => `Search text ${n}`,
    remove: (n: number) => `Remove search text ${n}`,
    removeShort: "Remove",
    approve: (n: number) => (n === 1 ? "Search for this text" : `Search for these ${n} texts`),
    noneLeft: "Every search text was removed. Cancel, or plan the research again.",
    cancel: "Cancel",
    stop: "Stop the research",
    steps: "Progress",
    stepPlan: "Planning",
    stepSearch: "Searching",
    stepRead: "Reading pages",
    stepWrite: "Writing the answer",
    searching: (done: number, total: number) => `Searching ${done} of ${total}`,
    reading: (done: number, total: number) => `Reading ${done} of ${total} pages`,
    waiting: "not started",
    running: "running",
    done: "done",
    failed: "failed",
    stopped: "stopped",
    planDone: (n: number) => (n === 1 ? "1 search text proposed" : `${n} search texts proposed`),
    searchDone: (sent: number, failed: number) =>
      `${sent === 1 ? "1 search" : `${sent} searches`}${failed ? `; ${failed} gave no results` : ""}`,
    readDone: (opened: number, failed: number) =>
      `${opened === 1 ? "1 page" : `${opened} pages`}${failed ? `; ${failed} could not be opened` : ""}`,
    outOfTime: "Reading stopped at the time limit; the answer uses what was read until then.",
    writeDone: "The answer is in the conversation.",
    resultDone: "The research is finished.",
    resultCancelled: "You stopped the research. Nothing more was sent after that.",
    resultTimeout: (minutes: number) =>
      `The research took longer than ${minutes} minutes and was stopped. Nothing more was sent after that.`,
    resultPlanFailed: "The plan could not be made, so nothing was searched. No automatic retry was made.",
    resultPlanRefused:
      "The plan request was not accepted, so nothing was searched. The daily limit for requests or for deep research may be reached, your allowance may be too small, or another request is still running.",
    resultSearchFailed: "No search gave results, so no answer was requested. No automatic retry was made.",
    resultWriteFailed:
      "The answer was not completed. The conversation shows what arrived. No automatic retry was made.",
    kept: (n: number) =>
      `${n === 1 ? "The 1 source" : `The ${n} sources`} found so far ${n === 1 ? "was" : "were"} added to this conversation. You can ask about ${n === 1 ? "it" : "them"} with a normal message.`,
    used: (units: number, cost: number) => `Requests counted for this run: ${units} of ${cost}.`,
    usedAtMost: (units: number, cost: number) => `Requests counted for this run: at most ${units} of ${cost}.`,
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
    planNote:
      "Der erste Schritt sendet Ihre Frage an das sichere Modell, das die Suchtexte vorschlägt. Es wird nichts gesucht, bevor Sie jeden Text gesehen und freigegeben haben.",
    plan: "Recherche planen",
    notEnough: (cost: number, left: number) =>
      `Ein Durchlauf zählt als ${cost} Anfragen, und in Ihrem Kontingent sind noch ${left} übrig.`,
    tooLong:
      "Diese Unterhaltung ist zu lang, um Rechercheergebnisse hinzuzufügen. Beginnen Sie eine neue Unterhaltung oder nehmen Sie Nachrichten oder Anhänge aus dem Kontext.",
    busy: "Warten Sie, bis die laufende Anfrage abgeschlossen ist.",
    approveHeading: "Im Web nach diesen Texten suchen?",
    approveNote: (pages: number) =>
      `Genau diese Texte gehen über unseren Server an Brave Search. Sie können jeden ändern oder entfernen. Unser Server öffnet danach bis zu ${pages} Ergebnisseiten, bevorzugt offizielle Websites, und liest ihren Text. Diese Websites sehen die Adresse unseres Servers, nicht Ihre. Sonst geht nichts aus Ihrer Unterhaltung in eine Suche, und ohne erneute Nachfrage wird nicht weiter gesucht.`,
    field: (n: number) => `Suchtext ${n}`,
    remove: (n: number) => `Suchtext ${n} entfernen`,
    removeShort: "Entfernen",
    approve: (n: number) => (n === 1 ? "Nach diesem Text suchen" : `Nach diesen ${n} Texten suchen`),
    noneLeft: "Alle Suchtexte wurden entfernt. Brechen Sie ab oder planen Sie die Recherche neu.",
    cancel: "Abbrechen",
    stop: "Recherche stoppen",
    steps: "Fortschritt",
    stepPlan: "Planen",
    stepSearch: "Suchen",
    stepRead: "Seiten lesen",
    stepWrite: "Antwort schreiben",
    searching: (done: number, total: number) => `Suche ${done} von ${total}`,
    reading: (done: number, total: number) => `Seite ${done} von ${total} wird gelesen`,
    waiting: "nicht begonnen",
    running: "läuft",
    done: "fertig",
    failed: "fehlgeschlagen",
    stopped: "gestoppt",
    planDone: (n: number) => (n === 1 ? "1 Suchtext vorgeschlagen" : `${n} Suchtexte vorgeschlagen`),
    searchDone: (sent: number, failed: number) =>
      `${sent === 1 ? "1 Suche" : `${sent} Suchen`}${failed ? `; ${failed} ohne Ergebnis` : ""}`,
    readDone: (opened: number, failed: number) =>
      `${opened === 1 ? "1 Seite" : `${opened} Seiten`}${failed ? `; ${failed} ließen sich nicht öffnen` : ""}`,
    outOfTime: "Das Lesen endete an der Zeitgrenze; die Antwort nutzt, was bis dahin gelesen wurde.",
    writeDone: "Die Antwort steht in der Unterhaltung.",
    resultDone: "Die Recherche ist abgeschlossen.",
    resultCancelled: "Sie haben die Recherche gestoppt. Danach wurde nichts mehr gesendet.",
    resultTimeout: (minutes: number) =>
      `Die Recherche dauerte länger als ${minutes} Minuten und wurde gestoppt. Danach wurde nichts mehr gesendet.`,
    resultPlanFailed:
      "Der Plan konnte nicht erstellt werden, deshalb wurde nichts gesucht. Es gab keinen automatischen neuen Versuch.",
    resultPlanRefused:
      "Die Plananfrage wurde nicht angenommen, deshalb wurde nichts gesucht. Möglicherweise ist das Tageslimit für Anfragen oder für die Tiefenrecherche erreicht, Ihr Kontingent zu klein oder eine andere Anfrage läuft noch.",
    resultSearchFailed:
      "Keine Suche ergab Ergebnisse, deshalb wurde keine Antwort angefordert. Es gab keinen automatischen neuen Versuch.",
    resultWriteFailed:
      "Die Antwort wurde nicht abgeschlossen. Die Unterhaltung zeigt, was angekommen ist. Es gab keinen automatischen neuen Versuch.",
    kept: (n: number) =>
      `${n === 1 ? "Die 1 bisher gefundene Quelle wurde" : `Die ${n} bisher gefundenen Quellen wurden`} dieser Unterhaltung hinzugefügt. Sie können mit einer normalen Nachricht danach fragen.`,
    used: (units: number, cost: number) => `Für diesen Durchlauf gezählte Anfragen: ${units} von ${cost}.`,
    usedAtMost: (units: number, cost: number) =>
      `Für diesen Durchlauf gezählte Anfragen: höchstens ${units} von ${cost}.`,
    showAnswer: "Antwort anzeigen",
    showConversation: "Unterhaltung anzeigen",
    again: "Neue Recherche",
    attachment: "Ergebnisse der Tiefenrecherche",
    note: (searches: number, searchesFailed: number, pages: number, pagesFailed: number, queries: string) =>
      `Tiefenrecherche: ${searches === 1 ? "1 Suche" : `${searches} Suchen`}${searchesFailed ? ` (${searchesFailed} ohne Ergebnis)` : ""}, ${pages === 1 ? "1 Seite" : `${pages} Seiten`}${pagesFailed ? `; ${pagesFailed} ließen sich nicht öffnen` : ""}. Gesucht nach: ${queries}. Von jeder Seite gingen nur die Abschnitte an das Modell, die auf diesem Gerät passend zur Frage gewählt wurden.`,
  },
});
