// Answer modes on this device: the remembered choice, Auto's rules, the one-retry rule and
// the label. Only mode names reach the UI, never model names.
import { selectedSources } from "./conversation";
import { germanRulesQuestion, interfaceLanguage, liveText, textBlock } from "./german-rules";
import type { Lang } from "./i18n";
import { AttestationBusyError } from "./providers/inference-client";
import { IncompleteReplyError } from "./reply-stream";
import { needsCurrentInformation } from "./when-to-search";
import {
  replyLimits,
  type AnswerMode,
  type Conversation,
} from "../shared/contracts";

export type ModeChoice = "auto" | AnswerMode;
const names = textBlock({
  en: { auto: "Auto", fast: "Fast", thinking: "Thinking" },
  de: { auto: "Auto", fast: "Schnell", thinking: "Gründlich" },
});
const modeText = textBlock({
  en: {
    ...names.en,
    backup: "Answered by the backup model",
    still: (minutes: number, mode?: string) =>
      `Still thinking… (this can take up to ${minutes} minutes${mode ? ` in ${mode} mode` : ""})`,
  },
  de: {
    ...names.de,
    backup: "Vom Ersatzmodell beantwortet",
    still: (minutes: number, mode?: string) =>
      `Denkt noch nach … (das kann bis zu ${minutes} Minuten dauern${mode ? ` im Modus ${mode}` : ""})`,
  },
});
/** Mode names in the current interface language, read at each use. */
export const MODE_NAMES: Record<ModeChoice, string> = liveText(names);
const key = "privateai.answerMode";

export function readModeChoice(): ModeChoice {
  try {
    const value = localStorage.getItem(key);
    return value === "fast" || value === "thinking" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function saveModeChoice(value: ModeChoice): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Restricted storage still permits choosing a mode for this session.
  }
}

