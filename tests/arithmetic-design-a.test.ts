import { describe, expect, it } from "vitest";
import {
  DesignAError,
  designASchema,
  designAInstruction,
  designAUserMessage,
  ledgerCheck,
  renderDesignA,
} from "../src/arithmetic/design-a";
import { annotateTurn, conversationSpans, daysToIso, isoToDays, turnSpans } from "../src/arithmetic/spans";
import { scoreTurn } from "../evaluation/arithmetic-gate/scorer";

// Design A (arithmetic v2, 23 October 2026): span ids assigned by our code,
// a program over ids and constants, all computation here, the answer
// rendered only from computed values, every shown number in the ledger.

const de1 = "Ich schreibe eine Rechnung über netto 1.234,56 EUR. Bitte berechne die Umsatzsteuer mit 19 % und den Bruttobetrag, jeweils kaufmännisch auf Cent gerundet.";
const de2 = "Korrektur: Der Nettobetrag ist 1.243,56 EUR, nicht 1.234,56 EUR. Bitte Umsatzsteuer und Brutto neu berechnen.";

const fails = (raw: string, spans = turnSpans(de1, 1, "de")) => {
  try {
    renderDesignA(raw, spans, "de");
  } catch (error) {
    if (error instanceof DesignAError) return error.code;
    throw error;
  }
  return undefined;
};

describe("span ids", () => {
  it("numbers every quantity in text order with its canonical value", () => {
    const spans = turnSpans(de1, 1, "de");
    expect(spans.map((s) => [s.id, s.text, s.value, s.unit, s.ambiguous])).toEqual([
      ["t1n1", "1.234,56", "1234.56", "EUR", false],
      ["t1n2", "19", "19", "%", false],
    ]);
    expect(annotateTurn(de1, spans, 1)).toContain("netto [t1n1: 1.234,56] EUR");
    expect(annotateTurn(de1, spans, 1)).toContain("mit [t1n2: 19] %");
  });
  it("keeps ids stable across turns", () => {
    const spans = conversationSpans([de1, de2], "de");
    expect(spans.map((s) => s.id)).toEqual(["t1n1", "t1n2", "t2n1", "t2n2"]);
    expect(spans[2]).toMatchObject({ turn: 2, value: "1243.56" });
  });
  it("reads clock times, durations and dates as minutes and day numbers", () => {
    const spans = turnSpans("My train leaves at 10:12. The walk takes 23 minutes; be there 6 minutes before. First payment 31 January 2028, then every 30 days.", 1, "en");
    expect(spans.map((s) => [s.kind, s.value])).toEqual([
      ["time", "612"],
      ["duration", "23"],
      ["duration", "6"],
      ["date", String(isoToDays("2028-01-31"))],
      ["number", "30"],
    ]);
    expect(daysToIso(isoToDays("2028-01-31") + 30)).toBe("2028-03-01");
  });
  it("marks an ambiguous token only when the text gives no clue", () => {
    const bare = turnSpans("Total 1.234", 1, "en");
    expect(bare[0]).toMatchObject({ value: "1.234", alt: "1234", ambiguous: true });
    const clued = turnSpans("Netto 1.234 EUR, USt 19 %, Betrag brutto bitte", 1, "en");
    expect(clued[0]).toMatchObject({ value: "1234", ambiguous: false });
    const slash = turnSpans("Due on 03/04/2026.", 1, "en");
    expect(slash[0]).toMatchObject({ kind: "date", ambiguous: true });
  });
  it("gives a day-month without a year the year of a dated span and marks it", () => {
    const spans = turnSpans("A fee covers 1 October to 31 December 2026, which is 92 days.", 1, "en");
    const partial = spans.find((s) => s.text.startsWith("1 October"));
    expect(partial).toMatchObject({ kind: "date", ambiguous: true, value: String(isoToDays("2026-10-01")) });
    expect(spans.find((s) => s.text === "31 December 2026")).toMatchObject({ ambiguous: false });
  });
});

