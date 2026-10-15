import { expect, it } from "vitest";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("shows attribution warnings and opens the actual cited source in Chromium", async () => {
  const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  let browser;
  try {
    const origin = server.resolvedUrls!.local[0];
    browser = await chromium.launch(browserLaunchOptions());
    const page = await browser.newPage();
    const external: string[] = [];
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin !== new URL(origin).origin) {
        external.push(route.request().url());
        await route.abort();
      } else if (route.request().url().endsWith("/attribution-test")) {
        await route.fulfill({
          contentType: "text/html",
          body: await server.transformIndexHtml(
            "/attribution-test",
            `<div id="root"></div><div id="opened"></div><script type="module" src="/tests/fixtures/attribution-entry.tsx"></script>`,
          ),
        });
      } else await route.continue();
    });
    await page.goto(new URL("attribution-test", origin).href);
    await page
      .getByText("quoted passages not found in their adjacent cited sources", {
        exact: false,
      })
      .waitFor();
    await page.getByRole("button", { name: "Inspection", exact: true }).click();
    expect(await page.locator("#opened").textContent()).toBe(
      "Inspection remains unfinished.",
    );
    expect(external).toEqual([]);
  } finally {
    await browser?.close();
    await server.close();
  }
}, 30000);
