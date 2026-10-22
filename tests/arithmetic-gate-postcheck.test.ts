import { describe, expect, it } from "vitest";
import gate from "../evaluation/arithmetic-gate/cases.json";
import { postcheck } from "../evaluation/arithmetic-gate/postcheck";
import type { GateCase } from "../evaluation/arithmetic-gate/scorer";

const summary = (reply: string, locale: "de" | "en") =>
  postcheck(reply, locale).relations.map((r) => `${r.kind}:${r.ok ? "ok" : "MISMATCH"}`);

describe("post-check recomputes stated arithmetic", () => {
  it("flags the 20 October failure shape and accepts the correct time", () => {
    expect(summary("09:23 Uhr − 18 Minuten = 08:58 Uhr", "de")).toEqual(["equation:MISMATCH"]);
    expect(summary("09:23 Uhr − 18 Minuten = 09:05 Uhr", "de")).toEqual(["equation:ok"]);
    expect(summary("10:12 - 6 min - 23 min = 9:43 am", "en")).toEqual(["equation:ok"]);
    expect(summary("22:40 + 7 h 35 min = 06:15", "de")).toEqual(["equation:ok"]);
    expect(summary("12:10 − 08:45 = 3 h 25 min", "de")).toEqual(["equation:ok"]);
    expect(summary("08:45 - 12:10 = 3 h 35 min", "en")).toEqual(["equation:MISMATCH"]);
  });
  it("checks equations in German and English formats, with percentages and rounding", () => {
    expect(summary("1.234,56 € × 19 % = 234,57 €", "de")).toEqual(["equation:ok"]);
    expect(summary("1.234,56 € × 19 % = 234,56 €", "de")).toEqual(["equation:MISMATCH"]);
    expect(summary("1,234.56 × 1.19 = 1,469.13", "en")).toEqual(["equation:ok"]);
    expect(summary("1.234,56 + 234,57 = 1.469,13 EUR", "de")).toEqual(["equation:ok"]);
    expect(summary("1,234.56 + 234.57 = 1,496.13 EUR", "en")).toEqual(["equation:MISMATCH"]);
    expect(summary("2 × 249,00 EUR = 498,00 EUR − 10 % = 448,20 EUR", "de")).toEqual([
      "equation:ok",
      "equation:ok",
    ]);
    expect(summary("3 Stunden × 95,00 EUR = 285,00 EUR", "de")).toEqual(["equation:ok"]);
    expect(summary("7 h 40 min × 62,00 EUR/h = 475,33 EUR", "de")).toEqual(["equation:ok"]);
    expect(summary("6.360,00 EUR : 18 = 353,33 EUR", "de")).toEqual(["equation:ok"]);
    expect(summary("59.50 / 850 = 7%", "en")).toEqual(["equation:ok"]);
    expect(summary("234,5664 ≈ 234,57", "de")).toEqual([]);
    expect(summary("5,000 × 1.03 × 1.03 × 1.03 × 1.03 ≈ 5,627.54", "en")).toEqual(["equation:ok"]);
  });
  it("checks dates plus days", () => {
    expect(summary("03.11.2026 + 14 Tage = 17.11.2026", "de")).toEqual(["equation:ok"]);
    expect(summary("03.11.2026 + 14 Tage = 18.11.2026", "de")).toEqual(["equation:MISMATCH"]);
  });
  it("checks percentages of a stated base", () => {
    expect(summary("19 % von 1.234,56 EUR sind 234,57 EUR.", "de")).toEqual(["percent-of:ok"]);
    expect(summary("19% of 2,450.00 EUR is 456.50 EUR.", "en")).toEqual(["percent-of:MISMATCH"]);
    expect(summary("The VAT is 465.50 EUR (19% of 2,450.00 EUR).", "en")).toEqual(["percent-of:ok"]);
  });
  it("checks percentage changes", () => {
    expect(summary("Die Miete steigt von 850,00 EUR auf 909,50 EUR, also um 59,50 EUR oder 7 %.", "de")).toEqual([
      "percent-change:ok",
    ]);
    expect(summary("The rent goes from 850.00 EUR to 909.50 EUR, an increase of 6.54%.", "en")).toEqual([
      "percent-change:MISMATCH",
    ]);
    expect(summary("Revenue falls from 55,200 EUR to 46,920 EUR, a drop of 15%.", "en")).toEqual([
      "percent-change:ok",
    ]);
  });
  it("checks time spans written next to their duration", () => {
    expect(summary("08:45–12:10 (3 h 25 min) und 13:05–17:20 (4 h 15 min)", "de")).toEqual([
      "time-span:ok",
      "time-span:ok",
    ]);
    expect(summary("08:45 to 12:10 (3 h 35 min)", "en")).toEqual(["time-span:MISMATCH"]);
  });
  it("checks sums of listed items, tables and running totals", () => {
    const table = [
      "| Posten | Betrag |",
      "|---|---|",
      "| Büromiete | 1.250,00 EUR |",
      "| Software | 89,90 EUR |",
      "| Telefon | 34,99 EUR |",
      "| Fahrtkosten | 212,40 EUR |",
      "| Porto | 17,85 EUR |",
      "| **Summe** | **1.605,14 EUR** |",
    ].join("\n");
    expect(summary(table, "de")).toEqual(["sum:ok"]);
    expect(summary(table.replace("1.605,14", "1.596,14"), "de")).toEqual(["sum:MISMATCH"]);
    const invoice = [
      "- Net total: 205.49 EUR",
      "- VAT (19%): 39.04 EUR",
      "- **Gross total: 244.53 EUR**",
    ].join("\n");
    expect(summary(invoice, "en")).toEqual(["sum:ok"]);
    expect(summary(invoice.replace("244.53", "244.43"), "en")).toEqual(["sum:MISMATCH"]);
    const discount = ["- Zwischensumme: 498,00 EUR", "- abzüglich Rabatt: 49,80 EUR", "- Summe netto: 448,20 EUR"].join("\n");
    expect(summary(discount, "de")).toEqual(["sum:ok"]);
    const running = [
      "- Material: 640,25 EUR",
      "- Lizenz: 89,99 EUR",
      "- Unterauftrag: 1.002,00 EUR",
      "- Summe: 1.732,24 EUR",
      "- Umsatzsteuer: 329,13 EUR",
      "- Gesamt: 2.061,37 EUR",
    ].join("\n");
    expect(summary(running, "de")).toEqual(["sum:ok", "sum:ok"]);
  });
  it("stays silent on lists that are not sums and on unrelated numbers", () => {
    const plan = ["- Rate: 450,00 EUR", "- Nach 3 Raten bezahlt: 1.350,00 EUR", "- Gesamt: 3.600,00 EUR"].join("\n");
    expect(postcheck(plan, "de").flagged).toBe(false);
    expect(summary("Der Satz stieg von 16 % auf 19 %, also um 3 Prozentpunkte.", "de")).toEqual([]);
    expect(summary("Am 03.11.2026 um 09:05 Uhr, Rechnung A-104, 12 Raten.", "de")).toEqual([]);
    expect(postcheck("08:45–12:10 und 13:05–17:20: insgesamt 7 h 40 min.", "de").flagged).toBe(false);
  });
  it("raises no false alarm on the gate's own expected facts", () => {
    for (const c of gate.cases as unknown as GateCase[])
      for (const facts of c.mandatoryFacts) expect(postcheck(facts, c.locale).flagged, `${c.id}: ${facts}`).toBe(false);
  });
});
