// Writes dev-v2-20261023.json: the development set for Design A (arithmetic
// v2, 23 October 2026). It is separate from practice.json, the frozen
// cases.json, unseen-20261023.json and public-20261023.json and is the only
// set Design A is tuned on. Every expected value is computed here from its
// written derivation (derivation.ts helpers), never typed by hand; the test
// tests/arithmetic-dev-v2.test.ts re-derives them. Same calculation kinds as
// the earlier sets plus Swiss five-centime rounding and a share-as-percentage.
//   node --import tsx evaluation/arithmetic-gate/make-dev-v2.ts
import { writeFileSync } from "node:fs";
import { evaluateDerivation } from "./derivation";
import type { GateCase } from "./scorer";
import { D } from "../../src/arithmetic/numbers";
import { formatLocaleNumber } from "../../src/arithmetic/locale-number";

type Locale = "de" | "en";
type Expected = GateCase["expected"][number][number];
type Kind = Expected["kind"];

type Item = {
  label: string;
  kind: Kind;
  derivation: string;
  currency?: "EUR" | "USD" | "GBP";
  unit?: "days" | "months";
  decimals?: number;
};

const item = (
  label: string,
  kind: Kind,
  derivation: string,
  extra: Partial<Pick<Item, "currency" | "unit" | "decimals">> = {},
): Item => ({ label, kind, derivation, ...extra });
const money = (label: string, derivation: string, currency?: "EUR" | "USD" | "GBP") =>
  item(label, "money", derivation, { currency, decimals: 2 });
const percent = (label: string, derivation: string, decimals?: number) =>
  item(label, "percent", derivation, { decimals });
const number = (label: string, derivation: string, extra: Partial<Pick<Item, "unit" | "decimals">> = {}) =>
  item(label, "number", derivation, extra);
const time = (label: string, derivation: string) => item(label, "time", derivation);
const date = (label: string, derivation: string) => item(label, "date", derivation);
const duration = (label: string, derivation: string) => item(label, "duration", derivation);

