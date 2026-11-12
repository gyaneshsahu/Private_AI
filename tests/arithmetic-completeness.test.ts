// Completeness check (owner decision, 12 November 2026): every figure the question asks for
// must appear in the answer. Unit tests in English and German, plus a regression over the
// arithmetic gate v3 question texts with synthetic complete and incomplete answers.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkAnswerCompleteness,
  checkCompleteness,
  completenessWarning,
  requestedQuantities,
} from "../src/arithmetic/completeness";
import { formatLocaleNumber } from "../src/arithmetic/locale-number";
import { composeContext, newMessage } from "../src/conversation";

const missing = (q: string, a: string, locale: "de" | "en", earlier?: string) => {
  const r = checkCompleteness(q, a, locale, earlier);
  return r.status === "checked" ? r.missing : "unknown";
};

describe("requested quantities", () => {
  it("reads German requests and ignores the givens", () => {
    expect(
      requestedQuantities("Hallo, 6.420,00 EUR netto, darauf 19 % Umsatzsteuer. Wie hoch sind Steuer und Brutto?", "de"),
    ).toEqual(["tax", "gross"]);
    expect(requestedQuantities("Taxiquittung 36,50 EUR brutto inkl. 7 % Umsatzsteuer. Netto und Steuer, auf Cent gerundet?", "de")).toEqual(["tax", "net"]);
    expect(requestedQuantities("Tarif 21,00 EUR pro Stunde, Sonntag 150 % des normalen Satzes. Lohn für 5 Sonntagsstunden?", "de")).toEqual(["pay"]);
    expect(requestedQuantities("Rechnung 5.236,00 EUR, abzüglich 3 % Skonto. Skontobetrag und Zahlbetrag?", "de")).toEqual(["payable", "discount"]);
    expect(requestedQuantities("Von 42,50 EUR auf 46,75 EUR. Um wie viel Prozent ist er gestiegen?", "de")).toEqual(["percentChange"]);
    expect(requestedQuantities("Und von 46,75 EUR auf 44,00 EUR: Änderung in Prozent?", "de")).toEqual(["percentChange"]);
    expect(requestedQuantities("Abflug 06:50 Uhr, die Fahrt dauert 35 Minuten. Wann losfahren?", "de")).toEqual(["time"]);
    // "an der Summe" names the base of the share, not a second request.
    expect(requestedQuantities("Zeile 1: 230,00 EUR; Zeile 2: 1.045,50 EUR. Und Zeile 2 als Anteil an der Summe in Prozent?", "de")).toEqual(["share"]);
  });
  it("reads English requests and ignores the givens", () => {
    expect(requestedQuantities("Quote: 3,850.00 EUR net plus 19% VAT. What are the VAT and the total?", "en")).toEqual(["tax", "total"]);
    expect(requestedQuantities("Paid 21.50 EUR an hour, 46 hours, over 40 at 150%. Gross pay?", "en")).toEqual(["pay"]);
    expect(requestedQuantities("Ticket 64.00 EUR, 15% student discount. Amount to pay, to the cent?", "en")).toEqual(["payable"]);
    expect(requestedQuantities("A 60-day trial starts on 2026-11-02. On what date does it end?", "en")).toEqual(["date"]);
    expect(requestedQuantities("Receipts: 12.40 EUR and 7.95 EUR. What are the total and the average of the 2 receipts?", "en")).toEqual(["total", "average"]);
  });
  it("returns unknown when there is no calculation request it can read", () => {
    expect(requestedQuantities("What is the capital of France?", "en")).toBe("unknown");
    // A bare year is not a figure to calculate with; "Mindestlohn" is not "Lohn für N Stunden".
    expect(requestedQuantities("Wie hoch ist der gesetzliche Mindestlohn im Jahr 2026 pro Stunde?", "de")).toBe("unknown");
    // Every label word here is a given.
    expect(requestedQuantities("Hotelrechnung 214,00 EUR brutto inkl. 7 % Umsatzsteuer?", "de")).toBe("unknown");
    expect(requestedQuantities("Mit dem reduzierten Satz von 2.6 %?", "de")).toBe("unknown");
  });
});

