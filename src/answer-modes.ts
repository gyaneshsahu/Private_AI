// Answer modes on this device: the remembered choice, Auto's rules, the one-retry rule and
// the label. Only mode names reach the UI, never model names.
import { selectedSources } from "./conversation";
import { IncompleteReplyError } from "./reply-stream";
import type { AnswerMode, Conversation } from "../shared/contracts";

export type ModeChoice = "auto" | AnswerMode;
export const MODE_NAMES: Record<ModeChoice, string> = {
  auto: "Auto",
  fast: "Fast",
  thinking: "Thinking",
};
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

const LONG_MESSAGE = 1200;
const LARGE_DOCUMENTS = 8000;
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
];
const CODE = [
  /```/,
  /^\s+at \S.*:\d+(:\d+)?\)?$/m, // JavaScript/Java stack frame
  /Traceback \(most recent call last\)/,
  /^\s*File ".+", line \d+/m,
  /\b[A-Z]\w*(Error|Exception)\b/,
];
const MATHS = /[∫∑√∂]|\b(integral|derivative|equation|Gleichung|Ableitung|Integral)\b/i;
const ARITHMETIC = /\d\s*[-+*/×÷^=]\s*\(?\d/g;

/** Auto: Thinking for long, document-heavy, code, maths or multi-step requests; Fast otherwise. */
export function autoMode(conversation: Conversation): AnswerMode {
  const text =
    [...conversation.messages].reverse().find((m) => m.role === "user")
      ?.text ?? "";
  const documents = selectedSources(conversation).reduce(
    (n, source) => n + source.text.length,
    0,
  );
  return text.length > LONG_MESSAGE ||
    documents > LARGE_DOCUMENTS ||
    CUES.some((cue) => cue.test(text)) ||
    CODE.some((pattern) => pattern.test(text)) ||
    MATHS.test(text) ||
    (text.match(ARITHMETIC)?.length ?? 0) >= 2
    ? "thinking"
    : "fast";
}

// Unavailable, refused or overloaded at the provider (it arrives as the relay's 502), or no first token in time.
const RETRY_CODES = new Set([
  "HTTP_UPSTREAM_REJECTED",
  "HTTP_SERVICE_UNAVAILABLE",
  "TIMED_OUT",
]);
/**
 * One retry with the backup model only when no answer text arrived and the failure means the
 * model was unavailable. Never after a stop by the user or partial text. HTTP 429 is the relay's
 * own limit (allowance, spend, one request at a time) and is never retried.
 */
export function shouldRetryOnBackup(
  error: unknown,
  stoppedByUser: boolean,
  textArrived: boolean,
): boolean {
  if (stoppedByUser || textArrived) return false;
  if (error instanceof IncompleteReplyError)
    return (
      !!error.diagnostic &&
      RETRY_CODES.has(error.diagnostic.code) &&
      error.diagnostic.textCharacters === 0
    );
  return error instanceof Error && error.name === "TimeoutError";
}

/** The reply label, e.g. "Auto · Thinking" or "Fast · Answered by the backup model"; undefined when there is nothing to say. */
export function answerLabel(
  choice: ModeChoice | undefined,
  mode: AnswerMode | undefined,
  backup: boolean,
): string | undefined {
  const parts = [
    ...(mode && choice === "auto" ? [MODE_NAMES.auto] : []),
    ...(mode ? [MODE_NAMES[mode]] : []),
    ...(backup ? ["Answered by the backup model"] : []),
  ];
  return parts.length ? parts.join(" · ") : undefined;
}
