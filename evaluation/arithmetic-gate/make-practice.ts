// Writes practice.json: PRACTICE cases for iterating on prompts, the calculator
// and the post-check with paid runs (owner, 23 October 2026: "iterate freely;
// keep the final gate set frozen and untouched until the end"). The frozen gate
// in cases.json is never used for practice. Values are computed here with
// decimal arithmetic, so no expected number is typed by hand.
//   node --import tsx evaluation/arithmetic-gate/make-practice.ts
import { writeFileSync } from "node:fs";
import { D, type Dec } from "../../src/arithmetic/numbers";
import type { GateCase } from "./scorer";

type Locale = "de" | "en";
const money = (
  v: string | number | Dec,
  label: string,
  currency: "EUR" = "EUR",
) => ({
  label,
  kind: "money" as const,
  value: new D(v).toFixed(2),
  currency,
  rounding: { decimals: 2 },
  derivation: `practice:${label}`,
});
const percent = (v: string | number | Dec, label: string) => ({
  label,
  kind: "percent" as const,
  value: new D(v).toDecimalPlaces(2).toString(),
  rounding: { decimals: 2 },
  derivation: `practice:${label}`,
});
const time = (hhmm: string, label: string) => ({
  label,
  kind: "time" as const,
  value: hhmm,
  derivation: `practice:${label}`,
});
const fmt = (v: Dec, locale: Locale) => {
  const [int, frac] = v.toFixed(2).split(".");
  const grouped = int.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    locale === "de" ? "." : ",",
  );
  return locale === "de" ? `${grouped},${frac}` : `${grouped}.${frac}`;
};
const vatCase = (
  id: string,
  locale: Locale,
  net: string,
  rate: number,
  corrected: string,
): GateCase => {
  const n = new D(net),
    c = new D(corrected);
  const vat = n.mul(rate).div(100).toDecimalPlaces(2),
    vat2 = c.mul(rate).div(100).toDecimalPlaces(2);
  const de = locale === "de";
  return {
    id,
    family: "arithmetic",
    category: "vat",
    locale,
    critical: false,
    secondTurn: "correction",
    synthetic: true,
    query: `practice ${id}`,
    turns: de
      ? [
          `Nettobetrag ${fmt(n, "de")} EUR, Umsatzsteuer ${rate} %. Bitte Umsatzsteuer und Bruttobetrag berechnen, kaufmännisch auf Cent gerundet.`,
          `Korrektur: der Nettobetrag ist ${fmt(c, "de")} EUR. Bitte beide Werte neu berechnen.`,
        ]
      : [
          `Net amount ${fmt(n, "en")} EUR, VAT ${rate}%. Please calculate the VAT and the gross amount, rounded to the cent.`,
          `Correction: the net amount is ${fmt(c, "en")} EUR. Please recalculate both.`,
        ],
    expected: [
      [money(vat, "VAT"), money(n.add(vat), "Gross")],
      [money(vat2, "VAT"), money(c.add(vat2), "Gross")],
    ],
    forbidden: [[], []],
    mandatoryFacts: ["", ""],
    forbiddenConclusions: [],
    sources: [],
    humanScores: null,
  };
};
const grossToNetCase = (
  id: string,
  locale: Locale,
  gross: string,
  rate: number,
  corrected: string,
): GateCase => {
  const g = new D(gross),
    c = new D(corrected);
  const net = g.div(new D(100).add(rate).div(100)).toDecimalPlaces(2),
    net2 = c.div(new D(100).add(rate).div(100)).toDecimalPlaces(2);
  const de = locale === "de";
  return {
    id,
    family: "arithmetic",
    category: "net-gross",
    locale,
    critical: false,
    secondTurn: "correction",
    synthetic: true,
    query: `practice ${id}`,
    turns: de
      ? [
          `Eine Rechnung über brutto ${fmt(g, "de")} EUR enthält ${rate} % Umsatzsteuer. Wie hoch sind Nettobetrag und Steueranteil (auf Cent gerundet)?`,
          `Der Bruttobetrag ist tatsächlich ${fmt(c, "de")} EUR. Bitte neu rechnen.`,
        ]
      : [
          `An invoice of ${fmt(g, "en")} EUR gross includes ${rate}% VAT. What are the net amount and the tax portion (rounded to the cent)?`,
          `The gross amount is actually ${fmt(c, "en")} EUR. Please recalculate.`,
        ],
    expected: [
      [money(net, "Net"), money(g.sub(net), "Tax")],
      [money(net2, "Net"), money(c.sub(net2), "Tax")],
    ],
    forbidden: [[], []],
    mandatoryFacts: ["", ""],
    forbiddenConclusions: [],
    sources: [],
    humanScores: null,
  };
};
const changeCase = (
  id: string,
  locale: Locale,
  before: string,
  after: string,
  after2: string,
): GateCase => {
  const b = new D(before),
    a = new D(after),
    a2 = new D(after2);
  const pct = a.sub(b).div(b).mul(100),
    pct2 = a2.sub(b).div(b).mul(100);
  const de = locale === "de";
  return {
    id,
    family: "arithmetic",
    category: "percent-change",
    locale,
    critical: false,
    secondTurn: "correction",
    synthetic: true,
    query: `practice ${id}`,
    turns: de
      ? [
          `Meine Miete steigt von ${fmt(b, "de")} EUR auf ${fmt(a, "de")} EUR. Um wie viel Prozent ist das (auf zwei Nachkommastellen)?`,
          `Entschuldigung, die neue Miete ist ${fmt(a2, "de")} EUR. Bitte den Prozentsatz neu berechnen.`,
        ]
      : [
          `My rent rises from ${fmt(b, "en")} EUR to ${fmt(a, "en")} EUR. What is that in percent (two decimals)?`,
          `Sorry, the new rent is ${fmt(a2, "en")} EUR. Please recalculate the percentage.`,
        ],
    expected: [[percent(pct, "Change")], [percent(pct2, "Change")]],
    forbidden: [[], []],
    mandatoryFacts: ["", ""],
    forbiddenConclusions: [],
    sources: [],
    humanScores: null,
  };
};
const sumCase = (
  id: string,
  locale: Locale,
  items: [string, string][],
  replaced: [number, string],
): GateCase => {
  const total = items.reduce((s, [, v]) => s.add(v), new D(0));
  const items2 = items.map(
    ([n, v], i) => [n, i === replaced[0] ? replaced[1] : v] as [string, string],
  );
  const total2 = items2.reduce((s, [, v]) => s.add(v), new D(0));
  const de = locale === "de";
  const lines = (xs: [string, string][]) =>
    xs.map(([n, v]) => `${n}: ${fmt(new D(v), locale)} EUR`).join("\n");
  return {
    id,
    family: "arithmetic",
    category: "table-sum",
    locale,
    critical: false,
    secondTurn: "correction",
    synthetic: true,
    query: `practice ${id}`,
    turns: de
      ? [
          `Bitte die Gesamtsumme dieser Ausgaben berechnen:\n${lines(items)}`,
          `Korrektur: ${items2[replaced[0]][0]} kostet ${fmt(new D(replaced[1]), "de")} EUR. Neue Gesamtsumme?`,
        ]
      : [
          `Please total these expenses:\n${lines(items)}`,
          `Correction: ${items2[replaced[0]][0]} costs ${fmt(new D(replaced[1]), "en")} EUR. New total?`,
        ],
    expected: [[money(total, "Total")], [money(total2, "Total")]],
    forbidden: [[], []],
    mandatoryFacts: ["", ""],
    forbiddenConclusions: [],
    sources: [],
    humanScores: null,
  };
};
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const clock = (mins: number) =>
  `${String(Math.floor((((mins % 1440) + 1440) % 1440) / 60)).padStart(2, "0")}:${String(((mins % 60) + 60) % 60).padStart(2, "0")}`;
