// Fixed warnings under an answer whose figures were re-checked (src/arithmetic/check.ts and
// completeness.ts). Owner wording for the English (23 October and 12 November 2026).
import { defineText } from "./core";

const germanNames: Record<string, string> = {
  payable: "zu zahlender Betrag",
  pay: "Lohn",
  tax: "Steuer",
  gross: "Bruttobetrag",
  net: "Nettobetrag",
  total: "Gesamtbetrag",
  discount: "Rabatt",
  perPerson: "Betrag pro Person",
  average: "Durchschnitt",
  interest: "Zinsen",
  repayment: "Rückzahlungsbetrag",
  finalAmount: "Endbetrag",
  price: "Preis",
  refund: "Erstattung",
  percentChange: "prozentuale Veränderung",
  share: "prozentualer Anteil",
  time: "Zeit",
  date: "Datum",
  count: "Anzahl",
};

export const arithmeticText = defineText({
  en: {
    mismatch:
      "We recalculated the figures in this answer and some did not match. Please check these numbers before you rely on them.",
    ambiguous:
      "A number in this answer could be read two ways (for example 1.234 as one thousand two hundred thirty-four or as one point two three four). Please check the separators before you rely on it.",
    missing: (list: string) =>
      `This answer may not state every figure you asked for: missing ${list}. Please check before you rely on it.`,
    and: "and",
    aFigure: "a figure",
    quantity: (_key: string, englishName: string) => englishName,
  },
  de: {
    mismatch:
      "Wir haben die Zahlen in dieser Antwort nachgerechnet, und einige stimmten nicht. Bitte prüfen Sie diese Zahlen, bevor Sie sich darauf verlassen.",
    ambiguous:
      "Eine Zahl in dieser Antwort lässt sich auf zwei Arten lesen (zum Beispiel 1.234 als eintausendzweihundertvierunddreißig oder als eins Komma zwei drei vier). Bitte prüfen Sie die Trennzeichen, bevor Sie sich darauf verlassen.",
    missing: (list: string) =>
      `Diese Antwort nennt möglicherweise nicht jede Zahl, nach der Sie gefragt haben. Nicht genannt: ${list}. Bitte prüfen Sie das, bevor Sie sich darauf verlassen.`,
    and: "und",
    aFigure: "eine Zahl",
    quantity: (key: string, englishName: string) => germanNames[key] ?? englishName,
  },
});
