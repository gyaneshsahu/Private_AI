import type { RequestAllowance } from "../shared/contracts";

/** Shown when the ledger has no allowance covering the current moment. */
export const noActivePlanMessage = "No plan is active for this account yet.";

/** Exact wording agreed for the cost figure; the provider bills interrupted requests too. */
export const costBasisSentence =
  "Cost is at published rates for completed requests only; interrupted requests are billed by the provider but cannot be counted here.";

export type ActiveAllowance = Exclude<RequestAllowance, { state: "unavailable" }>;

export function isActiveAllowance(
  allowance: RequestAllowance | undefined,
): allowance is ActiveAllowance {
  return !!allowance && allowance.state !== "unavailable";
}

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatCount(value: number): string {
  return Number.isFinite(value) ? integer.format(Math.max(0, value)) : "0";
}

/**
 * Renders a published-rate cost string as "USD 0.0123". Tiny amounts keep
 * enough fraction digits to stay non-zero (up to six); nothing is rounded up
 * to a cent, and "0" renders as "USD 0".
 */
export function formatCostUsd(cost: string): string {
  if (!/^\d{1,21}(\.\d{1,12})?$/.test(cost)) return "USD unknown";
  const [whole, fraction = ""] = cost.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  if (!trimmed) return `USD ${whole}`;
  const shown = trimmed.slice(0, 6).replace(/0+$/, "");
  if (!shown) return whole === "0" ? "less than USD 0.000001" : `USD ${whole}`;
  return `USD ${whole}.${shown}`;
}

export function requestsRemainingHeading(allowance: ActiveAllowance): string {
  return `${formatCount(allowance.remaining)} requests remaining`;
}

export function requestsUsedSentence(allowance: ActiveAllowance): string {
  return `${formatCount(allowance.used)} of ${formatCount(allowance.limit)} requests reserved or attempted in this period.`;
}

export function settlementSentence(allowance: ActiveAllowance): string {
  return `${formatCount(allowance.pending)} pending or interrupted before settlement; ${formatCount(allowance.uncertain)} with an uncertain transport outcome.`;
}

export function meteredTokensSentence(allowance: ActiveAllowance): string {
  return `${formatCount(allowance.meteredRequests)} completed ${allowance.meteredRequests === 1 ? "request was" : "requests were"} metered: ${formatCount(allowance.promptTokens)} prompt tokens and ${formatCount(allowance.completionTokens)} completion tokens.`;
}

/** Cost line, or the honest absence when no metered request carried a published cost. */
export function publishedCostSentence(allowance: ActiveAllowance): string {
  return allowance.costUsd === undefined
    ? "No published cost has been reported for this period yet."
    : `Published cost so far: ${formatCostUsd(allowance.costUsd)}.`;
}

export function unmeteredSentence(allowance: ActiveAllowance): string {
  return `${formatCount(allowance.unmeteredRequests)} settled ${allowance.unmeteredRequests === 1 ? "request has" : "requests have"} no metering (interrupted or uncertain).`;
}

export function periodEndLabel(
  allowance: ActiveAllowance,
  locale?: string,
): string {
  const date = new Date(allowance.resetsAt);
  return Number.isNaN(date.getTime())
    ? "unknown"
    : date.toLocaleString(locale, { timeZoneName: "short" });
}