// Auto (docs/routing-and-search-20261112.md): on-device rules only. The text never leaves the
// device for routing and only the chosen mode is used. The rules follow the blind benchmarks
// and the arithmetic gate of 12 November (evaluation/routing-sim.ts): Thinking won consistently
// on code, numeric problems and time-sensitive questions answered without search; Fast was as
// good or better on long documents, German writing, health and simple questions, and faster.
const CUES = [
  // English
  /step[- ]by[- ]step/i,
  /\bexplain why\b/i,
  /\bwhy\b/i,
  /\bprove\b|\bproof\b/i,
  /\bdebug/i,
  /\bcompar(e|ing|ison)\b/i,
  /\bderive\b|\bderivation\b/i,
  /\bcalculate\b|\bcompute\b|\bsolve\b/i,
  /\banaly[sz]e\b|\banalysis\b/i,
  /\btrade-?offs?\b|\bpros and cons\b/i,
  // German
  /schritt für schritt/i,
  /\bwarum\b|\bwieso\b|\bweshalb\b/i,
  /\bbeweis/i,
  /\bdebugge/i,
  /\bvergleich/i,
  /\bberechne/i,
  /\bherleit/i,
  /\banalysiere/i,
  /\blöse\b/i,
  /vor- und nachteile/i,
  // Weighing options without the word "compare" (13 November, evaluation/german-routing-20261113).
  /(?<!\p{L})(was spricht[^.?!\n]{0,40}(?<!\p{L})(für|gegen)|vorteile|nachteile|was ist besser|lohnt sich)(?!\p{L})/iu,
  /\b(versus|vs\.?|which is better|what's better|worth it)(?!\w)/i,
  /\bthink (hard|carefully|it through)\b/i,
  /\bdenk (gründlich|genau) nach\b/i,
];
const CODE = [
  /```/,
  /^\s+at \S.*:\d+(:\d+)?\)?$/m, // JavaScript/Java stack frame
  /Traceback \(most recent call last\)/,
  /^\s*File ".+", line \d+/m,
  /\b[A-Z]\w*(Error|Exception)\b/,
  // A request to write, fix or review code, or code pasted inline.
  /\b(write|fix|refactor|implement|review|optimi[sz]e|port)\b[^.?!\n]{0,60}\b(function|method|class|script|program|code|query|regex|regexp|tests?|component|endpoint|algorithm|sql)\b/i,
  // A language name counts only with a code word ("latest Python release" is not code).
  /(?<!\p{L})(python|typescript|javascript|java|kotlin|swift|rust|golang|c\+\+|c#|php|ruby|bash|powershell|sql|postgres(ql)?|mysql|sqlite|regex|regexp|node\.js|react|html|css)(?!\p{L})[^.?!\n]{0,80}(?<!\p{L})(function|method|class|script|code|query|table|bug|error|tests?|loop|array|list|dict|regex|component|useeffect|usestate|hook|props|undefined|null|nan|fetch|promise|async|await|exception|variable|string|object|funktion|methode|klasse|skript|liste|wörterb\p{L}*|schleife|fehler\p{L}*|abfrage|tabelle|objekt|komponente)(?!\p{L})/iu,
  // The same with the code word first ("duplicates from a list in Python"); German code words too.
  /(?<!\p{L})(function|method|class|script|code|query|table|bug|error|tests?|loop|array|list|dict|component|undefined|fetch|exception|variable|funktion|methode|klasse|skript|liste|schleife|fehler\p{L}*|abfrage|tabelle|komponente)(?!\p{L})[^.?!\n]{0,80}(?<!\p{L})(python|typescript|javascript|kotlin|swift|rust|golang|c\+\+|c#|php|ruby|bash|powershell|sql|postgres(ql)?|mysql|sqlite|node\.js|react)(?!\p{L})/iu,
  /`[^`\n]+`/,
  /\b(def|function|const|let|var|class|import|return|SELECT|INSERT|UPDATE)\b[^\n]*[(){};=]/,
  /\/\^.+\$\//,
  /(?<!\p{L})(schreib\p{L}*|programmier\p{L}*|korrigier\p{L}*)(?!\p{L})[^.?!\n]{0,60}(?<!\p{L})(funktion|methode|klasse|skript|programm|code|abfrage|regex)(?!\p{L})/iu,
];
const MATHS = /[∫∑√∂]|\b(integral|derivative|equation|Gleichung|Ableitung|Integral)\b/i;
// A percentage of a number, or geometry with a figure (13 November, evaluation/german-routing-20261113).
const PERCENT_OF = /\d\s?%\s*(of|von|aus)\s*\d/i;
const GEOMETRY =
  /(?<!\p{L})(fläche|umfang|volumen|radius|durchmesser|hypotenuse|winkel|area|circumference|volume|diameter|angle)(?!\p{L})/iu;
const ARITHMETIC = /\d\s*[-+*/×÷^=]\s*\(?\d/g;
// A word problem: two or more quantities and something to work out. The arithmetic gate showed
// Thinking right far more often (82 % vs 48 % on Tinfoil; 90 % vs 48 % on Privatemode).
const QUANTITY =
  /[€$£]\s?\d|\d[\d.,]*\s?(%|€|eur\b|euro|usd\b|km\b|kg\b|g\b|ml\b|l\b|m\b|h\b|min\b|stunden?\b|hours?\b|minutes?\b|minuten\b|tage?\b|days?\b|wochen?\b|weeks?\b|jahre?n?\b|years?\b|people\b|personen\b|stück\b|pieces?\b|items?\b)/gi;
const WORK_OUT =
  /\b(how (much|many|long|far)|what (is|are|will|would) (the )?(total|price|cost|amount|result|difference|percentage|share|rate)|cheapest|total|altogether|per (person|month|year|hour)|split)\b|(?<!\p{L})(wie (viel|viele|lange|weit|hoch)|insgesamt|gesamt|pro (person|monat|jahr|stunde)|nach abzug|günstigste\p{L}*|brutto|netto|aufteilen|kostet)(?!\p{L})/iu;
// Emergencies: speed first. Fast answered the emergency prompts as well as Thinking, without
// the delay.
const URGENT =
  /\b(emergency|unconscious|not breathing|stroke|heart attack|chest pain|overdose|swallowed|seizure|severe bleeding|suicid\w*|kill myself|worst headache)\b|\b(collapsed|unresponsive|(is not|isn't|not) responding|can't breathe|cannot breathe|choking|anaphyla\w*|poison(ed|ing)?|drank (some )?(bleach|detergent|cleaner|antifreeze))\b|(?<![\d])112(?![\d])|(?<!\p{L})(notfall|bewusstlos|atmet nicht|schlaganfall|herzinfarkt|brustschmerz\p{L}*|schmerzen in der brust|verschluckt|geschluckt|krampfanfall|suizid\p{L}*|umgekippt|zusammengebrochen|reagiert nicht( mehr)?|nicht ansprechbar|keine luft|atemnot|vergiftet|vergiftung|erstickt|allergischer schock)(?!\p{L})/iu;

// Rewriting, translating and summarising given text: the words in that text ("today", "why",
// a year) are not the user's question. Fast was as good or better on these.
const TRANSFORM =
  /^\s*(please\s+)?(rewrite|rephrase|reword|translate|summari[sz]e|shorten|proofread|turn (this|these)|make (this|these)\b[^.?!\n]{0,30}\b(polite|shorter|formal|friendly))\b|(?<!\p{L})(formulier\p{L}*|übersetze|übersetz|fasse\p{L}*|zusammenfass\p{L}*|kürze|korrigiere den text|(kürzer|freundlicher|höflicher|förmlicher|lockerer) (machen|formulieren|schreiben|fassen))(?!\p{L})/iu;

export type AutoReason =
  | "urgent"
  | "code"
  | "maths"
  | "rewrite"
  | "reasoning"
  | "rules"
  | "current"
  | "simple";

/** Auto's choice and its reason, decided on this device from the latest question. */
export function autoDecision(conversation: Conversation): {
  mode: AnswerMode;
  reason: AutoReason;
} {
  const text =
    [...conversation.messages].reverse().find((m) => m.role === "user")
      ?.text ?? "";
  const web = selectedSources(conversation).some((source) => !!source.url);
  if (URGENT.test(text)) return { mode: "fast", reason: "urgent" };
  if (CODE.some((pattern) => pattern.test(text)))
    return { mode: "thinking", reason: "code" };
  if (
    MATHS.test(text) ||
    (text.match(ARITHMETIC)?.length ?? 0) >= 2 ||
    PERCENT_OF.test(text) ||
    (GEOMETRY.test(text) && /\d/.test(text)) ||
    // Two figures and something to work out; a figure need not carry a unit ("18 Stücke für 7 Kinder").
    (Math.max(text.match(QUANTITY)?.length ?? 0, text.match(/\d+([.,]\d+)*/g)?.length ?? 0) >= 2 &&
      WORK_OUT.test(text))
  )
    return { mode: "thinking", reason: "maths" };
  if (TRANSFORM.test(text)) return { mode: "fast", reason: "rewrite" };
  // German rules, fees and deadlines (docs/german-rules-20261113.md): on Privatemode Thinking
  // scored 3.0 against Fast's 1.8 without sources; with approved web results Fast suffices.
  if (germanRulesQuestion(text))
    return { mode: web ? "fast" : "thinking", reason: "rules" };
  if (CUES.some((cue) => cue.test(text)))
    return { mode: "thinking", reason: "reasoning" };
  // Without web results Thinking says more reliably what it cannot know; with them Fast
  // answers as well and much faster.
  if (!web && needsCurrentInformation(text))
    return { mode: "thinking", reason: "current" };
  return { mode: "fast", reason: "simple" };
}

/** Auto's mode only; the reason stays on this device and is never logged or sent. */
export function autoMode(conversation: Conversation): AnswerMode {
  return autoDecision(conversation).mode;
}

// Unavailable, refused or overloaded at the provider (it arrives as the relay's 502), or no first token in time.
// Not HTTP_MODEL_NOT_FOUND: a retired model is not an outage. Covering it with the backup on every
// message would be an unannounced model change, so it fails closed (docs/model-deprecation-runbook.md).
const RETRY_CODES = new Set([
  "HTTP_UPSTREAM_REJECTED",
  "HTTP_SERVICE_UNAVAILABLE",
  "TIMED_OUT",
]);
/**
 * One retry with the backup model only when no answer text arrived and the failure means the
 * model was unavailable. Never after a stop by the user or partial text. HTTP 429 is the relay's
 * own limit (allowance, spend, one request at a time) and is never retried. Nor is a refused or
 * queued-out verification (AttestationBusyError): the backup must verify too, and retrying at
 * once turned a burst into a storm (live test, 13 November). Nor is a retry
 * started with less of the message's time left than the mode allows for a first word: it
 * could not finish, so the time-out is reported instead.
 */
export function shouldRetryOnBackup(
  error: unknown,
  stoppedByUser: boolean,
  textArrived: boolean,
  msLeft: number,
  mode: AnswerMode | undefined,
): boolean {
  if (stoppedByUser || textArrived || error instanceof AttestationBusyError) return false;
  if (msLeft < replyLimits(mode).firstTextMs) return false;
  if (error instanceof IncompleteReplyError)
    return (
      !!error.diagnostic &&
      RETRY_CODES.has(error.diagnostic.code) &&
      error.diagnostic.textCharacters === 0
    );
  return error instanceof Error && error.name === "TimeoutError";
}

/** Show the waiting status after this long without answer text. */
export const STILL_THINKING_AFTER_MS = 15_000;
export function stillThinkingStatus(mode: AnswerMode | undefined, lang: Lang = interfaceLanguage()): string {
  const t = modeText[lang];
  return t.still(Math.ceil(replyLimits(mode).totalMs / 60_000), mode && t[mode]);
}

/** The reply label, e.g. "Auto · Thinking" or "Fast · Answered by the backup model"; undefined when there is nothing to say. */
export function answerLabel(
  choice: ModeChoice | undefined,
  mode: AnswerMode | undefined,
  backup: boolean,
  lang: Lang = interfaceLanguage(),
): string | undefined {
  const t = modeText[lang];
  const parts = [
    ...(mode && choice === "auto" ? [t.auto] : []),
    ...(mode ? [t[mode]] : []),
    ...(backup ? [t.backup] : []),
  ];
  return parts.length ? parts.join(" · ") : undefined;
}
