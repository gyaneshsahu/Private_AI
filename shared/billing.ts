import { z } from "zod";

export const billingPlanSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  name: z.string().min(1).max(80),
  priceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
  amountMinor: z.number().int().positive().max(1000000),
  currency: z.enum(["USD", "EUR", "GBP"]),
  interval: z.enum(["month", "year"]),
});
export type BillingPlan = z.infer<typeof billingPlanSchema>;
export const billingOverviewSchema = z.object({
  mode: z.literal("synthetic-rehearsal"),
  plans: z.array(billingPlanSchema.omit({ priceId: true })),
  customerBound: z.boolean(),
  checkout: z.enum([
    "not_started",
    "submitted",
    "uncertain",
    "ready",
    "closed",
  ]),
  portal: z.enum(["not_started", "submitted", "uncertain", "ready", "closed"]),
  customer: z.enum([
    "not_started",
    "submitted",
    "uncertain",
    "ready",
    "closed",
  ]),
  reviewRequired: z.boolean(),
  accessGranted: z.literal(false),
});
export type BillingOverview = z.infer<typeof billingOverviewSchema>;
export function hostedBillingUrl(
  value: unknown,
  kind: "checkout" | "portal",
): string {
  const url = new URL(z.string().max(4096).parse(value));
  const host =
    kind === "checkout" ? "checkout.stripe.com" : "billing.stripe.com";
  const prefix = kind === "checkout" ? "/c/pay/" : "/p/session/";
  if (
    url.protocol !== "https:" ||
    url.hostname !== host ||
    url.port ||
    url.username ||
    url.password ||
    !url.pathname.startsWith(prefix)
  )
    throw Error("Unexpected billing destination.");
  return url.href;
}
