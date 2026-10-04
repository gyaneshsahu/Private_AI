import Decimal from "decimal.js";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function calculate(a: string, operation: string, b: string): string {
  if (![a, b].every((n) => /^-?\d{1,20}(\.\d{1,10})?$/.test(n)))
    throw new Error("Use decimal numbers, without commas or currency symbols.");
  const x = new D(a),
    y = new D(b);
  if (
    (operation === "/" || operation === "change") &&
    (operation === "/" ? y.isZero() : x.isZero())
  )
    throw new Error("Cannot divide by zero.");
  switch (operation) {
    case "+":
      return x.plus(y).toString();
    case "-":
      return x.minus(y).toString();
    case "*":
      return x.times(y).toString();
    case "/":
      return x.div(y).toDecimalPlaces(10).toString();
    case "change":
      return y.minus(x).div(x).times(100).toDecimalPlaces(6).toString() + "%";
    default:
      throw new Error("Unsupported calculation.");
  }
}
