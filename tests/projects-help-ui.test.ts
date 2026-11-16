// Sidebar project rows (FE-08), the "Keyboard shortcuts" account menu entry and the Help page (SS-08)
// in a real browser at 375, 768 and 1280 px, in English and German (tests/fixtures/projects-help-entry.tsx).
// Offline: nothing leaves 127.0.0.1. The row to project screen flow in the whole app is in tests/projects-ui.test.ts.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { LEGAL_IDENTITY } from "../shared/legal-identity";
import { appText } from "../src/text/app";
import { projectText } from "../src/text/projects";
import { shortcutsText } from "../src/text/shortcuts";
import { supportText } from "../src/text/support";
import { workspaceText } from "../src/text/workspace";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const outside: string[] = [];
const LONG = "Steuererklärung und Nebenkostenabrechnung 2026 für die Wohnung";

beforeAll(async () => {
  // The project screen's build switch (src/device-features.ts), for this server only.
  process.env.VITE_PROJECTS = "1";
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-projects-help-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/projects-help-entry.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  delete process.env.VITE_PROJECTS;
  await browser?.close();
  await vite?.close();
});

async function open(screen: string, width: number, lang: "en" | "de") {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 800 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/projects-help")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/projects-help",
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/projects-help-entry.tsx"></script></body></html>`,
        ),
      });
    if (url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
  // No native dialog may open: a window.confirm would fail the test.
  page.on("dialog", (dialog) => {
    outside.push(`native ${dialog.type()}`);
    void dialog.dismiss();
  });
  await page.goto(`${origin}/projects-help?screen=${screen}`, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const ran = (page: Page) => page.evaluate(() => (window as unknown as { ran: string[] }).ran.splice(0));
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function target(control: Locator, width: number) {
  const box = (await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}
/** The "…" sits on the row's own line, right of the row button, inside the sidebar. */
async function inline(row: Locator) {
  const button = (await row.locator(":scope > button").boundingBox())!;
  const more = (await row.locator("summary").boundingBox())!;
  const sidebar = (await row.page().locator(".sidebar").boundingBox())!;
  // Same line: the "…" lies within the row button's height.
  expect(more.y).toBeGreaterThanOrEqual(button.y - 1);
  expect(more.y + more.height).toBeLessThanOrEqual(button.y + button.height + 1);
  expect(more.x).toBeGreaterThanOrEqual(button.x + button.width - 1);
  expect(more.x + more.width).toBeLessThanOrEqual(sidebar.x + sidebar.width + 1);
}

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${width} px, ${lang}: project row opens the screen, "…" inline, delete asks keep or delete, shortcuts entry`, async () => {
      const w = workspaceText[lang];
      const p = projectText[lang];
      const page = await open("nav", width, lang);
      try {
        const row = page.locator(".project-row").filter({ hasText: LONG });
        // The name is cut with an ellipsis, the "…" stays beside it, closed and open.
        await inline(row);
        await target(row.locator("summary"), width);
        await row.locator("summary").click();
        await inline(row);
        const menu = row.locator(".project-actions > div");
        for (const name of [p.open, w.renameProject, p.delete]) await target(menu.getByRole("button", { name, exact: true }), width);
        await noSidewaysScroll(page);
        await row.locator("summary").click();

        // The row itself opens the project screen.
        await row.locator(":scope > button").click();
        expect(await ran(page)).toEqual(["open:p1"]);

        // Delete from the sidebar: the project screen's question, focus on Cancel, keeping the chats by default.
        await row.locator("summary").click();
        await menu.getByRole("button", { name: p.delete, exact: true }).click();
        const confirm = page.locator("dialog.confirm-dialog");
        await ui(confirm.getByRole("heading", { name: p.deleteTitle(LONG) })).toBeVisible();
        await ui(confirm.getByRole("button", { name: p.cancel })).toBeFocused();
        await ui(confirm.getByRole("radio", { name: p.keepChats })).toBeChecked();
        await target(confirm.locator(".project-delete-choice label").first(), width);
        await noSidewaysScroll(page);
        // Cancel: nothing happens and focus returns to the "…".
        await page.keyboard.press("Escape");
        await ui(confirm).toHaveCount(0);
        await ui(row.locator("summary")).toBeFocused();
        expect(await ran(page)).toEqual([]);
        await row.locator("summary").click();
        await menu.getByRole("button", { name: p.delete, exact: true }).click();
        await confirm.getByRole("radio", { name: p.deleteChats(2) }).check();
        await confirm.getByRole("button", { name: p.delete, exact: true }).click();
        await ui(confirm).toHaveCount(0);
        expect(await ran(page)).toEqual(["delete:p1:true"]);
        // Without chats there is no choice.
        const short = page.locator(".project-row").filter({ hasText: "Kurz" });
        await inline(short);
        await short.locator("summary").click();
        await short.getByRole("button", { name: p.delete, exact: true }).click();
        await ui(confirm.getByRole("radio")).toHaveCount(0);
        await confirm.getByRole("button", { name: p.delete, exact: true }).click();
        expect(await ran(page)).toEqual(["delete:p2:false"]);

        // Create opens the new project's screen.
        await page.getByRole("button", { name: w.createProject, exact: true }).click();
        await page.getByLabel(w.projectName, { exact: true }).fill("Neu");
        await page.getByRole("button", { name: w.create, exact: true }).click();
        expect(await ran(page)).toEqual(["create", "open:p2"]);

        // One name for incognito.
        await ui(page.getByRole("button", { name: w.newIncognito })).toHaveText(lang === "de" ? "Inkognito-Chat" : "Incognito chat");
        await target(page.getByRole("button", { name: w.newIncognito }), width);

        // The account menu: Keyboard shortcuts right after Help.
        await page.getByLabel(w.accountMenu, { exact: true }).click();
        const popover = page.locator(".account-popover");
        const entry = popover.getByRole("button", { name: shortcutsText[lang].menuEntry, exact: true });
        await target(entry, width);
        expect(await popover.locator("button").allTextContents()).toContain(shortcutsText[lang].menuEntry);
        const labels = await popover.locator("button").allTextContents();
        expect(labels.indexOf(shortcutsText[lang].menuEntry)).toBe(labels.indexOf(w.help) + 1);
        await entry.click();
        expect(await ran(page)).toEqual(["shortcuts"]);
        await noSidewaysScroll(page);
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 60_000);

for (const lang of LANGS)
  for (const width of WIDTHS)
    it(`${width} px, ${lang}: Help links, contact line and no test-phase wording`, async () => {
      const a = appText[lang];
      const t = supportText[lang];
      const page = await open("help", width, lang);
      try {
        await ui(page.getByRole("heading", { name: t.heading })).toBeVisible();
        const links = page.getByRole("group", { name: t.links });
        for (const [name, id] of [
          [a.gettingStarted, "workspace-guide"],
          [a.privacyPolicy, "privacy-policy"],
          [a.imprint, "imprint"],
          [shortcutsText[lang].menuEntry, "shortcuts"],
        ]) {
          const link = links.getByRole("button", { name, exact: true });
          await target(link, width);
          await link.click();
          expect(await ran(page)).toEqual([id]);
        }
        const contact = page.locator(".help-contact");
        await ui(contact).toContainText(t.contact);
        await ui(contact.getByRole("link", { name: LEGAL_IDENTITY.supportContactEmail })).toHaveAttribute(
          "href",
          `mailto:${LEGAL_IDENTITY.supportContactEmail}`,
        );
        // Every area's guidance and the note: none of the evaluation-phase words.
        const area = page.getByLabel(t.area, { exact: true });
        for (const value of await area.locator("option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value))) {
          await area.selectOption(value);
          const text = (await page.locator("section.content-view").innerText()) + (await page.getByLabel(t.review).inputValue());
          expect(text).not.toMatch(/coordinat|synthetic|format 1|evaluation|Koordination|synthetisch|Erprobung|Format 1/i);
        }
        await noSidewaysScroll(page);
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 60_000);

it("Help without links or a named mailbox shows neither", async () => {
  for (const lang of LANGS) {
    const page = await open("help-plain", 375, lang);
    try {
      await ui(page.getByRole("heading", { name: supportText[lang].heading })).toBeVisible();
      await ui(page.getByRole("group", { name: supportText[lang].links })).toHaveCount(0);
      await ui(page.locator(".help-contact")).toHaveCount(0);
      await ui(page.getByRole("link")).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  }
  expect(outside).toEqual([]);
}, 60_000);
