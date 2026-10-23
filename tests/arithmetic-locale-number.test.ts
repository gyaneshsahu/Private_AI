import { describe, expect, it } from "vitest";
import {
  formatLocaleNumber,
  parseLocaleNumber,
  roundDecimal,
} from "../src/arithmetic/locale-number";

// Phase 0 of the arithmetic v2 work (23 October 2026): a locale parser that
// reports ambiguity instead of guessing, and rounding modes stated explicitly.

const value = (raw: string, locale?: "de" | "en" | "ch") => {
  const parsed = parseLocaleNumber(raw, locale);
  if (parsed.kind !== "value") throw new Error(`${raw}: ${parsed.kind}`);
  return parsed.value;
};

describe("German, English and Swiss number formats", () => {
  it("reads German numbers", () => {
    expect(value("1.234,56")).toBe("1234.56");
    expect(value("12.345.678,90")).toBe("12345678.9");
    expect(value("86,40")).toBe("86.4");
    expect(value("1.234.567")).toBe("1234567");
    expect(value("0,5")).toBe("0.5");
    expect(value("-1.234,5")).toBe("-1234.5");
    expect(value("−1.234,5")).toBe("-1234.5");
  });
  it("reads English numbers", () => {
    expect(value("1,234.56")).toBe("1234.56");
    expect(value("12,345,678.90")).toBe("12345678.9");
    expect(value("86.40")).toBe("86.4");
    expect(value("1,234,567")).toBe("1234567");
    expect(value("0.5")).toBe("0.5");
    expect(value("4,100", "en")).toBe("4100");
    expect(parseLocaleNumber("4,100").kind).toBe("ambiguous");
  });
  it("reads Swiss apostrophe and space grouping", () => {
    expect(value("1'234.56")).toBe("1234.56");
    expect(value("1’234.56")).toBe("1234.56");
    expect(value("1'234,56")).toBe("1234.56");
    expect(value("12'345'678.90")).toBe("12345678.9");
    expect(value("1 234,56")).toBe("1234.56");
    expect(value("1 234.56")).toBe("1234.56");
    expect(value("1'234")).toBe("1234");
    expect(parseLocaleNumber("1'23.4")).toMatchObject({ kind: "invalid" });
    expect(parseLocaleNumber("1.234.567", "ch")).toMatchObject({ kind: "invalid" });
  });
  it("keeps a trailing percent sign as a flag", () => {
    expect(parseLocaleNumber("19 %")).toEqual({ kind: "value", value: "19", percent: true });
    expect(parseLocaleNumber("2,5%")).toEqual({ kind: "value", value: "2.5", percent: true, hint: "de" });
  });
  it("refuses malformed tokens", () => {
    for (const raw of ["1.23,45", "1,23.45", "12.3456.78", "1..2", "1,", ",5", "abc", "1.234,56,78", ""])
      expect(parseLocaleNumber(raw).kind, raw).toBe("invalid");
  });
});

describe("ambiguity is reported, never guessed", () => {
  it("reports 1.234 and 1,234 as ambiguous without a locale", () => {
    expect(parseLocaleNumber("1.234")).toEqual({
      kind: "ambiguous",
      percent: false,
      readings: [
        { locale: "de", value: "1234" },
        { locale: "en", value: "1.234" },
      ],
    });
    expect(parseLocaleNumber("1,234")).toEqual({
      kind: "ambiguous",
      percent: false,
      readings: [
        { locale: "de", value: "1.234" },
        { locale: "en", value: "1234" },
      ],
    });
    expect(parseLocaleNumber("1.000").kind).toBe("ambiguous");
    expect(parseLocaleNumber("999,999").kind).toBe("ambiguous");
  });
  it("resolves the same tokens when the locale is named", () => {
    expect(value("1.234", "de")).toBe("1234");
    expect(value("1.234", "en")).toBe("1.234");
    expect(value("1,234", "de")).toBe("1.234");
    expect(value("1,234", "en")).toBe("1234");
    expect(value("1.234", "ch")).toBe("1.234");
  });
  it("never treats a leading zero or a long integer as grouping", () => {
    expect(value("0.234")).toBe("0.234");
    expect(value("0,234")).toBe("0.234");
    expect(value("1234.567")).toBe("1234.567");
    expect(value("1234,567")).toBe("1234.567");
  });
  it("refuses a separator that cannot be a decimal mark in the named locale", () => {
    expect(parseLocaleNumber("86.40", "de").kind).toBe("invalid");
    expect(parseLocaleNumber("86,40", "en").kind).toBe("invalid");
    expect(parseLocaleNumber("1,234.56", "de").kind).toBe("invalid");
    expect(parseLocaleNumber("1.234,56", "en").kind).toBe("invalid");
  });
});

