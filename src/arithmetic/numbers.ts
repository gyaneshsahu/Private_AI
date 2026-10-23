// Locale-tolerant extraction of numbers, money, percentages, clock times,
// durations and dates from a model reply. Shared by the arithmetic gate scorer
// and the provider-neutral post-check. Deterministic; no network, no model.
//
// Ambiguity policy: "1.234" and "1,234" are read according to the reply's own
// locale evidence (unambiguous tokens such as "1.234,56" or "12,5"), then the
// reply language, then the case locale. The other reading is kept as `alt` for
// diagnostics only; it never makes a required value match.
import Decimal from "decimal.js";

export const D = Decimal.clone({
  precision: 60,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});
export type Dec = InstanceType<typeof D>;
export type NumberLocale = "de" | "en";
export type Currency = "EUR" | "USD" | "GBP";

type Span = { text: string; index: number; end: number };
export type NumberMention = Span & {
  kind: "number";
  value: Dec;
  alt?: Dec;
  ambiguous: boolean;
  hint?: NumberLocale;
  currency?: Currency;
  percent: boolean;
  unitWord?: string;
  decimals: number;
};
export type TimeMention = Span & { kind: "time"; minutes: number };
export type DurationMention = Span & {
  kind: "duration";
  minutes: Dec;
  /** The numeral as written and its unit, for numeric (non-clock) arithmetic. */
  amount: Dec;
  unit: "h" | "min" | "h+min";
};
export type DateMention = Span & {
  kind: "date";
  /** ISO dates; more than one when the written form is ambiguous (03/04/2026). */
  candidates: string[];
};
export type Mention =
  NumberMention | TimeMention | DurationMention | DateMention;

