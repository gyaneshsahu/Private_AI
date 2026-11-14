// Canvas (docs/canvas-20261114.md) in a real browser at phone, tablet and desktop width, in English
// and German: open from an answer, edit, preview, the table grid with paste and CSV, ask for changes
// with apply and undo, the exports, the layouts, keyboard and focus. The real src/verified-chat.ts
// runs with its masking; only attestation and the encrypted transport are stand-ins that record
// the request body and answer from a script. Nothing leaves the machine.
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { appText } from "../src/text/app";
import { canvasText } from "../src/text/canvas";
import { messageText } from "../src/text/message";

const EMAIL = "bert.synthetic@example.org";
let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  process.env.VITE_CANVAS = "1";
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: ".local/vite-tests/canvas-ui",
    optimizeDeps: { exclude: ["tinfoil", "ehbp"] },
    plugins: [
      {
        name: "offline-recorded-transport",
        enforce: "pre",
        resolveId(id) {
          if (id === "tinfoil" || id === "ehbp") return "\0offline-" + id;
        },
        load(id) {
          if (id === "\0offline-tinfoil")
            return `export async function fetchAttestationBundle(){return {domain:'inference.tinfoil.sh'}};export class Verifier {async verifyBundle(){} getVerificationDocument(){return {securityVerified:true,releaseDigest:'a'.repeat(64),configRepo:'tinfoilsh/confidential-model-router',hpkePublicKey:'synthetic',enclaveHost:'inference.tinfoil.sh'}}}`;
          if (id === "\0offline-ehbp")
            return `export class Transport{async request(url,init){
 const bodies=(window.offlineBodies ??= []); bodies.push(init.body);
 const answers=['# Plan\\n\\nStep one. Step two.','\`\`\`markdown\\n# Short plan\\n\\nOne step.\\n\`\`\`'];
 const events=[{choices:[{index:0,delta:{content:answers[bodies.length-1] ?? 'Extra.'},finish_reason:'stop'}]},{choices:[],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}];
 return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\\n\\n').join('')+'data: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}});
 }};export const Identity={fromPublicKeyHex:async()=>({})};`;
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts"))
            return `import {streamVerifiedConversation} from '/src/verified-chat.ts';
 export async function streamReply(c,q,csrf,signal,chunk,status,session,kept){return streamVerifiedConversation(c,{origin:'https://inference.tinfoil.sh',repository:'tinfoilsh/confidential-model-router',releaseDigests:['a'.repeat(64)],model:'synthetic',maxInputCharacters:20000,maxOutputTokens:100,pricing:{currency:'USD',inputPerMillion:0,outputPerMillion:0}},csrf,signal,chunk,status,()=>{},undefined,undefined,undefined,session,undefined,undefined,kept);}`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  delete process.env.VITE_CANVAS;
  await browser?.close();
  await vite?.close();
});

async function open(width: number, lang: "en" | "de") {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: 900 },
    hasTouch: width < 760,
    acceptDownloads: true,
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.addInitScript(() => Object.assign(window, { prints: 0, print: () => (window as unknown as { prints: number }).prints++ }));
  const outside: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") {
      outside.push(`${route.request().method()} ${url.href}`);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "synthetic",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 20000 } },
          search: false,
        },
      });
    return route.continue();
  });
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto(origin, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, outside };
}

const bodies = (page: Page) =>
  page.evaluate(() => (window as unknown as { offlineBodies?: string[] }).offlineBodies ?? []);
const noSidewaysScroll = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => {
    const body = document.querySelector(".canvas-body");
    return body ? body.scrollWidth - body.clientWidth : 0;
  })).toBeLessThanOrEqual(0);
};
/** Every visible control in the panel: at least 24 px, 44 px high on phones, inside the viewport. */
async function targets(page: Page, width: number) {
  for (const button of await page.locator(".canvas-panel button:visible").all()) {
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  }
}

