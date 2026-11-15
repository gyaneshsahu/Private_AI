// The paused state during a Privatemode manifest rotation (server/manifest-watch.ts) in the real
// app at phone, tablet and desktop width, English and German: the existing notice shows the
// server's sentence in the interface language and Send stays off. Offline: the status is faked.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { PROVIDER_UPDATE_PAUSE } from "../server/manifest-watch";
import { serverMessage } from "../src/server-messages";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-provider-update-ui-test",
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

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`paused for a provider update at ${width} px, ${lang}`, async () => {
      const context = await browser.newContext({
        locale: lang === "de" ? "de-DE" : "en-US",
        viewport: { width, height: width < 700 ? 812 : 900 },
      });
      const page = await context.newPage();
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === "/api/status")
          return route.fulfill({
            json: {
              csrf: "SYNTHETIC",
              inference: { ready: false, reason: PROVIDER_UPDATE_PAUSE },
              search: false,
              operatorNotice: PROVIDER_UPDATE_PAUSE,
            },
          });
        return route.continue();
      });
      await page.goto(origin, { timeout: 90000 });
      await ui(page.locator("html")).toHaveAttribute("lang", lang);
      const notice = page.getByRole("status").filter({ hasText: appText[lang].operatorNoticeTitle });
      await ui(notice).toContainText(serverMessage(PROVIDER_UPDATE_PAUSE, lang));
      if (lang === "de") await ui(notice).not.toContainText(PROVIDER_UPDATE_PAUSE);
      await page.getByRole("textbox").first().fill("Hello");
      await ui(page.getByRole("button", { name: appText[lang].sendLabel })).toBeDisabled();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
      await context.close();
    }, 120_000);
