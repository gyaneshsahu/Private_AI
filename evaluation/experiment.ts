import { z } from "zod";
import developmentCases from "./cases/development.json";
import originalRobustnessCases from "./cases/robustness-development.json";
import transferCases from "./cases/repair-transfer.json";
import attributionCases from "./cases/attribution-transfer.json";
import writingCases from "./cases/writing-transfer.json";
import heldoutCases from "./cases/heldout.json";
import { qualificationSchema } from "../shared/contracts";
const robustnessCases = [
  ...originalRobustnessCases,
  ...transferCases,
  ...attributionCases,
  ...writingCases,
];

// An experiment permit is explicitly NOT an operational qualification report.
export const experimentSchema = z
  .object({
    purpose: z.literal("SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION"),
    scenario: z
      .enum([
        "two_turn_invoice",
        "adapter_compatibility",
        "writing_revision",
        "everyday_planning",
        "planning_transfer",
        "development_case",
        "robustness_case",
        "reserved_case",
      ])
      .default("two_turn_invoice"),
    developmentCaseId: z.string().optional(),
    reservedAssessment: z
      .object({
        configurationSHA256: z.string().regex(/^[a-f0-9]{64}$/),
        fixtureSHA256: z.string().regex(/^[a-f0-9]{64}$/),
        repetition: z.number().int().min(1).max(3),
        reviewEvidence: z.string().min(20),
      })
      .strict()
      .optional(),
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
      .extend({
        gemmaThinking: z.boolean().optional(),
        glmReasoningEffort: z.enum(["low", "high", "max"]).optional(),
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
  if (x.policy.gemmaThinking !== undefined && x.policy.model !== "gemma4-31b")
    throw new Error(
      "Gemma thinking mode requires the explicit Gemma candidate.",
    );
  if (x.policy.glmReasoningEffort !== undefined && x.policy.model !== "glm-5-3")
    throw new Error(
      "GLM reasoning effort requires the explicit GLM candidate.",
    );
  if ((x.scenario === "reserved_case") !== (x.reservedAssessment !== undefined))
    throw new Error(
      "Reserved execution requires a separate frozen assessment binding.",
    );
  if (
    x.scenario === "development_case" ||
    x.scenario === "robustness_case" ||
    x.scenario === "reserved_case"
  )
    developmentCase(x.developmentCaseId, x.scenario);
  else if (x.developmentCaseId !== undefined)
    throw new Error("Development case does not match scenario.");
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
export const writingPrompts = [
  "Synthetic writing task: draft a friendly invitation email for a free community workshop on Saturday 17 October 2026, 10:00–12:00. Ask people to bring a notebook and reply by Thursday 15 October. Keep it under 120 words. No venue or signup URL was supplied; do not invent one.",
  "Revise the invitation: the workshop is now Sunday 18 October, 11:00–13:00, and replies are due Friday 16 October. Make it shorter while keeping the free admission and notebook instruction. Do not invent a location or link.",
] as const;
export const planningPrompts = [
  "Synthetic planning task: make a one-week English presentation practice plan. I have three 30-minute sessions, Tuesday, Thursday and Saturday, each starting at 19:00. Include concrete activities and a self-check at the end of each session. Use no paid tools. Keep the plan concise.",
  "Thursday is no longer available; replace it with Friday. Keep three sessions of 30 minutes, 90 minutes total, starting at 19:00. Make Saturday a full rehearsal and retain a self-check for each session. Show the revised complete plan.",
] as const;
export const planningTransferPrompts = [
  "Synthetic planning task: I want to practice sketching this weekend using a pencil and paper I already own. I have 25 minutes on Saturday at 09:00 and 25 minutes on Sunday at 16:00, 50 minutes total. Give me a short beginner plan with concrete practice and a final check of my work within each session. Do not suggest purchases.",
  "Change the allocation: I now have 15 minutes on Saturday at 09:00 and 35 minutes on Sunday at 16:00. Keep 50 minutes total and the final check within each session. Show the complete revised plan; Sunday should include drawing one household object from observation.",
] as const;
export function scenarioPrompts(
  scenario: Experiment["scenario"],
  developmentCaseId?: string,
): readonly string[] {
  if (
    scenario === "development_case" ||
    scenario === "robustness_case" ||
    scenario === "reserved_case"
  )
    return developmentCase(developmentCaseId, scenario).turns;
  return {
    adapter_compatibility: [compatibilityPrompt],
    two_turn_invoice: experimentPrompts,
    writing_revision: writingPrompts,
    everyday_planning: planningPrompts,
    planning_transfer: planningTransferPrompts,
  }[scenario];
}
export const everydayAssertions = {
  planning_transfer: [
    "Saturday 09:00 and Sunday 16:00, exactly 25 minutes each; concrete sketching practice and final checks within 50 minutes; no purchases",
    "Saturday 15 minutes and Sunday 35 minutes at unchanged starts; exactly 50 total including checks; Sunday household object from observation; concise complete revision",
  ],
  writing_revision: [
    "Original dates, time, free admission and notebook retained; under 120 words; no invented venue/link",
    "Revised dates and time replace old details; Friday reply deadline; shorter email; free admission and notebook retained",
  ],
  everyday_planning: [
    "Tuesday/Thursday/Saturday, 19:00, 30 minutes each; concrete activities and self-checks; no paid tools",
    "Tuesday/Friday/Saturday, 19:00, 90 minutes total; Saturday rehearsal; self-checks retained",
  ],
} as const;
export function developmentCase(
  id: string | undefined,
  scenario:
    | "development_case"
    | "robustness_case"
    | "reserved_case" = "development_case",
) {
  const selected = (
    scenario === "reserved_case"
      ? heldoutCases
      : scenario === "robustness_case"
        ? robustnessCases
        : developmentCases
  ).find((c) => c.id === id);
  if (!selected || !selected.synthetic || selected.turns.length !== 2)
    throw new Error(
      "Choose one frozen two-turn synthetic development case; reserved or custom inputs are not permitted.",
    );
  return selected;
}
export function experimentRequestLimit(permit: Pick<Experiment, "scenario">) {
  return permit.scenario === "adapter_compatibility" ? 1 : 2;
}
