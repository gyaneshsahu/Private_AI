// Secure Max screens (docs/product-modes-20261116.md, owner decision of 16 November: a separate
// sidebar section) in a real browser at phone, tablet and desktop width, in English and German:
// the sidebar entry, the section with its band and buttons, the explanation on first open, the
// locked state, the badges, the start switch and the reset with its typed confirmation. Offline:
// a fixture page with the components only. MODES_UI_SHOTS=<folder> also writes screenshots.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { MAX_DIFFERENCES, modesText } from "../src/text/modes";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const SHOTS = process.env.MODES_UI_SHOTS;

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-modes-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/modes-entry.tsx");
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

async function open(width: number, lang: "en" | "de", query = "", height = 900) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
    if (url.pathname === "/modes")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/modes",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/modes-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(origin + "/modes" + query, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, animations: "disabled" });
};
// Everything a person can read or hear on the page right now: the text and the accessible names.
const readable = (page: Page) =>
  page.evaluate(() => document.body.innerText + "\n" + [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join("\n"));
const tall = async (page: Page, locator: ReturnType<Page["locator"]>) => {
  for (const element of await locator.all()) expect((await element.boundingBox())!.height, await element.innerText()).toBeGreaterThanOrEqual(44);
};

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: entry, intro once, section, lock, badges, settings`, async () => {
      const t = modesText[lang];
      const phone = width < 760;
      const page = await open(width, lang);
      const seen: string[] = [];
      try {
        const sidebar = page.locator("#side");
        const entry = sidebar.getByRole("button", { name: t.maxLabel, exact: true });
        const section = sidebar.getByRole("region", { name: t.maxLabel });
        const intro = page.getByRole("dialog", { name: t.maxIntroTitle, exact: true });
        const log = page.locator("#log");

        // The entry opens the section; the first time the explanation comes first, focus on its heading.
        await ui(entry).toBeVisible();
        if (phone) await tall(page, entry);
        await shot(page, `${lang}-${width}-entry`);
        await entry.click();
        await ui(intro).toBeVisible();
        await ui(intro.getByRole("heading", { name: t.maxIntroTitle, exact: true })).toBeFocused();
        await ui(intro.getByText(t.maxDialogParagraph)).toBeVisible();
        await ui(intro.getByRole("list", { name: t.maxDifferentHeading }).getByRole("listitem")).toHaveText(MAX_DIFFERENCES.map((key) => t[key]));
        const confirm = intro.getByRole("button", { name: t.maxConfirm, exact: true });
        await ui(confirm).toBeDisabled();
        const box = (await intro.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        if (phone) await tall(page, intro.getByRole("button"));
        seen.push(await readable(page));
        await shot(page, `${lang}-${width}-intro`);

        // Cancel hands back to the normal sidebar: the entry is there again, with the focus.
        await intro.getByRole("button", { name: t.cancel }).click();
        await ui(intro).toHaveCount(0);
        await ui(log).toHaveText("cancel-intro");
        await ui(entry).toBeVisible();
        await ui(section).toHaveCount(0);
        await ui(entry).toBeFocused();
        // Escape does the same.
        await entry.click();
        await page.keyboard.press("Escape");
        await ui(log).toHaveText("cancel-intro,cancel-intro");
        await ui(entry).toBeVisible();

        // Confirm: the section with its header, band, buttons and lists.
        await entry.click();
        await intro.getByRole("checkbox", { name: t.maxUnderstand }).check();
        await confirm.click();
        await ui(intro).toHaveCount(0);
        await ui(section).toBeVisible();
        await ui(section.getByRole("heading", { name: t.maxLabel, exact: true })).toBeVisible();
        expect(await section.evaluate((element) => getComputedStyle(element).borderLeftWidth)).toBe("4px");
        await ui(section.getByRole("heading").locator("svg")).toBeVisible();
        const newChat = section.getByRole("button", { name: t.maxNewChat, exact: true });
        const newProject = section.getByRole("button", { name: t.maxNewProject, exact: true });
        const lockNow = section.getByRole("button", { name: t.maxLockNow, exact: true });
        await ui(section.locator("#max-list")).toBeVisible();
        await ui(newChat).toBeFocused();
        await ui(section.getByRole("button", { name: t.maxUnlock })).toHaveCount(0);
        if (phone) await tall(page, section.getByRole("button"));
        await newChat.click();
        await newProject.click();
        await ui(log).toHaveText("cancel-intro,cancel-intro,new-chat,new-project");
        await noSidewaysScroll(page);
        seen.push(await readable(page));
        await shot(page, `${lang}-${width}-section`);

        // Lock now: only "Secure Max is locked" and the one Unlock button; the lists are gone.
        await lockNow.click();
        await ui(log).toHaveText("cancel-intro,cancel-intro,new-chat,new-project,lock");
        await ui(section.getByText(t.maxIsLocked)).toBeVisible();
        const unlock = section.getByRole("button", { name: t.maxUnlock, exact: true });
        await ui(section.getByRole("button")).toHaveCount(1);
        await ui(unlock).toHaveClass(/primary/);
        await ui(section.locator("#max-list")).toHaveCount(0);
        await ui(unlock).toBeFocused();
        if (phone) await tall(page, unlock);
        seen.push(await readable(page));
        await shot(page, `${lang}-${width}-locked`);
        await unlock.click();
        await ui(newChat).toBeFocused();

        // Badges: a lock named for Secure Max, another name when locked, nothing for Secure.
        await ui(section.getByRole("img", { name: t.maxLabel, exact: true })).toBeVisible();
        const badges = page.locator("#badges");
        await ui(badges.getByRole("img")).toHaveCount(1);
        await ui(badges.getByRole("img", { name: t.maxLocked, exact: true })).toBeVisible();

        // The start switch and its one line.
        const settings = page.locator("#settings");
        const start = settings.getByRole("switch", { name: t.maxStartLabel, exact: true });
        await ui(start).not.toBeChecked();
        await ui(start).toHaveAccessibleDescription(t.maxStartLine);
        await start.click();
        await ui(start).toBeChecked();
        await ui(page.locator("#start")).toHaveText("true");
        if (phone) await tall(page, settings.locator(".secure-max-start label"));

        // Reset: the warning on the screen, a typed confirmation, the red button off until it matches.
        await ui(settings.getByText(t.maxResetWarning)).toBeVisible();
        await ui(settings.getByText(t.maxResetSignInFirst)).toHaveCount(0);
        const resetButton = settings.getByRole("button", { name: t.maxResetLabel, exact: true });
        if (phone) await tall(page, resetButton);
        await resetButton.click();
        const resetDialog = page.getByRole("dialog", { name: t.maxResetLabel, exact: true });
        await ui(resetDialog).toBeVisible();
        await ui(resetDialog.getByRole("button", { name: t.cancel })).toBeFocused();
        const resetConfirm = resetDialog.getByRole("button", { name: t.maxResetLabel, exact: true });
        await ui(resetConfirm).toBeDisabled();
        await ui(resetConfirm).toHaveClass(/danger-button/);
        if (phone) await tall(page, resetDialog.getByRole("button"));
        const field = resetDialog.getByLabel(t.maxResetTypeLabel(t.maxResetPhrase));
        await field.fill("wrong");
        await ui(resetConfirm).toBeDisabled();
        await field.fill(t.maxResetPhrase.toLowerCase());
        await ui(resetConfirm).toBeEnabled();
        seen.push(await readable(page));
        await shot(page, `${lang}-${width}-reset`);
        await resetDialog.getByRole("button", { name: t.cancel }).click();
        await ui(resetDialog).toHaveCount(0);
        await ui(log).not.toContainText("reset");
        await resetButton.click();
        await field.fill(t.maxResetPhrase);
        await resetConfirm.click();
        await ui(resetDialog).toHaveCount(0);
        await ui(log).toContainText("reset");

        // Second open: no explanation.
        await page.reload();
        await ui(entry).toBeVisible();
        await entry.click();
        await ui(section).toBeVisible();
        await ui(page.getByRole("dialog")).toHaveCount(0);

        // No always-present notice (end-to-end tests look for THE one role=status), nothing too wide.
        await ui(page.getByRole("status")).toHaveCount(0);
        await noSidewaysScroll(page);
        seen.push(await readable(page));

        // Every text of this language was shown; nothing of the other language was.
        const all = seen.join("\n");
        const other = modesText[lang === "de" ? "en" : "de"];
        for (const key of Object.keys(t) as (keyof typeof t)[]) {
          // Shown elsewhere: "Use Secure Max?" is the title for the other subjects; the stale sign-in and failure lines are checked in the tests below, in both languages.
          if (key === "maxDialogTitle" || key === "maxResetSignInFirst" || key === "maxResetFailed") continue;
          const mine = t[key];
          const theirs = other[key];
          const [a, b] = typeof mine === "function" && typeof theirs === "function" ? [mine(t.maxResetPhrase), theirs(other.maxResetPhrase)] : [mine, theirs];
          expect(all, key).toContain(a);
          if (a !== b) expect(all, `other language: ${key}`).not.toContain(b);
        }
      } finally {
        await page.context().close();
      }
    }, 90_000);

for (const lang of LANGS)
  it(`${lang}: locked from the start, sidebar entry says so; stale sign-in blocks the reset; dark theme`, async () => {
  const t = modesText[lang];
  const page = await open(375, lang, "?locked=1&stale=1&fail=1&theme=dark", 560);
  try {
    const sidebar = page.locator("#side");
    const entry = sidebar.getByRole("button", { name: t.maxLocked, exact: true });
    await ui(entry).toBeVisible();
    await ui(entry.locator("rect")).toHaveAttribute("fill", "currentColor");
    await entry.click();
    const intro = page.getByRole("dialog", { name: t.maxIntroTitle, exact: true });
    const box = (await intro.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(560);
    await shot(page, `${lang}-375-short-dark-intro`);
    await intro.getByRole("checkbox").check();
    await intro.getByRole("button", { name: t.maxConfirm, exact: true }).click();
    const section = sidebar.getByRole("region", { name: t.maxLabel });
    await ui(section.getByText(t.maxIsLocked)).toBeVisible();
    await ui(section.getByRole("button")).toHaveText([t.maxUnlock]);
    // The band in the dark theme: the 4 px edge in a colour other than the background.
    const band = await section.evaluate((element) => [getComputedStyle(element).borderLeftWidth, getComputedStyle(element).borderLeftColor, getComputedStyle(element).backgroundColor]);
    expect(band[0]).toBe("4px");
    expect(band[1]).not.toBe(band[2]);
    expect(await page.locator(".chat-design").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(27, 27, 30)"); // --bg of the dark token block in src/chat-design.css
    await shot(page, `${lang}-375-short-dark-locked`);

    const settings = page.locator("#settings");
    await ui(settings.getByText(t.maxResetSignInFirst)).toBeVisible();
    await ui(settings.getByRole("button", { name: t.maxResetLabel, exact: true })).toBeDisabled();
    await noSidewaysScroll(page);
  } finally {
    await page.context().close();
  }
}, 60_000);

for (const lang of LANGS)
  it(`${lang}: a reset that fails says so and deletes nothing in the interface`, async () => {
  const t = modesText[lang];
  const page = await open(768, lang, "?fail=1");
  try {
    const settings = page.locator("#settings");
    await settings.getByRole("button", { name: t.maxResetLabel, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: t.maxResetLabel, exact: true });
    await dialog.getByLabel(t.maxResetTypeLabel(t.maxResetPhrase)).fill(t.maxResetPhrase);
    await dialog.getByRole("button", { name: t.maxResetLabel, exact: true }).click();
    await ui(settings.getByRole("alert")).toHaveText(t.maxResetFailed);
    await ui(settings.getByRole("button", { name: t.maxResetLabel, exact: true })).toBeEnabled();
  } finally {
    await page.context().close();
  }
}, 60_000);
