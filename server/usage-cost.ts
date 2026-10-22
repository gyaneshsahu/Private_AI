/**
 * Exact decimal arithmetic for published-rate costs. Costs arrive as decimal
 * strings with at most twelve fraction digits (see `usageMetricsSchema`); they
 * are summed as scaled integers so that no float rounding enters the ledger.
 */
const decimal = /^\d{1,21}(\.\d{1,12})?$/;
const FRACTION_DIGITS = 12;
const SCALE = 10n ** BigInt(FRACTION_DIGITS);

function scaled(value: string): bigint {
  if (!decimal.test(value)) throw Error("Invalid decimal cost.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(FRACTION_DIGITS, "0"));
}

function render(total: bigint): string {
  const whole = total / SCALE;
  const fraction = (total % SCALE)
    .toString()
    .padStart(FRACTION_DIGITS, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

/** Sums decimal cost strings exactly; the result has no trailing zeros and is "0" for an all-zero sum. */
export function sumDecimalStrings(values: readonly string[]): string {
  return render(values.reduce((total, value) => total + scaled(value), 0n));
}

/** Canonical form of one decimal string: trailing zeros removed, "0" preserved. */
export function normalizeDecimalString(value: string): string {
  return render(scaled(value));
}
