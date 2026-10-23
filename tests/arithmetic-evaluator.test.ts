import { describe, expect, it } from "vitest";
import {
  D,
  EvaluationError,
  OPERATIONS,
  OPERATION_HELP,
  evaluateProgram,
  type Program,
} from "../src/arithmetic/evaluator";
import { parseLocaleNumber } from "../src/arithmetic/locale-number";

// Phase 0 of the arithmetic v2 work (23 October 2026): all computation in our
// own decimal code; the model never supplies a computed value.

const run = (program: Program) => {
  const values = evaluateProgram(program);
  return Object.fromEntries([...values].map(([k, v]) => [k, v.toString()]));
};
const fails = (program: Program) => {
  try {
    evaluateProgram(program);
  } catch (error) {
    if (error instanceof EvaluationError) return error.code;
    throw error;
  }
  return undefined;
};

describe("regression values from the 23 October gate", () => {
  it("29.99 x 1.07 rounded to the cent is 32.09, not 32.08", () => {
    const out = run({
      operands: { price: "29.99", factor: "1.07" },
      steps: [
        { id: "gross", op: "multiply", args: ["price", "factor"] },
        { id: "rounded", op: "round", args: ["gross"], decimals: 2, mode: "half-up" },
      ],
    });
    expect(out.gross).toBe("32.0893");
    expect(out.rounded).toBe("32.09");
    // The same with add_percent on the written rate.
    expect(
      run({
        operands: { price: "29.99", rate: "7" },
        steps: [
          { id: "gross", op: "add_percent", args: ["price", "rate"] },
          { id: "rounded", op: "round", args: ["gross"], decimals: 2 },
        ],
      }).rounded,
    ).toBe("32.09");
  });
  it("4,100 x 0.9472 is exactly 3883.52", () => {
    const out = run({
      operands: { amount: "4100", factor: "0.9472" },
      steps: [{ id: "net", op: "multiply", args: ["amount", "factor"] }],
    });
    expect(out.net).toBe("3883.52");
  });
  it("reads 1.234 by the stated locale only", () => {
    expect(parseLocaleNumber("1.234").kind).toBe("ambiguous");
    expect(parseLocaleNumber("1.234", "de")).toMatchObject({ value: "1234" });
    expect(parseLocaleNumber("1.234", "en")).toMatchObject({ value: "1.234" });
  });
  it("sums a list exactly (0.1 + 0.2 and cent amounts)", () => {
    expect(
      run({
        operands: { a: "0.1", b: "0.2", c: "120", d: "75.5", e: "9.99" },
        steps: [
          { id: "s", op: "sum", args: ["a", "b"] },
          { id: "net", op: "sum", args: ["c", "d", "e"] },
        ],
      }),
    ).toMatchObject({ s: "0.3", net: "205.49" });
  });
});

