import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import gate from "../evaluation/arithmetic-gate/cases.json";
import {
  classifyNumberToken,
  extractMentions,
} from "../evaluation/arithmetic-gate/numbers";
import {
  THRESHOLD,
  type GateCase,
  gateVerdict,
  postcheckArmSummary,
  scoreConversation,
  scoreTurn,
  wilson,
} from "../evaluation/arithmetic-gate/scorer";

const cases = gate.cases as unknown as GateCase[];
const byId = (id: string) => cases.find((c) => c.id === id)!;
const numbers = (reply: string, locale: "de" | "en") =>
  extractMentions(reply, locale).mentions.flatMap((m) =>
    m.kind === "number" ? [m.value.toString()] : [],
  );

describe("number tokens", () => {
  it("reads unambiguous German and English forms", () => {
    expect(classifyNumberToken("1.234,56")).toEqual({ value: "1234.56", hint: "de" });
    expect(classifyNumberToken("1,234.56")).toEqual({ value: "1234.56", hint: "en" });
    expect(classifyNumberToken("1.234.567")).toEqual({ value: "1234567", hint: "de" });
    expect(classifyNumberToken("1,234,567")).toEqual({ value: "1234567", hint: "en" });
    expect(classifyNumberToken("12,5")).toEqual({ value: "12.5", hint: "de" });
    expect(classifyNumberToken("12.5")).toEqual({ value: "12.5", hint: "en" });
    expect(classifyNumberToken("1234,567")).toEqual({ value: "1234.567", hint: "de" });
    expect(classifyNumberToken("0,123")).toEqual({ value: "0.123", hint: "de" });
    expect(classifyNumberToken("1 234,56")).toEqual({ value: "1234.56", hint: "de" });
    expect(classifyNumberToken("1'234.56")).toEqual({ value: "1234.56", hint: "en" });
  });
  it("keeps 1.234 and 1,234 ambiguous until the reply's locale is known", () => {
    expect(classifyNumberToken("1.234")).toEqual({ de: "1234", en: "1.234" });
    expect(classifyNumberToken("1,234")).toEqual({ de: "1.234", en: "1234" });
  });
  it("rejects malformed grouping", () => {
    for (const bad of ["1,23,456", "1.234,5.6", "12.34.56", "1.23,45", "0.123.456"])
      expect(classifyNumberToken(bad), bad).toBeUndefined();
  });
  it("resolves ambiguous tokens from the reply's own unambiguous numbers, then its language", () => {
    expect(numbers("Netto 1.234 EUR, USt 234,46 EUR.", "en")).toEqual(["1234", "234.46"]);
    expect(numbers("Net 1.234 EUR, VAT 0.25 EUR.", "de")).toEqual(["1.234", "0.25"]);
    expect(numbers("Die Summe beträgt 1.234 EUR.", "en")).toEqual(["1234"]);
    expect(numbers("The total is 1,234 EUR.", "de")).toEqual(["1234"]);
    expect(numbers("1,234", "de")).toEqual(["1.234"]);
  });
  it("reads currency, percent, LaTeX and Markdown decorations", () => {
    const m = extractMentions(
      "Brutto: **1.469,13 €**, USt \\(19\\,\\%\\) und $1,234.50 sowie \\(1{,}469.13\\) und 1\\.469,13 EUR, Rabatt 15 Prozent, minus €12,50",
      "de",
    ).mentions.filter((x) => x.kind === "number");
    const summary = m.map((x) =>
      x.kind === "number" ? `${x.value}${x.percent ? "%" : ""}${x.currency ? " " + x.currency : ""}` : "",
    );
    expect(summary).toEqual([
      "1469.13 EUR",
      "19%",
      "1234.5 USD",
      "1469.13",
      "1469.13 EUR",
      "15%",
      "12.5 EUR",
    ]);
  });
  it("does not turn dates, clock times or invoice numbers into amounts", () => {
    expect(numbers("Fällig am 17.11.2026 um 09:05 Uhr, Rechnung A-104.", "de")).toEqual(["104"]);
  });
});

describe("times, durations and dates", () => {
  const kinds = (reply: string, locale: "de" | "en" = "en") =>
    extractMentions(reply, locale).mentions.map((m) =>
      m.kind === "time"
        ? `t${m.minutes}`
        : m.kind === "duration"
          ? `d${m.minutes}`
          : m.kind === "date"
            ? `D${m.candidates.join("|")}`
            : `n${m.value}`,
    );
  it("reads clock times in both conventions", () => {
    expect(kinds("09:05, 9:05 Uhr, 9.05 Uhr, 9:05 am, 9:05 p.m., 12:10 pm, 12:30 am, 21 Uhr", "de")).toEqual([
      "t545", "t545", "t545", "t545", "t1265", "t730", "t30", "t1260",
    ]);
  });
  it("reads durations", () => {
    expect(
      kinds("7 h 40 min; 7 Stunden und 40 Minuten; 460 Minuten; 7:40 h; 1,5 Stunden; 7 hours and 40 minutes"),
    ).toEqual(["d460", "d460", "d460", "d460", "d90", "d460"]);
  });
  it("reads dates in German, English and ISO forms; slash dates stay ambiguous", () => {
    expect(
      kinds("17.11.2026, 17. November 2026, 17 November 2026, November 17, 2026, 17th Nov 2026, 2026-11-17, 3. März 2027"),
    ).toEqual([
      "D2026-11-17", "D2026-11-17", "D2026-11-17", "D2026-11-17", "D2026-11-17", "D2026-11-17", "D2027-03-03",
    ]);
    expect(kinds("03/04/2026 and 17/11/2026")).toEqual(["D2026-04-03|2026-03-04", "D2026-11-17"]);
    expect(kinds("31.02.2026")).not.toContain("D2026-02-31");
  });
});