describe("rounding modes", () => {
  it("rounds half up (commercial) and half even (banker's)", () => {
    expect(roundDecimal("2.345", 2, "half-up")).toBe("2.35");
    expect(roundDecimal("2.345", 2, "half-even")).toBe("2.34");
    expect(roundDecimal("2.355", 2, "half-even")).toBe("2.36");
    expect(roundDecimal("-2.345", 2, "half-up")).toBe("-2.35");
    expect(roundDecimal("2.5", 0, "half-up")).toBe("3");
    expect(roundDecimal("2.5", 0, "half-even")).toBe("2");
    expect(roundDecimal("3.5", 0, "half-even")).toBe("4");
    expect(roundDecimal("2.345", 2, "half-down")).toBe("2.34");
    expect(roundDecimal("2.349", 2, "down")).toBe("2.34");
    expect(roundDecimal("2.341", 2, "up")).toBe("2.35");
  });
  it("rounds to five centimes the Swiss way", () => {
    expect(roundDecimal("10.02", 2, "swiss-0.05")).toBe("10.00");
    expect(roundDecimal("10.025", 2, "swiss-0.05")).toBe("10.05");
    expect(roundDecimal("10.03", 2, "swiss-0.05")).toBe("10.05");
    expect(roundDecimal("10.07", 2, "swiss-0.05")).toBe("10.05");
    expect(roundDecimal("10.075", 2, "swiss-0.05")).toBe("10.10");
    expect(roundDecimal("10.08", 2, "swiss-0.05")).toBe("10.10");
    expect(roundDecimal("137.455", 2, "swiss-0.05")).toBe("137.45");
    expect(() => roundDecimal("1", 3, "swiss-0.05")).toThrow();
  });
  it("is exact where binary floating point is not", () => {
    // Known failures from the 23 October gate: 29.99 x 1.07 and 4,100 x 0.9472.
    expect(roundDecimal("32.0893", 2)).toBe("32.09");
    expect(roundDecimal("1.005", 2)).toBe("1.01");
    expect(roundDecimal("1.015", 2)).toBe("1.02");
    expect(roundDecimal("8.635", 2)).toBe("8.64");
  });
});

describe("locale formatting never writes an ambiguous number", () => {
  it("writes decimals in the locale's convention", () => {
    expect(formatLocaleNumber("1234.5", 2, "de")).toBe("1234,50");
    expect(formatLocaleNumber("1234.5", 2, "en")).toBe("1234.50");
    expect(formatLocaleNumber("12345.5", 2, "de")).toBe("12.345,50");
    expect(formatLocaleNumber("12345.5", 2, "en")).toBe("12,345.50");
    expect(formatLocaleNumber("12345.5", 2, "ch")).toBe("12’345.50");
    expect(formatLocaleNumber("-0.5", 1, "de")).toBe("-0,5");
  });
  it("omits grouping where it could be read as a decimal mark", () => {
    expect(formatLocaleNumber("1234", 0, "de")).toBe("1234");
    expect(formatLocaleNumber("12345", 0, "de")).toBe("12345");
    expect(formatLocaleNumber("12345.678", 3, "en")).toBe("12345.678");
    for (const locale of ["de", "en", "ch"] as const)
      for (const [v, d] of [["1234", 0], ["12345", 0], ["1234.5", 3], ["123456", 0]] as const) {
        const written = formatLocaleNumber(v, d, locale);
        const parsed = parseLocaleNumber(written);
        expect(parsed.kind, `${locale} ${written}`).toBe("value");
      }
  });
});
