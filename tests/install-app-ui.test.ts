// The home-screen app in a real browser (docs/pwa-20261125.md), with the Settings row switched on:
// the start screen is there before the app and gone after it; Settings > General offers "Install
// CometRow" once the browser has offered an install, and starts the browser's own install; on an
// iPhone it says how; from the home screen it shows nothing. Phone and desktop, English and German.
process.env.VITE_INSTALL_APP = "1";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { openSettingsMenu } from "./fixtures/open-settings";
import { installText } from "../src/text/install";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  vite = await createServer({ logLevel: "silent", cacheDir: "node_modules/.vite-install-app-ui-test", server: { host: "127.0.0.1", port: 0, hmr: false } });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);
afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function open(width: number, lang: "en" | "de", o: { userAgent?: string; standalone?: boolean } = {}) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: 900 },
    hasTouch: width < 760,
    ...(o.userAgent ? { userAgent: o.userAgent } : {}),
  });
  context.setDefaultTimeout(15_000);
  if (o.standalone)
    await context.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => (query.includes("display-mode: standalone") ? ({ ...real(query), matches: true } as MediaQueryList) : real(query));
    });
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } }, search: false, accountId: "11111111-1111-4111-8111-111111111111", accountEmail: "synthetic@example.test" },
      });
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return route.abort();
    return route.continue();
  });
  return { context, page };
}

for (const width of [375, 1280])
  for (const lang of ["en", "de"] as const)
    it(`${width} px, ${lang}: start screen, then Install CometRow once the browser offers it`, async () => {
      const t = installText[lang];
      const { context, page } = await open(width, lang);
      try {
        // The page as the server sends it already shows the start screen, before any script has run.
        const raw = await (await context.request.get(origin + "/")).text();
        expect(raw).toContain('class="boot"');
        await page.goto(origin, { timeout: 30_000 });
        await ui(page.locator("html")).toHaveAttribute("lang", lang);
        // The app has replaced it.
        await ui(page.locator(".app-shell")).toBeVisible();
        await ui(page.locator(".boot")).toHaveCount(0);
        await openSettingsMenu(page, lang);
        const settings = page.locator("dialog.settings-dialog");
        const row = settings.locator(".install-app");
        // No offer from the browser yet, and not an iPhone: nothing to show.
        await ui(row).toHaveCount(0);
        // The browser offers an install (as Chrome does on Android and on a computer).
        await page.evaluate(() => {
          const event = new Event("beforeinstallprompt", { cancelable: true });
          Object.assign(event, {
            prompt: async () => void ((window as unknown as { __prompted: number }).__prompted = ((window as unknown as { __prompted?: number }).__prompted ?? 0) + 1),
            userChoice: Promise.resolve({ outcome: "accepted" }),
          });
          window.dispatchEvent(event);
          (window as unknown as { __prevented: boolean }).__prevented = event.defaultPrevented;
        });
        // The browser's own banner was held back; the row appears instead.
        expect(await page.evaluate(() => (window as unknown as { __prevented: boolean }).__prevented)).toBe(true);
        await ui(row.getByRole("heading", { name: t.heading })).toBeVisible();
        const install = row.getByRole("button", { name: t.install, exact: true });
        if (width < 760) expect((await install.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
        await install.click();
        expect(await page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(1);
        await ui(row.getByRole("status")).toHaveText(t.installed);
        // One offer, one use: the button is gone.
        await ui(install).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      } finally {
        await context.close();
      }
    });

it("on an iPhone the row says how to add it from Safari; opened from the home screen it shows nothing", async () => {
  for (const lang of ["en", "de"] as const) {
    const t = installText[lang];
    const phone = await open(375, lang, { userAgent: IPHONE });
    try {
      await phone.page.goto(origin, { timeout: 30_000 });
      await openSettingsMenu(phone.page, lang);
      const row = phone.page.locator("dialog.settings-dialog .install-app");
      await ui(row.getByText(t.appleSteps)).toBeVisible();
      await ui(row.getByRole("button")).toHaveCount(0);
    } finally {
      await phone.context.close();
    }
    const installed = await open(375, lang, { userAgent: IPHONE, standalone: true });
    try {
      await installed.page.goto(origin, { timeout: 30_000 });
      await openSettingsMenu(installed.page, lang);
      await ui(installed.page.locator("dialog.settings-dialog")).toBeVisible();
      await ui(installed.page.locator(".install-app")).toHaveCount(0);
    } finally {
      await installed.context.close();
    }
  }
});
