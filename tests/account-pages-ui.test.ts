// The production account page (/account, AccountLab with synthetic off) and the data controls, in a
// real browser at 375, 768 and 1280 px, in English and German: the chat-unavailable banner only when
// the status says so, no "Add passkey" or "Sign out other sessions" in production, the deletion phrase
// in the page's language, section headings smaller than the card heading, export built in the
// browser, delete-all behind a confirmation. Offline: every /api call is answered here.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { accountAccessText, accountDeletionText, accountExportText, accountLabText, usageText } from "../src/text/account";
import { accountConfirmText } from "../src/text/account-confirm";
import { modeCopyText } from "../src/text/mode-copy";
import { questionText } from "../src/text/questions";
import { dataControlsText } from "../src/text/data-controls";
import { sessionExpiryText } from "../src/text/session-expiry";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const now = "2026-11-16T09:00:00.000Z";
const user = { id: "u1", email: "alice@example.com" };

beforeAll(async () => {
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-account-pages-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await warmDevServer(vite);
  await vite.warmupRequest("/src/AccountLab.tsx");
  await vite.warmupRequest("/tests/fixtures/data-controls-entry.tsx");
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

type Options = { signedIn?: boolean; ready?: boolean; purgeDays?: number; secure?: boolean };
const outside: string[] = [];
/** Session sign-outs the page asked for. */
const revoked: string[] = [];

async function open(path: string, width: number, lang: "en" | "de", o: Options = {}) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    const json = (body: unknown) => route.fulfill({ json: body });
    switch (url.pathname) {
      case "/api/account/options":
        return json({ synthetic: false, socialProviders: ["google"], emailEnabled: true, workspaceEnabled: true });
      case "/api/auth/get-session":
        return json(o.signedIn === false ? null : { user });
      case "/api/account/access":
        return json({
          sessions: [{ id: "11111111-1111-4111-8111-111111111111", createdAt: now, updatedAt: now, expiresAt: now, current: true }],
          passkeys: [{ id: "33333333-3333-4333-8333-333333333333", name: null, createdAt: now }],
          providers: [],
        });
      case "/api/account/security-notices":
        return json({ notices: [] });
      case "/api/status":
        return json({
          csrf: "SYNTHETIC",
          inference: { ready: o.ready ?? true, reason: "OFFLINE ONLY" },
          search: false,
          ...(o.purgeDays ? { accountPurge: { graceDays: o.purgeDays } } : {}),
          ...(o.secure ? { secureStore: { quotaBytes: 1, filesQuotaBytes: 1 } } : {}),
        });
      case "/api/account/access/revoke":
        revoked.push(route.request().postDataJSON().id);
        return route.fulfill({ status: 204 });
      case "/data-controls":
        return route.fulfill({
          contentType: "text/html",
          body: await vite.transformIndexHtml(
            "/data-controls",
            `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/data-controls-entry.tsx"></script></body></html>`,
          ),
        });
    }
    if (url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
  await page.goto(origin + path, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const fontSize = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: the production account page`, async () => {
      const t = accountLabText[lang];
      const d = accountDeletionText[lang];
      const page = await open("/account", width, lang);
      try {
        await ui(page.getByRole("heading", { name: t.headingAccount, level: 1 })).toBeVisible();
        await ui(page.getByText(t.signedInAs)).toContainText(user.email);
        // Chat is ready: no "not available" banner.
        await ui(page.getByText(t.bannerEarly)).toHaveCount(0);
        // Passkey sign-in is not offered in production, so adding one is not either; existing ones stay removable.
        for (const name of [t.addPasskey, t.addTestPasskey, t.signOutOtherTest])
          await ui(page.getByRole("button", { name, exact: true })).toHaveCount(0);
        await ui(page.getByRole("button", { name: /passkey/i }).first()).toBeVisible();
        // The deletion phrase in the page's language; German accepts a decomposed Ö.
        const closure = page.getByRole("region", { name: d.titleClose });
        await ui(closure).toContainText(d.retention());
        const input = closure.getByLabel(d.typeToConfirm(d.phrase));
        const button = closure.getByRole("button", { name: d.close });
        await ui(button).toBeDisabled();
        await input.fill(lang === "de" ? "KONTO LÖSCHEN" : "DELETE ACCOUNT");
        await ui(button).toBeEnabled();
        if (lang === "de") {
          await input.fill("DELETE ACCOUNT");
          await ui(button).toBeDisabled();
        }
        // Section headings stay below the card heading (SS-20).
        const h1 = await fontSize(page, ".account-preview-card h1");
        for (const h2 of await page.locator(".account-preview-card h2").all())
          expect(await h2.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeLessThan(h1);
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
    }, 60_000);

for (const lang of LANGS)
  it(`${lang}: the banner shows when chat is not ready, and the deletion text names the purge days`, async () => {
    const t = accountLabText[lang];
    const d = accountDeletionText[lang];
    const page = await open("/account", 375, lang, { ready: false, purgeDays: 30 });
    try {
      await ui(page.getByText(t.bannerEarly)).toBeVisible();
      await ui(page.getByRole("region", { name: d.titleClose })).toContainText(d.retention(30));
      await noSidewaysScroll(page);
    } finally {
      await page.context().close();
    }
    const signedOut = await open("/account", 375, lang, { signedIn: false, ready: false });
    try {
      await ui(signedOut.getByRole("heading", { name: t.headingLogin })).toBeVisible();
      await ui(signedOut.getByText(t.bannerEarly)).toHaveCount(0);
    } finally {
      await signedOut.context().close();
    }
  }, 60_000);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: export my chats and delete all chats`, async () => {
      const t = dataControlsText[lang];
      const page = await open("/data-controls", width, lang);
      try {
        const region = page.getByRole("region", { name: t.heading });
        await ui(region.getByRole("heading", { name: t.exportHeading })).toBeVisible();
        // Markdown: the saved chats, never the incognito one, made in the browser.
        const [markdown] = await Promise.all([page.waitForEvent("download"), region.getByRole("button", { name: t.exportMarkdown }).click()]);
        expect(markdown.suggestedFilename()).toMatch(/^cometrow-chats-\d{4}-\d{2}-\d{2}\.md$/);
        const md = readFileSync((await markdown.path())!, "utf8");
        expect(md).toContain("## Synthetic tax question");
        expect(md).toContain(`**${t.you}:**`);
        expect(md).toContain("Synthetic answer c22");
        expect(md).not.toContain("Incognito");
        await ui(region.getByText(t.exported(2))).toBeVisible();
        const [json] = await Promise.all([page.waitForEvent("download"), region.getByRole("button", { name: t.exportJson }).click()]);
        const data = JSON.parse(readFileSync((await json.path())!, "utf8")) as { format: string; conversations: { id: string }[] };
        expect(data.format).toBe("cometrow-chats");
        expect(data.conversations.map((c) => c.id)).toEqual(["c1", "c22"]);
        // Buttons are big enough to tap; 44 px on phones.
        for (const button of await region.getByRole("button").all())
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
        // Delete all: a confirmation first, Cancel keeps everything and returns focus.
        const remove = region.getByRole("button", { name: t.deleteButton });
        await remove.click();
        const dialog = page.getByRole("dialog", { name: t.confirmTitle });
        await ui(dialog).toContainText(t.confirmChats);
        await ui(dialog.getByRole("button", { name: t.cancel })).toBeFocused();
        await dialog.getByRole("button", { name: t.cancel }).click();
        await ui(dialog).toHaveCount(0);
        await ui(remove).toBeFocused();
        expect(await page.evaluate(() => (window as unknown as { deleteCalls?: number }).deleteCalls ?? 0)).toBe(0);
        await remove.click();
        await page.getByRole("dialog", { name: t.confirmTitle }).getByRole("button", { name: t.confirm }).click();
        await ui(region.getByText(t.deleted)).toBeVisible();
        expect(await page.evaluate(() => (window as unknown as { deleteCalls?: number }).deleteCalls)).toBe(1);
        await ui(remove).toBeFocused();
        // The usage page with chat not ready says so; developer details stay hidden.
        await ui(page.getByText(usageText[lang].providerNote)).toBeVisible();
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
    }, 60_000);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: after an ended session the sign-in page says why (SS-14)`, async () => {
      const t = accountLabText[lang];
      const page = await open("/account?reason=expired", width, lang, { signedIn: false });
      try {
        await ui(page.getByRole("heading", { name: t.headingLogin })).toBeVisible();
        await ui(page.getByText(sessionExpiryText[lang].expired, { exact: true })).toBeVisible();
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
      // Without the reason (or another value) the line is not there.
      const plain = await open("/account?reason=other", width, lang, { signedIn: false });
      try {
        await ui(plain.getByRole("heading", { name: t.headingLogin })).toBeVisible();
        await ui(plain.getByText(sessionExpiryText[lang].expired)).toHaveCount(0);
      } finally {
        await plain.context().close();
      }
    }, 60_000);

it("a failed delete-all says so and keeps the chats", async () => {
  const t = dataControlsText.de;
  const page = await open("/data-controls?fail", 375, "de");
  try {
    const region = page.getByRole("region", { name: t.heading });
    await region.getByRole("button", { name: t.deleteButton }).click();
    await page.getByRole("dialog", { name: t.confirmTitle }).getByRole("button", { name: t.confirm }).click();
    await ui(region.getByText(t.failed)).toBeVisible();
    const [markdown] = await Promise.all([page.waitForEvent("download"), region.getByRole("button", { name: t.exportMarkdown }).click()]);
    expect(readFileSync((await markdown.path())!, "utf8")).toContain("Synthetic trip");
  } finally {
    await page.context().close();
  }
}, 60_000);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: with Secure the page says chats are kept with the account; sign-out and removal ask in the app's dialog`, async () => {
      const t = accountLabText[lang];
      const a = accountAccessText[lang];
      const q = questionText[lang];
      const m = modeCopyText[lang];
      const page = await open("/account", width, lang, { secure: true });
      try {
        await ui(page.getByText(m.introSession_secure)).toBeVisible();
        await ui(page.getByText(t.introSession, { exact: true })).toHaveCount(0);
        await ui(page.getByText(m.exportBody_secure)).toBeVisible();
        await ui(page.getByText(accountExportText[lang].body, { exact: true })).toHaveCount(0);
        // Sign out this session: the app's question, Cancel first and keeps it; the button gets the focus back.
        const signOut = page.getByRole("button", { name: a.signOutThis, exact: true });
        await signOut.click();
        const dialog = page.getByRole("dialog", { name: a.confirmThis });
        await ui(dialog).toContainText(accountConfirmText[lang].signOutText);
        await ui(dialog.getByRole("button", { name: q.cancel })).toBeFocused();
        for (const button of await dialog.getByRole("button").all())
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
        const box = (await dialog.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await dialog.getByRole("button", { name: q.cancel }).click();
        await ui(dialog).toHaveCount(0);
        await ui(signOut).toBeFocused();
        expect(revoked).toEqual([]);
        // Remove a passkey: its own question; Escape keeps it.
        await page.getByRole("button", { name: a.removeLabel(a.unnamedPasskey) }).click();
        const remove = page.getByRole("dialog", { name: accountConfirmText[lang].removeTitle });
        await ui(remove).toContainText(a.confirmRemove(a.unnamedPasskey));
        await page.keyboard.press("Escape");
        await ui(remove).toHaveCount(0);
        // Confirm signs the session out (one request).
        await signOut.click();
        await page.getByRole("dialog", { name: a.confirmThis }).getByRole("button", { name: q.signOut }).click();
        await expect.poll(() => revoked.length).toBe(1);
        revoked.length = 0;
        await noSidewaysScroll(page);
      } finally {
        await page.context().close();
      }
    }, 60_000);

// Settings links to these sections (src/SettingsBody.tsx): the heading takes the focus once it has rendered.
for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: a link from Settings lands on its section of the account page`, async () => {
      const a = accountAccessText[lang];
      for (const [hash, name] of [
        ["account-access", a.heading],
        ["account-sessions", a.activeSessions],
        ["account-export", accountExportText[lang].heading],
        ["account-delete", accountDeletionText[lang].titleClose],
      ] as const) {
        const page = await open(`/account#${hash}`, width, lang);
        try {
          await ui(page.getByRole("heading", { name, exact: true })).toBeFocused();
          await ui(page.getByRole("heading", { name, exact: true })).toBeInViewport();
          await noSidewaysScroll(page);
        } finally {
          await page.context().close();
        }
      }
    }, 90_000);

it("sent nothing outside this machine", () => {
  expect(outside).toEqual([]);
});
