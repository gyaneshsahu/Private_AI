// Scheduled, wired end to end (docs/scheduled-20261115.md, docs/background-tasks-20261115.md,
// "Wired end to end, 15 November"): the REAL app (Vite) against the REAL server routes
// (createApp with background tasks on, the memory store, a key file in a temporary folder), with
// only the Privatemode client of the runner and the search provider faked. The runner is a second
// service over the same store and keys, so the test moves its clock and calls its tick itself.
// Synthetic data only; nothing here is live evidence.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { chromium, expect as ui, type Page } from "@playwright/test";
import { createServer as createViteServer } from "vite";
import { validateQualification, type Source } from "../shared/contracts";
import { createApp } from "../server/app";
import { parseKeyRing } from "../server/background-crypto";
import type { BackgroundModelClient, BackgroundModelRequest } from "../server/background-privatemode";
import { MemoryBackgroundStore } from "../server/background-store";
import { BACKGROUND_LIMITS, createBackgroundTasks } from "../server/background-tasks";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { scheduledText } from "../src/text/scheduled";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { privatemodeReport } from "./fixtures/privatemode-report";

const a = appText.en;
const s = scheduledText.en;
const EMAIL = "anna.example@example.org";
const CV = `Curriculum vitae (synthetic)\nAnna Example, data analyst in Leipzig.\nEmail: ${EMAIL}\nWork experience: 5 years.`;
const ANSWER = "SYNTHETIC ANSWER: one offer, [Synthetic offer](https://jobs.example.test/1). Apply from {{EMAIL-1}}.";

