// Provider-agnostic qualification contract (Stage 3, plan points 3 to 5): Privatemode reports
// validate with their own origin, repository and evidence block; GLM settings work for both
// providers' model IDs; family aliases are refused. Synthetic fixtures only.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  policyForTier,
  qualifiedModels,
  validateQualification,
} from "../shared/contracts";
import { PRIVATEMODE_WASM_SHA256 } from "../src/providers/privatemode-client";
import { privatemodeReport } from "./fixtures/privatemode-report";

it("accepts a Privatemode report with modes and GLM settings on Privatemode's exact IDs", () => {
  const report = validateQualification(privatemodeReport());
  expect(report.provider).toBe("privatemode");
  expect([...qualifiedModels(report)].sort()).toEqual(["glm-5.3", "glm-5.3-flash"]);
  // Each tier keeps its own model's settings; the backup is the same provider.
  const thinking = policyForTier(report, "thinking", "primary");
  expect(thinking).toMatchObject({ provider: "privatemode", model: "glm-5.3", glmReasoningEffort: "max", maxOutputTokens: 4096 });
  const backup = policyForTier(report, "thinking", "backup");
  expect(backup).toMatchObject({ provider: "privatemode", model: "glm-5.3-flash", origin: "https://api.privatemode.ai/" });
  expect(policyForTier(report, "fast", "primary")).toMatchObject({ model: "glm-5.3-flash", glmReasoningEffort: "low" });
  // The Tinfoil ID keeps working for Tinfoil reports.
  expect(() =>
    validateQualification({
      ...privatemodeReport({ provider: "tinfoil", origin: "https://inference.tinfoil.sh/", repository: "tinfoilsh/confidential-model-router" }),
      privatemode: undefined,
      model: "glm-5-3",
      modes: undefined,
    }),
  ).not.toThrow();
});

it("refuses family aliases anywhere in the report", () => {
  for (const alias of ["glm-latest", "glm-flash-latest", "latest", "GLM-LATEST"]) {
    expect(() => validateQualification(privatemodeReport({ model: alias })), alias).toThrow();
    expect(() =>
      validateQualification(
        privatemodeReport({
          modes: {
            fast: { model: "glm-5.3-flash", backupModel: alias, maxOutputTokens: 1024, allowanceCost: 1 },
            thinking: { model: "glm-5.3", maxOutputTokens: 4096, allowanceCost: 3 },
          },
        }),
      ),
      alias,
    ).toThrow();
  }
});

it("enforces each provider's origin and repository, and the Privatemode evidence block exactly for Privatemode", () => {
  for (const bad of [
    { origin: "https://inference.tinfoil.sh/" },
    { origin: "https://api.privatemode.ai.example.test/" },
    { repository: "tinfoilsh/confidential-model-router" },
    { privatemode: undefined },
  ])
    expect(() => validateQualification(privatemodeReport(bad)), JSON.stringify(bad)).toThrow();
  // A Tinfoil report may not carry Privatemode evidence or an Edgeless repository.
  const tinfoil = privatemodeReport({ provider: "tinfoil", origin: "https://inference.tinfoil.sh/", repository: "tinfoilsh/x" });
  expect(() => validateQualification(tinfoil)).toThrow();
  expect(() => validateQualification({ ...tinfoil, privatemode: undefined, repository: "edgelesssys/privatemode-public" })).toThrow();
  // A GLM setting on a report without a GLM model is still refused.
  expect(() =>
    validateQualification(privatemodeReport({ model: "gpt-oss-120b", modes: undefined, glmReasoningEffort: "low" })),
  ).toThrow("model setting");
});

it("pins the same Wasm hash in the client, the installed package and the Privatemode draft report", () => {
  const installed = createHash("sha256")
    .update(readFileSync("node_modules/privatemode-ai/dist/privatemode.wasm"))
    .digest("hex");
  expect(PRIVATEMODE_WASM_SHA256).toBe(installed);
  const draft = JSON.parse(readFileSync("evaluation/qualification-drafts/privatemode-20261112.json", "utf8"));
  expect(draft.privatemode.wasmSha256).toBe(installed);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.dependencies["privatemode-ai"]).toBe(draft.privatemode.sdkVersion);
  // The draft names exact model IDs only.
  expect(JSON.stringify(draft)).not.toMatch(/-latest"/);
});

it("keeps the Privatemode draft unloadable until the model mapping, signature and owner limits are in", () => {
  const draft = JSON.parse(readFileSync("evaluation/qualification-drafts/privatemode-20261112.json", "utf8"));
  expect(() => validateQualification(draft)).toThrow();
  expect(draft.modes.status).toBe("PENDING_MODEL_MAPPING");
  // Both Fast candidates are listed, each already in the schema's tier shape at Privatemode.
  expect(draft.modes.fastCandidates.map((t: { model: string }) => t.model).sort()).toEqual(["glm-5.3", "glm-5.3-flash"]);
  for (const fast of draft.modes.fastCandidates)
    for (const thinking of draft.modes.thinkingCandidates)
      expect(() =>
        validateQualification(privatemodeReport({ model: fast.model, modes: { fast, thinking } })),
      ).not.toThrow();
  // Every check is a pass with evidence or clearly open; no other status sneaks in.
  for (const [check, entry] of Object.entries(draft.review) as [string, { status: string; evidence: string[] }][]) {
    expect(["pass", "needs-owner-acceptance", "open-pending-owner-approval-D17"], check).toContain(entry.status);
    expect(entry.evidence.length, check).toBeGreaterThan(0);
  }
});
