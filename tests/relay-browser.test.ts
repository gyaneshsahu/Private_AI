import { it, expect } from "vitest";
import express from "express";
import { chromium } from "@playwright/test";
import { experimentGateway } from "../evaluation/experiment-gateway";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import type { Experiment } from "../evaluation/experiment";

it("actual experiment relay completes opaque bytes, surfaces truncation and cancels a stalled upstream", async () => {
  const permit: Experiment = {
    purpose: "SYNTHETIC_ONLY_NOT_PROVIDER_QUALIFICATION",
    scenario: "two_turn_invoice",
    approvalId: "offline-relay-fixture",
    approvedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    approvalEvidence: "TEST ONLY: no live request authorization",
    approvedCapUSD: 1,
    providerCapUSD: 1,
    providerLimitEvidence: "TEST ONLY: not account evidence",
    pricingEvidence: "TEST ONLY: not pricing evidence",
    pricingCheckedAt: new Date().toISOString(),
    browserPreflightEvidence: "TEST ONLY: controlled loopback peer",
    releaseReviewEvidence: "TEST ONLY: no approved release",
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
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    for (const cacheControl of ["no-store", "no-cache"]) {
      for (const mode of ["complete", "truncated", "cancel"] as const) {
        let upstreamSignal: AbortSignal | undefined;
        let cancelled = false;
        let index = 0;
        const options = {
          origin: "http://127.0.0.1",
          csrf: "TEST-CSRF",
          permit,
          forward: async (
            _body: Uint8Array,
            _key: string,
            signal: AbortSignal,
          ) => {
            upstreamSignal = signal;
            return new Response(
              new ReadableStream<Uint8Array>({
                async pull(controller) {
                  if (index++ === 0) {
                    controller.enqueue(new Uint8Array(32).fill(7));
                    return;
                  }
                  if (mode === "cancel") {
                    await new Promise<void>((resolve) => {
                      if (signal.aborted) resolve();
                      else
                        signal.addEventListener("abort", () => resolve(), {
                          once: true,
                        });
                    });
                    controller.error(new Error("TEST upstream aborted"));
                  } else {
                    await new Promise((resolve) => setTimeout(resolve, 20));
                    if (mode === "truncated")
                      controller.error(new Error("TEST truncated peer"));
                    else {
                      controller.enqueue(new Uint8Array(32).fill(8));
                      controller.close();
                    }
                  }
                },
                cancel() {
                  cancelled = true;
                },
              }),
              {
                headers: {
                  "Ehbp-Response-Nonce": "b".repeat(64),
                  "Content-Type": "application/octet-stream",
                },
              },
            );
          },
        };
        const { app, attempts } = experimentGateway(options);
        app.get("/", (_req, res) =>
          res.type("html").send("<title>TEST relay only</title>"),
        );
        // Header comparison exists only in this test; production always keeps no-store.
        const host = express();
        host.use((_req, res, next) => {
          const setHeader = res.setHeader.bind(res);
          res.setHeader = (name, value) =>
            setHeader(
              name,
              name.toLowerCase() === "cache-control" ? cacheControl : value,
            );
          next();
        });
        host.use(app);
        const server = host.listen(0, "127.0.0.1");
        await new Promise<void>((resolve) => server.once("listening", resolve));
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No port");
        options.origin = `http://127.0.0.1:${address.port}`;
        const page = await browser.newPage();
        const terminal: string[] = [];
        const external: string[] = [];
        page.on("requestfinished", (request) => {
          if (request.method() === "POST") terminal.push("FINISHED");
        });
        page.on("requestfailed", (request) => {
          if (request.method() === "POST")
            terminal.push(request.failure()?.errorText ?? "FAILED");
        });
        await page.route("**/*", (route) => {
          if (new URL(route.request().url()).origin !== options.origin) {
            external.push(route.request().url());
            return route.abort();
          }
          return route.continue();
        });
        try {
          await page.goto(options.origin);
          const result = await page.evaluate(
            async ({ mode, csrf }) => {
              try {
                const response = await fetch(
                  "/api/inference/v1/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      "X-PrivateAI-CSRF": csrf,
                      "X-Tinfoil-Enclave-Url": "https://inference.tinfoil.sh",
                      "Ehbp-Encapsulated-Key": "a".repeat(64),
                      "Content-Type": "application/octet-stream",
                    },
                    body: new Uint8Array(32).fill(9),
                  },
                );
                const reader = response.body!.getReader();
                const bytes: number[] = [];
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  bytes.push(...value);
                  if (mode === "cancel") {
                    await reader.cancel();
                    return { outcome: "CANCELLED", bytes };
                  }
                }
                return { outcome: "COMPLETE", bytes };
              } catch {
                return { outcome: "FAILED", bytes: [] };
              }
            },
            { mode, csrf: options.csrf },
          );
          await expect.poll(() => terminal.length).toBe(1);
          expect(external).toEqual([]);
          expect(attempts).toHaveLength(1);
          if (mode === "complete") {
            expect(result.bytes).toEqual([
              ...new Uint8Array(32).fill(7),
              ...new Uint8Array(32).fill(8),
            ]);
            expect(terminal).toEqual([
              cacheControl === "no-store" ? "net::ERR_ABORTED" : "FINISHED",
            ]);
            expect(attempts[0].responseFinished).toBe(true);
            expect(attempts[0].outcome).toBe(
              "ENCRYPTED_RESPONSE_RELAYED_NOT_YET_GRADED",
            );
            expect(cancelled).toBe(false);
            // A normal response close is not a client cancellation.
            expect(upstreamSignal?.aborted).toBe(false);
          } else if (mode === "truncated") {
            expect(result.outcome).toBe("FAILED");
            expect(terminal[0]).not.toBe("FINISHED");
            expect(attempts[0].outcome).toBe("FAILED_COST_UNKNOWN");
          } else {
            expect(result.outcome).toBe("CANCELLED");
            await expect.poll(() => upstreamSignal?.aborted).toBe(true);
            await expect
              .poll(() => attempts[0].outcome)
              .toBe("FAILED_COST_UNKNOWN");
          }
        } finally {
          await page.close();
          server.closeAllConnections();
          await new Promise<void>((resolve) => server.close(() => resolve()));
        }
      }
    }
  } finally {
    await browser.close();
  }
}, 30000);
