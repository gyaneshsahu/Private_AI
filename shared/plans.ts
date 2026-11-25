// Plans (docs/plans-20261125.md): the catalogue Free, Plus, Pro. Every number here is a PROPOSAL
// for the owner to replace (owner-decisions: plan values are reviewed before launch). The prices
// follow ChatGPT's list prices (20 and 200 a month), the brief's rule for an open decision.
// Limits are shown, not enforced: one usage plan still applies to the whole deployment.
import { z } from "zod";
import { planFor } from "./usage-config";

export const PLAN_IDS = ["free", "plus", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type PaidPlanId = Exclude<PlanId, "free">;

export interface PlanLimits {
  /** Units a week (Fast 1, Thinking 5, ...; docs/usage-metering-20261115.md). */
  unitsPerWeek: number;
  imagesPerDay: number;
  searchesPerDay: number;
  researchRunsPerDay: number;
  voiceMinutesPerDay: number;
  backgroundTasks: number;
}
export interface Plan {
  id: PlanId;
  /** The same in every language. */
  name: string;
  /** Price a month in cents, VAT included; 0 is free. */
  monthlyMinor: number;
  currency: "EUR";
  limits: PlanLimits;
}

/** Free and Plus show the launch proposals already in shared/usage-plans.json (free, premium). */
const fromUsagePlan = (id: string): PlanLimits => {
  const { units, caps } = planFor(id);
  return { unitsPerWeek: Math.round((units.period * 7) / units.days), ...caps };
};

export const PLANS: readonly Plan[] = [
  { id: "free", name: "Free", monthlyMinor: 0, currency: "EUR", limits: fromUsagePlan("free") },
  { id: "plus", name: "Plus", monthlyMinor: 2000, currency: "EUR", limits: fromUsagePlan("premium") },
  // No usage plan for Pro exists yet: about four times Plus, a proposal like the rest.
  {
    id: "pro",
    name: "Pro",
    monthlyMinor: 20000,
    currency: "EUR",
    limits: { unitsPerWeek: 2400, imagesPerDay: 100, searchesPerDay: 200, researchRunsPerDay: 20, voiceMinutesPerDay: 120, backgroundTasks: 10 },
  },
];
export const planOf = (id: PlanId): Plan => PLANS.find((p) => p.id === id)!;

export const checkoutRequest = z.object({ plan: z.enum(["plus", "pro"]) }).strict();
/** Checkout ids are the provider's own; only their shape is bounded here. */
export const confirmRequest = z.object({ checkout: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/) }).strict();
export const changeRequest = z.object({ plan: z.literal("free") }).strict();

/** What the page gets from GET /api/plans. */
export interface PlansView {
  current: PlanId;
  /** A checkout provider is connected: paid plans can be chosen. */
  checkout: boolean;
}
