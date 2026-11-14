// Memory across chats (docs/memory-20261114.md) in a real browser at phone, tablet and desktop
// width, in English and German: the Memory screen in Settings and the "remember" flow.
// Offline: a Vite plugin replaces src/inference.ts (it records what would be sent), the status is
// faked, and the vault is the browser's own storage. Nothing here is live provider evidence.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { appText } from "../src/text/app";
import { memoryText } from "../src/text/memory";
import { workspaceText } from "../src/text/workspace";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;

async function serve(memory: boolean) {
  // A build setting (src/device-features.ts): on for this server only.
  if (memory) process.env.VITE_MEMORY = "1";
  else delete process.env.VITE_MEMORY;
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: `node_modules/.vite-memory-ui-test${memory ? "" : "-off"}`,
    plugins: [
      {
        name: "synthetic-answer",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // Records the latest outgoing message exactly as the real path composes it.
          return `import { composeContext } from "./conversation";
          export async function streamReply(c,q,csrf,signal,chunk){
            (window.__sent ??= []).push(composeContext(c, 100000).at(-1).content);
            chunk("Synthetic answer.");
            return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
          }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await server.listen();
  await warmDevServer(server);
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

beforeAll(async () => {
  ({ server: vite, origin } = await serve(true));
  browser = await chromium.launch(browserLaunchOptions());
}, 90_000);

afterAll(async () => {
  delete process.env.VITE_MEMORY;
  await browser?.close();
  await vite?.close();
});

async function open(at: string, width: number, lang: "en" | "de") {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: 900 },
    hasTouch: width < 760,
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const outside: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== at || route.request().method() !== "GET") {
      outside.push(`${route.request().method()} ${url.href}`);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
          search: false,
        },
      });
    return route.continue();
  });
  // Leaving an unsaved chat asks first; the test agrees.
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto(at, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, outside };
}

const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(0);
/** At least 24 px on both sides; 44 px high at phone width. Inside the viewport. */
async function target(control: Locator, width: number) {
  const box = (await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}
const sent = (page: Page) => page.evaluate(() => (window as unknown as { __sent?: string[] }).__sent ?? []);

const WORDS = {
  en: {
    first: "I am vegetarian and allergic to peanuts.",
    second: "I live in Leipzg.",
    secondFixed: "I live in Leipzig.",
    request: "Remember that my dog is called Balu.",
    requested: "my dog is called Balu.",
    question: "What should my dog Balu eat?",
    again: "Tell me more about Balu.",
    other: "Remember that I like tea.",
  },
  de: {
    first: "Ich esse vegetarisch und vertrage keine Erdnüsse.",
    second: "Ich wohne in Leipzg.",
    secondFixed: "Ich wohne in Leipzig.",
    request: "Merk dir, dass mein Hund Balu heißt.",
    requested: "mein Hund Balu heißt.",
    question: "Was soll mein Hund Balu fressen?",
    again: "Erzähl mir mehr über Balu.",
    other: "Merk dir, dass ich Tee mag.",
  },
};

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: the Memory screen, the remember flow, the note under the answer, off per chat, incognito, forget all, locked`, async () => {
      const a = appText[lang];
      const m = memoryText[lang];
      const w = workspaceText[lang];
      const x = WORDS[lang];
      const { page, outside } = await open(origin, width, lang);
      const menu = page.locator(".conversation-menu");
      const settings = page.locator("dialog.settings-dialog");
      const input = page.getByLabel(a.messageInput);
      const send = page.getByRole("button", { name: a.sendLabel, exact: true });
      const openMenu = async () => {
        if (!(await menu.getAttribute("open") !== null)) await menu.locator("summary").click();
      };
      const openMemory = async () => {
        await openMenu();
        await menu.getByRole("button", { name: a.settings, exact: true }).click();
        await settings.getByRole("button", { name: m.title, exact: true }).click();
      };
      const closeSettings = () => settings.getByRole("button", { name: a.closeSettings }).click();
      const toChat = async () => {
        await openMenu();
        await menu.getByRole("button", { name: a.tabConversation, exact: true }).click();
      };
      try {
        // No vault yet: the screen says plainly that memory needs the unlocked vault.
        await openMemory();
        await ui(settings.getByText(m.intro)).toBeVisible();
        await ui(settings.getByText(m.sentNote)).toBeVisible();
        await ui(settings.getByText(m.locked)).toBeVisible();
        await ui(settings.getByLabel(m.addLabel)).toHaveCount(0);
        await noSidewaysScroll(page);
        await closeSettings();
        // Asking to remember while locked: the question explains, and offers no Save.
        await input.fill(x.request);
        await send.click();
        const asked = page.locator("dialog.remember-dialog");
        await ui(asked.getByText(m.rememberLocked)).toBeVisible();
        await ui(asked.getByRole("button", { name: m.rememberSave })).toHaveCount(0);
        await asked.getByRole("button", { name: m.cancel }).click();
        await ui(asked).toHaveCount(0);
        await ui(input).toHaveValue(x.request);
        // Focus is back in the composer: on the field, or on Send where a tap opened the question.
        expect(await page.evaluate(() => !!document.activeElement?.closest("form.composer"))).toBe(true);
        await input.fill("");

        // Create the vault.
        await openMenu();
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic memory ui passphrase");
        await page.getByRole("button", { name: a.createOrUnlock }).click();
        await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();

        // The Memory screen: add two memories, the first by keyboard.
        await openMemory();
        await ui(settings.getByText(m.none)).toBeVisible();
        const add = settings.getByLabel(m.addLabel);
        const addButton = settings.getByRole("button", { name: m.add });
        await ui(addButton).toBeDisabled();
        await add.fill(x.first);
        await add.press("Enter");
        await ui(settings.locator(".memory-status")).toHaveText(m.added);
        await ui(add).toHaveValue("");
        await add.fill(x.second);
        await target(addButton, width);
        await addButton.click();
        const list = settings.getByRole("list", { name: m.listLabel });
        await ui(list.getByRole("listitem")).toHaveCount(2);
        // The newest first.
        await ui(list.getByRole("listitem").first()).toContainText(x.second);
        await ui(settings.getByText(m.count(2, 200))).toBeVisible();
        // The same words are not saved twice.
        await add.fill(`  ${x.first.toUpperCase()} `);
        await add.press("Enter");
        await ui(settings.locator(".memory-status")).toHaveText(m.problem("duplicate"));
        await ui(list.getByRole("listitem")).toHaveCount(2);
        await add.fill("");

        // Edit by keyboard; focus returns to the Edit button.
        const second = list.getByRole("listitem").filter({ hasText: x.second });
        const edit = second.getByRole("button", { name: m.edit, exact: true });
        await target(edit, width);
        await edit.focus();
        await page.keyboard.press("Enter");
        const editor = settings.getByLabel(m.editLabel);
        await ui(editor).toBeFocused();
        await editor.fill(x.secondFixed);
        await page.keyboard.press("Enter");
        await ui(settings.locator(".memory-status")).toHaveText(m.changed);
        const fixed = list.getByRole("listitem").filter({ hasText: x.secondFixed });
        await ui(fixed.getByRole("button", { name: m.edit, exact: true })).toBeFocused();

        // Always include: a pressed button, and that memory moves to the top.
        const first = list.getByRole("listitem").filter({ hasText: x.first });
        const always = first.getByRole("button", { name: m.always });
        await target(always, width);
        await ui(always).toHaveAttribute("aria-pressed", "false");
        await always.click();
        await ui(first.getByRole("button", { name: m.always })).toHaveAttribute("aria-pressed", "true");
        await ui(list.getByRole("listitem").first()).toContainText(x.first);

        // Delete asks first: Cancel keeps it, Delete removes it.
        const remove = fixed.getByRole("button", { name: m.delete, exact: true });
        await target(remove, width);
        await remove.click();
        const confirm = page.locator("dialog.confirm-dialog");
        await ui(confirm.getByRole("heading", { name: m.deleteTitle })).toBeVisible();
        await ui(confirm.getByRole("button", { name: m.cancel })).toBeFocused();
        await page.keyboard.press("Enter");
        await ui(confirm).toHaveCount(0);
        // The confirmation closing does not close Settings around it.
        await ui(settings).toBeVisible();
        await ui(list.getByRole("listitem")).toHaveCount(2);
        await remove.click();
        await confirm.getByRole("button", { name: m.delete, exact: true }).click();
        await ui(list.getByRole("listitem")).toHaveCount(1);
        await ui(settings.locator(".memory-status")).toHaveText(m.deleted);
        await target(settings.getByRole("button", { name: m.forgetAll }), width);
        await noSidewaysScroll(page);
        await closeSettings();

        // "Remember that ...": the app asks with the exact words; nothing is sent.
        await toChat();
        await input.fill(x.request);
        // Enter sends on a keyboard device; on a touch device Enter is a new line, so Send is tapped.
        if (width < 760) await send.click();
        else await input.press("Enter");
        await ui(asked.getByRole("heading", { name: m.rememberTitle })).toBeVisible();
        const words = asked.getByLabel(m.rememberLabel);
        await ui(words).toHaveValue(x.requested);
        await ui(words).toBeFocused();
        const saveMemory = asked.getByRole("button", { name: m.rememberSave });
        await target(saveMemory, width);
        await target(asked.getByRole("button", { name: m.rememberSend }), width);
        await noSidewaysScroll(page);
        // Too long: said in words, and Save is off until it is shortened.
        await words.fill("x".repeat(301));
        await ui(asked.getByText(m.problem("long"))).toBeVisible();
        await ui(saveMemory).toBeDisabled();
        await words.fill(x.requested);
        await saveMemory.click();
        await ui(asked).toHaveCount(0);
        await ui(page.getByText(m.added)).toBeVisible();
        await ui(input).toHaveValue("");
        await ui(page.locator("article")).toHaveCount(0);
        expect(await sent(page)).toEqual([]);

        // A question that fits: the matching memory and the always-included one go with it.
        await input.fill(x.question);
        await send.click();
        const answer = page.locator("article.assistant").last();
        await ui(answer).toContainText("Synthetic answer.");
        const [withMemory] = await sent(page);
        expect(withMemory).toContain("[Notes the user saved about themselves on their device.");
        expect(withMemory).toContain(`- ${x.first}\n- ${x.requested}\n[End of notes]\n\n${x.question}`);
        // The note under the answer names them.
        const note = answer.locator("details.memory-used");
        await ui(note.locator("summary")).toHaveText(m.used(2));
        await target(note.locator("summary"), width);
        await note.locator("summary").click();
        await ui(note.getByRole("listitem")).toHaveText([x.first, x.requested]);
        await noSidewaysScroll(page);

        // "Remember this" on the own message opens the same question with that message.
        const mine = page.locator("article.user").first();
        const rememberThis = mine.getByRole("button", { name: m.rememberThis });
        await target(rememberThis, width);
        await rememberThis.click();
        await ui(asked.getByLabel(m.rememberLabel)).toHaveValue(x.question);
        await ui(asked.getByRole("button", { name: m.rememberSend })).toHaveCount(0);
        await page.keyboard.press("Escape");
        await ui(asked).toHaveCount(0);

        // Off for this chat: the next question carries no memory, not even the always-included one.
        await openMenu();
        const chatSwitch = menu.getByRole("checkbox", { name: m.chatSwitch });
        await ui(chatSwitch).toBeChecked();
        await target(menu.locator(".menu-check"), width);
        await chatSwitch.uncheck();
        await page.keyboard.press("Escape");
        await input.fill(x.again);
        await send.click();
        await ui(page.locator("article.assistant").nth(1)).toContainText("Synthetic answer.");
        await ui.poll(async () => (await sent(page))[1]).toBe(x.again);
        await ui(page.locator("article.assistant").last().locator("details.memory-used")).toHaveCount(0);

        // "Send as a message instead" sends the typed text like any message.
        await input.fill(x.other);
        await send.click();
        await asked.getByRole("button", { name: m.rememberSend }).click();
        await ui(page.locator("article.assistant").nth(2)).toContainText("Synthetic answer.");
        await ui.poll(async () => (await sent(page))[2]).toBe(x.other);

        // Incognito: no question to save, no "Remember this", no switch, and no memory is sent.
        if (!(await page.getByRole("button", { name: w.newIncognito }).isVisible()))
          await page.getByRole("button", { name: a.openNavigation }).click();
        await page.getByRole("button", { name: w.newIncognito }).click();
        await ui(page.locator("article")).toHaveCount(0);
        await input.fill(x.request);
        await send.click();
        await ui(page.locator("article.assistant").first()).toContainText("Synthetic answer.");
        await ui(asked).toHaveCount(0);
        await ui.poll(async () => (await sent(page))[3]).toBe(x.request);
        await ui(page.getByRole("button", { name: m.rememberThis })).toHaveCount(0);
        await openMenu();
        await ui(menu.getByRole("checkbox", { name: m.chatSwitch })).toHaveCount(0);
        // Nothing was saved from the incognito chat.
        await menu.getByRole("button", { name: a.settings, exact: true }).click();
        await settings.getByRole("button", { name: m.title, exact: true }).click();
        await ui(list.getByRole("listitem")).toHaveCount(2);

        // Forget all asks first, then nothing is left.
        await settings.getByRole("button", { name: m.forgetAll }).click();
        await ui(confirm.getByText(m.forgetAllText(2))).toBeVisible();
        await confirm.getByRole("button", { name: m.forgetAll }).click();
        await ui(settings.getByText(m.none)).toBeVisible();
        await ui(settings.locator(".memory-status")).toHaveText(m.forgotten);
        await ui(settings.getByRole("button", { name: m.forgetAll })).toBeDisabled();
        await closeSettings();

        // Locking the vault: the screen shows no memory controls again.
        await openMenu();
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByRole("button", { name: a.lockAndClear }).click();
        await openMemory();
        await ui(settings.getByText(m.locked)).toBeVisible();
        await ui(settings.getByLabel(m.addLabel)).toHaveCount(0);
        // Nothing but this page's own files and the faked status was requested.
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 120_000);

it("with the switch off there is no Memory section, no question to save and no Remember button", async () => {
  const off = await serve(false);
  try {
    const { page } = await open(off.origin, 1280, "en");
    const a = appText.en;
    const m = memoryText.en;
    const menu = page.locator(".conversation-menu");
    await page.getByLabel(a.messageInput).fill(WORDS.en.request);
    await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
    await ui(page.locator("article.assistant")).toContainText("Synthetic answer.");
    await ui(page.locator("dialog.remember-dialog")).toHaveCount(0);
    await ui(page.getByRole("button", { name: m.rememberThis })).toHaveCount(0);
    await menu.locator("summary").click();
    await ui(menu.getByRole("checkbox", { name: m.chatSwitch })).toHaveCount(0);
    await menu.getByRole("button", { name: a.settings, exact: true }).click();
    const settings = page.locator("dialog.settings-dialog");
    await ui(settings.getByRole("button", { name: a.sectionPrivacy, exact: true })).toBeVisible();
    await ui(settings.getByRole("button", { name: m.title, exact: true })).toHaveCount(0);
    await page.context().close();
  } finally {
    await off.server.close();
  }
}, 120_000);
