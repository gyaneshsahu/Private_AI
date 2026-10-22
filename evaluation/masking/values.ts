/**
 * Seeded value generators for the masking benchmark. Every identifier is
 * invented: random digits with the real check-digit rules (IBAN mod-97, card
 * Luhn, German tax ID ISO 7064 MOD 11,10, VAT ID, pension insurance number,
 * health insurance number). Nothing here is copied from a real person.
 * German landline numbers use the Bundesnetzagentur ranges reserved for
 * fiction where known, UK numbers the Ofcom drama ranges; mobile subscriber
 * digits are random. Email domains are reserved example domains.
 */

export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  digits(n: number): string {
    let out = "";
    for (let i = 0; i < n; i++) out += String(this.int(0, 9));
    return out;
  }
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0);
    let r = this.next() * total;
    for (const [item, w] of items) {
      r -= w;
      if (r < 0) return item;
    }
    return items[items.length - 1][0];
  }
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function mod97(value: string): number {
  let remainder = 0;
  for (const char of value) {
    const part = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of part) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

const IBAN_SPECS: Record<string, [("a" | "n"), number][]> = {
  DE: [["n", 18]],
  AT: [["n", 16]],
  NL: [["a", 4], ["n", 10]],
  FR: [["n", 23]],
  GB: [["a", 4], ["n", 14]],
  ES: [["n", 20]],
  IT: [["a", 1], ["n", 22]],
  CH: [["n", 17]],
  PL: [["n", 24]],
  BE: [["n", 12]],
};

export function makeIban(rng: Rng, country?: string): string {
  const code =
    country ??
    rng.weighted<string>([
      ["DE", 70],
      ["AT", 5],
      ["NL", 5],
      ["FR", 4],
      ["GB", 4],
      ["ES", 3],
      ["IT", 3],
      ["CH", 2],
      ["PL", 2],
      ["BE", 2],
    ]);
  let bban = "";
  for (const [type, n] of IBAN_SPECS[code])
    bban +=
      type === "n"
        ? rng.digits(n)
        : Array.from({ length: n }, () => rng.pick([...LETTERS])).join("");
  if (code === "DE") bban = String(rng.int(1, 8)) + bban.slice(1);
  const check = 98 - mod97(bban + code + "00");
  return code + pad(check) + bban;
}

export const groupsOf4 = (compact: string) =>
  compact.match(/.{1,4}/g)!.join(" ");

function luhnCheckDigit(partial: string): number {
  let sum = 0;
  let double = true;
  for (let i = partial.length - 1; i >= 0; i--) {
    let digit = Number(partial[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

export type CardBrand = "visa" | "mastercard" | "amex";
export function makeCard(rng: Rng, brand: CardBrand): string {
  const prefix =
    brand === "visa"
      ? "4"
      : brand === "mastercard"
        ? String(rng.int(51, 55))
        : rng.pick(["34", "37"]);
  const length = brand === "amex" ? 15 : 16;
  const body = prefix + rng.digits(length - 1 - prefix.length);
  return body + luhnCheckDigit(body);
}

export function formatCard(compact: string, style: string): string {
  if (compact.length === 15) {
    const groups = [compact.slice(0, 4), compact.slice(4, 10), compact.slice(10)];
    return style === "compact"
      ? compact
      : groups.join(style === "dash" ? "-" : " ");
  }
  if (style === "compact") return compact;
  return compact.match(/.{4}/g)!.join(style === "dash" ? "-" : " ");
}

/** ISO 7064 MOD 11,10 over the given digits (German tax ID and VAT ID). */
function mod1110(digits: string): number {
  let product = 10;
  for (const digit of digits) {
    let sum = (Number(digit) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  const check = 11 - product;
  return check === 10 ? 0 : check;
}

export function makeTaxId(rng: Rng): string {
  for (;;) {
    const pool = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const triple = rng.chance(0.25);
    const chosen = pool.slice(0, triple ? 8 : 9);
    const repeated = chosen[0];
    const ten = rng.shuffle([
      ...chosen,
      repeated,
      ...(triple ? [repeated] : []),
    ]);
    if (ten[0] === 0) continue;
    const head = ten.join("");
    return head + mod1110(head);
  }
}

export function makeVatId(rng: Rng): string {
  const head = String(rng.int(1, 9)) + rng.digits(7);
  return "DE" + head + mod1110(head);
}

export function makeSteuernummer(rng: Rng): { value: string; variant: string } {
  const style = rng.weighted<string>([
    ["2/3/5", 25],
    ["3/3/5", 20],
    ["3/4/4", 25],
    ["5/5", 10],
    ["hessen", 10],
    ["13-digit", 10],
  ]);
  const d = (n: number) => rng.digits(n);
  const value =
    style === "2/3/5"
      ? `${rng.int(11, 37)}/${d(3)}/${d(5)}`
      : style === "3/3/5"
        ? `${rng.int(101, 299)}/${d(3)}/${d(5)}`
        : style === "3/4/4"
          ? `${rng.int(101, 399)}/${d(4)}/${d(4)}`
          : style === "5/5"
            ? `${rng.int(10000, 99999)}/${d(5)}`
            : style === "hessen"
              ? `0${rng.int(10, 99)} ${d(3)} ${d(5)}`
              : `${rng.int(10, 99)}${rng.int(1, 9)}0${d(9)}`;
  return { value, variant: `steuernummer:${style}` };
}

export interface BirthDate {
  day: number;
  month: number;
  year: number;
}

export function makeBirthDate(rng: Rng): BirthDate {
  return {
    day: rng.int(1, 28),
    month: rng.int(1, 12),
    year: rng.int(1942, 2006),
  };
}

/** German pension insurance number (Rentenversicherungsnummer) with check digit. */
export function makePensionNumber(
  rng: Rng,
  birth: BirthDate,
  surname: string,
): { compact: string; spaced: string; mixed: string } {
  const area = pad(rng.int(2, 89));
  const dob = pad(birth.day) + pad(birth.month) + pad(birth.year % 100);
  const letter = (
    surname.normalize("NFD").replace(/[^A-Za-z]/g, "")[0] ?? "A"
  ).toUpperCase();
  const serial = pad(rng.int(0, 99));
  const digits =
    area + dob + pad(letter.charCodeAt(0) - 64) + serial;
  const weights = [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1];
  let sum = 0;
  weights.forEach((w, i) => {
    const product = Number(digits[i]) * w;
    sum += Math.floor(product / 10) + (product % 10);
  });
  const check = String(sum % 10);
  return {
    compact: `${area}${dob}${letter}${serial}${check}`,
    spaced: `${area} ${dob} ${letter} ${serial}${check}`,
    mixed: `${area} ${dob} ${letter}${serial}${check}`,
  };
}

/** German health insurance number (Krankenversichertennummer): letter, 8 digits, check digit. */
export function makeHealthInsuranceNumber(rng: Rng): string {
  const letter = rng.pick([...LETTERS]);
  const body = rng.digits(8);
  const digits = pad(letter.charCodeAt(0) - 64) + body;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const product = Number(digits[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 10) + (product % 10);
  }
  return letter + body + String(sum % 10);
}

const DOC_SET = "CFGHJKLMNPRTVWXYZ0123456789";
export type DocumentKind = "de-passport" | "de-id" | "uk-passport" | "at-passport";
export function makeDocumentNumber(rng: Rng, kind: DocumentKind): string {
  const many = (n: number) =>
    Array.from({ length: n }, () => rng.pick([...DOC_SET])).join("");
  switch (kind) {
    case "de-passport":
      return "C" + many(8);
    case "de-id":
      return rng.pick([..."LMNPRTVWXY"]) + many(8);
    case "uk-passport":
      return String(rng.int(1, 9)) + rng.digits(8);
    case "at-passport":
      return rng.pick([..."PU"]) + rng.digits(7);
  }
}

const MOBILE_PREFIXES = [
  "0151", "0152", "0157", "0160", "0162", "0170", "0171", "0172", "0173",
  "0175", "0176", "0177", "0178", "0179",
];
const FICTION_LANDLINES: [string, string][] = [
  ["30", "23125"],
  ["69", "90009"],
  ["40", "66969"],
  ["221", "4710"],
  ["89", "99998"],
];

export type PhoneType =
  | "de-mobile"
  | "de-landline"
  | "de-service"
  | "uk-landline"
  | "uk-mobile"
  | "ch"
  | "at";

/** Returns a formatted phone number and its format variant. */
export function makePhone(
  rng: Rng,
  type: PhoneType,
): { value: string; variant: string } {
  if (type === "uk-landline" || type === "uk-mobile") {
    const mobile = type === "uk-mobile";
    const [area, rest] = mobile
      ? ["7700", "900" + rng.digits(3)]
      : ["20", "7946 0" + rng.digits(3)];
    const intl = rng.chance(0.5);
    return {
      value: intl
        ? `+44 ${area} ${rest}`
        : `0${area} ${rest}`,
      variant: `${type}:${intl ? "intl" : "national"}`,
    };
  }
  if (type === "ch")
    return {
      value: `+41 ${rng.pick(["44", "31", "61"])} ${rng.digits(3)} ${rng.digits(2)} ${rng.digits(2)}`,
      variant: "ch:intl",
    };
  if (type === "at")
    return rng.chance(0.5)
      ? { value: `+43 1 ${rng.digits(3)} ${rng.digits(4)}`, variant: "at:intl" }
      : { value: `01 ${rng.digits(3)} ${rng.digits(4)}`, variant: "at:national" };
  let area: string;
  let subscriber: string;
  if (type === "de-mobile") {
    const prefix = rng.pick(MOBILE_PREFIXES);
    area = prefix.slice(1);
    subscriber = rng.digits(prefix.startsWith("015") ? 8 : 7);
  } else if (type === "de-service") {
    area = rng.pick(["800", "180"]);
    subscriber = area === "180" ? String(rng.int(1, 6)) + rng.digits(6) : rng.digits(7);
  } else if (rng.chance(0.7)) {
    const [code, block] = rng.pick(FICTION_LANDLINES);
    area = code;
    subscriber = block + rng.digits(3);
  } else {
    area = rng.pick(["7531", "6221", "351", "511", "911", "4321", "2131"]);
    subscriber = rng.digits(area.length >= 4 ? rng.int(4, 6) : rng.int(6, 7));
  }
  const style = rng.weighted<string>([
    ["national-space", 22],
    ["national-slash", 10],
    ["national-dash", 5],
    ["din-extension", type === "de-landline" ? 6 : 0],
    ["parentheses", type === "de-landline" ? 6 : 0],
    ["pairs", 8],
    ["intl-space", 18],
    ["intl-zero", 6],
    ["intl-compact", 4],
    ["intl-00", 4],
    ["intl-dash", 2],
    ["national-compact", 9],
  ]);
  const pairs = (s: string) =>
    s.length <= 4 ? s : s.slice(0, s.length % 2 ? 3 : 2) + " " + (s.slice(s.length % 2 ? 3 : 2).match(/.{2}/g) ?? []).join(" ");
  const value =
    style === "national-space"
      ? `0${area} ${subscriber}`
      : style === "national-slash"
        ? `0${area}/${subscriber}`
        : style === "national-dash"
          ? `0${area}-${subscriber}`
          : style === "din-extension"
            ? `0${area} ${subscriber.slice(0, -2)}-${subscriber.slice(-2)}`
            : style === "parentheses"
              ? `(0${area}) ${subscriber}`
              : style === "pairs"
                ? `0${area} ${pairs(subscriber)}`
                : style === "intl-space"
                  ? `+49 ${area} ${subscriber}`
                  : style === "intl-zero"
                    ? `+49 (0)${area} ${subscriber}`
                    : style === "intl-compact"
                      ? `+49${area}${subscriber}`
                      : style === "intl-00"
                        ? `0049 ${area} ${subscriber}`
                        : style === "intl-dash"
                          ? `+49-${area}-${subscriber}`
                          : `0${area}${subscriber}`;
  return { value, variant: `${type}:${style}` };
}

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
  "September", "Oktober", "November", "Dezember",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export function formatBirthDate(
  rng: Rng,
  birth: BirthDate,
  lang: "de" | "en",
): { value: string; variant: string } {
  const { day, month, year } = birth;
  const style =
    lang === "de"
      ? rng.weighted<string>([
          ["dd.mm.yyyy", 60],
          ["d.m.yyyy", 12],
          ["dd.mm.yy", 8],
          ["d. Monat yyyy", 12],
          ["yyyy-mm-dd", 8],
        ])
      : rng.weighted<string>([
          ["dd/mm/yyyy", 30],
          ["dd.mm.yyyy", 20],
          ["d Month yyyy", 25],
          ["Month d, yyyy", 10],
          ["yyyy-mm-dd", 15],
        ]);
  const value =
    style === "dd.mm.yyyy"
      ? `${pad(day)}.${pad(month)}.${year}`
      : style === "d.m.yyyy"
        ? `${day}.${month}.${year}`
        : style === "dd.mm.yy"
          ? `${pad(day)}.${pad(month)}.${pad(year % 100)}`
          : style === "d. Monat yyyy"
            ? `${day}. ${MONTHS_DE[month - 1]} ${year}`
            : style === "yyyy-mm-dd"
              ? `${year}-${pad(month)}-${pad(day)}`
              : style === "dd/mm/yyyy"
                ? `${pad(day)}/${pad(month)}/${year}`
                : style === "d Month yyyy"
                  ? `${day} ${MONTHS_EN[month - 1]} ${year}`
                  : `${MONTHS_EN[month - 1]} ${day}, ${year}`;
  return { value, variant: `birth:${style}` };
}

/** An ordinary (non-birth) date, used as a decoy. */
export function decoyDate(rng: Rng, lang: "de" | "en", short = false): string {
  const day = rng.int(1, 28);
  const month = rng.int(1, 12);
  const year = rng.pick([2024, 2025, 2026]);
  if (short) return `${pad(day)}.${pad(month)}.`;
  if (lang === "en" && rng.chance(0.5)) return `${pad(day)}/${pad(month)}/${year}`;
  if (rng.chance(0.15)) return `${year}-${pad(month)}-${pad(day)}`;
  return `${pad(day)}.${pad(month)}.${year}`;
}

export function amount(rng: Rng, lang: "de" | "en", max = 2500): string {
  const value = rng.int(1, max * 100) / 100;
  const [int, cents] = value.toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === "de" ? "." : ",");
  return lang === "de"
    ? `${grouped},${cents} ${rng.chance(0.5) ? "EUR" : "€"}`
    : `${rng.chance(0.5) ? "EUR " : "€"}${grouped}.${cents}`;
}

const FIRST_DE = [
  "Anna", "Lena", "Marie", "Sophie", "Julia", "Laura", "Katharina", "Sabine",
  "Petra", "Jonas", "Lukas", "Felix", "Maximilian", "Tobias", "Stefan",
  "Thomas", "Michael", "Andreas", "Jan", "Niklas", "Jürgen", "Björn", "Özlem",
  "Emre", "Agnieszka", "Mehmet", "Greta", "Hannes", "Ines", "Ralf",
];
const LAST_DE = [
  "Weber", "Becker", "Hoffmann", "Schäfer", "Koch", "Richter", "Klein",
  "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger",
  "Hartmann", "Lange", "Schmitt", "Werner", "Krause", "Meier", "Lehmann",
  "Köhler", "Yilmaz", "Kowalski", "Nowak", "Brandt", "Vogel", "Engel",
  "Lindner", "Albers",
];
const FIRST_EN = [
  "Oliver", "Emily", "Harry", "Grace", "Jack", "Chloe", "Thomas", "Sophie",
  "Daniel", "Hannah", "Samuel", "Megan", "Liam", "Aoife", "Priya", "Arjun",
];
const LAST_EN = [
  "Bennett", "Clarke", "Hughes", "Turner", "Walsh", "Murphy", "Patel",
  "Shah", "Foster", "Doyle", "Reid", "Lawson", "Carter", "Gallagher",
];
const STREETS = [
  "Lindenweg", "Ahornstraße", "Am Mühlbach", "Rosenstraße", "Gartenweg",
  "Birkenallee", "Schillerplatz", "Kastanienweg", "Holunderstieg",
  "Talstraße", "Wiesengrund", "Erlenring", "Fliederweg", "Sonnenhang",
];
const CITIES: [string, string][] = [
  ["10115", "Berlin"], ["20095", "Hamburg"], ["80331", "München"],
  ["50667", "Köln"], ["60311", "Frankfurt am Main"], ["70173", "Stuttgart"],
  ["01067", "Dresden"], ["04109", "Leipzig"], ["28195", "Bremen"],
  ["90402", "Nürnberg"], ["69117", "Heidelberg"], ["78462", "Konstanz"],
];

export interface Person {
  first: string;
  last: string;
  street: string;
  postcode: string;
  city: string;
  birth: BirthDate;
  emailLocal: string;
}

const ascii = (value: string) =>
  value
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "");

export function makePerson(rng: Rng, lang: "de" | "en"): Person {
  const english = lang === "en" && rng.chance(0.6);
  const first = rng.pick(english ? FIRST_EN : FIRST_DE);
  const last = rng.pick(english ? LAST_EN : LAST_DE);
  const [postcode, city] = rng.pick(CITIES);
  const f = ascii(first).toLowerCase();
  const l = ascii(last).toLowerCase();
  const emailLocal = rng.weighted<string>([
    [`${f}.${l}`, 40],
    [`${f[0]}.${l}`, 15],
    [`${f}${l}${rng.int(70, 99)}`, 15],
    [`${f}_${l}`, 10],
    [`${f}-${l}`, 5],
    [`${f}.${l}+${rng.pick(["shop", "bank", "post"])}`, 5],
    [`${l}${rng.int(1, 999)}`, 10],
  ]);
  return {
    first,
    last,
    street: `${rng.pick(STREETS)} ${rng.int(1, 120)}${rng.chance(0.15) ? rng.pick(["a", "b"]) : ""}`,
    postcode,
    city,
    birth: makeBirthDate(rng),
    emailLocal,
  };
}

export const EMAIL_DOMAINS = [
  "example.com",
  "example.org",
  "example.net",
  "mail.example",
  "post.example",
  "web.example",
  "familie.test",
];

export function makeEmail(rng: Rng, local: string, domain?: string): string {
  return `${local}@${domain ?? rng.pick(EMAIL_DOMAINS)}`;
}

/* Decoys: ordinary numbers that must NOT be masked. */
export const decoy = {
  invoiceNumber: (rng: Rng) =>
    rng.pick([
      `RE-${rng.pick([2025, 2026])}-${rng.digits(6)}`,
      `${rng.pick([2025, 2026])}${rng.digits(6)}`,
      `R${rng.digits(8)}`,
      `INV-${rng.digits(5)}`,
    ]),
  customerNumber: (rng: Rng) =>
    rng.pick([
      rng.digits(rng.int(6, 8)),
      "00" + rng.digits(rng.int(6, 8)),
      "0" + rng.digits(rng.int(8, 9)),
      `K-${rng.digits(6)}`,
    ]),
  contractNumber: (rng: Rng) =>
    rng.pick([rng.digits(9), `VN ${rng.digits(3)} ${rng.digits(6)}`, `${rng.digits(4)}-${rng.digits(5)}`]),
  bic: (rng: Rng) =>
    rng.pick(["COBADEFFXXX", "DEUTDEDBBER", "GENODEF1M04", "INGDDEFFXXX", "BYLADEM1001", "HELADEF1822", "MARKDEF1100"]),
  creditorId: (rng: Rng) => `DE${rng.digits(2)}ZZZ0000${rng.digits(7)}`,
  mandateReference: (rng: Rng) =>
    rng.pick([`M-${rng.digits(4)}-${rng.digits(9)}`, `MREF${rng.digits(12)}`, rng.digits(12)]),
  endToEnd: (rng: Rng) => rng.pick([rng.digits(16), rng.digits(14), `E2E${rng.digits(13)}`]),
  ean: (rng: Rng) => "40" + rng.digits(11),
  tracking: (rng: Rng) =>
    rng.pick([`00340434${rng.digits(12)}`, `JJD${rng.digits(18)}`, `1Z${rng.digits(16)}`]),
  caseReference: (rng: Rng) =>
    rng.pick([`Az. ${rng.int(1, 99)} O ${rng.int(10, 999)}/26`, `Az.: ${rng.digits(3)}/${rng.digits(5)}`, `Gz. ${rng.digits(2)}-${rng.digits(4)}`]),
  icd: (rng: Rng) => rng.pick(["J06.9", "M54.5", "I10.90", "E11.9", "K21.9", "F32.1", "R51", "Z00.0"]),
  meter: (rng: Rng) => `${rng.int(1, 9)}${rng.pick(["ESY", "APA", "EMH"])}${rng.digits(8)}`,
  clinicNumber: (rng: Rng) => rng.digits(9),
  vin: (rng: Rng) =>
    "WVW" + Array.from({ length: 14 }, () => rng.pick([..."ABCDEFGHJKLMNPRSTUVWXYZ0123456789"])).join(""),
  employeeNumber: (rng: Rng) => rng.pick([rng.digits(5), `P-${rng.digits(6)}`, "000" + rng.digits(5)]),
  percent: (rng: Rng, lang: "de" | "en") =>
    lang === "de" ? `${rng.int(1, 30)},${rng.int(0, 9)} %` : `${rng.int(1, 30)}.${rng.int(0, 9)}%`,
  time: (rng: Rng) => `${pad(rng.int(7, 22))}:${pad(rng.int(0, 59))}`,
};
