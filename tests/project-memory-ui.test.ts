// Memory per project in the real app (docs/project-memory-20261126.md), every feature on: a
// memory added on the project's page is used in that project's chat and is listed under the
// answer; the same question in a chat outside the project does not get it; Settings does not list
// it and says where it is; deleting it on the project page works. Phone and desktop, English and
// German, light and dark.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { chatMenuText } from "../src/text/chat-menu";
import { projectMemoryText } from "../src/text/project-memory";
import { workspaceText } from "../src/text/workspace";

vi.setConfig({ testTimeout: 150_000 });

let origin = "";
let server: Server;
let browser: Browser;
beforeAll(async () => {
  mkdirSync(".local/project-memory", { recursive: true });
  const client = await buildClient("on");
  ({ origin, server } = await startServer("on", client));
  browser = await chromium.launch({ ...browserLaunchOptions(), proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1" } });
}, 300_000);
afterAll(async () => {
  await browser?.close();
  server?.close();
});

describe.each([
  [375, "en", "light"],
  [375, "de", "dark"],
  [1280, "en", "dark"],
  [1280, "de", "light"],
] as [number, "en" | "de", "light" | "dark"][])("project memory at %i px, %s, %s", (width, lang, scheme) => {
  it("a project's memory is used in its chat and nowhere else", async () => {
    const phone = width < 700;
    const context = await browser.newContext({
      viewport: { width, height: phone ? 812 : 900 },
      locale: lang === "de" ? "de-DE" : "en-US",
      colorScheme: scheme,
      ...(phone ? { hasTouch: true, isMobile: true } : {}),
    });
    context.setDefaultTimeout(15_000);
    try {
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      await installFakes(context, { origin, config: "on" });
      const page = await context.newPage();
      page.on("dialog", (d) => void (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}));
      const a = appText[lang];
      const w = workspaceText[lang];
      const cm = chatMenuText[lang];
      const t = projectMemoryText[lang];
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      const send = async (text: string) => {
        const before = await page.locator("article.assistant").count();
        await page.getByLabel(a.messageInput, { exact: true }).fill(text);
        await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
        await page.waitForFunction((n) => document.querySelectorAll("article.assistant").length > n, before, { timeout: 30_000 });
        await page.getByRole("button", { name: a.stopResponse, exact: true }).waitFor({ state: "hidden", timeout: 30_000 });
      };
      const nav = async (show: boolean) => {
        if (!phone) return;
        const shown = await page.locator(".sidebar").isVisible();
        if (show && !shown) await page.getByLabel(a.openNavigation, { exact: true }).click();
        if (!show && shown) await page.getByRole("button", { name: w.closeNavigation }).click();
      };
      const MEMORY = "The Hamburg trip is in June, by train.";

      // A chat, put into a new project from its menu.
      await send("Plan the Hamburg trip audit:plain");
      await nav(true);
      const row = page.locator(".chat-list-row").filter({ hasText: "Plan the Hamburg trip" });
      await row.hover();
      await page.getByLabel(w.chatActions("Plan the Hamburg trip audit:plain"), { exact: true }).click();
      const menu = row.locator(".chat-menu-items");
      await menu.getByRole("button", { name: cm.addToProject, exact: true }).click();
      await menu.getByRole("button", { name: cm.newProject, exact: true }).click();
      await menu.getByLabel(cm.projectName, { exact: true }).fill("Hamburg");
      await menu.getByLabel(cm.projectName, { exact: true }).press("Enter");

      // The project's page has its own memory.
      await page.locator(".project-list .project-row").filter({ hasText: "Hamburg" }).getByRole("button", { name: "Hamburg" }).first().click();
      const section = page.locator("section.project-memory");
      await ui(section.getByRole("heading", { name: t.title })).toBeVisible();
      await ui(section.getByText(t.none)).toBeVisible();
      await section.getByLabel(t.addLabel).fill(MEMORY);
      const add = section.getByRole("button", { name: t.add, exact: true });
      if (phone) expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
      await add.click();
      await ui(section.getByRole("status")).toHaveText(t.added);
      await ui(section.getByRole("list", { name: t.listLabel }).getByRole("listitem")).toHaveText([new RegExp(MEMORY.replace(/[.]/g, "\\."))]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await section.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `.local/project-memory/page-${width}-${lang}-${scheme}.png` });

      // In the project's chat the memory goes with the question, and the answer says so.
      await page.locator("dialog[open] .project-chats-section").getByText("Plan the Hamburg trip", { exact: false }).first().click();
      await send("When is the Hamburg trip, in June or July, and do we go by train? audit:plain");
      const used = page.locator("article.assistant").last().locator(".memory-used");
      await ui(used).toHaveCount(1);
      await used.locator("summary").click();
      await ui(used.getByRole("listitem")).toHaveText([MEMORY]);

      // The same question in a chat outside the project: the memory stays inside.
      await nav(true);
      // Leave the project first: with a project selected in the sidebar, New chat starts a chat in it.
      await page.getByRole("button", { name: w.recent, exact: true }).click();
      await page.locator(".new-chat").first().click();
      await ui(page.locator(".conversation-header")).not.toContainText("Hamburg");
      await nav(false);
      await send("When is the Hamburg trip, in June or July, and do we go by train? audit:plain");
      await ui(page.locator("article.assistant").last().locator(".memory-used")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