const timeCase = (
  id: string,
  locale: Locale,
  start: string,
  minus: number,
  minus2: number,
): GateCase => {
  const de = locale === "de";
  return {
    id,
    family: "arithmetic",
    category: "time",
    locale,
    critical: false,
    secondTurn: "correction",
    synthetic: true,
    query: `practice ${id}`,
    turns: de
      ? [
          `Mein Zug fährt um ${start} Uhr. Ich brauche ${minus} Minuten zum Bahnhof. Wann muss ich spätestens losgehen? Bitte nur die Uhrzeit mit kurzer Rechnung.`,
          `Korrektur: ich brauche ${minus2} Minuten, nicht ${minus}. Wann muss ich losgehen?`,
        ]
      : [
          `My train leaves at ${start}. I need ${minus} minutes to reach the station. When must I leave at the latest? Give the time with a short calculation.`,
          `Correction: I need ${minus2} minutes, not ${minus}. When must I leave?`,
        ],
    expected: [
      [time(clock(minutes(start) - minus), "Leave")],
      [time(clock(minutes(start) - minus2), "Leave")],
    ],
    forbidden: [
      [
        {
          label: "Wrong",
          kind: "time",
          value: clock(minutes(start) - minus - 7),
          reason: "practice",
        },
      ],
      [],
    ],
    mandatoryFacts: ["", ""],
    forbiddenConclusions: [],
    sources: [],
    humanScores: null,
  };
};
const instalmentCase = (
  id: string,
  locale: Locale,
  price: string,
  months: number,
  months2: number,
): GateCase => {
  const p = new D(price);
  const de = locale === "de";
  return {
    id,
    family: "arithmetic",
    category: "instalments",
    locale,
    critical: false,
    secondTurn: "correction",
    synthetic: true,
    query: `practice ${id}`,
    turns: de
      ? [
          `Ich zahle ${fmt(p, "de")} EUR in ${months} gleichen Monatsraten ohne Zinsen. Wie hoch ist eine Rate (auf Cent gerundet)?`,
          `Es sind ${months2} Raten, nicht ${months}. Bitte neu berechnen.`,
        ]
      : [
          `I pay ${fmt(p, "en")} EUR in ${months} equal monthly instalments without interest. How much is one instalment (rounded to the cent)?`,
          `It is ${months2} instalments, not ${months}. Please recalculate.`,
        ],
    expected: [
      [money(p.div(months), "Instalment")],
      [money(p.div(months2), "Instalment")],
    ],
    forbidden: [[], []],
    mandatoryFacts: ["", ""],
    forbiddenConclusions: [],
    sources: [],
    humanScores: null,
  };
};

