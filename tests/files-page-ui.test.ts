// FE-06 and FE-10 (16 November) in the actual application at 375, 768 and 1280 px, English and
// German: the Conversation files page has the app's own "Choose files" button and takes dropped
// files; at five files the "+" items say why they are off, and a web search is still added (searches
// do not count). Offline: the status and the search routes are answered here, nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { attachLimitText } from "../src/text/attach-limits";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const outside: string[] = [];

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-files-page-ui-test",
    plugins: [
      {
        name: "no-provider",
        enforce: "pre",
        load(id) {
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts"))
            return `export async function streamReply(c,q,csrf,signal,chunk){ chunk("Synthetic answer."); return { input: 1, output: 1, total: 2, estimatedUSD: 0 }; }`;
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
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(lang: "en" | "de", width: number) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: width < 700 ? 812 : 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({ json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 100000 } }, search: true } });
    if (url.pathname === "/api/research/prepare") return route.fulfill({ json: { id: "synthetic-prepared" } });
    if (url.pathname === "/api/research/execute")
      return route.fulfill({
        json: { sources: [{ id: "synthetic-0001", title: "Synthetic result", text: "SYNTHETIC RESULT TEXT", url: "https://example.com/synthetic", retrievedAt: new Date().toISOString(), evidenceKind: "search-excerpt" }] },
      });
    return route.continue();
  });
  page.on("dialog", (dialog) => {
    outside.push(`native dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  await page.goto(origin, { timeout: 90_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const tools = (page: Page) => page.locator("details.tools-menu");
async function menu(page: Page, name: string) {
  if ((await tools(page).getAttribute("open")) === null) await tools(page).locator("summary").click();
  await tools(page).getByRole("button", { name, exact: true }).click();
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`${width} px, ${lang}: Conversation files takes drops, five files leave room for a search`, async () => {
      const t = appText[lang];
      const al = attachLimitText[lang];
      const page = await open(lang, width);
      try {
        await menu(page, t.conversationFiles);
        // The app's own button, in the page's language; the browser's file field is not shown.
        const choose = page.getByRole("button", { name: al.chooseFiles, exact: true });
        await ui(choose).toBeVisible();
        await ui(page.getByText(al.dropHere)).toBeVisible();
        await ui(page.getByLabel(t.addDocuments)).toBeHidden();
        expect((await choose.boundingBox())!.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
        // The button opens the file chooser.
        const [chooser] = await Promise.all([page.waitForEvent("filechooser"), choose.click()]);
        expect(chooser.isMultiple()).toBe(true);
        // Files dropped on this page are read (before 16 November the drop was swallowed here).
        expect(
          await page.locator("main").evaluate((main) => {
            const data = new DataTransfer();
            for (let i = 1; i <= 5; i++) data.items.add(new File([`SYNTHETIC NOTE ${i}`], `note-${i}.txt`, { type: "text/plain" }));
            const over = new DragEvent("dragover", { dataTransfer: data, bubbles: true, cancelable: true });
            main.dispatchEvent(over);
            const drop = new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true });
            main.dispatchEvent(drop);
            return over.defaultPrevented && drop.defaultPrevented;
          }),
        ).toBe(true);
        for (let i = 1; i <= 5; i++) await ui(page.locator(".content-view .panel label").filter({ hasText: `note-${i}.txt` })).toBeVisible({ timeout: 30_000 });
        await noSidewaysScroll(page);

        // Back in the chat: five files, so the file items are off and say why.
        await page.getByLabel(t.conversationActions, { exact: true }).click();
        await page.locator(".conversation-menu").getByRole("button", { name: t.tabConversation, exact: true }).click();
        await tools(page).locator("summary").click();
        await ui(tools(page).getByRole("button", { name: t.attachFile, exact: true })).toBeDisabled();
        await ui(tools(page).getByRole("button", { name: t.photoToText, exact: true })).toBeDisabled();
        await ui(tools(page).getByText(al.fileLimit(5))).toBeVisible();
        await ui(tools(page).getByRole("button", { name: t.attachFile, exact: true })).toHaveAccessibleDescription(al.fileLimit(5));
        await noSidewaysScroll(page);

        // A web search is still added: searches do not count toward the five files.
        await tools(page).getByRole("button", { name: t.tabResearch, exact: true }).click();
        await page.getByLabel(t.exactQuery).fill("synthetic public query");
        await page.getByRole("button", { name: t.reviewDisclosure }).click();
        await page.getByRole("button", { name: t.approve }).click();
        await page.getByRole("button", { name: t.prepareQuestion }).click();
        await menu(page, t.conversationFiles);
        await ui(page.locator(".content-view .panel label").filter({ hasText: t.searchResultsName })).toBeVisible();
      } finally {
        await page.context().close();
      }
    }, 90_000);

it("sent nothing outside this machine and asked no browser question", () => {
  expect(outside).toEqual([]);
});
