// Scheduled tasks (docs/scheduled-20261115.md) in a real browser at phone, tablet and desktop
// width, in English and German: the Scheduled screen, the New task form and its validation,
// templates, the Due now strip and Run now (answered like a chat message, so a time-sensitive
// instruction searches at once; the form has no search choice since 19 November), the chat card,
// the calendar download, and the Auto flows against the contract fake of the server
// (tests/fixtures/background-tasks-fake.ts). No consent boxes in the form (owner, 18 November): the
// client fills the server's consent record itself.
// Offline: a Vite plugin replaces src/inference.ts and counts what would be sent; the status and
// the background routes are faked; the clock is Playwright's. Nothing here is live evidence.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { createBackgroundTasksFake, FAKE_STATUS } from "./fixtures/background-tasks-fake";
import { appText } from "../src/text/app";
import { scheduledText } from "../src/text/scheduled";
import { answerQuestions } from "./fixtures/app-questions";

let vite: ViteDevServer;
let off: ViteDevServer;
let browser: Browser;
let origin = "";
let offOrigin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
// The form's removed search choice (19 November), by its old labels.
const OLD_SEARCH = { en: "Search the web first", de: "Zuerst im Web suchen" };
const OLD_SEARCH_TEXT = { en: "Search text", de: "Suchtext" };