function expected(i: Item): Expected {
  const derived = evaluateDerivation(i.derivation);
  const value =
    i.kind === "time" || i.kind === "date"
      ? derived
      : i.decimals !== undefined
        ? new D(derived).toFixed(i.decimals)
        : new D(derived).toString();
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

function fact(items: Expected[], locale: Locale): string {
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

type Draft = {
  category: string;
  locale: Locale;
  critical?: boolean;
  secondTurn: "correction" | "follow-up";
  query: string;
  turns: [string, string];
  expected: [Item[], Item[]];
};

const drafts: Draft[] = [
  {
    category: "vat",
    locale: "de",
    critical: true,
    secondTurn: "correction",
    query: "net to VAT and gross, German, rate change",
    turns: [
      "Ich stelle eine Rechnung über netto 2.345,67 EUR mit 19 % Umsatzsteuer. Wie hoch sind die Umsatzsteuer und der Bruttobetrag, jeweils kaufmännisch auf Cent gerundet?",
      "Korrektur: Es gilt der ermäßigte Satz von 7 %, nicht 19 %. Bitte Umsatzsteuer und Brutto neu berechnen.",
    ],
    expected: [
      [money("Umsatzsteuer", "round(mul(2345.67, 0.19), 2)", "EUR"), money("Brutto", "add(2345.67, round(mul(2345.67, 0.19), 2))", "EUR")],
      [money("Umsatzsteuer", "round(mul(2345.67, 0.07), 2)", "EUR"), money("Brutto", "add(2345.67, round(mul(2345.67, 0.07), 2))", "EUR")],
    ],
  },
  {
    category: "vat",
    locale: "en",
    critical: true,
    secondTurn: "correction",
    query: "three net items, VAT once on the total, item removed",
    turns: [
      "Three net line items: 45.00 EUR, 12.99 EUR and 230.50 EUR. VAT is 19%, charged once on the net total and rounded to the cent. Give the net total, the VAT and the gross total.",
      "Please drop the 12.99 EUR item. Net total, VAT and gross total again?",
    ],
    expected: [
      [
        money("net total", "add(45, 12.99, 230.50)", "EUR"),
        money("VAT", "round(mul(add(45, 12.99, 230.50), 0.19), 2)", "EUR"),
        money("gross total", "add(add(45, 12.99, 230.50), round(mul(add(45, 12.99, 230.50), 0.19), 2))", "EUR"),
      ],
      [
        money("net total", "add(45, 230.50)", "EUR"),
        money("VAT", "round(mul(add(45, 230.50), 0.19), 2)", "EUR"),
        money("gross total", "add(add(45, 230.50), round(mul(add(45, 230.50), 0.19), 2))", "EUR"),
      ],
    ],
  },
  {
    category: "net-gross",
    locale: "de",
    critical: true,
    secondTurn: "follow-up",
    query: "gross to net, German, two rates",
    turns: [
      "Ein Bruttobetrag von 1.428,00 EUR enthält 19 % Umsatzsteuer. Wie hoch sind der Nettobetrag und die enthaltene Umsatzsteuer, kaufmännisch auf Cent gerundet?",
      "Und wenn in denselben 1.428,00 EUR brutto stattdessen 7 % Umsatzsteuer enthalten sind?",
    ],
    expected: [
      [money("Netto", "round(div(1428, 1.19), 2)", "EUR"), money("Umsatzsteuer", "sub(1428, round(div(1428, 1.19), 2))", "EUR")],
      [money("Netto", "round(div(1428, 1.07), 2)", "EUR"), money("Umsatzsteuer", "sub(1428, round(div(1428, 1.07), 2))", "EUR")],
    ],
  },
  {
    category: "net-gross",
    locale: "en",
    secondTurn: "correction",
    query: "gross to net in USD, corrected gross",
    turns: [
      "A gross amount of 2,975.00 USD includes 19% VAT. What are the net amount and the VAT, rounded to the cent?",
      "Correction: the gross amount is 2,957.00 USD, same rate. Net and VAT again?",
    ],
    expected: [
      [money("net", "round(div(2975, 1.19), 2)", "USD"), money("VAT", "sub(2975, round(div(2975, 1.19), 2))", "USD")],
      [money("net", "round(div(2957, 1.19), 2)", "USD"), money("VAT", "sub(2957, round(div(2957, 1.19), 2))", "USD")],
    ],
  },
  {
    category: "percent-change",
    locale: "de",
    critical: true,
    secondTurn: "follow-up",
    query: "price increase then decrease in percent",
    turns: [
      "Ein Preis steigt von 1.250,00 EUR auf 1.400,00 EUR. Um wie viel Prozent steigt er?",
      "Und wenn er stattdessen von 1.250,00 EUR auf 1.100,00 EUR fällt: um wie viel Prozent sinkt er?",
    ],
    expected: [[percent("Anstieg", "mul(div(sub(1400, 1250), 1250), 100)")], [percent("Rückgang", "mul(div(sub(1250, 1100), 1250), 100)")]],
  },
  {
    category: "percent-change",
    locale: "en",
    secondTurn: "correction",
    query: "salary increase, two decimals",
    turns: [
      "My salary goes from 48,000.00 EUR to 51,600.00 EUR a year. By what percentage does it increase? Round to two decimal places.",
      "Sorry, the new salary is 50,000.00 EUR. What is the increase now?",
    ],
    expected: [
      [percent("increase", "round(mul(div(sub(51600, 48000), 48000), 100), 2)", 2)],
      [percent("increase", "round(mul(div(sub(50000, 48000), 48000), 100), 2)", 2)],
    ],
  },
  {
    category: "instalments-simple-interest",
    locale: "de",
    secondTurn: "correction",
    query: "simple interest, years then months",
    turns: [
      "Ich leihe 12.500,00 EUR zu 3,2 % einfachen Zinsen pro Jahr für 3 Jahre. Wie hoch sind die Zinsen und der Gesamtbetrag am Ende?",
      "Korrektur: Die Laufzeit beträgt 30 Monate, nicht 3 Jahre. Zinsen und Gesamtbetrag?",
    ],
    expected: [
      [money("Zinsen", "mul(12500, 0.032, 3)", "EUR"), money("Gesamtbetrag", "add(12500, mul(12500, 0.032, 3))", "EUR")],
      [money("Zinsen", "mul(12500, 0.032, div(30, 12))", "EUR"), money("Gesamtbetrag", "add(12500, mul(12500, 0.032, div(30, 12)))", "EUR")],
    ],
  },
  {
    category: "instalments-simple-interest",
    locale: "en",
    critical: true,
    secondTurn: "correction",
    query: "daily simple interest on a 365-day year",
    turns: [
      "7,200.00 EUR earns 4.5% simple interest per year for 200 days on a 365-day year. What is the interest, rounded to the cent, and the total?",
      "Make that 120 days instead of 200. Interest and total?",
    ],
    expected: [
      [money("interest", "round(div(mul(7200, 0.045, 200), 365), 2)", "EUR"), money("total", "add(7200, round(div(mul(7200, 0.045, 200), 365), 2))", "EUR")],
      [money("interest", "round(div(mul(7200, 0.045, 120), 365), 2)", "EUR"), money("total", "add(7200, round(div(mul(7200, 0.045, 120), 365), 2))", "EUR")],
    ],
  },
  {
    category: "compound-interest",
    locale: "de",
    secondTurn: "follow-up",
    query: "yearly compounding, three then five years",
    turns: [
      "5.000,00 EUR werden zu 3 % pro Jahr mit jährlichem Zinseszins für 3 Jahre angelegt. Wie hoch ist der Endbetrag, kaufmännisch auf Cent gerundet?",
      "Und nach 5 Jahren?",
    ],
    expected: [[money("Endbetrag", "round(mul(5000, pow(1.03, 3)), 2)", "EUR")], [money("Endbetrag", "round(mul(5000, pow(1.03, 5)), 2)", "EUR")]],
  },
  {
    category: "compound-interest",
    locale: "en",
    secondTurn: "follow-up",
    query: "monthly compounding over 24 then 36 months",
    turns: [
      "20,000.00 EUR is invested at 2.4% per year with monthly compounding (2.4% divided by 12 each month) for 24 months. What is the final amount, rounded to the cent?",
      "And after 36 months?",
    ],
    expected: [
      [money("final amount", "round(mul(20000, pow(add(1, div(0.024, 12)), 24)), 2)", "EUR")],
      [money("final amount", "round(mul(20000, pow(add(1, div(0.024, 12)), 36)), 2)", "EUR")],
    ],
  },
  {
    category: "table-sum",
    locale: "de",
    critical: true,
    secondTurn: "correction",
    query: "four-line expense table, one line corrected",
    turns: [
      "Meine monatlichen Ausgaben:\n| Posten | Betrag |\n| --- | --- |\n| Miete | 1.150,00 EUR |\n| Strom | 78,40 EUR |\n| Internet | 39,99 EUR |\n| Versicherung | 212,30 EUR |\nWie hoch ist die Summe?",
      "Korrektur: Strom kostet 95,10 EUR, nicht 78,40 EUR. Wie hoch ist die Summe jetzt?",
    ],
    expected: [[money("Summe", "add(1150, 78.40, 39.99, 212.30)", "EUR")], [money("Summe", "add(1150, 95.10, 39.99, 212.30)", "EUR")]],
  },
  {
    category: "table-sum",
    locale: "en",
    secondTurn: "follow-up",
    query: "total and average of receipts, one added",
    turns: [
      "Here are 4 receipts: 1,230.00 EUR, 89.95 EUR, 5,007.25 EUR and 14.80 EUR. What is the total, and the average per receipt rounded to the cent?",
      "One more receipt of 100.00 EUR turned up, so there are 5 now. Total and average now?",
    ],
    expected: [
      [money("total", "add(1230, 89.95, 5007.25, 14.80)", "EUR"), money("average", "round(div(add(1230, 89.95, 5007.25, 14.80), 4), 2)", "EUR")],
      [money("total", "add(1230, 89.95, 5007.25, 14.80, 100)", "EUR"), money("average", "round(div(add(1230, 89.95, 5007.25, 14.80, 100), 5), 2)", "EUR")],
    ],
  },
  {
    category: "date-time",
    locale: "de",
    critical: true,
    secondTurn: "correction",
    query: "latest departure before a train",
    turns: [
      "Mein Zug fährt um 08:05 Uhr. Der Weg zum Bahnhof dauert 25 Minuten, und ich möchte 10 Minuten vor Abfahrt am Gleis sein. Wann muss ich spätestens los?",
      "Korrektur: Der Weg dauert 40 Minuten, nicht 25. Wann muss ich jetzt spätestens los?",
    ],
    expected: [[time("spätestens los", 'fmtClock(sub(clock("08:05"), add(25, 10)))')], [time("spätestens los", 'fmtClock(sub(clock("08:05"), add(40, 10)))')]],
  },
  {
    category: "date-time",
    locale: "en",
    critical: true,
    secondTurn: "correction",
    query: "timesheet total and hourly fee",
    turns: [
      "I worked 09:00 to 12:30 and 13:15 to 18:05 today. How long is that in hours and minutes? At 45.00 EUR per hour, what is the fee, rounded to the cent?",
      "Correction: the afternoon ended at 17:35, not 18:05. Time worked and fee again?",
    ],
    expected: [
      [duration("time worked", 'add(sub(clock("12:30"), clock("09:00")), sub(clock("18:05"), clock("13:15")))'), money("fee", 'round(mul(div(add(sub(clock("12:30"), clock("09:00")), sub(clock("18:05"), clock("13:15"))), 60), 45), 2)', "EUR")],
      [duration("time worked", 'add(sub(clock("12:30"), clock("09:00")), sub(clock("17:35"), clock("13:15")))'), money("fee", 'round(mul(div(add(sub(clock("12:30"), clock("09:00")), sub(clock("17:35"), clock("13:15"))), 60), 45), 2)', "EUR")],
    ],
  },
  {
    category: "date-time",
    locale: "de",
    secondTurn: "correction",
    query: "invoice due date in days",
    turns: [
      "Die Rechnung ist vom 14.08.2026 und zahlbar innerhalb von 30 Tagen. An welchem Datum ist sie fällig?",
      "Korrektur: Das Zahlungsziel beträgt 45 Tage. Wann ist sie jetzt fällig?",
    ],
    expected: [[date("Fälligkeit", 'addDays("2026-08-14", 30)')], [date("Fälligkeit", 'addDays("2026-08-14", 45)')]],
  },
  {
    category: "date-time",
    locale: "en",
    secondTurn: "correction",
    query: "project end date across a year boundary",
    turns: [
      "A project starts on 20 November 2026 and ends 100 days after that date. What is the end date?",
      "Correction: it ends 75 days after the start. End date?",
    ],
    expected: [[date("end date", 'addDays("2026-11-20", 100)')], [date("end date", 'addDays("2026-11-20", 75)')]],
  },
  {
    category: "proration",
    locale: "de",
    secondTurn: "correction",
    query: "yearly fee prorated by months, refund",
    turns: [
      "Der Jahresbeitrag beträgt 480,00 EUR. Ich kündige nach 7 von 12 Monaten. Wie hoch sind der anteilige Beitrag für die genutzten Monate und die Erstattung?",
      "Korrektur: Ich kündige schon nach 4 Monaten. Anteiliger Beitrag und Erstattung?",
    ],
    expected: [
      [money("anteiliger Beitrag", "mul(div(480, 12), 7)", "EUR"), money("Erstattung", "sub(480, mul(div(480, 12), 7))", "EUR")],
      [money("anteiliger Beitrag", "mul(div(480, 12), 4)", "EUR"), money("Erstattung", "sub(480, mul(div(480, 12), 4))", "EUR")],
    ],
  },
  {
    category: "proration",
    locale: "en",
    critical: true,
    secondTurn: "correction",
    query: "rent prorated by days in March",
    turns: [
      "The monthly rent is 1,320.00 EUR for the month from 1 March 2026 to 31 March 2026, which is 31 days. I move out on 19 March 2026, and that day still counts. How many days do I pay for, and what is the prorated rent, rounded to the cent?",
      "Correction: I move out on 10 March 2026. Days and prorated rent again?",
    ],
    expected: [
      [
        number("days", 'add(daysBetween("2026-03-01", "2026-03-19"), 1)', { unit: "days" }),
        money("prorated rent", 'round(mul(div(1320, 31), add(daysBetween("2026-03-01", "2026-03-19"), 1)), 2)', "EUR"),
      ],
      [
        number("days", 'add(daysBetween("2026-03-01", "2026-03-10"), 1)', { unit: "days" }),
        money("prorated rent", 'round(mul(div(1320, 31), add(daysBetween("2026-03-01", "2026-03-10"), 1)), 2)', "EUR"),
      ],
    ],
  },
  {
    category: "multi-step",
    locale: "de",
    secondTurn: "correction",
    query: "discount then VAT",
    turns: [
      "Netto 3.200,00 EUR, darauf 10 % Rabatt, dann 19 % Umsatzsteuer auf den rabattierten Betrag. Wie hoch sind der rabattierte Nettobetrag, die Umsatzsteuer und der Bruttobetrag?",
      "Korrektur: Der Rabatt beträgt 15 %. Bitte alle drei Werte neu berechnen.",
    ],
    expected: [
      [money("rabattiert", "mul(3200, 0.9)", "EUR"), money("Umsatzsteuer", "round(mul(mul(3200, 0.9), 0.19), 2)", "EUR"), money("Brutto", "add(mul(3200, 0.9), round(mul(mul(3200, 0.9), 0.19), 2))", "EUR")],
      [money("rabattiert", "mul(3200, 0.85)", "EUR"), money("Umsatzsteuer", "round(mul(mul(3200, 0.85), 0.19), 2)", "EUR"), money("Brutto", "add(mul(3200, 0.85), round(mul(mul(3200, 0.85), 0.19), 2))", "EUR")],
    ],
  },
  {
    category: "multi-step",
    locale: "en",
    secondTurn: "correction",
    query: "two discounts in sequence plus shipping",
    turns: [
      "Two items at 199.00 EUR and 349.00 EUR. A 5% discount applies to the sum, then a further 3% early-payment discount on that result (round to the cent), and shipping of 12.90 EUR is added last. What is the amount to pay?",
      "Correction: shipping is free. Amount to pay?",
    ],
    expected: [
      [money("amount to pay", "add(round(mul(mul(add(199, 349), 0.95), 0.97), 2), 12.90)", "EUR")],
      [money("amount to pay", "round(mul(mul(add(199, 349), 0.95), 0.97), 2)", "EUR")],
    ],
  },
  {
    category: "skonto",
    locale: "de",
    secondTurn: "correction",
    query: "cash discount on a gross invoice",
    turns: [
      "Eine Rechnung über 4.760,00 EUR brutto gewährt 2 % Skonto bei Zahlung innerhalb von 14 Tagen. Wie hoch sind der Skontobetrag und der Zahlbetrag?",
      "Korrektur: Das Skonto beträgt 3 %. Skontobetrag und Zahlbetrag?",
    ],
    expected: [
      [money("Skonto", "mul(4760, 0.02)", "EUR"), money("Zahlbetrag", "sub(4760, mul(4760, 0.02))", "EUR")],
      [money("Skonto", "mul(4760, 0.03)", "EUR"), money("Zahlbetrag", "sub(4760, mul(4760, 0.03))", "EUR")],
    ],
  },
  {
    category: "swiss-vat",
    locale: "en",
    secondTurn: "follow-up",
    query: "Swiss VAT with five-centime rounding of the total",
    turns: [
      "A Swiss invoice is CHF 1'237.42 before tax, with 8.1% VAT. Give the VAT rounded to the cent and the total rounded to the nearest 5 centimes.",
      "And at the reduced rate of 2.6%?",
    ],
    expected: [
      [money("VAT", "round(mul(1237.42, 0.081), 2)"), money("total", "div(round(mul(add(1237.42, round(mul(1237.42, 0.081), 2)), 20), 0), 20)")],
      [money("VAT", "round(mul(1237.42, 0.026), 2)"), money("total", "div(round(mul(add(1237.42, round(mul(1237.42, 0.026), 2)), 20), 0), 20)")],
    ],
  },
  {
    category: "net-gross",
    locale: "de",
    secondTurn: "follow-up",
    query: "Swiss gross to net in German with apostrophe grouping",
    turns: [
      "Ein Angebot nennt 5'980.00 Franken inklusive 8.1 % Mehrwertsteuer. Wie hoch sind der Nettobetrag und die enthaltene Steuer, auf Rappen gerundet?",
      "Und bei 2.6 % Mehrwertsteuer auf denselben 5'980.00 Franken?",
    ],
    expected: [
      [money("Netto", "round(div(5980, 1.081), 2)"), money("Steuer", "sub(5980, round(div(5980, 1.081), 2))")],
      [money("Netto", "round(div(5980, 1.026), 2)"), money("Steuer", "sub(5980, round(div(5980, 1.026), 2))")],
    ],
  },
  {
    category: "share-percent",
    locale: "en",
    secondTurn: "correction",
    query: "share as a percentage and the remainder (English grouping without a decimal clue)",
    turns: [
      "Of 1,840 applicants, 1,564 passed. What percentage passed, to one decimal place, and how many failed?",
      "Correction: 1,610 passed. Percentage and number failed?",
    ],
    expected: [
      [percent("passed", "round(mul(div(1564, 1840), 100), 1)", 1), number("failed", "sub(1840, 1564)")],
      [percent("passed", "round(mul(div(1610, 1840), 100), 1)", 1), number("failed", "sub(1840, 1610)")],
    ],
  },
];

export function buildDevSet() {
  const cases: GateCase[] = drafts.map((d, i) => {
    const exp = [d.expected[0].map(expected), d.expected[1].map(expected)] as [Expected[], Expected[]];
    return {
      id: `dev2-${String(i + 1).padStart(2, "0")}`,
      family: "arithmetic",
      category: d.category,
      locale: d.locale,
      critical: !!d.critical,
      secondTurn: d.secondTurn,
      synthetic: true,
      query: d.query,
      turns: d.turns,
      expected: exp,
      forbidden: [[], []],
      mandatoryFacts: [fact(exp[0], d.locale), fact(exp[1], d.locale)],
      forbiddenConclusions: [],
      sources: [],
      humanScores: null,
    };
  });
  return {
    status: "DEVELOPMENT SET for Design A (arithmetic v2). Never pooled with practice.json, cases.json, unseen-20261023.json or public-20261023.json. Tuning Design A on this set is allowed; nothing else is tuned on it.",
    authoredOn: "2026-10-23",
    synthetic: true,
    note: "Generated by make-dev-v2.ts; every expected value is computed from its derivation with decimal arithmetic. 24 cases, 12 German and 12 English, two turns each, with the calculation kinds of the earlier sets plus Swiss five-centime rounding, apostrophe grouping and a share-as-percentage case whose English grouping (1,840) gives no decimal clue.",
    cases,
  };
}

if (process.argv[1]?.endsWith("make-dev-v2.ts")) {
  const set = buildDevSet();
  writeFileSync("evaluation/arithmetic-gate/dev-v2-20261023.json", JSON.stringify(set, null, 2) + "\n");
  console.log(`wrote ${set.cases.length} cases`);
}
