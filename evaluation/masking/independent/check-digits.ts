/**
 * Check-digit helpers for the independent masking corpus. Written for this
 * corpus alone: nothing here comes from the benchmark generator or from the
 * product detector, so a shared misunderstanding of a check-digit rule cannot
 * hide in both. Used once to compute the invented values that are pasted as
 * literal text into `documents.ts`, and by the test to confirm that every
 * clean (not OCR-damaged) value in the corpus is valid.
 */

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const compact = (value: string) => value.replace(/[\s​­]/g, "").toUpperCase();

/** Letter to number as ISO 13616 does it: A=10 ... Z=35. */
const ibanNumber = (char: string) =>
  /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;

function mod97(numeric: string): number {
  let rest = 0;
  for (const digit of numeric) rest = (rest * 10 + Number(digit)) % 97;
  return rest;
}

/** Builds an IBAN from a country code and a BBAN by computing the two check digits. */
export function makeIban(country: string, bban: string): string {
  const numeric = [...(bban + country + "00")].map(ibanNumber).join("");
  const check = 98 - mod97(numeric);
  return country + String(check).padStart(2, "0") + bban;
}

export function isIban(value: string): boolean {
  const iban = compact(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  return mod97([...moved].map(ibanNumber).join("")) === 1;
}

/** Appends the Luhn digit to a card number given without its last digit. */
export function luhnComplete(partial: string): string {
  const digits = onlyDigits(partial);
  for (let d = 0; d <= 9; d++) if (isLuhn(digits + d)) return digits + d;
  throw new Error("unreachable");
}

export function isLuhn(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length < 12) return false;
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    total += d;
  }
  return total % 10 === 0;
}

/** ISO 7064 MOD 11,10 check digit over a digit string. */
function iso7064(body: string): number {
  let product = 10;
  for (const char of body) {
    let sum = (Number(char) + product) % 10;
    if (sum === 0) sum = 10;
    product = (2 * sum) % 11;
  }
  const check = 11 - product;
  return check === 10 ? 0 : check;
}

/** German Steuer-ID: ten digits (no leading 0, exactly one digit repeated two or three times) plus check. */
export function taxIdComplete(first10: string): string {
  if (!/^[1-9]\d{9}$/.test(first10)) throw new Error(`bad tax ID body ${first10}`);
  return first10 + iso7064(first10);
}

export function isTaxId(value: string): boolean {
  const digits = onlyDigits(value);
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const counts: Record<string, number> = {};
  for (const d of digits.slice(0, 10)) counts[d] = (counts[d] ?? 0) + 1;
  const repeats = Object.values(counts).filter((n) => n > 1);
  if (repeats.length !== 1 || repeats[0] > 3) return false;
  return iso7064(digits.slice(0, 10)) === Number(digits[10]);
}

/** German VAT ID (USt-IdNr.): DE, eight digits, ISO 7064 check digit. */
export function vatComplete(first8: string): string {
  return "DE" + first8 + iso7064(first8);
}

export function isGermanVat(value: string): boolean {
  const v = compact(value);
  return /^DE[1-9]\d{8}$/.test(v) && iso7064(v.slice(2, 10)) === Number(v[10]);
}

const letterPosition = (letter: string) =>
  String(letter.toUpperCase().charCodeAt(0) - 64).padStart(2, "0");
const crossSum = (n: number) => String(n).split("").reduce((a, b) => a + Number(b), 0);

/** Health insurance number (KVNR): letter, eight digits, check digit; weights 1,2,1,2... over the letter as two digits plus the eight digits. */
export function kvnrComplete(letterAnd8: string): string {
  const body = letterPosition(letterAnd8[0]) + letterAnd8.slice(1);
  let total = 0;
  [...body].forEach((d, i) => (total += crossSum(Number(d) * (i % 2 === 0 ? 1 : 2))));
  return letterAnd8.toUpperCase() + (total % 10);
}

export function isKvnr(value: string): boolean {
  const v = compact(value);
  return /^[A-Z]\d{9}$/.test(v) && kvnrComplete(v.slice(0, 9)) === v;
}

/** Pension insurance number (RVNR): area (2), birth date DDMMYY (6), letter, serial (2), check digit. */
const RV_WEIGHTS = [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1];
export function rvnrComplete(first11: string): string {
  const v = compact(first11);
  const body = v.slice(0, 8) + letterPosition(v[8]) + v.slice(9, 11);
  let total = 0;
  [...body].forEach((d, i) => (total += crossSum(Number(d) * RV_WEIGHTS[i])));
  return v + (total % 10);
}

export function isRvnr(value: string): boolean {
  const v = compact(value);
  return /^\d{8}[A-Z]\d{3}$/.test(v) && rvnrComplete(v.slice(0, 11)) === v;
}

/** ICAO 9303 check digit (weights 7, 3, 1; A=10; filler < = 0) for machine-readable zones. */
export function mrzCheck(field: string): number {
  const value = (char: string) =>
    char === "<" ? 0 : /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 55;
  const weights = [7, 3, 1];
  let total = 0;
  [...field].forEach((c, i) => (total += value(c) * weights[i % 3]));
  return total % 10;
}
