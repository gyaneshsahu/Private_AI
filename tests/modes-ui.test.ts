// Secure and Secure Max screens (docs/product-modes-20261116.md sections 3 and 4) in a real browser
// at phone, tablet and desktop width, in English and German: the lock switch, its dialog, the
// badges and the Settings choice. Offline: a fixture page with the components only.
// MODES_UI_SHOTS=<folder> also writes screenshots there for a look by eye.
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

async function open(width: number, lang: "en" | "de", { height = 900, dark = false } = {}) {
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
  await page.goto(origin + "/modes" + (dark ? "?theme=dark" : ""), { timeout: 30_000 });
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

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${lang} at ${width} px: switch, dialog, badges and the Settings choice`, async () => {
      const t = modesText[lang];
      const page = await open(width, lang);
      const seen: string[] = [];
      try {
        const area = page.locator("#toggle");
        const toggle = area.getByRole("switch", { name: t.maxLabel });
        const dialog = page.getByRole("dialog", { name: t.maxDialogTitle, exact: true });
        const confirm = dialog.getByRole("button", { name: t.maxConfirm, exact: true });

        // Off by default, and off shows nothing more. Not offered: nothing at all.
        await ui(toggle).toHaveAttribute("aria-checked", "false");
        await ui(area.getByText(t.maxLine)).toHaveCount(0);
        expect((await area.innerText()).trim()).toBe(t.maxLabel);
        expect(await page.locator("#unavailable").innerHTML()).toBe("");
        await ui(page.locator("#disabled").getByRole("switch")).toBeDisabled();
        if (width < 760) expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await shot(page, `${lang}-${width}-page`);

        // Turning it on opens the dialog at its top: focus on the heading, confirm off until the box is ticked.
        await toggle.click();
        await ui(dialog).toBeVisible();
        await ui(dialog.getByRole("heading", { name: t.maxDialogTitle, exact: true })).toBeFocused();
        await ui(dialog.getByRole("heading", { name: t.maxDialogTitle, exact: true })).toBeInViewport();
        await ui(confirm).toBeDisabled();
        await ui(dialog.getByText(t.maxDialogParagraph)).toBeVisible();
        const list = dialog.getByRole("list", { name: t.maxDifferentHeading });
        await ui(list.getByRole("listitem")).toHaveText(MAX_DIFFERENCES.map((key) => t[key]));
        const box = (await dialog.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(900);
        if (width < 760)
          for (const button of await dialog.getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await noSidewaysScroll(page);
        seen.push(await readable(page));
        await shot(page, `${lang}-${width}-dialog`);

        // Cancel and Escape leave it off and give the focus back to the switch.
        await dialog.getByRole("button", { name: t.cancel }).click();
        await ui(dialog).toHaveCount(0);
        await ui(toggle).toHaveAttribute("aria-checked", "false");
        await ui(toggle).toBeFocused();
        await toggle.click();
        await ui(dialog).toBeVisible();
        await page.keyboard.press("Escape");
        await ui(dialog).toHaveCount(0);
        await ui(toggle).toHaveAttribute("aria-checked", "false");
        await ui(toggle).toBeFocused();

        // The box is not remembered from the cancelled try. Ticking it allows the confirm.
        await page.keyboard.press("Enter");
        await ui(confirm).toBeDisabled();
        await dialog.getByRole("checkbox", { name: t.maxUnderstand }).check();
        await confirm.click();
        await ui(dialog).toHaveCount(0);
        await ui(toggle).toHaveAttribute("aria-checked", "true");
        await ui(toggle).toBeFocused();
        await ui(area.getByText(t.maxLine)).toBeVisible();
        await ui(toggle).toHaveAccessibleDescription(t.maxLine);

        // The second time there is no dialog.
        await toggle.click();
        await ui(toggle).toHaveAttribute("aria-checked", "false");
        await ui(area.getByText(t.maxLine)).toHaveCount(0);
        await toggle.click();
        await ui(toggle).toHaveAttribute("aria-checked", "true");
        await ui(page.getByRole("dialog")).toHaveCount(0);

        // Badges: a lock with a name for Secure Max, another name when locked, nothing for Secure.
        const badges = page.locator("#badges");
        await ui(badges.getByRole("img")).toHaveCount(2);
        await ui(badges.getByRole("img", { name: t.maxLabel, exact: true })).toBeVisible();
        await ui(badges.getByRole("img", { name: t.maxLocked, exact: true })).toBeVisible();

        // Settings: two options, Secure chosen and recommended; Secure Max always through the dialog.
        const settings = page.locator("#settings").getByRole("group", { name: t.defaultHeading });
        const secure = settings.getByRole("radio", { name: `${t.secureLabel} (${t.recommended})`, exact: true });
        const max = settings.getByRole("radio", { name: t.maxLabel, exact: true });
        await ui(secure).toBeChecked();
        await ui(secure).toHaveAccessibleDescription(t.secureLine);
        await ui(max).toHaveAccessibleDescription(t.maxLine);
        const defaultDialog = page.getByRole("dialog", { name: t.maxDialogTitleDefault, exact: true });
        await max.click();
        await ui(defaultDialog).toBeVisible();
        await ui(defaultDialog.getByText(t.maxDialogParagraph)).toBeVisible();
        seen.push(await readable(page));
        await page.keyboard.press("Escape");
        await ui(defaultDialog).toHaveCount(0);
        await ui(secure).toBeChecked();
        await ui(max).toBeFocused();
        await max.click();
        await defaultDialog.getByRole("checkbox", { name: t.maxUnderstand }).check();
        await defaultDialog.getByRole("button", { name: t.maxConfirm, exact: true }).click();
        await ui(max).toBeChecked();
        await secure.click();
        await ui(secure).toBeChecked();
        await ui(page.getByRole("dialog")).toHaveCount(0);
        if (width < 760)
          for (const label of await settings.locator("label").all()) expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44);

        // Without Secure Max: what Secure means, and no choice.
        const only = page.locator("#settings-secure-only");
        await ui(only.getByText(t.secureLine)).toBeVisible();
        await ui(only.getByRole("radio")).toHaveCount(0);
        await ui(only.getByText(t.maxLabel)).toHaveCount(0);

        // No always-present notice (end-to-end tests look for THE one role=status), nothing too wide.
        await ui(page.getByRole("status")).toHaveCount(0);
        await noSidewaysScroll(page);
        seen.push(await readable(page));
        await shot(page, `${lang}-${width}-after`);

        // Every text of this language was shown; nothing of the other language was.
        const all = seen.join("\n");
        const other = modesText[lang === "de" ? "en" : "de"];
        for (const key of Object.keys(t) as (keyof typeof t)[]) {
          expect(all, key).toContain(t[key]);
          if (other[key] !== t[key]) expect(all, `other language: ${key}`).not.toContain(other[key]);
        }
      } finally {
        await page.context().close();
      }
    }, 60_000);

it("German dialog on a short phone screen stays inside the screen and scrolls to its buttons; dark theme renders", async () => {
  const t = modesText.de;
  const page = await open(375, "de", { height: 560, dark: true });
  try {
    await page.locator("#toggle").getByRole("switch").click();
    const dialog = page.getByRole("dialog", { name: t.maxDialogTitle, exact: true });
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(560);
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    await ui(dialog.getByRole("heading", { name: t.maxDialogTitle, exact: true })).toBeInViewport();
    await shot(page, "de-375-short-dark-dialog");
    // Keyboard only: Tab stays inside the dialog and reaches the box and both buttons.
    await page.keyboard.press("Tab");
    await ui(dialog.getByRole("checkbox")).toBeFocused();
    await page.keyboard.press("Tab");
    await ui(dialog.getByRole("button", { name: t.cancel })).toBeFocused();
    await page.keyboard.press("Tab");
    await ui(dialog.getByRole("checkbox")).toBeFocused();
    await dialog.getByRole("checkbox", { name: t.maxUnderstand }).check();
    await dialog.getByRole("button", { name: t.maxConfirm, exact: true }).click();
    await ui(page.locator("#toggle").getByRole("switch")).toHaveAttribute("aria-checked", "true");
    // Dark theme: the page really is dark, and the text is light on it.
    expect(await page.locator(".chat-design").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(25, 28, 31)");
    await shot(page, "de-375-short-dark-after");
  } finally {
    await page.context().close();
  }
}, 60_000);

it("inside Settings (a modal dialog with a form): opens on top, Escape closes only the explanation, nothing submits the form", async () => {
  const t = modesText.en;
  const page = await open(375, "en");
  try {
    await page.locator("#open-nested").click();
    const outer = page.locator("#nested");
    const inner = page.getByRole("dialog", { name: t.maxDialogTitleDefault, exact: true });
    const max = outer.getByRole("radio", { name: t.maxLabel, exact: true });
    await max.click();
    await ui(inner).toBeVisible();
    await shot(page, "en-375-nested-dialog");
    await page.keyboard.press("Escape");
    await ui(inner).toHaveCount(0);
    await ui(outer).toBeVisible();
    await ui(max).not.toBeChecked();
    await ui(max).toBeFocused();
    // Keyboard only: Space opens it, Enter on the box and on the heading submit nothing.
    await page.keyboard.press("Space");
    await ui(inner).toBeVisible();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await ui(inner.getByRole("checkbox")).toBeChecked();
    await inner.getByRole("button", { name: t.maxConfirm, exact: true }).click();
    await ui(inner).toHaveCount(0);
    await ui(max).toBeChecked();
    await ui(outer).toBeVisible();
    await ui(page.locator("#submits")).toHaveText("0");
    await shot(page, "en-375-nested-after");
  } finally {
    await page.context().close();
  }
}, 60_000);
