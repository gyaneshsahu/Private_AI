import { it, expect } from "vitest";
import { evidenceNumberTokens } from "../src/number-evidence";
it("normalizes English integer words zero through99 and keeps compound words atomic", () => {
  const ones = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  for (let n = 0; n < 100; n++) {
    const phrase =
      n < 20
        ? ones[n]
        : tens[Math.floor(n / 10) - 2] + (n % 10 ? "-" + ones[n % 10] : "");
    expect(evidenceNumberTokens(phrase + " items")).toEqual([String(n)]);
  }
  expect(evidenceNumberTokens("Twenty one tickets")).toEqual(["21"]);
});
it("does not turn unsupported signed, decimal or magnitude phrases into smaller positive values", () => {
  for (const phrase of [
    "one hundred",
    "eight thousand",
    "minus eight",
    "negative eight",
    "eight point five",
    "one half",
    "two thirds",
    "three quarters",
    "two dozen",
    "one and two",
  ])
    expect(evidenceNumberTokens(phrase)).toEqual([]);
  expect(evidenceNumberTokens("someone supplied eighteenth versions")).toEqual(
    [],
  );
});
it("retains strict digit handling and supports mixed ordinary prose", () => {
  expect(evidenceNumberTokens("Eight boxes cost EUR 14 each.")).toEqual([
    "14",
    "8",
  ]);
  expect(evidenceNumberTokens("1,000")).toEqual(["1,000"]);
  expect(evidenceNumberTokens("eight and a fee of 5")).toEqual(["5", "8"]);
});
