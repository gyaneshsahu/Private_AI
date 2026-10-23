// Decimal program evaluator (Phase 0 of the arithmetic v2 work, 23 October
// 2026). A program is a set of named decimal operands and an ordered list of
// steps over a fixed, enumerated set of operations. Every value is computed
// here with decimal.js at 60 significant digits; nothing is taken from a
// model's own arithmetic. Pure; no model, no network.
import Decimal from "decimal.js";
import { type RoundingMode, roundDecimal } from "./locale-number";

export const D = Decimal.clone({
  precision: 60,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});
export type Dec = InstanceType<typeof D>;

export const OPERATIONS = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "percent_of",
  "add_percent",
  "subtract_percent",
  "ratio_percent",
  "power",
  "round",
  "min",
  "max",
  "sum",
] as const;
export type Operation = (typeof OPERATIONS)[number];

export const ROUNDING_MODES: readonly RoundingMode[] = [
  "half-up",
  "half-even",
  "half-down",
  "down",
  "up",
  "swiss-0.05",
];

/** What each operation computes, for schemas and prompts. */
export const OPERATION_HELP: Record<Operation, string> = {
  add: "args[0] + args[1]",
  subtract: "args[0] - args[1]",
  multiply: "args[0] * args[1]",
  divide: "args[0] / args[1]; args[1] must not be zero",
  percent_of: "args[0] * args[1] / 100 (args[1] is a percentage such as 19)",
  add_percent: "args[0] * (1 + args[1] / 100): add a percentage, e.g. net to gross",
  subtract_percent: "args[0] * (1 - args[1] / 100): deduct a percentage, e.g. a discount",
  ratio_percent: "args[0] / args[1] * 100: a share or change as a percentage; args[1] must not be zero",
  power: "args[0] ** args[1]; args[1] is a whole number 0..600 (periods of compound interest)",
  round: "round args[0] to `decimals` places with `mode` (half-up is commercial rounding)",
  min: "the smallest of two or more args",
  max: "the largest of two or more args",
  sum: "the total of two or more args",
};

export type Step = {
  id: string;
  op: Operation;
  args: string[];
  decimals?: number;
  mode?: RoundingMode;
};
export type Program = { operands: Record<string, string>; steps: Step[] };

export type EvaluationFailure =
  | "BAD_VALUE"
  | "DUPLICATE_ID"
  | "UNKNOWN_REFERENCE"
  | "ARITY"
  | "DIVISION_BY_ZERO"
  | "BAD_EXPONENT"
  | "BAD_ROUNDING"
  | "OUT_OF_RANGE";

export class EvaluationError extends Error {
  constructor(
    readonly code: EvaluationFailure,
    readonly stepId: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

const DECIMAL = /^-?(?:0|[1-9]\d{0,23})(?:\.\d{1,20})?$/;
const LIMIT = new D("1e24");

function arity(step: Step, min: number, max = min) {
  if (step.args.length < min || step.args.length > max)
    throw new EvaluationError(
      "ARITY",
      step.id,
      `${step.op} takes ${min === max ? min : `${min} to ${max}`} args, got ${step.args.length}`,
    );
}

/** Evaluates a program; returns every operand and step value by id. Throws EvaluationError, never a decimal.js error. */
export function evaluateProgram(program: Program): Map<string, Dec> {
  const values = new Map<string, Dec>();
  for (const [id, raw] of Object.entries(program.operands)) {
    if (!DECIMAL.test(raw))
      throw new EvaluationError("BAD_VALUE", id, `operand ${id} is not a plain decimal: ${raw}`);
    values.set(id, new D(raw));
  }
  for (const step of program.steps) {
    if (values.has(step.id))
      throw new EvaluationError("DUPLICATE_ID", step.id, `id ${step.id} is defined twice`);
    const args = step.args.map((ref) => {
      const value = values.get(ref);
      if (!value)
        throw new EvaluationError(
          "UNKNOWN_REFERENCE",
          step.id,
          `step ${step.id} refers to ${ref}, which is not an earlier operand or step`,
        );
      return value;
    });
    let result: Dec;
    switch (step.op) {
      case "add":
        arity(step, 2);
        result = args[0].plus(args[1]);
        break;
      case "subtract":
        arity(step, 2);
        result = args[0].minus(args[1]);
        break;
      case "multiply":
        arity(step, 2);
        result = args[0].times(args[1]);
        break;
      case "divide":
        arity(step, 2);
        if (args[1].isZero())
          throw new EvaluationError("DIVISION_BY_ZERO", step.id, `step ${step.id} divides by zero`);
        result = args[0].div(args[1]);
        break;
      case "percent_of":
        arity(step, 2);
        result = args[0].times(args[1]).div(100);
        break;
      case "add_percent":
        arity(step, 2);
        result = args[0].times(new D(1).plus(args[1].div(100)));
        break;
      case "subtract_percent":
        arity(step, 2);
        result = args[0].times(new D(1).minus(args[1].div(100)));
        break;
      case "ratio_percent":
        arity(step, 2);
        if (args[1].isZero())
          throw new EvaluationError("DIVISION_BY_ZERO", step.id, `step ${step.id} divides by zero`);
        result = args[0].div(args[1]).times(100);
        break;
      case "power": {
        arity(step, 2);
        const n = args[1];
        if (!n.isInteger() || n.isNegative() || n.gt(600))
          throw new EvaluationError("BAD_EXPONENT", step.id, `step ${step.id}: exponent must be a whole number 0..600`);
        result = args[0].pow(n);
        break;
      }
      case "round": {
        arity(step, 1);
        const decimals = step.decimals;
        const mode = step.mode ?? "half-up";
        if (
          decimals === undefined ||
          !Number.isInteger(decimals) ||
          decimals < 0 ||
          decimals > 12 ||
          !ROUNDING_MODES.includes(mode) ||
          (mode === "swiss-0.05" && decimals !== 2)
        )
          throw new EvaluationError("BAD_ROUNDING", step.id, `step ${step.id}: round needs decimals 0..12 and a known mode (swiss-0.05 needs 2 decimals)`);
        result = new D(roundDecimal(args[0], decimals, mode));
        break;
      }
      case "min":
        arity(step, 2, 64);
        result = args.reduce((a, b) => (b.lt(a) ? b : a));
        break;
      case "max":
        arity(step, 2, 64);
        result = args.reduce((a, b) => (b.gt(a) ? b : a));
        break;
      case "sum":
        arity(step, 2, 64);
        result = args.reduce((a, b) => a.plus(b), new D(0));
        break;
      default:
        throw new EvaluationError("ARITY", step.id, `unknown operation ${String(step.op)}`);
    }
    if (!result.isFinite() || result.abs().gt(LIMIT))
      throw new EvaluationError("OUT_OF_RANGE", step.id, `step ${step.id} is out of range`);
    values.set(step.id, result);
  }
  return values;
}
