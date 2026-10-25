/**
 * On-device identifier masking. Before a conversation is encrypted and sent,
 * identifiers that point at a person are replaced with placeholders such as
 * `{{IBAN-1}}`; the originals stay in this browser and are put back into the
 * reply. Only patterns that can be recognised reliably on the device are
 * covered: bank accounts (IBAN), card numbers, tax numbers (German tax ID,
 * Steuernummer, German VAT ID), insurance numbers (German pension and health
 * insurance numbers), passport and identity-card numbers near a label or in
 * a machine-readable zone, phone numbers, email addresses and labelled birth
 * dates. Names, addresses and free-text facts are NOT recognised; the product
 * copy must never claim more than this list. Measured accuracy, including
 * what is still missed, is in evaluation/masking (synthetic documents only).
 */

export const IDENTIFIER_KINDS = [
  "IBAN",
  "CARD",
  "TAX-ID",
  "INSURANCE",
  "ID-NUMBER",
  "EMAIL",
  "PHONE",
  "BIRTH-DATE",
] as const;
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number];

export interface KeptIdentifier {
  kind: IdentifierKind;
  placeholder: string;
  value: string;
}

export interface MaskingSession {
  /** Replaces identifiers in text with placeholders, reusing placeholders for repeated values. */
  mask(text: string): string;
  /** Puts the original values back wherever a known placeholder appears. */
  restore(text: string): string;
  /** Streams text with reinsertion while holding back a possibly incomplete trailing placeholder. */
  streamRestore(onText: (text: string) => void): {
    push(chunk: string): void;
    flush(): void;
  };
  readonly kept: readonly KeptIdentifier[];
  /** Count per kind, for the "kept on this device" note. */
  summary(): Partial<Record<IdentifierKind, number>>;
}

// Models echo placeholders loosely: any case, inner spaces, one brace dropped ({{IBAN-1} or {IBAN-1}}).
const KIND = String.raw`(${IDENTIFIER_KINDS.map((kind) => kind.replace("-", String.raw`\s*-\s*`)).join("|")})\s*-\s*(\d{1,4})`;
const PLACEHOLDER = new RegExp(
  String.raw`\{\{\s*${KIND}\s*\}\}?|\{\s*${KIND}\s*\}\}`,
  "gi",
);
const MAX_PLACEHOLDER_LENGTH = 32;
/**
 * Places the rendered answer turns into something the browser follows or fetches:
 * Markdown link and image targets, autolinks, bare URLs and reference definitions.
 * Each pattern starts at the left marker, so a span is known before a placeholder inside it arrives.
 */
const URL_CONTEXTS = [
  /\]\(\s*<?[^)\s>]*/g,
  /<(?:[a-z][a-z0-9+.-]{1,31}:|www\.|\{)[^>\s]*/gi,
  /\b(?:https?|ftp):\/\/[^\s<]*|\bwww\.[^\s<]*/gi,
  /^ {0,3}\[[^\]\n]+\]:[ \t]*<?\S*/gm,
];

function urlSpans(text: string) {
  const spans: [number, number][] = [];
  for (const pattern of URL_CONTEXTS)
    for (const match of text.matchAll(pattern))
      spans.push([match.index, match.index + match[0].length]);
  return spans;
}

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

/** ISO 13616 mod-97 check over the rearranged IBAN. */
export function isValidIban(candidate: string): boolean {
  const compact = candidate.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const part = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of part) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** Luhn check for payment card numbers of 13 to 19 digits. */