describe("the fixed operation set", () => {
  const base: Program["operands"] = { a: "1234.56", p: "19", n: "4", r: "3", zero: "0", neg: "-2.5" };
  it("computes every operation as documented", () => {
    const out = run({
      operands: base,
      steps: [
        { id: "add", op: "add", args: ["a", "p"] },
        { id: "sub", op: "subtract", args: ["a", "p"] },
        { id: "mul", op: "multiply", args: ["a", "p"] },
        { id: "div", op: "divide", args: ["a", "n"] },
        { id: "pct", op: "percent_of", args: ["a", "p"] },
        { id: "gross", op: "add_percent", args: ["a", "p"] },
        { id: "disc", op: "subtract_percent", args: ["a", "p"] },
        { id: "ratio", op: "ratio_percent", args: ["p", "a"] },
        { id: "pow", op: "power", args: ["n", "r"] },
        { id: "rnd", op: "round", args: ["pct"], decimals: 2 },
        { id: "rnd_even", op: "round", args: ["neg"], decimals: 0, mode: "half-even" },
        { id: "mn", op: "min", args: ["a", "p", "neg"] },
        { id: "mx", op: "max", args: ["a", "p", "neg"] },
        { id: "sm", op: "sum", args: ["a", "p", "n", "neg"] },
      ],
    });
    expect(out).toMatchObject({
      add: "1253.56",
      sub: "1215.56",
      mul: "23456.64",
      div: "308.64",
      pct: "234.5664",
    });
    expect(new D(out.disc).eq("999.9936")).toBe(true);
    expect(new D(out.ratio).toDecimalPlaces(6).toString()).toBe("1.53901");
    expect(out.gross).toBe("1469.1264");
    expect(out.rnd).toBe("234.57");
    expect(out.rnd_even).toBe("-2");
    expect(out.pow).toBe("64");
    expect(out.sm).toBe("1255.06");
    expect(out.mn).toBe("-2.5");
    expect(out.mx).toBe("1234.56");
    expect(Object.keys(OPERATION_HELP).sort()).toEqual([...OPERATIONS].sort());
  });
  it("compound interest with power and rounding at the end", () => {
    const out = run({
      operands: { principal: "10000", rate: "2.5", months: "12", one: "1", hundred: "100" },
      steps: [
        { id: "monthly", op: "divide", args: ["rate", "months"] },
        { id: "factor", op: "add_percent", args: ["one", "monthly"] },
        { id: "growth", op: "power", args: ["factor", "months"] },
        { id: "final", op: "multiply", args: ["principal", "growth"] },
        { id: "rounded", op: "round", args: ["final"], decimals: 2 },
      ],
    });
    expect(out.rounded).toBe("10252.88");
  });
  it("Swiss rounding to five centimes through the round step", () => {
    expect(
      run({
        operands: { a: "137.455" },
        steps: [{ id: "r", op: "round", args: ["a"], decimals: 2, mode: "swiss-0.05" }],
      }).r,
    ).toBe("137.45");
    expect(
      run({
        operands: { a: "137.475" },
        steps: [{ id: "r", op: "round", args: ["a"], decimals: 2, mode: "swiss-0.05" }],
      }).r,
    ).toBe("137.5");
  });
});

describe("refusals carry a code and the step id", () => {
  it("refuses unknown references, duplicates, arity, zero division, bad exponents and rounding", () => {
    expect(fails({ operands: { a: "1" }, steps: [{ id: "s", op: "add", args: ["a", "b"] }] })).toBe("UNKNOWN_REFERENCE");
    expect(fails({ operands: { a: "1" }, steps: [{ id: "a", op: "add", args: ["a", "a"] }] })).toBe("DUPLICATE_ID");
    expect(fails({ operands: { a: "1" }, steps: [{ id: "s", op: "add", args: ["a"] }] })).toBe("ARITY");
    expect(fails({ operands: { a: "1" }, steps: [{ id: "s", op: "sum", args: ["a"] }] })).toBe("ARITY");
    expect(fails({ operands: { a: "1", z: "0" }, steps: [{ id: "s", op: "divide", args: ["a", "z"] }] })).toBe("DIVISION_BY_ZERO");
    expect(fails({ operands: { a: "1", z: "0" }, steps: [{ id: "s", op: "ratio_percent", args: ["a", "z"] }] })).toBe("DIVISION_BY_ZERO");
    expect(fails({ operands: { a: "2", n: "2.5" }, steps: [{ id: "s", op: "power", args: ["a", "n"] }] })).toBe("BAD_EXPONENT");
    expect(fails({ operands: { a: "2", n: "601" }, steps: [{ id: "s", op: "power", args: ["a", "n"] }] })).toBe("BAD_EXPONENT");
    expect(fails({ operands: { a: "2" }, steps: [{ id: "s", op: "round", args: ["a"] }] })).toBe("BAD_ROUNDING");
    expect(fails({ operands: { a: "2" }, steps: [{ id: "s", op: "round", args: ["a"], decimals: 3, mode: "swiss-0.05" }] })).toBe("BAD_ROUNDING");
    expect(fails({ operands: { a: "1e3" }, steps: [] })).toBe("BAD_VALUE");
    expect(fails({ operands: { a: "1,5" }, steps: [] })).toBe("BAD_VALUE");
    expect(fails({ operands: { a: "1000000000000", n: "3" }, steps: [{ id: "s", op: "power", args: ["a", "n"] }] })).toBe("OUT_OF_RANGE");
    try {
      evaluateProgram({ operands: { a: "1" }, steps: [{ id: "later", op: "add", args: ["a", "missing"] }] });
    } catch (error) {
      expect((error as EvaluationError).stepId).toBe("later");
    }
  });
});