async function serve(scheduled: boolean) {
  if (scheduled) process.env.VITE_SCHEDULED = "1";
  else delete process.env.VITE_SCHEDULED;
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: `node_modules/.vite-scheduled-ui-test${scheduled ? "" : "-off"}`,
    plugins: [
      {
        name: "synthetic-answer",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // The real parameter list (src/inference.ts); records each outgoing message.
          return `import { composeContext } from "./conversation";
          export async function streamReply(conversation, qualification, csrf, signal, onChunk, onStatus, calculationSession, onKeptOnDevice, modelChoice, mode, cacheSalt, image, code, research) {
            (window.__sent ??= []).push(composeContext(conversation, 100000).at(-1).content);
            onChunk("Synthetic answer.");
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
  ({ server: off, origin: offOrigin } = await serve(false));
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);

afterAll(async () => {
  delete process.env.VITE_SCHEDULED;
  await browser?.close();
  await vite?.close();
  await off?.close();
});

async function open(at: string, width: number, lang: "en" | "de") {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    timezoneId: "Europe/Berlin",
    viewport: { width, height: 900 },
    hasTouch: width < 760,
    acceptDownloads: true,
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  // 08:58 in Berlin: a daily task at 09:00 becomes due two minutes later.
  await page.clock.install({ time: new Date("2026-11-16T07:58:00Z") });
  const fake = createBackgroundTasksFake();
  const state = { auto: false, search: false };
  const outside: string[] = [];
  const searches: unknown[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === at && url.pathname.startsWith("/api/background-tasks")) {
      const { status, json } = fake.handle(
        request.method(),
        url.pathname,
        request.postData() ? request.postDataJSON() : undefined,
        request.headers()["x-privateai-csrf"],
      );
      return route.fulfill(status === 204 ? { status } : { status, json });
    }
    if (url.origin === at && url.pathname === "/api/research/prepare") {
      searches.push(request.postDataJSON());
      return route.fulfill({ json: { id: "s".repeat(48) } });
    }
    if (url.origin === at && url.pathname === "/api/research/execute")
      return route.fulfill({
        json: {
          sources: [
            {
              id: "synthetic-01",
              title: "Synthetic page",
              text: "Synthetic result text.",
              url: "https://one.example/result",
              retrievedAt: new Date().toISOString(),
              evidenceKind: "search-excerpt",
            },
          ],
        },
      });
    if (url.origin !== at || request.method() !== "GET") {
      outside.push(`${request.method()} ${url.href}`);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
          search: state.search,
          ...(state.auto ? { backgroundTasks: FAKE_STATUS } : {}),
        },
      });
    return route.continue();
  });
  await answerQuestions(page);
  await page.goto(at, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, fake, state, outside, searches };
}

const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(0);
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
    remind: "Remind me every day at 10 to drink water",
    owner: "can you give me a new German word to learn every 2 days because I am learning German?",
    cv: "Curriculum vitae (synthetic)\nAnna Example, data analyst in Leipzig.\nEmail: anna.example@example.org\nWork experience: 5 years.",
  },
  de: {
    remind: "Erinnere mich jeden Tag um 10 Uhr daran, Wasser zu trinken",
    owner: "Kannst du mir alle 2 Tage ein neues deutsches Wort geben?",
    cv: "Lebenslauf (synthetisch)\nAnna Beispiel, Datenanalystin in Leipzig.\nE-Mail: anna.example@example.org\nBerufserfahrung: 5 Jahre.",
  },
};

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: Scheduled screen, form, templates, due strip and Run now, chat card, calendar file, Auto flows`, async () => {
      const a = appText[lang];
      const s = scheduledText[lang];
      const x = WORDS[lang];
      const { page, fake, state, outside } = await open(origin, width, lang);
      const menu = page.locator(".conversation-menu");
      const panel = page.locator("dialog.scheduled-dialog");
      const form = page.locator("dialog.scheduled-form-dialog");
      const input = page.getByLabel(a.messageInput);
      const send = page.getByRole("button", { name: a.sendLabel, exact: true });
      const openScheduled = async (name = s.menu) => {
        const entry = page.getByRole("button", { name, exact: true });
        if (!(await entry.isVisible())) await page.getByRole("button", { name: a.openNavigation }).click();
        await target(entry, width);
        await entry.click();
        await ui(panel.getByRole("heading", { name: s.title, exact: true })).toBeVisible();
      };
      const unlock = async () => {
        if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic scheduled ui passphrase");
        await page.getByRole("button", { name: a.createOrUnlock }).click();
        await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
        await menu.locator("summary").click();
        if ((await menu.getAttribute("open")) !== null) await menu.locator("summary").click();
      };
      const toChat = async () => {
        if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
        await menu.getByRole("button", { name: a.tabConversation, exact: true }).click();
      };
      try {
        // Locked: the screen says the tasks need the unlocked vault.
        await openScheduled();
        await ui(panel.getByText(s.locked)).toBeVisible();
        await ui(panel.getByRole("button", { name: s.newTask })).toHaveCount(0);
        await noSidewaysScroll(page);
        await panel.getByRole("button", { name: s.close }).click();
        await ui(panel).toHaveCount(0);

        await unlock();
        await toChat();
        await openScheduled();
        await ui(panel.getByText(s.emptyTitle)).toBeVisible();
        await target(panel.getByRole("button", { name: s.newTask }), width);

        // A template opens the form prefilled; validation names the empty field and focuses it.
        await panel.getByRole("group", { name: s.tabs }).getByRole("button", { name: s.templates, exact: true }).click();
        await panel.getByRole("button", { name: `${s.useTemplate}: ${s.templateWordName}` }).click();
        await ui(form.getByLabel(s.name, { exact: true })).toHaveValue(s.templateWordName);
        await ui(form.getByLabel(s.instruction, { exact: true })).toHaveValue(s.templateWordInstruction);
        // Auto is shown but not offered while the server's switch is off.
        await ui(form.getByRole("radio", { name: new RegExp(s.modeAuto) })).toBeDisabled();
        await ui(form.getByText(s.notAvailable)).toBeVisible();
        await ui(form.getByRole("option", { name: s.hourly })).toHaveAttribute("disabled", "");
        // No search choice: the app decides from the instruction when the task runs.
        await ui(form.getByLabel(OLD_SEARCH[lang])).toHaveCount(0);
        await ui(form.getByLabel(OLD_SEARCH_TEXT[lang])).toHaveCount(0);
        await form.getByLabel(s.name, { exact: true }).fill("");
        await form.getByLabel(s.time, { exact: true }).fill("09:00");
        await target(form.getByRole("button", { name: s.create }), width);
        await form.getByRole("button", { name: s.create }).click();
        await ui(form.getByText(s.errorName)).toBeVisible();
        await ui(form.getByLabel(s.name, { exact: true })).toBeFocused();
        await ui(form.getByText(s.cost(1))).toBeVisible();
        await noSidewaysScroll(page);
        await form.getByLabel(s.name, { exact: true }).fill(s.templateWordName);
        await form.getByRole("button", { name: s.create }).click();
        await ui(form).toHaveCount(0);
        const row = panel.locator(".scheduled-list > li").filter({ hasText: s.templateWordName });
        await ui(row).toContainText(s.trigger({ every: 1, unit: "day", time: "09:00", timeZone: "Europe/Berlin" }));
        await ui(row.getByText(s.manual, { exact: true })).toBeVisible();
        await ui(panel.getByText(s.created)).toBeVisible();

        // The calendar file: neutral title, no instruction, RRULE, CRLF.
        const [download] = await Promise.all([page.waitForEvent("download"), row.getByRole("button", { name: s.exportOne }).click()]);
        expect(download.suggestedFilename()).toBe("cometrow-task.ics");
        const ics = readFileSync((await download.path())!, "utf8");
        expect(ics).toContain("BEGIN:VCALENDAR\r\n");
        expect(ics).toContain(`SUMMARY:${s.calendarTitle}\r\n`);
        expect(ics).toContain("RRULE:FREQ=DAILY;INTERVAL=1\r\n");
        expect(ics).toContain("DTSTART;TZID=Europe/Berlin:20261116T090000");
        expect(ics).not.toContain(s.templateWordInstruction.slice(0, 20));
        await panel.getByRole("button", { name: s.close }).click();

        // Two minutes later the task is due: one notice, the strip, and Run now sends exactly one request.
        await page.clock.fastForward("02:30");
        await ui(page.getByText(s.becameDue(s.templateWordName))).toBeVisible();
        const strip = page.getByRole("region", { name: s.dueRegion });
        await ui(strip).toContainText(s.templateWordName);
        const run = strip.getByRole("button", { name: new RegExp(`^${s.runNow}`) });
        await target(run, width);
        await noSidewaysScroll(page);
        expect(await sent(page)).toHaveLength(0);
        await run.click();
        await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer.");
        expect(await sent(page)).toEqual([expect.stringContaining(s.templateWordInstruction)]);
        // Answered: the task moves on to tomorrow and leaves the strip.
        await ui(strip).toHaveCount(0);

        // The chat card: Create stores a task and sends nothing.
        await input.fill(x.remind);
        await send.click();
        const card = page.getByRole("region", { name: s.cardRegion });
        await ui(card).toContainText(s.trigger({ every: 1, unit: "day", time: "10:00", timeZone: "Europe/Berlin" }));
        await target(card.getByRole("button", { name: s.create, exact: true }), width);
        await noSidewaysScroll(page);
        await card.getByRole("button", { name: s.create, exact: true }).click();
        await ui(card).toHaveCount(0);
        await ui(input).toHaveValue("");
        expect(await sent(page)).toHaveLength(1);
        // No time given: the card asks for one; "Just send" sends the message once, as written.
        await input.fill(x.owner);
        await send.click();
        await ui(card.getByLabel(s.cardWhen)).toHaveValue("09:00");
        await ui(card).toContainText(s.trigger({ every: 2, unit: "day", time: "09:00", timeZone: "Europe/Berlin" }));
        await card.getByRole("button", { name: s.justSend }).click();
        await ui.poll(async () => (await sent(page)).length).toBe(2);
        expect((await sent(page))[1]).toContain(x.owner);
        await ui(card).toHaveCount(0);

        // Delete asks first.
        await openScheduled();
        await ui(panel.locator(".scheduled-list > li")).toHaveCount(2);
        const water = panel.locator(".scheduled-list > li").nth(1);
        await water.getByRole("button", { name: s.delete }).click();
        const confirm = page.locator("dialog.confirm-dialog");
        await confirm.getByRole("button", { name: s.delete }).click();
        await ui(panel.locator(".scheduled-list > li")).toHaveCount(1);
        await panel.getByRole("button", { name: s.close }).click();

        // Auto: the server's switch on (reload, unlock again).
        state.auto = true;
        await page.reload();
        await unlock();
        await toChat();
        await openScheduled();
        await panel.getByRole("group", { name: s.tabs }).getByRole("button", { name: s.templates, exact: true }).click();
        await panel.getByRole("button", { name: `${s.useTemplate}: ${s.templateJobsName}` }).click();
        const autoChoice = form.getByRole("radio", { name: new RegExp(s.modeAuto) });
        await ui(autoChoice).toBeChecked();
        await ui(form.getByText(s.autoRunsFast)).toBeVisible();
        await ui(form.locator(".background-badge")).toBeVisible();
        // One CV, read and masked on this device. No consent boxes: the sign-up acceptance covers it.
        await form.getByLabel(s.attach).setInputFiles({ name: "cv.txt", mimeType: "text/plain", buffer: Buffer.from(x.cv) });
        await ui(form.getByText(/cv\.txt/)).toBeVisible();
        for (const text of [s.consentTitle, s.documentTitle, s.cvTitle, s.healthTitle])
          await ui(form.getByText(text, { exact: true })).toHaveCount(0);
        for (const label of [s.autoConsent, s.documentConsent, s.cvConsent, s.healthConsent])
          await ui(form.getByLabel(label)).toHaveCount(0);
        await noSidewaysScroll(page);
        // One Create saves it: the client fills the server's consent record (version, time, sensitive).
        await form.getByRole("button", { name: s.create }).click();
        await ui(form).toHaveCount(0);
        await ui(form.getByText(s.errorConsent)).toHaveCount(0);
        expect(fake.requests.filter((r) => r.method === "POST")).toHaveLength(1);
        expect(fake.consents).toHaveLength(1);
        const posted = fake.requests.find((r) => r.method === "POST")!.body as {
          consent: { version: string; acceptedAt: string; sensitive: boolean };
          attachment: { text: string };
        };
        expect(posted.consent).toMatchObject({ version: FAKE_STATUS.consentVersion, sensitive: true });
        // The time of saving, on the page's (Playwright's) clock: 16 November, shortly after 08:58 in Berlin.
        expect(posted.consent.acceptedAt).toMatch(/^2026-11-16T0[78]:\d\d:\d\d\.\d{3}Z$/);
        expect(posted.attachment.text).toContain("{{EMAIL-1}}");
        expect(posted.attachment.text).not.toContain("anna.example@example.org");
        const jobs = panel.locator(".scheduled-list > li").filter({ hasText: s.templateJobsName });
        await ui(jobs.locator(".background-badge")).toBeVisible();
        await ui(jobs.getByText(s.badgeLine)).toBeVisible();
        await panel.getByRole("button", { name: s.close }).click();
        // The sidebar entry keeps its badge while a background task exists.
        if (width >= 760) await ui(page.getByRole("button", { name: s.menuBackground })).toBeVisible();

        // Results: saved as a conversation and acknowledged; skipped and nothing-new shown plainly.
        const taskId = [...fake.tasks.keys()][0];
        fake.results.push(
          { id: "00000000-0000-4000-8000-000000000001", taskId, ranAt: "2026-11-16T08:05:00.000Z", status: "done", text: "Synthetic job list." },
          { id: "00000000-0000-4000-8000-000000000002", taskId, ranAt: "2026-11-16T08:06:00.000Z", status: "skipped", reason: "allowance_exhausted" },
          { id: "00000000-0000-4000-8000-000000000003", taskId, ranAt: "2026-11-16T08:07:00.000Z", status: "done", reason: "no_new_results" },
        );
        await page.clock.fastForward("05:05");
        await ui.poll(() => fake.acked.length).toBe(3);
        await ui(page.getByText(s.resultSaved(1))).toBeVisible();
        const strip2 = page.getByRole("region", { name: s.dueRegion });
        await ui(strip2).toContainText(s.reason("allowance_exhausted"));
        await ui(strip2).toContainText(s.resultNothingNew("§", "¤").split("¤")[1].trim());
        await openScheduled(s.menuBackground);
        // Deleting a background task deletes the server copy.
        await panel.locator(".scheduled-list > li").filter({ hasText: s.templateJobsName }).getByRole("button", { name: s.delete }).click();
        await ui(confirm.getByText(s.deleteBackgroundText)).toBeVisible();
        await confirm.getByRole("button", { name: s.delete }).click();
        await ui.poll(() => fake.tasks.size).toBe(0);
        expect(fake.requests.some((r) => r.method === "DELETE")).toBe(true);
        // The result conversation was saved into the vault.
        await panel.getByRole("button", { name: s.close }).click();
        if (width < 760) await page.getByRole("button", { name: a.openNavigation }).click();
        await ui(page.getByRole("button", { name: s.resultTitle(s.templateJobsName) })).toBeVisible();
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 120_000);

it("Run now of a time-sensitive task searches its masked instruction at once and answers: no card, no search choice in the form", async () => {
  const a = appText.en;
  const s = scheduledText.en;
  const { page, state, outside, searches } = await open(origin, 1280, "en");
  state.search = true;
  try {
    await page.reload();
    const menu = page.locator(".conversation-menu");
    const panel = page.locator("dialog.scheduled-dialog");
    const form = page.locator("dialog.scheduled-form-dialog");
    if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
    await menu.getByRole("button", { name: a.renameSave }).click();
    await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic scheduled ui passphrase");
    await page.getByRole("button", { name: a.createOrUnlock }).click();
    await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
    await menu.locator("summary").click();
    if ((await menu.getAttribute("open")) !== null) await menu.locator("summary").click();
    if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
    await menu.getByRole("button", { name: a.tabConversation, exact: true }).click();
    await page.getByRole("button", { name: s.menu, exact: true }).click();
    await panel.getByRole("button", { name: s.newTask }).first().click();
    // With search available the form still has no search choice, also behind "more".
    for (const more of await form.locator("details:not([open]) > summary").all()) await more.click();
    await ui(form.getByLabel(OLD_SEARCH.en)).toHaveCount(0);
    await ui(form.getByLabel(OLD_SEARCH_TEXT.en)).toHaveCount(0);
    await form.getByLabel(s.name, { exact: true }).fill("Synthetic news");
    // A time-sensitive instruction with an identifier: the search text is masked on this device.
    const instruction = "Summarise today's synthetic news for write@example.org.";
    await form.getByLabel(s.instruction, { exact: true }).fill(instruction);
    await form.getByLabel(s.time, { exact: true }).fill("09:00");
    await form.getByRole("button", { name: s.create }).click();
    await ui(form).toHaveCount(0);
    await panel.getByRole("button", { name: s.close }).click();
    // Due two minutes later: Run now searches the masked instruction once, then answers; nothing asks.
    await page.clock.fastForward("02:30");
    const strip = page.getByRole("region", { name: s.dueRegion });
    await strip.getByRole("button", { name: new RegExp(`^${s.runNow}`) }).click();
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText("Synthetic answer.");
    expect(searches).toEqual([{ kind: "search", value: "Summarise today's synthetic news for [email address removed]." }]);
    await ui(page.getByRole("region", { name: "Search suggestion" })).toHaveCount(0);
    expect(await sent(page)).toEqual([expect.stringContaining(instruction)]);
    // The answer says what was searched, as a chat answer does.
    await ui(answer.locator("details.searched-web")).toHaveCount(1);
    await ui(strip).toHaveCount(0);
    expect(outside).toEqual([]);
  } finally {
    await page.context().close();
  }
}, 120_000);

it("with VITE_SCHEDULED off nothing appears: no entry, no card, the message is sent", async () => {
  const { page } = await open(offOrigin, 1280, "en");
  try {
    await ui(page.getByRole("button", { name: scheduledText.en.menu, exact: true })).toHaveCount(0);
    await page.getByLabel(appText.en.messageInput).fill(WORDS.en.remind);
    await page.getByRole("button", { name: appText.en.sendLabel, exact: true }).click();
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer.");
    expect(await sent(page)).toHaveLength(1);
    await ui(page.getByRole("region", { name: scheduledText.en.cardRegion })).toHaveCount(0);
  } finally {
    await page.context().close();
  }
}, 60_000);