export function isValidCardNumber(candidate: string): boolean {
  const digits = digitsOf(candidate);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** German Steuer-ID: 11 digits, ISO 7064 MOD 11,10 check digit, one digit repeated. */
export function isValidGermanTaxId(candidate: string): boolean {
  const digits = digitsOf(candidate);
  if (digits.length !== 11 || digits[0] === "0") return false;
  const counts = new Map<string, number>();
  for (const digit of digits.slice(0, 10))
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  const repeated = [...counts.values()].filter((count) => count > 1);
  if (repeated.length !== 1 || repeated[0] > 3) return false;
  let product = 10;
  for (const digit of digits.slice(0, 10)) {
    let sum = (Number(digit) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

function plausibleDayMonth(day: string | number, month: string | number) {
  const d = Number(day);
  const m = Number(month);
  return d >= 1 && d <= 31 && m >= 1 && m <= 12;
}

/** Check digit of the German VAT ID (USt-IdNr.): ISO 7064 MOD 11,10 over the first eight digits. */
function isValidGermanVatId(candidate: string): boolean {
  const digits = digitsOf(candidate);
  if (digits.length !== 9 || digits[0] === "0") return false;
  let product = 10;
  for (const digit of digits.slice(0, 8)) {
    let sum = (Number(digit) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === Number(digits[8]);
}

/** German health insurance number (Krankenversichertennummer): letter, eight digits, check digit. */
function isValidHealthInsuranceNumber(candidate: string): boolean {
  const compact = candidate.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]\d{9}$/.test(compact)) return false;
  const digits =
    String(compact.charCodeAt(0) - 64).padStart(2, "0") + compact.slice(1, 9);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const product = Number(digits[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 10) + (product % 10);
  }
  return sum % 10 === Number(compact[9]);
}

/** Card numbers: Luhn plus a known issuer prefix and length, written compact or in card-like groups. */
function isPlausibleCard(raw: string, layout: Layout, index: number): boolean {
  const digits = digitsOf(raw);
  if (!isValidCardNumber(digits)) return false;
  const n = digits.length;
  const p2 = Number(digits.slice(0, 2));
  const p3 = Number(digits.slice(0, 3));
  const p4 = Number(digits.slice(0, 4));
  const issuer =
    (digits[0] === "4" && (n === 16 || n === 19)) ||
    (((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) && n === 16) ||
    ((p2 === 34 || p2 === 37) && n === 15) ||
    ([30, 36, 38, 39].includes(p2) && n >= 14 && n <= 19) ||
    (p4 >= 3528 && p4 <= 3589 && n >= 16) ||
    ((p4 === 6011 || p2 === 65 || (p3 >= 644 && p3 <= 649) || p2 === 62) &&
      n >= 16) ||
    ((p2 === 50 || (p2 >= 56 && p2 <= 69)) && n >= 16);
  if (!issuer) return false;
  const groups = raw
    .trim()
    .split(/[ \n-]+/)
    .map((group) => group.length)
    .join("-");
  if (
    !groups.includes("-") ||
    ["4-4-4-4", "4-4-4-4-3", "4-6-5", "4-6-4", "4-4-4-2"].includes(groups)
  )
    return true;
  // Odd grouping (OCR spacing) only next to a card label.
  return CARD_LABEL.sameLine.test(
    layout.text.slice(layout.starts[lineIndex(layout, index)], index),
  );
}

/** IBAN length per country (ISO 13616 registry), used for lower-case, split and OCR-damaged candidates. */
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BR: 29, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27,
  HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20,
  LB: 28, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PT: 25, QA: 29, RO: 24,
  RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29,
  VA: 22, XK: 20,
};
/** Countries whose IBAN is all digits after the country code, so OCR letter-for-digit slips can be undone. */
const NUMERIC_IBAN = new Set([
  "DE", "AT", "BE", "ES", "PL", "PT", "FI", "DK", "SE", "NO", "HR", "SI",
  "SK", "CZ", "HU", "EE", "LT", "IS", "RS", "ME", "BA",
]);
const OCR_DIGIT: Record<string, string> = {
  O: "0", D: "0", Q: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", G: "6",
};

function acceptIban(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact) && isValidIban(compact))
    return true;
  const upper = compact.toUpperCase();
  const country = upper.slice(0, 2);
  if (IBAN_LENGTHS[country] !== upper.length) return false;
  if (/^[A-Z]{2}\d{2}/.test(upper) && isValidIban(upper)) return true;
  if (!NUMERIC_IBAN.has(country)) return false;
  // OCR read a digit as a letter (O for 0, l for 1): undo it only where the
  // country's IBAN must be digits, and only if the check digits then pass.
  const repaired =
    country + [...upper.slice(2)].map((c) => OCR_DIGIT[c] ?? c).join("");
  const real = digitsOf(upper.slice(2)).length;
  return (
    /^[A-Z]{2}\d+$/.test(repaired) &&
    real >= upper.length - 4 &&
    isValidIban(repaired)
  );
}

/** Shortens an over-long IBAN candidate at whitespace boundaries until it validates. */
function shrinkIban(candidate: string): string | undefined {
  let value = candidate;
  for (;;) {
    const cut = Math.max(value.lastIndexOf(" "), value.lastIndexOf("\n"), value.lastIndexOf("\t"));
    if (cut < 15) return undefined;
    value = value.slice(0, cut).trimEnd();
    if (acceptIban(value)) return value;
  }
}

/** Line layout of the text being scanned, shared by the label checks. */
interface Layout {
  text: string;
  lines: string[];
  starts: number[];
}
function layoutOf(text: string): Layout {
  const lines = text.split("\n");
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return { text, lines, starts };
}
function lineIndex(layout: Layout, index: number): number {
  let lo = 0;
  let hi = layout.starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (layout.starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

interface Label {
  /** Label text anywhere shortly before the value on the same line. */
  sameLine: RegExp;
  /** A line that ends with the label (plus a short digit-free tail such as "Nr.:"), for values on the next line. */
  lineEnd: RegExp;
  /** Any mention, for column headers and label blocks. */
  any: RegExp;
}
const WORD = String.raw`[\p{L}\p{N}_]`;
/** JavaScript's \b and \w are ASCII-only, so "ü" or "ß" next to a value counted as a word edge; this makes them Unicode-aware. */
function unicodeWords(pattern: RegExp): RegExp {
  return new RegExp(
    pattern.source
      .replaceAll(
        String.raw`\b`,
        String.raw`(?:(?<=${WORD})(?!${WORD})|(?<!${WORD})(?=${WORD}))`,
      )
      .replaceAll(String.raw`[\w`, String.raw`[\p{L}\p{N}_`),
    pattern.flags + "u",
  );
}
function label(keywords: string, window: number): Label {
  return {
    sameLine: unicodeWords(
      new RegExp(`(?:${keywords})[^\\n]{0,${window}}$`, "i"),
    ),
    lineEnd: unicodeWords(
      new RegExp(`(?:${keywords})[^\\d\\n]{0,16}$`, "i"),
    ),
    any: unicodeWords(new RegExp(`(?:${keywords})`, "i")),
  };
}

const ID_LABEL = label(
  "passport|reisepass|passeport|ausweis|id card|identity card|carte d.identit\\S*|document no|document number|travel document|passnummer|pass-nr|pass no",
  24,
);
const BIRTH_LABEL = label(
  "geboren|\\bgeb\\b\\.?|geb\\.|born|birth|\\bdob\\b|d\\.o\\.b|geburtsdatum|geburtstag|tag der geburt|birthday|date de naissance",
  40,
);
const TAX_NUMBER_LABEL = label(
  "steuernummer|steuer-nr|st\\.?-?nr|tax number|tax no|tax ref",
  24,
);
const CARD_LABEL = label(
  "karte|kreditkarte|kartennummer|karten-nr|card|visa|mastercard|amex",
  16,
);
const PHONE_LABEL = unicodeWords(
  /tel\b|tel\.|telefon|phone|fon\b|fax|mobil|handy|ruf|call|whatsapp|erreich|reach|nummer ist|number is/gi,
);
const NOT_PHONE_LABEL =
  /kunden-?(?:nummer|nr)|kd\.?-?nr|customer (?:no|number|id)|vertrags(?:konto|nummer)|rechnungs-?(?:nummer|nr)|invoice|personal-?(?:nummer|nr)|pers\.-?nr|staff|fallnummer|kostenträger|betriebsstätten|arzt-nr|mandat|eref|mref|\bref\b|reference|schaden-?nummer|versicherungsschein|order|bestell|aktenzeichen|\baz\.|sendung|tracking/gi;

const DELIMITERS: [RegExp, RegExp][] = [
  [/\t/, /\t/g],
  [/;/, /;/g],
  [/\|/, /\|/g],
  [/","/, /","/g],
  [/\S {2,}\S/, / {2,}/g],
];

/** The header cell above a value in a delimited or column-aligned table, if any. */
function columnHeader(layout: Layout, index: number): string | undefined {
  const row = lineIndex(layout, index);
  const line = layout.lines[row];
  const offset = index - layout.starts[row];
  for (const [test, split] of DELIMITERS) {
    if (!test.test(line)) continue;
    const count = (s: string) => (s.match(split) ?? []).length;
    const above = layout.lines[row - 1] ?? "";
    if (count(line) < 2 && !(count(line) >= 1 && count(above) >= 1)) continue;
    const cell = count(line.slice(0, offset));
    let header: string | undefined;
    for (let up = row - 1; up >= 0 && up >= row - 40; up--) {
      const candidate = layout.lines[up];
      if (!test.test(candidate) || count(candidate) < 1) break;
      if (/^[\s|:-]+$/.test(candidate)) continue;
      header = candidate;
    }
    if (header === undefined || count(header) < 2) return undefined;
    // A row whose long cell wrapped continues on the next line: count the
    // cells of both halves against the header.
    const headerCells = count(header) + 1;
    const lineCells = count(line) + 1;
    const previous = layout.lines[row - 1] ?? "";
    const previousCells = test.test(previous) ? count(previous) + 1 : 1;
    const shift =
      lineCells < headerCells &&
      previous !== header &&
      previousCells + lineCells - 1 === headerCells
        ? previousCells - 1
        : 0;
    return header.split(split)[cell + shift];
  }
  return undefined;
}

/**
 * True when a label marks the value at `index`: on the same line shortly
 * before it; on the previous non-empty line when that line ends with the
 * label and the value starts its own line; in the header of its table
 * column; or in a block of labels read before a block of values (two-column
 * forms after OCR).
 */
function labelled(layout: Layout, index: number, kind: Label): boolean {
  const row = lineIndex(layout, index);
  const prefix = layout.text.slice(layout.starts[row], index);
  if (kind.sameLine.test(prefix)) return true;
  // In a table row only the column header counts.
  const header = columnHeader(layout, index);
  if (header !== undefined) return kind.any.test(header);
  if (prefix.length <= 20 && !/\d/.test(prefix)) {
    let up = row - 1;
    while (up >= 0 && layout.lines[up].trim() === "" && row - up <= 2) up--;
    const previous = layout.lines[up];
    if (previous !== undefined && previous.length <= 120 && kind.lineEnd.test(previous))
      return true;
    if (labelBlock(layout, row, kind)) return true;
  }
  return false;
}

function labelBlock(layout: Layout, row: number, kind: Label): boolean {
  const empty = (i: number) => (layout.lines[i] ?? "").trim() === "";
  let top = row;
  while (top > 0 && !empty(top - 1)) top--;
  let bottom = row;
  while (bottom < layout.lines.length - 1 && !empty(bottom + 1)) bottom++;
  if (top < 2 || !empty(top - 1)) return false;
  let labelTop = top - 2;
  if (empty(labelTop)) return false;
  while (labelTop > 0 && !empty(labelTop - 1)) labelTop--;
  const labels = layout.lines.slice(labelTop, top - 1);
  if (labels.length !== bottom - top + 1) return false;
  const candidate = labels[row - top];
  return candidate.length <= 60 && !/\d/.test(candidate) && kind.any.test(candidate);
}

function phoneAccepted(value: string, layout: Layout, index: number): boolean {
  const digits = digitsOf(value);
  // A dotted or slashed calendar date is never a phone number.
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(value.trim())) return false;
  if (digits.length < 8 || digits.length > 15) return false;
  return phoneLabelled(layout, index);
}

function phoneLabelled(layout: Layout, index: number): boolean {
  const row = lineIndex(layout, index);
  const prefix = layout.text.slice(Math.max(layout.starts[row], index - 40), index);
  const last = (pattern: RegExp) => {
    let at = -1;
    for (const m of prefix.matchAll(pattern)) at = m.index!;
    return at;
  };
  const other = last(NOT_PHONE_LABEL);
  if (other !== -1 && other > last(PHONE_LABEL)) return false;
  const header = columnHeader(layout, index);
  if (header !== undefined && new RegExp(NOT_PHONE_LABEL.source, "i").test(header))
    return false;
  return true;
}

const MONTHS: Record<string, number> = {
  januar: 1, jänner: 1, january: 1, jan: 1, februar: 2, february: 2, feb: 2,
  märz: 3, marz: 3, march: 3, mär: 3, mar: 3, april: 4, apr: 4, mai: 5,
  may: 5, juni: 6, june: 6, jun: 6, juli: 7, july: 7, jul: 7, august: 8,
  aug: 8, september: 9, sept: 9, sep: 9, oktober: 10, october: 10, okt: 10,
  oct: 10, november: 11, nov: 11, dezember: 12, december: 12, dez: 12,
  dec: 12,
};
const MONTH_NAMES = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

/** Day and month of a date match from the BIRTH-DATE pattern, or undefined. */
function dateParts(match: RegExpExecArray): [number, number] | undefined {
  const g = match.groups ?? {};
  if (g.nd) return [Number(g.nd), Number(g.nm)];
  if (g.id) return [Number(g.id), Number(g.im)];
  if (g.td) return [Number(g.td), MONTHS[g.tm.toLowerCase()]];
  if (g.ud) return [Number(g.ud), MONTHS[g.um.toLowerCase()]];
  return undefined;
}

interface Detector {
  kind: IdentifierKind;
  pattern: RegExp;
  accept?: (match: RegExpExecArray, layout: Layout) => boolean;
  /** Rejected candidates of this shape block PHONE and CARD inside them. */
  guards?: (value: string) => boolean;
  /** A shorter accepted value starting at the same place, when the whole candidate fails. */
  shrink?: (value: string, layout: Layout, index: number) => string | undefined;
  /** Rescan from the next character after a failed candidate: candidates can start inside one another. */
  overlapping?: boolean;
}

const detectors: Detector[] = [
  {
    kind: "ID-NUMBER",
    // Machine-readable zone of a scanned passport or identity card: the lines
    // with digits carry the document number and the birth date.
    pattern: /^[A-Z0-9<«]{28,46}$/gm,
    accept: (match) => /<</.test(match[0]) && /\d/.test(match[0]),
  },
  {
    kind: "IBAN",
    // One or two spaces or a line break between groups (PDF text wraps IBANs
    // mid-number); the country code may sit before a line break; lower case
    // from chats; OCR letters for digits are repaired in acceptIban.
    pattern:
      /(?:(?<=IBAN:?)|\b)[A-Za-z]{2}[ \n]?[0-9OolI]{2}(?:[ \t\n]{0,2}[A-Za-z0-9]){11,30}\b/g,
    accept: (match) => acceptIban(match[0]),
    guards: (value) =>
      /^[A-Z]{2}[ \n]?\d{2}/.test(value) && value.slice(0, 2) in IBAN_LENGTHS,
    shrink: shrinkIban,
    overlapping: true,
  },
  {
    kind: "EMAIL",
    pattern:
      /[A-Za-z0-9._%+-]+(?:,[A-Za-z][A-Za-z0-9._%+-]*)?(?:@|©|\s?[(\[](?:at|ät)[)\]]\s?)[A-Za-z0-9-]+(?:(?:\.|\s?[(\[]dot[)\]]\s?)[A-Za-z0-9-]+)+/gi,
  },
  {
    kind: "CARD",
    pattern: /\b(?:\d[ \n-]?){12,18}\d\b/g,
    accept: (match, layout) => isPlausibleCard(match[0], layout, match.index),
  },
  {
    kind: "INSURANCE",
    // German Rentenversicherungsnummer: area, birth date, initial, serial and check digit.
    pattern: /\b\d{2}[ \n]?(\d{2})(\d{2})\d{2}[ \n]?[A-Z][ \n]?\d{3}\b/g,
    accept: (match) => plausibleDayMonth(match[1], match[2]),
  },
  {
    kind: "INSURANCE",
    // German health insurance number: letter, eight digits, check digit.
    pattern: /\b[A-Z](?: ?[\dOoIlSB]){9}\b/g,
    accept: (match) => {
      // OCR may read 0 as O and 1 as l; repair only the digit positions.
      const repaired =
        match[0][0] +
        match[0]
          .slice(1)
          .replace(/[Oo]/g, "0")
          .replace(/[Il]/g, "1")
          .replace(/S/g, "5")
          .replace(/B/g, "8");
      return (
        digitsOf(match[0]).length >= 7 && isValidHealthInsuranceNumber(repaired)
      );
    },
  },
  {
    kind: "TAX-ID",
    // Steuer-ID: 11 digits in any grouping, ISO 7064 check digit.
    pattern: /\b\d(?:[ \n]?\d){10}\b/g,
    accept: (match) => isValidGermanTaxId(match[0]),
  },
  {
    kind: "TAX-ID",
    // German VAT ID (USt-IdNr.) with its check digit.
    pattern: /\bDE ?\d{3}[ \n]?\d{3}[ \n]?\d{3}\b/g,
    accept: (match) => isValidGermanVatId(match[0].slice(2)),
  },
  {
    kind: "TAX-ID",
    // Steuernummer with separators, e.g. 12/345/67890, 123/4567/8901, 12345/67890.
    pattern: /\b(?:\d{2,3}[/|lI]\d{3,4}[/|lI]\d{4,5}|\d{5}\/\d{5})\b/g,
  },
  {
    kind: "TAX-ID",
    // Steuernummer without separators (13-digit federal form, Hessen spacing) after its label.
    pattern: /\b\d(?:[ /]?\d){9,12}\b/g,
    accept: (match, layout) =>
      TAX_NUMBER_LABEL.sameLine.test(
        layout.text.slice(layout.starts[lineIndex(layout, match.index)], match.index),
      ),
  },
  {
    kind: "ID-NUMBER",
    // Passport or identity document numbers only when a label marks them.
    pattern: /\b[A-Z0-9]{8,10}\b/g,
    accept: (match, layout) => {
      const value = match[0];
      const shaped =
        (/\d/.test(value) && /[A-Z]/.test(value)) ||
        /^\d{9}$/.test(value) ||
        /^[CFGHJKLMNPRTVWXYZ]{9}$/.test(value);
      return shaped && labelled(layout, match.index, ID_LABEL);
    },
  },
  {
    kind: "BIRTH-DATE",
    pattern: new RegExp(
      [
        "\\b(?<nd>\\d{1,2})[.,/](?<nm>\\d{1,2})[.,/](?:(?:19|20)\\d{2}|\\d{2})\\b",
        "\\b(?:19|20)\\d{2}-(?<im>\\d{2})-(?<id>\\d{2})\\b",
        `\\b(?<td>\\d{1,2})(?:\\.|st|nd|rd|th)?[ \\n](?<tm>${MONTH_NAMES})\\.?[ \\n](?:19|20)\\d{2}\\b`,
        `\\b(?<um>${MONTH_NAMES})\\.?[ \\n](?<ud>\\d{1,2})(?:st|nd|rd|th)?,?[ \\n](?:19|20)\\d{2}\\b`,
      ].join("|"),
      "gi",
    ),
    accept: (match, layout) => {
      const parts = dateParts(match);
      if (!parts || !plausibleDayMonth(parts[0], parts[1])) return false;
      const row = lineIndex(layout, match.index);
      const prefix = layout.text.slice(layout.starts[row], match.index);
      // CV and clinic shorthand: "* 03.05.1988 in Köln".
      if (/(?:^|[\s,;(])\*\s?$/.test(prefix)) return true;
      return labelled(layout, match.index, BIRTH_LABEL);
    },
  },
  {
    kind: "PHONE",
    // A line break may sit between groups where a PDF wrapped the number.
    pattern:
      /(?:(?<![\d.,])\+[1-9]\d{0,2}|(?<![\w.,/-])00[1-9]\d{0,2}|(?<![\w.,/+-])0[1-9]\d{0,4})(?:[ ./\n-]?\(?\d+\)?){2,}/g,
    accept: (match, layout) => {
      const [head, ...rest] = match[0].split("\n");
      // Across a line break only when one side is short (an area code or a last pair).
      if (rest.length > 1) return false;
      if (rest.length === 1 && digitsOf(head).length > 6 && digitsOf(rest[0]).length > 3)
        return false;
      return phoneAccepted(match[0], layout, match.index);
    },
    shrink: (value, layout, index) => {
      // Cut at a line break, or drop up to two trailing groups that ran on
      // into a following number (a call duration, a reference).
      const head = value.split("\n")[0].trimEnd();
      if (head !== value && phoneAccepted(head, layout, index)) return head;
      let shorter = head;
      for (let i = 0; i < 2; i++) {
        const cut = shorter.lastIndexOf(" ");
        if (cut <= 0) return undefined;
        shorter = shorter.slice(0, cut);
        if (phoneAccepted(shorter, layout, index)) return shorter;
      }
      return undefined;
    },
  },
];
for (const detector of detectors)
  detector.pattern = unicodeWords(detector.pattern);

/** Invisible characters that split identifiers when text is copied from HTML or PDFs. */
export const INVISIBLE = /[​‌‍﻿­]/g;

/**
 * Finds identifiers in text, in detector order and earliest first, without
 * overlaps. The text must already be normalised with `INVISIBLE` removed;
 * `mask()` does that. A digit run that an IBAN check rejected is never
 * re-reported as a phone or card number, so a wrapped IBAN is not
 * half-masked under the wrong label.
 */
export function findIdentifiers(
  text: string,
): { kind: IdentifierKind; start: number; end: number; value: string }[] {
  const layout = layoutOf(text);
  const rejected: [number, number][] = [];
  const found: {
    kind: IdentifierKind;
    start: number;
    end: number;
    value: string;
  }[] = [];
  const taken: [number, number][] = [];
  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = detector.pattern.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (match[0].length === 0) {
        detector.pattern.lastIndex++;
        continue;
      }
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      if (detector.accept && !detector.accept(match, layout)) {
        // A wrapped IBAN can run on into the next line's letters; cut the
        // candidate back at whitespace until the check digits pass.
        const shrunk = detector.shrink?.(match[0], layout, start);
        if (shrunk === undefined) {
          // Only an IBAN-shaped span is remembered: a card-shaped digit run is any long number.
          if (detector.guards?.(match[0])) rejected.push([start, end]);
          if (detector.overlapping) detector.pattern.lastIndex = start + 1;
          continue;
        }
        detector.pattern.lastIndex = start + shrunk.length;
        taken.push([start, start + shrunk.length]);
        found.push({
          kind: detector.kind,
          start,
          end: start + shrunk.length,
          value: shrunk,
        });
        continue;
      }
      if (
        (detector.kind === "PHONE" || detector.kind === "CARD") &&
        rejected.some(([a, b]) => start < b && end > a)
      )
        continue;
      taken.push([start, end]);
      found.push({ kind: detector.kind, start, end, value: match[0] });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

export function createMaskingSession(): MaskingSession {
  const kept: KeptIdentifier[] = [];
  const byValue = new Map<string, KeptIdentifier>();
  const counters = new Map<IdentifierKind, number>();
  const placeholderFor = (kind: IdentifierKind, value: string) => {
    const key = `${kind}:${value.replace(/[\s./-]/g, "")}`;
    const existing = byValue.get(key);
    if (existing) return existing.placeholder;
    const next = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, next);
    const entry = { kind, placeholder: `{{${kind}-${next}}}`, value };
    byValue.set(key, entry);
    kept.push(entry);
    return entry.placeholder;
  };
  const mask = (raw: string) => {
    const text = raw.replace(INVISIBLE, "");
    let output = "";
    let cursor = 0;
    for (const hit of findIdentifiers(text)) {
      output +=
        text.slice(cursor, hit.start) + placeholderFor(hit.kind, hit.value);
      cursor = hit.end;
    }
    return output + text.slice(cursor);
  };
  /** Restores known placeholders in full.slice(from), judging URL contexts on the whole text. */
  const restoreFrom = (full: string, from: number) => {
    const spans = urlSpans(full);
    let output = "";
    let cursor = from;
    for (const match of full.matchAll(PLACEHOLDER)) {
      const start = match.index;
      if (start < from) continue;
      const kind = (match[1] ?? match[3]).replace(/\s/g, "").toUpperCase();
      const token = `{{${kind}-${Number(match[2] ?? match[4])}}}`;
      const entry = kept.find((candidate) => candidate.placeholder === token);
      if (!entry || spans.some(([a, b]) => start >= a && start < b)) continue;
      output += full.slice(cursor, start) + entry.value;
      cursor = start + match[0].length;
    }
    return output + full.slice(cursor);
  };
  const restore = (text: string) => restoreFrom(text, 0);
  const streamRestore = (onText: (text: string) => void) => {
    let emitted = "";
    let pending = "";
    const emit = (final: boolean) => {
      let safeEnd = pending.length;
      if (!final) {
        let open = pending.lastIndexOf("{");
        if (open > 0 && pending[open - 1] === "{") open--;
        const tail = open === -1 ? "" : pending.slice(open);
        // Hold a possible placeholder until its closing braces (or other text) arrive.
        if (
          open !== -1 &&
          tail.length <= MAX_PLACEHOLDER_LENGTH &&
          !tail.includes("}}") &&
          (!tail.includes("}") || tail.endsWith("}"))
        )
          safeEnd = open;
      }
      if (safeEnd > 0) {
        const chunk = pending.slice(0, safeEnd);
        onText(restoreFrom(emitted + chunk, emitted.length));
        emitted += chunk;
        pending = pending.slice(safeEnd);
      }
    };
    return {
      push(chunk: string) {
        pending += chunk;
        emit(false);
      },
      flush() {
        emit(true);
      },
    };
  };
  return {
    mask,
    restore,
    streamRestore,
    kept,
    summary() {
      const summary: Partial<Record<IdentifierKind, number>> = {};
      for (const entry of kept)
        summary[entry.kind] = (summary[entry.kind] ?? 0) + 1;
      return summary;
    },
  };
}

export const KIND_LABELS: Record<IdentifierKind, string> = {
  IBAN: "bank account",
  CARD: "card number",
  "TAX-ID": "tax number",
  INSURANCE: "insurance number",
  "ID-NUMBER": "ID or passport number",
  EMAIL: "email address",
  PHONE: "phone number",
  "BIRTH-DATE": "date of birth",
};

/** Plain-language note for the reply, e.g. "Kept on this device: 1 bank account, 2 phone numbers". */
export function describeKept(
  summary: Partial<Record<IdentifierKind, number>>,
): string {
  const parts = IDENTIFIER_KINDS.filter((kind) => summary[kind]).map((kind) => {
    const count = summary[kind]!;
    const label = KIND_LABELS[kind];
    return `${count} ${count === 1 ? label : label.replace(/(ess|y)$/, (m) => (m === "y" ? "ies" : "esses")).replace(/(?<!s)$/, "s")}`;
  });
  return parts.length ? `Kept on this device: ${parts.join(", ")}.` : "";
}

/** Instruction appended to the system prompt so the model preserves placeholders verbatim. */
export const MASKING_INSTRUCTION =
  " Some identifiers were replaced on the user's device with placeholders such as {{IBAN-1}} or {{PHONE-2}}. Treat each placeholder as the exact value it stands for, copy it unchanged wherever you need to refer to it, and never ask the user to reveal the value behind it.";

/** Possible personal text the detector cannot classify: two capitalised words or a long digit run. */
const POSSIBLY_PERSONAL = unicodeWords(
  /\b[A-ZÄÖÜ][a-zäöüß]{2,} [A-ZÄÖÜ][a-zäöüß]{2,}\b|\d{5,}/,
);

/**
 * Prepares a web-search query for the approval preview: recognised identifiers
 * are removed (not placeholdered, since the search provider must not receive
 * them at all) and the user is warned when the rest may still name a person.
 */
export function prepareSearchQuery(query: string): {
  value: string;
  removed: Partial<Record<IdentifierKind, number>>;
  note: string;
  warning: boolean;
} {
  const text = query.replace(INVISIBLE, "");
  const removed: Partial<Record<IdentifierKind, number>> = {};
  let value = "";
  let cursor = 0;
  for (const hit of findIdentifiers(text)) {
    removed[hit.kind] = (removed[hit.kind] ?? 0) + 1;
    value +=
      text.slice(cursor, hit.start) + `[${KIND_LABELS[hit.kind]} removed]`;
    cursor = hit.end;
  }
  value = (value + text.slice(cursor)).replace(/\s{2,}/g, " ").trim();
  const summary = describeKept(removed).replace(
    "Kept on this device",
    "Removed from the search text before approval",
  );
  return {
    value,
    removed,
    note: summary,
    warning: POSSIBLY_PERSONAL.test(value),
  };
}