describe("matching the answer", () => {
  const vatDe = "Hallo, 6.420,00 EUR netto, darauf 19 % Umsatzsteuer. Wie hoch sind Steuer und Brutto?";
  const payEn = "My rate is 26.00 EUR an hour. Night shifts are paid at 125% of the normal rate. Pay for 8 night hours?";
  it("flags the tax without the gross (German)", () => {
    expect(missing(vatDe, "Die Umsatzsteuer beträgt 6.420,00 EUR × 19 % = 1.219,80 EUR.", "de")).toEqual(["gross"]);
    expect(missing(vatDe, "**Steuer: 1.219,80 EUR** (recomputed and matches)", "de")).toEqual(["gross"]);
    expect(missing(vatDe, "Steuer: 1.219,80 EUR\nBrutto: 7.639,80 EUR", "de")).toEqual([]);
    expect(missing(vatDe, "Die Steuer beträgt 1.219,80 EUR, der Gesamtbetrag inkl. MwSt. 7.639,80 EUR.", "de")).toEqual([]);
  });
  it("flags the hourly rate in place of the pay (English and German)", () => {
    expect(missing(payEn, "At 125% the night rate is 26.00 × 1.25 = 32.50 EUR per hour.", "en")).toEqual(["pay"]);
    expect(missing(payEn, "Night pay: 8 × 32.50 = 260.00 EUR.", "en")).toEqual([]);
    const lohn = "Tarif 21,00 EUR pro Stunde. Sonntagsarbeit wird mit 150 % des normalen Satzes bezahlt. Lohn für 5 Sonntagsstunden?";
    expect(missing(lohn, "**Sonntagsstundensatz: 31,50 EUR** (recomputed and matches)", "de")).toEqual(["pay"]);
    expect(missing(lohn, "Lohn für 5 Sonntagsstunden: 157,50 EUR", "de")).toEqual([]);
  });
  it("stays silent when it cannot tell", () => {
    // Unlabelled working: the new figure may be the gross amount.
    expect(missing(vatDe, "Steuer: 1.219,80 EUR\n6.420,00 + 1.219,80 = 7.639,80 EUR", "de")).toEqual([]);
    expect(missing(payEn, "8 × 32.50 = 260.00 EUR", "en")).toEqual([]);
    // No figures at all (a clarifying question or a refusal).
    expect(missing(vatDe, "Welcher Steuersatz gilt für Ihre Leistung?", "de")).toEqual([]);
    // A request it cannot read.
    expect(missing("What is 2 + 2?", "4", "en")).toBe("unknown");
  });
  it("accepts the final-answer line for a single requested figure", () => {
    const q = "A jacket costs €80. It is reduced by 25%, then by a further 10%. What is the final price?";
    expect(missing(q, "€80 × 0.75 × 0.90\nFinal answer: €54", "en")).toEqual([]);
  });
  it("recognises clock times, dates and percentages by their form", () => {
    const wann = "Abflug 06:50 Uhr. Ich will 90 Minuten vorher dort sein; die Fahrt dauert 35 Minuten. Wann losfahren?";
    expect(missing(wann, "Du solltest um 04:45 Uhr losfahren.", "de")).toEqual([]);
    expect(missing(wann, "Du brauchst insgesamt 125 Minuten Vorlauf vor 06:50 Uhr.", "de")).toEqual(["time"]);
    const change = "Mein Beitrag ist von 42,50 EUR auf 46,75 EUR gestiegen. Um wie viel Prozent ist er gestiegen?";
    expect(missing(change, "Der Beitrag ist um 10,00 % gestiegen.", "de")).toEqual([]);
    expect(missing(change, "Der Beitrag ist um 4,25 EUR gestiegen.", "de")).toEqual(["percentChange"]);
  });
  it("carries the request into a short follow-up that asks again", () => {
    const first = "Offerte aus Zürich: CHF 4'380.00 netto, 8.1 % MwSt. Steuer auf den Rappen, Total auf 5 Rappen gerundet?";
    const follow = "Mit dem reduzierten Satz von 2.6 %?";
    expect(missing(follow, "**MwSt (reduzierter Satz): 113,88 CHF**", "de", first)).toEqual(["total"]);
    expect(missing(follow, "**MwSt: 113,88 CHF**\n**Total: 4.493,90 CHF**", "de", first)).toEqual([]);
    expect(missing(follow, "**MwSt: 113,88 CHF**", "de")).toBe("unknown");
  });
  it("words the warning plainly", () => {
    expect(completenessWarning(["gross"])).toBe(
      "This answer may not state every figure you asked for: missing gross amount. Please check before you rely on it.",
    );
    expect(completenessWarning(["tax", "gross", "pay"])).toBe(
      "This answer may not state every figure you asked for: missing tax, gross amount and pay. Please check before you rely on it.",
    );
  });
  it("stores counts and keys from the last question, and nothing of it reaches the model", () => {
    const question = newMessage("user", "Quote: 3,850.00 EUR net plus 19% VAT. What are the VAT and the total?");
    const answer = { ...newMessage("assistant", "VAT: 731.50 EUR"), status: "complete" as const };
    const stored = checkAnswerCompleteness([newMessage("user", "Hello"), question, answer], answer.id, answer.text);
    expect(stored).toEqual({ requested: 2, missing: ["total"] });
    const context = composeContext(
      {
        id: "c", title: "t", createdAt: new Date().toISOString(), attachments: [], usage: [],
        messages: [question, { ...answer, completenessCheck: stored }],
      },
      100000,
    );
    expect(JSON.stringify(context)).not.toContain("completenessCheck");
    expect(JSON.stringify(context)).not.toContain('"requested"');
  });
});

