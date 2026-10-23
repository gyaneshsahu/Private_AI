// Locale number parser (Phase 0 of the arithmetic v2 work, 23 October 2026).
// Reads one written number token in the German (1.234,56), English (1,234.56)
// or Swiss (1'234.56, 1’234,56, 1 234.56) convention and returns its canonical
// decimal string. A token that two conventions read differently ("1.234",
// "1,234") is reported as ambiguous unless the caller names the locale; the
// parser never guesses. Pure functions; no model, no network.
import Decimal from "decimal.js";

/** "de": comma decimal, dot grouping. "en": dot decimal, comma grouping. "ch": apostrophe or space grouping, dot or comma decimal. */
export type ParseLocale = "de" | "en" | "ch";

export type ParsedNumber =
  | { kind: "value"; value: string; percent: boolean; hint?: "de" | "en" }
  | {
      kind: "ambiguous";
      percent: boolean;
      readings: { locale: "de" | "en"; value: string }[];
    }
  | { kind: "invalid"; reason: string };

const GROUP_MARKS = /['’′    ]/;

/** Canonical form: optional "-", no leading zeros beyond one, no trailing zeros in the fraction, dot decimal. */
export function canonicalDecimal(sign: string, integer: string, fraction?: string): string {
  const int = integer.replace(/^0+(?=\d)/, "");
  const frac = (fraction ?? "").replace(/0+$/, "");
  const body = frac ? `${int}.${frac}` : int;
  return body === "0" ? "0" : `${sign}${body}`;
}

export function parseLocaleNumber(rawInput: string, locale?: ParseLocale): ParsedNumber {
  let raw = rawInput.trim();
  let percent = false;
  if (/\s?%$/.test(raw)) {
    percent = true;
    raw = raw.replace(/\s?%$/, "").trim();
  }
  let sign = "";
  if (/^[-−–]/.test(raw)) {
    sign = "-";
    raw = raw.slice(1).trim();
  } else if (raw.startsWith("+")) raw = raw.slice(1).trim();
  if (!/^\d/.test(raw) || !/[\d]$/.test(raw))
    return { kind: "invalid", reason: "not a number token" };
  if (!/^[\d.,'’′    ]+$/.test(raw))
    return { kind: "invalid", reason: "unexpected character" };

  const value = (integer: string, fraction?: string, hint?: "de" | "en"): ParsedNumber => ({
    kind: "value",
    value: canonicalDecimal(sign, integer, fraction),
    percent,
    ...(hint ? { hint } : {}),
  });

  // Swiss or typographic grouping: 1'234'567.89, 1’234,56, 1 234.56
  if (GROUP_MARKS.test(raw)) {
    const m = /^(\d{1,3}(?:['’′    ]\d{3})+)(?:([.,])(\d+))?$/.exec(raw);
    if (!m) return { kind: "invalid", reason: "malformed grouping" };
    const integer = m[1].replace(/\D/g, "");
    // After apostrophe or space grouping, a dot or comma can only be the decimal mark.
    return value(integer, m[3], m[2] === "," ? "de" : m[2] === "." ? "en" : undefined);
  }

  const dots = (raw.match(/\./g) ?? []).length;
  const commas = (raw.match(/,/g) ?? []).length;
  if (!dots && !commas) return value(raw);

  if (dots && commas) {
    const last = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
    const decimalMark = raw[last];
    const groupMark = decimalMark === "." ? "," : ".";
    const integerPart = raw.slice(0, last);
    const fraction = raw.slice(last + 1);
    if (!/^\d+$/.test(fraction) || integerPart.includes(decimalMark))
      return { kind: "invalid", reason: "two decimal marks" };
    const groups = integerPart.split(groupMark);
    if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some((g) => !/^\d{3}$/.test(g)))
      return { kind: "invalid", reason: "malformed grouping" };
    const hint = decimalMark === "," ? "de" : "en";
    if (locale === "de" && hint !== "de") return { kind: "invalid", reason: "English separators in a German number" };
    if (locale === "en" && hint !== "en") return { kind: "invalid", reason: "German separators in an English number" };
    return value(groups.join(""), fraction, hint);
  }

  const mark = dots ? "." : ",";
  const parts = raw.split(mark);
  if (parts.length > 2) {
    // Only grouping can repeat: 1.234.567 or 1,234,567.
    if (!/^\d{1,3}$/.test(parts[0]) || parts.slice(1).some((p) => !/^\d{3}$/.test(p)))
      return { kind: "invalid", reason: "malformed grouping" };
    if (locale === "ch") return { kind: "invalid", reason: "Swiss numbers group with an apostrophe or space" };
    const hint = mark === "." ? "de" : "en";
    if ((locale === "de" && hint !== "de") || (locale === "en" && hint !== "en"))
      return { kind: "invalid", reason: `repeated ${mark === "." ? "dot" : "comma"} is grouping, not a decimal mark, in this locale` };
    return value(parts.join(""), undefined, hint);
  }
  const [integer, fraction] = parts;
  if (!/^\d+$/.test(integer) || !/^\d+$/.test(fraction))
    return { kind: "invalid", reason: "malformed number" };
  const decimalReading = (hint: "de" | "en") => value(integer, fraction, hint);
  const groupedReading = (hint: "de" | "en") => value(integer + fraction, undefined, hint);
  const canGroup = fraction.length === 3 && /^\d{1,3}$/.test(integer) && !/^0/.test(integer);
  const decimalLocaleOfMark: "de" | "en" = mark === "," ? "de" : "en";
  const groupLocaleOfMark: "de" | "en" = mark === "," ? "en" : "de";
  if (locale === "ch") return decimalReading(decimalLocaleOfMark);
  if (!canGroup) {
    // A lone separator with one, two or four+ digits after it is a decimal mark in both conventions.
    if (locale !== undefined && locale !== decimalLocaleOfMark)
      return { kind: "invalid", reason: `${mark === "," ? "comma" : "dot"} is not the decimal mark in this locale` };
    return decimalReading(decimalLocaleOfMark);
  }
  if (locale === decimalLocaleOfMark) return decimalReading(locale);
  if (locale === groupLocaleOfMark) return groupedReading(locale);
  return {
    kind: "ambiguous",
    percent,
    readings: [
      { locale: "de", value: mark === "," ? canonicalDecimal(sign, integer, fraction) : canonicalDecimal(sign, integer + fraction) },
      { locale: "en", value: mark === "." ? canonicalDecimal(sign, integer, fraction) : canonicalDecimal(sign, integer + fraction) },
    ],
  };
}

export type RoundingMode =
  | "half-up"
  | "half-even"
  | "half-down"
  | "down"
  | "up"
  | "swiss-0.05";

const D = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -40, toExpPos: 40 });

const modeOf: Record<Exclude<RoundingMode, "swiss-0.05">, Decimal.Rounding> = {
  "half-up": Decimal.ROUND_HALF_UP,
  "half-even": Decimal.ROUND_HALF_EVEN,
  "half-down": Decimal.ROUND_HALF_DOWN,
  down: Decimal.ROUND_DOWN,
  up: Decimal.ROUND_UP,
};

/** Rounds a decimal string. "half-up" is commercial rounding (away from zero at the half). "swiss-0.05" rounds to the nearest five centimes, half up. */
export function roundDecimal(value: string | Decimal, decimals: number, mode: RoundingMode = "half-up"): string {
  const x = new D(value);
  if (mode === "swiss-0.05") {
    if (decimals !== 2) throw new Error("swiss-0.05 rounding is defined for two decimals");
    return x.times(20).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).div(20).toFixed(2);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 12) throw new Error("decimals must be 0..12");
  return x.toDecimalPlaces(decimals, modeOf[mode]).toFixed(decimals);
}

/**
 * Writes a canonical decimal in a locale: "12345.5" → "12.345,50" (de),
 * "12,345.50" (en), "12’345.50" (ch). Grouping is used only where the written
 * form stays unambiguous in every convention: a fraction of one, two or four
 * or more digits must be present and the integer part must have five or more
 * digits, so "1.234" (one thousand or one point two three four) is never written.
 */
export function formatLocaleNumber(value: string | Decimal, decimals: number, locale: ParseLocale, group = true): string {
  const fixed = new D(value).toFixed(decimals);
  const negative = fixed.startsWith("-");
  const [integer, fraction] = fixed.replace(/^-/, "").split(".");
  const groupMark = locale === "de" ? "." : locale === "en" ? "," : "’";
  const decimalMark = locale === "de" ? "," : ".";
  const safeToGroup = group && integer.length > 4 && decimals > 0 && decimals !== 3;
  const grouped = safeToGroup ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupMark) : integer;
  return `${negative ? "-" : ""}${grouped}${fraction !== undefined ? decimalMark + fraction : ""}`;
}
