/**
 * On-device identifier masking. Before a conversation is encrypted and sent,
 * identifiers that point at a person are replaced with placeholders such as
 * `{{IBAN-1}}`; the originals stay in this browser and are put back into the
 * reply. Only patterns that can be recognised reliably on the device are
 * covered: bank accounts, card numbers, tax and insurance numbers, document
 * numbers near a label, phone numbers, email addresses and labelled birth
 * dates. Names, addresses and free-text facts are NOT recognised; the product
 * copy must never claim more than this list.
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

const PLACEHOLDER =
  /\{\{(IBAN|CARD|TAX-ID|INSURANCE|ID-NUMBER|EMAIL|PHONE|BIRTH-DATE)-(\d{1,4})\}\}/g;
const MAX_PLACEHOLDER_LENGTH = 20;

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

function plausibleDayMonth(day: string, month: string) {
  const d = Number(day);
  const m = Number(month);
  return d >= 1 && d <= 31 && m >= 1 && m <= 12;
}

interface Detector {
  kind: IdentifierKind;
  pattern: RegExp;
  accept?: (match: RegExpExecArray, text: string) => boolean;
}

const LABEL_BEFORE = (keywords: string, window = 24) =>
  new RegExp(`(?:${keywords})[^\\n]{0,${window}}$`, "i");

const detectors: Detector[] = [
  {
    kind: "IBAN",
    pattern: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g,
    accept: (match) => isValidIban(match[0]),
  },
  {
    kind: "EMAIL",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  },
  {
    kind: "CARD",
    pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
    accept: (match) => isValidCardNumber(match[0]),
  },
  {
    kind: "INSURANCE",
    // German Rentenversicherungsnummer: area, birth date, initial, serial and check digit.
    pattern: /\b\d{2}[ ]?(\d{2})(\d{2})\d{2}[ ]?[A-Z][ ]?\d{3}\b/g,
    accept: (match) => plausibleDayMonth(match[1], match[2]),
  },
  {
    kind: "TAX-ID",
    pattern: /\b\d{2}[ ]?\d{3}[ ]?\d{3}[ ]?\d{3}\b/g,
    accept: (match) => isValidGermanTaxId(match[0]),
  },
  {
    kind: "TAX-ID",
    // Steuernummer with separators, e.g. 12/345/67890 or 123/4567/8901.
    pattern: /\b\d{2,3}\/\d{3,4}\/\d{4,5}\b/g,
  },
  {
    kind: "ID-NUMBER",
    // Passport or identity document numbers only when a label precedes them.
    pattern: /\b[A-Z0-9]{8,10}\b/g,
    accept: (match, text) =>
      /\d/.test(match[0]) &&
      /[A-Z]/.test(match[0]) &&
      LABEL_BEFORE(
        "passport|reisepass|ausweis|personalausweis|id card|identity card|document no|document number|passnummer|ausweisnummer",
      ).test(text.slice(0, match.index)),
  },
  {
    kind: "BIRTH-DATE",
    pattern:
      /\b(\d{1,2})[./](\d{1,2})[./](?:19|20)\d{2}\b|\b(?:19|20)\d{2}-(\d{2})-(\d{2})\b/g,
    accept: (match, text) =>
      LABEL_BEFORE(
        "geboren|geb\\.|born|birth|dob|geburtsdatum|geburtstag|date of birth|birthday",
        30,
      ).test(text.slice(0, match.index)) &&
      (match[1] !== undefined
        ? plausibleDayMonth(match[1], match[2])
        : plausibleDayMonth(match[4], match[3])),
  },
  {
    kind: "PHONE",
    pattern:
      /(?:(?<![\w.,])\+\d{1,3}|(?<![\w.,/-])00\d{1,3}|(?<![\w.,/+-])0\d{1,5})(?:[ ./-]?\(?\d+\)?){2,}/g,
    accept: (match) => {
      const digits = digitsOf(match[0]);
      // A dotted or slashed calendar date is never a phone number.
      if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(match[0].trim())) return false;
      return digits.length >= 8 && digits.length <= 15;
    },
  },
];

/** Finds identifiers in text, longest and earliest first, without overlaps. */
export function findIdentifiers(
  text: string,
): { kind: IdentifierKind; start: number; end: number; value: string }[] {
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
      if (detector.accept && !detector.accept(match, text)) continue;
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
  const mask = (text: string) => {
    let output = "";
    let cursor = 0;
    for (const hit of findIdentifiers(text)) {
      output +=
        text.slice(cursor, hit.start) + placeholderFor(hit.kind, hit.value);
      cursor = hit.end;
    }
    return output + text.slice(cursor);
  };
  const restore = (text: string) =>
    text.replace(PLACEHOLDER, (whole, kind: IdentifierKind, index: string) => {
      const entry = kept.find(
        (candidate) => candidate.placeholder === `{{${kind}-${Number(index)}}}`,
      );
      return entry ? entry.value : whole;
    });
  const streamRestore = (onText: (text: string) => void) => {
    let pending = "";
    const emit = (final: boolean) => {
      let safeEnd = pending.length;
      if (!final) {
        const open = pending.lastIndexOf("{{");
        if (open !== -1 && pending.indexOf("}}", open) === -1) {
          if (pending.length - open <= MAX_PLACEHOLDER_LENGTH) safeEnd = open;
        } else if (pending.endsWith("{")) safeEnd = pending.length - 1;
      }
      if (safeEnd > 0) {
        onText(restore(pending.slice(0, safeEnd)));
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
