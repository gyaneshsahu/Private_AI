// The chat menu and projects in the real app (docs/projects-ux-20261125.md), every feature on,
// answers faked: the "⋯" of a chat in the sidebar (Add to project with "New project…", Remove
// from its project), the same entries in the open chat's own menu (Rename in a dialog, Delete
// after a question), the project name under the title, the project screen with its chats first,
// and "New chat in this project" from the project's menu. Phone and desktop, English and German.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { chatMenuText } from "../src/text/chat-menu";
import { projectText } from "../src/text/projects";
import { savedListText } from "../src/text/saved-list";
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
async function open(width: number, lang: Lang) {
  const phone = width < 700;
  const context = await browser.newContext({
    viewport: { width, height: phone ? 812 : 900 },
    locale: lang === "de" ? "de-DE" : "en-US",
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  context.setDefaultTimeout(10_000);
  await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
  await installFakes(context, { origin, config: "on" });
  const page: Page = await context.newPage();
  page.on("dialog", (d) => void (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}));
  await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
  const a = appText[lang];
  const w = workspaceText[lang];
  const send = async (text: string) => {
    const before = await page.locator("article.assistant").count();
    await page.getByLabel(a.messageInput, { exact: true }).fill(text);
    await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
    await page.waitForFunction((n) => document.querySelectorAll("article.assistant").length > n, before, { timeout: 30_000 });
    await page.getByRole("button", { name: a.stopResponse, exact: true }).waitFor({ state: "hidden", timeout: 30_000 });
  };
  /** Phones: the sidebar is a drawer. */
  const nav = async (show: boolean) => {
    if (!phone) return;
    const shown = await page.locator(".sidebar").isVisible();
    if (show && !shown) await page.getByLabel(a.openNavigation, { exact: true }).click();
    if (!show && shown) await page.getByRole("button", { name: w.closeNavigation }).click();
  };
  const target = async (locator: ReturnType<Page["locator"]>) => {
    if (!phone) return;
    const box = (await locator.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(43.5);
  };
  return { context, page, phone, a, w, cm: chatMenuText[lang], p: projectText[lang], s: savedListText[lang], send, nav, target };
}

describe.each([
  [375, "en"],
  [375, "de"],
  [1280, "en"],
  [1280, "de"],
] as [number, Lang][])("chat menu and projects at %i px, %s", (width, lang) => {
  it("a chat's ⋯ in the sidebar: Add to project with New project…, then Remove from it; every entry is a proper target", async () => {
    const { context, page, w, cm, send, nav, target } = await open(width, lang);
    try {
      await send("Plan a weekend trip audit:plain");
      await nav(true);
      const title = "Plan a weekend trip audit:plain";
      const row = page.locator(".chat-list-row").filter({ hasText: "Plan a weekend trip" });
      const dots = page.getByLabel(w.chatActions(title), { exact: true });
      await row.hover();
      await dots.click();
      const menu = row.locator(".chat-menu-items");
      // No project yet: Rename, Pin, Add to project, Archive, Delete. Nothing about removing.
      await ui(menu.locator(":scope > button")).toHaveText([cm.rename, cm.pin, cm.addToProject, cm.archive, cm.delete]);
      for (const item of await menu.locator(":scope > button").all()) await target(item);
      // The floating list stays inside the screen.
      const box = (await row.locator(".chat-menu-popover").boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      // "Add to project" opens the list in place; the menu stays open. "New project…" asks for a name.
      await menu.getByRole("button", { name: cm.addToProject, exact: true }).click();
      await ui(menu.getByText(cm.noProjects)).toHaveCount(0);
      await menu.getByRole("button", { name: cm.newProject, exact: true }).click();
      const name = menu.getByLabel(cm.projectName, { exact: true });
      await ui(name).toBeFocused();
      await ui(menu.getByRole("button", { name: cm.create, exact: true })).toBeDisabled();
      await name.fill("Hamburg");
      await name.press("Enter");
      // The project exists, holds the chat, and the menu is closed.
      const project = page.locator(".project-list .project-row").filter({ hasText: "Hamburg" });
      await ui(project).toHaveCount(1);
      await ui(project.locator("small")).toHaveText("1");
      await ui(page.locator(".chat-item-menu[open]")).toHaveCount(0);
      // Now in a project: the menu offers to take it out, by the project's name.
      await page.getByRole("button", { name: w.recent, exact: true }).click();
      await row.hover();
      await dots.click();
      await ui(menu.getByRole("button", { name: cm.removeFrom("Hamburg"), exact: true })).toBeVisible();
      await ui(menu.getByRole("button", { name: cm.addToProject, exact: true })).toHaveCount(0);
      // It opened fresh: the project list and the name typed before are gone.
      await ui(menu.locator(".chat-menu-projects")).toHaveCount(0);
      await page.screenshot({ path: `.local/projects-ux/menu-in-project-${lang}-${width}.png` });
      // Escape closes the menu and gives the focus back to the ⋯.
      await page.keyboard.press("Escape");
      await ui(page.locator(".chat-item-menu[open]")).toHaveCount(0);
      await dots.click();
      await menu.getByRole("button", { name: cm.removeFrom("Hamburg"), exact: true }).click();
      await ui(project.locator("small")).toHaveText("0");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });

  it("the open chat's own menu: Rename in a dialog, Add to project, the project name opens the project, Remove inside the project, Delete after a question", async () => {
    const { context, page, a, w, cm, p, s, send, nav } = await open(width, lang);
    try {
      await send("Compare two laptops audit:plain");
      // A project to move into, made from the sidebar.
      await nav(true);
      await page.getByRole("button", { name: w.createProject, exact: true }).click();
      await page.getByLabel(w.projectName).fill("Travel");
      await page.getByRole("button", { name: w.create, exact: true }).click();
      const panel = page.locator("dialog.project-dialog");
      await ui(panel).toBeVisible();
      await ui(panel.getByText(p.noChats)).toBeVisible();
      await panel.getByRole("button", { name: p.close }).click();
      await nav(true);
      await page.getByRole("button", { name: w.recent, exact: true }).click();
      await page.locator(".chat-list-row > button").filter({ hasText: "Compare two laptops" }).click();
      await nav(false);
      const header = page.locator(".conversation-menu");
      const items = header.locator(".chat-menu-items");
      // Rename: a small dialog with the name selected; Enter saves; the title and the sidebar follow.
      await page.getByLabel(a.conversationActions, { exact: true }).click();
      await ui(items.locator(":scope > button")).toHaveText([cm.rename, cm.pin, cm.addToProject, cm.archive, cm.delete]);
      await items.getByRole("button", { name: cm.rename, exact: true }).click();
      const rename = page.getByRole("dialog").getByLabel(cm.renameLabel, { exact: true });
      await ui(rename).toBeFocused();
      await ui(rename).toHaveValue("Compare two laptops audit:plain");
      await rename.fill("Laptops for travel");
      await rename.press("Enter");
      await ui(page.locator("h1")).toContainText("Laptops for travel");
      await ui(page.locator(".conversation-menu[open]")).toHaveCount(0);
      // Add to project from the same menu: the project's name appears under the title.
      await page.getByLabel(a.conversationActions, { exact: true }).click();
      await items.getByRole("button", { name: cm.addToProject, exact: true }).click();
      await items.locator(".chat-menu-projects").getByRole("button", { name: "Travel", exact: true }).click();
      const crumb = page.locator(".project-breadcrumb");
      await ui(crumb).toContainText("Travel");
      // The name leads to the project, whose chats come first.
      await crumb.getByRole("button", { name: cm.openProject("Travel"), exact: true }).click();
      await ui(panel).toBeVisible();
      await ui(panel.locator(".project-body > section").first()).toHaveClass(/project-chats-section/);
      const chat = panel.locator(".project-chats li").filter({ hasText: "Laptops for travel" });
      await ui(chat).toHaveCount(1);
      await page.screenshot({ path: `.local/projects-ux/project-${lang}-${width}.png` });
      // Inside the project the chat's ⋯ takes it out again.
      await chat.hover();
      await chat.locator("summary").click();
      await chat.getByRole("button", { name: cm.removeFrom("Travel"), exact: true }).click();
      await ui(panel.getByText(p.noChats)).toBeVisible();
      await panel.getByRole("button", { name: p.close }).click();
      await ui(crumb).toHaveCount(0);
      // Delete from the chat's own menu: asked first, focus on Cancel; then the chat is gone.
      await page.getByLabel(a.conversationActions, { exact: true }).click();
      await items.getByRole("button", { name: cm.delete, exact: true }).click();
      const question = page.locator("dialog.confirm-dialog");
      await ui(question.getByRole("heading", { name: s.deleteTitle })).toBeVisible();
      await ui(question.getByRole("button", { name: cm.cancel, exact: true })).toBeFocused();
      await question.getByRole("button", { name: s.deleteConfirm, exact: true }).click();
      await ui(question).toHaveCount(0);
      await nav(true);
      await ui(page.locator(".chat-list-row").filter({ hasText: "Laptops for travel" })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  it("a project's own ⋯: New chat in this project starts an empty chat that belongs to it", async () => {
    const { context, page, w, p, send, nav } = await open(width, lang);
    try {
      await nav(true);
      await page.getByRole("button", { name: w.createProject, exact: true }).click();
      await page.getByLabel(w.projectName).fill("Recipes");
      await page.getByRole("button", { name: w.create, exact: true }).click();
      await page.locator("dialog.project-dialog").getByRole("button", { name: p.close }).click();
      await nav(true);
      await page.locator(".project-list .project-row").filter({ hasText: "Recipes" }).hover();
      await page.getByLabel(w.projectActions("Recipes"), { exact: true }).click();
      const menu = page.locator(".project-actions[open] > div");
      await ui(menu.getByRole("button")).toHaveText([p.newChat, p.open, w.renameProject, p.delete]);
      await menu.getByRole("button", { name: p.newChat, exact: true }).click();
      await ui(page.locator(".project-breadcrumb")).toContainText("Recipes");
      await ui(page.locator("article")).toHaveCount(0);
      await send("A soup for four audit:plain");
      await nav(true);
      await ui(page.locator(".project-list .project-row").filter({ hasText: "Recipes" }).locator("small")).toHaveText("1");
    } finally {
      await context.close();
    }
  });
});