/** Removes Markdown/LaTeX presentation so numbers can be read. Mention indices refer to the returned string. */
export function normaliseText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:euro|EUR)\b/g, "€")
    .replace(/\{([,.])\}/g, "$1")
    .replace(/\\,/g, " ")
    .replace(/\\(?:times|cdot)/g, " × ")
    .replace(/\\div/g, " ÷ ")
    .replace(/\\approx/g, " ≈ ")
    .replace(/\\[()[\]]/g, " ")
    .replace(/\\([\\`*_{}[\]()#+\-.!|~$%])/g, "$1")
    .replace(/\*\*|__/g, "")
    .replace(/−/g, "-")
    .replace(/\b(EUR|USD|GBP)(?=\d)/g, "$1 ");
}

const monthNames: Record<string, number> = {
  january: 1,
  jan: 1,
  januar: 1,
  jänner: 1,
  february: 2,
  feb: 2,
  februar: 2,
  march: 3,
  mar: 3,
  märz: 3,
  maerz: 3,
  mär: 3,
  mrz: 3,
  april: 4,
  apr: 4,
  may: 5,
  mai: 5,
  june: 6,
  jun: 6,
  juni: 6,
  july: 7,
  jul: 7,
  juli: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  dezember: 12,
  dez: 12,
};
const monthPattern = Object.keys(monthNames)
  .sort((a, b) => b.length - a.length)
  .join("|");

function isoDate(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (
    t.getUTCFullYear() !== y ||
    t.getUTCMonth() !== m - 1 ||
    t.getUTCDate() !== d
  )
    return undefined;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type Classified =
  { value: string; hint?: NumberLocale } | { de: string; en: string };

/** Reads one numeric token (no sign) under both locales. Undefined when malformed. */
export function classifyNumberToken(raw: string): Classified | undefined {
  if (/[   '’]/.test(raw)) {
    const m = /^(\d{1,3}(?:[   '’]\d{3})+)(?:([.,])(\d+))?$/.exec(raw);
    if (!m) return undefined;
    const int = m[1].replace(/\D/g, "");
    return {
      value: m[3] ? `${int}.${m[3]}` : int,
      hint: m[2] === "," ? "de" : m[2] === "." ? "en" : undefined,
    };
  }
  const dots = (raw.match(/\./g) ?? []).length;
  const commas = (raw.match(/,/g) ?? []).length;
  if (!dots && !commas) return /^\d+$/.test(raw) ? { value: raw } : undefined;
  if (dots && commas) {
    const at = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
    const dec = raw[at];
    const grp = dec === "." ? "," : ".";
    const intPart = raw.slice(0, at);
    const frac = raw.slice(at + 1);
    if (!/^\d+$/.test(frac) || intPart.includes(dec)) return undefined;
    if (!new RegExp(`^\\d{1,3}(?:\\${grp}\\d{3})+$`).test(intPart))
      return undefined;
    return {
      value: `${intPart.split(grp).join("")}.${frac}`,
      hint: dec === "," ? "de" : "en",
    };
  }
  const sep = dots ? "." : ",";
  const parts = raw.split(sep);
  if (parts.length > 2) {
    if (
      !/^[1-9]\d{0,2}$/.test(parts[0]) ||
      parts.slice(1).some((p) => !/^\d{3}$/.test(p))
    )
      return undefined;
    return { value: parts.join(""), hint: sep === "." ? "de" : "en" };
  }
  const [a, b] = parts;
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return undefined;
  if (b.length === 3 && /^[1-9]\d{0,2}$/.test(a)) {
    const grouped = a + b;
    const decimal = `${a}.${b}`;
    return sep === "."
      ? { de: grouped, en: decimal }
      : { de: decimal, en: grouped };
  }
  return { value: `${a}.${b}`, hint: sep === "," ? "de" : "en" };
}

const germanWords =
  /\b(der|die|das|und|ist|sind|für|mit|nicht|beträgt|ergibt|bei|auf|von|zu|wird|insgesamt|Betrag|Rechnung|Zinsen|Tage)\b/gi;
const englishWords =
  /\b(the|and|is|are|for|with|not|of|to|will|total|amount|invoice|interest|days|you|your)\b/gi;

function languageOf(text: string): NumberLocale | undefined {
  const de = (text.match(germanWords) ?? []).length;
  const en = (text.match(englishWords) ?? []).length;
  if (de > en) return "de";
  if (en > de) return "en";
  return undefined;
}

const currencyAfter =
  /^[    ]?(€|EUR\b|Euro\b|USD\b|US-Dollar\b|Dollar\b|\$|GBP\b|£)/i;
const currencyBefore = /(€|EUR|USD|GBP|\$|£)[    ]?$/;
const percentAfter = /^[    ]?(%|Prozent\b|percent\b|per cent\b)/i;

function currencyCode(symbol: string): Currency {
  const s = symbol.toLowerCase();
  if (s === "€" || s === "eur" || s === "euro") return "EUR";
  if (s === "£" || s === "gbp") return "GBP";
  return "USD";
}

/**
 * Extracts every recognisable quantity, in text order. `fallback` is the
 * locale used when the reply itself gives no evidence (normally the case locale).
 */
export function extractMentions(
  input: string,
  fallback: NumberLocale,
): { text: string; mentions: Mention[]; locale: NumberLocale } {
  const text = normaliseText(input);
  let work = text;
  const mentions: Mention[] = [];
  const consume = (index: number, end: number) => {
    work = work.slice(0, index) + " ".repeat(end - index) + work.slice(end);
  };
  const scan = (
    re: RegExp,
    handle: (m: RegExpExecArray) => Mention | undefined,
  ) => {
    for (const m of [...work.matchAll(re)]) {
      const index = m.index!;
      const end = index + m[0].length;
      if (/^\s*$/.test(work.slice(index, end))) continue;
      if (work.slice(index, end) !== m[0]) continue; // overlapped by an earlier match in this pass
      const mention = handle(m as RegExpExecArray);
      if (!mention) continue;
      mentions.push(mention);
      consume(index, end);
    }
  };
  const span = (m: RegExpExecArray): Span => ({
    text: m[0],
    index: m.index,
    end: m.index + m[0].length,
  });

  // Dates first: ISO, German numeric with year, slash, then written months.
  scan(/(?<![\d.])(\d{4})-(\d{2})-(\d{2})(?![\d])/g, (m) => {
    const iso = isoDate(+m[1], +m[2], +m[3]);
    return iso ? { kind: "date", candidates: [iso], ...span(m) } : undefined;
  });
  scan(/(?<![\d.,])(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d])/g, (m) => {
    const iso = isoDate(+m[3], +m[2], +m[1]);
    return iso ? { kind: "date", candidates: [iso], ...span(m) } : undefined;
  });
  scan(/(?<![\d/])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])/g, (m) => {
    const c = [
      isoDate(+m[3], +m[2], +m[1]),
      isoDate(+m[3], +m[1], +m[2]),
    ].filter((x): x is string => !!x);
    const candidates = [...new Set(c)];
    return candidates.length
      ? { kind: "date", candidates, ...span(m) }
      : undefined;
  });
  scan(
    new RegExp(
      `(?<![\\d.])(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(${monthPattern})\\.?,?\\s+(\\d{4})(?!\\d)`,
      "giu",
    ),
    (m) => {
      const iso = isoDate(+m[3], monthNames[m[2].toLowerCase()], +m[1]);
      return iso ? { kind: "date", candidates: [iso], ...span(m) } : undefined;
    },
  );
  scan(
    new RegExp(
      `(?<![\\p{L}])(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})(?!\\d)`,
      "giu",
    ),
    (m) => {
      const iso = isoDate(+m[3], monthNames[m[1].toLowerCase()], +m[2]);
      return iso ? { kind: "date", candidates: [iso], ...span(m) } : undefined;
    },
  );

  // "1:25 h" is a duration, not a clock time.
  scan(
    /(?<![\d.,:])(\d{1,2}):([0-5]\d)\s*(?:h|Std\.?|Stunden|hours?)(?![\p{L}])/giu,
    (m) => {
      const minutes = new D(+m[1] * 60 + +m[2]);
      return {
        kind: "duration",
        minutes,
        amount: minutes.div(60),
        unit: "h+min",
        ...span(m),
      };
    },
  );
  // Clock times.
  const clock = (
    h: number,
    min: number,
    suffix?: string,
  ): number | undefined => {
    const s = suffix?.toLowerCase().replace(/\./g, "");
    if (s === "am" || s === "pm") {
      if (h < 1 || h > 12) return undefined;
      h = (h % 12) + (s === "pm" ? 12 : 0);
    }
    if (h > 23 || min > 59) return undefined;
    return h * 60 + min;
  };
  scan(
    /(?<![\d.,:])(\d{1,2}):([0-5]\d)(?![\d:])(?:\s*(Uhr|a\.m\.|p\.m\.|am|pm)(?![\p{L}]))?/giu,
    (m) => {
      const minutes = clock(+m[1], +m[2], m[3]);
      return minutes === undefined
        ? undefined
        : { kind: "time", minutes, ...span(m) };
    },
  );
  scan(/(?<![\d.,:])(\d{1,2})\.([0-5]\d)\s*Uhr(?![\p{L}])/gu, (m) => {
    const minutes = clock(+m[1], +m[2]);
    return minutes === undefined
      ? undefined
      : { kind: "time", minutes, ...span(m) };
  });
  scan(
    /(?<![\d.,:])(\d{1,2})\s*(Uhr|a\.m\.|p\.m\.|am|pm)(?![\p{L}])/giu,
    (m) => {
      const minutes = clock(
        +m[1],
        0,
        m[2].toLowerCase() === "uhr" ? undefined : m[2],
      );
      return minutes === undefined
        ? undefined
        : { kind: "time", minutes, ...span(m) };
    },
  );

  // Durations: "7 h 40 min", "7 Stunden und 40 Minuten", "85 minutes", "1,5 Stunden".
  const hourWord = "(?:Stunden|Stunde|hours|hour|hrs|hr|Std\\.?|h)";
  const minuteWord = "(?:Minuten|Minute|minutes|minute|mins|min\\.?|Min\\.?)";
  scan(
    new RegExp(
      `(?<![\\d.,])(\\d+)\\s*${hourWord}(?![\\p{L}])\\s*(?:,|and|und)?\\s*(\\d+)\\s*${minuteWord}(?![\\p{L}])`,
      "giu",
    ),
    (m) => {
      const minutes = new D(+m[1] * 60 + +m[2]);
      return {
        kind: "duration",
        minutes,
        amount: minutes.div(60),
        unit: "h+min",
        ...span(m),
      };
    },
  );
  scan(
    new RegExp(
      `(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s*${minuteWord}(?![\\p{L}])`,
      "giu",
    ),
    (m) => {
      const amount = new D(m[1].replace(",", "."));
      return {
        kind: "duration",
        minutes: amount,
        amount,
        unit: "min",
        ...span(m),
      };
    },
  );
  scan(
    new RegExp(
      `(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s*${hourWord}(?![\\p{L}])`,
      "giu",
    ),
    (m) => {
      const amount = new D(m[1].replace(",", "."));
      return {
        kind: "duration",
        minutes: amount.times(60),
        amount,
        unit: "h",
        ...span(m),
      };
    },
  );

  // Plain numbers, money and percentages.
  type Pending = Omit<
    NumberMention,
    "value" | "alt" | "ambiguous" | "decimals"
  > & {
    read: Classified;
    sign: string;
  };
  const pending: Pending[] = [];
  const numberRe =
    /(?<![\p{L}\d.,:/])(-|\+)?(\d{1,3}(?:[.,   '’]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?![\p{L}\d]|[.,]\d)/gu;
  for (const m of [...work.matchAll(numberRe)]) {
    const read = classifyNumberToken(m[2]);
    if (!read) continue;
    const index = m.index!;
    const end = index + m[0].length;
    const before = text.slice(Math.max(0, index - 8), index);
    const after = text.slice(end, end + 16);
    const cb = currencyBefore.exec(before);
    const ca = currencyAfter.exec(after);
    const pa = percentAfter.exec(after);
    let sign = m[1] ?? "";
    if (!sign && cb && /-\s?$/.test(before.slice(0, cb.index))) sign = "-";
    const unit = /^[    ]?([\p{L}]+)/u.exec(after.slice(pa?.[0].length ?? 0));
    pending.push({
      kind: "number",
      text: m[0],
      index,
      end,
      read,
      sign,
      currency: cb ? currencyCode(cb[1]) : ca ? currencyCode(ca[1]) : undefined,
      percent: !!pa,
      unitWord: unit?.[1].toLowerCase(),
      hint: "value" in read ? read.hint : undefined,
    });
  }
  const de = pending.filter((p) => p.hint === "de").length;
  const en = pending.filter((p) => p.hint === "en").length;
  const locale: NumberLocale =
    de > en ? "de" : en > de ? "en" : (languageOf(text) ?? fallback);
  for (const p of pending) {
    const { read, sign, ...rest } = p;
    const neg = sign === "-" ? "-" : "";
    const chosen = "value" in read ? read.value : read[locale];
    const other =
      "value" in read ? undefined : read[locale === "de" ? "en" : "de"];
    mentions.push({
      ...rest,
      value: new D(neg + chosen),
      alt: other === undefined ? undefined : new D(neg + other),
      ambiguous: !("value" in read),
      decimals: chosen.includes(".") ? chosen.split(".")[1].length : 0,
    });
  }
  mentions.sort((a, b) => a.index - b.index);
  return { text, mentions, locale };
}

export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function parseClock(value: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw Error(`Invalid clock value ${value}`);
  return +m[1] * 60 + +m[2];
}
