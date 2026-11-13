// German and English main screen in the actual application (offline: nothing is sent).
import { it } from "vitest";
import { chromium, expect as ui, type Page } from "@playwright/test";
import { createServer } from "vite";
import { workspaceControl } from "../evaluation/workspace-navigation";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";

// Every fixed English string of App.tsx that differs in German; none may remain on the German screen.
const english = Object.entries(appText.en)
  .filter(
    (entry): entry is [keyof typeof appText.en & string, string] =>
      typeof entry[1] === "string" &&
      entry[1].trim().length > 3 &&
      entry[1] !== appText.de[entry[0] as keyof typeof appText.de],
  )
  .map(([, text]) => text.trim());

it("a German browser gets the German main screen at phone and desktop width; the DE/EN switch changes it, is kept after a reload and sets <html lang>", async () => {
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
    await ui(page.getByRole("button", { name: "Senden ↑", exact: true })).toBeVisible();
    await ui(page.getByLabel("Anhänge und Werkzeuge", { exact: true })).toBeVisible();
    await ui(page.getByText("ETWAS KLARHEIT, NACH IHREN REGELN")).toBeVisible();
    await ui(page.getByRole("button", { name: /Schreiben oder überarbeiten/ })).toBeVisible();
    await ui(page.getByText(/Vorübergehender Chat · Nicht gespeichert/)).toBeVisible();
    await ui(page.getByText(/0 Nachrichten einbezogen · 0 Dateien/)).toBeVisible();
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
  const englishScreen = async (page: Page) => {
    await ui(page.locator("html")).toHaveAttribute("lang", "en");
    await ui(page.getByRole("heading", { level: 1 })).toHaveText("Conversation");
    await ui(page.getByLabel("Message CometRow")).toHaveAttribute(
      "placeholder",
      "What would you like to work through?",
    );
    await ui(page.getByRole("button", { name: "Send ↑", exact: true })).toBeVisible();
    await ui(page.getByText("A LITTLE CLARITY, ON YOUR TERMS")).toBeVisible();
  };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
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
      const languages = page.getByRole("group", { name: "Sprache" });
      await ui(languages).toBeInViewport();
      await ui(languages.getByRole("button", { name: "Deutsch" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      if (viewport.width < 760)
        ui(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          viewport.width,
        );

      // The switch changes the language at once and is kept in this browser after a reload.
      await languages.getByRole("button", { name: "English" }).click();
      await englishScreen(page);
      await page.reload();
      await englishScreen(page);
      await page
        .getByRole("group", { name: "Language" })
        .getByRole("button", { name: "Deutsch" })
        .click();
      await german(page);
      await page.reload();
      await german(page);

      // The language can also be changed in Settings (not only in the conversation header).
      await page.getByRole("group", { name: "Sprache" }).getByRole("button", { name: "English" }).click();
      await workspaceControl(page, "Settings").click();
      const settings = page.getByRole("dialog", { name: "Settings" });
      await settings.getByRole("group", { name: "Language" }).getByRole("button", { name: "Deutsch" }).click();
      await ui(page.getByRole("dialog", { name: "Einstellungen" })).toBeVisible();
      await ui(page.getByRole("dialog", { name: "Einstellungen" }).getByText("Ihre Sprachwahl wird nur in diesem Browser gespeichert.")).toBeVisible();
      await context.close();
    }
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
