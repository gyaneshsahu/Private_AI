// Writes unseen-v3-20261023.json: the case set for gate v3 (Design B), built
// once and then FROZEN by its SHA-256 in THRESHOLD-v3.md. Never used for
// development (Design B is tuned on dev-v3 and dev-v2 only). New styles
// again: emails, receipts, spreadsheet rows, parking and taxi tariffs,
// subscriptions, payroll, trials and warranties; both languages; the four
// weak kinds of gate v2 (percentage change, surcharge and rate phrases, Swiss
// VAT, overtime) in both languages. Every expected value is computed from its
// derivation and hand-checked; tests/arithmetic-unseen-v3.test.ts re-derives
// them, proves no overlap with any set and enforces the hash.
//   node --import tsx evaluation/arithmetic-gate/make-unseen-v3.ts
import { writeFileSync } from "node:fs";
import type { GateCase } from "./scorer";
import { expectedItem, factLine } from "./make-dev-v3";

type Locale = "de" | "en";
type Expected = GateCase["expected"][number][number];
type Item = Parameters<typeof expectedItem>[0];
const money = (label: string, derivation: string, currency?: "EUR" | "USD" | "GBP"): Item => ({ label, kind: "money", derivation, currency, decimals: 2 });
const percent = (label: string, derivation: string, decimals?: number): Item => ({ label, kind: "percent", derivation, decimals });
const time = (label: string, derivation: string): Item => ({ label, kind: "time", derivation });
const date = (label: string, derivation: string): Item => ({ label, kind: "date", derivation });

type Draft = { category: string; locale: Locale; critical?: boolean; secondTurn: "correction" | "follow-up"; source: string; turns: [string, string]; expected: [Item[], Item[]] };

