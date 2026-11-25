// Sharing in the real app (docs/sharing-20261125.md), every feature on, answers and the image
// provider faked: Share on an answer, the chat and an image (the device's share menu, Copy,
// Download); an encrypted link that opens in another browser with no sign-in, ends when deleted,
// and whose key never reaches the server; no link from an incognito chat; the list in Settings;
// an image in the side panel, switched through "In this chat". Phone and desktop, English and German.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { imageCreationText } from "../src/text/image-creation";
import { shareText } from "../src/text/share";
import { sidePanelsText } from "../src/text/side-panels";
import { outputsText } from "../src/text/outputs";
import { workspaceText } from "../src/text/workspace";

vi.setConfig({ testTimeout: 120_000 });

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({ ...browserLaunchOptions(), proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" } });
}, 300_000);
afterAll(async () => {
  await browser?.close();
  server?.close();
});

type Lang = "en" | "de";
type Shared = { title?: string; text?: string; files?: number };
async function open(width: number, lang: Lang) {
  const phone = width < 700;
  const context = await browser.newContext({
    viewport: { width, height: phone ? 812 : 900 },
    locale: lang === "de" ? "de-DE" : "en-US",
    permissions: ["clipboard-read", "clipboard-write"],
    acceptDownloads: true,
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  context.setDefaultTimeout(10_000);
  await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
  await installFakes(context, { origin, config: "on" });
  // The device's share menu, recorded instead of shown.
  await context.addInitScript(() => {
    const seen: unknown[] = [];
    Object.assign(window, { __shared: seen });
    Object.assign(navigator, {
      canShare: (data: { files?: unknown[] }) => !!data.files?.length,
      share: async (data: { title?: string; text?: string; files?: unknown[] }) => void seen.push({ title: data.title, text: data.text, files: data.files?.length }),
    });
  });
  // Every request body and address the page sends: the link's key must be in none of them.
  const sent: string[] = [];
  context.on("request", (request) => sent.push(request.url() + "\n" + (request.postData() ?? "")));
  const page: Page = await context.newPage();
  page.on("dialog", (d) => void (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}));
  await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
  const a = appText[lang];
  const send = async (text: string) => {
    const before = await page.locator("article.assistant").count();
    await page.getByLabel(a.messageInput, { exact: true }).fill(text);
    await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
    await page.waitForFunction((n) => document.querySelectorAll("article.assistant").length > n, before, { timeout: 30_000 });
    await page.getByRole("button", { name: a.stopResponse, exact: true }).waitFor({ state: "hidden", timeout: 30_000 });
  };
  const shared = () => page.evaluate(() => (window as unknown as { __shared: Shared[] }).__shared);
  return { context, page, phone, a, t: shareText[lang], c: imageCreationText[lang], w: workspaceText[lang], send, shared, sent };
}

describe.each([
  [375, "en"],
  [375, "de"],
  [1280, "en"],
  [1280, "de"],
] as [number, Lang][])("sharing at %i px, %s", (width, lang) => {
  it("an answer: the device's share menu, Copy and Download stay on the device; a link opens elsewhere without sign-in and ends when deleted", async () => {
    const { context, page, a, t, send, shared, sent } = await open(width, lang);
    try {
      await send("What should I pack for Hamburg? audit:plain");
      const answer = page.locator("article.assistant").last();
      await answer.getByRole("button", { name: t.share, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: t.title });
      await ui(dialog).toBeVisible();
      await ui(dialog.locator(".share-subject")).toContainText(t.answer);
      await ui(dialog.getByText(t.localNote)).toBeVisible();
      const before = sent.length;
      // The device's own share menu gets the answer's text.
      await dialog.getByRole("button", { name: t.device, exact: true }).click();
      await expect.poll(shared).toEqual([{ title: "What should I pack for Hamburg? audit:plain", text: "Synthetic answer." }]);
      // Copy.
      await dialog.getByRole("button", { name: t.copy, exact: true }).click();
      await ui(dialog.getByRole("status")).toHaveText(t.copied);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Synthetic answer.");
      // Download: a text file made on the device.
      const download = page.waitForEvent("download");
      await dialog.getByRole("button", { name: t.downloadText, exact: true }).click();
      expect((await download).suggestedFilename()).toMatch(/\.txt$/);
      // None of the three sent anything anywhere.
      expect(sent.slice(before).filter((s) => !s.startsWith("blob:"))).toEqual([]);

      // A link: the warning first, an end date to choose, then the link with its key after "#".
      await ui(dialog.getByText(t.linkIntro)).toBeVisible();
      await dialog.getByLabel(t.expires).selectOption("day");
      await dialog.getByRole("button", { name: t.create, exact: true }).click();
      const field = dialog.getByLabel(t.linkLabel);
      await ui(field).toHaveValue(/\/s\/[A-Za-z0-9_-]{22}#[A-Za-z0-9_-]{43}$/);
      const link = await field.inputValue();
      const key = link.split("#")[1];
      await ui(dialog.locator(".share-warning")).toContainText(t.endsOn("").split("  ")[0].slice(0, 12));
      // The key is in no request, address or body, that this page sent.
      expect(sent.some((s) => s.includes(key))).toBe(false);
      expect(sent.some((s) => s.includes("/api/share") && s.includes("Synthetic answer"))).toBe(false);
      await dialog.getByRole("button", { name: t.copyLink, exact: true }).click();
      await ui(dialog.getByRole("status")).toHaveText(t.linkCopied);
      if (width < 700)
        for (const button of await dialog.locator("button:visible, select:visible, input:visible").all())
          expect(Math.min(...Object.values((await button.boundingBox())!).slice(2)), await button.innerText().catch(() => "")).toBeGreaterThanOrEqual(39.5);
      await page.screenshot({ path: `.local/share/dialog-${lang}-${width}.png` });

      // Someone else, signed out, another browser: the link opens and shows the question and the answer.
      const other = await browser.newContext({ viewport: { width, height: 800 }, locale: lang === "de" ? "de-DE" : "en-US" });
      const theirs: string[] = [];
      other.on("request", (request) => theirs.push(request.url()));
      const reader = await other.newPage();
      await reader.goto(link, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const viewer = reader.locator("main.share-viewer");
      await ui(viewer.getByRole("heading", { level: 1 })).toHaveText("What should I pack for Hamburg? audit:plain");
      await ui(viewer.locator("article")).toHaveCount(2);
      await ui(viewer.locator("article.assistant p")).toHaveText("Synthetic answer.");
      await ui(viewer.getByText(t.viewerNote)).toBeVisible();
      await ui(reader.locator(".app-shell")).toHaveCount(0);
      expect(theirs.some((url) => url.includes(key))).toBe(false);
      expect(theirs.some((url) => url.includes("/api/status"))).toBe(false);
      await reader.screenshot({ path: `.local/share/viewer-${lang}-${width}.png` });
      // The same link without its key cannot be opened.
      await reader.goto(link.split("#")[0], { waitUntil: "domcontentloaded" });
      await ui(reader.getByText(t.viewerBroken)).toBeVisible();

      // Deleted by its owner: gone for everyone, at once.
      await dialog.getByRole("button", { name: t.deleteLink, exact: true }).click();
      await ui(dialog.getByRole("status")).toHaveText(t.deleted);
      await reader.goto(link, { waitUntil: "domcontentloaded" });
      await reader.reload({ waitUntil: "domcontentloaded" });
      await ui(reader.getByText(t.viewerGone)).toBeVisible();
      await other.close();
      await page.keyboard.press("Escape");
      await ui(dialog).toHaveCount(0);
      void a;
    } finally {
      await context.close();
    }
  });

  it("the chat from its own menu; the list of links in Settings; no link from an incognito chat", async () => {
    const { context, page, phone, a, t, w, send, shared } = await open(width, lang);
    try {
      await send("Plan a weekend audit:plain");
      await page.getByLabel(a.conversationActions, { exact: true }).click();
      await page.locator(".conversation-menu").getByRole("button", { name: t.share, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: t.title });
      await ui(dialog.locator(".share-subject")).toContainText(t.chat);
      await dialog.getByRole("button", { name: t.device, exact: true }).click();
      expect((await shared())[0].text).toContain("Synthetic answer.");
      expect((await shared())[0].text).toContain("Plan a weekend");
      await dialog.getByRole("button", { name: t.create, exact: true }).click();
      await ui(dialog.getByLabel(t.linkLabel)).toHaveValue(/#/);
      await dialog.getByRole("button", { name: t.close }).click();
      // Settings > Data controls lists the link by its dates and deletes it.
      if (phone) await page.getByLabel(a.openNavigation, { exact: true }).click();
      await page.locator(".account-menu summary").click();
      await page.locator(".account-menu").getByRole("button", { name: w.settings, exact: true }).click();
      const settings = page.locator("dialog.settings-dialog");
      await settings.locator("nav button").nth(2).click();
      const list = settings.locator(".share-list");
      await ui(list.getByRole("heading", { name: t.listHeading })).toBeVisible();
      await ui(list.locator("li")).toHaveCount(1);
      await list.locator("li button").click();
      await ui(list.getByText(t.listEmpty)).toBeVisible();
      await page.keyboard.press("Escape");
      // Incognito: the device's menu, Copy and Download work; a link cannot be made, and it says why.
      if (phone && !(await page.locator(".sidebar").isVisible())) await page.getByLabel(a.openNavigation, { exact: true }).click();
      await page.getByRole("button", { name: w.newIncognito }).click();
      await send("A private question audit:plain");
      await page.locator("article.assistant").last().getByRole("button", { name: t.share, exact: true }).click();
      await ui(dialog.getByRole("button", { name: t.copy, exact: true })).toBeVisible();
      await ui(dialog.getByText(t.notHere)).toBeVisible();
      await ui(dialog.getByRole("button", { name: t.create, exact: true })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  it("an image: Share hands the picture to the device; on a computer it opens in the side panel and switches through In this chat", async () => {
    const { context, page, phone, a, t, c, shared } = await open(width, lang);
    try {
      await page.getByLabel(a.tools, { exact: true }).click();
      await page.locator(".tools-menu .menu-surface").getByRole("button", { name: c.menu, exact: true }).click();
      const create = page.getByRole("dialog", { name: c.title });
      await create.getByLabel(c.describe).fill("A calm lake at sunrise");
      await create.getByRole("button", { name: c.create, exact: true }).click();
      const card = page.locator("figure.created-image");
      // Inline, with Edit, Download and Share.
      await ui(card.getByRole("button", { name: t.edit, exact: true })).toBeVisible();
      await ui(card.getByRole("link", { name: c.download })).toBeVisible();
      await card.getByRole("button", { name: t.share, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: t.title });
      await ui(dialog.locator(".share-subject")).toContainText(t.image);
      await ui(dialog.getByRole("button", { name: t.copy, exact: true })).toHaveCount(0);
      await dialog.getByRole("button", { name: t.device, exact: true }).click();
      await expect.poll(shared).toEqual([{ title: "A calm lake at sunrise", files: 1 }]);
      const download = page.waitForEvent("download");
      await dialog.getByRole("button", { name: t.download, exact: true }).click();
      expect((await download).suggestedFilename()).toBe("cometrow-image.png");
      await dialog.getByRole("button", { name: t.close }).click();
      const openPanel = card.getByRole("button", { name: t.openInPanel, exact: true });
      if (phone) {
        // No side panel on a phone: the picture opens full screen instead.
        await ui(openPanel).toBeHidden();
        return;
      }
      await openPanel.click();
      const panel = page.locator("aside.image-side-panel");
      await ui(panel).toBeVisible();
      await ui(panel.locator("img")).toHaveAttribute("alt", "A calm lake at sunrise");
      for (const name of [t.edit, t.share]) await ui(panel.getByRole("button", { name, exact: true }).last()).toBeVisible();
      await ui(panel.getByRole("link", { name: t.download })).toHaveAttribute("download", "cometrow-image.png");
      // One thing at a time: "In this chat" replaces the image with the list, and the list opens it again.
      await panel.getByRole("button", { name: t.inThisChat }).click();
      const list = page.locator("aside.outputs-panel");
      await ui(list).toBeVisible();
      await ui(panel).toHaveCount(0);
      await list.getByRole("button", { name: outputsText[lang].open, exact: true }).click();
      await ui(panel).toBeVisible();
      await ui(list).toHaveCount(0);
      await page.screenshot({ path: `.local/share/panel-${lang}-${width}.png` });
      // Edit from the panel opens the full-screen editor.
      await panel.getByRole("button", { name: t.edit, exact: true }).last().click();
      await ui(page.locator("dialog.image-editor")).toBeVisible();
      void sidePanelsText;
    } finally {
      await context.close();
    }
  });
});