describe("scoring replies against cases", () => {
  it("passes correct German and English replies in their own formats", () => {
    expect(
      scoreConversation(byId("arith-01"), [
        "Umsatzsteuer: 1.234,56 € × 19 % = 234,57 €. Brutto: 1.469,13 €.",
        "Neu: USt 236,28 EUR, Brutto 1.479,84 EUR (vorher 1.469,13 EUR).",
      ]).pass,
    ).toBe(true);
    expect(
      scoreConversation(byId("arith-02"), [
        "VAT: €465.50. Gross: €2,915.50.",
        "At 7%: VAT 171.50 EUR, gross 2,621.50 EUR.",
      ]).pass,
    ).toBe(true);
  });
  it("accepts a correct value written in the other locale's unambiguous format", () => {
    expect(scoreTurn("Gross: 1469.13 EUR, VAT 234.57 EUR", byId("arith-01").expected[0], [], "de").pass).toBe(true);
  });
  it("does not accept a value that matches only under the other reading of an ambiguous token", () => {
    const item = [{ label: "total", kind: "money" as const, value: "1234.00", currency: "EUR" as const, derivation: "1234" }];
    const english = scoreTurn("The total is 1.234 EUR, and 0.50 EUR is the fee.", item, [], "en");
    expect(english.pass).toBe(false);
    expect(english.required[0].ambiguousOnly).toBe("1.234");
    expect(scoreTurn("Die Summe ist 1.234 EUR, die Gebühr 0,50 EUR.", item, [], "de").pass).toBe(true);
  });
  it("fails the 20 October failure shape even when the right time also appears", () => {
    const c = byId("arith-30");
    const wrong = scoreTurn("Losgehen um 08:58 Uhr.", c.expected[0], c.forbidden[0], "de");
    expect(wrong.pass).toBe(false);
    const both = scoreTurn("09:23 − 18 Minuten = 08:58 Uhr … also 09:05 Uhr.", c.expected[0], c.forbidden[0], "de");
    expect(both.pass).toBe(false);
    expect(both.forbiddenHits.map((h) => h.matchedText)).toEqual(["08:58 Uhr"]);
    expect(scoreTurn("Spätestens um 9:05 Uhr losgehen.", c.expected[0], c.forbidden[0], "de").pass).toBe(true);
  });
  it("applies rounding only where the case states it", () => {
    const rounded = byId("arith-01").expected[0]; // states commercial rounding to the cent
    expect(scoreTurn("USt 234,5664 EUR, Brutto 1.469,1264 EUR", rounded, [], "de").pass).toBe(true);
    expect(scoreTurn("USt 234,56 EUR, Brutto 1.469,12 EUR", rounded, [], "de").pass).toBe(false);
    const exact = byId("arith-02").expected[0]; // no rounding stated
    expect(scoreTurn("VAT 465.5 EUR, gross 2,915.5 EUR", exact, [], "en").pass).toBe(true);
    expect(scoreTurn("VAT 465.499 EUR, gross 2,915.50 EUR", exact, [], "en").pass).toBe(false);
  });
  it("keeps kinds apart: percent is not money, USD is not EUR, 21:05 is not 09:05", () => {
    const money = [{ label: "x", kind: "money" as const, value: "19.00", currency: "EUR" as const, derivation: "19" }];
    expect(scoreTurn("Der Satz ist 19 %.", money, [], "de").pass).toBe(false);
    expect(scoreTurn("It is $19.00.", money, [], "en").pass).toBe(false);
    expect(scoreTurn("It is 19.00.", money, [], "en").pass).toBe(true);
    const time = byId("arith-30").expected[0];
    expect(scoreTurn("um 21:05 Uhr", time, [], "de").pass).toBe(false);
    expect(scoreTurn("at 9:05 pm", time, [], "en").pass).toBe(false);
  });
  it("needs the day unit where the case says days, and an unambiguous date", () => {
    const c = byId("arith-32");
    expect(scoreTurn("Fällig am 17.11.2026; bis zum 31.12.2026 sind es 58 Tage.", c.expected[0], [], "de").pass).toBe(true);
    expect(scoreTurn("Fällig am 17.11.2026; Ergebnis 58.", c.expected[0], [], "de").pass).toBe(false);
    expect(scoreTurn("Due 11/17/2026, 58 days.", c.expected[0], [], "en").pass).toBe(true);
    const d5 = byId("arith-33").expected[0];
    expect(scoreTurn("Second: 03/01/2028; third: 31/03/2028.", d5, [], "en").pass).toBe(false);
  });
  it("fails an undelivered or partly delivered conversation", () => {
    const c = byId("arith-24");
    expect(scoreConversation(c, ["Summe: 1.605,14 EUR"]).pass).toBe(false);
    expect(scoreConversation(c, ["", "Summe: 1.614,14 EUR"]).pass).toBe(false);
    expect(scoreConversation(c, ["Summe: 1.605,14 EUR", "Summe: 1.614,14 EUR"]).pass).toBe(true);
  });
});

