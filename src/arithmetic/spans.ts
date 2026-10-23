// Design A, step 1 (arithmetic v2, 23 October 2026): our code assigns an id
// to every number, clock time, duration and date in the user's text before
// the model sees it. The model may then refer to operands only by these ids
// (or by a named constant); it never types a number. Pure; no model.
import { extractMentions, type NumberLocale } from "./numbers";
import { quoteNumberLocale } from "../number-evidence";
import { D, type Dec } from "./evaluator";

export type SpanKind = "number" | "time" | "duration" | "date";
export type Span = {
  /** t<turn>n<index>, e.g. t1n3. */
  id: string;
  turn: number;
  kind: SpanKind;
  /** As written, including sign. */
  text: string;
  /** Canonical decimal: number as such; time and duration in minutes; date in days since 1970-01-01. */
  value: string;
  /** A unit read from the text: EUR, USD, GBP, %, min, clock, date, or a following word. */
  unit?: string;
  /** The token could be read another way and the text gave no clue; `alt` is the other reading. */
  ambiguous: boolean;
  alt?: string;
  /** Why the span is ambiguous, for the user. */
  ambiguity?: string;
};

export const EPOCH_DAY_MS = 86400000;
export function isoToDays(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / EPOCH_DAY_MS);
}
export function daysToIso(days: number): string {
  return new Date(days * EPOCH_DAY_MS).toISOString().slice(0, 10);
}

const monthWords: Record<string, number> = {
  january: 1, jan: 1, januar: 1, february: 2, feb: 2, februar: 2, march: 3, mar: 3, märz: 3, maerz: 3,
  april: 4, apr: 4, may: 5, mai: 5, june: 6, jun: 6, juni: 6, july: 7, jul: 7, juli: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, oktober: 10, okt: 10, november: 11, nov: 11,
  december: 12, dec: 12, dezember: 12, dez: 12,
};
const monthPattern = Object.keys(monthWords).sort((a, b) => b.length - a.length).join("|");

type Draft = Omit<Span, "id" | "turn"> & { index: number; end: number };

/**
 * Spans of one user turn. `fallback` is the locale assumed for an ambiguous
 * token only when the text itself gives no clue (an unambiguous number form,
 * or the typography quoteNumberLocale recognises); such a span is marked
 * ambiguous so the answer can say which reading was used. Words of the
 * language are not treated as a clue.
 */
export function turnSpans(text: string, turn: number, fallback: NumberLocale): Span[] {
  const { text: normalised, mentions, locale } = extractMentions(text, fallback);
  const hinted = mentions.filter((m) => m.kind === "number" && m.hint).length;
  const textHasLocaleClue = hinted > 0 || quoteNumberLocale(normalised) !== undefined;
  const drafts: Draft[] = [];

  // Day and month without a year ("1 October", "18.11.") take the year of a full
  // date in the same text and are marked ambiguous so the answer says so.
  const years = mentions.flatMap((m) => (m.kind === "date" ? [+m.candidates[0].slice(0, 4)] : []));
  const year = years.length ? years[0] : undefined;
  const partials: Draft[] = [];
  if (year !== undefined) {
    const partial = new RegExp(
      `(?<![\\d.])(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(${monthPattern})\\b(?![\\s,.]*\\d{4})|(?<![\\p{L}])(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![\\s,]*\\d{4})|(?<![\\d.,])(\\d{1,2})\\.(\\d{1,2})\\.(?![\\d])`,
      "giu",
    );
    for (const m of normalised.matchAll(partial)) {
      const index = m.index!;
      const end = index + m[0].length;
      // A full date already covers this text.
      if (mentions.some((x) => x.kind !== "number" && index < x.end && end > x.index)) continue;
      const day = m[1] ? +m[1] : m[4] ? +m[4] : +m[5];
      const month = m[2] ? monthWords[m[2].toLowerCase()] : m[3] ? monthWords[m[3].toLowerCase()] : +m[6];
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) || daysToIso(isoToDays(iso)) !== iso) continue;
      partials.push({
        text: m[0].trim(),
        index,
        end,
        kind: "date",
        value: String(isoToDays(iso)),
        unit: "date",
        ambiguous: true,
        ambiguity: `"${m[0].trim()}" has no year; ${year} was taken from the text`,
      });
    }
  }
  for (const m of mentions) {
    // The day digits of a partial date are not a number of their own.
    if (m.kind === "number" && partials.some((p) => m.index >= p.index && m.end <= p.end)) continue;
    const base = { text: m.text, index: m.index, end: m.end };
    switch (m.kind) {
      case "number": {
        const unit = m.currency ?? (m.percent ? "%" : m.unitWord);
        const ambiguous = m.ambiguous && !textHasLocaleClue;
        drafts.push({
          ...base,
          kind: "number",
          value: m.value.toString(),
          ...(unit ? { unit } : {}),
          ambiguous,
          ...(m.alt ? { alt: m.alt.toString() } : {}),
          ...(ambiguous
            ? { ambiguity: `"${m.text}" was read as ${m.value.toString()} (${locale === "de" ? "German" : "English"} convention); it could also mean ${m.alt!.toString()}` }
            : {}),
        });
        break;
      }
      case "time":
        drafts.push({ ...base, kind: "time", value: String(m.minutes), unit: "clock", ambiguous: false });
        break;
      case "duration":
        drafts.push({ ...base, kind: "duration", value: m.minutes.toString(), unit: "min", ambiguous: false });
        break;
      case "date": {
        const ambiguous = m.candidates.length > 1;
        drafts.push({
          ...base,
          kind: "date",
          value: String(isoToDays(m.candidates[0])),
          unit: "date",
          ambiguous,
          ...(ambiguous
            ? {
                alt: String(isoToDays(m.candidates[1])),
                ambiguity: `"${m.text}" could be ${m.candidates[0]} (day first) or ${m.candidates[1]} (month first); read as ${m.candidates[0]}`,
              }
            : {}),
        });
        break;
      }
    }
  }
  drafts.push(...partials);
  drafts.sort((a, b) => a.index - b.index);
  return drafts.map(({ index: _i, end: _e, ...span }, i) => ({ id: `t${turn}n${i + 1}`, turn, ...span }));
}

/** Spans of every user turn so far, ids stable across turns. */
export function conversationSpans(turns: string[], fallback: NumberLocale): Span[] {
  return turns.flatMap((text, i) => turnSpans(text, i + 1, fallback));
}

/** The user's text with each span id written in front of the number it names. */
export function annotateTurn(text: string, spans: Span[], turn: number): string {
  const { text: normalised } = extractMentions(text, "en");
  let out = normalised;
  const own = spans.filter((s) => s.turn === turn);
  const placed: { index: number; span: Span }[] = [];
  let cursor = 0;
  for (const span of own) {
    const index = normalised.indexOf(span.text, cursor);
    if (index < 0) continue;
    placed.push({ index, span });
    cursor = index + span.text.length;
  }
  // Replace from the end so earlier offsets stay valid.
  for (const { index, span } of placed.reverse())
    out = `${out.slice(0, index)}[${span.id}: ${span.text}]${out.slice(index + span.text.length)}`;
  return out;
}

export function spanValue(span: Span): Dec {
  return new D(span.value);
}
