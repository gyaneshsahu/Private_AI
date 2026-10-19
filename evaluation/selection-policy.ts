export const selectionModels = {
  deepseek: {
    model: "deepseek-v4-1-flash",
    deepSeekThinking: true,
    deepSeekReasoningEffort: "low",
    input: 0.65,
    output: 1.45,
  },
  gemma: { model: "gemma4-31b", gemmaThinking: false, input: 0.4, output: 1 },
  glm: {
    model: "glm-5-3",
    glmReasoningEffort: "low",
    input: 1.8,
    output: 5.75,
  },
} as const;
export function assertSelectionPolicy(
  policy: Record<string, unknown>,
  cell: string,
) {
  const spec = selectionModels[cell as keyof typeof selectionModels];
  if (!spec) throw Error("Unknown selection arm");
  for (const key of [
    "model",
    "deepSeekThinking",
    "deepSeekReasoningEffort",
    "gemmaThinking",
    "glmReasoningEffort",
    "gptOssReasoningEffort",
  ])
    if (policy[key] !== (spec as Record<string, unknown>)[key])
      throw Error("Selection model/configuration mismatch");
  if (
    policy.maxInputCharacters !== 8000 ||
    policy.maxOutputTokens !== 4096 ||
    policy.answerPolicyVariant !== "constraints-v4"
  )
    throw Error("Selection limits/prompt mismatch");
  const pricing = policy.pricing as {
    inputPerMillion?: number;
    outputPerMillion?: number;
  };
  if (
    pricing?.inputPerMillion !== spec.input ||
    pricing?.outputPerMillion !== spec.output
  )
    throw Error("Selection pricing mismatch");
}
