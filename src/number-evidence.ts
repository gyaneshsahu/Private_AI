import Decimal from "decimal.js";
const small = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = [
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
const values = new Map([
  ...small.map((word, i) => [word, i] as const),
  ...tens.map((word, i) => [word, (i + 2) * 10] as const),
]);
const numberWords = new Set([
  ...values.keys(),
  "hundred",
  "thousand",
  "million",
  "billion",
  "trillion",
  "point",
  "minus",
  "negative",
  "and",
  "half",
  "quarter",
  "quarters",
  "halves",
  "third",
  "thirds",
  "fourth",
  "fourths",
  "fifth",
  "fifths",
  "sixth",
  "sixths",
  "seventh",
  "sevenths",
  "eighth",
  "eighths",
  "ninth",
  "ninths",
  "tenth",
  "tenths",
  "dozen",
  "dozens",
]);

/**
 * Which decimal convention a quotation uses, judged from its own unambiguous
 * numbers and words: "de" for a decimal comma (1.234,56; 86,40), "en" for a
 * decimal point (1,234.56; 86.40), undefined when the quote gives no clue.
 */
export function quoteNumberLocale(quote: string): "de" | "en" | undefined {
  let de = 0;
  let en = 0;
  // A separator followed by one or two digits and then no digit is a decimal mark.
  de += (quote.match(/\d,\d{1,2}(?![\d.,])/g) ?? []).length;
  en += (quote.match(/\d\.\d{1,2}(?![\d.,])/g) ?? []).length;
  // Mixed grouping and decimal marks are unambiguous.
  de += (quote.match(/\d\.\d{3},\d/g) ?? []).length * 2;
  en += (quote.match(/\d,\d{3}\.\d/g) ?? []).length * 2;
  // German typography: a space before the percent sign, "Uhr", "EUR" after the amount.
  de += (quote.match(/\d\s%/g) ?? []).length;
  de += (
    quote.match(/\bUhr\b|\bbrutto\b|\bnetto\b|\bRechnung\b|\bBetrag\b/gi) ?? []
  ).length;
  en += (quote.match(/\d%/g) ?? []).length;
  if (de === en) return undefined;
  return de > en ? "de" : "en";
}

/**
 * Canonical decimal forms (dot decimal, no grouping) a written number can
 * mean. Unambiguous forms give one reading; "1.234" or "1,234" give the
 * reading of the quote's own locale, or both readings when it has none.
 */
export function canonicalNumberForms(
  raw: string,
  locale: "de" | "en" | undefined,
): string[] {
  const sign = raw.startsWith("-") ? "-" : "";
  const body = raw.replace(/^[-+]/, "");
  if (!/^\d[\d.,]*$/.test(body)) return [];
  const dots = body.split(".").length - 1;
  const commas = body.split(",").length - 1;
  const canonical = (integer: string, fraction?: string) => {
    const int = integer.replace(/^0+(?=\d)/, "");
    return sign + int + (fraction !== undefined ? `.${fraction}` : "");
  };
  const grouped = (groups: string[]) =>
    groups.length > 1 &&
    groups.slice(1).every((g) => g.length === 3) &&
    groups[0].length >= 1 &&
    groups[0].length <= 3;
  if (dots === 0 && commas === 0) return [canonical(body)];
  if (dots > 0 && commas > 0) {
    const lastDot = body.lastIndexOf(".");
    const lastComma = body.lastIndexOf(",");
    const decimal = lastDot > lastComma ? "." : ",";
    const group = decimal === "." ? "," : ".";
    const [integer, fraction, ...rest] = body.split(decimal);
    if (rest.length || !grouped(integer.split(group)) || !fraction) return [];
    return [canonical(integer.replaceAll(group, ""), fraction)];
  }
  const mark = dots > 0 ? "." : ",";
  const parts = body.split(mark);
  const asDecimal =
    parts.length === 2 && parts[1].length > 0
      ? canonical(parts[0], parts[1])
      : undefined;
  const asGrouped = grouped(parts) ? canonical(parts.join("")) : undefined;
  const ambiguous =
    parts.length === 2 && parts[1].length === 3 && grouped(parts);
  if (!ambiguous) {
    if (parts.length === 2 && parts[1].length !== 3)
      return asDecimal ? [asDecimal] : [];
    return asGrouped ? [asGrouped] : asDecimal ? [asDecimal] : [];
  }
  // "1.234" or "1,234": decimal in one locale, grouped thousands in the other.
  const decimalLocale = mark === "." ? "en" : "de";
  if (locale === decimalLocale) return [asDecimal!];
  if (locale !== undefined) return [asGrouped!];
  return [asDecimal!, asGrouped!];
}

/**
 * For an operand accepted against a quotation: the written token and both of
 * its readings when the token is ambiguous (1.234 / 1,234) and the quotation
 * gives no locale clue. The calculator shows this to the user instead of
 * guessing silently; undefined when the reading was unambiguous.
 */
export function ambiguousReading(
  quote: string,
  value: string,
): { written: string; readAs: string; otherReading: string } | undefined {
  const joined = quote.replace(/(\d)[\u00a0\u202f'](?=\d{3}(?!\d))/g, "$1");
  if (quoteNumberLocale(joined) !== undefined) return undefined;
  const numeric = (s: string) =>
    s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  for (const token of (joined.match(/[-+]?\d[\d.,]*/g) ?? []).map((t) =>
    t.replace(/[.,]+$/, ""),
  )) {
    const forms = canonicalNumberForms(token, undefined);
    if (forms.length !== 2) continue;
    const hit = forms.find((f) => numeric(f) === numeric(value));
    if (!hit) continue;
    const other = forms.find((f) => f !== hit)!;
    return { written: token, readAs: hit, otherReading: other };
  }
  return undefined;
}

// Narrow lexical normalization, not semantic extraction. Unsupported numeric
// phrases are rejected whole, so “one hundred” cannot supply an operand of 1.
// Tokens include the written form and its canonical decimal forms, so an
// operand may be given as "1234.56" for "1.234,56 EUR" or "1,234.56 EUR".
export function evidenceNumberTokens(quote: string): string[] {
  const joined = quote.replace(/(\d)[  '](?=\d{3}(?!\d))/g, "$1");
  const locale = quoteNumberLocale(joined);
  const written = (joined.match(/[-+]?\d[\d.,eE+-]*/g) ?? []).map((t) =>
    t.replace(/[.,]+$/, ""),
  );
  const tokens = [...written];
  const push = (form: string) => {
    if (!tokens.includes(form)) tokens.push(form);
  };
  for (const token of written)
    for (const form of canonicalNumberForms(token, locale)) push(form);
  // A written percentage also stands for its fraction and its gross factor:
  // "19 %" may be used as 19, 0.19 or 1.19. No other derivation is offered.
  for (const match of joined.matchAll(/(\d[\d.,]*)\s?%/g))
    for (const form of canonicalNumberForms(
      match[1].replace(/[.,]+$/, ""),
      locale,
    )) {
      if (!/^-?\d+(?:\.\d+)?$/.test(form)) continue;
      const fraction = new Decimal(form).div(100);
      push(fraction.toString());
      push(fraction.add(1).toString());
    }
  // A clock time stands for its minutes since midnight ("09:23" is 563), so a
  // calculator may subtract minutes from it and render the result as a clock.
  for (const match of joined.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g))
    push(String(Number(match[1]) * 60 + Number(match[2])));
  const words = [...quote.toLowerCase().matchAll(/[a-z]+/g)];
  for (let i = 0; i < words.length; i++) {
    if (!numberWords.has(words[i][0]) || words[i][0] === "and") continue;
    const run = [words[i][0]];
    while (
      i + 1 < words.length &&
      numberWords.has(words[i + 1][0]) &&
      /^[\s-]+$/.test(
        quote.slice(words[i].index! + words[i][0].length, words[i + 1].index),
      )
    )
      run.push(words[++i][0]);
    while (run.at(-1) === "and") run.pop();
    if (run.length === 1 && values.has(run[0]))
      tokens.push(String(values.get(run[0])));
    else if (
      run.length === 2 &&
      tens.includes(run[0]) &&
      small.slice(1, 10).includes(run[1])
    )
      tokens.push(String(values.get(run[0])! + values.get(run[1])!));
  }
  return tokens;
}
