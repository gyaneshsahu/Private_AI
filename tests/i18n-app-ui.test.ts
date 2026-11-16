// German and English main screen in the actual application (offline: nothing is sent).
import { it } from "vitest";
import { chromium, expect as ui, type Page } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { settingsText } from "../src/text/settings";
import { workspaceText } from "../src/text/workspace";

// Every fixed English string of App.tsx that differs in German; none may remain on the German screen.
const english = Object.entries(appText.en)
  .filter(
    (entry): entry is [keyof typeof appText.en & string, string] =>
      typeof entry[1] === "string" &&
      entry[1].trim().length > 3 &&
      entry[1] !== appText.de[entry[0] as keyof typeof appText.de],
  )
  .map(([, text]) => text.trim());

it("a German browser gets the German main screen at phone, tablet and desktop width; the DE/EN switch in Settings changes it, is kept after a reload and sets <html lang>", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-i18n-app-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  const german = async (page: Page) => {
    await ui(page.locator("html")).toHaveAttribute("lang", "de");
    await ui(page.getByRole("heading", { level: 1 })).toHaveText("Unterhaltung");
    await ui(page.getByLabel("Nachricht an CometRow")).toHaveAttribute(
      "placeholder",
      "Was möchten Sie durchdenken?",
    );
    await ui(page.getByRole("button", { name: "Nachricht senden", exact: true })).toBeVisible();
    await ui(page.getByLabel("Anhänge und Werkzeuge", { exact: true })).toBeVisible();
    await ui(page.getByText("ETWAS KLARHEIT, NACH IHREN REGELN")).toBeVisible();
    await ui(page.getByRole("button", { name: /Schreiben oder überarbeiten/ })).toBeVisible();
    await ui(page.getByText(/Vorübergehender Chat · Nicht gespeichert/)).toBeVisible();
    // An empty chat shows no context count (16 November); the "+" menu's review is German.
    await ui(page.locator(".context-count")).toHaveCount(0);
    await ui(page.locator(".tools-menu .menu-surface")).toContainText("Kontext prüfen");
    const shown = await page.locator("main").innerText();
    // Whole words only: "Send" is part of "Senden".
    const left = english.filter((text) =>
      new RegExp(
        `(^|[^\\p{L}])${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`,
        "u",
      ).test(shown),
    );
    if (left.length) throw Error(`English left on the German screen: ${left.join(" | ")}`);
  };
  // The language choice lives in Settings, General (SS-15); Settings opens from the account menu.
  const openSettings = async (page: Page, lang: "en" | "de") => {
    const toggle = page.getByRole("button", { name: appText[lang].openNavigation });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByLabel(workspaceText[lang].accountMenu, { exact: true }).click();
    await page
      .getByRole("navigation", { name: workspaceText[lang].workspace })
      .getByRole("button", { name: workspaceText[lang].settings, exact: true })
      .click();
    const settings = page.getByRole("dialog", { name: appText[lang].settings });
    await ui(settings.getByRole("button", { name: settingsText[lang].general, exact: true })).toHaveAttribute("aria-current", "page");
    await ui(settings.getByRole("heading", { name: settingsText[lang].general })).toBeVisible();
    return settings;
  };
  const englishScreen = async (page: Page) => {
    await ui(page.locator("html")).toHaveAttribute("lang", "en");
    await ui(page.getByRole("heading", { level: 1 })).toHaveText("Conversation");
    await ui(page.getByLabel("Message CometRow")).toHaveAttribute(
      "placeholder",
      "What would you like to work through?",
    );
    await ui(page.getByRole("button", { name: "Send message", exact: true })).toBeVisible();
    await ui(page.getByText("A LITTLE CLARITY, ON YOUR TERMS")).toBeVisible();
  };
  try {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      const context = await browser.newContext({ locale: "de-DE", viewport });
      const page = await context.newPage();
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
        if (url.pathname === "/api/status")
          return route.fulfill({
            json: {
              csrf: "SYNTHETIC",
              inference: {
                ready: true,
                reason: "OFFLINE ONLY",
                qualification: { maxInputCharacters: 8000 },
              },
              search: false,
            },
          });
        return route.continue();
      });
      await page.goto(origin, { timeout: 30000 });
      await german(page);
      // No DE/EN switch in the app's header at any width (SS-15).
      await ui(page.locator(".conversation-header .language-switch")).toHaveCount(0);

      // The switch in Settings changes the language at once and is kept in this browser after a reload.
      let settings = await openSettings(page, "de");
      const languages = settings.getByRole("group", { name: "Sprache" });
      await ui(languages).toBeInViewport();
      await ui(languages.getByRole("button", { name: "Deutsch" })).toHaveAttribute("aria-pressed", "true");
      ui(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await languages.getByRole("button", { name: "English" }).click();
      settings = page.getByRole("dialog", { name: "Settings" });
      await ui(settings.getByText("Your language choice is kept only in this browser.")).toBeVisible();
      await settings.getByRole("button", { name: appText.en.closeSettings }).click();
      await ui(settings).toBeHidden();
      await englishScreen(page);
      await page.reload();
      await englishScreen(page);
      settings = await openSettings(page, "en");
      await settings.getByRole("group", { name: "Language" }).getByRole("button", { name: "Deutsch" }).click();
      settings = page.getByRole("dialog", { name: "Einstellungen" });
      await ui(settings.getByText("Ihre Sprachwahl wird nur in diesem Browser gespeichert.")).toBeVisible();
      await page.keyboard.press("Escape");
      await ui(settings).toBeHidden();
      await german(page);
      await page.reload();
      await german(page);
      await context.close();
    }
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
