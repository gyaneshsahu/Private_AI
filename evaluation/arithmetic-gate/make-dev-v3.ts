// Writes dev-v3-20261023.json: the development set for Design B (arithmetic
// v3, 23 October 2026). Same kinds as dev-v2 plus a deliberate share of the
// four weak kinds gate v2 exposed: percentage change, surcharge and rate
// phrases, Swiss VAT, overtime; both languages. Generated once; every
// expected value computed from its derivation; shares no turn with any other
// set (tests/arithmetic-dev-v3.test.ts). dev-v2 may be used beside it; the
// run sets (cases.json, unseen-20261023, unseen-v2) must not.
//   node --import tsx evaluation/arithmetic-gate/make-dev-v3.ts
import { writeFileSync } from "node:fs";
import { evaluateDerivation } from "./derivation";
import type { GateCase } from "./scorer";
import { D } from "../../src/arithmetic/numbers";
import { formatLocaleNumber } from "../../src/arithmetic/locale-number";

type Locale = "de" | "en";
type Expected = GateCase["expected"][number][number];
type Kind = Expected["kind"];
type Item = { label: string; kind: Kind; derivation: string; currency?: "EUR" | "USD" | "GBP"; unit?: "days" | "months"; decimals?: number };
const item = (label: string, kind: Kind, derivation: string, extra: Partial<Pick<Item, "currency" | "unit" | "decimals">> = {}): Item => ({ label, kind, derivation, ...extra });
const money = (label: string, derivation: string, currency?: "EUR" | "USD" | "GBP") => item(label, "money", derivation, { currency, decimals: 2 });
const percent = (label: string, derivation: string, decimals?: number) => item(label, "percent", derivation, { decimals });
const time = (label: string, derivation: string) => item(label, "time", derivation);
const date = (label: string, derivation: string) => item(label, "date", derivation);

export function expectedItem(i: Item): Expected {
  const derived = evaluateDerivation(i.derivation);
  const value = i.kind === "time" || i.kind === "date" ? derived : i.decimals !== undefined ? new D(derived).toFixed(i.decimals) : new D(derived).toString();
  return {
    label: i.label,
    kind: i.kind,
    value,
    ...(i.currency ? { currency: i.currency } : {}),
    ...(i.unit ? { unit: i.unit } : {}),
    ...(i.decimals !== undefined ? { rounding: { decimals: i.decimals } } : {}),
    derivation: i.derivation,
  };
}

export function factLine(items: Expected[], locale: Locale): string {
  return items
    .map((e) => {
      switch (e.kind) {
        case "money":
          return `${e.label}: ${formatLocaleNumber(e.value, 2, locale)} ${e.currency ?? ""}`.trim();
        case "percent":
          return `${e.label}: ${formatLocaleNumber(e.value, e.rounding?.decimals ?? 0, locale)}${locale === "de" ? " %" : "%"}`;
        case "number":
          return `${e.label}: ${formatLocaleNumber(e.value, e.rounding?.decimals ?? 0, locale)}${e.unit === "days" ? (locale === "de" ? " Tage" : " days") : e.unit === "months" ? (locale === "de" ? " Monate" : " months") : ""}`;
        case "time":
          return `${e.label}: ${e.value}${locale === "de" ? " Uhr" : ""}`;
        case "date": {
          const [y, m, d] = e.value.split("-");
          return `${e.label}: ${locale === "de" ? `${d}.${m}.${y}` : e.value}`;
        }
        case "duration":
          return `${e.label}: ${e.value} ${locale === "de" ? "Minuten" : "minutes"}`;
      }
    })
    .join("; ");
}

type Draft = { category: string; locale: Locale; critical?: boolean; secondTurn: "correction" | "follow-up"; source: string; turns: [string, string]; expected: [Item[], Item[]] };