describe("the schema and the prompt", () => {
  it("restricts every reference to the spans, the constants and step ids", () => {
    const spans = turnSpans(de1, 1, "de");
    const schema = designASchema(spans);
    const refs = schema.properties.steps.items.properties.args.items.enum;
    expect(refs).toContain("t1n1");
    expect(refs).toContain("const:100");
    expect(refs).toContain("s24");
    expect(refs).not.toContain("s25");
    expect(schema.properties.results.items.properties.ref.enum).toEqual(refs);
    expect(schema.additionalProperties).toBe(false);
  });
  it("never uses the bare word verified", () => {
    expect(designAInstruction()).not.toMatch(/\bverified\b/i);
    expect(designAUserMessage("x", 1, [])).not.toMatch(/\bverified\b/i);
  });
});

describe("rendering from computed values only", () => {
  const vat = JSON.stringify({
    steps: [
      { id: "s1", op: "percent_of", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" },
      { id: "s2", op: "round", args: ["s1"], decimals: 2, mode: "half-up" },
      { id: "s3", op: "add", args: ["t1n1", "s2"], decimals: 0, mode: "none" },
    ],
    results: [
      { ref: "s2", label: "Umsatzsteuer", format: "money", unit: "EUR", decimals: 2, claimed: "234.57" },
      { ref: "s3", label: "Bruttobetrag", format: "money", unit: "EUR", decimals: 2, claimed: "" },
    ],
    note: "Umsatzsteuer als Prozentsatz vom Netto, kaufmännisch gerundet, plus Netto.",
    limitation: "none",
  });
  it("computes VAT and gross, states each number's state, and passes the gate scorer", () => {
    const spans = turnSpans(de1, 1, "de");
    const out = renderDesignA(vat, spans, "de");
    expect(out.results.map((r) => [r.shown, r.state])).toEqual([
      ["234,57 EUR", "recomputed and matches"],
      ["1469,13 EUR", "calculated"],
    ]);
    expect(out.flags).toEqual([]);
    expect(out.answer).not.toMatch(/\bverified\b/i);
    const score = scoreTurn(
      out.answer,
      [
        { label: "Umsatzsteuer", kind: "money", value: "234.57", currency: "EUR", rounding: { decimals: 2 }, derivation: "" },
        { label: "Brutto", kind: "money", value: "1469.13", currency: "EUR", rounding: { decimals: 2 }, derivation: "" },
      ],
      [],
      "de",
    );
    expect(score.pass).toBe(true);
  });
  it("flags a model estimate that differs, and still shows the calculated value", () => {
    const spans = turnSpans(de1, 1, "de");
    const out = renderDesignA(vat.replace('"claimed":"234.57"', '"claimed":"254.75"'), spans, "de");
    expect(out.results[0]).toMatchObject({ shown: "234,57 EUR", state: "calculated", claimDiffered: true });
    expect(out.flags).toHaveLength(1);
    expect(out.answer).toContain("Please check");
    expect(out.answer).not.toContain("254,75");
  });
  it("flags an ambiguous span that was used", () => {
    const spans = turnSpans("Total 1.234 and 19 percent", 1, "en");
    const out = renderDesignA(
      JSON.stringify({
        steps: [{ id: "s1", op: "percent_of", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" }],
        results: [{ ref: "s1", label: "VAT", format: "money", unit: "EUR", decimals: 2, claimed: "" }],
        note: "",
        limitation: "none",
      }),
      spans,
      "en",
    );
    expect(out.flags[0]).toMatch(/could also mean 1234/);
  });
  it("marks numbers in the model's note that we did not calculate", () => {
    const spans = turnSpans(de1, 1, "de");
    const out = renderDesignA(vat.replace("plus Netto.", "plus Netto, also etwa 1.500 EUR."), spans, "de");
    expect(out.answer).toContain("1.500 [not checked by us]");
    expect(out.flags[0]).toMatch(/did not calculate/);
  });
  it("renders clock, date, minutes, days and percent formats", () => {
    const text = "Train at 10:12, walk 23 minutes, 6 minutes early. First payment 31 January 2028, then every 30 days. Fee 1,092.00 EUR for 92 days; 61 billable. Rent up from 850.00 EUR to 909.50 EUR.";
    const spans = turnSpans(text, 1, "en");
    const id = (t: string) => spans.find((s) => s.text === t)!.id;
    const out = renderDesignA(
      JSON.stringify({
        steps: [
          { id: "s1", op: "subtract", args: [id("10:12"), id("23 minutes")], decimals: 0, mode: "none" },
          { id: "s2", op: "subtract", args: ["s1", id("6 minutes")], decimals: 0, mode: "none" },
          { id: "s3", op: "add", args: [id("31 January 2028"), id("30")], decimals: 0, mode: "none" },
          { id: "s4", op: "add", args: [id("23 minutes"), id("6 minutes")], decimals: 0, mode: "none" },
          { id: "s5", op: "divide", args: [id("1,092.00"), id("92")], decimals: 0, mode: "none" },
          { id: "s6", op: "multiply", args: ["s5", id("61")], decimals: 0, mode: "none" },
          { id: "s7", op: "round", args: ["s6"], decimals: 2, mode: "half-up" },
          { id: "s8", op: "subtract", args: [id("909.50"), id("850.00")], decimals: 0, mode: "none" },
          { id: "s9", op: "ratio_percent", args: ["s8", id("850.00")], decimals: 0, mode: "none" },
        ],
        results: [
          { ref: "s2", label: "leave by", format: "clock", unit: "", decimals: 0, claimed: "" },
          { ref: "s3", label: "second payment", format: "date", unit: "", decimals: 0, claimed: "" },
          { ref: "s4", label: "walk and buffer", format: "minutes", unit: "", decimals: 0, claimed: "29" },
          { ref: id("61"), label: "billable days", format: "days", unit: "", decimals: 0, claimed: "" },
          { ref: "s7", label: "fee", format: "money", unit: "EUR", decimals: 2, claimed: "724.04" },
          { ref: "s9", label: "increase", format: "percent", unit: "", decimals: 0, claimed: "7" },
        ],
        note: "",
        limitation: "none",
      }),
      spans,
      "en",
    );
    expect(out.results.map((r) => r.shown)).toEqual(["09:43", "1 March 2028 (2028-03-01)", "29 min", "61 days", "724.04 EUR", "7%"]);
    expect(out.flags).toEqual([]);
    const score = scoreTurn(
      out.answer,
      [
        { label: "leave", kind: "time", value: "09:43", derivation: "" },
        { label: "second", kind: "date", value: "2028-03-01", derivation: "" },
        { label: "days", kind: "number", value: "61", unit: "days", derivation: "" },
        { label: "fee", kind: "money", value: "724.04", currency: "EUR", derivation: "" },
        { label: "increase", kind: "percent", value: "7", derivation: "" },
      ],
      [],
      "en",
    );
    expect(score.required.filter((r) => !r.matched)).toEqual([]);
  });
});

describe("refusals", () => {
  it("names each failure", () => {
    const base = { steps: [{ id: "s1", op: "add", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" }], results: [{ ref: "s1", label: "x", format: "money", unit: "EUR", decimals: 2, claimed: "" }], note: "", limitation: "none" };
    const json = (patch: Record<string, unknown>) => JSON.stringify({ ...base, ...patch });
    expect(fails("{")).toBe("INVALID_JSON");
    expect(fails(json({ steps: [{ id: "s1", op: "times", args: ["t1n1", "t1n2"] }] }))).toBe("INVALID_SCHEMA");
    expect(fails(json({ steps: [{ id: "s1", op: "add", args: ["t1n1", "1.07"], decimals: 0, mode: "none" }] }))).toBe("INVALID_SCHEMA");
    expect(fails(json({ steps: [{ id: "s1", op: "add", args: ["t1n1", "t1n9"], decimals: 0, mode: "none" }] }))).toBe("UNKNOWN_REFERENCE");
    expect(fails(json({ steps: [{ id: "s1", op: "add", args: ["t1n1", "const:19"], decimals: 0, mode: "none" }] }))).toBe("UNKNOWN_REFERENCE");
    expect(fails(json({ steps: [{ id: "s1", op: "add", args: ["t1n1", "s2"], decimals: 0, mode: "none" }, { id: "s2", op: "add", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" }] }))).toBe("FORWARD_REFERENCE");
    expect(fails(json({ steps: [{ id: "s1", op: "divide", args: ["t1n1", "t1n1"], decimals: 0, mode: "none" }, { id: "s2", op: "subtract", args: ["s1", "s1"], decimals: 0, mode: "none" }, { id: "s3", op: "divide", args: ["t1n1", "s2"], decimals: 0, mode: "none" }], results: [{ ref: "s3", label: "x", format: "money", unit: "EUR", decimals: 2, claimed: "" }] }))).toBe("EVALUATION");
    expect(fails(json({ results: [{ ref: "s1", label: "x", format: "clock", unit: "", decimals: 0, claimed: "" }] }))).toBe("RESULT_FORMAT");
    expect(fails(json({ limitation: "cannot_answer", results: [] }))).toBe("CANNOT_ANSWER");
    expect(fails(json({ results: [] }))).toBe("EMPTY");
  });
});

describe("value types: dates and clock times keep their format", () => {
  const text = "Die Rechnung ist vom 14.08.2026 und zahlbar innerhalb von 30 Tagen. Zug um 08:05 Uhr, Weg 25 Minuten.";
  const spans = turnSpans(text, 1, "de");
  const program = (steps: unknown[], results: unknown[]) => JSON.stringify({ steps, results, note: "", limitation: "none" });
  it("refuses a date shown as days or a plain number shown as a date", () => {
    expect(fails(program([{ id: "s1", op: "add", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "Fälligkeit", format: "days", unit: "", decimals: 0, claimed: "20724" }]), spans)).toBe("RESULT_FORMAT");
    expect(fails(program([{ id: "s1", op: "add", args: ["t1n2", "t1n4"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "date", unit: "", decimals: 0, claimed: "1" }]), spans)).toBe("RESULT_FORMAT");
    expect(fails(program([{ id: "s1", op: "subtract", args: ["t1n3", "t1n4"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "minutes", unit: "", decimals: 0, claimed: "1" }]), spans)).toBe("RESULT_FORMAT");
  });
  it("refuses arithmetic that makes no sense on a date or clock time", () => {
    expect(fails(program([{ id: "s1", op: "multiply", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "number", unit: "", decimals: 0, claimed: "1" }]), spans)).toBe("EVALUATION");
    expect(fails(program([{ id: "s1", op: "add", args: ["t1n1", "t1n3"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "date", unit: "", decimals: 0, claimed: "1" }]), spans)).toBe("EVALUATION");
    expect(fails(program([{ id: "s1", op: "subtract", args: ["t1n2", "t1n1"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "number", unit: "", decimals: 0, claimed: "1" }]), spans)).toBe("EVALUATION");
  });
  it("renders a date plus days as a date and a clock time minus minutes as a clock time", () => {
    const out = renderDesignA(
      program(
        [
          { id: "s1", op: "add", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" },
          { id: "s2", op: "subtract", args: ["t1n3", "t1n4"], decimals: 0, mode: "none" },
        ],
        [
          { ref: "s1", label: "Fälligkeit", format: "date", unit: "", decimals: 0, claimed: String(isoToDays("2026-09-13")) },
          { ref: "s2", label: "spätestens los", format: "clock", unit: "", decimals: 0, claimed: "460" },
        ],
      ),
      spans,
      "de",
    );
    expect(out.results.map((r) => [r.shown, r.state])).toEqual([
      ["13. September 2026 (2026-09-13)", "recomputed and matches"],
      ["07:40", "recomputed and matches"],
    ]);
    expect(out.flags).toEqual([]);
  });
  it("flags a junk estimate as not cross-checked, without inventing a difference", () => {
    const out = renderDesignA(
      program([{ id: "s1", op: "add", args: ["t1n2", "t1n4"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "number", unit: "", decimals: 0, claimed: "ref s1" }]),
      spans,
      "de",
    );
    expect(out.results[0]).toMatchObject({ state: "calculated", claim: "unusable" });
    expect(out.results[0].claimDiffered).toBeUndefined();
    expect(out.flags).toEqual(["x: the model gave no usable estimate of its own, so this figure was not cross-checked"]);
  });
  it("refuses a currency unit on a minutes, clock, date or percent result", () => {
    expect(fails(program([{ id: "s1", op: "add", args: ["t1n2", "t1n4"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "minutes", unit: "EUR", decimals: 0, claimed: "55" }]), spans)).toBe("RESULT_FORMAT");
    expect(fails(program([{ id: "s1", op: "add", args: ["t1n2", "t1n4"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "percent", unit: "CHF", decimals: 0, claimed: "55" }]), spans)).toBe("RESULT_FORMAT");
  });
  it("accepts a clock estimate written HH:MM and a date estimate written as ISO", () => {
    const out = renderDesignA(
      program(
        [
          { id: "s1", op: "add", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" },
          { id: "s2", op: "subtract", args: ["t1n3", "t1n4"], decimals: 0, mode: "none" },
        ],
        [
          { ref: "s1", label: "Fälligkeit", format: "date", unit: "", decimals: 0, claimed: "2026-09-13" },
          { ref: "s2", label: "los", format: "clock", unit: "", decimals: 0, claimed: "7:40" },
        ],
      ),
      spans,
      "de",
    );
    expect(out.results.map((r) => r.claim)).toEqual(["matches", "matches"]);
  });
  it("counts an estimate within one percent as consistent and flags one further away", () => {
    const run = (claimed: string) =>
      renderDesignA(
        program([{ id: "s1", op: "multiply", args: ["t1n2", "t1n4"], decimals: 0, mode: "none" }], [{ ref: "s1", label: "x", format: "number", unit: "", decimals: 2, claimed }]),
        spans,
        "de",
      );
    expect(run("750").results[0]).toMatchObject({ state: "recomputed and matches", claim: "matches" });
    expect(run("745").results[0]).toMatchObject({ state: "calculated", claim: "close" });
    expect(run("745").flags).toEqual([]);
    expect(run("700").results[0]).toMatchObject({ state: "calculated", claim: "differs", claimDiffered: true });
    expect(run("700").flags).toHaveLength(1);
  });
});

describe("shape rules from the dev batches (general classes, no invented values)", () => {
  const spans = turnSpans(de1, 1, "de");
  it("ignores redundant constant args on a round step but not a span or step arg", () => {
    const out = renderDesignA(
      JSON.stringify({
        steps: [
          { id: "s1", op: "percent_of", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" },
          { id: "s2", op: "round", args: ["s1", "const:2", "const:1"], decimals: 2, mode: "half-up" },
        ],
        results: [{ ref: "s2", label: "USt", format: "money", unit: "EUR", decimals: 2, claimed: "234.57" }],
        note: "",
        limitation: "none",
      }),
      spans,
      "de",
    );
    expect(out.results[0].shown).toBe("234,57 EUR");
    expect(fails(JSON.stringify({ steps: [{ id: "s1", op: "round", args: ["t1n1", "t1n2"], decimals: 2, mode: "half-up" }], results: [{ ref: "s1", label: "x", format: "money", unit: "EUR", decimals: 2, claimed: "1" }], note: "", limitation: "none" }))).toBe("EVALUATION");
  });
  it("reads a reused step id as a chain: later references mean the latest definition", () => {
    const out = renderDesignA(
      JSON.stringify({
        steps: [
          { id: "s1", op: "percent_of", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" },
          { id: "s1", op: "round", args: ["s1"], decimals: 2, mode: "half-up" },
          { id: "s2", op: "add", args: ["t1n1", "s1"], decimals: 0, mode: "none" },
        ],
        results: [
          { ref: "s1", label: "USt", format: "money", unit: "EUR", decimals: 2, claimed: "234.57" },
          { ref: "s2", label: "Brutto", format: "money", unit: "EUR", decimals: 2, claimed: "1469.13" },
        ],
        note: "",
        limitation: "none",
      }),
      spans,
      "de",
    );
    expect(out.results.map((r) => [r.shown, r.state])).toEqual([
      ["234,57 EUR", "recomputed and matches"],
      ["1469,13 EUR", "recomputed and matches"],
    ]);
    expect(out.program.steps.map((s) => s.id)).toEqual(["s1", "s1_2", "s2"]);
  });
});

describe("ledger check", () => {
  it("accepts numbers in the ledger under either reading and reports the rest", () => {
    expect(ledgerCheck("Total 1.234,56 EUR and 19 % make 234,57", ["1234.56", "19", "234.57"], "de")).toEqual([]);
    expect(ledgerCheck("About 1.500 EUR at 09:43", ["1234.56", "600"], "de")).toEqual(["1.500", "09:43"]);
    expect(ledgerCheck("Leave at 09:43", ["583"], "en")).toEqual([]);
  });
});