describe("threshold arithmetic", () => {
  it("computes Wilson intervals", () => {
    const w = wilson(117, 120);
    expect(w.lower).toBeCloseTo(0.92906, 4);
    expect(w.upper).toBeCloseTo(0.99145, 4);
    expect(wilson(30, 30).lower).toBeCloseTo(0.88649, 4);
    expect(wilson(34, 34).lower).toBeLessThan(0.9);
    expect(wilson(35, 35).lower).toBeGreaterThanOrEqual(0.9);
    expect(wilson(0, 0)).toEqual({ p: NaN, lower: 0, upper: 1 });
    expect(() => wilson(3, 2)).toThrow();
  });
  const small = [
    { id: "c1", critical: true },
    ...Array.from({ length: 39 }, (_, i) => ({ id: `n${i}`, critical: false })),
  ];
  const all = (fail: (id: string, rep: number) => boolean, reps = 3) =>
    small.flatMap((c) =>
      Array.from({ length: reps }, (_, r) => ({ caseId: c.id, repetition: r + 1, pass: !fail(c.id, r + 1) })),
    );
  it("passes a clean arm and fails any critical failure", () => {
    expect(gateVerdict(small, all(() => false)).verdict).toBe("PASS");
    const v = gateVerdict(small, all((id, r) => id === "c1" && r === 2));
    expect(v.verdict).toBe("FAIL");
    expect(v.criticalFailures).toEqual(["c1"]);
  });
  it("needs repetitions 4 and 5 for a borderline case, then reports its interval", () => {
    const base = all((id, r) => id === "n3" && r === 1);
    expect(gateVerdict(small, base).verdict).toBe("INCOMPLETE");
    const extra = [4, 5].map((r) => ({ caseId: "n3", repetition: r, pass: true }));
    const v = gateVerdict(small, [...base, ...extra]);
    expect(v.verdict).toBe("PASS");
    expect(v.rate).toBeCloseTo(119 / 120);
    expect(v.borderline).toEqual([
      expect.objectContaining({ caseId: "n3", runs: 5, passes: 4 }),
    ]);
    const twice = [...base, { caseId: "n3", repetition: 4, pass: false }, { caseId: "n3", repetition: 5, pass: true }];
    expect(gateVerdict(small, twice).verdict).toBe("FAIL");
  });
  it("fails below 97% even when every borderline case later recovers", () => {
    const failing = ["n1", "n2", "n3", "n4"];
    const runs = [
      ...all((id, r) => failing.includes(id) && r === 1),
      ...failing.flatMap((id) => [4, 5].map((r) => ({ caseId: id, repetition: r, pass: true }))),
    ];
    const v = gateVerdict(small, runs);
    expect(v.verdict).toBe("FAIL");
    expect(v.passes).toBe(116);
  });
  it("is incomplete while base runs are missing, and rejects duplicates", () => {
    expect(gateVerdict(small, all(() => false).slice(1)).verdict).toBe("INCOMPLETE");
    const runs = all(() => false);
    expect(() => gateVerdict(small, [...runs, runs[0]])).toThrow();
  });
  it("summarises the offline post-check arm", () => {
    const s = postcheckArmSummary([
      { caseId: "a", repetition: 1, exact: false, flagged: true },
      { caseId: "b", repetition: 1, exact: false, flagged: false },
      { caseId: "c", repetition: 1, exact: true, flagged: true },
      { caseId: "d", repetition: 1, exact: true, flagged: false },
    ]);
    expect(s).toMatchObject({ wrong: 2, caught: 1, silentWrong: 1, falseAlarms: 1 });
  });
  it("matches the written proposal", () => {
    const doc = readFileSync("evaluation/arithmetic-gate/THRESHOLD.md", "utf8");
    expect(THRESHOLD.minExactRate).toBe(0.97);
    expect(THRESHOLD.minWilsonLower).toBe(0.9);
    for (const phrase of ["97%", "90%", "three repetitions", "five runs", "two of five"])
      expect(doc, phrase).toContain(phrase);
  });
});
