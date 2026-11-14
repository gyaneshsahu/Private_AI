// The message component and the answer actions (docs/chat-feature-gaps-20261114.md, packages C
// and D) in the actual application at phone, tablet and desktop width, English and German.
// Offline: a Vite plugin replaces src/inference.ts, the status is faked, nothing leaves the
// machine. Every request the stand-in model receives is recorded: the list must equal the sends
// the test intended. The report's Thinking mode costs 3, so a hard-coded 5 would fail.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { composerText } from "../src/text/composer";
import { branchesText } from "../src/text/conversation-ui";
import { messageText } from "../src/text/message";
import { savedListText } from "../src/text/saved-list";
import { supportText } from "../src/text/support";

type Lang = "en" | "de";
type Call = { text: string; mode?: string };
let vite: ViteDevServer;
let browser: Browser;
let origin = "";

const tier = { model: "SYNTHETIC_MODEL", maxOutputTokens: 1024 };
const qualification = {
  maxInputCharacters: 100000,
  model: "SYNTHETIC_MODEL",
  modes: { fast: { ...tier, allowanceCost: 1 }, thinking: { ...tier, allowanceCost: 3 } },
};

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-chat-message-ui-test",
    plugins: [
      {
        name: "synthetic-recorded-model",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // SLOW: 60 paragraphs, one every 40 ms. Parameters as in src/inference.ts.
          return `export async function streamReply(c,q,csrf,signal,chunk,status,calc,kept,choice,mode){
            const text = c.messages.at(-1).text;
            (window.__calls ??= []).push({ text, mode });
            const stopped = () => { if (signal.aborted) throw signal.reason; };
            if (text.includes("SLOW"))
              for (let i = 0; i < 60; i++) {
                stopped();
                chunk("Synthetic line " + i + ".\\n\\n");
                await new Promise((r) => setTimeout(r, 40));
              }
            else chunk("Synthetic answer.");
            stopped();
            return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
          }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(lang: Lang, width: number) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    reducedMotion: lang === "de" ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (route.request().method() !== "GET") {
      writes.push(url.pathname);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification }, search: false },
      });
    return route.continue();
  });
  await page.goto(origin, { timeout: 90000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { context, page, errors, writes };
}

const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls?: Call[] }).__calls ?? []);
const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
const fromEnd = (page: Page) =>
  page
    .locator("main")
    .evaluate((main) => Math.round(main.scrollHeight - main.scrollTop - main.clientHeight));
/** At least 24 px on both sides; 44 px high at phone width. Inside the viewport's width. */
async function target(control: Locator, width: number) {
  await control.scrollIntoViewIfNeeded();
  const box = (await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}
const press = async (page: Page, control: Locator, key = "Enter") => {
  await control.focus();
  await page.keyboard.press(key);
};
const shownText = (text: Locator) => text.evaluate((el) => el.textContent);

const PLAIN =
  "# Not a heading\n* a star, [word] and [doc-1]\n1. one <b>tag</b> https://example.com/a\n    function f() { return 1; }";
const THIRTEEN = Array.from({ length: 13 }, (_, i) => `Short line ${i + 1}`).join("\n");
const FORTY = Array.from({ length: 40 }, (_, i) => `Long line ${i + 1}`).join("\n");
const FIVE_THOUSAND =
  "Donaudampfschifffahrtsgesellschaftskapitän Rechtsschutzversicherungsgesellschaften Kraftfahrzeughaftpflichtversicherung plain words here. "
    .repeat(40)
    .slice(0, 5000)
    .trim();
const UNBROKEN = "abcdefghij0123456789".repeat(100);
const QUESTION = "What is the capital of France?";
const EDITED = "Which river runs through Paris?";

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`${width} px, ${lang}: own text as typed and collapsed, edit and send, retry with cost, report`, async () => {
      const a = appText[lang];
      const m = messageText[lang];
      const b = branchesText[lang];
      const st = supportText[lang];
      const { context, page, errors, writes } = await open(lang, width);
      try {
        const box = page.getByLabel(a.messageInput);
        const sendButton = page.getByRole("button", { name: a.sendLabel, exact: true });
        const mode = page.getByRole("combobox", { name: a.answerMode });
        const users = page.locator("article.user");
        const answers = page.locator("article.assistant");
        const idle = async (sent: number) => {
          await expect.poll(async () => (await calls(page)).length).toBe(sent);
          await ui(sendButton).toBeVisible({ timeout: 15000 });
        };
        let sent = 0;
        const ask = async (text: string) => {
          await box.fill(text);
          await sendButton.click();
          await idle(++sent);
          await ui(answers.last()).toContainText("Synthetic");
        };
        await ui(box).toBeVisible();
        // Fast, so the mode never depends on what the test texts happen to contain.
        await mode.selectOption("fast");

        // --- Own text exactly as typed: no heading, list, link, citation or control.
        await ask(PLAIN);
        const plain = users.nth(0).locator(".user-text");
        expect(await shownText(plain)).toBe(PLAIN);
        await ui(plain.locator("h1, h2, h3, ul, ol, li, a, b, code, pre, button")).toHaveCount(0);
        expect(await plain.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-wrap");
        await ui(users.nth(0).locator(".show-more")).toHaveCount(0);
        // What was attached to a message before is still there.
        await ui(users.nth(0).locator("time.message-time")).toBeVisible();
        await ui(users.nth(0).getByRole("button", { name: savedListText[lang].copyMessageLabel })).toBeVisible();
        await ui(answers.nth(0).getByRole("button", { name: a.copyAnswer, exact: true })).toBeEnabled();
        await ui(answers.nth(0).locator(".answered-by")).not.toBeEmpty();
        await ui(page.getByRole("article", { name: a.messageLabel(true, 1), exact: true })).toBeVisible();
        await ui(page.getByRole("article", { name: a.messageLabel(false, 2), exact: true })).toBeVisible();

        // --- 13 lines stay open; 40 lines are cut to about 12 with a real button.
        await ask(THIRTEEN);
        await ui(users.nth(1).locator(".show-more")).toHaveCount(0);
        await ask(FORTY);
        const long = users.nth(2);
        const more = long.getByRole("button", { name: m.showMore, exact: true });
        const less = long.getByRole("button", { name: m.showLess, exact: true });
        await ui(more).toHaveAttribute("aria-expanded", "false");
        const text = page.locator(`[id="${await more.getAttribute("aria-controls")}"]`);
        const sizes = () =>
          text.evaluate((el) => ({
            shown: el.clientHeight,
            full: el.scrollHeight,
            line: parseFloat(getComputedStyle(el).lineHeight),
            scrolled: el.scrollTop,
          }));
        const cut = await sizes();
        expect(Math.round(cut.shown / cut.line)).toBe(12);
        expect(cut.full).toBeGreaterThanOrEqual(cut.shown * 1.5);
        // The cut text stays in the page for screen readers and is not hidden from them.
        expect(await shownText(text)).toBe(FORTY);
        expect(await text.evaluate((el) => !!el.closest("[aria-hidden], [inert], [hidden]"))).toBe(false);
        await target(more, width);
        await noSidewaysScroll(page);
        // Keyboard: Enter opens, the focus stays on the button, the message does not move.
        await more.focus();
        const before = (await long.boundingBox())!.y;
        await page.keyboard.press("Enter");
        await ui(less).toHaveAttribute("aria-expanded", "true");
        await ui(less).toBeFocused();
        const opened = await sizes();
        expect(opened.shown).toBe(opened.full);
        expect(Math.abs((await long.boundingBox())!.y - before)).toBeLessThanOrEqual(2);
        await target(less, width);
        // Space closes it again; the button and the message are on screen.
        await page.keyboard.press("Space");
        await ui(more).toHaveAttribute("aria-expanded", "false");
        await ui(more).toBeFocused();
        await ui(more).toBeInViewport();
        expect((await sizes()).shown).toBe(cut.shown);
        await noSidewaysScroll(page);

        // --- 5,000 characters with long German words, and one unbroken string: cut, no overflow.
        await ask(FIVE_THOUSAND);
        const fiveMore = users.nth(3).getByRole("button", { name: m.showMore, exact: true });
        await ui(fiveMore).toBeVisible();
        expect(await shownText(users.nth(3).locator(".user-text"))).toBe(FIVE_THOUSAND);
        await noSidewaysScroll(page);
        await ask(UNBROKEN);
        const unbroken = users.nth(4).locator(".user-text");
        await ui(users.nth(4).getByRole("button", { name: m.showMore, exact: true })).toBeVisible();
        expect(await unbroken.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await noSidewaysScroll(page);
        await press(page, users.nth(4).getByRole("button", { name: m.showMore, exact: true }));
        expect(await unbroken.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await noSidewaysScroll(page);
        await press(page, users.nth(4).getByRole("button", { name: m.showLess, exact: true }));

        // --- While the view follows a streaming answer: opening an earlier message does not
        // break anything. Afterwards the view is either at the end or offers "Jump to latest".
        await box.fill("SLOW stream");
        await sendButton.click();
        sent++;
        await ui(answers.last()).toContainText("Synthetic line 5.");
        await expect.poll(() => fromEnd(page)).toBeLessThanOrEqual(4);
        await fiveMore.dispatchEvent("click");
        await ui(users.nth(3).getByRole("button", { name: m.showLess, exact: true })).toHaveAttribute(
          "aria-expanded",
          "true",
        );
        await ui(answers.last()).toContainText("Synthetic line 59.", { timeout: 15000 });
        await idle(sent);
        const jump = page.getByRole("button", { name: composerText[lang].jumpLatest, exact: true });
        if (await jump.count()) {
          await jump.click();
          await ui(jump).toHaveCount(0);
        }
        await expect.poll(() => fromEnd(page), { timeout: 8000 }).toBeLessThanOrEqual(4);
        await noSidewaysScroll(page);

        // --- Retry on the newest answer, with the cost from the report in the visible label.
        await ask(QUESTION);
        const retryName = (units: number) => `${a.retryLast} (${m.uses(units)})`;
        const thinkingName = `${a.answerThinking} (${m.uses(3)})`;
        const retry = page.getByRole("button", { name: retryName(1), exact: true });
        const thinking = page.getByRole("button", { name: thinkingName, exact: true });
        await ui(retry).toHaveCount(1); // only on the newest message
        await ui(answers.last().getByRole("button", { name: retryName(1), exact: true })).toBeVisible();
        await ui(retry).toHaveText(retryName(1)); // visible text, not a hover title
        await ui(thinking).toHaveText(thinkingName);
        await target(retry, width);
        await target(thinking, width);
        await noSidewaysScroll(page);
        const articles = await page.locator("article.message").count();
        await press(page, retry);
        await idle(++sent);
        expect((await calls(page)).at(-1)).toEqual({ text: QUESTION, mode: "fast" });
        await ui(page.locator("article.message")).toHaveCount(articles);
        // One press, one Thinking request; after a Thinking answer there is nothing deeper to offer.
        await thinking.click();
        await idle(++sent);
        expect((await calls(page)).at(-1)).toEqual({ text: QUESTION, mode: "thinking" });
        await ui(thinking).toHaveCount(0);
        await ui(page.locator("article.message")).toHaveCount(articles);
        // The label follows the mode that a press would use: Thinking 3, Auto reads the question.
        await mode.selectOption("thinking");
        await ui(page.getByRole("button", { name: retryName(3), exact: true })).toHaveCount(1);
        await mode.selectOption("auto");
        await ui(retry).toHaveCount(1);

        // --- Edit in place. Escape and Cancel send nothing and change nothing.
        const mine = users.last();
        const edit = mine.getByRole("button", { name: a.editIntoBranch });
        const editBox = page.getByLabel(a.editedMessage);
        await press(page, edit);
        await ui(editBox).toBeFocused();
        await ui(editBox).toHaveValue(QUESTION);
        expect(await mine.evaluate((el, id) => !!el.querySelector(`#${id}`), "edited-message")).toBe(true);
        await page.keyboard.press("Escape");
        await ui(editBox).toHaveCount(0);
        await ui(edit).toBeFocused();
        await press(page, edit);
        await editBox.fill("SYNTHETIC text that is never sent");
        const cancel = mine.getByRole("button", { name: a.cancel, exact: true });
        await target(cancel, width);
        await cancel.click();
        await ui(editBox).toHaveCount(0);
        await ui(edit).toBeFocused();
        expect(await shownText(mine.locator(".user-text"))).toBe(QUESTION);
        expect(await calls(page)).toHaveLength(sent);
        await ui(page.locator("article.message")).toHaveCount(articles);

        // The cost is on the Send button before sending: Auto would use Fast for this text (1),
        // the chosen Thinking mode 3. Send makes exactly one request with the edited text.
        await press(page, edit);
        await editBox.fill(EDITED);
        await ui(mine.getByRole("button", { name: `${m.sendEdit} (${m.uses(1)})`, exact: true })).toBeVisible();
        await editBox.fill("Explain step by step why Paris is the capital.");
        await ui(mine.getByRole("button", { name: `${m.sendEdit} (${m.uses(3)})`, exact: true })).toBeVisible();
        await editBox.fill(EDITED);
        await mode.selectOption("thinking");
        const sendEdit = mine.getByRole("button", { name: `${m.sendEdit} (${m.uses(3)})`, exact: true });
        await target(sendEdit, width);
        await noSidewaysScroll(page);
        await sendEdit.click();
        await idle(++sent);
        expect((await calls(page)).at(-1)).toEqual({ text: EDITED, mode: "thinking" });
        await ui(editBox).toHaveCount(0);
        expect(await shownText(users.last().locator(".user-text"))).toBe(EDITED);
        await ui(page.locator("article.message")).toHaveCount(articles);
        // The version before the edit is kept as a branch; opening it makes no request.
        await page.getByText(b.summary(4, "Edit 3"), { exact: true }).click();
        await page.getByRole("button", { name: b.open("Retry 2"), exact: true }).click();
        expect(await shownText(users.last().locator(".user-text"))).toBe(QUESTION);
        await ui(answers.last()).toContainText("Synthetic answer.");
        await page.getByRole("button", { name: b.open("Edit 3"), exact: true }).click();
        expect(await shownText(users.last().locator(".user-text"))).toBe(EDITED);
        expect(await calls(page)).toHaveLength(sent);
        // With a keyboard, Enter in the edit box sends once, as in the message box.
        await mode.selectOption("fast");
        await press(page, users.last().getByRole("button", { name: a.editIntoBranch }));
        await ui(editBox).toBeFocused();
        await page.keyboard.type(" Again");
        await page.keyboard.press("Shift+Enter");
        await ui(editBox).toHaveValue(`${EDITED} Again\n`);
        await page.keyboard.press("Enter");
        await idle(++sent);
        expect((await calls(page)).at(-1)).toEqual({ text: `${EDITED} Again`, mode: "fast" });
        await noSidewaysScroll(page);

        // --- Report a problem: the support note with the answer choice set. Nothing about the
        // conversation is in it and nothing is sent.
        const report = answers.last().getByRole("button", { name: m.reportLabel, exact: true });
        await ui(report).toHaveText(m.report);
        await ui(page.getByRole("button", { name: m.reportLabel, exact: true })).toHaveCount(await answers.count());
        await target(report, width);
        await press(page, report);
        await ui(page.getByRole("heading", { name: st.heading, exact: true })).toBeVisible();
        await ui(page.getByLabel(st.whatHappened, { exact: true })).toHaveValue("incorrect");
        await ui(page.getByLabel(st.whatHappened, { exact: true })).toBeFocused();
        await ui(page.getByLabel(st.area, { exact: true })).toHaveValue("conversation");
        const note = await page.getByLabel(st.review, { exact: true }).inputValue();
        for (const secret of ["Paris", "capital", "Synthetic", "Long line", "abcdefghij"])
          expect(note).not.toContain(secret);
        await noSidewaysScroll(page);

        // Every request the stand-in model received, in order: exactly the intended ones.
        expect((await calls(page)).map((call) => call.text)).toEqual([
          PLAIN,
          THIRTEEN,
          FORTY,
          FIVE_THOUSAND,
          UNBROKEN,
          "SLOW stream",
          QUESTION,
          QUESTION,
          QUESTION,
          EDITED,
          `${EDITED} Again`,
        ]);
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    }, 180_000);
