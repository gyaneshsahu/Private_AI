// Completeness warning in the conversation (owner decision, 12 November 2026): an answer that
// leaves out a figure the question asked for gets one plain warning; a complete answer gets none.
// Offline: a Vite plugin replaces src/inference.ts and the status is faked.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("warns when the answer leaves out a requested figure, and only then", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-completeness-ui-test",
    plugins: [
      {
        name: "synthetic-incomplete-answer",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // First answer: the VAT only. Second answer: VAT and total.
          return `export async function streamReply(c,q,csrf,signal,chunk){
            window.__n = (window.__n ?? 0) + 1;
            chunk(window.__n === 1 ? "VAT: 731.50 EUR" : "VAT: 731.50 EUR\\nTotal: 4,581.50 EUR");
            return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
          }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } }, search: false },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const ask = async () => {
      await page.getByLabel("Message CometRow").fill("Quote: 3,850.00 EUR net plus 19% VAT. What are the VAT and the total?");
      await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    };
    await ask();
    const first = page.locator("article.assistant").nth(0);
    await ui(first).toContainText("VAT: 731.50 EUR");
    await ui(first.locator(".arithmetic-check")).toHaveText(
      "This answer may not state every figure you asked for: missing total. Please check before you rely on it.",
    );
    await ask();
    const second = page.locator("article.assistant").nth(1);
    await ui(second).toContainText("Total: 4,581.50 EUR");
    await ui(second.locator(".arithmetic-check")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __n: number }).__n)).toBe(2);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
