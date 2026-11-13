// When to search (docs/when-to-search-20261112.md): on-device rules that spot a question
// needing current information, the masked search text, and the opt-in automatic setting.
import { germanRulesQuestion, liveText } from "./german-rules";
import { defineText } from "./i18n";
import { prepareSearchQuery } from "./identifier-masking";

// Always time-sensitive. \p{L} boundaries so German umlauts count as letters.
const TIME = [
  /\b(current|currently|latest|newest|today|today's|tonight|recent|recently|yesterday|in the news)\b/i,
  /\b(right now|as of now|at the moment|these days|this (week|month|year)|last week|still valid|in force|who won|election results?)\b/i,
  /(?<!\p{L})(aktuell\p{L}*|derzeit|zurzeit|momentan|im moment|heute|heutige\p{L}*|neueste\p{L}*|neuste\p{L}*|gestern|wahlergebnis\p{L}*)(?!\p{L})/iu,
  /(?<!\p{L})(diese woche|diesen monat|dieses jahr|in diesem jahr|letzte woche|noch gültig|in kraft|wer hat gewonnen)(?!\p{L})/iu,
  // Office holders.
  /\bwho (is|are) (the )?(current )?(ceo|president|prime minister|chancellor|minister|mayor|head|leader|chair|chairman|chairwoman)\b/i,
  /\bwho runs\b/i,
  /(?<!\p{L})(bundeskanzler\p{L}*|bundespräsident\p{L}*|ministerpräsident\p{L}*|bürgermeister\p{L}*|vorsitzende\p{L}*|wer leitet)(?!\p{L})/iu,
  /(?<!\p{L})wer ist (der |die )?chef(in)? (von|der|des)(?!\p{L})/iu,
];
// Time-sensitive unless the question asks to explain or define.
const TOPIC = [
  /\b(prices?|costs?|fees?|fares?|tariffs?|interest rates?|exchange rates?|inflation rate|tax rates?|minimum wage)\b/i,
  /\bhow much (is|are|does|do)\b(?! *[\d.,])/i,
  /\b(opening hours|open (on|until)|closing time|timetables?|schedules?|departures?)\b/i,
  /\b(how many moons|population|how many people live|number of (members|employees|users))\b/i,
  /(?<!\p{L})(preis\p{L}*|kostet|kosten|gebühr\p{L}*|beitrag|tarif\p{L}*|zinssatz|zinsen|leitzins|wechselkurs|inflationsrate|steuersatz|mindestlohn|rundfunkbeitrag)(?!\p{L})/iu,
  /(?<!\p{L})(öffnungszeiten|geöffnet|fahrplan|abfahrt\p{L}*|termine)(?!\p{L})/iu,
  /(?<!\p{L})(wie viele monde|einwohner\p{L}*|bevölkerung|wie viele menschen leben|anzahl der mitglieder)(?!\p{L})/iu,
];
const EXPLAIN = [
  /\b(explain|define|definition|why)\b/i,
  /\bwhat does\b.*\bmean\b/i,
  /\bhow does\b.*\bwork\b/i,
  /(?<!\p{L})(erkläre|erklär|definiere|definition|was bedeutet|wie funktioniert|warum)(?!\p{L})/iu,
];

export function needsCurrentInformation(text: string, now = new Date()): boolean {
  if (TIME.some((rule) => rule.test(text))) return true;
  // A recent year, but not a number inside a calculation ("2025 * 3").
  const years =
    text.match(/(?<![\d.,+\-*/×=] ?)\b20\d{2}\b(?! ?[\d.,+\-*/×=%])/g) ?? [];
  if (years.some((year) => Number(year) >= now.getFullYear() - 1)) return true;
  return (
    TOPIC.some((rule) => rule.test(text)) &&
    !EXPLAIN.some((rule) => rule.test(text))
  );
}

/**
 * The exact search text to show, identifiers removed; undefined when not suggested. Also for
 * German rules, fees and deadlines (src/german-rules.ts), flagged `rules` for their heading.
 * `rulesAnswer`: the answer to this question stated unchecked rules (the answer-side check), so
 * the search-again box is offered even when the question itself was not recognised.
 */
export function searchSuggestion(text: string, now = new Date(), rulesAnswer = false) {
  const rules = rulesAnswer || germanRulesQuestion(text);
  if (!rules && !needsCurrentInformation(text, now)) return undefined;
  const prepared = prepareSearchQuery(text);
  return prepared.value.length >= 2 && prepared.value.length <= 200
    ? { ...prepared, rules }
    : undefined;
}

const key = "privateai.autoSearch";
// The narrower setting (13 November): only German rules, fees and deadlines are searched without
// asking. Same storage rules: this browser only, off unless switched on.
export const RULES_KEY = "privateai.autoSearchRules";
/** Off unless the user switched it on on this device. */
export function readAutoSearch(name = key): boolean {
  try {
    return localStorage.getItem(name) === "on";
  } catch {
    return false;
  }
}
export function saveAutoSearch(on: boolean, name = key): void {
  try {
    if (on) localStorage.setItem(name, "on");
    else localStorage.removeItem(name);
  } catch {
    // Restricted storage still allows the choice for this session.
  }
}

export const WHEN_TO_SEARCH_TEXT = defineText({
  en: {
    heading: "This question may need current information.",
    label: "Search the web for:",
    explanation:
      "One tap sends exactly this text to Brave Search through our server, and our server opens the top result page, preferring an official site. Nothing else from your conversation is sent. Press Send instead to answer without searching.",
    button: "Search and answer",
    // After an answer given without web results (routing design of 12 November).
    againHeading: "This answer did not use current information.",
    againExplanation:
      "One tap sends exactly this text to Brave Search through our server, our server opens the top result page, preferring an official site, and the question is answered again from the results. Nothing else from your conversation is sent.",
    againButton: "Search and answer again",
    // Unchanged wording, shared with the Research tab's approval.
    warning:
      "This search text may still contain personal details, such as a name or a long number, that cannot be recognised automatically. The search provider will see exactly this text. Approve only if that is fine.",
    researchIntro:
      "Nothing from your conversation goes into a search unless you approve the exact text here, tap a search suggestion that shows it, or switch on automatic search below.",
    settingLabel: "Search automatically when a question needs current information",
    settingHelp:
      "Off unless you switch it on. When it is on, a question that looks time-sensitive or is about rules, fees or deadlines is searched before it is answered, without asking each time. Recognised personal details are removed from the search text on this device first, and the exact text sent is shown under the message box. This setting is kept only on this device.",
    // The narrower setting, in the search-first choice and in the Research tab.
    rulesSettingLabel: "Always search for rules, fees and deadlines",
    rulesSettingNote: "Kept only on this device. You can switch it off in Research.",
    rulesSettingHelp:
      "Off unless you switch it on. When it is on, a question about rules, fees or deadlines is searched before it is answered, without asking each time; other questions still ask. Recognised personal details are removed from the search text on this device first, and the exact text sent is shown under the message box. This setting is kept only on this device.",
    searched: (query: string) => `Searched the web for: "${query}"`,
    searchedAutomatically: (query: string) =>
      `Searched the web automatically for: "${query}"`,
    automaticFailed:
      "The automatic search did not complete, so this answer does not use web results.",
  },
  de: {
    heading: "Diese Frage braucht möglicherweise aktuelle Informationen.",
    label: "Im Web suchen nach:",
    explanation:
      "Ein Tippen sendet genau diesen Text über unseren Server an Brave Search, und unser Server öffnet die oberste Ergebnisseite, bevorzugt eine offizielle Website. Sonst wird nichts aus Ihrer Unterhaltung gesendet. Tippen Sie stattdessen auf Senden, um ohne Websuche eine Antwort zu erhalten.",
    button: "Suchen und antworten",
    againHeading: "Diese Antwort hat keine aktuellen Informationen verwendet.",
    againExplanation:
      "Ein Tippen sendet genau diesen Text über unseren Server an Brave Search, unser Server öffnet die oberste Ergebnisseite, bevorzugt eine offizielle Website, und die Frage wird anhand der Ergebnisse neu beantwortet. Sonst wird nichts aus Ihrer Unterhaltung gesendet.",
    againButton: "Suchen und neu antworten",
    warning:
      "Dieser Suchtext kann noch persönliche Angaben enthalten, etwa einen Namen oder eine lange Nummer, die nicht automatisch erkannt werden. Der Suchanbieter sieht genau diesen Text. Geben Sie ihn nur frei, wenn das für Sie in Ordnung ist.",
    researchIntro:
      "Aus Ihrer Unterhaltung geht nichts in eine Suche, außer Sie geben hier den genauen Text frei, tippen auf einen Suchvorschlag, der ihn zeigt, oder schalten unten die automatische Suche ein.",
    settingLabel: "Automatisch suchen, wenn eine Frage aktuelle Informationen braucht",
    settingHelp:
      "Aus, bis Sie es einschalten. Wenn es eingeschaltet ist, wird eine Frage, die zeitabhängig wirkt oder Regeln, Gebühren oder Fristen betrifft, vor der Antwort gesucht, ohne jedes Mal zu fragen. Erkannte persönliche Angaben werden zuerst auf diesem Gerät aus dem Suchtext entfernt, und der genau gesendete Text wird unter dem Eingabefeld angezeigt. Diese Einstellung wird nur auf diesem Gerät gespeichert.",
    rulesSettingLabel: "Bei Regeln, Gebühren und Fristen immer suchen",
    rulesSettingNote: "Nur auf diesem Gerät gespeichert. Sie können es unter Recherche ausschalten.",
    rulesSettingHelp:
      "Aus, bis Sie es einschalten. Wenn es eingeschaltet ist, wird eine Frage zu Regeln, Gebühren oder Fristen vor der Antwort gesucht, ohne jedes Mal zu fragen; bei anderen Fragen wird weiterhin gefragt. Erkannte persönliche Angaben werden zuerst auf diesem Gerät aus dem Suchtext entfernt, und der genau gesendete Text wird unter dem Eingabefeld angezeigt. Diese Einstellung wird nur auf diesem Gerät gespeichert.",
    searched: (query: string) => `Im Web gesucht nach: „${query}“`,
    searchedAutomatically: (query: string) =>
      `Automatisch im Web gesucht nach: „${query}“`,
    automaticFailed:
      "Die automatische Suche wurde nicht abgeschlossen, daher nutzt diese Antwort keine Ergebnisse aus der Websuche.",
  },
});
/** The block in the current interface language (`uiLang()`), read at each use. */
export const WHEN_TO_SEARCH = liveText(WHEN_TO_SEARCH_TEXT);
