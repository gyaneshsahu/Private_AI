import { workspaceControl } from "../evaluation/workspace-navigation";
import { it } from "vitest";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("billing UI recovers from a lost checkout response without another POST", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("Missing port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    await page.clock.install();
    let posts = 0;
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) throw Error("Unexpected external request");
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "synthetic",
            billingRehearsal: true,
            inference: { ready: false, reason: "Unqualified" },
            search: false,
          },
        });
      if (url.pathname === "/api/billing/overview")
        return route.fulfill({
          json: {
            mode: "synthetic-rehearsal",
            plans: [
              {
                id: "test",
                name: "Synthetic",
                amountMinor: 100,
                currency: "EUR",
                interval: "month",
              },
            ],
            customerBound: true,
            customer: "ready",
            checkout: posts ? "uncertain" : "not_started",
            portal: "not_started",
            reviewRequired: !!posts,
            accessGranted: false,
          },
        });
      if (url.pathname === "/api/billing/checkout") {
        posts++;
        return;
      }
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    await workspaceControl(page, "Account").click();
    await page.getByRole("button", { name: "Open test checkout" }).click();
    await expect(
      page.getByText("Checking billing…", { exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(10_001);
    await expect(page.getByText(/Billing response timed out/)).toBeVisible();
    await expect(
      page.getByText(/Another checkout will not be sent/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open test checkout" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Refresh billing status" }).click();
    await expect(
      page.getByText("Status refreshed. Paid access remains disabled."),
    ).toBeVisible();
    expect(posts).toBe(1);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 40_000);