// Regression over the gate's question texts (evaluation/arithmetic-gate/unseen-v3-20261023.json).
type Expected = { label: string; kind: string; value: string; currency?: string; rounding?: { decimals: number } };
const gate = JSON.parse(readFileSync("evaluation/arithmetic-gate/unseen-v3-20261023.json", "utf8")).cases as {
  id: string; locale: "de" | "en"; turns: string[]; expected: Expected[][];
}[];
const show = (e: Expected, locale: "de" | "en") => {
  if (e.kind === "time") return e.value;
  if (e.kind === "date") return locale === "de" ? e.value.split("-").reverse().join(".") : e.value;
  const n = formatLocaleNumber(e.value, e.rounding?.decimals ?? 2, locale);
  return e.kind === "percent" ? `${n} %` : `${n} ${e.currency ?? "EUR"}`;
};
const line = (e: Expected, locale: "de" | "en") => `**${e.label}: ${show(e, locale)}** (recomputed and matches)`;

describe("gate v3 question texts with synthetic answers", () => {
  const turns = gate.flatMap((c) => c.turns.map((q, i) => ({ id: `${c.id}/${i}`, c, q, i, earlier: i ? c.turns[i - 1] : undefined })));
  it("raises no flag on any complete answer", () => {
    for (const t of turns) {
      const full = t.c.expected[t.i].map((e) => line(e, t.c.locale)).join("\n\n");
      expect(missing(t.q, full, t.c.locale, t.earlier), t.id).not.toSatisfy((m) => Array.isArray(m) && m.length > 0);
      const prose = t.c.expected[t.i].map((e) => `${e.label}: ${show(e, t.c.locale)}.`).join(" ");
      expect(missing(t.q, prose, t.c.locale, t.earlier), t.id).not.toSatisfy((m) => Array.isArray(m) && m.length > 0);
    }
  });
  it("flags every two-figure answer that leaves one figure out, when the request is readable", () => {
    let checked = 0;
    for (const t of turns) {
      const expected = t.c.expected[t.i];
      if (expected.length < 2 || requestedQuantities(t.q, t.c.locale) === "unknown" && !t.earlier) continue;
      for (const keep of expected) {
        const result = missing(t.q, line(keep, t.c.locale), t.c.locale, t.earlier);
        if (result === "unknown") continue;
        checked++;
        expect(result.length, `${t.id} keeping only ${keep.label}`).toBe(1);
      }
    }
    // All 20 two-figure turns, each with either figure left out; follow-ups such as 02/1 and
    // 07/1 restate nothing and are read through the earlier question.
    expect(checked).toBe(40);
  });
  it("catches the two patterns behind the 25 silent wrongs", () => {
    const at = (id: string, i: number) => gate.find((c) => c.id === id)!.turns[i];
    // Only the tax, no gross.
    expect(missing(at("unseen3-01", 0), "**Steuer: 1.219,80 EUR** (recomputed and matches)", "de")).toEqual(["gross"]);
    expect(missing(at("unseen3-16", 0), "**VAT: 731.50 EUR** (recomputed and matches)\n\nMethod (from the model): the total is net plus VAT.", "en")).toEqual(["total"]);
    // The rate instead of the pay.
    expect(missing(at("unseen3-05", 0), "**Sonntagsstundensatz: 31,50 EUR** (recomputed and matches)", "de")).toEqual(["pay"]);
    expect(missing(at("unseen3-20", 0), "**Night rate: 32.50 EUR per hour** (recomputed and matches)", "en")).toEqual(["pay"]);
    // The discounted net in place of the gross.
    expect(missing(at("unseen3-14", 0), "**Rabattierter Preis (netto): 1100,00 EUR** (recomputed and matches)", "de")).toEqual(["gross"]);
    // The payable amount after the Skonto left out.
    expect(missing(at("unseen3-15", 0), "**Skonto: 157,08 EUR** (recomputed and matches)", "de")).toEqual(["payable"]);
    // The average after the total left out.
    expect(missing(at("unseen3-26", 1), "**Total without the 31.00 EUR receipt: 48.00 EUR** (recomputed and matches)", "en")).toEqual(["average"]);
  });
});
