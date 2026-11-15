// Usage meter (docs/usage-metering-20261115.md) in a real browser at phone, tablet and desktop
// width, in English and German: the compact meter in the account menu, the full meter on the usage
// page, the cost line under a calculation with code, and the failure text. Offline: the meter's
// data is faked; nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { usageMeterText } from "../src/text/usage-meter";
import { workspaceText } from "../src/text/workspace";
import { voiceText } from "../src/text/voice";
import type { UsageMeterView } from "../shared/usage-config";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const NOW = Date.UTC(2026, 10, 18, 12);
const view: UsageMeterView = {
  plan: { id: "alpha", name: "Alpha", caps: { imagesPerDay: 10, voiceMinutesPerDay: 2, researchRunsPerDay: 3, searchesPerDay: 24, backgroundTasks: 3 } },
  weightsVersion: 2,
  units: { "chat-fast": 1, "chat-thinking": 5, image: 2, voice: 1, "research-run": 15, "code-followup": 0, retry: 0, "background-search": 1, "background-attachment": 2, search: 0, "page-fetch": 0 },
  freeCodeFollowUps: 2,
  week: { used: 12, limit: 150, remaining: 138, resetsAt: new Date(NOW + 4 * 86_400_000).toISOString() },
  today: { used: 7, limit: 40 },
  features: [
    { feature: "chat-thinking", requests: 1, units: 5, tokens: 2100, reported: 1 },
    { feature: "research-answer", requests: 1, units: 10, tokens: 0, reported: 0 },
    { feature: "chat-fast", requests: 4, units: 4, tokens: 4400, reported: 4 },
    { feature: "code-followup", requests: 2, units: 0, tokens: 2400, reported: 2 },
    { feature: "voice", requests: 2, units: 2, tokens: 0, reported: 0 },
  ],
  todayCounts: { images: 1, researchRuns: 1, searches: 4 },
  // 12 units = 24 s used of 60 units = 2 minutes: the same numbers the status gives the microphone.
  voice: { dailyUnits: 60, chunkSeconds: 30, usedUnits: 12 },
  recent: [
    { at: NOW - 60_000, feature: "chat-fast", units: 1, followUps: 2, tokens: 3600 },
    { at: NOW - 3_600_000, feature: "research-answer", units: 10, followUps: 0 },
    { at: NOW - 7_200_000, feature: "voice", units: 1, followUps: 0 },
  ],
};

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-usage-meter-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  await vite.warmupRequest("/tests/fixtures/usage-meter-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(width: number, lang: "en" | "de", failing = false) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
    if (url.pathname === "/api/usage/meter") return failing ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: view });
    if (url.pathname === "/usage-meter")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/usage-meter",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/usage-meter-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(origin + "/usage-meter", { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: compact meter in the account menu, full meter, calculation cost line`, async () => {
      const t = usageMeterText[lang];
      const page = await open(width, lang);
      try {
        // The full meter on the usage page.
        const full = page.getByRole("region", { name: t.heading });
        await ui(full.getByText(t.week(12, 150))).toBeVisible();
        await ui(full.getByText(t.left(138)).first()).toBeVisible();
        await ui(full.getByRole("meter", { name: t.week(12, 150) })).toHaveAttribute("value", "12");
        await ui(full.getByRole("meter", { name: t.today(7, 40) })).toBeVisible();
        await ui(full.getByText(t.pictures(1, 10))).toBeVisible();
        await ui(full.getByRole("rowheader", { name: t["chat-thinking"] })).toBeVisible();
        await ui(full.getByRole("row", { name: new RegExp(t["research-answer"]) }).getByRole("cell").last()).toHaveText(t.tokensUnknown);
        await ui(full.getByText(t.calculation(1, 2), { exact: false })).toBeVisible();
        await ui(full.getByText(t.tokensCount((3600).toLocaleString(lang)), { exact: false })).toBeVisible();
        await ui(full.getByText(t.costs(5, 2, 15), { exact: false })).toBeVisible();
        // Voice today in the daily limits, in the microphone's own words, and the voice cost.
        await ui(full.getByRole("listitem").filter({ hasText: voiceText[lang].today("0:24", "1:36") })).toBeVisible();
        await ui(full.getByText(t.voiceCost(1, 30), { exact: false })).toBeVisible();
        await ui(full.getByRole("rowheader", { name: t.voice })).toBeVisible();
        // Voice is measured by the relay: never shown as "not reported".
        await ui(full.getByRole("row", { name: new RegExp(t.voice) }).getByRole("cell").last()).toHaveText(t.voiceMeasured);
        await ui(full.getByRole("listitem").filter({ hasText: `${t.voice}: ${t.counted(1)} · ${t.voiceMeasured}` })).toBeVisible();
        // The cost line under the calculation: 1 request, 2 steps free.
        await ui(page.getByText(t.codeCost(1, 2))).toBeVisible();
        // The compact meter, in the account menu.
        await page.getByRole("button", { name: workspaceText[lang].accountMenu }).or(page.getByLabel(workspaceText[lang].accountMenu)).first().click();
        const compact = page.locator(".account-popover").getByLabel(t.label);
        await ui(compact.getByText(t.compact(138, 150), { exact: false })).toBeVisible();
        await ui(compact.getByRole("meter")).toBeVisible();
        // The meter adds no status notice (the page has its own), nothing wider than the screen, every meter inside it.
        await ui(page.locator(".usage-meter [role=status], .code-cost[role=status]")).toHaveCount(0);
        await noSidewaysScroll(page);
        for (const meter of await page.getByRole("meter").all()) {
          const box = (await meter.boundingBox())!;
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
      } finally {
        await page.context().close();
      }
    }, 60_000);

it("a meter that cannot load says so in plain words and the rest of the page stays usable", async () => {
  const page = await open(375, "de", true);
  try {
    await ui(page.locator("main").getByText(usageMeterText.de.unavailable)).toBeVisible();
    await ui(page.getByText(usageMeterText.de.codeCost(1, 2))).toBeVisible();
    await noSidewaysScroll(page);
  } finally {
    await page.context().close();
  }
}, 60_000);
