import { describe, expect, it } from "vitest";
import {
  ARITHMETIC_WARNING,
  checkArithmetic,
  replyLocale,
} from "../src/arithmetic/check";

describe("arithmetic post-check on a completed reply (owner wording, 23 October)", () => {
  it("flags a stated relation that does not add up and counts it", () => {
    const reply =
      "Sie müssen um 08:58 Uhr losgehen: 09:23 Uhr − 18 Minuten = 08:58 Uhr.";
    const result = checkArithmetic(reply);
    expect(result.relations).toBeGreaterThan(0);
    expect(result.mismatches).toBeGreaterThan(0);
  });
  it("stays silent on a correct working and on prose without arithmetic", () => {
    expect(
      checkArithmetic("You must leave at 09:05: 09:23 − 18 minutes = 09:05."),
    ).toMatchObject({ mismatches: 0 });
    expect(checkArithmetic("Thanks, that is all I needed.")).toEqual({
      relations: 0,
      mismatches: 0,
    });
    expect(
      checkArithmetic("Netto 1.234,56 EUR × 19 % = 234,57 EUR Umsatzsteuer."),
    ).toMatchObject({ mismatches: 0 });
  });
  it("uses the owner's warning text and a coarse locale hint", () => {
    expect(ARITHMETIC_WARNING).toBe(
      "We recalculated the figures in this answer and some did not match. Please check these numbers before you rely on them.",
    );
    expect(
      replyLocale("Der Betrag beträgt 10 Euro und die Rechnung folgt."),
    ).toBe("de");
    expect(replyLocale("The amount is 10 and the invoice follows.")).toBe("en");
  });
});
