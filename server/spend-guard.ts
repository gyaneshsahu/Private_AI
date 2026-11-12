// Provider-neutral spending ceiling for the relay. Supplier spending limits are soft,
// and some suppliers report no token usage at all, so the relay itself refuses a request
// that could take committed spend past the qualification report's `approvedSpendUSD`.
// Committed spend over the report's review window = metered cost recorded
// + worst case for every request without metering (interrupted, uncertain, unmetered
// suppliers, still running) + worst case for the requests running in this process.
import type { Qualification } from "../shared/contracts";
import type { UsageLedger } from "./usage-contract";

/** Upper bound for one request: every input character counted as a token, full output. */
export function worstCaseUSD(q: Qualification) {
  return (
    (q.maxInputCharacters * q.pricing.inputPerMillion +
      q.maxOutputTokens * q.pricing.outputPerMillion) /
    1e6
  );
}

export async function spendAllows(
  ledger: Required<Pick<UsageLedger, "spend">>,
  q: Qualification,
  runningHere: number,
): Promise<boolean> {
  const worst = worstCaseUSD(q);
  const spent = await ledger.spend(Date.parse(q.reviewedAt), Date.parse(q.validUntil));
  const committed = Number(spent.meteredUSD) + (spent.unmetered + runningHere) * worst;
  // Compared in whole nano-dollars so floating-point sums do not decide at the boundary.
  return Math.round((committed + worst) * 1e9) <= Math.round(q.approvedSpendUSD * 1e9);
}
