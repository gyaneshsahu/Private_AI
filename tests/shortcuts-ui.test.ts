// Keyboard shortcuts (docs/keyboard-shortcuts-20261116.md) in a real browser at 375, 768 and 1280 px,
// in English and German: the help dialog (labels, platform keys, focus kept inside and returned,
// Escape, no sideways scroll), the keys reaching their actions, the browser default blocked only
// when an action ran, and a confirmation dialog blocking every shortcut. Offline: nothing leaves 127.0.0.1.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { shortcutsText } from "../src/text/shortcuts";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const outside: string[] = [];

beforeAll(async () => {
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-shortcuts-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/shortcuts-entry.tsx");
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

async function open(width: number, lang: "en" | "de", apple = false) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 800 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  if (apple)
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "platform", { get: () => "MacIntel" });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
    });
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/shortcuts")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/shortcuts",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/shortcuts-entry.tsx"></script></body></html>`,
        ),
      });
    if (url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
  await page.goto(origin + "/shortcuts", { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  // Records, after the shortcuts' own listener, whether the browser default was blocked.
  await page.evaluate(() => {
    const w = window as unknown as { blocked: boolean[] };
    w.blocked = [];
    window.addEventListener("keydown", (event) => event.key !== "Shift" && event.key !== "Control" && event.key !== "Meta" && w.blocked.push(event.defaultPrevented));
  });
  return page;
}
const ran = (page: Page) => page.evaluate(() => (window as unknown as { ran: string[] }).ran.splice(0));
const blocked = (page: Page) => page.evaluate(() => (window as unknown as { blocked: boolean[] }).blocked.splice(0));
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: the shortcut help`, async () => {
      const t = shortcutsText[lang];
      const page = await open(width, lang);
      try {
        const opener = page.getByRole("button", { name: "Open shortcuts" });
        await opener.click();
        const dialog = page.getByRole("dialog", { name: t.title });
        await ui(dialog).toBeVisible();
        await ui(dialog).toHaveAccessibleDescription(t.intro);
        for (const label of [t.newChat, t.search, t.sidebar, t.composer, t.copyAnswer, t.copyCode, t.help])
          await ui(dialog.getByRole("term").filter({ hasText: label })).toBeVisible();
        const newChat = dialog.getByRole("definition").first();
        await ui(newChat).toHaveText(`${t.ctrl} + ${t.shift} + O`);
        await ui(dialog.getByRole("definition").nth(3)).toHaveText(`${t.shift} + ${t.esc}`);
        // Focus starts on Close and stays inside on Tab.
        const close = dialog.getByRole("button", { name: t.close });
        await ui(close).toBeFocused();
        await page.keyboard.press("Tab");
        await ui(close).toBeFocused();
        expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
        // Fits the screen.
        const box = (await dialog.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await noSidewaysScroll(page);
        // Escape closes and focus returns to the opener.
        await page.keyboard.press("Escape");
        await ui(dialog).toHaveCount(0);
        await ui(opener).toBeFocused();
        // Ctrl+/ opens and closes it; Close returns focus to where it was.
        await page.keyboard.press("Control+/");
        await ui(dialog).toBeVisible();
        await page.keyboard.press("Control+/");
        await ui(dialog).toHaveCount(0);
        await ui(opener).toBeFocused();
        await page.keyboard.press("Control+/");
        await dialog.getByRole("button", { name: t.close }).click();
        await ui(dialog).toHaveCount(0);
        await ui(opener).toBeFocused();
      } finally {
        await page.context().close();
      }
    }, 60_000);

it("each key reaches its action; the default is blocked only when one ran; dialogs block the rest", async () => {
  const page = await open(375, "en");
  try {
    await page.keyboard.press("Control+Shift+O");
    // Search opens the sidebar drawer (a modal dialog) and focuses its search box, also again while it is open.
    const search = page.locator(".history-search input");
    const drawer = page.locator("dialog.navigation-drawer");
    await page.keyboard.press("Control+k");
    await ui(drawer).toHaveAttribute("open");
    await ui(search).toBeFocused();
    await page.getByRole("button", { name: "Close navigation" }).focus();
    await page.keyboard.press("Control+k");
    await ui(search).toBeFocused();
    // The sidebar key closes the drawer; Shift+Escape goes to the message box.
    await page.keyboard.press("Control+Shift+S");
    await ui(drawer).not.toHaveAttribute("open");
    await page.keyboard.press("Shift+Escape");
    await ui(page.locator("#message-input")).toBeFocused();
    // Typing into the message box still works, and the copy shortcut works from there.
    await page.keyboard.type("hello");
    await page.keyboard.press("Control+Shift+C");
    await ui(page.locator("#message-input")).toHaveValue("hello");
    expect(await ran(page)).toEqual(["newChat", "search", "search", "sidebar", "composer", "copyAnswer"]);
    // 5 key presses, 5 typed letters, then the copy: only the shortcuts were blocked.
    expect(await blocked(page)).toEqual([true, true, true, true, true, false, false, false, false, false, true]);
    // A held key: one action, every repeat still blocked.
    await page.keyboard.down("Control");
    await page.keyboard.down("Shift");
    await page.keyboard.down("C");
    await page.keyboard.down("C");
    await page.keyboard.up("C");
    await page.keyboard.up("Shift");
    await page.keyboard.up("Control");
    expect(await ran(page)).toEqual(["copyAnswer"]);
    expect(await blocked(page)).toEqual([true, true]);
    // Nothing to copy (the action returned false) and Meta on Windows: the browser keeps the key.
    await page.keyboard.press("Control+Shift+Semicolon");
    await page.keyboard.press("Meta+Shift+O");
    expect(await ran(page)).toEqual([]);
    expect(await blocked(page)).toEqual([false, false]);
    // While the help is open, only its own key works.
    await page.keyboard.press("Control+/");
    await page.keyboard.press("Control+Shift+O");
    await page.keyboard.press("Control+/");
    expect(await ran(page)).toEqual(["help", "help"]);
    // A confirmation dialog takes every key, including the help's.
    await page.getByRole("button", { name: "Open confirmation" }).click();
    await page.keyboard.press("Control+Shift+O");
    await page.keyboard.press("Control+/");
    await ui(page.getByRole("dialog", { name: "Synthetic question" })).toBeVisible();
    expect(await ran(page)).toEqual([]);
  } finally {
    await page.context().close();
  }
}, 60_000);

for (const lang of LANGS)
  it(`${lang}: on a Mac the keys are Command, and Ctrl does nothing`, async () => {
    const t = shortcutsText[lang];
    const page = await open(375, lang, true);
    try {
      await page.keyboard.press("Control+Shift+O");
      expect(await ran(page)).toEqual([]);
      await page.keyboard.press("Meta+Shift+O");
      await page.keyboard.press("Meta+/");
      expect(await ran(page)).toEqual(["newChat", "help"]);
      const dialog = page.getByRole("dialog", { name: t.title });
      // ⌘ is shown; screen readers hear the key's name.
      await ui(dialog.getByRole("definition").first()).toHaveText(`⌘${t.command} + ${t.shift} + O`);
      await ui(dialog.locator("kbd [aria-hidden=true]").first()).toHaveText("⌘");
      await ui(dialog.getByText(t.ctrl, { exact: true })).toHaveCount(0);
      await noSidewaysScroll(page);
    } finally {
      await page.context().close();
    }
  }, 60_000);

it("sent nothing outside this machine", () => {
  expect(outside).toEqual([]);
});
