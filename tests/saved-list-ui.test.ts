// Saved list and copy (docs/chat-feature-gaps-20261114.md, package E) in a real browser at phone,
// tablet and desktop width, in English and German. Offline: a Vite plugin replaces
// src/inference.ts, the status is faked, and the vault is the browser's own storage.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { appText } from "../src/text/app";
import { libraryText } from "../src/text/conversation-ui";
import { deviceText } from "../src/text/device-features";
import { savedListText } from "../src/text/saved-list";
import { workspaceText } from "../src/text/workspace";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const QUESTION = "Synthetic question about a fee";
const ANSWER = "Synthetic answer.\n\n| A | B |\n| - | - |\n| 1 | 2 |";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-saved-list-ui-test",
    plugins: [
      {
        name: "synthetic-answer",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            chunk(${JSON.stringify(ANSWER)});
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
  await vite.warmupRequest("/tests/fixtures/saved-list-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(path: string, width: number, lang: "en" | "de") {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: 900 },
    hasTouch: width < 760,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  // Saturday 14 November 2026, local time: fixes the date groups.
  await page.clock.setFixedTime(new Date(2026, 10, 14, 12));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
          search: false,
        },
      });
    if (url.pathname === "/saved-list")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/saved-list",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/saved-list-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(origin + path, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}

