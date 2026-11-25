// The chat list must not hang (owner, 26 November 2026; docs/loading-hang-20261126.md). In the
// long screen tour a page sometimes stayed on "Loading your chats…" for more than 8 seconds. This
// test loads the real app again and again, with the same test fakes as the tour, and fails if the
// saved chats ever take longer than 8 seconds to open. On a failure it says which requests were
// still waiting, so the cause is on record.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { chromium, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";

vi.setConfig({ testTimeout: 400_000 });
const LIMIT_MS = 8000;

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

it(`saved chats open within ${LIMIT_MS / 1000} seconds on every load: 12 accounts, 5 loads each, phone and desktop`, async () => {
  const times: number[] = [];
  const slow: string[] = [];
  for (let account = 0; account < 12; account++) {
    const width = account % 2 ? 375 : 1280;
    const context = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 700 ? { hasTouch: true, isMobile: true } : {}) });
    await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
    await installFakes(context, { origin, config: "on" });
    const open = new Map<object, { url: string; at: number }>();
    context.on("request", (r) => open.set(r, { url: `${r.method()} ${r.url().replace(origin, "").slice(0, 100)}`, at: Date.now() }));
    context.on("requestfinished", (r) => open.delete(r));
    context.on("requestfailed", (r) => open.delete(r));
    const page = await context.newPage();
    try {
      for (let load = 0; load < 5; load++) {
        await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
        const started = Date.now();
        await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
        // Ready: the saved chats are open, so the footer no longer calls the chat temporary and nothing says "loading".
        const ready = await page
          .waitForFunction(() => !/Temporary chat|Loading your chats/.test(document.body.innerText) && !document.querySelector(".activity-skeleton"), undefined, { timeout: LIMIT_MS })
          .then(() => true, () => false);
        const ms = Date.now() - started;
        times.push(ms);
        if (!ready) slow.push(`account ${account} (${width} px), load ${load}: not ready after ${ms} ms; waiting for ${[...open.values()].map((r) => `${r.url} ${Date.now() - r.at} ms`).join(", ") || "no request"}`);
        // Something to load next time: one saved message on the first two loads.
        if (ready && load < 2) {
          await page.getByLabel(appText.en.messageInput).fill(`Load ${load}. audit:plain`);
          await page.getByRole("button", { name: appText.en.sendLabel, exact: true }).click();
          await page.locator("article.assistant .message-text").last().waitFor({ timeout: 20_000 });
          await page.waitForTimeout(600);
        }
      }
    } finally {
      await context.close();
    }
  }
  times.sort((a, b) => a - b);
  console.log(`chat list ready: ${times.length} loads, median ${times[times.length >> 1]} ms, slowest ${times.at(-1)} ms`);
  expect(slow, slow.join("\n")).toEqual([]);
});
