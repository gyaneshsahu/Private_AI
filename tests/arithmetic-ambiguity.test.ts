import { describe, expect, it } from "vitest";
import { ambiguousReading } from "../src/number-evidence";
import { renderCalculatorTurn } from "../src/calculator-turn";
import { postcheck } from "../src/arithmetic/postcheck";
import {
  AMBIGUOUS_NUMBER_WARNING,
  checkArithmetic,
} from "../src/arithmetic/check";

// Owner rule, 23 October 2026: when the locale is unknown and a number could
// be read two ways, the user sees a question or flag, never a silent guess.

describe("ambiguous separators are visible, never a silent guess", () => {
  it("names the reading the calculator used and the other one when the quotation gives no clue", () => {
    expect(ambiguousReading("Total 1.234", "1234")).toEqual({
      written: "1.234",
      readAs: "1234",
      otherReading: "1.234",
    });
    expect(ambiguousReading("Total 1,234", "1.234")).toEqual({
      written: "1,234",
      readAs: "1.234",
      otherReading: "1234",
    });
  });
  it("stays silent when the quotation itself fixes the locale or the number is unambiguous", () => {
    expect(
      ambiguousReading("Netto 1.234 EUR, USt 19 %", "1234"),
    ).toBeUndefined();
    expect(ambiguousReading("Net 1,234.56 EUR", "1234.56")).toBeUndefined();
    expect(ambiguousReading("Total 1.234", "999")).toBeUndefined();
  });
  it("renders the note under a calculated result", () => {
    const text = renderCalculatorTurn({
      text: "",
      usage: { input: 1, output: 1, total: 2, estimatedUSD: 0 },
      calculation: {
        id: "total",
        value: "1234.00",
        unit: "EUR",
        references: ["user:1"],
      },
      ambiguities: ['"1.234" was read as 1234; if you meant 1.234, say so.'],
    });
    expect(text).toContain("**Please check the numbers:**");
    expect(text).toContain('"1.234" was read as 1234');
  });
  it("counts ambiguous numbers in a reply without locale clues, and the app surfaces them", () => {
    const result = postcheck("Total 1.234 for the order.", "en");
    expect(result.ambiguous).toBeGreaterThan(0);
    expect(
      checkArithmetic("Total 1.234 for the order.").ambiguous,
    ).toBeGreaterThan(0);
    expect(checkArithmetic("Total 1,234.56 EUR for the order.").ambiguous).toBe(
      0,
    );
    expect(AMBIGUOUS_NUMBER_WARNING).toContain("could be read two ways");
  });
});
