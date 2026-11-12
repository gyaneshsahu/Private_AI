// Deterministic final-number checker for the blind benchmark (level 3 and any
// prompt whose `expected.final` is set). No model, no network.
// Token parsing reuses the product's locale-tolerant reader (src/arithmetic/numbers).
import { classifyNumberToken, normaliseText, type NumberLocale } from "../../src/arithmetic/numbers";

export type Accept = { value: number; tolerance: number };
export type MathsExpected = {
  /** A number, or a clock time "HH:MM". */
  final?: number | string;
  tolerance?: number;
  alsoAccept?: Accept[];
  /** Numbers that must appear somewhere in the reply (any order). */
  mustInclude?: number[];
};
export type MathsVerdict = "correct" | "wrong-flagged" | "silent-wrong" | "no-number";
export type MathsResult = {
  verdict: MathsVerdict;
  /** The text the final value was read from. */
  source?: string;
  found?: number | string;
  missing: number[];
};

const finalLine = /^.*\b(final answer|answer|endergebnis|ergebnis|antwort|lösung)\b\s*[:：].*$/gim;
const uncertainty =
  /\b(not (entirely |completely |fully )?(sure|certain)|uncertain|unsure|may be (wrong|incorrect)|might be (wrong|incorrect)|please (double[- ]?)?(check|verify)|could not verify|nicht (ganz )?sicher|ohne gewähr|bitte (nach)?prüfen|bitte nachrechnen|unsicher)\b/i;

// Fractions first so "2/9" is one value; thin/no-break spaces and apostrophes may group digits.
const numberToken =
  /(?<![\w.,])(-)?(?:(\d+)\s*\/\s*(\d+)|(\d[\d.,  '’]*\d|\d))/g;

function parse(raw: string, locale: NumberLocale): number | undefined {
  const c = classifyNumberToken(raw);
  if (!c) return undefined;
  return Number("value" in c ? c.value : c[locale]);
}

/** Every number in the text, in order. */
export function numbersIn(text: string, locale: NumberLocale): number[] {
  const work = normaliseText(text.replace(/\\[dt]?frac\{(\d+)\}\{(\d+)\}/g, "$1/$2"));
  const out: number[] = [];
  for (const m of work.matchAll(numberToken)) {
    const sign = m[1] ? -1 : 1;
    if (m[2]) {
      const den = Number(m[3]);
      if (den) out.push((sign * Number(m[2])) / den);
      continue;
    }
    const v = parse(m[4], locale);
    if (v !== undefined && Number.isFinite(v)) out.push(sign * v);
  }
  return out;
}

function clockTimes(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\b(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?|uhr|h)?(?!\d)/gi)) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const suffix = (m[3] ?? "").toLowerCase();
    if (h > 23 || min > 59) continue;
    if (m[0].includes(".") && !suffix) continue; // "2.25" is a decimal, not a time
    if (suffix.startsWith("p") && h < 12) h += 12;
    if (suffix.startsWith("a") && h === 12) h = 0;
    out.push(h * 60 + min);
  }
  return out;
}

/**
 * Where the reply states its result, in priority order: the last "Final answer:" /
 * "Ergebnis:" line, the last \boxed{}, the last bold span with a digit, else the whole reply
 * (last number wins).
 */
export function finalSegment(text: string): { segment: string; take: "first" | "last" } {
  const line = [...text.matchAll(finalLine)].at(-1)?.[0];
  if (line && /\d/.test(line))
    return { segment: line.slice(line.search(/[:：]/) + 1), take: "first" };
  const boxed = [...text.matchAll(/\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)].at(-1)?.[1];
  if (boxed && /\d/.test(boxed)) return { segment: boxed, take: "first" };
  const bold = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]).filter((s) => /\d/.test(s)).at(-1);
  if (bold) return { segment: bold, take: "first" };
  return { segment: text, take: "last" };
}

const near = (x: number, a: Accept) => Math.abs(x - a.value) <= a.tolerance + 1e-9;

export function checkMaths(text: string, expected: MathsExpected, locale: NumberLocale = "en"): MathsResult {
  const tol = expected.tolerance ?? 0;
  const all = numbersIn(text, locale);
  const missing = (expected.mustInclude ?? []).filter((v) => !all.some((x) => near(x, { value: v, tolerance: Math.max(tol, 1e-9) })));
  let ok = missing.length === 0;
  let found: number | string | undefined;
  let source: string | undefined;

  if (expected.final !== undefined) {
    const { segment, take } = finalSegment(text);
    source = segment.trim().slice(0, 200);
    if (typeof expected.final === "string") {
      const [h, m] = expected.final.split(":").map(Number);
      const times = clockTimes(segment);
      const t = take === "first" ? times[0] : times.at(-1);
      if (t === undefined) return { verdict: "no-number", source, missing };
      found = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      ok &&= t === h * 60 + m;
    } else {
      // A rate restated in the result line ("Ergebnis: inklusive 19 % MwSt.: 258,83 €") is not
      // the result; skip percentages unless they are the only numbers (L7-03, 12 November).
      const withoutRates = numbersIn(segment.replace(/\d+(?:[.,]\d+)?\s*%/g, " "), locale);
      // A count before the amount ("Buy 3 packs ... for €42.60") is not the result either: when
      // the line has amounts with a currency sign, read those (L3-07, 12 November).
      const money = [...segment.matchAll(/[€$£]\s*\d[\d.,]*\d|\d[\d.,]*\d?\s*(?:€|EUR|euros?)/gi)].map((m) => m[0]);
      const amounts = money.flatMap((m) => numbersIn(m, locale));
      const nums = amounts.length ? amounts : withoutRates.length ? withoutRates : numbersIn(segment, locale);
      const x = take === "first" ? nums[0] : nums.at(-1);
      if (x === undefined) return { verdict: "no-number", source, missing };
      found = x;
      const accepts = [{ value: expected.final, tolerance: tol }, ...(expected.alsoAccept ?? [])];
      ok &&= accepts.some((a) => near(x, a));
    }
  } else if (!all.length) return { verdict: "no-number", missing };

  if (ok) return { verdict: "correct", source, found, missing };
  return { verdict: uncertainty.test(text) ? "wrong-flagged" : "silent-wrong", source, found, missing };
}
