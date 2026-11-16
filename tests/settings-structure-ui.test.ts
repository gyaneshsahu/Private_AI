// Settings structure (SS-05, SS-15; docs/settings-structure-20261116.md) in a real browser at 375,
// 768 and 1280 px, in English and German: the tabs and their headings, the language switch only in
// Settings, Settings only in the account menu, legal links and guides in Help, the account page
// links, Archived chats, focus return; and in Secure the neutral "loading" wording while the store
// opens. Offline: /api/status is faked here, every other /api call is refused or held.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { openSettingsMenu } from "./fixtures/open-settings";
import { appText } from "../src/text/app";
import { secureStoreText } from "../src/text/secure-store";
import { modeCopyText } from "../src/text/mode-copy";
import { modesText } from "../src/text/modes";
import { settingsText } from "../src/text/settings";
import { usageText } from "../src/text/account";
import { workspaceText } from "../src/text/workspace";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;

beforeAll(async () => {
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-settings-structure-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

/** secure: "loading" holds the Secure store's requests, "failed" refuses them. */
async function open(width: number, lang: "en" | "de", secure: false | "loading" | "failed" = false) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const outside: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
          search: false,
          accountId: "11111111-1111-4111-8111-111111111111",
          accountEmail: "synthetic@example.test",
          ...(secure ? { secureStore: { quotaBytes: 1, filesQuotaBytes: 1 } } : {}),
        },
      });
    // Secure: the store never answers (it stays "loading"), or it fails.
    if (secure === "loading" && url.pathname.startsWith("/api/secure")) return;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return route.abort();
    return route.continue();
  });
  await page.goto(origin, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, outside };
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: the Settings tabs, the language in General, Settings only in the account menu, guides in Help`, async () => {
      const a = appText[lang];
      const s = settingsText[lang];
      const w = workspaceText[lang];
      const { page, outside } = await open(width, lang);
      try {
        // No DE/EN switch in the header and no Settings in the conversation menu.
        await ui(page.locator(".conversation-header .language-switch")).toHaveCount(0);
        await page.getByLabel(a.conversationActions, { exact: true }).click();
        await ui(page.locator(".conversation-menu").getByRole("button", { name: w.settings, exact: true })).toHaveCount(0);
        await page.keyboard.press("Escape");

        await openSettingsMenu(page, lang);
        const settings = page.getByRole("dialog", { name: a.settings });
        await ui(settings).toBeVisible();
        const tabs = settings.getByRole("navigation", { name: a.settingsSections }).getByRole("button");
        // Memory is off in this build, and no sync: no Personalization, no Secure Max tab.
        await ui(tabs).toHaveText([s.general, s.dataControls, s.security, s.account]);
        // Full screen on phones; tabs are 44 px targets there.
        const box = (await settings.boundingBox())!;
        if (width < 600) expect(Math.round(box.width)).toBe(width);
        for (const tab of await tabs.all()) expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(width < 600 ? 44 : 24);

        // General: the theme keeps its label, the language switch is here.
        await ui(settings.getByRole("heading", { name: s.general, level: 3 })).toBeVisible();
        await ui(settings.getByLabel(a.sectionAppearance, { exact: true })).toBeVisible();
        await ui(settings.getByRole("group", { name: a.languageLabel })).toBeVisible();
        await noSidewaysScroll(page);

        // Data controls: where chats are saved, no training, archived chats, account data; no legal links.
        await tabs.filter({ hasText: s.dataControls }).click();
        await ui(settings.getByRole("heading", { name: s.dataControls, level: 3 })).toBeVisible();
        await ui(settings.getByRole("heading", { name: s.whereSaved })).toBeVisible();
        await ui(settings.getByText(a.savedIntro)).toBeVisible();
        await ui(settings.getByText(a.footerNote)).toBeVisible();
        await ui(settings.getByRole("button", { name: a.historyControls })).toBeVisible();
        await ui(settings.getByRole("button", { name: s.downloadAccountData })).toBeVisible();
        await ui(settings.getByRole("button", { name: a.privacyPolicyLink })).toHaveCount(0);
        await ui(settings.getByRole("button", { name: a.gettingStarted })).toHaveCount(0);
        await noSidewaysScroll(page);

        // Security: the account page's sign-in methods and sessions, and Sign out.
        await tabs.filter({ hasText: s.security }).click();
        await ui(settings.getByRole("heading", { name: s.security, level: 3 })).toBeVisible();
        await ui(settings.getByRole("button", { name: s.signInMethods })).toBeVisible();
        await ui(settings.getByRole("button", { name: s.activeSessions })).toBeVisible();
        await ui(settings.getByRole("button", { name: w.signOut })).toBeVisible();
        await noSidewaysScroll(page);

        // Account: the e-mail, plan and usage, delete account.
        await tabs.filter({ hasText: s.account }).click();
        await ui(settings.getByRole("heading", { name: s.account, level: 3 })).toBeVisible();
        await ui(settings.getByText("synthetic@example.test")).toBeVisible();
        await ui(settings.getByRole("heading", { name: usageText[lang].heading })).toBeVisible();
        await ui(settings.getByText(usageText[lang].vaultNote)).toBeVisible();
        await ui(settings.getByRole("button", { name: s.deleteAccount })).toBeVisible();
        await ui(settings.getByRole("button", { name: a.accountAndUsage })).toHaveCount(0);
        await noSidewaysScroll(page);

        // Escape closes it; the focus goes back to a visible opener.
        await page.keyboard.press("Escape");
        await ui(settings).toBeHidden();
        expect(await page.evaluate(() => !!document.activeElement?.closest(".account-menu, .navigation-toggle"))).toBe(true);

        // Archived chats: offered only while a chat list is open. Locked, nothing to filter.
        await openSettingsMenu(page, lang);
        await tabs.filter({ hasText: s.dataControls }).click();
        await ui(settings.getByRole("button", { name: w.archivedChats })).toHaveCount(0);
        await page.keyboard.press("Escape");
        // Unlocked (a new local vault): Settings closes and the sidebar shows Archived, with the focus.
        await page.getByLabel(a.conversationActions, { exact: true }).click();
        await page.locator(".conversation-menu").getByRole("button", { name: a.renameSave, exact: true }).click();
        await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic settings passphrase 4821");
        await page.getByRole("button", { name: a.createOrUnlock }).click();
        await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
        await openSettingsMenu(page, lang);
        await tabs.filter({ hasText: s.dataControls }).click();
        await settings.getByRole("button", { name: w.archivedChats }).click();
        await ui(settings).toBeHidden();
        const archived = page.locator(".history-filters").getByRole("button", { name: w.archived, exact: true });
        await ui(archived).toHaveAttribute("aria-pressed", "true");
        await ui(archived).toBeFocused();
        await ui(page.getByRole("heading", { name: w.archivedChats })).toBeVisible();
        // A drawer only where the sidebar is one.
        await ui(page.locator("dialog.navigation-drawer[open]")).toHaveCount(width < 760 ? 1 : 0);

        // Help has the guides and legal texts that left Settings; they open over Help.
        const toggle = page.getByRole("button", { name: a.openNavigation });
        if ((await toggle.isVisible()) && !(await page.getByRole("dialog", { name: w.navigation }).isVisible())) await toggle.click();
        const account = page.locator(".account-menu");
        if (!(await account.evaluate((el) => (el as HTMLDetailsElement).open))) await account.locator("summary").click();
        await page.getByRole("navigation", { name: w.workspace }).getByRole("button", { name: w.help, exact: true }).click();
        for (const name of [a.gettingStarted, a.privacyPolicy, a.imprint, a.safetyTitle, a.privacyBoundariesTitle])
          await ui(page.getByRole("button", { name, exact: true })).toBeVisible();
        await page.getByRole("button", { name: a.safetyTitle, exact: true }).click();
        const guide = page.getByRole("dialog", { name: a.safetyTitle });
        await ui(guide).toBeVisible();
        await ui(settings).toBeHidden();
        await page.keyboard.press("Escape");
        await ui(guide).toHaveCount(0);
        await ui(page.getByRole("button", { name: a.safetyTitle, exact: true })).toBeFocused();
        await noSidewaysScroll(page);
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 90_000);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px, Secure while the store loads: no "unlock your local vault", no "temporary session", the Secure notes`, async () => {
      const a = appText[lang];
      const s = settingsText[lang];
      const w = workspaceText[lang];
      const { page, outside } = await open(width, lang, "loading");
      try {
        const toggle = page.getByRole("button", { name: a.openNavigation });
        if (await toggle.isVisible()) await toggle.click();
        const history = page.locator(".history-locked");
        await ui(history).toContainText(s.loadingChats);
        await ui(history).not.toContainText(w.unlockNote);
        await ui(history.getByRole("button")).toHaveCount(0);
        await ui(page.locator(".sidebar-bottom > p")).toContainText(s.loadingChats);
        await ui(page.locator(".sidebar-bottom > p")).not.toContainText(w.temporarySession);
        await openSettingsMenu(page, lang);
        const settings = page.getByRole("dialog", { name: a.settings });
        await settings.getByRole("button", { name: s.dataControls, exact: true }).click();
        await ui(settings.getByText(modesText[lang].secureLine)).toBeVisible();
        await ui(settings.getByText(a.savedIntro)).toHaveCount(0);
        await settings.getByRole("button", { name: s.account, exact: true }).click();
        await ui(settings.getByText(modeCopyText[lang].vaultNote_secure)).toBeVisible();
        await ui(settings.getByText(usageText[lang].vaultNote)).toHaveCount(0);
        // The local vault's passphrase note is not shown in Secure.
        await settings.getByRole("button", { name: s.security, exact: true }).click();
        await ui(settings.getByText(a.recoverySeparate)).toHaveCount(0);
        await noSidewaysScroll(page);
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 90_000);

for (const lang of LANGS)
  it(`${lang} at 375 px, Secure that cannot open: the sidebar says so instead of "loading"`, async () => {
    const { page } = await open(375, lang, "failed");
    try {
      await page.getByRole("button", { name: appText[lang].openNavigation }).click();
      await ui(page.locator(".history-locked")).toContainText(secureStoreText[lang].unavailable);
      await ui(page.locator(".history-locked")).not.toContainText(settingsText[lang].loadingChats);
      await ui(page.locator(".sidebar-bottom > p")).not.toContainText(settingsText[lang].loadingChats);
    } finally {
      await page.context().close();
    }
  }, 60_000);
