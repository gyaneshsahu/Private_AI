// Composer, following the answer, connection banner (docs/chat-feature-gaps-20261114.md, packages
// A, B and F) in the actual application at phone, tablet and desktop width, English and German.
// Offline: a Vite plugin replaces src/inference.ts, the status is faked, nothing leaves the machine.
// Every send the fake receives is recorded: the count must equal the sends the test intended.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { composerText } from "../src/text/composer";
import { connectionText } from "../src/text/connection";

type Lang = "en" | "de";
let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-composer-ui-test",
    plugins: [
      {
        name: "synthetic-slow-stream",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // SLOW: 80 paragraphs, one every 40 ms. HOLD: waits for window.__release() or Stop.
          return `export async function streamReply(c,q,csrf,signal,chunk){
            const text = c.messages.at(-1).text;
            (window.__calls ??= []).push(text);
            const stopped = () => { if (signal.aborted) throw signal.reason; };
            if (text.includes("SLOW"))
              for (let i = 0; i < 80; i++) {
                stopped();
                chunk("Synthetic line " + i + ".\\n\\n");
                await new Promise((r) => setTimeout(r, 40));
              }
            else if (text.includes("HOLD")) {
              await new Promise((release, reject) => {
                window.__release = release;
                signal.addEventListener("abort", () => reject(signal.reason));
              });
              chunk("Held answer.");
            } else chunk("Synthetic answer.");
            stopped();
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

async function open(lang: Lang, width: number, touch = false) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    // German runs with reduced motion (no smooth scrolling), English with motion allowed.
    reducedMotion: lang === "de" ? "reduce" : "no-preference",
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 100000 } },
          search: false,
        },
      });
    return route.continue();
  });
  await page.goto(origin, { timeout: 90000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { context, page, navigations };
}

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls?: string[] }).__calls ?? []);
const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
/** How far the conversation view is from its end, in pixels. */
const fromEnd = (page: Page) =>
  page
    .locator("main")
    .evaluate((main) => Math.round(main.scrollHeight - main.scrollTop - main.clientHeight));
const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "");

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`keyboard at ${width} px, ${lang}: Enter sends once, the view follows, files drop in`, async () => {
      const t = appText[lang];
      const ct = composerText[lang];
      const { context, page, navigations } = await open(lang, width);
      try {
        const box = page.getByLabel(t.messageInput);
        const send = page.getByRole("button", { name: t.sendLabel, exact: true });
        const done = page.locator("p.answer-announcement");
        await ui(box).toBeVisible();
        await noSidewaysScroll(page);
        // The hint is shown only where there is a keyboard and room.
        const hint = page.getByText(ct.enterHint);
        if (width > 760) await ui(hint).toBeVisible();
        else await ui(hint).toBeHidden();
        const oneLine = await box.evaluate((el) => el.clientHeight);

        // Enter with nothing, or only spaces, sends nothing and adds no line.
        await box.focus();
        await page.keyboard.press("Enter");
        await page.keyboard.type("   ");
        await page.keyboard.press("Enter");
        await ui(box).toHaveValue("   ");
        await box.fill("");

        // Shift+Enter makes a line; the box grows.
        await page.keyboard.type("First line");
        await page.keyboard.press("Shift+Enter");
        await page.keyboard.type("second line");
        await page.keyboard.press("Shift+Enter");
        await page.keyboard.type("third line");
        await ui(box).toHaveValue("First line\nsecond line\nthird line");
        expect(await box.evaluate((el) => el.clientHeight)).toBeGreaterThan(oneLine);

        // Enter while an input method composes text does nothing.
        for (const init of [{ isComposing: true }, { keyCode: 229 }])
          expect(
            await box.evaluate(
              (el, extra) =>
                el.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...extra }),
                ),
              init,
            ),
          ).toBe(true); // not handled: the browser's own behaviour stays
        expect(await calls(page)).toEqual([]);

        // Enter sends, once. The box is empty, back to one line, and still has the focus.
        await page.keyboard.press("Enter");
        await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer.");
        expect(await calls(page)).toEqual(["First line\nsecond line\nthird line"]);
        await ui(box).toHaveValue("");
        expect(await box.evaluate((el) => el.clientHeight)).toBe(oneLine);
        expect(await focusedId(page)).toBe("message-input");
        // Screen readers hear once that the answer is complete.
        await ui(done).toHaveText(connectionText[lang].answerComplete);

        // Enter while a reply runs does nothing: no send, no line. Chunks are not announced.
        await page.keyboard.type("HOLD one");
        await page.keyboard.press("Enter");
        await ui(page.getByRole("button", { name: t.stopResponse })).toBeVisible();
        await ui(done).toHaveText("");
        await page.keyboard.type("typed while busy");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await ui(box).toHaveValue("typed while busy");
        expect(await calls(page)).toHaveLength(2);
        await page.evaluate(() => (window as unknown as { __release(): void }).__release());
        await ui(page.locator("article.assistant").last()).toContainText("Held answer.");
        await ui(done).toHaveText(connectionText[lang].answerComplete);
        expect(await calls(page)).toHaveLength(2);

        // Send with the button: the focus goes back to the box. Stop: the same.
        await box.fill("HOLD two");
        await send.click();
        await ui(page.getByRole("button", { name: t.stopResponse })).toBeVisible();
        expect(await focusedId(page)).toBe("message-input");
        await page.getByRole("button", { name: t.stopResponse }).click();
        await ui(send).toBeVisible();
        expect(await focusedId(page)).toBe("message-input");
        await ui(done).toHaveText("");

        // A slow answer: the view follows the newest text.
        await box.fill("SLOW stream");
        await page.keyboard.press("Enter");
        const answer = page.locator("article.assistant").last();
        await ui(answer).toContainText("Synthetic line 15.");
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(4);
        const jump = page.getByRole("button", { name: ct.jumpLatest, exact: true });
        await ui(jump).toHaveCount(0);
        // Scrolling up stops following and shows the button.
        await page.mouse.move(width / 2, 300);
        await page.mouse.wheel(0, -500);
        await ui(jump).toBeVisible();
        await ui(answer).toContainText("Synthetic line 30.");
        const top = await page.locator("main").evaluate((main) => main.scrollTop);
        await ui(answer).toContainText("Synthetic line 40.");
        expect(
          Math.abs((await page.locator("main").evaluate((main) => main.scrollTop)) - top),
        ).toBeLessThanOrEqual(2);
        await ui(jump).toBeVisible();
        // The button is big enough, on screen and above the message box.
        const button = (await jump.boundingBox())!;
        const form = (await page.locator("form.composer").boundingBox())!;
        expect(Math.min(button.width, button.height)).toBeGreaterThanOrEqual(width <= 760 ? 44 : 24);
        expect(button.y + button.height).toBeLessThanOrEqual(form.y);
        expect(button.x).toBeGreaterThanOrEqual(0);
        expect(button.x + button.width).toBeLessThanOrEqual(width);
        // By keyboard: it resumes following and hands the focus to the box.
        await jump.focus();
        await page.keyboard.press("Enter");
        await ui(jump).toHaveCount(0);
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(4);
        expect(await focusedId(page)).toBe("message-input");
        await ui(answer).toContainText("Synthetic line 79.");
        await ui(done).toHaveText(connectionText[lang].answerComplete);
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(4);
        // Scrolling back to the end by hand also resumes.
        await page.mouse.wheel(0, -500);
        await ui(jump).toBeVisible();
        await page.mouse.wheel(0, 5000);
        await ui(jump).toHaveCount(0);
        await noSidewaysScroll(page);

        // "Copied" at the button itself, for about two seconds.
        const copy = answer.getByRole("button", { name: t.copyAnswer, exact: true });
        await copy.click();
        await ui(answer.getByRole("button", { name: ct.copied, exact: true })).toBeVisible();
        await ui(copy).toBeVisible({ timeout: 5000 });

        // A dragged file shows the drop target; the drop is imported and the browser's own
        // handling (opening the file, which leaves the app) is cancelled.
        const before = navigations.length;
        const drag = (type: string, name: string) =>
          page.locator("main").evaluate(
            (main, [type, name]) => {
              const data = new DataTransfer();
              data.items.add(new File(["SYNTHETIC DROPPED NOTE"], name, { type: "text/plain" }));
              const event = new DragEvent(type, { dataTransfer: data, bubbles: true, cancelable: true });
              main.dispatchEvent(event);
              return event.defaultPrevented;
            },
            [type, name],
          );
        expect(await drag("dragover", "dropped-note.txt")).toBe(true);
        await ui(page.getByText(ct.dropHere)).toBeVisible();
        expect(await drag("drop", "dropped-note.txt")).toBe(true);
        await ui(page.getByText(ct.dropHere)).toHaveCount(0);
        const results = page.getByRole("region", { name: t.importResults });
        await ui(results).toContainText("dropped-note.txt — added", { timeout: 30000 });
        // A pasted file goes the same way; pasted text is left to the browser.
        const paste = (file: boolean) =>
          box.evaluate((el, file) => {
            const data = new DataTransfer();
            if (file) data.items.add(new File(["SYNTHETIC PASTED NOTE"], "pasted-note.txt", { type: "text/plain" }));
            else data.setData("text/plain", "plain words");
            const event = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true });
            el.dispatchEvent(event);
            return event.defaultPrevented;
          }, file);
        expect(await paste(false)).toBe(false);
        expect(await paste(true)).toBe(true);
        await ui(results).toContainText("pasted-note.txt — added", { timeout: 30000 });
        expect(navigations.length).toBe(before);
        expect(page.url()).toBe(`${origin}/`);
        await noSidewaysScroll(page);

        // A real paste over the limit is cut by the browser; the notice says so. Near the
        // limit a counter shows.
        await box.fill("word ".repeat(3900));
        await ui(page.getByText(ct.remaining((500).toLocaleString(lang)))).toBeVisible();
        await page.evaluate(() => navigator.clipboard.writeText("more ".repeat(180)));
        await box.focus();
        await page.keyboard.press("End");
        await page.keyboard.press("Control+V");
        const cut = ct.limitCut((20000).toLocaleString(lang));
        await ui(page.locator("#composer-limit")).toHaveText(cut);
        expect(await box.evaluate((el: HTMLTextAreaElement) => el.value.length)).toBe(20000);
        expect(await box.evaluate((el) => el.clientHeight)).toBeLessThanOrEqual(160);
        await noSidewaysScroll(page);

        // Offline: a banner, the draft stays; back online it goes away.
        await box.fill("draft kept while offline");
        await ui(page.locator("#composer-limit")).toHaveText("");
        expect(await box.evaluate((el) => el.clientHeight)).toBe(oneLine);
        await context.setOffline(true);
        await ui(page.getByText(connectionText[lang].offline)).toBeVisible();
        await ui(box).toHaveValue("draft kept while offline");
        await noSidewaysScroll(page);
        await context.setOffline(false);
        await ui(page.getByText(connectionText[lang].offline)).toHaveCount(0);

        // Touch targets of the composer controls.
        const sendBox = (await send.boundingBox())!;
        expect(Math.min(sendBox.width, sendBox.height)).toBeGreaterThanOrEqual(24);
        // Four sends were intended; the fake received four.
        expect(await calls(page)).toEqual([
          "First line\nsecond line\nthird line",
          "HOLD one",
          "HOLD two",
          "SLOW stream",
        ]);
      } finally {
        await context.close();
      }
    }, 120_000);

for (const lang of ["en", "de"] as const)
  it(`touch phone, ${lang}: Enter stays a new line and the button sends`, async () => {
    const t = appText[lang];
    const { context, page } = await open(lang, 375, true);
    try {
      expect(
        await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches),
      ).toBe(true);
      const box = page.getByLabel(t.messageInput);
      await ui(page.getByText(composerText[lang].enterHint)).toBeHidden();
      await box.focus();
      await page.keyboard.type("line one");
      await page.keyboard.press("Enter");
      await page.keyboard.type("line two");
      await ui(box).toHaveValue("line one\nline two");
      expect(await calls(page)).toEqual([]);
      await page.getByRole("button", { name: t.sendLabel, exact: true }).tap();
      await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer.");
      expect(await calls(page)).toEqual(["line one\nline two"]);
      // The focus is not put back into the box: that would open the on-screen keyboard.
      expect(await focusedId(page)).not.toBe("message-input");
      await ui(page.locator("p.answer-announcement")).toHaveText(connectionText[lang].answerComplete);
      await noSidewaysScroll(page);
    } finally {
      await context.close();
    }
  }, 120_000);