it("creates an Auto task from the CV template, runs it on the server, saves the result once and deletes on both sides", async () => {
  const folder = mkdtempSync(join(tmpdir(), "cometrow-wiring-"));
  const keyFile = join(folder, "background.key");
  writeFileSync(keyFile, `k1:${randomBytes(32).toString("base64")}\n`);
  const keys = parseKeyRing(readFileSync(keyFile, "utf8"));
  const store = new MemoryBackgroundStore();
  const calls: BackgroundModelRequest[] = [];
  const model: BackgroundModelClient = {
    async ready() {},
    async complete(request) {
      calls.push(request);
      return { text: ANSWER, usage: { promptTokens: 900, completionTokens: 120 } };
    },
    close() {},
  };
  const searched: string[] = [];
  const sources: Source[] = [{ id: "web-1", title: "Synthetic offer", text: "Data analyst, Leipzig", url: "https://jobs.example.test/1" }];
  const search = { id: "brave" as const, recipientLabel: "Brave Search API", search: async (query: string) => (searched.push(query), sources) };

  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  process.env.VITE_SCHEDULED = "1";
  const vite = await createViteServer({
    cacheDir: "node_modules/.vite-scheduled-wiring",
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
    logLevel: "silent",
  });
  await warmDevServer(vite);
  const app = createApp({
    origin,
    dev: true,
    searchKey: "SYNTHETIC_NOT_A_KEY",
    search,
    backgroundTasks: { maxAutoTasks: 3, store, keys, model, log: () => {}, start: false },
  });
  app.use(vite.middlewares);
  server.on("request", app);
  // The runner: the same store and keys as the app's routes, its own clock.
  let clock = Date.now();
  const runner = createBackgroundTasks({
    store,
    keys,
    settings: { maxAutoTasks: 3 },
    qualification: () => validateQualification(privatemodeReport()),
    stopped: () => false,
    ensureAllowance: async () => {},
    spendAllows: async () => true,
    claimSlot: () => () => {},
    search,
    takeSearch: () => true,
    giveBackSearch: () => {},
    model,
    cacheSalt: () => "s".repeat(64),
    log: () => {},
    now: () => clock,
  });

  const browser = await chromium.launch(browserLaunchOptions());
  const refused: string[] = [];
  try {
    const context = await browser.newContext({ locale: "en-US", timezoneId: "Europe/Berlin", viewport: { width: 1280, height: 900 } });
    context.setDefaultTimeout(15_000);
    const page = await context.newPage();
    await page.clock.install();
    page.on("pageerror", (error) => console.error("Browser:", error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) refused.push(`${response.request().method()} ${new URL(response.url()).pathname} ${response.status()}`);
    });
    await page.goto(origin, { timeout: 30_000 });
    const status = await page.evaluate(async () => (await fetch("/api/status")).json());
    expect(status.backgroundTasks).toMatchObject({ maxAutoTasks: 3, minIntervalHours: 24 });

    const menu = page.locator(".conversation-menu");
    const panel = page.locator("dialog.scheduled-dialog");
    const form = page.locator("dialog.scheduled-form-dialog");
    await unlock(page);
    await page.getByRole("button", { name: s.menu, exact: true }).click();
    await ui(panel.getByRole("heading", { name: s.title, exact: true })).toBeVisible();
    await panel.getByRole("group", { name: s.tabs }).getByRole("button", { name: s.templates, exact: true }).click();
    await panel.getByRole("button", { name: `${s.useTemplate}: ${s.templateJobsName}` }).click();
    await ui(form.getByRole("radio", { name: new RegExp(s.modeAuto) })).toBeChecked();
    await form.getByLabel(s.attach).setInputFiles({ name: "cv.txt", mimeType: "text/plain", buffer: Buffer.from(CV) });
    // The CV is read and attached on this device before the task is created.
    await ui(form.getByText("cv.txt", { exact: false })).toBeVisible();
    // No consent boxes (owner, 18 November): the acceptance at sign-up covers background tasks.
    await ui(form.getByLabel(s.autoConsent)).toHaveCount(0);
    const posted = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/background-tasks" && r.request().method() === "POST");
    await form.getByRole("button", { name: s.create }).click();
    expect((await posted).status()).toBe(200);
    await ui(form).toHaveCount(0);
    const row = panel.locator(".scheduled-list > li").filter({ hasText: s.templateJobsName });
    await ui(row.locator(".background-badge")).toBeVisible();
    await ui(panel.getByText(s.created)).toBeVisible();
    // The server copy: one task, sealed; the CV's email never reached the server.
    expect(store.taskRows.size).toBe(1);
    const [stored] = store.taskRows.values();
    expect(JSON.stringify(stored)).not.toContain("Anna");
    const ACCOUNT = "local-development";
    // Edit (PATCH): a new name and the in-app notice off; the server's copy and the list follow.
    await row.getByRole("button", { name: s.edit }).click();
    await form.getByLabel(s.name, { exact: true }).fill("Synthetic job search");
    await form.locator("summary", { hasText: s.advanced }).click();
    await form.getByLabel(s.notifyInApp).uncheck();
    // The name still says CV: the record says sensitive, filled in by the app without a consent box (owner, 18 November).
    const patched = page.waitForResponse((r) => r.request().method() === "PATCH");
    await form.getByRole("button", { name: s.save }).click();
    expect((await patched).status()).toBe(200);
    expect((await patched).request().postDataJSON()).toMatchObject({ notify: { inApp: false }, consent: { sensitive: true } });
    expect(store.taskRows.get(stored.taskId)?.consent.sensitive).toBe(true);
    await ui(form).toHaveCount(0);
    expect((await runner.list(ACCOUNT))[0]).toMatchObject({ name: "Synthetic job search", notify: { inApp: false } });
    const renamed = panel.locator(".scheduled-list > li").filter({ hasText: "Synthetic job search" });
    // Pause and resume reach the server.
    await renamed.getByRole("button", { name: s.pause }).click();
    await ui(renamed.getByRole("button", { name: s.resume })).toBeVisible();
    expect(store.taskRows.get(stored.taskId)?.paused).toBe(true);
    await renamed.getByRole("button", { name: s.resume }).click();
    await ui(renamed.getByRole("button", { name: s.pause })).toBeVisible();
    expect(store.taskRows.get(stored.taskId)?.paused).toBe(false);
    await panel.getByRole("button", { name: s.close }).click();

    // The run, on the server, a day later: the approved search, one model request with the masked CV.
    clock = store.taskRows.get(stored.taskId)!.runAfter + 1;
    await runner.tick();
    expect(calls).toHaveLength(1);
    expect(calls[0].messages[1].content).toContain("{{EMAIL-1}}");
    expect(calls[0].messages[1].content).not.toContain(EMAIL);
    expect(searched).toHaveLength(1);
    expect(store.resultRows.size).toBe(1);

    // The app's five-minute poll fetches it, saves it as a conversation, then acknowledges it.
    await page.clock.fastForward("05:05");
    await ui.poll(() => store.resultRows.size).toBe(0);
    await ui(page.getByText(s.resultSaved(1))).toBeVisible();
    const saved = page.getByRole("button", { name: s.resultTitle("Synthetic job search") });
    await ui(saved).toBeVisible();
    await saved.click();
    // The email the device masked is back in the saved answer, as chat does for its own answers.
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText(`Apply from ${EMAIL}.`);
    await ui(answer).not.toContainText("{{EMAIL-1}}");
    // The run's web results are not kept: the offer's address is in the answer (model links show
    // as "title (address)", never clickable), with no "sources unavailable" note under it.
    expect(calls[0].messages[0].content).toContain("Markdown link");
    await ui(answer).toContainText("Synthetic offer (https://jobs.example.test/1)");
    await ui(answer).not.toContainText(a.sourcesUnrecorded);

    // Deleting the task deletes the server copy.
    await page.getByRole("button", { name: s.menuBackground, exact: true }).click();
    await panel.locator(".scheduled-list > li").filter({ hasText: "Synthetic job search" }).getByRole("button", { name: s.delete }).click();
    await page.locator("dialog.confirm-dialog").getByRole("button", { name: s.delete }).click();
    await ui(panel.getByText(s.deleted)).toBeVisible();
    expect(store.taskRows.size).toBe(0);
    await ui(panel.getByText(s.emptyTitle)).toBeVisible();
    expect(refused).toEqual([]);
    void menu;
  } finally {
    delete process.env.VITE_SCHEDULED;
    await browser.close();
    await vite.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(folder, { recursive: true, force: true });
  }
  expect(BACKGROUND_LIMITS.attachmentCharacters).toBe(30_000);
}, 120_000);

async function unlock(page: Page) {
  const menu = page.locator(".conversation-menu");
  if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
  await menu.getByRole("button", { name: a.renameSave }).click();
  await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic wiring passphrase");
  await page.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
  if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
  await menu.getByRole("button", { name: a.tabConversation, exact: true }).click();
}
