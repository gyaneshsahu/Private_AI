// Outputs panel (src/OutputsPanel.tsx) alone in a real browser: rows and their order, every action,
// the downloads, the empty state, the keyboard, light and dark, phone width. Synthetic chat
// (tests/fixtures/outputs-panel-entry.tsx); nothing leaves the machine.
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { outputsText } from "../src/text/outputs";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const t = outputsText.en;
const TITLES = [
  t.board,
  "Synthetic packing list",
  "A lighthouse at dusk with a long, winding coastal path and gulls overhead",
  "A red fox sleeping in fresh snow under pine trees",
  "synthetic-itinerary.pdf",
];

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-outputs-panel-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  await vite.warmupRequest("/tests/fixtures/outputs-panel-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(width: number, height: number, query = "", lang: "en" | "de" = "en") {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    timezoneId: "Europe/Berlin",
    viewport: { width, height },
    hasTouch: width < 760,
    acceptDownloads: true,
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
    if (url.pathname === "/outputs-panel")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/outputs-panel",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/outputs-panel-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(origin + "/outputs-panel" + query, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const panel = (page: Page) => page.getByRole("complementary", { name: t.title });
const row = (page: Page, title: string) => panel(page).getByRole("listitem").filter({ hasText: title });
const calls = (page: Page) => page.evaluate(() => (window as unknown as { outputsCalls: string[] }).outputsCalls);
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

it("lists the chat's outputs in order, and every action reaches its callback", async () => {
  const page = await open(1280, 800);
  try {
    await ui(panel(page).getByRole("heading", { name: t.title })).toBeVisible();
    // Board, canvas, newest image first, then the document; the search result is not a file.
    await ui(panel(page).locator(".outputs-title")).toHaveText(TITLES);
    await ui(panel(page).getByText("Search: synthetic weather")).toHaveCount(0);
    await ui(row(page, t.board).locator(".outputs-detail")).toHaveText(t.boardDetail(3, "17 Nov, 14:05"));
    await ui(panel(page).getByText(t.note)).toBeVisible();
    // Both thumbnails are the pictures themselves, decoded.
    for (const img of await panel(page).locator(".outputs-preview img").all())
      await ui.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);

    await row(page, t.board).getByRole("button", { name: t.open }).click();
    await row(page, t.board).getByRole("button", { name: t.download }).click();
    await row(page, TITLES[1]).getByRole("button", { name: t.open }).click();
    await row(page, TITLES[2]).getByRole("button", { name: t.showInChat }).click();
    await row(page, TITLES[3]).getByRole("button", { name: t.showInChat }).click();
    await row(page, TITLES[4]).getByRole("button", { name: t.open }).click();
    await panel(page).getByRole("button", { name: t.close }).click();
    // The row itself is a mouse shortcut for its first action.
    await row(page, TITLES[3]).locator(".outputs-title").click();
    expect(await calls(page)).toEqual(["openBoard", "downloadBoard", "openCanvas", "show:img-new", "show:img-old", "openFiles", "close", "show:img-old"]);
    await ui(row(page, TITLES[4]).getByRole("button")).toHaveCount(1);

    // Image: a link to a blob URL with the app's file name, and the download carries the picture.
    const link = row(page, TITLES[2]).getByRole("link", { name: t.download });
    await ui(link).toHaveAttribute("download", "cometrow-image.png");
    await ui(link).toHaveAttribute("href", /^blob:http:\/\/127\.0\.0\.1:\d+\//);
    const [picture] = await Promise.all([page.waitForEvent("download"), link.click()]);
    expect(picture.suggestedFilename()).toBe("cometrow-image.png");
    expect((await readFile((await picture.path())!)).subarray(1, 4).toString()).toBe("PNG");

    // Canvas: the Markdown text as a .md file named after the chat.
    const [markdown] = await Promise.all([page.waitForEvent("download"), row(page, TITLES[1]).getByRole("button", { name: t.download }).click()]);
    expect(markdown.suggestedFilename()).toBe("Synthetic-trip-plan.md");
    expect(await readFile((await markdown.path())!, "utf8")).toBe("# Synthetic packing list\n\n- Tent\n- Stove");
  } finally {
    await page.context().close();
  }
}, 60_000);

it("every action is reachable with the keyboard, in reading order", async () => {
  const page = await open(1280, 800);
  try {
    await ui(panel(page).locator(".outputs-preview img")).toHaveCount(2);
    const reached: string[] = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("Tab");
      reached.push(await page.evaluate(() => `${document.activeElement?.closest("li")?.querySelector(".outputs-title")?.textContent ?? "head"}|${document.activeElement?.getAttribute("aria-label")}`));
    }
    expect(reached).toEqual([
      `head|${t.close}`,
      `${TITLES[0]}|${t.open}`,
      `${TITLES[0]}|${t.download}`,
      `${TITLES[1]}|${t.open}`,
      `${TITLES[1]}|${t.download}`,
      `${TITLES[2]}|${t.showInChat}`,
      `${TITLES[2]}|${t.download}`,
      `${TITLES[3]}|${t.showInChat}`,
      `${TITLES[3]}|${t.download}`,
    ]);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    expect(await calls(page)).toEqual(["openFiles"]);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("a new chat shows one calm sentence; German words come from the text file", async () => {
  for (const lang of ["en", "de"] as const) {
    const page = await open(375, 812, "?empty", lang);
    try {
      const words = outputsText[lang];
      const aside = page.getByRole("complementary", { name: words.title });
      await ui(aside.getByRole("heading", { name: words.title })).toBeVisible();
      await ui(aside.getByText(words.empty)).toBeVisible();
      await ui(aside.getByRole("listitem")).toHaveCount(0);
      await ui(aside.getByText(words.note)).toHaveCount(0);
      await noSidewaysScroll(page);
    } finally {
      await page.context().close();
    }
  }
}, 60_000);

for (const [width, height] of [[1280, 800], [375, 812]])
  for (const theme of ["light", "dark"] as const)
    it(`${theme} at ${width} px: tokens, fit and touch targets`, async () => {
      const page = await open(width, height, theme === "dark" ? "?theme=dark" : "");
      try {
        await ui(panel(page).locator(".outputs-title")).toHaveText(TITLES);
        for (const img of await panel(page).locator(".outputs-preview img").all())
          await ui.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);
        // Title and detail follow the theme's --ink and --ink2 (src/chat-design.css); the background is .side-panel's.
        const colour = (selector: string) => panel(page).locator(selector).first().evaluate((el) => getComputedStyle(el).color);
        expect([await colour(".outputs-title"), await colour(".outputs-detail")]).toEqual(
          theme === "dark" ? ["rgb(237, 237, 240)", "rgb(177, 177, 186)"] : ["rgb(16, 24, 40)", "rgb(82, 93, 118)"],
        );
        if (width >= 1100) expect((await panel(page).boundingBox())!.x).toBeGreaterThan(width / 2);
        const box = (await panel(page).boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        if (width < 760) expect(box.width).toBe(width);
        await noSidewaysScroll(page);
        // Every control inside the panel, and 44 px touch targets on a phone.
        for (const control of await panel(page).locator("button, a").all()) {
          const b = (await control.boundingBox())!;
          expect(b.x + b.width).toBeLessThanOrEqual(width);
          if (width < 760) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
        }
        await page.screenshot({ path: `.local/ui-redesign/outputs-panel-${width}-${theme}.png` });
      } finally {
        await page.context().close();
      }
    }, 60_000);
