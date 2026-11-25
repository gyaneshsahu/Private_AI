// Answer blocks while the answer arrives, in the real app (docs/answer-blocks-20261126.md): a block
// being written shows a quiet line, never its raw data; the finished answer draws it; an answer
// stopped in the middle leaves no line waiting forever.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { answerText } from "../src/text/conversation-ui";

vi.setConfig({ testTimeout: 150_000 });

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

it.each([
  [375, "en"],
  [1280, "de"],
] as [number, "en" | "de"][])("a block being written at %i px, %s", async (width, lang) => {
  const phone = width < 700;
  const context = await browser.newContext({
    viewport: { width, height: phone ? 812 : 900 },
    locale: lang === "de" ? "de-DE" : "en-US",
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  context.setDefaultTimeout(15_000);
  try {
    await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
    await installFakes(context, { origin, config: "on" });
    const page = await context.newPage();
    const a = appText[lang];
    await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
    const input = page.getByLabel(a.messageInput);
    const send = page.getByRole("button", { name: a.sendLabel, exact: true });
    const answer = page.locator("article.assistant").last();
    const pending = answer.locator(".answer-block-pending");

    // While it arrives: the quiet line, and none of the block's data.
    await input.fill("First. audit:blocks-slow");
    await send.click();
    await ui(pending.first()).toHaveText(answerText[lang].drawing, { timeout: 30_000 });
    expect(await answer.locator(".message-text").innerText()).not.toMatch(/"nodes"|"items"|"tabs"|\{"/);
    // Finished: drawn, no line left.
    await ui(answer.locator("figure.answer-diagram svg").first()).toBeVisible({ timeout: 60_000 });
    await ui(answer.locator("ol.answer-quiz")).toBeVisible({ timeout: 60_000 });
    await ui(pending).toHaveCount(0);

    // Stopped in the middle of a block: nothing keeps waiting.
    await input.fill("Second. audit:blocks-slow");
    await send.click();
    await ui(pending.first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: a.stopResponse, exact: true }).click();
    await ui(pending).toHaveCount(0);
    await ui(answer.locator(".message-text")).not.toBeEmpty();
  } finally {
    await context.close();
  }
});
