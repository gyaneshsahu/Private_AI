import { describe, expect, it } from "vitest";
import { PHRASE_RULES, methodChecks, percentChangeCheck, phraseChecks } from "../src/arithmetic/method-checks";
import type { Program } from "../src/arithmetic/evaluator";
import { conversationSpans } from "../src/arithmetic/spans";

// Deterministic method checks (Design B). Each rule is a general phrase
// class; every rule is tested with a positive case, a negative case and a
// case it must not classify, in both languages where the class exists.

const program = (steps: Program["steps"]): Program => ({ operands: {}, steps });
const span = (turns: string[], written: string) => {
  const s = conversationSpans(turns, "en").find((x) => x.text === written);
  if (!s) throw new Error(`no span ${written}`);
  return s.id;
};

describe("rate multiplier (X % of the rate, bezahlt mit X %)", () => {
  const en = ["I earn 22.50 EUR an hour; hours above 40 are paid at 150% of the normal rate. Gross pay for 42 working hours?"];
  const de = ["Stundenlohn 22,50 EUR; Überstunden werden mit 150 % vergütet. Lohn für 42 Arbeitsstunden?"];
  it("flags add_percent with the rate percentage, in both languages", () => {
    for (const turns of [en, de]) {
      const p = span(turns, "150");
      const rate = span(turns, turns === en ? "22.50" : "22,50");
      const flags = phraseChecks(turns, conversationSpans(turns, "en"), program([{ id: "s1", op: "add_percent", args: [rate, p] }]));
      expect(flags.map((f) => f.rule)).toEqual(["rate-multiplier"]);
      expect(flags[0].text).toMatch(/rule: rate multiplier/);
    }
  });
  it("accepts percent_of and a divide-by-100 multiplier, and ignores a program that does not use the percentage", () => {
    const p = span(en, "150");
    const rate = span(en, "22.50");
    expect(phraseChecks(en, conversationSpans(en, "en"), program([{ id: "s1", op: "percent_of", args: [rate, p] }]))).toEqual([]);
    expect(phraseChecks(en, conversationSpans(en, "en"), program([{ id: "s1", op: "divide", args: [p, "const:100"] }, { id: "s2", op: "multiply", args: [rate, "s1"] }]))).toEqual([]);
    expect(phraseChecks(en, conversationSpans(en, "en"), program([{ id: "s1", op: "multiply", args: [rate, span(en, "42")] }]))).toEqual([]);
  });
  it("does not classify 'paid at 25% extra' as a multiplier", () => {
    const turns = ["Night hours are paid at 25% extra on 20.00 EUR. Rate per night hour?"];
    const p = span(turns, "25");
    const flags = phraseChecks(turns, conversationSpans(turns, "en"), program([{ id: "s1", op: "add_percent", args: [span(turns, "20.00"), p] }]));
    expect(flags).toEqual([]);
  });
});

describe("surcharge (plus X %, Zuschlag von X %)", () => {
  const en = ["The base fee is 300.00 EUR plus a 25% weekend surcharge. Total?"];
  const de = ["Grundgebühr 300,00 EUR, am Wochenende Zuschlag von 25 %. Gesamt?"];
  it("flags subtract_percent with the surcharge percentage, in both languages", () => {
    for (const turns of [en, de]) {
      const spans = conversationSpans(turns, "en");
      const flags = phraseChecks(turns, spans, program([{ id: "s1", op: "subtract_percent", args: [span(turns, turns === en ? "300.00" : "300,00"), span(turns, "25")] }]));
      expect(flags.map((f) => f.rule)).toEqual(["surcharge"]);
    }
  });
  it("accepts add_percent and base plus percent_of", () => {
    const spans = conversationSpans(en, "en");
    const base = span(en, "300.00");
    const p = span(en, "25");
    expect(phraseChecks(en, spans, program([{ id: "s1", op: "add_percent", args: [base, p] }]))).toEqual([]);
    expect(phraseChecks(en, spans, program([{ id: "s1", op: "percent_of", args: [base, p] }, { id: "s2", op: "add", args: [base, "s1"] }]))).toEqual([]);
  });
  it("does not treat 'plus 19% VAT' as a surcharge rule (VAT phrasing is left alone)", () => {
    const turns = ["Net 100.00 EUR plus 19% VAT. Gross?"];
    expect(phraseChecks(turns, conversationSpans(turns, "en"), program([{ id: "s1", op: "subtract_percent", args: [span(turns, "100.00"), span(turns, "19")] }]))).toEqual([]);
  });
});

describe("discount (X % off, X % Rabatt/Skonto)", () => {
  const en = ["A jacket at 189.90 EUR with 30% off. Price?"];
  const de = ["Rechnung 4.760,00 EUR brutto, 2 % Skonto bei Zahlung in 14 Tagen. Zahlbetrag?"];
  it("flags add_percent with the discount percentage, in both languages", () => {
    for (const [turns, base, p] of [[en, "189.90", "30"], [de, "4.760,00", "2"]] as const) {
      const flags = phraseChecks(turns, conversationSpans(turns, "en"), program([{ id: "s1", op: "add_percent", args: [span(turns, base), span(turns, p)] }]));
      expect(flags.map((f) => f.rule)).toEqual(["discount"]);
    }
  });
  it("accepts subtract_percent and base minus percent_of", () => {
    const spans = conversationSpans(de, "en");
    const base = span(de, "4.760,00");
    const p = span(de, "2");
    expect(phraseChecks(de, spans, program([{ id: "s1", op: "subtract_percent", args: [base, p] }]))).toEqual([]);
    expect(phraseChecks(de, spans, program([{ id: "s1", op: "percent_of", args: [base, p] }, { id: "s2", op: "subtract", args: [base, "s1"] }]))).toEqual([]);
  });
});

