export function assertWorkspaceArm(
  permit: {
    developmentCaseId?: string;
    policy: {
      optionalCalculator?: boolean;
      calculatorReplay?: boolean;
      assistedResearchContract?: boolean;
      scopedResearchContract?: boolean;
    };
  },
  caseId: string,
  arm: string,
  mode: "optional" | "assisted" | "scoped",
  replay = false,
) {
  const enabled =
    mode === "optional"
      ? permit.policy.optionalCalculator
      : mode === "assisted"
        ? permit.policy.assistedResearchContract
        : permit.policy.scopedResearchContract;
  if (
    permit.developmentCaseId !== caseId ||
    !!enabled !== (arm === "candidate") ||
    !!permit.policy.calculatorReplay !== (replay && arm === "candidate")
  )
    throw Error("Fixed case/configuration mismatch");
}
