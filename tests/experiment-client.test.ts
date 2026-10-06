import { it, expect } from "vitest";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { existsSync } from "node:fs";
import { approvedLocalGet } from "../evaluation/network-observation";
import developmentCases from "../evaluation/cases/development.json";
import robustnessCases from "../evaluation/cases/robustness-development.json";
import transferCases from "../evaluation/cases/repair-transfer.json";
import { invoiceText } from "../evaluation/experiment";
const allCases = [...developmentCases, ...robustnessCases, ...transferCases];

it("runs real browser extraction and follow-up state with an explicitly mocked model, and stops on unknown cost", async () => {
  const vite = await createServer({
    configFile: false,
    cacheDir: "node_modules/.vite-experiment-client-test",
    appType: "custom",
    logLevel: "silent",
    optimizeDeps: {
      force: true,
      noDiscovery: true,
      include: ["pdfjs-dist", "tesseract.js", "zod"],
    },
    plugins: [
      {
        name: "synthetic-test-model-only",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/verified-chat.ts"))
            return;
          // Mock before dependency discovery, not after Vite scans the real SDK.
          return `
          export async function streamVerifiedConversation(c, policy, csrf, signal, chunk, status, authorize) {
            authorize();
            if (window.mockModuleFailure) { status("Loading inference libraries…"); throw new TypeError("Failed to fetch dynamically imported module: SECRET_TEST_MARKER"); }
            window.mockCalls.push(structuredClone(c));
            chunk('MOCK response; not model-quality evidence.');
            if (window.mockUnknownUsage) return undefined;
            return {input: 1, output: 1, total: 2, estimatedUSD: 0};
          }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  vite.middlewares.use((req, res, next) => {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end("<!doctype html><title>MOCK experiment test</title>");
    } else next();
  });
  await vite.listen();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw new Error();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ??
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  });
  const external: string[] = [];
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (!approvedLocalGet(url.href, route.request().method(), origin)) {
        external.push(url.hostname);
        await route.abort();
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin);
    // String keeps Vitest's SSR transform out of the browser's native import.
    await page.evaluate("import('/evaluation/browser-entry.ts')");
    expect(await page.evaluate(() => "privateAiSyntheticRun" in window)).toBe(
      true,
    );
    const result = await page.evaluate(async (fixtures) => {
      const state = window as unknown as {
        mockCalls: Array<{ messages: Array<{ text: string }> }>;
        mockUnknownUsage: boolean;
        mockModuleFailure: boolean;
      };
      state.mockCalls = [];
      state.mockUnknownUsage = false;
      const { privateAiSyntheticRun: runSynthetic } = window as unknown as {
        privateAiSyntheticRun: (input: unknown, csrf: string) => Promise<any>;
      };
      const permit = {
        purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
        approvalId: "browser-mock-only",
        approvedAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        approvalEvidence: "TEST MOCK: no approval exists",
        approvedCapUSD: 1,
        providerCapUSD: 1,
        providerLimitEvidence: "TEST MOCK: no provider limit",
        pricingEvidence: "TEST MOCK: no actual prices",
        pricingCheckedAt: new Date().toISOString(),
        browserPreflightEvidence: "TEST MOCK: not provider evidence",
        releaseReviewEvidence: "TEST MOCK: not release evidence",
        policy: {
          origin: "https://inference.tinfoil.sh",
          repository: "tinfoilsh/confidential-model-router",
          releaseDigests: ["a".repeat(64)],
          model: "test-only",
          maxInputCharacters: 8000,
          maxOutputTokens: 512,
          pricing: { inputPerMillion: 1, outputPerMillion: 1, currency: "USD" },
        },
      };
      const completed = await runSynthetic(permit, "fixture");
      const calls = state.mockCalls;
      state.mockCalls = [];
      const compatibility = await runSynthetic(
        {
          ...permit,
          scenario: "adapter_compatibility",
          policy: {
            ...permit.policy,
            model: "gpt-oss-120b",
            maxInputCharacters: 2000,
          },
        },
        "fixture",
      );
      const compatibilityCalls = state.mockCalls.length;
      const everyday = [];
      for (const scenario of [
        "writing_revision",
        "everyday_planning",
        "planning_transfer",
      ]) {
        state.mockCalls = [];
        const outcome = await runSynthetic({ ...permit, scenario }, "fixture");
        everyday.push({ outcome, calls: state.mockCalls });
      }
      const development = [];
      for (const fixture of fixtures) {
        state.mockCalls = [];
        const outcome = await runSynthetic(
          {
            ...permit,
            scenario: fixture.id.startsWith("robustness-")
              ? "robustness_case"
              : "development_case",
            developmentCaseId: fixture.id,
          },
          "fixture",
        );
        development.push({ outcome, calls: state.mockCalls });
      }
      state.mockCalls = [];
      state.mockUnknownUsage = true;
      const unknownCost = await runSynthetic(permit, "fixture");
      const unknownCalls = state.mockCalls.length;
      state.mockModuleFailure = true;
      const moduleFailure = await runSynthetic(permit, "fixture");
      return {
        development,
        everyday,
        compatibility,
        compatibilityCalls,
        moduleFailure,
        completed,
        calls,
        unknownCost,
        unknownCalls,
      };
    }, allCases);
    expect(result.compatibilityCalls).toBe(1);
    expect(result.development).toHaveLength(34);
    for (const [index, task] of result.development.entries()) {
      const fixture = allCases[index];
      expect(task.outcome.failure).toBeNull();
      expect(task.calls).toHaveLength(2);
      expect(task.calls[0].messages[0].text).toBe(fixture.turns[0]);
      expect(task.calls[1].messages[2].text).toBe(fixture.turns[1]);
      expect(
        task.outcome.conversation.attachments
          .flatMap(
            (a: { sources: Array<{ id: string; text: string }> }) => a.sources,
          )
          .map((source: { id: string; text: string }) => ({
            id: source.id,
            text: source.text,
          })),
      ).toEqual(fixture.sources);
    }
    for (const task of result.everyday) {
      expect(task.outcome.failure).toBeNull();
      expect(task.outcome.conversation.attachments).toHaveLength(0);
      expect(task.calls).toHaveLength(2);
      expect(task.calls[1].messages).toHaveLength(3);
    }
    expect(result.everyday[0].calls[1].messages[2].text).toContain(
      "Sunday 18 October",
    );
    expect(result.everyday[1].calls[1].messages[2].text).toContain(
      "replace it with Friday",
    );
    expect(result.compatibility.conversation.attachments).toHaveLength(0);
    expect(result.compatibility.conversation.messages).toHaveLength(2);
    expect(external).toEqual([]);
    expect(result.moduleFailure.diagnostic).toEqual({
      stage: "Loading inference libraries…",
      category: "MODULE_LOAD_FAILED",
    });
    expect(JSON.stringify(result.moduleFailure)).not.toContain(
      "SECRET_TEST_MARKER",
    );
    expect(
      result.completed.failure,
      JSON.stringify(result.completed.diagnostic),
    ).toBeNull();
    expect(result.completed.conversation.messages).toHaveLength(4);
    expect(result.completed.conversation.attachments[0].sources[0].text).toBe(
      invoiceText,
    );
    expect(result.calls).toHaveLength(2);
    expect(result.calls[1].messages).toHaveLength(3);
    expect(result.calls[1].messages[2].text).toContain("EUR 10.00");
    expect(result.unknownCalls).toBe(1);
    expect(result.unknownCost.failure).toContain("stopped");
    expect(result.completed.providerQualification).toBe("NOT_PASSED");
  } finally {
    await browser.close();
    await vite.close();
  }
}, 30000);