const cases: GateCase[] = [
  vatCase("practice-01", "de", "2345.67", 19, "2435.67"),
  vatCase("practice-02", "en", "2345.67", 19, "2435.67"),
  vatCase("practice-03", "de", "189.90", 7, "198.90"),
  vatCase("practice-04", "en", "189.90", 7, "198.90"),
  grossToNetCase("practice-05", "de", "1785.00", 19, "1904.00"),
  grossToNetCase("practice-06", "en", "1785.00", 19, "1904.00"),
  changeCase("practice-07", "de", "850.00", "901.00", "935.00"),
  changeCase("practice-08", "en", "850.00", "901.00", "935.00"),
  sumCase(
    "practice-09",
    "de",
    [
      ["Miete", "1250.00"],
      ["Strom", "84.50"],
      ["Internet", "39.99"],
      ["Versicherung", "112.30"],
    ],
    [1, "96.10"],
  ),
  sumCase(
    "practice-10",
    "en",
    [
      ["Rent", "1250.00"],
      ["Electricity", "84.50"],
      ["Internet", "39.99"],
      ["Insurance", "112.30"],
    ],
    [1, "96.10"],
  ),
  timeCase("practice-11", "de", "09:23", 18, 25),
  timeCase("practice-12", "en", "09:23", 18, 25),
  timeCase("practice-13", "de", "14:05", 40, 55),
  timeCase("practice-14", "en", "07:10", 35, 50),
  instalmentCase("practice-15", "de", "1499.00", 12, 24),
  instalmentCase("practice-16", "en", "1499.00", 12, 24),
];
const out = {
  status: "PRACTICE_NOT_GATE",
  authoredOn: "2026-10-23",
  synthetic: true,
  note: "Practice cases for iteration with paid runs; generated by make-practice.ts with decimal arithmetic. Never pooled with the frozen gate in cases.json.",
  cases,
};
writeFileSync(
  "evaluation/arithmetic-gate/practice.json",
  JSON.stringify(out, null, 2) + "\n",
);
console.log(`wrote ${cases.length} practice cases`);