for (const width of [375, 768, 1280])
  for (const lang of ["en", "de"] as const)
    it(`${width} px, ${lang}: open from an answer, edit, table, ask for changes, apply, undo, exports, focus`, async () => {
      const a = appText[lang];
      const t = canvasText[lang];
      const { page, outside } = await open(width, lang);
      const panel = page.locator("aside.canvas-panel");
      try {
        await page.getByLabel(a.messageInput).fill("SYNTHETIC write a plan");
        await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
        await ui(page.locator("article.assistant").last()).toContainText("Step one.");

        // Open in canvas: a labelled region, the focus on its heading.
        const opener = page.getByRole("button", { name: t.open });
        await opener.click();
        await ui(page.getByRole("complementary", { name: t.title })).toBeVisible();
        await ui(page.locator("#canvas-heading")).toBeFocused();
        const text = page.getByLabel(t.textLabel);
        await ui(text).toHaveValue("# Plan\n\nStep one. Step two.");
        const overlay = width < 1100;
        expect(await page.evaluate(() => document.querySelector("main")!.inert)).toBe(overlay);
        const box = (await panel.boundingBox())!;
        if (overlay) {
          expect(box.x).toBe(0);
          expect(Math.round(box.width)).toBe(width);
          await ui(page.getByRole("button", { name: `← ${t.back}` })).toBeVisible();
        } else {
          // Beside the chat: the conversation ends where the panel starts; the composer still works.
          const main = (await page.locator("main").boundingBox())!;
          expect(main.x + main.width).toBeLessThanOrEqual(box.x + 1);
          await ui(page.getByRole("button", { name: t.close })).toBeVisible();
          await page.getByLabel(a.messageInput).fill("still typing");
          await page.getByLabel(a.messageInput).fill("");
        }
        await noSidewaysScroll(page);
        await targets(page, width);

        // Edit and preview.
        await text.fill(`# Plan\n\nStep one. CANVAS-MARK. Write to ${EMAIL}.`);
        await panel.getByRole("button", { name: t.preview, exact: true }).click();
        await ui(panel.getByRole("heading", { name: "Plan", level: 1 })).toBeVisible();
        await panel.getByRole("button", { name: t.edit, exact: true }).click();

        // Ask for changes: cost shown first, exactly one request, masked, the canvas in it once.
        const ask = panel.getByRole("button", { name: `${t.ask} (${messageText[lang].uses(1)})`, exact: true });
        await panel.getByLabel(t.askLabel).fill("Make it shorter");
        await ask.click();
        await ui(panel.getByRole("heading", { name: "Short plan" })).toBeVisible();
        const sent = await bodies(page);
        expect(sent).toHaveLength(2);
        expect(sent[1]).toContain("Make it shorter");
        expect(sent[1].split("CANVAS-MARK").length).toBe(2);
        expect(sent[1]).not.toContain(EMAIL);
        expect(sent[1]).not.toContain("bert.synthetic");
        // The canvas changes only on Apply; then undo brings the edited version back.
        await ui(text).toHaveValue(`# Plan\n\nStep one. CANVAS-MARK. Write to ${EMAIL}.`);
        await targets(page, width);
        await panel.getByRole("button", { name: t.apply, exact: true }).click();
        await ui(text).toHaveValue("# Short plan\n\nOne step.");
        await ui(panel.getByLabel(t.askLabel)).toBeVisible();
        await panel.getByRole("button", { name: t.undo }).click();
        await ui(text).toHaveValue(`# Plan\n\nStep one. CANVAS-MARK. Write to ${EMAIL}.`);
        await ui(panel.getByRole("button", { name: t.undo })).toBeDisabled();

        // The table grid: typing with spaces, paste from a spreadsheet, add a row, CSV.
        await text.fill("| City | Count |\n| --- | ---: |\n| Bonn | 3 |");
        await panel.getByRole("button", { name: t.table, exact: true }).click();
        const cell = panel.getByLabel(t.cell(1, 1));
        await cell.fill("");
        await cell.pressSequentially("New York");
        await panel.getByLabel(t.cell(1, 2)).evaluate((el, pasted) => {
          const data = new DataTransfer();
          data.setData("text/plain", pasted);
          el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
        }, '4\t"a, b"\n5\tc\n');
        await panel.getByRole("button", { name: t.addRow }).click();
        await ui(panel.getByLabel(t.cell(3, 1))).toHaveValue("");
        await noSidewaysScroll(page);
        await targets(page, width);
        const [csv] = await Promise.all([page.waitForEvent("download"), panel.getByRole("button", { name: t.downloadCsv }).click()]);
        expect(csv.suggestedFilename()).toMatch(/\.csv$/);
        expect(await readFile((await csv.path())!, "utf8")).toBe('﻿City,Count,\r\nNew York,4,"a, b"\r\n,5,c\r\n,,\r\n');
        await panel.getByRole("button", { name: t.edit, exact: true }).click();
        await ui(text).toHaveValue("| City | Count |  |\n| --- | ---: | --- |\n| New York | 4 | a, b |\n|  | 5 | c |\n|  |  |  |");

        // Exports: Markdown to the clipboard and as a file, PDF through the print view (canvas alone).
        await panel.getByRole("button", { name: t.copy }).click();
        await ui.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("| New York | 4 | a, b |");
        const [md] = await Promise.all([page.waitForEvent("download"), panel.getByRole("button", { name: t.downloadMd }).click()]);
        expect(md.suggestedFilename()).toMatch(/\.md$/);
        await panel.getByRole("button", { name: t.pdf }).click();
        await ui.poll(() => page.evaluate(() => (window as unknown as { prints: number }).prints)).toBe(1);
        await ui(page.locator(".print-root")).toContainText("New York");
        await ui(page.locator(".print-root")).not.toContainText("Step one.");
        await ui(page.locator(".print-root h2")).toHaveCount(0);
        await page.evaluate(() => dispatchEvent(new Event("afterprint")));
        await ui(page.locator(".print-root")).toHaveCount(0);

        // Escape closes; the focus goes back to "Open in canvas"; the page is usable again.
        await text.press("Escape");
        await ui(panel).toHaveCount(0);
        await ui(opener.first()).toBeFocused();
        expect(await page.evaluate(() => document.querySelector("main")!.inert)).toBe(false);
        // Another answer, declining to replace: the same canvas opens; it belongs to the conversation.
        await page.evaluate(() => (window.confirm = () => false));
        await page.getByRole("button", { name: t.open }).first().click();
        await ui(page.getByRole("button", { name: t.edit, exact: true })).toBeVisible();
        await ui(page.getByLabel(t.textLabel)).toHaveCount(0); // a table opens in the table view
        await page.getByRole("button", { name: overlay ? `← ${t.back}` : t.close }).click();
        await ui(panel).toHaveCount(0);
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 90_000);

