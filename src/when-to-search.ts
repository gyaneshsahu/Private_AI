// When to search (docs/when-to-search-20261112.md): on-device rules that spot a question needing
// current information, and the masked search text. Search is automatic (owner, 19 November): the
// app searches when these rules say so, unless the user switched off "Look things up online".
import { germanRulesQuestion, interfaceLanguage, liveText, namesCountry, textBlock } from "./german-rules";
import { describeKept, prepareSearchQuery, type IdentifierKind } from "./identifier-masking";
import { disclosureSchema } from "../shared/contracts";
import type { Lang } from "./i18n";

// Always time-sensitive. \p{L} boundaries so German umlauts count as letters.
const TIME = [
  /\b(current|currently|latest|newest|today|today's|tonight|recent|recently|yesterday|in the news)\b/i,
  /\b(right now|as of now|at the moment|these days|this (week|month|year)|last week|still valid|in force|who won|election results?)\b/i,
  /(?<!\p{L})(aktuell\p{L}*|derzeit|zurzeit|momentan|im moment|heute|heutige\p{L}*|neueste\p{L}*|neuste\p{L}*|gestern|wahlergebnis\p{L}*)(?!\p{L})/iu,
  /(?<!\p{L})(diese woche|diesen monat|dieses jahr|in diesem jahr|letzte woche|noch gültig|in kraft|wer hat gewonnen)(?!\p{L})/iu,
  // Coming days, weather and a state that changes (13 November, evaluation/german-routing-20261113).
  /\b(tomorrow|this weekend|next week|weather|forecast|still (open|closed|available|in stock))\b/i,
  /(?<!\p{L})(übermorgen|am wochenende|dieses wochenende|nächste woche|wetter|wettervorhersage|noch (gesperrt|geöffnet|offen|geschlossen|verfügbar|lieferbar))(?!\p{L})/iu,
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

// The user asks for a look-up in words (owner, 19 November: search is automatic, so asking is enough).
const ASKED = [
  /\b(search (the )?(web|internet|online)|look (it|this|that) up|look up online|google (it|this|that)|find (it |this )?online|check online|browse (the web|online))\b/i,
  /(?<!\p{L})(such\p{L}* (im|in dem) (web|internet)|im (web|internet) (nach)?such\p{L}*|online (nach)?such\p{L}*|schlag\p{L}* (das |es )?(online )?nach|recherchier\p{L}*|googl\p{L}*)(?!\p{L})/iu,
];

// The words of an explicit request at the start of a message, left out of the search text.
const ASK_PHRASE =
  /^\s*(?:please\s+|bitte\s+)?(?:(?:can|could|would) you\s+(?:please\s+)?|kannst du\s+(?:bitte\s+)?|können sie\s+(?:bitte\s+)?)?(?:search (?:the )?(?:web|internet|online) for|look (?:this|it|that) up(?: online)?|look up online|google|find online|such(?:e|en sie)? (?:im|in dem) (?:web|internet) nach|recherchier(?:e|en sie)?(?: bitte)?|schlag(?:e)? (?:das |es )?(?:online )?nach)\s*[:,-]?\s*/iu;

export function needsCurrentInformation(text: string, now = new Date()): boolean {
  if (TIME.some((rule) => rule.test(text)) || ASKED.some((rule) => rule.test(text))) return true;
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
 * The search text for a question, identifiers removed; undefined when the question needs no
 * search. Also for German rules, fees and deadlines (src/german-rules.ts), flagged `rules`.
 * `rulesAnswer`: the answer to this question stated unchecked rules (the answer-side check).
 * A rules question that names no country gets "Germany" ("Deutschland" for a German interface or
 * a German question) at the end (owner decision of 14 November 2026), so the results are not
 * another country's rules. The server adds nothing.
 */
export function searchSuggestion(
  text: string,
  now = new Date(),
  rulesAnswer = false,
  lang = interfaceLanguage(),
) {
  const rules = rulesAnswer || germanRulesQuestion(text);
  if (!rules && !needsCurrentInformation(text, now)) return undefined;
  // "Search the web for X" searches X: the request words themselves are left out.
  const asked = text.replace(ASK_PHRASE, "").trim();
  // Identifiers are removed first; the country goes on the masked text.
  const prepared = prepareSearchQuery(asked.length >= 2 ? asked : text);
  const country =
    rules && !namesCountry(text) ? (lang === "de" || GERMAN_TEXT.test(text) ? " Deutschland" : " Germany") : "";
  // The country is left off rather than losing the suggestion to the length limit.
  const value = prepared.value.length + country.length <= 200 ? prepared.value + country : prepared.value;
  return value.length >= 2 && value.length <= 200 ? { ...prepared, value, rules } : undefined;
}
// A German question in an English interface: an umlaut or a common German word.
const GERMAN_TEXT =
  /[äöüß]|(?<!\p{L})(ich|wie|wann|welche\p{L}*|der|das|und|ist|mein\p{L}*|muss|darf|kostet|eine[mnr]?|fuer|bei|gibt)(?!\p{L})/iu;

/**
 * A search text from a deep research plan or a scheduled task. It is masked again by the same
 * function as an automatic search, and the server's own rule for a
 * search (shared/contracts.ts: 2 to 400 characters after trimming) is checked here, so an edited
 * text is never refused silently. `value` is what the tap sends. `removed` and `note` also count
 * what the suggestion had already removed from the question. Line breaks become spaces.
 */
export function editedSearchText(
  typed: string,
  already: Partial<Record<IdentifierKind, number>> = {},
  lang: Lang = interfaceLanguage(),
) {
  const prepared = prepareSearchQuery(typed.replace(/\s+/g, " "), lang);
  const removed = { ...already };
  for (const [kind, count] of Object.entries(prepared.removed) as [IdentifierKind, number][])
    removed[kind] = (removed[kind] ?? 0) + count;
  const problem: "short" | "long" | undefined = disclosureSchema.safeParse({
    kind: "search",
    value: prepared.value,
  }).success
    ? undefined
    : prepared.value.length > 400
      ? "long"
      : "short";
  return { ...prepared, removed, note: describeKept(removed, lang, "removed"), problem };
}

// "Look things up online" (owner, 19 November): on unless the user switched it off on this device.
const LOOK_UP_KEY = "privateai.lookUpOnline";
export function readLookUp(): boolean {
  try {
    return localStorage.getItem(LOOK_UP_KEY) !== "off";
  } catch {
    return true;
  }
}
export function saveLookUp(on: boolean): void {
  try {
    if (on) localStorage.removeItem(LOOK_UP_KEY);
    else localStorage.setItem(LOOK_UP_KEY, "off");
  } catch {
    // Restricted storage still keeps the choice for this session.
  }
}

export const WHEN_TO_SEARCH_TEXT = textBlock({
  en: {
    lookUpLabel: "Look things up online",
    lookUpHelp:
      "CometRow searches the web when a question needs current information. Personal details such as email addresses and bank numbers are removed first. Turn this off to get answers without a web search.",
    // Under an answer that used a search: a short line that opens to the searched text and the sources.
    searchedWeb: "Searched the web",
    searchedFor: (query: string) => `Searched for: “${query}”`,
    sourcesNotKept: "The search results are not kept with a saved chat.",
    automaticFailed:
      "The web search did not complete, so this answer does not use web results.",
  },
  de: {
    lookUpLabel: "Online nachschlagen",
    lookUpHelp:
      "CometRow sucht im Web, wenn eine Frage aktuelle Informationen braucht. Persönliche Angaben wie E-Mail-Adressen und Kontonummern werden vorher entfernt. Schalten Sie das aus, um Antworten ohne Websuche zu erhalten.",
    searchedWeb: "Im Web gesucht",
    searchedFor: (query: string) => `Gesucht nach: „${query}“`,
    sourcesNotKept: "Die Suchergebnisse werden mit einem gespeicherten Chat nicht aufbewahrt.",
    automaticFailed:
      "Die Websuche wurde nicht abgeschlossen, daher nutzt diese Antwort keine Ergebnisse aus der Websuche.",
  },
});
/** The block in the current interface language, read at each use. */
export const WHEN_TO_SEARCH = liveText(WHEN_TO_SEARCH_TEXT);
