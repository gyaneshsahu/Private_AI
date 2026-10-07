import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { validateExperiment, type Experiment } from "../evaluation/experiment";
import {
  experimentGateway,
  type Forward,
} from "../evaluation/experiment-gateway";
import { validateQualification, emptyConversation } from "../shared/contracts";
import { streamReply } from "../src/inference";
import { claimExperiment } from "../evaluation/run-claim";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fixture(): Experiment {
  return {
    purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
    approvalId: "test-fixture-only",
    scenario: "two_turn_invoice",
    approvedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    approvalEvidence: "TEST ONLY: no real spending approval",
    approvedCapUSD: 1,
    providerCapUSD: 1,
    providerLimitEvidence: "TEST ONLY: not a verified account limit",
    pricingEvidence: "TEST ONLY: not actual provider pricing",
    pricingCheckedAt: new Date().toISOString(),
    browserPreflightEvidence: "TEST ONLY: not a live browser result",
    releaseReviewEvidence: "TEST ONLY: not an approved release",
    policy: {
      origin: "https://inference.tinfoil.sh",
      repository: "tinfoilsh/confidential-model-router",
      releaseDigests: ["a".repeat(64)],
      model: "fixture-only",
      maxInputCharacters: 8000,
      maxOutputTokens: 512,
      pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
    },
  };
}
const servers: Server[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const server of servers.splice(0))
    await new Promise<void>((ok) => server.close(() => ok()));
});
async function gateway(forward: Forward) {
  const options = {
    origin: "http://127.0.0.1",
    csrf: "synthetic-test-csrf",
    permit: fixture(),
    forward,
  };
  const { app, attempts } = experimentGateway(options);
  const server = await new Promise<Server>((ok) => {
    const s = app.listen(0, "127.0.0.1", () => ok(s));
  });
  servers.push(server);
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error();
  options.origin = `http://127.0.0.1:${addr.port}`;
  const headers = {
    "X-PrivateAI-CSRF": options.csrf,
    "X-Tinfoil-Enclave-Url": options.permit.policy.origin,
    "Ehbp-Encapsulated-Key": "b".repeat(64),
    "Content-Type": "application/octet-stream",
  };
  const send = (changes = {}) =>
    fetch(options.origin + "/api/inference/v1/chat/completions", {
      method: "POST",
      headers: { ...headers, ...changes },
      body: Buffer.alloc(32, 7),
    });
  return { options, attempts, send };
}
const mockEncryptedResponse = async () =>
  new Response(new Uint8Array([1, 2, 3]), {
    headers: { "Ehbp-Response-Nonce": "synthetic-fixture" },
  });

