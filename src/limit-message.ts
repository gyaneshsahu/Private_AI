// The one calm message when a start finds the allowance used up (owner, 18 November 2026):
// "Limit reached. It resets at X." with no unit counts. The allowance is checked only at the start
// of a request or run, so this is shown instead of starting, never in the middle of a task.
import type { RequestAllowance } from "../shared/contracts";
import { IncompleteReplyError } from "./reply-stream";
import { chatCoreText } from "./text/chat-core";
import { textFor, uiLang, type Lang } from "./text/core";

/** The reset time as the user reads it: the clock time today, the date and time on another day. */
export function resetTime(at: string, lang: Lang, now = new Date()): string {
  const when = new Date(at);
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const time = when.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return when.toDateString() === now.toDateString()
    ? time
    : `${when.toLocaleDateString(locale, { day: "numeric", month: "short" })}, ${time}`;
}

export const limitSentence = (resetsAt: string | undefined, lang?: Lang) =>
  textFor(chatCoreText, lang).limitReached(resetsAt && resetTime(resetsAt, lang ?? uiLang()));

/** The calm sentence when `error` is the relay's limit refusal; undefined for any other error. */
export function limitReached(error: unknown, lang?: Lang): string | undefined {
  if (!(error instanceof IncompleteReplyError) || error.diagnostic?.code !== "HTTP_LIMIT_REACHED") return undefined;
  return limitSentence(error.diagnostic.resetsAt, lang);
}

/** Before a start: the calm sentence when the status already shows the period's allowance used up. */
export function limitAtStart(allowance: RequestAllowance | undefined, lang?: Lang): string | undefined {
  if (!allowance || allowance.state === "unavailable" || allowance.remaining >= 1) return undefined;
  return limitSentence(allowance.resetsAt, lang);
}
