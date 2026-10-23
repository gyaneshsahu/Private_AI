// Writes unseen-v2-20261023.json: the case set for gate v2 (Design A), built
// once and then FROZEN by its SHA-256 in THRESHOLD-v2.md. Never used for
// development: Design A was tuned on dev-v2-20261023.json only. Styles and
// sources differ from the earlier sets: chat-style questions, bullet lists,
// receipt and email excerpts, UK and US tax, Swiss five-centime rounding,
// mileage and overtime rules, overdue interest by days, tips and bill
// splitting, savings targets, deadlines. Every expected value is computed here
// from its written derivation (derivation.ts helpers), never typed by hand;
// tests/arithmetic-unseen-v2.test.ts re-derives them and checks the hash.
//   node --import tsx evaluation/arithmetic-gate/make-unseen-v2.ts
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
const item = (label: string, kind: Kind, derivation: string, extra: Partial<Pick<Item, "currency" | "unit" | "decimals">> = {}): Item => ({ label, kind, derivation, ...extra });
const money = (label: string, derivation: string, currency?: "EUR" | "USD" | "GBP") => item(label, "money", derivation, { currency, decimals: 2 });
const percent = (label: string, derivation: string, decimals?: number) => item(label, "percent", derivation, { decimals });
const number = (label: string, derivation: string, extra: Partial<Pick<Item, "unit" | "decimals">> = {}) => item(label, "number", derivation, extra);
const time = (label: string, derivation: string) => item(label, "time", derivation);
const date = (label: string, derivation: string) => item(label, "date", derivation);

function expected(i: Item): Expected {
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
  source: string;
  turns: [string, string];
  expected: [Item[], Item[]];
};

