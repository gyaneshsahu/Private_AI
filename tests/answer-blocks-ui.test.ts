// Answer blocks in a real browser (docs/answer-blocks-20261126.md), on one answer that uses all of
// them (tests/fixtures/answer-blocks-sample.ts): notes of three kinds, steps, a flow diagram with
// its loop and its words for screen readers, a layers diagram, a quick check whose answers open,
// tabs that switch (also by arrow key), a malformed block left as code, and nothing wider than the
// screen. Phone and desktop, light and dark. With the switch off the same text shows no block.
import { mkdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

vi.setConfig({ testTimeout: 90_000 });

let browser: Browser;
const servers: ViteDevServer[] = [];
async function serve(on: boolean) {
  // The switch is a build switch: one page server with it, one without.
  if (on) process.env.VITE_ANSWER_BLOCKS = "1";
  else delete process.env.VITE_ANSWER_BLOCKS;
  const vite = await createServer({ logLevel: "silent", cacheDir: `node_modules/.vite-answer-blocks-ui-test-${on ? "on" : "off"}`, server: { host: "127.0.0.1", port: 0, hmr: false } });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/answer-gallery-entry.tsx");
  await vite.waitForRequestsIdle();
  servers.push(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  return { vite, origin: `http://127.0.0.1:${address.port}` };
}
let on: Awaited<ReturnType<typeof serve>>;
let off: Awaited<ReturnType<typeof serve>>;

beforeAll(async () => {
  mkdirSync(".local/answer-blocks", { recursive: true });
  on = await serve(true);
  off = await serve(false);
  delete process.env.VITE_ANSWER_BLOCKS;
  browser = await chromium.launch(browserLaunchOptions());
}, 180_000);
afterAll(async () => {
  await browser?.close();
  for (const vite of servers) await vite.close();
});

async function open(server: typeof on, width: number, theme: "light" | "dark") {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 760, locale: "en-US" });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== server.origin) return route.abort();
    if (url.pathname === "/gallery")
      return route.fulfill({
        contentType: "text/html",
        body: await server.vite.transformIndexHtml("/gallery", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Blocks</title></head><body><div id="root"></div><script type="module" src="/tests/fixtures/answer-gallery-entry.tsx"></script></body></html>`),
      });
    return route.continue();
  });
  await page.goto(`${server.origin}/gallery?blocks=1&designed=1&theme=${theme}`, { timeout: 60_000 });
  await page.locator("[data-answer]").first().waitFor();
  await page.waitForTimeout(400);
  return { context, page, errors };
}

for (const width of [375, 1280])
  for (const theme of ["light", "dark"] as const)
    it(`${width} px, ${theme}: every block is drawn and works`, async () => {
      const { context, page, errors } = await open(on, width, theme);
      try {
        const answer = page.locator(".message-text");
        // Notes: three kinds, each from its label.
        await ui(answer.locator("blockquote.answer-callout")).toHaveCount(3);
        await ui(answer.locator("blockquote.answer-callout.caution")).toContainText("Watch out:");
        await ui(answer.locator("blockquote.answer-callout.conclusion")).toContainText("Conclusion:");
        // The flow: seven boxes, seven arrows, and the same in words for screen readers.
        const flow = answer.locator("figure.answer-diagram").first();
        await ui(flow.locator("svg")).toHaveAttribute("aria-label", "The loop of an agent");
        await ui(flow.locator(".answer-diagram-node")).toHaveCount(7);
        await ui(flow.locator(".answer-diagram-node.decision")).toHaveCount(1);
        await ui(flow.locator(".answer-diagram-edge path")).toHaveCount(7);
        await ui(flow.locator("ul.sr-only li")).toHaveCount(7);
        await ui(flow.locator("ul.sr-only")).toContainText("Goal reached? leads to Adjust the plan (no)");
        // The picture fits its frame.
        const frame = (await flow.boundingBox())!;
        const picture = (await flow.locator("svg").boundingBox())!;
        // On a wide screen the picture fits its frame; on a phone it keeps a readable size and the frame scrolls (the page does not).
        if (width >= 760) expect(picture.width).toBeLessThanOrEqual(frame.width);
        else expect(picture.width).toBeGreaterThanOrEqual(439);
        // Layers: four rows, the third with two parts.
        const layers = answer.locator("figure.answer-layers");
        await ui(layers.locator(".answer-layer")).toHaveCount(4);
        await ui(layers.locator(".answer-layer").nth(2).locator("> div")).toHaveCount(2);
        // Steps: four cards with their tags.
        await ui(answer.locator("ol.answer-steps > li")).toHaveCount(4);
        await ui(answer.locator("ol.answer-steps .answer-step-tag")).toHaveText(["Everywhere", "Common", "Growing", "Early"]);
        // Tabs: one case at a time, by click and by arrow key.
        const tabs = answer.getByRole("tab");
        const panel = answer.getByRole("tabpanel");
        await ui(tabs).toHaveCount(3);
        await ui(panel).toContainText("Reads a codebase");
        await tabs.nth(1).click();
        await ui(panel).toContainText("Searches, reads sources");
        await ui(panel).not.toContainText("Reads a codebase");
        await tabs.nth(1).press("ArrowRight");
        await ui(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
        await ui(tabs.nth(2)).toBeFocused();
        if (width < 760) expect((await tabs.first().boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
        // Quick check: the answer is hidden until asked for.
        const quiz = answer.getByRole("list", { name: "Quick check" });
        await ui(quiz.locator("> li")).toHaveCount(2);
        await ui(quiz.getByText("A chat answer is written once.", { exact: false })).toBeHidden();
        await quiz.getByText("Show the answer").first().click();
        await ui(quiz.getByText("A chat answer is written once.", { exact: false })).toBeVisible();
        // A block that does not fit its shape stays code.
        await ui(answer.locator(".code-block").filter({ hasText: "not a list" })).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
        await page.screenshot({ path: `.local/answer-blocks/blocks-${width}-${theme}.png`, fullPage: true });
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `.local/answer-blocks/top-${width}-${theme}.png` });
        await flow.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `.local/answer-blocks/flow-${width}-${theme}.png` });
        await answer.locator("ol.answer-steps").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `.local/answer-blocks/steps-${width}-${theme}.png` });
      } finally {
        await context.close();
      }
    });

it("with the switch off the same answer shows no block: its notes are plain quotes and its data is code", async () => {
  const { context, page, errors } = await open(off, 1280, "light");
  try {
    const answer = page.locator(".message-text");
    await ui(answer.locator("blockquote")).toHaveCount(3);
    await ui(answer.locator(".answer-callout, .answer-steps, .answer-diagram, .answer-quiz, .answer-explore")).toHaveCount(0);
    await ui(answer.locator(".code-block")).toHaveCount(6);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
