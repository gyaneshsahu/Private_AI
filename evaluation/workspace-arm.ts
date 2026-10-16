export function assertWorkspaceArm(
  permit: {
    developmentCaseId?: string;
    policy: {
      optionalCalculator?: boolean;
      assistedResearchContract?: boolean;
      scopedResearchContract?: boolean;
    };
  },
  caseId: string,
  arm: string,
  mode: "optional" | "assisted" | "scoped",
) {
  const enabled =
    mode === "optional"
      ? permit.policy.optionalCalculator
      : mode === "assisted"
        ? permit.policy.assistedResearchContract
        : permit.policy.scopedResearchContract;
  if (
    permit.developmentCaseId !== caseId ||
    !!enabled !== (arm === "candidate")
  )
    throw Error("Fixed case/configuration mismatch");
}