const drafts: Draft[] = [
  {
    category: "vat", locale: "de", critical: true, secondTurn: "correction", source: "net plus VAT",
    turns: ["Netto 1.780,00 EUR zzgl. 19 % Umsatzsteuer. Wie hoch sind die Umsatzsteuer und der Bruttobetrag?", "Korrektur: Es gilt der Satz von 7 %. Umsatzsteuer und Brutto?"],
    expected: [[money("Umsatzsteuer", "mul(1780, 0.19)", "EUR"), money("Brutto", "add(1780, mul(1780, 0.19))", "EUR")], [money("Umsatzsteuer", "mul(1780, 0.07)", "EUR"), money("Brutto", "add(1780, mul(1780, 0.07))", "EUR")]],
  },
  {
    category: "net-gross", locale: "de", critical: true, secondTurn: "follow-up", source: "gross with included VAT",
    turns: ["Bruttobetrag 2.618,00 EUR, darin sind 19 % Umsatzsteuer enthalten. Netto und Umsatzsteuer, auf Cent gerundet?", "Und 1.605,00 EUR brutto mit 7 % Umsatzsteuer enthalten?"],
    expected: [[money("Netto", "round(div(2618, 1.19), 2)", "EUR"), money("Umsatzsteuer", "sub(2618, round(div(2618, 1.19), 2))", "EUR")], [money("Netto", "round(div(1605, 1.07), 2)", "EUR"), money("Umsatzsteuer", "sub(1605, round(div(1605, 1.07), 2))", "EUR")]],
  },
  {
    category: "percent-change", locale: "de", critical: true, secondTurn: "follow-up", source: "electricity price per kWh",
    turns: ["Der Strompreis ist von 0,32 EUR auf 0,41 EUR pro kWh gestiegen. Um wie viel Prozent ist er gestiegen, zwei Nachkommastellen?", "Und wenn er stattdessen von 0,32 EUR auf 0,28 EUR fällt: Änderung in Prozent, negativ bei einem Rückgang?"],
    expected: [[percent("Anstieg", "round(mul(div(sub(0.41, 0.32), 0.32), 100), 2)", 2)], [percent("Änderung", "round(mul(div(sub(0.28, 0.32), 0.32), 100), 2)", 2)]],
  },
  {
    category: "percent-change", locale: "de", secondTurn: "follow-up", source: "revenue growth",
    turns: ["Der Umsatz ist von 84.500,00 EUR auf 91.260,00 EUR gewachsen. Prozentuale Steigerung mit zwei Nachkommastellen?", "Und von 91.260,00 EUR auf 95.823,00 EUR?"],
    expected: [[percent("Steigerung", "round(mul(div(sub(91260, 84500), 84500), 100), 2)", 2)], [percent("Steigerung", "round(mul(div(sub(95823, 91260), 91260), 100), 2)", 2)]],
  },
  {
    category: "overtime-rate", locale: "de", critical: true, secondTurn: "follow-up", source: "night hours at a rate multiplier",
    turns: ["Mein Stundenlohn ist 18,40 EUR. Nachtstunden werden mit 125 % des normalen Stundensatzes vergütet. Lohn für 6 Nachtstunden?", "Und für 9 Nachtstunden?"],
    expected: [[money("Lohn", "mul(mul(18.40, 1.25), 6)", "EUR")], [money("Lohn", "mul(mul(18.40, 1.25), 9)", "EUR")]],
  },
  {
    category: "surcharge", locale: "de", critical: true, secondTurn: "correction", source: "holiday surcharge",
    turns: ["Der Grundpreis ist 240,00 EUR; an Feiertagen gilt ein Zuschlag von 50 %. Preis am Feiertag?", "Am Sonntag ist der Zuschlag 30 %, nicht 50 %. Preis am Sonntag?"],
    expected: [[money("Preis", "mul(240, 1.5)", "EUR")], [money("Preis", "mul(240, 1.3)", "EUR")]],
  },
  {
    category: "swiss-vat", locale: "de", critical: true, secondTurn: "follow-up", source: "Swiss invoice, five-centime total",
    turns: ["Schweizer Rechnung: CHF 3'120.00 netto, Mehrwertsteuer 8.1 %. Steuer auf den Rappen, Total auf 5 Rappen gerundet?", "Und mit 2.6 % Mehrwertsteuer?"],
    expected: [[money("Steuer", "round(mul(3120, 0.081), 2)"), money("Total", "div(round(mul(add(3120, round(mul(3120, 0.081), 2)), 20), 0), 20)")], [money("Steuer", "round(mul(3120, 0.026), 2)"), money("Total", "div(round(mul(add(3120, round(mul(3120, 0.026), 2)), 20), 0), 20)")]],
  },
  {
    category: "instalments-simple-interest", locale: "de", secondTurn: "correction", source: "loan in months",
    turns: ["4.500,00 EUR zu 2,8 % einfachen Zinsen pro Jahr für 9 Monate. Zinsen und Gesamtbetrag?", "Korrektur: 15 Monate statt 9. Zinsen und Gesamtbetrag?"],
    expected: [[money("Zinsen", "div(mul(4500, 0.028, 9), 12)", "EUR"), money("Gesamtbetrag", "add(4500, div(mul(4500, 0.028, 9), 12))", "EUR")], [money("Zinsen", "div(mul(4500, 0.028, 15), 12)", "EUR"), money("Gesamtbetrag", "add(4500, div(mul(4500, 0.028, 15), 12))", "EUR")]],
  },
  {
    category: "compound-interest", locale: "de", secondTurn: "follow-up", source: "yearly compounding",
    turns: ["8.000,00 EUR zu 2 % pro Jahr mit jährlichem Zinseszins, 6 Jahre. Endbetrag, auf Cent gerundet?", "Und nach 3 Jahren?"],
    expected: [[money("Endbetrag", "round(mul(8000, pow(1.02, 6)), 2)", "EUR")], [money("Endbetrag", "round(mul(8000, pow(1.02, 3)), 2)", "EUR")]],
  },
  {
    category: "table-sum", locale: "de", secondTurn: "follow-up", source: "quarterly invoices, average",
    turns: ["Rechnungen im Quartal:\n- 1.240,00 EUR\n- 980,50 EUR\n- 2.310,75 EUR\nSumme und Durchschnitt der 3 Rechnungen, auf Cent gerundet?", "Eine weitere Rechnung über 400,00 EUR kommt dazu. Summe und Durchschnitt über die 4 Rechnungen?"],
    expected: [[money("Summe", "add(1240, 980.50, 2310.75)", "EUR"), money("Durchschnitt", "round(div(add(1240, 980.50, 2310.75), 3), 2)", "EUR")], [money("Summe", "add(1240, 980.50, 2310.75, 400)", "EUR"), money("Durchschnitt", "round(div(add(1240, 980.50, 2310.75, 400), 4), 2)", "EUR")]],
  },
  {
    category: "date-time", locale: "de", secondTurn: "correction", source: "train departure",
    turns: ["Mein Zug fährt um 17:42 Uhr. Der Fußweg dauert 14 Minuten, und ich will 8 Minuten Puffer. Wann spätestens los?", "Der Fußweg dauert 22 Minuten, nicht 14. Wann jetzt?"],
    expected: [[time("spätestens los", 'fmtClock(sub(clock("17:42"), add(14, 8)))')], [time("spätestens los", 'fmtClock(sub(clock("17:42"), add(22, 8)))')]],
  },
  {
    category: "proration", locale: "de", secondTurn: "correction", source: "yearly fee by months",
    turns: ["Die Jahresgebühr beträgt 360,00 EUR. Ich kündige nach 5 von 12 Monaten. Anteilige Gebühr und Erstattung?", "Korrektur: nach 8 Monaten. Anteilige Gebühr und Erstattung?"],
    expected: [[money("anteilige Gebühr", "mul(div(360, 12), 5)", "EUR"), money("Erstattung", "sub(360, mul(div(360, 12), 5))", "EUR")], [money("anteilige Gebühr", "mul(div(360, 12), 8)", "EUR"), money("Erstattung", "sub(360, mul(div(360, 12), 8))", "EUR")]],
  },
  {
    category: "vat", locale: "en", critical: true, secondTurn: "correction", source: "net plus VAT",
    turns: ["Net 2,460.00 EUR plus 19% VAT. What are the VAT and the gross amount?", "Correction: the rate is 7%. VAT and gross?"],
    expected: [[money("VAT", "mul(2460, 0.19)", "EUR"), money("gross", "add(2460, mul(2460, 0.19))", "EUR")], [money("VAT", "mul(2460, 0.07)", "EUR"), money("gross", "add(2460, mul(2460, 0.07))", "EUR")]],
  },
  {
    category: "net-gross", locale: "en", critical: true, secondTurn: "follow-up", source: "receipt including VAT",
    turns: ["A receipt of 357.00 USD includes 19% VAT. What are the net amount and the VAT?", "And a receipt of 238.00 USD including 19% VAT?"],
    expected: [[money("net", "round(div(357, 1.19), 2)", "USD"), money("VAT", "sub(357, round(div(357, 1.19), 2))", "USD")], [money("net", "round(div(238, 1.19), 2)", "USD"), money("VAT", "sub(238, round(div(238, 1.19), 2))", "USD")]],
  },
  {
    category: "percent-change", locale: "en", critical: true, secondTurn: "follow-up", source: "rent increase",
    turns: ["My rent goes from 1,150.00 EUR to 1,219.00 EUR. By what percentage does it increase, to two decimal places?", "And from 1,219.00 EUR to 1,280.00 EUR?"],
    expected: [[percent("increase", "round(mul(div(sub(1219, 1150), 1150), 100), 2)", 2)], [percent("increase", "round(mul(div(sub(1280, 1219), 1219), 100), 2)", 2)]],
  },
  {
    category: "percent-change", locale: "en", secondTurn: "follow-up", source: "cost decrease with sign",
    turns: ["Monthly costs fell from 1,250.00 EUR to 1,100.00 EUR. What is the percentage decrease, to one decimal place?", "What is the change in percent, negative for a decrease, from 1,100.00 EUR to 1,045.00 EUR?"],
    expected: [[percent("decrease", "round(mul(div(sub(1250, 1100), 1250), 100), 1)", 1)], [percent("change", "round(mul(div(sub(1045, 1100), 1100), 100), 1)", 1)]],
  },
  {
    category: "overtime-rate", locale: "en", critical: true, secondTurn: "follow-up", source: "Sunday hours at a rate multiplier",
    turns: ["I earn 19.00 EUR an hour, and Sunday hours are paid at 150% of the normal rate. What is the pay for 7 Sunday hours?", "And at 200% of the normal rate?"],
    expected: [[money("pay", "mul(mul(19, 1.5), 7)", "EUR")], [money("pay", "mul(mul(19, 2), 7)", "EUR")]],
  },
  {
    category: "surcharge", locale: "en", critical: true, secondTurn: "follow-up", source: "weekend surcharge then city tax",
    turns: ["The base price is 80.00 EUR per night plus a 15% weekend surcharge. What is the price per weekend night?", "Then a 12% city tax is added on the surcharged price. Price per weekend night including the tax, to the cent?"],
    expected: [[money("price", "mul(80, 1.15)", "EUR")], [money("price", "round(mul(mul(80, 1.15), 1.12), 2)", "EUR")]],
  },
  {
    category: "swiss-vat", locale: "en", critical: true, secondTurn: "follow-up", source: "Swiss invoice in English",
    turns: ["A Swiss invoice: CHF 1'985.00 net at 8.1% VAT. VAT to the centime, and the total rounded to 5 centimes?", "And at the 3.8% accommodation rate?"],
    expected: [[money("VAT", "round(mul(1985, 0.081), 2)"), money("total", "div(round(mul(add(1985, round(mul(1985, 0.081), 2)), 20), 0), 20)")], [money("VAT", "round(mul(1985, 0.038), 2)"), money("total", "div(round(mul(add(1985, round(mul(1985, 0.038), 2)), 20), 0), 20)")]],
  },
  {
    category: "overtime-rate", locale: "en", secondTurn: "follow-up", source: "weekly pay with an overtime threshold",
    turns: ["At 24.00 EUR an hour, with 44 working hours this week and anything above 40 paid at 150% of the normal rate, what is the gross pay?", "And with 38 working hours?"],
    expected: [[money("gross pay", "add(mul(40, 24), mul(sub(44, 40), mul(24, 1.5)))", "EUR")], [money("gross pay", "mul(38, 24)", "EUR")]],
  },
  {
    category: "instalments-simple-interest", locale: "en", secondTurn: "follow-up", source: "daily interest, 360 then 365 days",
    turns: ["A 3,600.00 EUR deposit earns 3.25% simple interest a year for 150 days on a 360-day year. Interest to the cent?", "And on a 365-day year?"],
    expected: [[money("interest", "round(div(mul(3600, 0.0325, 150), 360), 2)", "EUR")], [money("interest", "round(div(mul(3600, 0.0325, 150), 365), 2)", "EUR")]],
  },
  {
    category: "compound-interest", locale: "en", secondTurn: "follow-up", source: "monthly compounding",
    turns: ["12,000.00 EUR at 1.8% a year compounded monthly (1.8% divided by 12 each month) for 24 months. Balance at the end, to the cent?", "And after 48 months?"],
    expected: [[money("balance", "round(mul(12000, pow(add(1, div(0.018, 12)), 24)), 2)", "EUR")], [money("balance", "round(mul(12000, pow(add(1, div(0.018, 12)), 48)), 2)", "EUR")]],
  },
  {
    category: "date-time", locale: "en", secondTurn: "correction", source: "payment terms from an ISO date",
    turns: ["Payment terms are 30 days from the invoice date 2026-12-03. What is the due date?", "Correction: the terms are 45 days. Due date?"],
    expected: [[date("due date", 'addDays("2026-12-03", 30)')], [date("due date", 'addDays("2026-12-03", 45)')]],
  },
  {
    category: "multi-step", locale: "en", secondTurn: "correction", source: "discount then delivery surcharge",
    turns: ["List price 450.00 EUR, 20% off, then a 5% delivery surcharge on the discounted price. Amount to pay?", "The delivery surcharge is 8%, not 5%. Amount to pay?"],
    expected: [[money("amount to pay", "mul(mul(450, 0.8), 1.05)", "EUR")], [money("amount to pay", "mul(mul(450, 0.8), 1.08)", "EUR")]],
  },
];

