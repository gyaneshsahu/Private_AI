import { createServer, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import {
  inferenceRelayFor,
  registeredInferenceProviders,
  type InferenceRelayAdapter,
} from "../server/providers/inference-relay";
import "../server/providers/tinfoil-relay";
import { createTinfoilRelayAdapter } from "../server/providers/tinfoil-relay";
import { braveSearchProvider } from "../server/providers/search";
import {
  defaultInferenceProvider,
  inferenceClientFor,
} from "../src/providers/inference-client";
import "../src/providers/tinfoil-client";
import { Approvals } from "../server/research";
import { checks } from "../shared/contracts";

const qualification = {
  provider: "tinfoil" as const,
  model: "gemma4-31b",
  fallbackModel: "gpt-oss-120b",
  origin: "https://inference.example.test",
  repository: "tinfoilsh/confidential-model-router",
  releaseDigests: ["a".repeat(64)],
  reviewedAt: new Date(Date.now() - 60000).toISOString(),
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  review: Object.fromEntries(
    checks.map((check) => [
      check,
      {
        status: "pass" as const,
        evidence: ["synthetic fixture for the adapter contract test"],
      },
    ]),
  ) as Record<(typeof checks)[number], { status: "pass"; evidence: string[] }>,
  maxInputCharacters: 8000,
  maxOutputTokens: 1024,
  pricing: {
    inputPerMillion: 0.4,
    outputPerMillion: 1,
    currency: "USD" as const,
  },
  approvedSpendUSD: 1,
};

describe("relay adapter contract (server)", () => {
  it("registers exactly one adapter today and resolves it by the qualification's provider", () => {
    expect(registeredInferenceProviders()).toEqual(["tinfoil"]);
    expect(inferenceRelayFor("tinfoil").id).toBe("tinfoil");
    expect(() => inferenceRelayFor("nobody" as unknown as "tinfoil")).toThrow(
      /No inference relay adapter/,
    );
  });

  it("keeps every supplier header, pin and metering format inside the Tinfoil adapter", () => {
    const relay = createTinfoilRelayAdapter();
    const key = "b".repeat(64);
    const body = Buffer.alloc(32, 1);
    const good = relay.admit(
      {
        "x-tinfoil-enclave-url": qualification.origin,
        "ehbp-encapsulated-key": key,
        "x-tinfoil-model": "gpt-oss-120b",
      },
      body,
      qualification,
    );
    expect(good).toEqual({
      ok: true,
      model: "gpt-oss-120b",
      encapsulatedKey: key,
    });
    const defaulted = relay.admit(
      {
        "x-tinfoil-enclave-url": qualification.origin,
        "ehbp-encapsulated-key": key,
      },
      body,
      qualification,
    );
    expect(defaulted).toMatchObject({ ok: true, model: "gemma4-31b" });
    for (const headers of [
      {
        "x-tinfoil-enclave-url": "https://other.example.test",
        "ehbp-encapsulated-key": key,
      },
      {
        "x-tinfoil-enclave-url": qualification.origin,
        "ehbp-encapsulated-key": "short",
      },
      {
        "x-tinfoil-enclave-url": qualification.origin,
        "ehbp-encapsulated-key": key,
        "x-tinfoil-model": "deepseek-v4-1-flash",
      },
    ])
      expect(
        relay.admit(headers, body, qualification).ok,
        JSON.stringify(headers),
      ).toBe(false);
    expect(
      relay.admit(
        {
          "x-tinfoil-enclave-url": qualification.origin,
          "ehbp-encapsulated-key": key,
        },
        Buffer.alloc(4),
        qualification,
      ).ok,
    ).toBe(false);

    const plan = relay.upstream({
      qualification,
      apiKey: "TEST_ONLY",
      model: "gemma4-31b",
      encapsulatedKey: key,
    });
    expect(plan.url.href).toBe(`${qualification.origin}/v1/chat/completions`);
    expect(plan.headers).toMatchObject({
      Authorization: "Bearer TEST_ONLY",
      "X-Tinfoil-Model": "gemma4-31b",
      "X-Tinfoil-Request-Usage-Metrics": "true",
      "Ehbp-Encapsulated-Key": key,
    });

    expect(
      relay.accept({
        statusCode: 200,
        headers: {
          "ehbp-response-nonce": "n1",
          "content-type": "text/event-stream",
        },
        trailers: {},
      }),
    ).toEqual({
      ok: true,
      passthrough: {
        "Ehbp-Response-Nonce": "n1",
        "Content-Type": "text/event-stream",
      },
    });
    expect(
      relay.accept({ statusCode: 200, headers: {}, trailers: {} }).ok,
    ).toBe(false);
    expect(
      relay.classifyFailure({ statusCode: 422, headers: {}, trailers: {} }),
    ).toBe("rejected");
    expect(
      relay.classifyFailure({ statusCode: 503, headers: {}, trailers: {} }),
    ).toBe("unavailable");
    expect(
      relay.usage({
        statusCode: 200,
        headers: {},
        trailers: {
          "x-tinfoil-usage-metrics":
            "prompt=10,completion=5,total=15,model=gemma4-31b,cost_usd=0.000009",
        },
      }),
    ).toMatchObject({
      promptTokens: 10,
      completionTokens: 5,
      model: "gemma4-31b",
    });
    expect(relay.verificationHosts(qualification)).toContain(
      qualification.origin,
    );
  });

  it("lets the app take an injected relay adapter: the content security policy lists the adapter's verification hosts and nothing supplier-specific", async () => {
    const fake: InferenceRelayAdapter = {
      ...createTinfoilRelayAdapter(),
      id: "tinfoil",
      verificationHosts: () => ["https://verify.other.test"],
    };
    const server = await new Promise<Server>((resolve) => {
      const s = createServer();
      s.listen(0, "127.0.0.1", () => resolve(s));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw Error("port");
    const origin = `http://127.0.0.1:${address.port}`;
    server.on(
      "request",
      createApp({ origin, qualification, inferenceRelay: fake }),
    );
    try {
      const response = await fetch(origin + "/api/status");
      await response.body?.cancel();
      const csp = response.headers.get("content-security-policy") ?? "";
      expect(csp).toContain("https://verify.other.test");
      expect(csp).not.toContain("tinfoil");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("names the search recipient from the search adapter, not from the approvals", () => {
    const brave = braveSearchProvider("TEST_ONLY");
    expect(brave.id).toBe("brave");
    const approvals = new Approvals(Date.now, brave.recipientLabel);
    expect(
      approvals.issue("s1", { kind: "search", value: "public query" })
        .recipient,
    ).toBe("Brave Search API");
    const other = new Approvals(Date.now, "Other Search");
    expect(
      other.issue("s1", { kind: "search", value: "public query" }).recipient,
    ).toBe("Other Search");
  });
});

describe("inference client adapter contract (browser)", () => {
  it("resolves the default adapter and keeps routing headers and model switches inside it", () => {
    expect(defaultInferenceProvider).toBe("tinfoil");
    const client = inferenceClientFor("tinfoil");
    const base = {
      provider: "tinfoil" as const,
      origin: qualification.origin,
      repository: qualification.repository,
      releaseDigests: qualification.releaseDigests,
      model: "gemma4-31b",
    };
    expect(client.requestHeaders(base)).toEqual({
      "X-Tinfoil-Enclave-Url": qualification.origin,
      "X-Tinfoil-Model": "gemma4-31b",
    });
    expect(client.modelOptions(base)).toEqual({});
    expect(client.modelOptions({ ...base, gemmaThinking: false })).toEqual({
      chat_template_kwargs: { enable_thinking: false },
    });
    expect(
      client.modelOptions({
        ...base,
        model: "gpt-oss-120b",
        gptOssReasoningEffort: "high",
      }),
    ).toEqual({ reasoning_effort: "high" });
    expect(
      client.modelOptions({
        ...base,
        model: "deepseek-v4-1-flash",
        deepSeekThinking: true,
        deepSeekReasoningEffort: "low",
      }),
    ).toEqual({
      chat_template_kwargs: { thinking: true, reasoning_effort: "low" },
    });
    expect(() => inferenceClientFor("nobody" as unknown as "tinfoil")).toThrow(
      /No inference client adapter/,
    );
  });
});
