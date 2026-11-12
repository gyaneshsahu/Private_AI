// A synthetic Privatemode qualification report for offline tests. TEST ONLY: not a review,
// not provider evidence. The manifest is a fake; its digest is the one the report approves.
import { createHash } from "node:crypto";
import { checks } from "../../shared/contracts";
import { PRIVATEMODE_WASM_SHA256 } from "../../src/providers/privatemode-client";

export const fakeManifest = new TextEncoder().encode('{"synthetic":"manifest for tests"}');
export const fakeManifestDigest = createHash("sha256").update(fakeManifest).digest("hex");

export function privatemodeReport(overrides: Record<string, unknown> = {}) {
  return {
    provider: "privatemode",
    model: "glm-5.3-flash",
    origin: "https://api.privatemode.ai/",
    repository: "edgelesssys/privatemode-public",
    releaseDigests: [fakeManifestDigest],
    reviewedAt: new Date(Date.now() - 1000).toISOString(),
    validUntil: new Date(Date.now() + 600000).toISOString(),
    review: Object.fromEntries(
      checks.map((key) => [key, { status: "pass", evidence: ["TEST ONLY not provider evidence"] }]),
    ),
    maxInputCharacters: 5000,
    maxOutputTokens: 500,
    pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    approvedSpendUSD: 1,
    glmReasoningEffort: "low",
    modes: {
      fast: {
        model: "glm-5.3-flash",
        glmReasoningEffort: "low",
        maxOutputTokens: 1024,
        allowanceCost: 1,
      },
      thinking: {
        model: "glm-5.3",
        glmReasoningEffort: "max",
        backupModel: "glm-5.3-flash",
        maxOutputTokens: 4096,
        allowanceCost: 3,
      },
    },
    privatemode: {
      sdkVersion: "1.63.0",
      wasmSha256: PRIVATEMODE_WASM_SHA256,
      manifestReferenceValues: ["snp", "tdx"],
      nvidiaOCSPPolicy: "allowUnknown false, grace 0 (client)",
      portalKeyLimit: {
        source: "owner-reported",
        setAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
        requestsPerMinute: 20,
      },
      priceConversion: {
        inputPerMillionEUR: 0.85,
        outputPerMillionEUR: 0.85,
        vatRate: 0.19,
        usdPerEUR: 1,
        rateDate: "TEST ONLY, no rate",
      },
    },
    ...overrides,
  };
}
