// How a start is charged (owner, 18 November 2026): a request or run may start while at least 1 unit is
// left, in the period and in the rolling day; it is charged its cost or what is left, whichever is
// smaller, so the balance stops at 0 and never goes below. The allowance is checked only here, at the
// start; parts of a run that has started are continuations (`reserveContinuation`), never refused for
// allowance. `reserve` itself stays all-or-nothing on what it is asked for.
import type { UsageLedger } from "./usage-contract";

const DAY = 86_400_000;

export type ChargeRefusal = { units: 0; reason: "period" | "daily" | "unavailable"; resetsAt?: string };
export type Charge = { units: number } | ChargeRefusal;

/** When the cap that refused frees up: the period's end, or the oldest counted unit plus 24 hours. */
async function resetsAt(usage: UsageLedger, accountId: string, reason: "period" | "daily"): Promise<string | undefined> {
  if (reason === "daily") {
    const oldest = await usage.oldestInLast?.(accountId, DAY);
    return oldest === undefined ? undefined : new Date(oldest + DAY).toISOString();
  }
  const summary = await usage.summary(accountId);
  return summary.state === "unavailable" ? undefined : summary.resetsAt;
}

export async function chargeStart(
  usage: UsageLedger,
  accountId: string,
  requestId: string,
  cost: number,
  dailyLimit?: number,
): Promise<Charge> {
  // Two tries: another tab may take the last units between reading the balance and reserving.
  for (let attempt = 0; attempt < 2; attempt++) {
    let dayLeft = Infinity;
    if (dailyLimit) {
      if (!usage.usedInLast) return { units: 0, reason: "unavailable" };
      dayLeft = dailyLimit - (await usage.usedInLast(accountId, DAY));
      if (dayLeft < 1) return { units: 0, reason: "daily", resetsAt: await resetsAt(usage, accountId, "daily") };
    }
    const summary = await usage.summary(accountId);
    // No allowance period at all is refused like an empty one, with no reset time.
    if (summary.state === "unavailable") return { units: 0, reason: "period" };
    if (summary.remaining < 1) return { units: 0, reason: "period", resetsAt: summary.resetsAt };
    const units = Math.max(1, Math.min(cost, summary.remaining, dayLeft));
    if (await usage.reserve(accountId, requestId, units)) return { units };
  }
  const summary = await usage.summary(accountId);
  return summary.state === "unavailable" ? { units: 0, reason: "period" } : { units: 0, reason: "period", resetsAt: summary.resetsAt };
}

/** The one calm sentence for a refused start, in English for the server's own logs and API (the browser shows its own text). */
// Written as an object's error value so tests/i18n-server-messages.test.ts finds it and checks its German entry.
export const limitMessage = (resetsAt?: string) =>
  ({ error: resetsAt ? `Limit reached. It resets at ${resetsAt}.` : "Limit reached." }).error;

export { resetsAt as limitResetsAt };
