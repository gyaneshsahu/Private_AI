// Runs the arithmetic post-check on a completed reply, in the browser, after
// the stream has ended and before the message is stored. It attaches counts
// only (never the model's text) and the UI shows one fixed warning. It never
// retries and never runs on streaming partials.
import { postcheck } from "./postcheck";
import type { NumberLocale } from "./numbers";

/** Owner wording, 23 October 2026. */
export const ARITHMETIC_WARNING =
  "We recalculated the figures in this answer and some did not match. Please check these numbers before you rely on them.";

/** Shown when a number's thousands and decimal marks could be read two ways; never a silent guess. */
export const AMBIGUOUS_NUMBER_WARNING =
  "A number in this answer could be read two ways (for example 1.234 as one thousand two hundred thirty-four or as one point two three four). Please check the separators before you rely on it.";

/** A coarse locale hint from the reply's own words; the parser re-judges from its numbers. */
export function replyLocale(text: string): NumberLocale {
  const de = (
    text.match(
      /\b(und|Uhr|Betrag|Rechnung|Umsatzsteuer|Minuten|Euro|brutto|netto)\b/gi,
    ) ?? []
  ).length;
  const en = (
    text.match(/\b(and|the|amount|invoice|minutes|gross|net)\b/gi) ?? []
  ).length;
  return de > en ? "de" : "en";
}

export function checkArithmetic(text: string): {
  relations: number;
  mismatches: number;
  ambiguous: number;
} {
  try {
    const result = postcheck(text, replyLocale(text));
    return {
      relations: result.relations.length,
      mismatches: result.mismatches.length,
      ambiguous: result.ambiguous,
    };
  } catch {
    // The check never breaks an answer; an unparseable reply is simply unchecked.
    return { relations: 0, mismatches: 0, ambiguous: 0 };
  }
}
