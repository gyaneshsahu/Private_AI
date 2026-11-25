// Feedback from testers in the real app (docs/feedback-20261125.md), every feature on: the form
// from the account menu (category, text, rating, a screenshot only when attached), what the
// request holds, the thank-you, and the entry in the owner's dashboard with its screenshot link
// and Delete. Phone and desktop, English and German.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { crc32, deflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { installFakes } from "../evaluation/audit-fakes";
import { buildClient, startServer } from "../evaluation/audit-harness";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import type { FeedbackRequest } from "../shared/feedback";
import { appText } from "../src/text/app";
import { feedbackText } from "../src/text/feedback";
import { ownerText } from "../src/text/owner";
import { workspaceText } from "../src/text/workspace";

vi.setConfig({ testTimeout: 120_000 });

/** A solid-colour PNG, written by hand so the test needs no image library. */
function png(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, Buffer.from([40, 90, 200]))]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk("IEND", Buffer.alloc(0))]);
}

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
] as [number, "en" | "de"][])("feedback at %i px, %s", (width, lang) => {
  it("a tester sends feedback with a rating and an attached screenshot; the owner reads it, opens the screenshot and deletes it", async () => {
    const phone = width < 700;
    const context = await browser.newContext({ viewport: { width, height: phone ? 812 : 900 }, locale: lang === "de" ? "de-DE" : "en-US", ...(phone ? { hasTouch: true, isMobile: true } : {}) });
    context.setDefaultTimeout(10_000);
    try {
      await context.addCookies([{ name: "audit-account", value: randomUUID(), url: origin }]);
      await installFakes(context, { origin, config: "on" });
      const sent: FeedbackRequest[] = [];
      context.on("request", (request) => {
        if (request.method() === "POST" && request.url().endsWith("/api/feedback")) sent.push(request.postDataJSON() as FeedbackRequest);
      });
      const page = await context.newPage();
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
      const a = appText[lang];
      const w = workspaceText[lang];
      const t = feedbackText[lang];
      const o = ownerText[lang];
      const accountMenu = async (item: string) => {
        if (phone && !(await page.getByRole("button", { name: w.closeNavigation }).isVisible())) await page.getByLabel(a.openNavigation, { exact: true }).click();
        await page.locator(".account-menu summary").click();
        await page.locator(".account-menu").getByRole("button", { name: item, exact: true }).click();
      };
      await accountMenu(t.menu);
      const form = page.getByRole("dialog", { name: t.title });
      await ui(form.getByText(t.sentAlong)).toBeVisible();
      // Send is off until something is written.
      const send = form.getByRole("button", { name: t.send, exact: true });
      await ui(send).toBeDisabled();
      const mark = `Feedback ${randomUUID().slice(0, 8)}`;
      await form.getByRole("radio", { name: t.wording, exact: true }).check();
      await form.getByLabel(t.text, { exact: true }).fill(`${mark}: the word is unclear.`);
      await form.getByRole("radio", { name: t.ratingValue(4), exact: true }).check();
      // A screenshot only because one is attached here.
      const chooser = page.waitForEvent("filechooser");
      await form.getByRole("button", { name: t.screenshot, exact: true }).click();
      await (await chooser).setFiles({ name: "screen.png", mimeType: "image/png", buffer: png(1600, 900) });
      await ui(form.getByText(t.screenshotChosen("screen.png"))).toBeVisible();
      if (phone)
        for (const control of await form.locator("button:visible, label:has(input[type=radio]):visible").all()) {
          const box = (await control.boundingBox())!;
          expect(Math.min(box.width, box.height), await control.innerText()).toBeGreaterThanOrEqual(43.5);
        }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `.local/feedback/form-${lang}-${width}.png` });
      await send.click();
      await ui(form.getByRole("status")).toHaveText(t.sent);
      // What went out: exactly what the form said, the picture scaled down to 1,280 pixels.
      expect(sent).toHaveLength(1);
      expect(Object.keys(sent[0]).sort()).toEqual(["category", "context", "rating", "screenshot", "text"]);
      expect(sent[0]).toMatchObject({ category: "wording", rating: 4, text: `${mark}: the word is unclear.`, context: { lang, width } });
      expect(Object.keys(sent[0].context).sort()).toEqual(["height", "lang", "width"]);
      expect(sent[0].screenshot?.type).toBe("image/jpeg");
      expect(sent[0].screenshot!.data.length).toBeLessThan(700_000);
      await form.getByRole("button", { name: t.close, exact: true }).last().click();
      await ui(form).toHaveCount(0);

      // The owner's dashboard lists it.
      await accountMenu(o.menu);
      const dashboard = page.getByRole("dialog", { name: o.title });
      const entry = dashboard.locator(".feedback-list li").filter({ hasText: mark });
      await ui(entry).toHaveCount(1);
      await ui(entry.locator(".feedback-meta strong")).toHaveText(t.wording);
      await ui(entry.getByText(t.rated(4))).toBeVisible();
      await ui(entry.getByText(t.window(lang, sent[0].context.width, sent[0].context.height))).toBeVisible();
      await ui(entry.getByText("audit@example.test")).toBeVisible();
      // The screenshot opens as a picture of at most 1,280 pixels.
      const link = entry.getByRole("link", { name: t.openScreenshot });
      const picture = await context.request.get(origin + (await link.getAttribute("href"))!);
      expect(picture.status()).toBe(200);
      expect(picture.headers()["content-type"]).toBe("image/jpeg");
      await entry.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `.local/feedback/list-${lang}-${width}.png` });
      // Delete asks first; Cancel keeps it, Delete removes it.
      await entry.getByRole("button", { name: new RegExp(`^${t.delete}`) }).click();
      const question = page.locator("dialog.confirm-dialog");
      await ui(question.getByRole("heading", { name: t.deleteTitle })).toBeVisible();
      await question.getByRole("button", { name: t.cancel, exact: true }).click();
      await ui(entry).toHaveCount(1);
      await entry.getByRole("button", { name: new RegExp(`^${t.delete}`) }).click();
      await question.getByRole("button", { name: t.delete, exact: true }).click();
      await ui(entry).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
