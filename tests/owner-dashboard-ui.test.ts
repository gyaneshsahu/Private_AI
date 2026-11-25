// The owner's dashboard in the real app (docs/analytics-20261125.md), every feature on, answers
// faked: after a created image and a new project the account menu's "Owner dashboard" shows
// today's counts; the use of a feature went out as a name and nothing else; and without the
// switch the app makes no counting request at all. Phone and desktop, English and German.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { setTracking, track } from "../src/owner/track";
import { appText } from "../src/text/app";
import { imageCreationText } from "../src/text/image-creation";
import { ownerFeatureText, ownerText } from "../src/text/owner";
import { projectText } from "../src/text/projects";
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

describe.each([
  [375, "en"],
  [375, "de"],
  [1280, "en"],
  [1280, "de"],
] as [number, "en" | "de"][])("owner dashboard at %i px, %s", (width, lang) => {
  it("shows counts for today after a created image and a feature use, and what was sent for the count was a name alone", async () => {
    const phone = width < 700;
    const context = await browser.newContext({ viewport: { width, height: phone ? 812 : 900 }, locale: lang === "de" ? "de-DE" : "en-US", ...(phone ? { hasTouch: true, isMobile: true } : {}) });
    context.setDefaultTimeout(10_000);
    try {
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      await installFakes(context, { origin, config: "on" });
      const events: string[] = [];
      context.on("request", (request) => {
        if (request.url().endsWith("/api/analytics/event")) events.push(request.postData() ?? "");
      });
      const page = await context.newPage();
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      const a = appText[lang];
      const w = workspaceText[lang];
      const t = ownerText[lang];
      const c = imageCreationText[lang];
      // A created image goes through the real route and leaves a usage record (the faked chat answers do not).
      await page.getByLabel(a.tools, { exact: true }).click();
      await page.locator(".tools-menu .menu-surface").getByRole("button", { name: c.menu, exact: true }).click();
      const create = page.getByRole("dialog", { name: c.title });
      await create.getByLabel(c.describe).fill("A lake for zebracanary4817");
      await create.getByRole("button", { name: c.create, exact: true }).click();
      await ui(page.locator("figure.created-image")).toBeVisible();
      // Use a feature: make a project. One counting request goes out, holding the name alone.
      if (phone) await page.getByLabel(a.openNavigation, { exact: true }).click();
      await page.getByRole("button", { name: w.createProject, exact: true }).click();
      await page.getByLabel(w.projectName).fill("zebracanary4817 plans");
      await page.getByRole("button", { name: w.create, exact: true }).click();
      await expect.poll(() => events).toEqual([JSON.stringify({ name: "project.created" })]);
      const project = page.locator("dialog.project-dialog");
      // A new project opens its screen; close it.
      await ui(project).toBeVisible();
      await project.getByRole("button", { name: projectText[lang].close }).click();
      // The account menu has the dashboard for this account, which is on the owner list.
      await ui(project).toHaveCount(0);
      if (phone) {
        // The drawer may be open or closed after the project screen: open it only when its own close button is not there.
        await page.waitForTimeout(400);
        if (!(await page.getByRole("button", { name: w.closeNavigation }).isVisible())) await page.getByLabel(a.openNavigation, { exact: true }).click();
      }
      await page.locator(".account-menu summary").click();
      await page.locator(".account-menu").getByRole("button", { name: t.menu, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: t.title });
      await ui(dialog.getByText(t.intro(90))).toBeVisible();
      // Tiles: one account this week, one today.
      const tile = (label: string) => dialog.locator(".owner-tiles > div").filter({ hasText: label }).locator("dd").first();
      // At least this account (the server is shared by this file's cases, so others may be counted too).
      await ui(tile(t.weeklyActive)).toHaveText(/^[1-9]\d*$/);
      await ui(tile(t.activeToday)).toHaveText(/^[1-9]\d*$/);
      await ui(tile(t.weeklyReturning)).toHaveText("0");
      // By day: 30 rows, today first, with one active account.
      const rows = dialog.locator(".owner-scroll tbody tr");
      await ui(rows).toHaveCount(30);
      await ui(rows.first().locator("td").first()).toHaveText(/^[1-9]\d*$/);
      // Feature use names the canvas, in this language.
      await ui(dialog.getByRole("rowheader", { name: ownerFeatureText[lang]["image-create"], exact: true })).toBeVisible();
      await ui(dialog.getByRole("rowheader", { name: ownerFeatureText[lang]["use.project.created"], exact: true })).toBeVisible();
      // Another range reloads.
      await dialog.getByLabel(t.range).selectOption("7");
      await ui(rows).toHaveCount(7);
      // Nothing of the message is anywhere on the dashboard.
      expect(await dialog.innerText()).not.toContain("zebracanary4817");
      // The table scrolls inside its frame on a phone; the page itself does not scroll sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `.local/owner/dashboard-${lang}-${width}.png` });
      await dialog.getByRole("button", { name: t.close }).click();
      await ui(dialog).toHaveCount(0);
      void w;
    } finally {
      await context.close();
    }
  });
});

it("with analytics off the app never makes a counting request", () => {
  const calls: unknown[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (...args: unknown[]) => (calls.push(args), new Response(null, { status: 204 }))) as typeof fetch;
  try {
    setTracking(undefined);
    track("canvas.opened");
    expect(calls).toEqual([]);
    setTracking("SYNTHETIC");
    track("project.created");
    expect(calls).toHaveLength(1);
    const [path, init] = calls[0] as [string, RequestInit];
    expect(path).toBe("/api/analytics/event");
    expect(init.body).toBe(JSON.stringify({ name: "project.created" }));
    setTracking(undefined);
    track("canvas.opened");
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = real;
  }
});
