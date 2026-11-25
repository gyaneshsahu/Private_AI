// The report card in the real app (docs/report-card-20261125.md), every feature on: a deep
// research answer is a card in the chat (title, kind, sources, reading time, the report's first
// paragraph, its sections), the report itself is in the side panel with working source buttons,
// and from there it can be edited in the canvas and copied. Wide screens open the panel by
// themselves, a phone only on a tap. Phone and desktop, English and German, light and dark.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { deepResearchText } from "../src/text/deep-research";
import { reportText } from "../src/text/report";

vi.setConfig({ testTimeout: 120_000 });

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  mkdirSync(".local/report", { recursive: true });
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({ ...browserLaunchOptions(), proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" } });
}, 300_000);
afterAll(async () => {
  await browser?.close();
  server?.close();
});

describe.each([
  [375, "en", "light"],
  [375, "de", "dark"],
  [1280, "en", "dark"],
  [1280, "de", "light"],
] as [number, "en" | "de", "light" | "dark"][])("report card at %i px, %s, %s", (width, lang, scheme) => {
  it("deep research is a card in the chat and a report in the side panel", async () => {
    const phone = width < 700;
    const context = await browser.newContext({
      viewport: { width, height: phone ? 812 : 900 },
      locale: lang === "de" ? "de-DE" : "en-US",
      colorScheme: scheme,
      ...(phone ? { hasTouch: true, isMobile: true } : {}),
    });
    context.setDefaultTimeout(15_000);
    try {
      await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      await installFakes(context, { origin, config: "on" });
      const page = await context.newPage();
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      const a = appText[lang];
      const t = reportText[lang];
      const TITLE = "Synthetic notice periods for tenants";

      await page.getByLabel(a.tools, { exact: true }).click();
      await page.locator(".tools-menu").getByRole("button", { name: deepResearchText[lang].heading, exact: true }).click();
      await page.getByLabel(a.messageInput).fill("How long is the synthetic notice period, and what is the fee?");
      await page.getByRole("button", { name: a.sendLabel, exact: true }).click();

      // The card, once the report is written.
      const answer = page.locator("article.assistant").last();
      const card = answer.getByRole("button", { name: t.open(TITLE), exact: true });
      await ui(card).toBeVisible({ timeout: 40_000 });
      const meta = answer.locator(".report-card-meta");
      await ui(meta).toContainText(t.kind);
      await ui(meta).toContainText(t.sources(6));
      await ui(meta).toContainText(t.minutes(1));
      // The card shows the beginning of the report as a picture of it: cut short, and nothing in it takes focus or a click of its own.
      const preview = answer.locator(".report-preview-body");
      await ui(preview).toContainText("three months for a tenant");
      expect((await preview.boundingBox())!.height).toBeLessThanOrEqual(381);
      await ui(preview.locator("[inert]")).toHaveCount(1);
      await ui(answer.getByRole("button", { name: t.downloadReport, exact: true })).toBeVisible();
      const sections = answer.getByRole("navigation", { name: t.inReport }).getByRole("button");
      await ui(sections).toHaveCount(3);

      // A wide screen has the report beside the chat already; a phone shows it on a tap.
      const panel = page.getByRole("complementary", { name: t.panel });
      if (phone) {
        await ui(panel).toHaveCount(0);
        expect((await sections.first().boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
        await ui(page.locator(".report-preview-body h1")).toBeVisible();
      await page.waitForTimeout(700); // the message has faded in
      await page.screenshot({ path: `.local/report/card-${width}-${lang}-${scheme}.png` });
        await card.click();
      }
      await ui(panel).toBeVisible();
      await ui(panel.getByRole("heading", { name: TITLE, level: 2 })).toBeVisible();
      await ui(panel.locator(".report-body table")).toHaveCount(1);
      await ui(panel.locator(".report-body .citation").first()).toBeVisible();
      await ui(panel.locator(".report-note")).toContainText(lang === "de" ? "Tiefenrecherche" : "Deep research");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `.local/report/panel-${width}-${lang}-${scheme}.png` });

      // A section link brings that section into view.
      if (phone) await panel.getByRole("button", { name: t.close, exact: true }).click();
      await sections.nth(2).click();
      const last = panel.locator(".report-body h2").nth(2);
      await ui(last).toBeInViewport();

      // Copy gives the report as written, with its Markdown.
      await panel.getByRole("button", { name: t.copy, exact: true }).click();
      await ui(panel.getByRole("status")).toHaveText(t.copied);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("# Synthetic notice periods for tenants");

      // Edit in canvas: the canvas opens with the report's text.
      await panel.getByRole("button", { name: t.edit, exact: true }).click();
      const canvas = page.locator(".canvas-panel");
      await ui(canvas).toBeVisible();
      await ui(canvas.locator("textarea").first()).toHaveValue(/# Synthetic notice periods for tenants/);
      await canvas.locator(phone ? ".canvas-back" : ".canvas-close").click();
      await ui(canvas).toHaveCount(0);

      // After a reload the card is still a card, and nothing opens by itself.
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      // The app starts on a new chat; the saved one is in the list under its question.
      if (phone) await page.getByLabel(a.openNavigation, { exact: true }).click();
      await page.locator('[id^="chat-row-"]').first().click();
      await ui(page.getByRole("button", { name: t.open(TITLE), exact: true })).toBeVisible();
      await ui(panel).toHaveCount(0);
      if (!phone) await ui(page.locator(".report-preview-body h1")).toBeVisible();
      await page.waitForTimeout(700); // the message has faded in
      await page.screenshot({ path: `.local/report/card-${width}-${lang}-${scheme}.png` });
    } finally {
      await context.close();
    }
  });
});
