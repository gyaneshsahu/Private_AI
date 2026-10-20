import fidelityCases from "./cases/fidelity-transfer-20261020.json";
export const isFidelityCase = (id: string) =>
  fidelityCases.some((c) => c.id === id);
export function isWorkspaceCase(id: string) {
  return (
    /^(workspace|assisted|everyday|selection)-/.test(id) || isFidelityCase(id)
  );
}
export function assertWorkspaceArm(
  permit: {
    developmentCaseId?: string;
    policy: {
      optionalCalculator?: boolean;
      calculatorReplay?: boolean;
      calculatorContinuation?: boolean;
      assistedResearchContract?: boolean;
      scopedResearchContract?: boolean;
      checkedResponseContract?: boolean;
      researchEvidenceContract?: boolean;
    };
  },
  caseId: string,
  arm: string,
  mode: "optional" | "assisted" | "scoped" | "normal",
  replay = false,
  continuation = false,
) {
  if (mode === "normal") {
    if (
      permit.developmentCaseId !== caseId ||
      permit.policy.optionalCalculator ||
      permit.policy.calculatorReplay ||
      permit.policy.calculatorContinuation ||
      permit.policy.assistedResearchContract ||
      permit.policy.scopedResearchContract ||
      permit.policy.checkedResponseContract ||
      permit.policy.researchEvidenceContract
    )
      throw Error(
        "Normal comparison cannot enable experimental tools or contracts",
      );
    return;
  }
  const enabled =
    mode === "optional"
      ? permit.policy.optionalCalculator
      : mode === "assisted"
        ? permit.policy.assistedResearchContract
        : permit.policy.scopedResearchContract;
  if (
    permit.developmentCaseId !== caseId ||
    !!enabled !== (arm === "candidate") ||
    !!permit.policy.calculatorReplay !== (replay && arm === "candidate") ||
    !!permit.policy.calculatorContinuation !==
      (continuation && arm === "candidate")
  )
    throw Error("Fixed case/configuration mismatch");
}