describe("included tax (inkl. X %, including X %)", () => {
  const en = ["A receipt shows 119.00 EUR including 19% VAT. Net and VAT?"];
  const de = ["Kassenbon: 47,60 EUR inkl. 19 % MwSt. Netto und MwSt?"];
  it("flags add_percent applied to the amount, in both languages", () => {
    for (const [turns, amount] of [[en, "119.00"], [de, "47,60"]] as const) {
      const flags = phraseChecks(turns, conversationSpans(turns, "en"), program([{ id: "s1", op: "add_percent", args: [span(turns, amount), span(turns, "19")] }, { id: "s2", op: "divide", args: [span(turns, amount), "s1"] }]));
      expect(flags.map((f) => f.rule)).toEqual(["included-tax"]);
    }
  });
  it("accepts dividing by add_percent(const:1, X) and percent_of on the net", () => {
    const spans = conversationSpans(en, "en");
    const amount = span(en, "119.00");
    const p = span(en, "19");
    expect(phraseChecks(en, spans, program([{ id: "s1", op: "add_percent", args: ["const:1", p] }, { id: "s2", op: "divide", args: [amount, "s1"] }, { id: "s3", op: "percent_of", args: ["s2", p] }]))).toEqual([]);
  });
});

describe("a percentage matched by two classes is not classified", () => {
  it("does nothing when the same percentage is both a surcharge and a discount phrase", () => {
    const turns = ["Plus 10% handling, then 10% off the total. Amount?"];
    const spans = conversationSpans(turns, "en");
    const p = spans.find((s) => s.unit === "%")!.id;
    expect(phraseChecks(turns, spans, program([{ id: "s1", op: "add_percent", args: ["const:100", p] }]))).toEqual([]);
    expect(phraseChecks(turns, spans, program([{ id: "s1", op: "subtract_percent", args: ["const:100", p] }]))).toEqual([]);
  });
  it("every rule has a language, a class, an example its own cue matches and a capturing group", () => {
    for (const rule of PHRASE_RULES) {
      const m = rule.cue.exec(rule.example);
      expect(m, rule.example).not.toBeNull();
      expect(m!.slice(1).find(Boolean), rule.example).toMatch(/^\d/);
    }
  });
});

describe("percentage change", () => {
  const de = ["Meine Nebenkosten sind von 210,00 EUR auf 255,00 EUR gestiegen. Um wie viel Prozent sind sie gestiegen?"];
  const en = ["My salary goes from 48,000.00 EUR to 51,600.00 EUR. By what percentage does it increase?"];
  const results = [{ ref: "s2", label: "increase", format: "percent" }];
  it("flags a ratio of new over old without a subtraction, in both languages", () => {
    for (const turns of [de, en]) {
      const flags = percentChangeCheck(turns, program([{ id: "s1", op: "ratio_percent", args: ["t1n2", "t1n1"] }, { id: "s2", op: "round", args: ["s1"], decimals: 2, mode: "half-up" }]), results);
      expect(flags.map((f) => f.rule)).toEqual(["percent-change"]);
      expect(flags[0].text).toMatch(/rule: percent change/);
      const multiply = percentChangeCheck(turns, program([{ id: "s1", op: "divide", args: ["t1n2", "t1n1"] }, { id: "s2", op: "multiply", args: ["s1", "const:100"] }]), results);
      expect(multiply).toHaveLength(1);
    }
  });
  it("accepts (new - old) / old x 100 in either spelling", () => {
    expect(percentChangeCheck(en, program([{ id: "s1", op: "subtract", args: ["t1n2", "t1n1"] }, { id: "s2", op: "ratio_percent", args: ["s1", "t1n1"] }]), results)).toEqual([]);
    expect(percentChangeCheck(en, program([{ id: "s1", op: "subtract", args: ["t1n2", "t1n1"] }, { id: "s2", op: "divide", args: ["s1", "t1n1"] }, { id: "s3", op: "multiply", args: ["s2", "const:100"] }]), [{ ref: "s3", label: "increase", format: "percent" }])).toEqual([]);
  });
  it("leaves share questions and non-percent results alone", () => {
    const share = ["Of 1,840 applicants, 1,564 passed. What percentage of the applicants passed?"];
    expect(percentChangeCheck(share, program([{ id: "s1", op: "ratio_percent", args: ["t1n2", "t1n1"] }]), [{ ref: "s1", label: "passed", format: "percent" }])).toEqual([]);
    expect(percentChangeCheck(en, program([{ id: "s1", op: "ratio_percent", args: ["t1n2", "t1n1"] }]), [{ ref: "s1", label: "x", format: "money" }])).toEqual([]);
    const both = ["By what percentage did sales rise, and what share of the total is online?"];
    expect(percentChangeCheck(both, program([{ id: "s1", op: "ratio_percent", args: ["t1n2", "t1n1"] }]), [{ ref: "s1", label: "x", format: "percent" }])).toEqual([]);
  });
  it("combines with the phrase checks", () => {
    const flags = methodChecks(en, conversationSpans(en, "en"), program([{ id: "s1", op: "ratio_percent", args: ["t1n2", "t1n1"] }]), [{ ref: "s1", label: "increase", format: "percent" }]);
    expect(flags.map((f) => f.rule)).toEqual(["percent-change"]);
  });
});
