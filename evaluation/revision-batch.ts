import Decimal from "decimal.js";
import fixtures from "./cases/research-revision-transfer.json";
import type { Experiment } from "./experiment";

export const revisionCases = fixtures.cases.map((c) => ({
  ...c,
  turns: [...c.turns, fixtures.reviewPrompt],
  query: "",
}));

// Planning ceiling, not charged usage. Live pricing and billing are prerequisites.
export function revisionBatchReserve(inputPrice: number, outputPrice: number) {
  return new Decimal(fixtures.maxInputCharacters)
    .times(4)
    .times(inputPrice)
    .plus(new Decimal(fixtures.maxOutputTokens).times(outputPrice))
    .div(1_000_000)
    .times(fixtures.maximumRequests)
    .toNumber();
}

export function assertRevisionPolicy(permit: Experiment) {
  const policy = permit.policy;
  if (
    permit.scenario !== "robustness_case" ||
    !revisionCases.some((c) => c.id === permit.developmentCaseId) ||
    policy.model !== fixtures.model ||
    policy.deepSeekThinking !== fixtures.thinking ||
    policy.answerPolicyVariant !== fixtures.policy ||
    policy.maxInputCharacters !== fixtures.maxInputCharacters ||
    policy.maxOutputTokens !== fixtures.maxOutputTokens ||
    policy.researchEvidenceContract !== undefined ||
    policy.gptOssReasoningEffort !== undefined ||
    policy.glmReasoningEffort !== undefined ||
    policy.gemmaThinking !== undefined
  )
    throw Error("Frozen revision batch configuration mismatch");
}
