// Answer design in a real browser (docs/answer-design-20261125.md), on the answers the live model
// really gave (evaluation/answer-design/replies-20261125.json): key figures become tiles, a bold
// line before a list becomes its label, the opening is the lead, check-lists can be ticked, a
// table can be copied; nothing is wider than the screen; with the design off the same answers
// carry none of it. Phone and desktop, light and dark. Screenshots go to .local/answer-design/.
import { mkdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

vi.setConfig({ testTimeout: 90_000 });

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  mkdirSync(".local/answer-design", { recursive: true });
  vite = await createServer({ logLevel: "silent", cacheDir: "node_modules/.vite-answer-design-ui-test", server: { host: "127.0.0.1", port: 0, hmr: false } });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/answer-gallery-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);
afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(width: number, query: string) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 760, locale: "en-US" });
  context.setDefaultTimeout(15_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/gallery")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml("/gallery", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Answers</title></head><body><div id="root"></div><script type="module" src="/tests/fixtures/answer-gallery-entry.tsx"></script></body></html>`),
      });
    return route.continue();
  });
  await page.goto(`${origin}/gallery?${query}`, { timeout: 60_000 });
  await page.locator("[data-answer]").first().waitFor();
  await page.waitForTimeout(400);
  return { context, page, errors };
}

for (const width of [375, 1280])
  for (const theme of ["light", "dark"] as const)
    it(`${width} px, ${theme}: the real answers with the design on`, async () => {
      const { context, page, errors } = await open(width, `designed=1&theme=${theme}`);
      try {
        const answer = (id: string) => page.locator(`[data-answer="${id}"] .message-text.designed`);
        // The bills question: total and average are tiles; the chart is still drawn.
        const facts = answer("numbers").locator("dl.answer-facts");
        await ui(facts.locator("dt")).toHaveText(["Total", "Average"]);
        await ui(facts.locator("dd").first()).toContainText("535");
        // The opening is the lead, and a bold line before a list is that list's label.
        await ui(answer("decision").locator("p.answer-lead")).toHaveCount(1);
        await ui(answer("decision").locator("p.answer-label").first()).toContainText("Why buying suits you");
        // The study plan: a table that can be copied, and a check-list that can be ticked.
        const plan = answer("lernplan");
        await plan.getByRole("button", { name: "Copy table" }).first().click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^Tag\tZiel\r?\n1\t/); // Windows gives the clipboard its own line ends
        const tick = plan.getByRole("checkbox").first();
        await ui(tick).not.toBeChecked();
        await tick.check();
        await ui(tick).toBeChecked();
        if (width < 760) expect((await tick.boundingBox())!.width).toBeGreaterThanOrEqual(22);
        // Nothing is wider than the screen, and nothing broke.
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
        await page.screenshot({ path: `.local/answer-design/after-${width}-${theme}.png`, fullPage: true });
        for (const id of ["numbers", "decision", "lernplan", "study-guide", "how-to"]) await page.locator(`[data-answer="${id}"]`).screenshot({ path: `.local/answer-design/after-${id}-${width}-${theme}.png` });
      } finally {
        await context.close();
      }
    });

it("with the design off the same answers carry none of it", async () => {
  const { context, page, errors } = await open(1280, "designed=0&theme=light");
  try {
    await ui(page.locator(".message-text.designed")).toHaveCount(0);
    await ui(page.locator(".answer-facts, .answer-lead, .answer-label, .answer-table-copy")).toHaveCount(0);
    await ui(page.locator('[data-answer="lernplan"] input[type=checkbox]').first()).toBeDisabled();
    expect(errors).toEqual([]);
    await page.screenshot({ path: ".local/answer-design/before-1280-light.png", fullPage: true });
    for (const id of ["numbers", "decision", "lernplan", "study-guide", "how-to"]) await page.locator(`[data-answer="${id}"]`).screenshot({ path: `.local/answer-design/before-${id}-1280-light.png` });
  } finally {
    await context.close();
  }
});
