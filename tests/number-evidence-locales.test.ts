import { describe, expect, it } from "vitest";
import {
  canonicalNumberForms,
  evidenceNumberTokens,
  quoteNumberLocale,
} from "../src/number-evidence";
import { renderCheckedResponse } from "../src/checked-response";
import { emptyConversation } from "../shared/contracts";

describe("operands written in German or English number formats (calculator fix, 23 October)", () => {
  it("reads unambiguous mixed separators either way round", () => {
    expect(canonicalNumberForms("1.234,56", undefined)).toEqual(["1234.56"]);
    expect(canonicalNumberForms("1,234.56", undefined)).toEqual(["1234.56"]);
    expect(canonicalNumberForms("12.345.678,90", undefined)).toEqual([
      "12345678.90",
    ]);
    expect(canonicalNumberForms("-1.234,5", undefined)).toEqual(["-1234.5"]);
    expect(canonicalNumberForms("1.23,45", undefined)).toEqual([]);
  });
  it("reads a lone separator with one or two decimals as a decimal mark", () => {
    expect(canonicalNumberForms("86,40", undefined)).toEqual(["86.40"]);
    expect(canonicalNumberForms("86.40", undefined)).toEqual(["86.40"]);
    expect(canonicalNumberForms("0,5", "en")).toEqual(["0.5"]);
    expect(canonicalNumberForms("120", undefined)).toEqual(["120"]);
    expect(canonicalNumberForms("1.234.567", undefined)).toEqual(["1234567"]);
    expect(canonicalNumberForms("1,234,567", undefined)).toEqual(["1234567"]);
  });
  it("resolves 1.234 and 1,234 by the quote's own locale, or offers both readings", () => {
    expect(canonicalNumberForms("1.234", "de")).toEqual(["1234"]);
    expect(canonicalNumberForms("1.234", "en")).toEqual(["1.234"]);
    expect(canonicalNumberForms("1,234", "de")).toEqual(["1.234"]);
    expect(canonicalNumberForms("1,234", "en")).toEqual(["1234"]);
    expect(canonicalNumberForms("1.234", undefined)).toEqual(["1.234", "1234"]);
  });
  it("judges the locale from the quote", () => {
    expect(
      quoteNumberLocale("Netto 1.234 EUR, USt 19 %, Brutto 1.468,46 EUR"),
    ).toBe("de");
    expect(
      quoteNumberLocale("Net 1,234 EUR, VAT 19%, gross 1,468.46 EUR"),
    ).toBe("en");
    expect(quoteNumberLocale("Total 1.234")).toBeUndefined();
  });
  it("keeps the written tokens and adds canonical forms, joining narrow-space grouping", () => {
    const tokens = evidenceNumberTokens(
      "Netto 1.234,56 EUR und 1 000 Stück zu 86,40",
    );
    expect(tokens).toContain("1.234,56");
    expect(tokens).toContain("1234.56");
    expect(tokens).toContain("1000");
    expect(tokens).toContain("86.40");
  });
  it("still refuses a value the quote does not contain in any reading", () => {
    expect(evidenceNumberTokens("Netto 1.234,56 EUR")).not.toContain("1234.57");
    expect(evidenceNumberTokens("Net 120.00 EUR")).not.toContain("1.19");
  });
});

describe("checked response accepts canonical operands and allowed constants", () => {
  const source = {
    id: "gate-source",
    title: "Synthetic",
    text: "Netto 1.234,56 EUR, USt 19 %.",
  };
  const program = (
    value: string,
    rate: { value: string; constant?: boolean },
  ) => ({
    inputs: [
      {
        id: "net",
        value,
        evidence: { kind: "source", sourceId: source.id, quote: source.text },
      },
      rate.constant
        ? { id: "rate", value: rate.value, evidence: { kind: "constant" } }
        : {
            id: "rate",
            value: rate.value,
            evidence: {
              kind: "source",
              sourceId: source.id,
              quote: source.text,
            },
          },
    ],
    steps: [{ id: "vat", op: "percentOf", left: "net", right: "rate" }],
    results: [{ id: "vat", decimals: 2 }],
    passages: [],
    limitation: "none",
  });
  const render = (p: unknown) =>
    renderCheckedResponse(
      JSON.stringify(p),
      [source as never],
      emptyConversation(),
      "result",
    );
  it("computes VAT on a German-format net amount", () => {
    expect(render(program("1234.56", { value: "19" }))).toBe("234.57");
  });
  it("accepts an allowed constant without a quotation and refuses any other number as a constant", () => {
    expect(render(program("1234.56", { value: "100", constant: true }))).toBe(
      "1234.56",
    );
    expect(() =>
      render(program("1234.56", { value: "1.19", constant: true })),
    ).toThrow();
    expect(() =>
      render(program("1234.56", { value: "19", constant: true })),
    ).toThrow();
  });
  it("accepts an operand equal in value to a written number with trailing zeros", () => {
    const rent = {
      id: "rent-source",
      title: "Synthetic",
      text: "Miete 850,00 EUR, neu 901,00 EUR.",
    };
    const p = {
      inputs: [
        {
          id: "old",
          value: "850",
          evidence: { kind: "source", sourceId: rent.id, quote: rent.text },
        },
        {
          id: "new",
          value: "901",
          evidence: { kind: "source", sourceId: rent.id, quote: rent.text },
        },
      ],
      steps: [
        { id: "diff", op: "subtract", left: "new", right: "old" },
        { id: "pct", op: "ratioPercent", left: "diff", right: "old" },
      ],
      results: [{ id: "pct", decimals: 2 }],
      passages: [],
      limitation: "none",
    };
    expect(
      renderCheckedResponse(
        JSON.stringify(p),
        [rent as never],
        emptyConversation(),
        "result",
      ),
    ).toBe("6.00");
  });
  it("still refuses an operand absent from the evidence", () => {
    expect(() => render(program("1234.57", { value: "19" }))).toThrow();
  });
});
