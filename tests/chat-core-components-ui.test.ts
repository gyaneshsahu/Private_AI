// Chat core component fixes (16 November): the streaming answer (CC-01), the compact action row
// with its Retry and More menus (CC-05), Copy on a partial answer (CC-14) and the growing edit box
// (CC-25), at phone, tablet and desktop width in English and German. Offline: the component alone
// (tests/fixtures/chat-core-entry.tsx) on its own Vite server; nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { messageText } from "../src/text/message";
import { messageActionsText } from "../src/text/message-actions";
import { savedListText } from "../src/text/saved-list";
import { deviceText } from "../src/text/device-features";
import { canvasText } from "../src/text/canvas";
import { memoryText } from "../src/text/memory";
import { composerText } from "../src/text/composer";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const SWITCHES = ["VITE_READ_ALOUD", "VITE_PDF_EXPORT", "VITE_CANVAS", "VITE_MEMORY"];

beforeAll(async () => {
  // The answer actions behind build switches are shown, so the row is at its widest.
  for (const name of SWITCHES) process.env[name] = "1";
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-chat-core-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/chat-core-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  for (const name of SWITCHES) delete process.env[name];
  await browser?.close();
  await vite?.close();
});

async function open(lang: "en" | "de", width: number, reducedMotion: "reduce" | "no-preference") {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    hasTouch: width < 760,
    reducedMotion,
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const outside: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/chat-core")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/chat-core",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/chat-core-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(`${origin}/chat-core?screen=messages`, { timeout: 60_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, outside, errors };
}

const log = (page: Page) => page.evaluate(() => (window as unknown as { __log?: string[] }).__log ?? []);
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
/** At least 24 px on both sides; 44 px on both sides at phone width. Inside the viewport. */
async function target(control: Locator, width: number, both = true) {
  await control.scrollIntoViewIfNeeded();
  const box = (await control.boundingBox())!;
  const min = width < 760 ? 44 : 24;
  expect(box.width).toBeGreaterThanOrEqual(both ? min : 24);
  expect(box.height).toBeGreaterThanOrEqual(min);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`${width} px, ${lang}: streaming answer, compact actions with keyboard menus, partial copy, growing edit box`, async () => {
      const a = appText[lang];
      const m = messageText[lang];
      const ma = messageActionsText[lang];
      const d = deviceText[lang];
      // German runs with reduced motion: the dots stand still.
      const { page, outside, errors } = await open(lang, width, lang === "de" ? "reduce" : "no-preference");
      try {
        const article = (n: number, user = false) => page.getByRole("article", { name: a.messageLabel(user, n), exact: true });
        const question = article(1, true);
        const done = article(2);
        const partial = article(3);
        const arriving = article(4);
        const waiting = article(5);

        // --- CC-01: while streaming, no "Incomplete" label and no actions; dots before the first text.
        for (const streaming of [arriving, waiting]) {
          await ui(streaming.getByText(a.incompleteExcluded)).toHaveCount(0);
          await ui(streaming.locator(".message-actions")).toHaveCount(0);
          await ui(streaming.getByRole("button")).toHaveCount(0);
        }
        await ui(arriving).toContainText("Synthetic arriving text");
        await ui(arriving.locator(".typing-dots")).toHaveCount(0);
        const dots = waiting.locator(".typing-dots");
        await ui(dots).toBeVisible();
        await ui(dots).toHaveAttribute("aria-hidden", "true");
        await ui(waiting.locator(".sr-only")).toHaveText(ma.writing);
        // Not a live region: the page keeps one status notice.
        await ui(waiting.getByRole("status")).toHaveCount(0);
        const animation = await dots.locator("span").first().evaluate((el) => getComputedStyle(el).animationName);
        expect(animation).toBe(lang === "de" ? "none" : "chat-typing");
        // A stopped answer that is not streaming keeps its label.
        await ui(partial.getByText(a.incompleteExcluded)).toBeVisible();

        // --- CC-05: one row of named icon buttons with tooltips, one Retry and one More.
        const named = async (scope: Locator, name: string) => {
          const button = scope.getByRole("button", { name, exact: true });
          await ui(button).toHaveAttribute("title", name);
          await ui(button).toHaveText("");
          await target(button, width);
          return button;
        };
        for (const name of [a.copyAnswer, d.readAloud, d.exportPdf, canvasText[lang].open, ma.retry, ma.moreActions])
          await named(done, name);
        for (const name of [a.editIntoBranch, memoryText[lang].rememberThis, savedListText[lang].copyMessageLabel, ma.retry])
          await named(question, name);
        // One row: every action of the answer on the same line.
        const tops = await done.locator(".message-actions > button").evaluateAll((list) =>
          list.map((el) => Math.round(el.getBoundingClientRect().top)),
        );
        expect(new Set(tops).size).toBe(1);
        await noSidewaysScroll(page);

        // Retry menu by keyboard: focus moves in, arrows and Home/End move, Escape returns focus.
        const retry = done.getByRole("button", { name: ma.retry, exact: true });
        await ui(retry).toHaveAttribute("aria-haspopup", "menu");
        await ui(retry).toHaveAttribute("aria-expanded", "false");
        await retry.focus();
        await page.keyboard.press("Enter");
        const fast = done.getByRole("menuitem", { name: `${a.retryLast} (${m.uses(1)})`, exact: true });
        const thinking = done.getByRole("menuitem", { name: `${a.answerThinking} (${m.uses(5)})`, exact: true });
        await ui(retry).toHaveAttribute("aria-expanded", "true");
        await ui(fast).toBeFocused();
        // The cost is visible text, before the press.
        await ui(fast).toHaveText(`${a.retryLast} (${m.uses(1)})`);
        await ui(thinking).toHaveText(`${a.answerThinking} (${m.uses(5)})`);
        await target(fast, width, false);
        await target(thinking, width, false);
        await noSidewaysScroll(page);
        await page.keyboard.press("ArrowDown");
        await ui(thinking).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await ui(fast).toBeFocused();
        await page.keyboard.press("End");
        await ui(thinking).toBeFocused();
        await page.keyboard.press("Home");
        await ui(fast).toBeFocused();
        await page.keyboard.press("Escape");
        await ui(fast).toHaveCount(0);
        await ui(retry).toBeFocused();
        expect(await log(page)).toEqual([]);
        // ArrowUp opens on the last item; Enter chooses it, one call.
        await page.keyboard.press("ArrowUp");
        await ui(thinking).toBeFocused();
        await page.keyboard.press("Enter");
        await ui(thinking).toHaveCount(0);
        await ui(retry).toBeFocused();
        expect(await log(page)).toEqual(["retry:a1:thinking"]);
        // A click outside closes it without choosing.
        await retry.click();
        await ui(fast).toBeVisible();
        await page.locator(".messages").click({ position: { x: 2, y: 2 } });
        await ui(fast).toHaveCount(0);
        await retry.click();
        await fast.click();
        expect(await log(page)).toEqual(["retry:a1:thinking", "retry:a1:same"]);

        // "Report a problem" sits in More.
        const more = done.getByRole("button", { name: ma.moreActions, exact: true });
        await more.focus();
        await page.keyboard.press("Enter");
        const report = done.getByRole("menuitem", { name: m.reportLabel, exact: true });
        await ui(report).toBeFocused();
        await ui(report).toHaveText(m.report);
        await target(report, width, false);
        await page.keyboard.press("Enter");
        expect((await log(page)).at(-1)).toBe("report:a1");

        // --- CC-14: a stopped answer with text can be copied.
        const partialCopy = partial.getByRole("button", { name: a.copyAnswer, exact: true });
        await ui(partialCopy).toBeEnabled();
        await partialCopy.click();
        expect((await log(page)).at(-1)).toBe("copy:a2");
        await ui(partial.getByRole("button", { name: composerText[lang].copied, exact: true })).toBeVisible();

        // --- CC-25: the edit box grows with its text and shrinks back.
        await question.getByRole("button", { name: a.editIntoBranch, exact: true }).click();
        const box = page.getByLabel(a.editedMessage, { exact: true });
        await ui(box).toBeFocused();
        const height = () => box.evaluate((el) => el.getBoundingClientRect().height);
        const short = await height();
        await box.fill(Array.from({ length: 5 }, (_, i) => `Synthetic line ${i + 1}`).join("\n"));
        await expect.poll(height).toBeGreaterThan(short + 20);
        // Up to the message box's cap (160 px) nothing scrolls inside; beyond it the box scrolls.
        expect(await box.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
        await box.fill(Array.from({ length: 30 }, (_, i) => `Synthetic line ${i + 1}`).join("\n"));
        await expect.poll(height).toBe(160);
        await box.fill("Short");
        await expect.poll(height).toBeLessThanOrEqual(short + 1);
        await page.keyboard.press("Escape");
        await ui(box).toHaveCount(0);
        await noSidewaysScroll(page);

        expect(outside).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 120_000);
