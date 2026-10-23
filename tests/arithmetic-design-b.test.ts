import { describe, expect, it } from "vitest";
import { DesignAError, extractDesignA } from "../src/arithmetic/design-a";
import { designBInstruction, designBSchema, designBUserMessage, extractDesignB, renderDesignB } from "../src/arithmetic/design-b";
import { turnSpans } from "../src/arithmetic/spans";
import { scoreTurn } from "../evaluation/arithmetic-gate/scorer";

// Design B: the cross-check is a second independent extraction; the shown
// figure is always call 1's; method checks run on call 1's program.

const de1 = "Ich schreibe eine Rechnung über netto 1.234,56 EUR. Bitte berechne die Umsatzsteuer mit 19 % und den Bruttobetrag, jeweils kaufmännisch auf Cent gerundet.";
const spans = turnSpans(de1, 1, "de");

const callA = JSON.stringify({
  steps: [
    { id: "s1", op: "percent_of", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" },
    { id: "s2", op: "round", args: ["s1"], decimals: 2, mode: "half-up" },
    { id: "s3", op: "add", args: ["t1n1", "s2"], decimals: 0, mode: "none" },
  ],
  results: [
    { ref: "s2", label: "Umsatzsteuer", format: "money", unit: "EUR", decimals: 2, claimed: "" },
    { ref: "s3", label: "Bruttobetrag", format: "money", unit: "EUR", decimals: 2, claimed: "" },
  ],
  note: "",
  limitation: "none",
});
const chain = (formulas: unknown[]) => JSON.stringify({ formulas, limitation: "none" });
const callB = chain([
  { label: "USt", format: "money", unit: "EUR", decimals: 2, start: "t1n1", ops: [{ op: "percent_of", arg: "t1n2", decimals: 0, mode: "none" }, { op: "round", arg: "none", decimals: 2, mode: "half-up" }] },
  { label: "Brutto", format: "money", unit: "EUR", decimals: 2, start: "t1n1", ops: [{ op: "add_percent", arg: "t1n2", decimals: 0, mode: "none" }] },
]);

const fails = (raw: string) => {
  try {
    extractDesignB(raw, spans);
  } catch (error) {
    if (error instanceof DesignAError) return error.code;
    throw error;
  }
  return undefined;
};

describe("call 2: chains over span ids", () => {
  it("evaluates each chain and exposes the figures to show", () => {
    const b = extractDesignB(callB, spans);
    expect(b.figures.map((f) => [f.label, f.value.toString(), f.places])).toEqual([
      ["USt", "234.57", 2],
      ["Brutto", "1469.1264", 2],
    ]);
    expect(b.program.steps.map((s) => s.id)).toEqual(["f1_1", "f1_2", "f2_1"]);
  });
  it("lets a later chain start from an earlier one and hides helpers", () => {
    const b = extractDesignB(
      chain([
        { label: "Faktor", format: "helper", unit: "", decimals: 0, start: "const:1", ops: [{ op: "add_percent", arg: "t1n2", decimals: 0, mode: "none" }] },
        { label: "Brutto", format: "money", unit: "EUR", decimals: 2, start: "t1n1", ops: [{ op: "multiply", arg: "f1", decimals: 0, mode: "none" }] },
      ]),
      spans,
    );
    expect(b.figures.map((f) => f.label)).toEqual(["Brutto"]);
    expect(b.figures[0].value.toFixed(2)).toBe("1469.13");
  });
  it("refuses forward references, unknown ids, missing args and type mismatches", () => {
    expect(fails(chain([{ label: "x", format: "money", unit: "", decimals: 2, start: "f2", ops: [] }, { label: "y", format: "money", unit: "", decimals: 2, start: "t1n1", ops: [] }]))).toBe("FORWARD_REFERENCE");
    expect(fails(chain([{ label: "x", format: "money", unit: "", decimals: 2, start: "t1n9", ops: [] }]))).toBe("UNKNOWN_REFERENCE");
    expect(fails(chain([{ label: "x", format: "money", unit: "", decimals: 2, start: "t1n1", ops: [{ op: "add", arg: "none", decimals: 0, mode: "none" }] }]))).toBe("INVALID_SCHEMA");
    expect(fails(chain([{ label: "x", format: "clock", unit: "", decimals: 0, start: "t1n1", ops: [] }]))).toBe("RESULT_FORMAT");
    expect(fails(chain([{ label: "x", format: "helper", unit: "", decimals: 0, start: "t1n1", ops: [] }]))).toBe("EMPTY");
    expect(fails(JSON.stringify({ formulas: [], limitation: "cannot_answer" }))).toBe("CANNOT_ANSWER");
    expect(fails("{")).toBe("INVALID_JSON");
  });
  it("has its own schema shape, instruction and prompt without the word verified", () => {
    const schema = designBSchema(spans);
    expect(schema.properties.formulas.items.properties.start.enum).toContain("f8");
    expect(schema.properties.formulas.items.properties.start.enum).not.toContain("s1");
    expect(designBInstruction()).not.toMatch(/\bverified\b/i);
    expect(designBInstruction()).toMatch(/second reader/);
    expect(designBUserMessage("x", 2, spans, "- t1n1")).not.toMatch(/\bverified\b/i);
  });
});

describe("cross-check and rendering", () => {
  const a = extractDesignA(callA, spans, "de");
  it("marks a figure recomputed and matches when the second reading agrees at the figure's rounding", () => {
    const out = renderDesignB(a, extractDesignB(callB, spans), [de1], spans, "de");
    expect(out.results.map((r) => [r.shown, r.state, r.crossCheck])).toEqual([
      ["234,57 EUR", "recomputed and matches", "matches"],
      ["1469,13 EUR", "recomputed and matches", "matches"],
    ]);
    expect(out.flags).toEqual([]);
    expect(out.flagClasses).toEqual([]);
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
  it("flags differing readings, shows call 1's figure as not cross-checked, never the second reading's figure", () => {
    const wrongB = chain([{ label: "USt", format: "money", unit: "EUR", decimals: 2, start: "t1n1", ops: [{ op: "add_percent", arg: "t1n2", decimals: 0, mode: "none" }] }]);
    const out = renderDesignB(a, extractDesignB(wrongB, spans), [de1], spans, "de");
    expect(out.results.map((r) => [r.shown, r.state, r.crossCheck])).toEqual([
      ["234,57 EUR", "not cross-checked", "differs"],
      ["1469,13 EUR", "recomputed and matches", "matches"],
    ]);
    expect(out.flags[0]).toMatch(/two independent readings of this question gave different figures for Umsatzsteuer/);
    expect(out.flagClasses).toEqual(["cross-check-differs"]);
  });
  it("marks every figure not cross-checked, with a flag, when the second reading is unavailable", () => {
    const out = renderDesignB(a, undefined, [de1], spans, "de");
    expect(out.results.every((r) => r.state === "not cross-checked" && r.crossCheck === "unavailable")).toBe(true);
    expect(out.flagClasses).toEqual(["cross-check-unavailable"]);
    expect(out.answer).toContain("not cross-checked");
  });
  it("adds method flags from the rules and keeps the ambiguity flag", () => {
    const text = "My salary goes from 48,000.00 EUR to 51,600.00 EUR. By what percentage does it increase?";
    const s = turnSpans(text, 1, "en");
    const wrongA = extractDesignA(
      JSON.stringify({
        steps: [{ id: "s1", op: "ratio_percent", args: ["t1n2", "t1n1"], decimals: 0, mode: "none" }],
        results: [{ ref: "s1", label: "increase", format: "percent", unit: "", decimals: 2, claimed: "" }],
        note: "",
        limitation: "none",
      }),
      s,
      "en",
    );
    const sameB = extractDesignB(chain([{ label: "increase", format: "percent", unit: "", decimals: 2, start: "t1n2", ops: [{ op: "ratio_percent", arg: "t1n1", decimals: 0, mode: "none" }] }]), s);
    const out = renderDesignB(wrongA, sameB, [text], s, "en");
    expect(out.results[0]).toMatchObject({ shown: "107.50%", crossCheck: "matches" });
    expect(out.flagClasses).toEqual(["method"]);
    expect(out.methodFlags[0].rule).toBe("percent-change");
    const amb = turnSpans("Total 1.234 and 19 percent", 1, "en");
    const ambA = extractDesignA(JSON.stringify({ steps: [{ id: "s1", op: "percent_of", args: ["t1n1", "t1n2"], decimals: 0, mode: "none" }], results: [{ ref: "s1", label: "VAT", format: "money", unit: "EUR", decimals: 2, claimed: "" }], note: "", limitation: "none" }), amb, "en");
    const ambOut = renderDesignB(ambA, undefined, ["Total 1.234 and 19 percent"], amb, "en");
    expect(ambOut.flagClasses).toEqual(["cross-check-unavailable", "ambiguity"]);
  });
});