const drafts: Draft[] = [
  {
    category: "vat", locale: "de", critical: true, secondTurn: "correction", source: "chat message, informal",
    turns: [
      "Kurze Frage: Rechnung netto 980,00 EUR, 19 % drauf. Was kommt brutto raus, und wie viel ist die Steuer?",
      "Ach nein, es sind Bücher, also 7 %. Brutto und Steuer nochmal?",
    ],
    expected: [
      [money("Steuer", "mul(980, 0.19)", "EUR"), money("Brutto", "add(980, mul(980, 0.19))", "EUR")],
      [money("Steuer", "mul(980, 0.07)", "EUR"), money("Brutto", "add(980, mul(980, 0.07))", "EUR")],
    ],
  },
  {
    category: "skonto", locale: "de", critical: true, secondTurn: "follow-up", source: "freelancer, customer deduction",
    turns: [
      "Mein Kunde zahlt eine Rechnung über 3.570,00 EUR brutto innerhalb von 8 Tagen und zieht dafür 2 % Skonto ab. Wie hoch ist der Skontoabzug, und wie viel kommt bei mir an?",
      "Er hat 3 % abgezogen, obwohl nur 2 % vereinbart waren. Wie viel hat er zu wenig überwiesen?",
    ],
    expected: [
      [money("Skonto", "mul(3570, 0.02)", "EUR"), money("Zahlung", "sub(3570, mul(3570, 0.02))", "EUR")],
      [money("zu wenig", "sub(mul(3570, 0.03), mul(3570, 0.02))", "EUR")],
    ],
  },
  {
    category: "mileage", locale: "de", secondTurn: "follow-up", source: "expense claim",
    turns: [
      "Ich bin diese Woche 3 Mal zum Kunden gefahren, jede Fahrt 84 km hin und zurück. Die Pauschale ist 0,30 EUR pro km. Wie viel kann ich abrechnen?",
      "Nächste Woche sind es 5 Fahrten. Wie viel dann?",
    ],
    expected: [[money("Fahrtkosten", "mul(3, 84, 0.30)", "EUR")], [money("Fahrtkosten", "mul(5, 84, 0.30)", "EUR")]],
  },
  {
    category: "proration", locale: "de", secondTurn: "correction", source: "utility bill",
    turns: [
      "Mein Stromanbieter rechnet 1.188,00 EUR für 12 Monate ab. Ich war aber nur 9 Monate Kunde. Was ist mein Anteil?",
      "Korrektur: Es waren 10 Monate.",
    ],
    expected: [[money("Anteil", "mul(div(1188, 12), 9)", "EUR")], [money("Anteil", "mul(div(1188, 12), 10)", "EUR")]],
  },
  {
    category: "overdue-interest", locale: "de", critical: true, secondTurn: "follow-up", source: "overdue invoice, daily interest",
    turns: [
      "Eine Rechnung über 2.400,00 EUR ist seit 45 Tagen überfällig. Verzugszinsen 9,12 % pro Jahr, das Jahr mit 365 Tagen gerechnet. Wie hoch sind die Zinsen, kaufmännisch auf Cent gerundet?",
      "Und wenn es 90 Tage sind?",
    ],
    expected: [
      [money("Zinsen", "round(div(mul(2400, 0.0912, 45), 365), 2)", "EUR")],
      [money("Zinsen", "round(div(mul(2400, 0.0912, 90), 365), 2)", "EUR")],
    ],
  },
  {
    category: "split-bill", locale: "de", secondTurn: "follow-up", source: "restaurant, group chat",
    turns: [
      "Wir waren zu 4 essen, Rechnung 187,60 EUR. Wir geben 10 % Trinkgeld. Was zahlt jeder, auf Cent gerundet?",
      "Einer ist früher gegangen und hat 30,00 EUR dagelassen. Was zahlen die anderen 3 jetzt jeweils?",
    ],
    expected: [
      [money("pro Person", "round(div(mul(187.60, 1.1), 4), 2)", "EUR")],
      [money("pro Person", "round(div(sub(mul(187.60, 1.1), 30), 3), 2)", "EUR")],
    ],
  },
  {
    category: "date-time", locale: "de", critical: true, secondTurn: "correction", source: "legal deadline",
    turns: [
      "Widerspruchsfrist: 14 Tage ab Zustellung am 27.10.2026. Welches Datum ist der letzte Tag?",
      "Zugestellt wurde erst am 03.11.2026. Letzter Tag?",
    ],
    expected: [[date("letzter Tag", 'addDays("2026-10-27", 14)')], [date("letzter Tag", 'addDays("2026-11-03", 14)')]],
  },
  {
    category: "date-time", locale: "de", secondTurn: "correction", source: "appointment, bus and walk",
    turns: [
      "Ich muss um 09:30 Uhr beim Zahnarzt sein. Der Bus braucht 35 Minuten, der Fußweg 12 Minuten, und ich will 5 Minuten Puffer. Wann muss ich losgehen?",
      "Der Bus braucht laut App 50 Minuten. Wann jetzt?",
    ],
    expected: [
      [time("losgehen", 'fmtClock(sub(clock("09:30"), add(35, 12, 5)))')],
      [time("losgehen", 'fmtClock(sub(clock("09:30"), add(50, 12, 5)))')],
    ],
  },
  {
    category: "savings", locale: "de", secondTurn: "follow-up", source: "savings target",
    turns: [
      "Ich will 6.000,00 EUR in 18 Monaten zusammensparen. Wie viel muss ich pro Monat zurücklegen, auf Cent gerundet?",
      "Ich habe schon 1.500,00 EUR. Wie viel pro Monat jetzt?",
    ],
    expected: [[money("pro Monat", "round(div(6000, 18), 2)", "EUR")], [money("pro Monat", "round(div(sub(6000, 1500), 18), 2)", "EUR")]],
  },
  {
    category: "table-sum", locale: "de", critical: true, secondTurn: "correction", source: "bullet list of expenses with a share",
    turns: [
      "Ausgaben Oktober:\n- Miete 890,00 EUR\n- Lebensmittel 412,35 EUR\n- Bahn 49,00 EUR\n- Sport 29,90 EUR\nWie hoch ist die Summe, und wie viel Prozent davon ist die Miete (eine Nachkommastelle)?",
      "Lebensmittel waren 512,35 EUR, nicht 412,35 EUR. Summe und Mietanteil nochmal?",
    ],
    expected: [
      [money("Summe", "add(890, 412.35, 49, 29.90)", "EUR"), percent("Mietanteil", "round(mul(div(890, add(890, 412.35, 49, 29.90)), 100), 1)", 1)],
      [money("Summe", "add(890, 512.35, 49, 29.90)", "EUR"), percent("Mietanteil", "round(mul(div(890, add(890, 512.35, 49, 29.90)), 100), 1)", 1)],
    ],
  },
  {
    category: "compound-interest", locale: "de", secondTurn: "follow-up", source: "savings account, yearly compounding",
    turns: [
      "2.000,00 EUR zu 4 % Zinsen pro Jahr mit jährlichem Zinseszins, 10 Jahre lang. Endbetrag, auf Cent gerundet?",
      "Und nach 2 Jahren?",
    ],
    expected: [[money("Endbetrag", "round(mul(2000, pow(1.04, 10)), 2)", "EUR")], [money("Endbetrag", "round(mul(2000, pow(1.04, 2)), 2)", "EUR")]],
  },
  {
    category: "net-gross", locale: "de", critical: true, secondTurn: "follow-up", source: "till receipts",
    turns: [
      "Kassenbon: 47,60 EUR inkl. 19 % MwSt. Wie viel sind Netto und MwSt?",
      "Und ein Bon über 23,54 EUR inkl. 7 % MwSt?",
    ],
    expected: [
      [money("Netto", "round(div(47.60, 1.19), 2)", "EUR"), money("MwSt", "sub(47.60, round(div(47.60, 1.19), 2))", "EUR")],
      [money("Netto", "round(div(23.54, 1.07), 2)", "EUR"), money("MwSt", "sub(23.54, round(div(23.54, 1.07), 2))", "EUR")],
    ],
  },
  {
    category: "percent-change", locale: "de", secondTurn: "follow-up", source: "rent and service charges",
    turns: [
      "Meine Nebenkosten sind von 210,00 EUR auf 255,00 EUR gestiegen. Um wie viel Prozent, mit zwei Nachkommastellen?",
      "Und die Kaltmiete von 1.050,00 EUR auf 1.100,00 EUR?",
    ],
    expected: [
      [percent("Anstieg", "round(mul(div(sub(255, 210), 210), 100), 2)", 2)],
      [percent("Anstieg", "round(mul(div(sub(1100, 1050), 1050), 100), 2)", 2)],
    ],
  },
  {
    category: "multi-step", locale: "de", secondTurn: "follow-up", source: "hourly fee with travel flat rate and VAT",
    turns: [
      "Mein Honorar ist 85,00 EUR pro Stunde. Einsatz von 13:15 bis 17:45 Uhr. Wie hoch ist das Honorar?",
      "Dazu kommt eine Anfahrtspauschale von 25,00 EUR, und auf alles 19 % Umsatzsteuer. Bruttobetrag, auf Cent gerundet?",
    ],
    expected: [
      [money("Honorar", 'mul(div(sub(clock("17:45"), clock("13:15")), 60), 85)', "EUR")],
      [money("Brutto", 'round(mul(add(mul(div(sub(clock("17:45"), clock("13:15")), 60), 85), 25), 1.19), 2)', "EUR")],
    ],
  },
  {
    category: "swiss-vat", locale: "de", secondTurn: "follow-up", source: "Swiss invoice in German",
    turns: [
      "Rechnung in der Schweiz: CHF 2'450.00 netto, Mehrwertsteuer 8.1 %. Steuer auf den Rappen, Total auf 5 Rappen gerundet?",
      "Und beim Sondersatz von 3.8 % für Beherbergung?",
    ],
    expected: [
      [money("Steuer", "round(mul(2450, 0.081), 2)"), money("Total", "div(round(mul(add(2450, round(mul(2450, 0.081), 2)), 20), 0), 20)")],
      [money("Steuer", "round(mul(2450, 0.038), 2)"), money("Total", "div(round(mul(add(2450, round(mul(2450, 0.038), 2)), 20), 0), 20)")],
    ],
  },
  {
    category: "vat", locale: "en", critical: true, secondTurn: "correction", source: "UK invoice, pounds",
    turns: [
      "Quick one: an invoice is £1,250.00 net plus 20% VAT. What's the VAT and the total?",
      "Sorry, the net is actually £1,375.00. VAT and total?",
    ],
    expected: [
      [money("VAT", "mul(1250, 0.2)", "GBP"), money("total", "add(1250, mul(1250, 0.2))", "GBP")],
      [money("VAT", "mul(1375, 0.2)", "GBP"), money("total", "add(1375, mul(1375, 0.2))", "GBP")],
    ],
  },
  {
    category: "sales-tax", locale: "en", critical: true, secondTurn: "follow-up", source: "US purchase with sales tax and coupon",
    turns: [
      "I'm buying a laptop for 1,199.00 USD in a state with 8.25% sales tax. What's the tax, rounded to the cent, and what do I pay in total?",
      "With a 50.00 USD coupon taken off the price before tax, what are the tax and the total?",
    ],
    expected: [
      [money("tax", "round(mul(1199, 0.0825), 2)", "USD"), money("total", "add(1199, round(mul(1199, 0.0825), 2))", "USD")],
      [money("tax", "round(mul(sub(1199, 50), 0.0825), 2)", "USD"), money("total", "add(sub(1199, 50), round(mul(sub(1199, 50), 0.0825), 2))", "USD")],
    ],
  },
  {
    category: "split-bill", locale: "en", secondTurn: "correction", source: "dinner with tip, group",
    turns: [
      "Dinner came to 143.80 USD for the 5 of us. Add an 18% tip and split it evenly. What does each person pay, to the cent?",
      "Make the tip 20% instead.",
    ],
    expected: [[money("per person", "round(div(mul(143.80, 1.18), 5), 2)", "USD")], [money("per person", "round(div(mul(143.80, 1.2), 5), 2)", "USD")]],
  },
  {
    category: "overtime", locale: "en", critical: true, secondTurn: "follow-up", source: "weekly pay with overtime rule",
    turns: [
      "I earn 22.50 EUR an hour. This week my timesheet shows 42 working hours; anything above 40 is paid at 150% of the normal rate. What's my gross pay?",
      "And with 45 working hours?",
    ],
    expected: [
      [money("gross pay", "add(mul(40, 22.5), mul(sub(42, 40), mul(22.5, 1.5)))", "EUR")],
      [money("gross pay", "add(mul(40, 22.5), mul(sub(45, 40), mul(22.5, 1.5)))", "EUR")],
    ],
  },
  {
    category: "date-time", locale: "en", secondTurn: "correction", source: "lease term",
    turns: [
      "Our lease starts on 1 February 2027 and ends 90 days after the start date. What is the end date?",
      "What if it starts on 15 February 2027 instead?",
    ],
    expected: [[date("end date", 'addDays("2027-02-01", 90)')], [date("end date", 'addDays("2027-02-15", 90)')]],
  },
  {
    category: "date-time", locale: "en", critical: true, secondTurn: "correction", source: "flight, airport lead time",
    turns: [
      "My flight departs at 14:20. I need to be at the airport 2 hours before departure and the drive takes 45 minutes. When do I leave home?",
      "The departure moved to 16:05. When do I leave now?",
    ],
    expected: [
      [time("leave home", 'fmtClock(sub(clock("14:20"), add(120, 45)))')],
      [time("leave home", 'fmtClock(sub(clock("16:05"), add(120, 45)))')],
    ],
  },
  {
    category: "instalments-simple-interest", locale: "en", secondTurn: "follow-up", source: "loan in months",
    turns: [
      "A 9,000.00 EUR loan at 5.4% a year, simple interest, runs for 8 months. What are the interest and the total repaid?",
      "And for 14 months?",
    ],
    expected: [
      [money("interest", "div(mul(9000, 0.054, 8), 12)", "EUR"), money("total", "add(9000, div(mul(9000, 0.054, 8), 12))", "EUR")],
      [money("interest", "div(mul(9000, 0.054, 14), 12)", "EUR"), money("total", "add(9000, div(mul(9000, 0.054, 14), 12))", "EUR")],
    ],
  },
  {
    category: "compound-interest", locale: "en", secondTurn: "follow-up", source: "monthly compounding",
    turns: [
      "I put 3,000.00 EUR in an account paying 3.6% a year, compounded monthly (3.6% divided by 12 each month), for 12 months. What is the balance at the end, to the cent?",
      "And after 6 months?",
    ],
    expected: [
      [money("balance", "round(mul(3000, pow(add(1, div(0.036, 12)), 12)), 2)", "EUR")],
      [money("balance", "round(mul(3000, pow(add(1, div(0.036, 12)), 6)), 2)", "EUR")],
    ],
  },
  {
    category: "table-sum", locale: "en", critical: true, secondTurn: "correction", source: "weekly sales figures, average",
    turns: [
      "Sales by week: 4,120.00 EUR, 3,980.50 EUR, 5,310.25 EUR, 4,455.00 EUR and 4,002.75 EUR. What are the total and the average over the 5 weeks, to the cent?",
      "Drop the 5th week (4,002.75 EUR) and average over the 4 weeks. Total and average?",
    ],
    expected: [
      [money("total", "add(4120, 3980.50, 5310.25, 4455, 4002.75)", "EUR"), money("average", "round(div(add(4120, 3980.50, 5310.25, 4455, 4002.75), 5), 2)", "EUR")],
      [money("total", "add(4120, 3980.50, 5310.25, 4455)", "EUR"), money("average", "round(div(add(4120, 3980.50, 5310.25, 4455), 4), 2)", "EUR")],
    ],
  },
  {
    category: "net-gross", locale: "en", secondTurn: "follow-up", source: "UK till receipts, two rates",
    turns: [
      "A till receipt shows £84.00 including 20% VAT. How much is the VAT and what is the net amount?",
      "Another receipt is £59.99 including 5% VAT. VAT and net, to the penny?",
    ],
    expected: [
      [money("net", "round(div(84, 1.2), 2)", "GBP"), money("VAT", "sub(84, round(div(84, 1.2), 2))", "GBP")],
      [money("net", "round(div(59.99, 1.05), 2)", "GBP"), money("VAT", "sub(59.99, round(div(59.99, 1.05), 2))", "GBP")],
    ],
  },
  {
    category: "percent-change", locale: "en", secondTurn: "follow-up", source: "electricity tariff",
    turns: [
      "Our electricity price fell from 0.42 EUR per kWh to 0.36 EUR per kWh. What is the percentage decrease, to one decimal place?",
      "We use 250 kWh a month. How much do we save per month?",
    ],
    expected: [
      [percent("decrease", "round(mul(div(sub(0.42, 0.36), 0.42), 100), 1)", 1)],
      [money("saving", "mul(250, sub(0.42, 0.36))", "EUR")],
    ],
  },
  {
    category: "proration", locale: "en", critical: true, secondTurn: "follow-up", source: "insurance refund by days",
    turns: [
      "Insurance costs 540.00 EUR for the year of 365 days. I cancel after 100 days. What is the refund for the unused days, to the cent?",
      "What if I cancel after 200 days?",
    ],
    expected: [
      [money("refund", "round(sub(540, mul(div(540, 365), 100)), 2)", "EUR")],
      [money("refund", "round(sub(540, mul(div(540, 365), 200)), 2)", "EUR")],
    ],
  },
  {
    category: "swiss-vat", locale: "en", secondTurn: "follow-up", source: "Swiss quote in English",
    turns: [
      "A Swiss quote is CHF 760.00 before VAT at 8.1%. What is the VAT to the centime, and the total rounded to 5 centimes?",
      "Same quote at the reduced 2.6% rate: VAT and total?",
    ],
    expected: [
      [money("VAT", "round(mul(760, 0.081), 2)"), money("total", "div(round(mul(add(760, round(mul(760, 0.081), 2)), 20), 0), 20)")],
      [money("VAT", "round(mul(760, 0.026), 2)"), money("total", "div(round(mul(add(760, round(mul(760, 0.026), 2)), 20), 0), 20)")],
    ],
  },
  {
    category: "multi-step", locale: "en", secondTurn: "correction", source: "shop discounts in sequence",
    turns: [
      "A jacket is listed at 189.90 EUR with 30% off, then an extra 10% off at checkout. What is the final price, to the cent?",
      "Turns out only the 30% applies. Final price?",
    ],
    expected: [[money("final price", "round(mul(mul(189.90, 0.7), 0.9), 2)", "EUR")], [money("final price", "round(mul(189.90, 0.7), 2)", "EUR")]],
  },
  {
    category: "share-percent", locale: "en", secondTurn: "correction", source: "survey result (English grouping without a decimal clue)",
    turns: [
      "In the survey, 2,250 people answered and 1,935 said yes. What percentage said yes, to one decimal place, and how many said no?",
      "Correction: 1,980 said yes.",
    ],
    expected: [
      [percent("yes", "round(mul(div(1935, 2250), 100), 1)", 1), number("no", "sub(2250, 1935)")],
      [percent("yes", "round(mul(div(1980, 2250), 100), 1)", 1), number("no", "sub(2250, 1980)")],
    ],
  },
];