export function buildDevV3() {
  const cases = drafts.map((d, i) => {
    const exp = [d.expected[0].map(expectedItem), d.expected[1].map(expectedItem)] as [Expected[], Expected[]];
    return {
      id: `dev3-${String(i + 1).padStart(2, "0")}`,
      family: "arithmetic" as const,
      category: d.category,
      locale: d.locale,
      critical: !!d.critical,
      secondTurn: d.secondTurn,
      synthetic: true as const,
      query: d.source,
      source: d.source,
      turns: d.turns,
      expected: exp,
      forbidden: [[], []] as [never[], never[]],
      mandatoryFacts: [factLine(exp[0], d.locale), factLine(exp[1], d.locale)] as [string, string],
      forbiddenConclusions: [],
      sources: [],
      humanScores: null,
    };
  });
  return {
    status: "DEVELOPMENT SET for Design B (arithmetic v3). Tuning Design B on this set and on dev-v2 is allowed; never pooled with any run set.",
    authoredOn: "2026-10-23",
    synthetic: true,
    note: "Generated by make-dev-v3.ts; every expected value is computed from its derivation. 24 cases, 12 German and 12 English, with a deliberate share of percentage change (4), surcharge and rate phrases (5), Swiss VAT (2) and overtime (3).",
    cases,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("make-dev-v3.ts")) {
  const set = buildDevV3();
  writeFileSync("evaluation/arithmetic-gate/dev-v3-20261023.json", JSON.stringify(set, null, 2) + "\n");
  console.log(`wrote ${set.cases.length} cases`);
}
