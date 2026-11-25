// Error states in the real app (docs/error-states-20261126.md), every feature on: a failed answer
// shows one friendly line with Retry where the answer would be, in plain words without codes; a
// part that arrived is kept and the line says the rest was lost; offline says so and Retry waits;
// an answer the user stopped gets the same line without the red; a failed image gets the line in
// the dialog; the usage limit stays its own calm line. Phone and desktop, English and German,
// light and dark.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { errorText } from "../src/text/errors";
import { imageCreationText } from "../src/text/image-creation";

vi.setConfig({ testTimeout: 150_000 });

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  mkdirSync(".local/errors", { recursive: true });
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
] as [number, "en" | "de", "light" | "dark"][])("error states at %i px, %s, %s", (width, lang, scheme) => {
  it("a failed, a cut-off and a stopped answer, offline, a failed image, and the limit", async () => {
    const phone = width < 700;
    const context = await browser.newContext({
      viewport: { width, height: phone ? 812 : 900 },
      locale: lang === "de" ? "de-DE" : "en-US",
      colorScheme: scheme,
      ...(phone ? { hasTouch: true, isMobile: true } : {}),
    });
    context.setDefaultTimeout(15_000);
    try {
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      const fakes = await installFakes(context, { origin, config: "on" });
      const page = await context.newPage();
      const a = appText[lang];
      const t = errorText[lang];
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      const input = page.getByLabel(a.messageInput);
      const send = page.getByRole("button", { name: a.sendLabel, exact: true });
      const answer = page.locator("article.assistant").last();
      const line = answer.locator(".error-line");
      const retry = line.getByRole("button", { name: t.retry, exact: true });

      // 1. The server fails: one line, plain words, the question still there, Retry.
      await input.fill("First question. audit:error-500");
      await send.click();
      await ui(line).toContainText(t.generic, { timeout: 20_000 });
      await ui(line).toContainText(t.nothingArrived);
      expect(await line.innerText()).not.toMatch(/\d{3}|error|Error|HTTP/);
      await ui(page.locator(".failure-note")).toHaveCount(0);
      // One line only: no second, technical notice above the message box, and no "Thought" line over nothing.
      await ui(page.locator(".notice:not(.sr-only)").filter({ hasText: /context|Kontext/ })).toHaveCount(0);
      await ui(answer.locator(".activity-thought")).toHaveCount(0);
      await ui(page.locator("article.user").last()).toContainText("First question.");
      expect(await line.evaluate((el) => getComputedStyle(el).borderLeftColor)).not.toBe(await page.evaluate(() => getComputedStyle(document.body).color));
      if (phone) expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
      await page.screenshot({ path: `.local/errors/failed-${width}-${lang}-${scheme}.png` });

      // 2. Offline: the line says so and Retry waits; back online it works.
      await context.setOffline(true);
      await ui(line).toContainText(t.offline);
      await ui(line).toContainText(t.whenOnline);
      await ui(retry).toBeDisabled();
      await context.setOffline(false);
      await ui(line).toContainText(t.generic);
      await ui(retry).toBeEnabled();
      fakes.answer("plain");
      await retry.click();
      await ui(answer.locator(".message-text")).toContainText("Synthetic answer.", { timeout: 20_000 });
      await ui(answer.locator(".error-line")).toHaveCount(0);

      // 3. The answer breaks off: the part that arrived stays, and the line says the rest was lost.
      await input.fill("Second question. audit:dropped");
      await send.click();
      await ui(line).toContainText(t.partKept, { timeout: 20_000 });
      expect((await answer.locator(".message-text").innerText()).trim().length).toBeGreaterThan(10);

      // 4. Stopped by the user: the same line, calm, with Retry.
      await input.fill("Third question. audit:stop");
      await send.click();
      await ui(answer.locator(".message-text")).not.toBeEmpty({ timeout: 20_000 });
      await page.getByRole("button", { name: a.stopResponse, exact: true }).click();
      await ui(answer.locator(".error-line.calm")).toContainText(t.stopped);
      await ui(answer.locator(".error-line.calm").getByRole("button", { name: t.retry, exact: true })).toBeVisible();
      await page.screenshot({ path: `.local/errors/stopped-${width}-${lang}-${scheme}.png` });

      // 5. The usage limit is not an error: no red line.
      await input.fill("Fourth question. audit:limit");
      await send.click();
      await page.waitForTimeout(2500);
      await ui(page.locator(".error-line:not(.calm)")).toHaveCount(1); // only the cut-off answer of step 3

      // 6. An image that cannot be made: the line in the dialog, Retry makes it.
      let failed = false;
      await page.route("**/api/images/create", async (route) => {
        if (failed) return route.fallback();
        failed = true;
        await route.fulfill({ status: 503, json: { error: "unavailable" } });
      });
      await page.getByLabel(a.tools, { exact: true }).click();
      await page.locator(".tools-menu").getByRole("button", { name: imageCreationText[lang].menu, exact: true }).click();
      await page.getByLabel(imageCreationText[lang].describe).fill("A calm lake at sunrise");
      await page.getByRole("button", { name: imageCreationText[lang].create, exact: true }).click();
      const imageLine = page.locator("dialog[open] .error-line");
      await ui(imageLine).toContainText(t.image);
      await ui(page.getByLabel(imageCreationText[lang].describe)).toHaveValue("A calm lake at sunrise");
      await page.screenshot({ path: `.local/errors/image-${width}-${lang}-${scheme}.png` });
      await imageLine.getByRole("button", { name: t.retry, exact: true }).click();
      await ui(page.locator("figure.created-image img")).toBeVisible({ timeout: 20_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });
});
