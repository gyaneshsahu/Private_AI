// What the Memory screen and the project screen promise per storage mode (src/text/mode-copy.ts,
// docs/secure-copy-draft-20261116.md), in a real browser at phone, tablet and desktop width, in
// English and German. Offline: a fixture page with the components only; every request that is not
// this page's own GET is refused and recorded.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { memoryText } from "../src/text/memory";
import { forStorage, type Storage } from "../src/text/mode-copy";
import { projectText } from "../src/text/projects";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const ENTRY = "/tests/fixtures/storage-copy-entry.tsx";
const CANNOT_READ = /can(no|['’])t read|nicht lesen/i;
const DEVICE_ONLY =
  /only on this device|server stores none|never can|(stored|kept|saved) (only )?(on|in) (this device|your encrypted vault)|(deleted|removed) from this device|nur auf diesem Gerät|speichert keine|wir nie|auf diesem Gerät gespeichert|von diesem Gerät (gelöscht|entfernt)|Tresor|vault/i;

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-storage-copy-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest(ENTRY);
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

async function open(width: number, lang: "en" | "de", query: string) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const outside: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") {
      outside.push(`${route.request().method()} ${url.href}`);
      return route.abort();
    }
    if (url.pathname === "/copy")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/copy",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="${ENTRY}"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(`${origin}/copy${query}`, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, outside };
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const readable = (page: Page) =>
  page.evaluate(() => document.body.innerText + "\n" + [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join("\n"));

/** Opens both screens and their delete questions; returns everything that was readable. */
async function visit(width: number, lang: "en" | "de", storage: Storage) {
  const m = forStorage(memoryText[lang], storage);
  const p = forStorage(projectText[lang], storage);
  const seen: string[] = [];
  const pages: Page[] = [];
  try {
    // The Memory screen, then each delete question (cancelled).
    const memory = await open(width, lang, `?storage=${storage}`);
    pages.push(memory.page);
    const page = memory.page;
    await ui(page.getByText(m.intro)).toBeVisible();
    await ui(page.getByText(m.notUsed)).toBeVisible();
    const confirm = page.locator("dialog.confirm-dialog");
    await page.getByRole("listitem").filter({ hasText: "Leipzig" }).getByRole("button", { name: m.delete, exact: true }).click();
    await ui(confirm.getByText(m.deleteText)).toBeVisible();
    seen.push(await readable(page));
    await confirm.getByRole("button", { name: m.cancel }).click();
    await page.getByRole("button", { name: m.forgetAll }).click();
    await ui(confirm.getByText(m.forgetAllText(2))).toBeVisible();
    const box = (await confirm.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    seen.push(await readable(page));
    await confirm.getByRole("button", { name: m.cancel }).click();
    await noSidewaysScroll(page);
    expect(memory.outside).toEqual([]);

    // The project screen and its delete question (cancelled).
    const project = await open(width, lang, `?view=project&storage=${storage}`);
    pages.push(project.page);
    const panel = project.page.locator("dialog.project-dialog");
    await ui(panel.getByText(p.instructionsIntro)).toBeVisible();
    await ui(panel.getByText(p.filesIntro)).toBeVisible();
    // Secure has no backup file, so no line about it.
    if (storage === "secure") await ui(panel.getByText(projectText[lang].notInBackup)).toHaveCount(0);
    else await ui(panel.getByText(p.notInBackup)).toBeVisible();
    await panel.getByRole("button", { name: p.delete, exact: true }).click();
    const question = project.page.locator("dialog.confirm-dialog");
    await ui(question.getByText(p.deleteText)).toBeVisible();
    seen.push(await readable(project.page));
    await question.getByRole("button", { name: p.cancel }).click();
    await ui(question).toHaveCount(0);
    await noSidewaysScroll(project.page);
    // No always-present notice (end-to-end tests look for THE one role=status).
    await ui(project.page.getByRole("status")).toHaveCount(0);
    expect(project.outside).toEqual([]);
    return seen.join("\n");
  } finally {
    for (const page of pages) await page.context().close();
  }
}

for (const lang of LANGS)
  for (const width of WIDTHS) {
    it(`${lang} at ${width} px, Secure: saved to the account, no device-only or "cannot read" promise`, async () => {
      const all = await visit(width, lang, "secure");
      expect(all).not.toMatch(DEVICE_ONLY);
      expect(all).not.toMatch(CANNOT_READ);
      expect(all).toContain(lang === "de" ? "CometRow verwahrt den Schlüssel" : "CometRow holds the key");
    }, 60_000);
    it(`${lang} at ${width} px, Secure Max: a key only you hold, "cannot read" said here`, async () => {
      const all = await visit(width, lang, "max");
      expect(all).not.toMatch(DEVICE_ONLY);
      expect(all).toMatch(CANNOT_READ);
      expect(all).toContain(lang === "de" ? "den nur Sie haben" : "a key only you hold");
    }, 60_000);
  }

for (const lang of LANGS)
  it(`${lang}: without a storage mode the device vault's texts stay as they were`, async () => {
    const { page, outside } = await open(1280, lang, "");
    try {
      await ui(page.getByText(memoryText[lang].intro)).toBeVisible();
      // The check above would catch these texts on a Secure screen.
      expect(await readable(page)).toMatch(DEVICE_ONLY);
      expect(outside).toEqual([]);
    } finally {
      await page.context().close();
    }
  }, 60_000);
