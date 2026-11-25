// Plans in the real app (docs/plans-20261125.md), every feature on, with the fake checkout: the
// three plans from the account menu, "Choose Plus" leaves for the test checkout, paying comes back
// to the dialog on Plus with the id gone from the address, a cancelled checkout changes nothing,
// and Switch to Free takes two presses. Phone and desktop, English and German.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { plansText } from "../src/text/plans";
import { workspaceText } from "../src/text/workspace";

vi.setConfig({ testTimeout: 120_000 });

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({ ...browserLaunchOptions(), proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" } });
}, 300_000);
afterAll(async () => {
  await browser?.close();
  server?.close();
});

describe.each([
  [375, "en"],
  [375, "de"],
  [1280, "en"],
  [1280, "de"],
] as [number, "en" | "de"][])("plans at %i px, %s", (width, lang) => {
  it("shows three plans, buys Plus through the test checkout, cancels a Pro checkout, and goes back to Free", async () => {
    const phone = width < 700;
    const context = await browser.newContext({ viewport: { width, height: phone ? 812 : 900 }, locale: lang === "de" ? "de-DE" : "en-US", ...(phone ? { hasTouch: true, isMobile: true } : {}) });
    context.setDefaultTimeout(10_000);
    try {
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      await installFakes(context, { origin, config: "on" });
      const page = await context.newPage();
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      const a = appText[lang];
      const w = workspaceText[lang];
      const t = plansText[lang];
      if (phone && !(await page.getByRole("button", { name: w.closeNavigation }).isVisible())) await page.getByLabel(a.openNavigation, { exact: true }).click();
      await page.locator(".account-menu summary").click();
      await page.locator(".account-menu").getByRole("button", { name: t.menu, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: t.title });
      const plan = (name: string) => dialog.locator("li.plan").filter({ has: page.getByRole("heading", { name }) });
      await ui(dialog.locator("li.plan")).toHaveCount(3);
      await ui(plan("Free")).toHaveAttribute("aria-current", "true");
      await ui(plan("Free")).toContainText(t.yours);
      await ui(plan("Free").locator(".plan-price")).toHaveText(t.freePrice);
      await ui(plan("Plus").locator(".plan-price")).toHaveText(t.perMonth(lang === "de" ? "20 €" : "€20"));
      await ui(plan("Free").getByRole("button")).toHaveCount(0);
      // Nothing is wider than the screen, and the buttons are full-size targets.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      const choosePlus = plan("Plus").getByRole("button", { name: t.choose("Plus"), exact: true });
      expect((await choosePlus.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);

      // Plus: the app leaves for the test checkout; paying comes back to the dialog.
      await choosePlus.click();
      await page.waitForURL(/\/plans\/test-checkout\/[0-9a-f-]{36}$/);
      await ui(page.getByText("No money moves")).toBeVisible();
      await page.getByRole("link", { name: "Pay (test)" }).click();
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      await ui(dialog.getByRole("status")).toHaveText(t.paid("Plus"));
      await ui(plan("Plus")).toHaveAttribute("aria-current", "true");
      expect(new URL(page.url()).search).toBe("");
      // A reload does not open the dialog again, and the plan stays.
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      await ui(dialog).toHaveCount(0);

      // Pro, cancelled: nothing changes.
      if (phone && !(await page.getByRole("button", { name: w.closeNavigation }).isVisible())) await page.getByLabel(a.openNavigation, { exact: true }).click();
      await page.locator(".account-menu summary").click();
      await page.locator(".account-menu").getByRole("button", { name: t.menu, exact: true }).click();
      await ui(plan("Plus")).toHaveAttribute("aria-current", "true");
      await plan("Pro").getByRole("button", { name: t.choose("Pro"), exact: true }).click();
      await page.waitForURL(/\/plans\/test-checkout\//);
      await page.getByRole("link", { name: "Cancel" }).click();
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      await ui(dialog.getByRole("status")).toHaveText(t.cancelled);
      await ui(plan("Plus")).toHaveAttribute("aria-current", "true");

      // Back to Free takes a second press.
      await plan("Free").getByRole("button", { name: t.toFree, exact: true }).click();
      await ui(plan("Plus")).toHaveAttribute("aria-current", "true");
      await plan("Free").getByRole("button", { name: t.toFreeSure, exact: true }).click();
      await ui(dialog.getByRole("status")).toHaveText(t.nowFree);
      await ui(plan("Free")).toHaveAttribute("aria-current", "true");
      await page.screenshot({ path: `.local/plans/plans-${width}-${lang}.png` });
      await page.keyboard.press("Escape");
      await ui(dialog).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
