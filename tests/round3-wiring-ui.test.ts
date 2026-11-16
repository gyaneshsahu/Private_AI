// Round 3 wiring of 16 November in the actual application, at 375, 768 and 1280 px, in English and
// German: the skip link (SS-23), the keyboard shortcuts list from the account menu and from Help,
// Help's documents, the footer (FE-19), the incognito caption, and "+" > "Search the web" (FE-07):
// the next Send opens the in-chat approval card for exactly the typed text, nothing is searched
// before its button. Offline: a Vite plugin replaces src/inference.ts, the status and the research
// routes are answered here, nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { workspaceText } from "../src/text/workspace";
import { shortcutsText } from "../src/text/shortcuts";
import { skipLinkText } from "../src/text/skip-link";
import { searchNextText } from "../src/text/search-next";
import { WHEN_TO_SEARCH_TEXT } from "../src/when-to-search";
import { answerIfAsked } from "./fixtures/app-questions";

type Lang = "en" | "de";
let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const outside: string[] = [];
const qualification = {
  maxInputCharacters: 100000,
  model: "SYNTHETIC_FAST",
  modes: {
    fast: { model: "SYNTHETIC_FAST", maxOutputTokens: 1024, allowanceCost: 1 },
    thinking: { model: "SYNTHETIC_DEEP", maxOutputTokens: 4096, allowanceCost: 5 },
  },
};

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-round3-wiring-ui-test",
    plugins: [
      {
        name: "synthetic-model",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            const sources = c.attachments.filter((a) => a.selected).flatMap((a) => a.sources);
            chunk(sources.length ? "Synthetic answer with " + sources.length + " sources." : "Synthetic answer without sources.");
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

async function open(lang: Lang, width: number) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    hasTouch: width < 760,
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const searched: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({ json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification }, search: true } });
    if (url.pathname === "/api/research/prepare") {
      searched.push(route.request().postDataJSON().value);
      return route.fulfill({ json: { id: "s".repeat(48) } });
    }
    if (url.pathname === "/api/research/execute")
      return route.fulfill({
        json: {
          sources: [
            {
              id: "synthetic-0001",
              title: "Synthetic page",
              text: "Synthetic result text.",
              url: "https://one.example/result",
              retrievedAt: new Date().toISOString(),
              evidenceKind: "search-excerpt",
            },
          ],
        },
      });
    return route.continue();
  });
  await page.goto(origin, { timeout: 90_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, searched };
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const tall = async (page: Page, width: number, locator: ReturnType<Page["locator"]>) => {
  for (const item of await locator.all()) {
    const box = (await item.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  }
};
/** Opens the account menu, with the navigation drawer first where it is one. */
async function accountMenu(page: Page, lang: Lang) {
  const toggle = page.getByRole("button", { name: appText[lang].openNavigation });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByLabel(workspaceText[lang].accountMenu).click();
}

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`${width} px, ${lang}: skip link, shortcuts list, Help documents, footer, incognito caption, Search the web`, async () => {
      const t = appText[lang];
      const w = workspaceText[lang];
      const sk = shortcutsText[lang];
      const sn = searchNextText[lang];
      const s = WHEN_TO_SEARCH_TEXT[lang];
      const { page, searched } = await open(lang, width);
      try {
        // SS-23: the skip link is the first focusable element, off screen until focused, then on screen.
        const skip = page.getByRole("link", { name: skipLinkText[lang].toMessageBox });
        expect(
          await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>("a[href], button, input, textarea, select, summary, [tabindex]")]
              .find((e) => e.tabIndex >= 0 && !e.matches(":disabled"))
              ?.classList.contains("skip-link"),
          ),
        ).toBe(true);
        expect((await skip.boundingBox())!.y).toBeLessThan(0);
        await skip.focus();
        const box = (await skip.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await page.keyboard.press("Enter");
        await ui(page.getByLabel(t.messageInput)).toBeFocused();

        // The account menu's "Keyboard shortcuts" opens the list; Escape closes it.
        await accountMenu(page, lang);
        await page.getByRole("button", { name: sk.menuEntry, exact: true }).click();
        const help = page.getByRole("dialog", { name: sk.title });
        await ui(help).toBeVisible();
        await ui(help).toContainText(sk.newChat);
        await page.keyboard.press("Escape");
        await ui(help).toHaveCount(0);

        // The keys themselves work in the app: Ctrl+/ opens the list, Shift+Escape goes to the message box.
        await page.keyboard.press("Control+/");
        await ui(help).toBeVisible();
        await page.keyboard.press("Escape");
        await ui(help).toHaveCount(0);
        await page.keyboard.press("Shift+Escape");
        await ui(page.getByLabel(t.messageInput)).toBeFocused();

        // Help: its links open the shortcuts list and the documents.
        await accountMenu(page, lang);
        await page.getByRole("button", { name: w.help, exact: true }).click();
        const links = page.getByRole("group", { name: /./ }).filter({ has: page.getByRole("button", { name: t.imprint, exact: true }) });
        await tall(page, width, links.getByRole("button"));
        await links.getByRole("button", { name: sk.menuEntry, exact: true }).click();
        await ui(help).toBeVisible();
        await page.keyboard.press("Escape");
        await ui(help).toHaveCount(0);
        await ui(links.getByRole("button", { name: sk.menuEntry, exact: true })).toBeFocused();
        await links.getByRole("button", { name: t.gettingStarted, exact: true }).click();
        await ui(page.getByRole("dialog").filter({ hasText: t.guideTitle })).toBeVisible();
        await page.keyboard.press("Escape");
        await links.getByRole("button", { name: t.imprint, exact: true }).click();
        await ui(page.getByRole("dialog").filter({ hasText: t.imprint })).toBeVisible();
        await page.keyboard.press("Escape");
        // FE-19: the footer says what holds in every mode, nothing about an evaluation.
        await ui(page.locator("main > footer")).toHaveText(t.footerNote);
        expect(t.footerNote).toBe(lang === "de" ? "Keine Werbung. Kein Training mit Ihren Daten." : "No advertising. No training on your data.");
        await noSidewaysScroll(page);
        // The skip link from another tab goes to the conversation's message box.
        await skip.focus();
        await page.keyboard.press("Enter");
        await ui(page.getByLabel(t.messageInput)).toBeFocused();

        // FE-07: "+" > "Search the web" arms the next Send; the note says so and can undo it.
        const tools = page.getByLabel(t.tools, { exact: true });
        await tools.click();
        await page.locator(".tools-menu").getByRole("button", { name: sn.menu, exact: true }).click();
        await ui(page.getByLabel(t.messageInput)).toBeFocused();
        const armed = page.locator(".search-next");
        await ui(armed).toContainText(sn.armed);
        await tall(page, width, armed.getByRole("button"));
        await armed.getByRole("button", { name: sn.cancel }).click();
        await ui(armed).toHaveCount(0);
        await tools.click();
        await ui(page.locator(".tools-menu").getByRole("button", { name: sn.menu, exact: true })).toHaveAttribute("aria-pressed", "false");
        await page.locator(".tools-menu").getByRole("button", { name: sn.menu, exact: true }).click();
        await ui(armed).toBeVisible();
        // A plain question (no suggestion of its own): Send opens the card for exactly this text, nothing is searched yet.
        await page.getByLabel(t.messageInput).fill("SYNTHETIC PLAIN QUESTION about write@example.org");
        await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
        const card = page.getByRole("region", { name: t.searchSuggestion });
        await ui(card).toContainText(sn.heading);
        await ui(card.getByRole("button", { name: s.button })).toBeFocused();
        await ui(armed).toHaveCount(0);
        expect(searched).toEqual([]);
        await ui(page.locator("article.assistant")).toHaveCount(0);
        await tall(page, width, card.getByRole("button"));
        await noSidewaysScroll(page);
        // Send again changes nothing while the card is open; the card's button searches exactly the masked text.
        await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
        expect(searched).toEqual([]);
        await card.getByRole("button", { name: s.button }).click();
        await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer with 1 sources.");
        expect(searched).toEqual(["SYNTHETIC PLAIN QUESTION about [email address removed]"]);
        await ui(card).toHaveCount(0);
        // One-shot: the next message is sent without a card or a search.
        await page.getByLabel(t.messageInput).fill("SYNTHETIC SECOND PLAIN QUESTION");
        await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
        await ui(page.locator("article.assistant")).toHaveCount(2);
        expect(searched).toHaveLength(1);
        // Armed again: "Answer without searching" sends it as it is; Escape on the card drops it.
        await tools.click();
        await page.locator(".tools-menu").getByRole("button", { name: sn.menu, exact: true }).click();
        await page.getByLabel(t.messageInput).fill("SYNTHETIC THIRD PLAIN QUESTION");
        await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
        await card.getByRole("button", { name: sn.without }).click();
        await ui(page.locator("article.assistant")).toHaveCount(3);
        // No new search (the earlier results stay in the chat's context, as after any search).
        expect(searched).toHaveLength(1);
        await tools.click();
        await page.locator(".tools-menu").getByRole("button", { name: sn.menu, exact: true }).click();
        await page.getByLabel(t.messageInput).fill("SYNTHETIC FOURTH PLAIN QUESTION");
        await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
        await ui(card).toBeVisible();
        await page.keyboard.press("Escape");
        await ui(card).toHaveCount(0);
        await ui(page.getByLabel(t.messageInput)).toBeFocused();
        expect(searched).toHaveLength(1);

        // An incognito chat is captioned with the incognito name used everywhere else.
        const toggle = page.getByRole("button", { name: t.openNavigation });
        if (await toggle.isVisible()) await toggle.click();
        await page.locator("button.new-incognito").click();
        await answerIfAsked(page, true); // the unsaved chat is discarded (nothing is saved without a vault)
        await ui(page.getByText(t.captionIncognito)).toBeVisible();
        await ui(page.getByText(t.captionTemporary)).toHaveCount(0);
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
    }, 120_000);

it("1280 px, en, automatic search on: Search the web still asks before searching (rule 7)", async () => {
  const t = appText.en;
  const sn = searchNextText.en;
  const { page, searched } = await open("en", 1280);
  try {
    await page.evaluate(() => localStorage.setItem("privateai.autoSearch", "on"));
    await page.reload();
    await page.getByLabel(t.tools, { exact: true }).click();
    await page.locator(".tools-menu").getByRole("button", { name: sn.menu, exact: true }).click();
    await page.getByLabel(t.messageInput).fill("SYNTHETIC PLAIN QUESTION WITH AUTOMATIC SEARCH ON");
    await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
    const card = page.getByRole("region", { name: t.searchSuggestion });
    await ui(card).toContainText(sn.heading);
    await page.waitForTimeout(500);
    expect(searched).toEqual([]);
    await ui(page.locator("article.assistant")).toHaveCount(0);
    await card.getByRole("button", { name: WHEN_TO_SEARCH_TEXT.en.button }).click();
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer with 1 sources.");
    expect(searched).toEqual(["SYNTHETIC PLAIN QUESTION WITH AUTOMATIC SEARCH ON"]);
  } finally {
    await page.context().close();
  }
}, 120_000);

it("sent nothing outside this machine", () => {
  expect(outside).toEqual([]);
});
