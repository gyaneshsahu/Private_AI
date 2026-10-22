import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  planEnclaveSearchHarness,
  validateEnclaveSearchPermit,
} from "../evaluation/enclave-search-harness";

const now = Date.parse("2026-10-23T10:00:00Z");
const permit = (overrides: Record<string, unknown> = {}) => ({
  purpose: "SYNTHETIC_ONLY_ENCLAVE_SEARCH_NOT_QUALIFICATION",
  approvalId: "enclave_search_20261023",
  approvedAt: "2026-10-23T09:00:00Z",
  expiresAt: "2026-10-24T09:00:00Z",
  approvalEvidence: "owner message of 23 October naming service, price and cap",
  spend: {
    service: "Tinfoil",
    priceEvidence: "pricing page read on 23 October; fee example in the guide",
    priceCheckedAt: "2026-10-23T08:30:00Z",
    capUSD: 1,
  },
  policy: {
    origin: "https://inference.tinfoil.sh",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigest: "b".repeat(64),
    model: "gpt-oss-120b",
    allowedDomains: ["en.wikipedia.org"],
    maxAgeHours: 720,
    query:
      "What is the boiling point of water at sea level in degrees Celsius?",
    maxRequests: 3,
    maxOutputTokens: 512,
  },
  ...overrides,
});

describe("enclave search harness (preparation only)", () => {
  it("accepts a current owner permit naming service, price and cap, and plans at most three sequential metered requests", () => {
    const plan = planEnclaveSearchHarness(
      validateEnclaveSearchPermit(permit(), now),
    );
    expect(plan.requests).toHaveLength(3);
    expect(plan.requests[0].rule).toContain("sent alone");
    for (const request of plan.requests) {
      expect(request.path).toBe("/v1/chat/completions");
      expect(request.headers["X-Tinfoil-Request-Usage-Metrics"]).toBe("true");
      expect(request.headers).not.toHaveProperty("X-Tinfoil-Events");
      expect(request.body.web_search_options.search_context_size).toBe("low");
      expect(request.body.web_search_options.filters.allowed_domains).toEqual([
        "en.wikipedia.org",
      ]);
      expect(request.body.web_search_options.pii_check_options).toEqual({});
      expect(
        request.body.web_search_options.prompt_injection_check_options,
      ).toEqual({});
      expect(request.body).not.toHaveProperty("previous_response_id");
      expect(request.body.stream_options.include_usage).toBe(true);
    }
    expect(plan.neverWritten).toContain("the model's reply text");
    expect(plan.durableRecord.queryHash).toMatch(/[a-f0-9]{64}/);
    expect(plan.spend.capUSD).toBe(1);
    expect(plan.feeFloorUSD).toBe(0.15);
  });

  it("refuses more than three requests, a cap above the owner's ceiling or below the fee floor, a missing price, and a private-looking query", () => {
    const policy = permit().policy;
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ spend: { ...permit().spend, capUSD: 0.1 } }),
        now,
      ),
    ).toThrow(/web search fee/);
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ policy: { ...policy, maxRequests: 4 } }),
        now,
      ),
    ).toThrow();
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ spend: { ...permit().spend, capUSD: 50 } }),
        now,
      ),
    ).toThrow();
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ spend: { ...permit().spend, priceEvidence: "" } }),
        now,
      ),
    ).toThrow();
    for (const query of [
      "Send the invoice to anna@example.com",
      "Check account 1234567890 balance",
      "Is DE89370400440532013000 a valid IBAN",
    ])
      expect(() =>
        validateEnclaveSearchPermit(
          permit({ policy: { ...policy, query } }),
          now,
        ),
      ).toThrow(/no email address/);
  });

  it("refuses an expired, not yet valid, or over-long permit and unknown fields", () => {
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ expiresAt: "2026-10-23T09:30:00Z" }),
        now,
      ),
    ).toThrow(/current/);
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ approvedAt: "2026-10-23T11:00:00Z" }),
        now,
      ),
    ).toThrow(/current/);
    expect(() =>
      validateEnclaveSearchPermit(
        permit({ expiresAt: "2026-11-23T09:00:00Z" }),
        now,
      ),
    ).toThrow(/seven days/);
    expect(() =>
      validateEnclaveSearchPermit(permit({ run: true }), now),
    ).toThrow();
  });

  it("ships an example permit with every owner value unset, and no network client", async () => {
    const example = JSON.parse(
      await readFile("evaluation/enclave-search-permit.example.json", "utf8"),
    );
    expect(() => validateEnclaveSearchPermit(example, now)).toThrow();
    expect(example.spend.capUSD).toBeNull();
    expect(example.policy.releaseDigest).toBeNull();
    const source = await readFile(
      "evaluation/enclave-search-harness.ts",
      "utf8",
    );
    expect(source).not.toMatch(/\bfetch\(|undici|node:https|node:http\b/);
    expect(source).toContain("PREPARATION ONLY");
  });
});