const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(0);
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());
/** At least 24 px on both sides; 44 px high at phone width. Inside the viewport. */
async function target(control: Locator, width: number) {
  const box = (await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}
const press = async (page: Page, control: Locator, key = "Enter") => {
  await control.focus();
  await page.keyboard.press(key);
};

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: time and copy on the own message, copy as text, no Share, delete asks first`, async () => {
      const a = appText[lang];
      const s = savedListText[lang];
      const l = libraryText[lang];
      const page = await open("/", width, lang);
      try {
        await page.getByLabel(a.messageInput).fill(QUESTION);
        await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
        await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer.");

        // The user's own message: the stored time in small text and a Copy action.
        const mine = page.locator("article.user").first();
        await ui(mine.locator("time.message-time")).toHaveText(lang === "de" ? "12:00" : /^12:00\sPM$/);
        const copy = mine.getByRole("button", { name: s.copyMessageLabel });
        await ui(copy).toHaveText(s.copyMessage);
        await target(copy, width);
        await press(page, copy);
        await ui(mine.locator(".copy-status")).toHaveText(s.copied);
        expect(await clipboard(page)).toBe(QUESTION);
        await noSidewaysScroll(page);

        // The dead Share button is gone, in the header and in the menu.
        await ui(page.locator(".share-preview")).toHaveCount(0);
        const menu = page.locator(".conversation-menu");
        await press(page, menu.locator("summary"));
        await ui(menu.getByRole("button", { name: /Share|Teilen/ })).toHaveCount(0);

        // Copy conversation as text, by keyboard. The menu stays open and says "Copied".
        const copyAll = menu.getByRole("button", { name: s.copyConversation });
        await target(copyAll, width);
        await press(page, copyAll);
        await ui(menu.locator(".copy-status")).toHaveText(s.copied);
        await ui(menu.locator(".copy-status")).toBeVisible();
        const d = deviceText[lang];
        const copied = (await clipboard(page)).replaceAll("\r\n", "\n");
        expect(copied).toMatch(/^# .+\n\n/);
        expect(copied).toContain(d.conversationFrom(lang === "de" ? "14. November 2026" : "November 14, 2026"));
        expect(copied).toContain(`## ${d.question}\n\n${QUESTION}\n\n## ${d.answer}`);
        expect(copied).toContain(ANSWER);
        expect(copied.endsWith(d.footer(lang === "de" ? "14. November 2026" : "November 14, 2026"))).toBe(true);
        // A refused clipboard gives a clear message at the control.
        await page.evaluate(() => {
          navigator.clipboard.writeText = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
        });
        await copyAll.click();
        await ui(menu.locator(".copy-status")).toHaveText(s.copyFailed);
        await noSidewaysScroll(page);

        // Save the conversation in a new vault, then delete it: the app asks first.
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic saved list passphrase");
        await page.getByRole("button", { name: a.createOrUnlock }).click();
        await page.getByRole("button", { name: a.saveSnapshot }).click();
        const library = page.getByRole("region", { name: l.label });
        const row = library.getByRole("article");
        const remove = library.getByRole("button", { name: l.delete, exact: true });
        await ui(remove).toBeEnabled();
        const title = (await row.getAttribute("aria-label"))!;
        expect(title.length).toBeGreaterThan(3);

        const dialog = page.getByRole("dialog", { name: s.deleteTitle });
        const cancel = dialog.getByRole("button", { name: s.cancel });
        const confirm = dialog.getByRole("button", { name: s.deleteConfirm });
        // Escape cancels, keeps the conversation and returns focus.
        await press(page, remove);
        await ui(dialog).toContainText(s.deleteText(title));
        await ui(cancel).toBeFocused();
        await target(cancel, width);
        await target(confirm, width);
        await noSidewaysScroll(page);
        // Focus stays inside the dialog.
        await page.keyboard.press("Tab");
        await ui(confirm).toBeFocused();
        await page.keyboard.press("Tab");
        await ui(cancel).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await ui(confirm).toBeFocused();
        await page.keyboard.press("Escape");
        await ui(dialog).toHaveCount(0);
        await ui(row).toHaveCount(1);
        await ui(remove).toBeFocused();
        // Enter on the default button (Cancel) keeps it too.
        await page.keyboard.press("Enter");
        await ui(cancel).toBeFocused();
        await page.keyboard.press("Enter");
        await ui(dialog).toHaveCount(0);
        await ui(row).toHaveCount(1);
        await ui(remove).toBeFocused();
        // Only the destructive button deletes.
        await page.keyboard.press("Enter");
        await confirm.click();
        await ui(dialog).toHaveCount(0);
        await ui(row).toHaveCount(0);
        await ui(page.getByText(a.noSaved)).toBeVisible();
        await ui(library).toBeFocused();
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
    }, 90_000);

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: sidebar date groups, keyboard pin, archive, rename, search and empty states`, async () => {
      const s = savedListText[lang];
      const w = workspaceText[lang];
      const page = await open("/saved-list?screen=nav", width, lang);
      try {
        const side = page.locator(".sidebar");
        const groups = side.locator(".recent-chats h3");
        const chats = side.locator(".chat-list-row > button");
        await ui(groups).toHaveText([s.pinned, s.today, s.yesterday, s.week, s.older]);
        await ui(chats).toHaveText([
          /^Synthetic pinned chat/,
          "Synthetic chat from today",
          "Synthetic chat from yesterday",
          "Synthetic chat from Tuesday",
          "Synthetic chat from October",
        ]);
        // Each heading sits directly above its chat.
        expect(
          await side.locator(".chat-list-item").evaluateAll((items) =>
            items.map((item) => item.firstElementChild!.tagName),
          ),
        ).toEqual(["H3", "H3", "H3", "H3", "H3"]);
        await noSidewaysScroll(page);
        expect(await side.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
        for (const control of await side.locator("button:visible, summary:visible, input:visible").all()) {
          const box = (await control.boundingBox())!;
          expect(Math.min(box.width, box.height), await control.innerText()).toBeGreaterThanOrEqual(24);
        }

        // Pin by keyboard: the chat moves under "Pinned" and "Yesterday" has nothing left.
        const actions = (title: string) => side.getByLabel(w.chatActions(title), { exact: true });
        await press(page, actions("Synthetic chat from yesterday"));
        const popover = side.locator(".chat-item-menu[open] .chat-item-actions");
        const box = (await popover.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await page.keyboard.press("Tab");
        await ui(popover.getByRole("button", { name: w.pin, exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        await ui(groups).toHaveText([s.pinned, s.today, s.week, s.older]);
        await ui(chats.nth(0)).toHaveText("Synthetic chat from yesterday");
        // Close the menu again from its own button. (The app also closes menus on Escape.)
        await press(page, actions("Synthetic chat from yesterday"));
        await ui(side.locator(".chat-item-menu[open]")).toHaveCount(0);

        // Archive by keyboard: gone from the recent list, shown under "Archived".
        await press(page, actions("Synthetic chat from Tuesday"));
        await press(page, side.locator(".chat-item-menu[open]").getByRole("button", { name: w.archive, exact: true }));
        await ui(chats).toHaveCount(4);
        await ui(groups).toHaveText([s.pinned, s.today, s.older]);
        await press(page, side.getByRole("button", { name: w.archived, exact: true }));
        await ui(chats).toHaveText(["Synthetic chat from Tuesday"]);
        await ui(groups).toHaveText([s.week]);
        await press(page, side.getByRole("button", { name: w.recent, exact: true }));

        // Search: results carry no date headings; no result gives a visible note.
        const search = side.getByPlaceholder(w.searchPlaceholder);
        await search.fill("october");
        await ui(chats).toHaveText(["Synthetic chat from October"]);
        await ui(groups).toHaveCount(0);
        await search.fill("no such chat");
        await ui(chats).toHaveCount(0);
        await ui(side.locator(".recent-chats .sidebar-hint")).toHaveText(w.noMatch);
        await search.fill("");
        await ui(chats).toHaveCount(4);

        // Rename and "New chat" from the keyboard.
        await press(page, actions("Synthetic chat from today"));
        await press(page, side.locator(".chat-item-menu[open]").getByRole("button", { name: w.renameManage }));
        await expect.poll(() => page.title()).toBe("opened Saved");
        await press(page, side.getByRole("button", { name: w.newConversation, exact: true }));
        await expect.poll(() => page.title()).toBe("new chat");
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
      const empty = await open("/saved-list?screen=empty", width, lang);
      try {
        await ui(empty.locator(".recent-chats .sidebar-hint")).toHaveText(w.noSaved);
        await ui(empty.locator(".recent-chats h3")).toHaveCount(0);
        await noSidewaysScroll(empty);
      } finally {
        await empty.context().close();
      }
    }, 90_000);
