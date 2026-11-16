// Following the streaming answer (src/follow-scroll.ts) in the actual application at phone,
// tablet and desktop width, English and German (German with reduced motion). Offline: a Vite
// plugin replaces src/inference.ts, the status is faked, nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { composerText } from "../src/text/composer";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

const tier = { model: "SYNTHETIC_MODEL", maxOutputTokens: 1024 };
const qualification = {
  maxInputCharacters: 100000,
  model: "SYNTHETIC_MODEL",
  modes: { fast: { ...tier, allowanceCost: 1 }, thinking: { ...tier, allowanceCost: 3 } },
};

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-follow-scroll-ui-test",
    plugins: [
      {
        name: "synthetic-model",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // One paragraph every 40 ms: 60 for SLOW, 150 for LONG. Parameters as in src/inference.ts.
          return `export async function streamReply(c,q,csrf,signal,chunk,status,calc,kept,choice,mode){
            const text = c.messages.at(-1).text;
            const lines = text.includes("LONG") ? 150 : 60;
            for (let i = 0; i < lines; i++) {
              if (signal.aborted) throw signal.reason;
              chunk("Synthetic line " + i + ".\\n\\n");
              await new Promise((r) => setTimeout(r, 40));
            }
            return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
          }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

const fromEnd = (page: Page) =>
  page
    .locator("main")
    .evaluate((main) => Math.round(main.scrollHeight - main.scrollTop - main.clientHeight));

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`${width} px, ${lang}: follows to the end, survives a shrink at the end, stops when the user scrolls up`, async () => {
      const context = await browser.newContext({
        locale: lang === "de" ? "de-DE" : "en-US",
        viewport: { width, height: width < 700 ? 812 : 900 },
        reducedMotion: lang === "de" ? "reduce" : "no-preference",
      });
      const page = await context.newPage();
      const errors: string[] = [];
      const outside: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {
          outside.push(url.href);
          return route.abort();
        }
        if (route.request().method() !== "GET") return route.abort();
        if (url.pathname === "/api/status")
          return route.fulfill({
            json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification }, search: false },
          });
        return route.continue();
      });
      try {
        const a = appText[lang];
        await page.goto(origin, { timeout: 90000 });
        await ui(page.locator("html")).toHaveAttribute("lang", lang);
        const box = page.getByLabel(a.messageInput);
        const sendButton = page.getByRole("button", { name: a.sendLabel, exact: true });
        const answers = page.locator("article.assistant");
        const jump = page.getByRole("button", { name: composerText[lang].jumpLatest, exact: true });
        await page.getByRole("combobox", { name: a.answerMode }).selectOption("fast");

        // --- The view follows a whole answer to its end.
        await box.fill("SLOW stream");
        await sendButton.click();
        await ui(answers.last()).toContainText("Synthetic line 59.", { timeout: 15000 });
        await ui(sendButton).toBeVisible({ timeout: 15000 });
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(4);

        // --- The CI failure of 16 Nov 2026, made certain: at the end, the page gets shorter (the
        // browser moves the view up) and longer again before the next scroll event. That is not
        // the user moving up: the view stays at the end and "Jump to latest" does not appear.
        await page.evaluate(() => {
          const probe = document.createElement("div");
          probe.id = "follow-probe";
          probe.append(Object.assign(document.createElement("div"), { style: "height:40px" }));
          document.querySelector(".messages")!.append(probe);
        });
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(2);
        const moved = await page.evaluate(async () => {
          const main = document.querySelector("main")!;
          const probe = document.getElementById("follow-probe")!;
          // Two frames, so the scroll event of the move to the end is handled; then a plain task.
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r))));
          const before = main.scrollTop;
          probe.firstElementChild!.remove();
          const clamped = main.scrollTop; // reading it applies the shorter page now
          await Promise.resolve(); // the app's mutation observer runs here, as after a render
          probe.append(Object.assign(document.createElement("div"), { style: "height:80px" }));
          return before - clamped;
        });
        expect(moved).toBeGreaterThan(0); // the race happened
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(2);
        await ui(jump).toHaveCount(0);
        await page.evaluate(() => document.getElementById("follow-probe")!.remove());

        // --- The user scrolls up while an answer streams: following stops, the button appears
        // and the view stays put while text arrives. The button brings the view back to the end.
        await box.fill("LONG stream");
        await sendButton.click();
        await ui(answers.last()).toContainText("Synthetic line 20.", { timeout: 15000 });
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(50);
        await page.mouse.move(width / 2, 200);
        await page.mouse.wheel(0, -600);
        await ui(jump).toBeVisible();
        const away = await fromEnd(page);
        await expect.poll(() => fromEnd(page)).toBeGreaterThan(away + 200);
        await ui(jump).toBeVisible();
        await jump.click();
        await expect.poll(() => fromEnd(page), { timeout: 8000 }).toBeLessThanOrEqual(50);
        await ui(jump).toHaveCount(0);
        await ui(answers.last()).toContainText("Synthetic line 149.", { timeout: 30000 });
        await ui(sendButton).toBeVisible({ timeout: 15000 });
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(4);
        await ui(jump).toHaveCount(0);

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        ).toBe(true);
        expect(outside).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    }, 120_000);