export function buildUnseenV2() {
  const cases = drafts.map((d, i) => {
    const exp = [d.expected[0].map(expected), d.expected[1].map(expected)] as [Expected[], Expected[]];
    return {
      id: `unseen2-${String(i + 1).padStart(2, "0")}`,
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
      mandatoryFacts: [fact(exp[0], d.locale), fact(exp[1], d.locale)] as [string, string],
      forbiddenConclusions: [],
      sources: [],
      humanScores: null,
    };
  });
  return {
    status: "UNSEEN SET for gate v2 (Design A). FROZEN by SHA-256 in THRESHOLD-v2.md once written; never used for development and never pooled with dev-v2-20261023.json, practice.json, cases.json, unseen-20261023.json or public-20261023.json.",
    authoredOn: "2026-10-23",
    synthetic: true,
    note: "Generated once by make-unseen-v2.ts; every expected value is computed from its derivation with decimal arithmetic. 30 cases, 15 German and 15 English, two turns each, in styles the earlier sets do not use (chat questions, bullet lists, receipts, UK and US tax, Swiss five-centime rounding, mileage, overtime, overdue interest, tips, savings, deadlines). One case (unseen2-30) uses English grouping without a decimal clue on purpose; Design A flags it.",
    cases,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("make-unseen-v2.ts")) {
  const set = buildUnseenV2();
  writeFileSync("evaluation/arithmetic-gate/unseen-v2-20261023.json", JSON.stringify(set, null, 2) + "\n");
  console.log(`wrote ${set.cases.length} cases`);
}