const drafts: Draft[] = [
  { category: "vat", locale: "de", critical: true, secondTurn: "follow-up", source: "email about a quote",
    turns: ["Hallo, kurze Rückfrage zum Angebot: 6.420,00 EUR netto, darauf 19 % Umsatzsteuer. Wie hoch sind Steuer und Brutto?", "Für den Anteil Bücher von 1.200,00 EUR netto gilt 7 %. Steuer und Brutto nur für diesen Anteil?"],
    expected: [[money("Steuer", "mul(6420, 0.19)", "EUR"), money("Brutto", "add(6420, mul(6420, 0.19))", "EUR")], [money("Steuer", "mul(1200, 0.07)", "EUR"), money("Brutto", "add(1200, mul(1200, 0.07))", "EUR")]] },
  { category: "net-gross", locale: "de", critical: true, secondTurn: "follow-up", source: "taxi and hotel receipts",
    turns: ["Taxiquittung 36,50 EUR brutto inkl. 7 % Umsatzsteuer. Netto und Steuer, auf Cent gerundet?", "Hotelrechnung 214,00 EUR brutto inkl. 7 % Umsatzsteuer?"],
    expected: [[money("Netto", "round(div(36.50, 1.07), 2)", "EUR"), money("Steuer", "sub(36.50, round(div(36.50, 1.07), 2))", "EUR")], [money("Netto", "round(div(214, 1.07), 2)", "EUR"), money("Steuer", "sub(214, round(div(214, 1.07), 2))", "EUR")]] },
  { category: "percent-change", locale: "de", critical: true, secondTurn: "follow-up", source: "membership fee",
    turns: ["Mein Beitrag ist von 42,50 EUR auf 46,75 EUR im Monat gestiegen. Um wie viel Prozent ist er gestiegen, mit zwei Nachkommastellen?", "Und von 46,75 EUR auf 44,00 EUR: Änderung in Prozent, negativ bei Rückgang, zwei Nachkommastellen?"],
    expected: [[percent("Anstieg", "round(mul(div(sub(46.75, 42.50), 42.50), 100), 2)", 2)], [percent("Änderung", "round(mul(div(sub(44, 46.75), 46.75), 100), 2)", 2)]] },
  { category: "percent-change", locale: "de", secondTurn: "follow-up", source: "monthly costs",
    turns: ["Die monatlichen Kosten sind von 1.280,00 EUR auf 1.472,00 EUR gestiegen. Prozentuale Veränderung, eine Nachkommastelle?", "Und von 1.472,00 EUR auf 1.398,40 EUR: Änderung in Prozent, negativ bei Rückgang?"],
    expected: [[percent("Veränderung", "round(mul(div(sub(1472, 1280), 1280), 100), 1)", 1)], [percent("Änderung", "round(mul(div(sub(1398.40, 1472), 1472), 100), 1)", 1)]] },
  { category: "overtime-rate", locale: "de", critical: true, secondTurn: "follow-up", source: "Sunday and holiday rate",
    turns: ["Tarif 21,00 EUR pro Stunde. Sonntagsarbeit wird mit 150 % des normalen Satzes bezahlt. Lohn für 5 Sonntagsstunden?", "Feiertagsarbeit wird mit 200 % des normalen Satzes bezahlt. Lohn für 5 Feiertagsstunden?"],
    expected: [[money("Lohn", "mul(mul(21, 1.5), 5)", "EUR")], [money("Lohn", "mul(mul(21, 2), 5)", "EUR")]] },
  { category: "surcharge", locale: "de", critical: true, secondTurn: "correction", source: "parking tariff",
    turns: ["Parkgebühr 12,00 EUR pro Tag, am Wochenende zzgl. 25 % Zuschlag. Preis am Wochenende?", "Ab Januar beträgt der Zuschlag 40 %. Preis am Wochenende dann?"],
    expected: [[money("Preis", "mul(12, 1.25)", "EUR")], [money("Preis", "mul(12, 1.4)", "EUR")]] },
  { category: "swiss-vat", locale: "de", critical: true, secondTurn: "follow-up", source: "Zurich quote",
    turns: ["Offerte aus Zürich: CHF 4'380.00 netto, 8.1 % MwSt. Steuer auf den Rappen, Total auf 5 Rappen gerundet?", "Mit dem reduzierten Satz von 2.6 %?"],
    expected: [[money("Steuer", "round(mul(4380, 0.081), 2)"), money("Total", "div(round(mul(add(4380, round(mul(4380, 0.081), 2)), 20), 0), 20)")], [money("Steuer", "round(mul(4380, 0.026), 2)"), money("Total", "div(round(mul(add(4380, round(mul(4380, 0.026), 2)), 20), 0), 20)")]] },
  { category: "instalments-simple-interest", locale: "de", secondTurn: "correction", source: "loan over months",
    turns: ["Darlehen 15.000,00 EUR, 3,5 % einfache Zinsen pro Jahr, Laufzeit 20 Monate. Zinsen und Rückzahlungsbetrag?", "Korrektur: Laufzeit 30 Monate. Zinsen und Rückzahlungsbetrag?"],
    expected: [[money("Zinsen", "div(mul(15000, 0.035, 20), 12)", "EUR"), money("Rückzahlung", "add(15000, div(mul(15000, 0.035, 20), 12))", "EUR")], [money("Zinsen", "div(mul(15000, 0.035, 30), 12)", "EUR"), money("Rückzahlung", "add(15000, div(mul(15000, 0.035, 30), 12))", "EUR")]] },
  { category: "compound-interest", locale: "de", secondTurn: "follow-up", source: "savings, yearly",
    turns: ["3.500,00 EUR zu 1,5 % pro Jahr mit jährlichem Zinseszins, 4 Jahre. Endbetrag auf Cent gerundet?", "Und nach 8 Jahren?"],
    expected: [[money("Endbetrag", "round(mul(3500, pow(1.015, 4)), 2)", "EUR")], [money("Endbetrag", "round(mul(3500, pow(1.015, 8)), 2)", "EUR")]] },
  { category: "table-sum", locale: "de", critical: true, secondTurn: "correction", source: "spreadsheet rows with a share",
    turns: ["Zeile 1: 230,00 EUR; Zeile 2: 1.045,50 EUR; Zeile 3: 78,25 EUR; Zeile 4: 612,00 EUR. Summe? Und Zeile 2 als Anteil an der Summe in Prozent, eine Nachkommastelle?", "Zeile 4 war 162,00 EUR, nicht 612,00 EUR. Summe und Anteil von Zeile 2 nochmal?"],
    expected: [[money("Summe", "add(230, 1045.50, 78.25, 612)", "EUR"), percent("Anteil Zeile 2", "round(mul(div(1045.50, add(230, 1045.50, 78.25, 612)), 100), 1)", 1)], [money("Summe", "add(230, 1045.50, 78.25, 162)", "EUR"), percent("Anteil Zeile 2", "round(mul(div(1045.50, add(230, 1045.50, 78.25, 162)), 100), 1)", 1)]] },
  { category: "date-time", locale: "de", critical: true, secondTurn: "correction", source: "flight, airport lead time",
    turns: ["Abflug 06:50 Uhr. Ich will 90 Minuten vorher am Flughafen sein; die Fahrt dauert 35 Minuten. Wann losfahren?", "Die Fahrt dauert 55 Minuten. Wann jetzt?"],
    expected: [[time("losfahren", 'fmtClock(sub(clock("06:50"), add(90, 35)))')], [time("losfahren", 'fmtClock(sub(clock("06:50"), add(90, 55)))')]] },
  { category: "date-time", locale: "de", secondTurn: "correction", source: "return window",
    turns: ["Rückgaberecht 30 Tage ab Lieferung am 15.03.2026. Letzter Tag?", "Die Lieferung war am 28.03.2026. Letzter Tag?"],
    expected: [[date("letzter Tag", 'addDays("2026-03-15", 30)')], [date("letzter Tag", 'addDays("2026-03-28", 30)')]] },
  { category: "proration", locale: "de", secondTurn: "correction", source: "yearly subscription refund",
    turns: ["Jahresabo 228,00 EUR für 12 Monate, gekündigt nach 4 Monaten. Erstattung für die restlichen Monate?", "Korrektur: gekündigt nach 9 Monaten. Erstattung?"],
    expected: [[money("Erstattung", "mul(div(228, 12), sub(12, 4))", "EUR")], [money("Erstattung", "mul(div(228, 12), sub(12, 9))", "EUR")]] },
  { category: "multi-step", locale: "de", secondTurn: "correction", source: "discount then VAT",
    turns: ["Listenpreis 1.250,00 EUR netto, 12 % Rabatt, dann 19 % Umsatzsteuer auf den rabattierten Preis. Bruttobetrag?", "Der Rabatt beträgt 20 %, nicht 12 %. Brutto?"],
    expected: [[money("Brutto", "mul(mul(1250, 0.88), 1.19)", "EUR")], [money("Brutto", "mul(mul(1250, 0.8), 1.19)", "EUR")]] },
  { category: "skonto", locale: "de", secondTurn: "correction", source: "cash discount",
    turns: ["Rechnung 5.236,00 EUR brutto, bei Zahlung innerhalb von 7 Tagen abzüglich 3 % Skonto. Skontobetrag und Zahlbetrag?", "Es sind nur 2 % Skonto. Skontobetrag und Zahlbetrag?"],
    expected: [[money("Skonto", "mul(5236, 0.03)", "EUR"), money("Zahlbetrag", "sub(5236, mul(5236, 0.03))", "EUR")], [money("Skonto", "mul(5236, 0.02)", "EUR"), money("Zahlbetrag", "sub(5236, mul(5236, 0.02))", "EUR")]] },
  { category: "vat", locale: "en", critical: true, secondTurn: "correction", source: "quote, net plus VAT",
    turns: ["Quote: 3,850.00 EUR net plus 19% VAT. What are the VAT and the total?", "Correction: the rate is 7%. VAT and total?"],
    expected: [[money("VAT", "mul(3850, 0.19)", "EUR"), money("total", "add(3850, mul(3850, 0.19))", "EUR")], [money("VAT", "mul(3850, 0.07)", "EUR"), money("total", "add(3850, mul(3850, 0.07))", "EUR")]] },
  { category: "net-gross", locale: "en", critical: true, secondTurn: "follow-up", source: "UK hotel and taxi receipts",
    turns: ["A hotel bill of £264.00 includes 20% VAT. What are the net amount and the VAT?", "A taxi receipt of £18.00 includes 20% VAT. Net and VAT?"],
    expected: [[money("net", "round(div(264, 1.2), 2)", "GBP"), money("VAT", "sub(264, round(div(264, 1.2), 2))", "GBP")], [money("net", "round(div(18, 1.2), 2)", "GBP"), money("VAT", "sub(18, round(div(18, 1.2), 2))", "GBP")]] },
  { category: "percent-change", locale: "en", critical: true, secondTurn: "follow-up", source: "subscription price",
    turns: ["Our subscription went from 11.99 USD to 13.49 USD a month. By what percentage did it increase, to two decimals?", "If it drops from 13.49 USD to 12.99 USD, what is the change in percent, negative for a decrease?"],
    expected: [[percent("increase", "round(mul(div(sub(13.49, 11.99), 11.99), 100), 2)", 2)], [percent("change", "round(mul(div(sub(12.99, 13.49), 13.49), 100), 2)", 2)]] },
  { category: "percent-change", locale: "en", secondTurn: "follow-up", source: "page views",
    turns: ["Page views rose from 48,200.00 to 55,430.00. What is the percentage rise, to one decimal place?", "From 55,430.00 to 52,658.50: change in percent, negative for a fall, one decimal?"],
    expected: [[percent("rise", "round(mul(div(sub(55430, 48200), 48200), 100), 1)", 1)], [percent("change", "round(mul(div(sub(52658.50, 55430), 55430), 100), 1)", 1)]] },
  { category: "overtime-rate", locale: "en", critical: true, secondTurn: "follow-up", source: "night shift multiplier",
    turns: ["My rate is 26.00 EUR an hour. Night shifts are paid at 125% of the normal rate. Pay for 8 night hours?", "And at 175% of the normal rate?"],
    expected: [[money("pay", "mul(mul(26, 1.25), 8)", "EUR")], [money("pay", "mul(mul(26, 1.75), 8)", "EUR")]] },
  { category: "surcharge", locale: "en", critical: true, secondTurn: "correction", source: "express delivery",
    turns: ["Delivery costs 6.50 EUR plus a 30% express surcharge. What is the express delivery price?", "The express surcharge is now 50%. Price?"],
    expected: [[money("price", "mul(6.50, 1.3)", "EUR")], [money("price", "mul(6.50, 1.5)", "EUR")]] },
  { category: "swiss-vat", locale: "en", critical: true, secondTurn: "follow-up", source: "Swiss bill in English",
    turns: ["Swiss bill: CHF 915.00 net plus 8.1% VAT. VAT to the centime, and the total rounded to 5 centimes?", "At the 3.8% rate?"],
    expected: [[money("VAT", "round(mul(915, 0.081), 2)"), money("total", "div(round(mul(add(915, round(mul(915, 0.081), 2)), 20), 0), 20)")], [money("VAT", "round(mul(915, 0.038), 2)"), money("total", "div(round(mul(add(915, round(mul(915, 0.038), 2)), 20), 0), 20)")]] },
  { category: "overtime-rate", locale: "en", secondTurn: "follow-up", source: "weekly timesheet with threshold",
    turns: ["I'm paid 21.50 EUR an hour; this week's timesheet shows 46 working hours, and anything over 40 is paid at 150% of the normal rate. Gross pay?", "With 41 working hours?"],
    expected: [[money("gross pay", "add(mul(40, 21.50), mul(sub(46, 40), mul(21.50, 1.5)))", "EUR")], [money("gross pay", "add(mul(40, 21.50), mul(sub(41, 40), mul(21.50, 1.5)))", "EUR")]] },
  { category: "instalments-simple-interest", locale: "en", secondTurn: "follow-up", source: "daily interest",
    turns: ["2,800.00 EUR earns 4.2% simple interest a year for 75 days on a 365-day year. Interest to the cent?", "For 275 days?"],
    expected: [[money("interest", "round(div(mul(2800, 0.042, 75), 365), 2)", "EUR")], [money("interest", "round(div(mul(2800, 0.042, 275), 365), 2)", "EUR")]] },
  { category: "compound-interest", locale: "en", secondTurn: "follow-up", source: "yearly compounding",
    turns: ["6,500.00 EUR at 2.2% a year, compounded yearly, for 5 years. Final amount to the cent?", "For 2 years?"],
    expected: [[money("final amount", "round(mul(6500, pow(1.022, 5)), 2)", "EUR")], [money("final amount", "round(mul(6500, pow(1.022, 2)), 2)", "EUR")]] },
  { category: "table-sum", locale: "en", critical: true, secondTurn: "follow-up", source: "small receipts, average",
    turns: ["Receipts: 12.40 EUR, 7.95 EUR, 23.10 EUR, 4.55 EUR and 31.00 EUR. What are the total and the average of the 5 receipts, to the cent?", "Without the 31.00 EUR receipt: total and the average of the 4?"],
    expected: [[money("total", "add(12.40, 7.95, 23.10, 4.55, 31)", "EUR"), money("average", "round(div(add(12.40, 7.95, 23.10, 4.55, 31), 5), 2)", "EUR")], [money("total", "add(12.40, 7.95, 23.10, 4.55)", "EUR"), money("average", "round(div(add(12.40, 7.95, 23.10, 4.55), 4), 2)", "EUR")]] },
  { category: "date-time", locale: "en", critical: true, secondTurn: "correction", source: "meeting, train plus walk",
    turns: ["The meeting is at 15:10. The train takes 1 hour 25 minutes and the walk 10 minutes. Latest departure?", "The train takes 1 hour 40 minutes. Latest departure now?"],
    expected: [[time("latest departure", 'fmtClock(sub(clock("15:10"), add(85, 10)))')], [time("latest departure", 'fmtClock(sub(clock("15:10"), add(100, 10)))')]] },
  { category: "date-time", locale: "en", secondTurn: "correction", source: "trial period",
    turns: ["A 60-day trial starts on 2026-11-02 and ends 60 days after the start. On what date does it end?", "If it starts on 2026-11-20 instead?"],
    expected: [[date("end date", 'addDays("2026-11-02", 60)')], [date("end date", 'addDays("2026-11-20", 60)')]] },
  { category: "proration", locale: "en", secondTurn: "correction", source: "gym membership refund",
    turns: ["A gym membership costs 456.00 EUR for 12 months. I cancel after 5 months. Refund for the remaining months?", "After 10 months?"],
    expected: [[money("refund", "mul(div(456, 12), sub(12, 5))", "EUR")], [money("refund", "mul(div(456, 12), sub(12, 10))", "EUR")]] },
  { category: "multi-step", locale: "en", secondTurn: "correction", source: "student discount then booking fee",
    turns: ["Ticket price 64.00 EUR, 15% student discount, then a 2.5% booking fee on the discounted price. Amount to pay, to the cent?", "The booking fee is 4%. Amount to pay?"],
    expected: [[money("amount to pay", "round(mul(mul(64, 0.85), 1.025), 2)", "EUR")], [money("amount to pay", "round(mul(mul(64, 0.85), 1.04), 2)", "EUR")]] },
];

export function buildUnseenV3() {
  const cases = drafts.map((d, i) => {
    const exp = [d.expected[0].map(expectedItem), d.expected[1].map(expectedItem)] as [Expected[], Expected[]];
    return {
      id: `unseen3-${String(i + 1).padStart(2, "0")}`,
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
    status: "UNSEEN SET for gate v3 (Design B). FROZEN by SHA-256 in THRESHOLD-v3.md; never used for development; never pooled with any other set.",
    authoredOn: "2026-10-24",
    synthetic: true,
    note: "Generated once by make-unseen-v3.ts; every expected value is computed from its derivation. 30 cases, 15 German and 15 English, 16 critical, with the four weak kinds of gate v2 (percentage change, surcharge and rate phrases, Swiss VAT, overtime) in both languages and styles the earlier sets do not use.",
    cases,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("make-unseen-v3.ts")) {
  const set = buildUnseenV3();
  writeFileSync("evaluation/arithmetic-gate/unseen-v3-20261023.json", JSON.stringify(set, null, 2) + "\n");
  console.log(`wrote ${set.cases.length} cases`);
}
