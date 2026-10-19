import { z } from "zod";

const money = z.number().finite().nonnegative();
const budget = z.object({
  maxRequests: z.number().int().positive(),
  reserveUSD: money,
  actualBeforeUSD: money,
  uncertaintyUSD: money,
  capUSD: money,
  providerAccountLimitUSD: money,
  providerKeyLimitUSD: money,
  prepaidBeforeUSD: money,
});
export function assertWorkspaceBudget(
  plan: unknown,
  requests: number,
  reserve: number,
  permitCeiling: number,
): void {
  const p = budget.parse(plan);
  if (
    !Number.isSafeInteger(requests) ||
    requests < 1 ||
    !Number.isFinite(reserve) ||
    reserve < 0 ||
    !Number.isFinite(permitCeiling) ||
    permitCeiling <= 0
  )
    throw Error("Invalid calculated batch bounds.");
  if (p.maxRequests < requests || p.reserveUSD + 1e-8 < reserve)
    throw Error("Batch must reserve every permitted inference.");
  if (
    p.actualBeforeUSD + p.uncertaintyUSD + p.reserveUSD >
      Math.min(
        p.capUSD,
        p.providerAccountLimitUSD,
        p.providerKeyLimitUSD,
        permitCeiling,
      ) ||
    p.uncertaintyUSD + p.reserveUSD > p.prepaidBeforeUSD
  )
    throw Error(
      "Batch exceeds authorization, provider limits or available credit.",
    );
}
