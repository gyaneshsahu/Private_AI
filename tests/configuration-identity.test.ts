import { it, expect } from "vitest";
import { configurationIdentity } from "../evaluation/implementation";
import type { Experiment } from "../evaluation/experiment";
it("distinguishes model, limits, release, pricing and code without depending on property order", () => {
  const policy: Experiment["policy"] = {
    model: "fixture-model",
    origin: "https://inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigests: ["b".repeat(64), "a".repeat(64)],
    maxInputCharacters: 8000,
    maxOutputTokens: 2048,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6, currency: "USD" },
  };
  const original = configurationIdentity("fixture-code", policy);
  expect(
    configurationIdentity("fixture-code", {
      ...policy,
      releaseDigests: [...policy.releaseDigests].reverse(),
      pricing: {
        currency: "USD",
        outputPerMillion: 0.6,
        inputPerMillion: 0.15,
      },
    }),
  ).toBe(original);
  for (const changed of [
    { ...policy, model: "different-model" },
    { ...policy, gemmaThinking: true },
    { ...policy, gemmaThinking: false },
    { ...policy, maxOutputTokens: 4096 },
    { ...policy, releaseDigests: ["c".repeat(64)] },
    { ...policy, pricing: { ...policy.pricing, inputPerMillion: 1 } },
  ])
    expect(configurationIdentity("fixture-code", changed)).not.toBe(original);
  expect(configurationIdentity("different-code", policy)).not.toBe(original);
  expect(JSON.stringify(policy.releaseDigests)).toBe(
    JSON.stringify(["b".repeat(64), "a".repeat(64)]),
  );
});

it("distinguishes explicitly enabled and disabled thinking from provider defaults", () => {
  const p = {
    model: "gemma4-31b",
    origin: "https://inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigests: ["a".repeat(64)],
    maxInputCharacters: 8000,
    maxOutputTokens: 2048,
    pricing: {
      inputPerMillion: 0.4,
      outputPerMillion: 1,
      currency: "USD" as const,
    },
  };
  expect(
    new Set(
      [undefined, false, true].map((gemmaThinking) =>
        configurationIdentity("code", { ...p, gemmaThinking }),
      ),
    ).size,
  ).toBe(3);
});