describe("synthetic experiment gates (no provider calls)", () => {
  it("allows only frozen development case IDs and refuses reserved/custom prompts", () => {
    const base = {
      ...fixture(),
      scenario: "development_case",
      developmentCaseId: "development-planning-02",
    };
    expect(validateExperiment(base).developmentCaseId).toBe(
      "development-planning-02",
    );
    for (const developmentCaseId of [
      undefined,
      "heldout-planning-02",
      "../../private.txt",
      "unknown",
    ])
      expect(() =>
        validateExperiment({ ...base, developmentCaseId }),
      ).toThrow();
    expect(() =>
      validateExperiment({ ...base, turns: ["custom prompt"] }),
    ).toThrow();
    expect(() =>
      validateExperiment({ ...base, scenario: "two_turn_invoice" }),
    ).toThrow();
  });
  it("keeps supplemental cases separate and rejects cross-set or reserved IDs", () => {
    const base = {
      ...fixture(),
      scenario: "robustness_case",
      developmentCaseId: "robustness-writing-noisy",
    };
    expect(validateExperiment(base).scenario).toBe("robustness_case");
    for (const developmentCaseId of [
      "development-writing-01",
      "heldout-writing-01",
      undefined,
    ])
      expect(() =>
        validateExperiment({ ...base, developmentCaseId }),
      ).toThrow();
    expect(() =>
      validateExperiment({ ...base, scenario: "development_case" }),
    ).toThrow();
    expect(() => validateExperiment({ ...base, turns: ["custom"] })).toThrow();
  });
  it("consumes an approval atomically across concurrent starts and later restarts", async () => {
    const folder = await mkdtemp(join(tmpdir(), "privateai-claim-test-"));
    try {
      const results = await Promise.allSettled([
        claimExperiment(folder, "synthetic-only"),
        claimExperiment(folder, "synthetic-only"),
      ]);
      expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      await expect(claimExperiment(folder, "synthetic-only")).rejects.toThrow();
      await expect(claimExperiment(folder, "../escape")).rejects.toThrow();
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
  it("rejects incomplete, expired, oversized-permission and changed-destination permits", () => {
    expect(() => validateExperiment({})).toThrow();
    for (const change of [
      { expiresAt: "2000-01-01T00:00:00Z" },
      { providerCapUSD: 2 },
      { apiKey: "must-not-be-in-the-permit" },
      { approvalEvidence: "" },
      { policy: { ...fixture().policy, origin: "https://attacker.example" } },
      { policy: { ...fixture().policy, model: "auto" } },
      { policy: { ...fixture().policy, gemmaThinking: true } },
      { policy: { ...fixture().policy, glmReasoningEffort: "low" } },
      {
        policy: {
          ...fixture().policy,
          model: "glm-5-3",
          glmReasoningEffort: "unbounded",
        },
      },
    ])
      expect(() => validateExperiment({ ...fixture(), ...change })).toThrow();
  });
  it("cannot substitute an experiment permit for product qualification", async () => {
    expect(() => validateQualification(fixture())).toThrow();
    const network = vi.spyOn(globalThis, "fetch");
    await expect(
      streamReply(
        emptyConversation(),
        fixture(),
        "test",
        new AbortController().signal,
        () => {},
        () => {},
      ),
    ).rejects.toThrow();
    expect(network).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, forged CSRF and destination changes before forwarding", async () => {
    const forward = vi.fn(mockEncryptedResponse);
    const { send, attempts } = await gateway(forward);
    for (const headers of [
      { Origin: "https://attacker.example" },
      { "X-PrivateAI-CSRF": "forged" },
      { "X-Tinfoil-Enclave-Url": "https://attacker.example" },
      { "Ehbp-Encapsulated-Key": "invalid" },
    ])
      expect((await send(headers)).status).toBeGreaterThanOrEqual(400);
    expect(forward).not.toHaveBeenCalled();
    expect(attempts).toHaveLength(0);
  });
  it("rejects a synthetic plaintext canary even when headers look encrypted", async () => {
    const forward = vi.fn(mockEncryptedResponse);
    const { options, attempts } = await gateway(forward);
    const response = await fetch(
      options.origin + "/api/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "X-PrivateAI-CSRF": options.csrf,
          "X-Tinfoil-Enclave-Url": options.permit.policy.origin,
          "Ehbp-Encapsulated-Key": "b".repeat(64),
          "Content-Type": "application/octet-stream",
        },
        body: Buffer.from("SYNTHETIC-INVOICE-A in plaintext"),
      },
    );
    expect(response.status).toBe(400);
    expect(forward).not.toHaveBeenCalled();
    expect(attempts).toHaveLength(0);
  });
  it("forwards at most two requests and counts attempts before sending", async () => {
    const forward = vi.fn(mockEncryptedResponse);
    const { send, attempts } = await gateway(forward);
    for (let i = 0; i < 2; i++) {
      const r = await send();
      expect(r.status).toBe(200);
      await r.arrayBuffer();
    }
    expect((await send()).status).toBe(429);
    expect(forward).toHaveBeenCalledTimes(2);
    expect(attempts).toHaveLength(2);
    for (const attempt of attempts) {
      expect(attempt.upstreamHeadersMs).toBeGreaterThanOrEqual(0);
      expect(attempt.firstEncryptedByteMs).toBeGreaterThanOrEqual(
        attempt.upstreamHeadersMs!,
      );
      expect(attempt.elapsedMs).toBeGreaterThanOrEqual(
        attempt.firstEncryptedByteMs!,
      );
    }
  });
  it("stops after ambiguous failure without reflecting upstream plaintext", async () => {
    const forward = vi.fn(
      async () => new Response("PRIVATE UPSTREAM CANARY", { status: 500 }),
    );
    const { send, attempts } = await gateway(forward);
    const response = await send();
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("CANARY");
    expect((await send()).status).toBe(429);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(attempts[0].outcome).toBe("FAILED_COST_UNKNOWN");
    expect(attempts[0].upstreamHeadersMs).toBeGreaterThanOrEqual(0);
    expect(attempts[0].firstEncryptedByteMs).toBeNull();
  });
  it("rechecks expiry before each request", async () => {
    const forward = vi.fn(mockEncryptedResponse);
    const { send, options } = await gateway(forward);
    options.permit.expiresAt = "2000-01-01T00:00:00Z";
    expect((await send()).status).toBe(403);
    expect(forward).not.toHaveBeenCalled();
  });
});

it("enforces the compatibility scenario's one-request limit at the gateway", async () => {
  const forward = vi.fn(mockEncryptedResponse);
  const service = await gateway(forward);
  service.options.permit.scenario = "adapter_compatibility";
  service.options.permit.policy.model = "gpt-oss-120b";
  service.options.permit.policy.maxInputCharacters = 2000;
  const first = await service.send();
  expect(first.status).toBe(200);
  await first.arrayBuffer();
  const second = await service.send();
  expect(second.status).toBe(429);
  expect(forward).toHaveBeenCalledTimes(1);
  expect(service.attempts).toHaveLength(1);
});
