import { z } from "zod";
import { qualificationSchema } from "../shared/contracts";

// An experiment permit is explicitly NOT an operational qualification report.
export const experimentSchema = z
  .object({
    purpose: z.literal("SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION"),
    scenario: z
      .enum(["two_turn_invoice", "adapter_compatibility"])
      .default("two_turn_invoice"),
    approvalId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
    approvedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    approvalEvidence: z.string().min(20),
    approvedCapUSD: z.number().positive().finite(),
    providerCapUSD: z.number().positive().finite(),
    providerLimitEvidence: z.string().min(20),
    pricingEvidence: z.string().min(20),
    pricingCheckedAt: z.string().datetime(),
    browserPreflightEvidence: z.string().min(20),
    releaseReviewEvidence: z.string().min(20),
    policy: qualificationSchema
      .pick({
        origin: true,
        repository: true,
        releaseDigests: true,
        model: true,
        maxInputCharacters: true,
        maxOutputTokens: true,
        pricing: true,
      })
      .strict(),
  })
  .strict();
export type Experiment = z.infer<typeof experimentSchema>;
export function validateExperiment(
  input: unknown,
  now = Date.now(),
): Experiment {
  const x = experimentSchema.parse(input);
  if (
    Date.parse(x.approvedAt) > now ||
    Date.parse(x.expiresAt) <= now ||
    Date.parse(x.expiresAt) <= Date.parse(x.approvedAt) ||
    Date.parse(x.pricingCheckedAt) > now ||
    x.providerCapUSD > x.approvedCapUSD ||
    (x.scenario === "adapter_compatibility" &&
      (x.policy.maxOutputTokens > 512 ||
        x.policy.maxInputCharacters > 2000 ||
        x.policy.model !== "gpt-oss-120b")) ||
    x.policy.origin !== "https://inference.tinfoil.sh" ||
    x.policy.repository !== "tinfoilsh/confidential-model-router"
  )
    throw new Error(
      "Experiment authorization is expired, inconsistent or outside the selected scope.",
    );
  return x;
}
export const invoiceText =
  "SYNTHETIC-INVOICE-A: service EUR 80.00; materials EUR 20.00; discount EUR 5.00; VAT 20% on the discounted subtotal.";
export const experimentPrompts = [
  "Using synthetic invoice A, calculate the discounted subtotal, VAT and total in EUR. Cite the supplied invoice source. Show the arithmetic.",
  "Correction: the discount is EUR 10.00. Recalculate using the same VAT rule, cite the source and explain what changed.",
] as const;
export const expectedInvoice = [
  { subtotal: "95.00", vat: "19.00", total: "114.00" },
  { subtotal: "90.00", vat: "18.00", total: "108.00", reduction: "6.00" },
];

export const compatibilityPrompt =
  "Calculate 2 + 2. Reply with just the number.";
export function experimentRequestLimit(permit: Pick<Experiment, "scenario">) {
  return permit.scenario === "adapter_compatibility" ? 1 : 2;
}
