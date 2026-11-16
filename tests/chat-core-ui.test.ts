// Chat core fixes of 16 November in the actual application, at phone, tablet and desktop width, in
// English and German: an empty chat without clutter, keyboard menus, a pasted picture going to the
// picture question, the failure sentence and notice above the message box, Send off while offline,
// one Stop, New chat asking before it stops an answer, and the sidebar's New chat on one line.
// Offline: a Vite plugin replaces src/inference.ts, the status is faked, nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { chatCoreText } from "../src/text/chat-core";
import { questionText } from "../src/text/questions";
import { connectionText } from "../src/text/connection";
import { imageText } from "../src/text/images";
import { workspaceText } from "../src/text/workspace";
import { titleFrom } from "../src/title-from";

type Lang = "en" | "de";
let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-chat-core-ui-test",
    plugins: [
      {
        name: "synthetic-chat-core-stream",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // TIMEOUT: fails at once as a timeout. HOLD: waits for Stop (or a new chat).
          return `export async function streamReply(c,q,csrf,signal,chunk){
            const text = c.messages.at(-1).text;
            (window.__calls ??= []).push(text);
            if (text.includes("TIMEOUT")) throw new DOMException("synthetic", "TimeoutError");
            if (text.includes("HOLD"))
              await new Promise((release, reject) => {
                window.__release = release;
                signal.addEventListener("abort", () => reject(signal.reason));
              });
            chunk("Synthetic answer.");
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

async function open(lang: Lang, width: number, ready = true) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
  });
  const page = await context.newPage();
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      external.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 100000 } },
          search: false,
          images: { maxBytes: 280_000 },
        },
      });
    return route.continue();
  });
  await page.goto(origin, { timeout: 90000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { context, page, external };
}

const vis = (l: Locator) => l.filter({ visible: true }).first();
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls?: string[] }).__calls ?? []);
const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
/** The element is on screen and below the sticky header, not hidden under it. */
async function belowHeader(page: Page, element: Locator) {
  const header = (await page.locator(".conversation-header").boundingBox())!;
  const box = (await element.boundingBox())!;
  const height = page.viewportSize()!.height;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
}
/** How many lines a button's own text takes (icons are not counted). */
const textLines = (button: Locator) =>
  button.evaluate((el) => {
    const tops = new Set<number>();
    for (const node of el.childNodes)
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) tops.add(Math.round(rect.top));
      }
    return tops.size;
  });

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`chat core at ${width} px, ${lang}`, async () => {
      const t = appText[lang];
      const cc = chatCoreText[lang];
      const q = questionText[lang];
      const im = imageText[lang];
      const w = workspaceText[lang];
      const { context, page, external } = await open(lang, width);
      try {
        const box = page.getByLabel(t.messageInput);
        const send = page.getByRole("button", { name: t.sendLabel, exact: true });
        await ui(box).toBeVisible();

        // An empty chat: no visible "Conversation" heading (it is there for screen readers), no
        // context count, no dead "Coming later" controls, no arrow on the starters, no jump down.
        const heading = page.locator("h1");
        await ui(heading).toHaveText(t.tabConversation);
        await ui(heading).toHaveClass(/sr-only/);
        await ui(page.getByRole("heading", { level: 1, name: t.tabConversation })).toHaveCount(1);
        await ui(page.locator(".context-count")).toHaveCount(0);
        await ui(page.locator(".future-voice, .coming-later-list")).toHaveCount(0);
        expect(await page.locator(".starter-grid").innerText()).not.toContain("↗");
        expect(await page.locator("main").evaluate((main) => main.scrollTop)).toBe(0);
        // The protection status is one small line; "Privacy details" still opens it.
        const protection = page.locator(".connection-banner");
        await ui(protection).toContainText(t.protectedAvailable);
        expect((await protection.boundingBox())!.height).toBeLessThanOrEqual(40);
        await protection.locator("summary").click();
        await ui(protection).toHaveAttribute("open", "");
        await protection.locator("summary").click();
        await noSidewaysScroll(page);

        // "+" by keyboard: focus goes to the first item, arrows/Home/End move, Escape returns.
        const plus = page.getByLabel(t.tools, { exact: true });
        await plus.focus();
        await page.keyboard.press("Enter");
        const items = page.locator(".tools-menu .menu-surface button:not(:disabled)");
        await ui(items.first()).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await ui(items.nth(1)).toBeFocused();
        await page.keyboard.press("End");
        await ui(items.last()).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await ui(items.first()).toBeFocused();
        await page.keyboard.press("ArrowUp");
        await ui(items.last()).toBeFocused();
        await page.keyboard.press("Home");
        await ui(items.first()).toBeFocused();
        // Every item looks the same (one class, an icon); no disabled rows, no fine print.
        expect(
          await page
            .locator(".tools-menu .menu-surface > button")
            .evaluateAll((buttons) =>
              buttons.every((b) => b.classList.contains("text-button") && !!b.querySelector("svg") && !(b as HTMLButtonElement).disabled),
            ),
        ).toBe(true);
        await ui(page.locator(".tools-menu .menu-surface p")).toHaveCount(0);
        await page.keyboard.press("Escape");
        await ui(page.locator(".tools-menu[open]")).toHaveCount(0);
        await ui(plus).toBeFocused();

        // The header "…": no "Conversation" item on the conversation; focus moves into it.
        const more = page.getByLabel(t.conversationActions, { exact: true });
        await more.click();
        const menu = page.locator(".conversation-menu");
        await ui(menu.getByRole("button", { name: t.tabConversation, exact: true })).toHaveCount(0);
        await ui(menu.locator(".menu-surface button:not(:disabled)").first()).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await ui(menu.locator(".menu-surface button:not(:disabled)").nth(1)).toBeFocused();
        await page.keyboard.press("Escape");
        await ui(page.locator(".conversation-menu[open]")).toHaveCount(0);
        await ui(more).toBeFocused();

        // A pasted picture opens "Ask about a picture" (its notice first), not the text reader.
        await box.evaluate(async (el) => {
          const canvas = document.createElement("canvas");
          [canvas.width, canvas.height] = [200, 120];
          canvas.getContext("2d")!.fillRect(0, 0, 200, 120);
          const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
          const data = new DataTransfer();
          data.items.add(new File([blob], "pasted.png", { type: "image/png" }));
          el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
        });
        await ui(page.getByRole("heading", { name: im.noteTitle })).toBeVisible({ timeout: 30_000 }); // loaded on demand: the dev server compiles it on first use
        await page.getByRole("button", { name: im.noteContinue }).click();
        // The picture is already chosen: the dialog opens at turn and crop.
        await ui(page.getByRole("button", { name: im.pickUse })).toBeEnabled();
        await noSidewaysScroll(page);
        await page.keyboard.press("Escape");
        await ui(page.locator("dialog[open]")).toHaveCount(0);
        await ui(page.getByRole("region", { name: t.importResults })).toHaveCount(0);
        expect(await calls(page)).toEqual([]);

        // A failed answer: one plain sentence in the message, the notice just above the message
        // box and below the header. The title is the first line cut at a word.
        const first =
          "TIMEOUT please write a friendly but firm message to my landlord about the heating\nsecond line";
        await box.fill(first);
        await send.click();
        const answer = page.locator("article.assistant").last();
        await ui(answer).toContainText(cc.failureTimeout);
        await ui(answer).not.toContainText("excluded from future context");
        await ui(heading).toHaveText(titleFrom(first));
        await ui(heading).not.toHaveClass(/sr-only/);
        const notice = page.locator(".composer-dock > .dock-notice");
        await ui(notice).toContainText(t.timedOut(false).split(".")[0]);
        await belowHeader(page, notice);
        await ui(page.locator(".conversation-meta")).toHaveText(t.messageCount(2));
        // The count says "1 message", on one line.
        const count = page.locator(".context-count");
        await ui(count).toHaveText(t.contextCount(1, 0));
        expect(await textLines(count)).toBe(1);
        await notice.getByRole("button", { name: t.dismissNotice }).click();
        await ui(notice).toHaveCount(0);
        await noSidewaysScroll(page);

        // Offline: Send is off and says why; Enter sends nothing; the draft stays; back online it works.
        await box.fill("draft kept while offline");
        await context.setOffline(true);
        const offline = page.locator(".composer-dock > .offline-banner");
        await ui(offline).toHaveText(connectionText[lang].offline);
        await belowHeader(page, offline);
        await ui(send).toBeDisabled();
        await ui(send).toHaveAttribute("aria-describedby", "offline-reason");
        await box.focus();
        await page.keyboard.press("Enter");
        await ui(box).toHaveValue("draft kept while offline");
        await context.setOffline(false);
        await ui(offline).toHaveCount(0);
        await ui(send).toBeEnabled();
        await ui(box).toHaveValue("draft kept while offline");
        expect(await calls(page)).toHaveLength(1);

        // While an answer streams: one Stop (the message box's), and New chat asks first.
        await box.fill("HOLD please");
        await send.click();
        const stop = page.getByRole("button", { name: t.stopResponse, exact: true });
        await ui(stop).toBeVisible();
        await ui(page.getByRole("button", { name: t.stop, exact: true })).toHaveCount(0);
        const newChat = async () => {
          const toggle = page.getByRole("button", { name: t.openNavigation });
          if (await toggle.isVisible()) await toggle.click();
          await vis(page.getByRole("button", { name: w.newConversation, exact: true })).click();
        };
        // The app's own question (not the browser's): Cancel keeps the answer, focus goes back.
        await newChat();
        const asked = page.getByRole("dialog", { name: q.stopTitle });
        await ui(asked).toContainText(cc.stopForNewUnsaved);
        await ui(asked.getByRole("button", { name: q.cancel })).toBeFocused();
        await asked.getByRole("button", { name: q.cancel }).click();
        await ui(asked).toHaveCount(0);
        await ui(vis(page.getByRole("button", { name: w.newConversation, exact: true }))).toBeFocused();
        if (width <= 760) await page.keyboard.press("Escape");
        await ui(stop).toBeVisible();
        await ui(page.locator("article.assistant")).toHaveCount(2);
        await newChat();
        await page.getByRole("dialog", { name: q.stopTitle }).getByRole("button", { name: q.stop }).click();
        await ui(page.locator("article.message")).toHaveCount(0);
        await ui(stop).toHaveCount(0);
        await ui(heading).toHaveClass(/sr-only/);

        // The sidebar's New chat is one line (at 375 it is in the drawer, checked there too).
        const toggle = page.getByRole("button", { name: t.openNavigation });
        if (await toggle.isVisible()) await toggle.click();
        const newButton = vis(page.getByRole("button", { name: w.newConversation, exact: true }));
        await ui(newButton).toContainText(w.newChat);
        expect(await textLines(newButton)).toBe(1);
        const incognito = vis(page.getByRole("button", { name: w.newIncognito, exact: true }));
        expect(await textLines(incognito)).toBe(1);
        const incognitoBox = (await incognito.boundingBox())!;
        expect(incognitoBox.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 24);
        await noSidewaysScroll(page);
        expect(external).toEqual([]);
      } finally {
        await context.close();
      }
    }, 120_000);

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`a picture with no readable text points to Ask about a picture, ${width} px, ${lang}`, async () => {
      const t = appText[lang];
      const im = imageText[lang];
      const { context, page, external } = await open(lang, width);
      try {
        const png = await page.evaluate(async () => {
          const canvas = document.createElement("canvas");
          [canvas.width, canvas.height] = [240, 160];
          const g = canvas.getContext("2d")!;
          g.fillStyle = "#fff";
          g.fillRect(0, 0, 240, 160);
          const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
          return [...new Uint8Array(await blob.arrayBuffer())];
        });
        // Through the file picker (not a paste): the text reader cannot use it (no printed text;
        // in this test server its OCR cannot load, so it fails as unreadable).
        await page.getByLabel(t.attachFiles).setInputFiles({ name: "blank.png", mimeType: "image/png", buffer: Buffer.from(png) });
        const results = page.getByRole("region", { name: t.importResults });
        const hint = results.getByRole("button", { name: im.menu, exact: true });
        await ui(hint).toBeVisible({ timeout: 90_000 });
        await ui(results).toContainText(chatCoreText[lang].pictureHint);
        expect((await hint.boundingBox())!.height).toBeGreaterThanOrEqual(24);
        await noSidewaysScroll(page);
        await hint.click();
        await ui(page.getByRole("heading", { name: im.noteTitle })).toBeVisible({ timeout: 30_000 }); // loaded on demand: the dev server compiles it on first use
        expect(await calls(page)).toEqual([]);
        expect(external).toEqual([]);
      } finally {
        await context.close();
      }
    }, 150_000);

for (const lang of ["en", "de"] as const)
  it(`chat not available yet, 375 px, ${lang}: one line at the message box, not under the header`, async () => {
    const t = appText[lang];
    const { context, page, external } = await open(lang, 375, false);
    try {
      const line = page.locator(".composer-dock > .connection-banner");
      await ui(line).toContainText(t.privateNotYet);
      await ui(page.locator("main > .connection-banner")).toHaveCount(0);
      await belowHeader(page, line);
      expect((await line.boundingBox())!.height).toBeLessThanOrEqual(48);
      await ui(page.getByRole("button", { name: t.sendLabel, exact: true })).toBeDisabled();
      await noSidewaysScroll(page);
      expect(external).toEqual([]);
    } finally {
      await context.close();
    }
  }, 120_000);
