// Activity in the real app (docs/activity-states-20261126.md), every feature on: the live
// "Thinking…" line in place of the dots and of the bar at the top, "Thought for N s" opening to
// the model's reasoning when the stream carried it and to the steps when it did not, a search
// shown as steps, the image placeholder and the image fading in, skeleton rows for the chat list,
// nothing moving when the answer arrives, and no motion under "reduce motion".
// Phone and desktop, English and German, light and dark.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { activityText } from "../src/text/activity";
import { appText } from "../src/text/app";
import { imageCreationText } from "../src/text/image-creation";
import { settingsText } from "../src/text/settings";

vi.setConfig({ testTimeout: 150_000 });

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  mkdirSync(".local/activity", { recursive: true });
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({ ...browserLaunchOptions(), proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" } });
}, 300_000);
afterAll(async () => {
  await browser?.close();
  server?.close();
});

describe.each([
  [375, "en", "light", "no-preference"],
  [375, "de", "dark", "reduce"],
  [1280, "en", "dark", "no-preference"],
  [1280, "de", "light", "no-preference"],
] as [number, "en" | "de", "light" | "dark", "reduce" | "no-preference"][])("activity at %i px, %s, %s, motion %s", (width, lang, scheme, motion) => {
  it("thinking, thought, steps, the image placeholder and the chat-list skeleton", async () => {
    const phone = width < 700;
    const context = await browser.newContext({
      viewport: { width, height: phone ? 812 : 900 },
      locale: lang === "de" ? "de-DE" : "en-US",
      colorScheme: scheme,
      reducedMotion: motion,
      ...(phone ? { hasTouch: true, isMobile: true } : {}),
    });
    context.setDefaultTimeout(15_000);
    try {
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      await installFakes(context, { origin, config: "on" });
      const page = await context.newPage();
      const a = appText[lang];
      const t = activityText[lang];
      // The saved chats take a moment here, so the list's loading state can be seen.
      await page.route("**/api/secure/key", async (route) => {
        await new Promise((done) => setTimeout(done, 1500));
        await route.fallback();
      });
      await page.route("**/api/images/create", async (route) => {
        await new Promise((done) => setTimeout(done, 1500));
        await route.fallback();
      });
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });

      // The chat list: rows in its shape, not a sentence; then the list.
      if (phone) await page.getByLabel(a.openNavigation, { exact: true }).click();
      const skeleton = page.locator(".activity-skeleton");
      await ui(skeleton).toBeVisible();
      await ui(skeleton).toContainText(settingsText[lang].loadingChats); // for screen readers only
      await ui(page.locator(".history-locked p")).toHaveCount(0);
      // The sentence is nowhere on the screen while the rows show, also not in the line under the account.
      expect(await page.evaluate((words) => [...document.querySelectorAll("p")].filter((el) => !el.closest(".sr-only") && el.textContent?.includes(words)).length, settingsText[lang].loadingChats)).toBe(0);
      if (motion === "reduce") expect(await skeleton.locator("span[aria-hidden]").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      await ui(skeleton).toHaveCount(0, { timeout: 20_000 });
      if (phone) await page.keyboard.press("Escape");

      const input = page.getByLabel(a.messageInput);
      const send = page.getByRole("button", { name: a.sendLabel, exact: true });
      const answer = page.locator("article.assistant").last();

      // 1. An answer the model reasoned about: the live line, then "Thought for N s" with its reasoning.
      await input.fill("How long is the trip? audit:thought");
      await send.click();
      const line = answer.locator(".activity-line");
      await ui(line).toHaveText(t.thinking);
      await ui(page.locator(".typing-dots")).toHaveCount(0);
      await ui(page.locator(".progress")).toHaveCount(0);
      const dot = line.locator(".activity-dot");
      expect(await dot.evaluate((el) => getComputedStyle(el).animationName)).toBe(motion === "reduce" ? "none" : "activity-pulse");
      expect(await dot.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("linear-gradient");
      await page.screenshot({ path: `.local/activity/thinking-${width}-${lang}-${scheme}.png` });
      await page.waitForTimeout(600); // the new message has risen into place
      const top = (await answer.boundingBox())!.y;
      const thought = answer.locator("details.activity-thought");
      await ui(thought.locator("summary")).toHaveText(/Thought for|nachgedacht/, { timeout: 20_000 });
      await ui(line).toHaveCount(0);
      // Nothing moved when the answer took the line's place.
      expect(Math.abs((await answer.boundingBox())!.y - top)).toBeLessThanOrEqual(1);
      await ui(answer.locator(".message-text")).toContainText("155 minutes");
      await ui(thought.locator(".activity-reasoning")).toBeHidden();
      await thought.locator("summary").click();
      await ui(thought.locator(".activity-reasoning")).toContainText("120 minutes");
      await ui(answer.locator(".message-text")).not.toContainText("120 minutes");
      expect((await thought.locator("summary").boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
      await page.screenshot({ path: `.local/activity/thought-${width}-${lang}-${scheme}.png` });

      // 2. An answer without reasoning text: the steps instead.
      await input.fill("A plain one. audit:plain");
      await send.click();
      await ui(answer.locator(".message-text")).toContainText("Synthetic answer.", { timeout: 20_000 });
      await answer.locator("details.activity-thought summary").click();
      await ui(answer.locator("details.activity-thought ol li")).toHaveText([t.stepThinking, t.stepWriting]);

      // 3. A question that is searched first: the search and what it brought are steps of that answer.
      await input.fill("What is the current notice period for tenants? audit:citations");
      await send.click();
      await ui(answer.locator(".message-text")).toContainText("Synthetic findings", { timeout: 30_000 });
      await answer.locator("details.activity-thought summary").click();
      const steps = answer.locator("details.activity-thought ol li");
      await ui(steps.first()).toHaveText(a.retrieving.replace(/\s?…$/, ""));
      await ui(steps.filter({ hasText: /Read \d+ sources?|Quellen? gelesen/ })).toHaveCount(1);

      // 4. An image: a placeholder in the final shape while it is made, then the picture fades in.
      await page.getByLabel(a.tools, { exact: true }).click();
      await page.locator(".tools-menu").getByRole("button", { name: imageCreationText[lang].menu, exact: true }).click();
      await page.getByLabel(imageCreationText[lang].describe).fill("A calm lake at sunrise");
      await page.getByRole("button", { name: imageCreationText[lang].create, exact: true }).click();
      const shimmer = page.locator(".activity-shimmer");
      await ui(shimmer).toBeVisible();
      const box = (await shimmer.boundingBox())!;
      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `.local/activity/image-${width}-${lang}-${scheme}.png` });
      await ui(page.locator("figure.created-image img.activity-arrive")).toBeVisible({ timeout: 20_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });
});
