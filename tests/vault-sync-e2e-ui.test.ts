// End-to-end encrypted sync in the real app against the real server routes, with no fake: the
// Express app (server/app.ts) with inference.vaultSync and the memory sync store, the client from
// Vite in middleware mode on the same random port, and several Chromium contexts signed in to the
// SAME synthetic account act as separate devices (docs/vault-sync-screens-20261115.md, section 8).
// The signed-in session is simulated: res.locals.accountId comes from a test cookie, which is how
// the session middleware of server/app.ts receives it from the real sign-in. Synthetic data only;
// nothing reaches a provider (inference is not configured, and every other origin is aborted).
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as playwrightExpect, type Browser, type Page } from "@playwright/test";
import { createServer as createVite, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { createApp } from "../server/app";
import { MemorySyncStore } from "../server/vault-sync";
import { appText } from "../src/text/app";
import { syncText, vaultUnlockText } from "../src/text/sync";
import { syncHardeningText } from "../src/text/sync-hardening";

const h = syncHardeningText.en;
import { memoryText } from "../src/text/memory";
import { projectText } from "../src/text/projects";
import { workspaceText } from "../src/text/workspace";
import { answerQuestions } from "./fixtures/app-questions";

// Generous waits: PBKDF2 and several browsers at once are slow on a busy machine; nothing here polls a clock.
const ui = playwrightExpect.configure({ timeout: 20_000 });
const PASS = "synthetic sync e2e passphrase";
let vite: ViteDevServer;
let browser: Browser;
const servers: Server[] = [];

beforeAll(async () => {
  process.env.VITE_MEMORY = "1";
  process.env.VITE_PROJECTS = "1";
  vite = await createVite({
    configFile: false,
    logLevel: "silent",
    appType: "spa",
    cacheDir: "node_modules/.vite-vault-sync-e2e-test",
    plugins: [
      {
        name: "no-provider",
        enforce: "pre",
        load(id) {
          // No chat is sent in this test; the stub keeps the provider client out of the page.
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts"))
            return `export async function streamReply(c,q,csrf,signal,chunk){ chunk("Synthetic answer."); return { input: 1, output: 1, total: 2, estimatedUSD: 0 }; }`;
        },
      },
    ],
    server: { middlewareMode: true, hmr: false },
    worker: { format: "es" },
  });
  await warmDevServer(vite);
  await vite.warmupRequest("/src/vault.ts");
  await vite.waitForRequestsIdle();
  browser = await chromium.launch(browserLaunchOptions());
}, 180_000);

afterAll(async () => {
  delete process.env.VITE_MEMORY;
  delete process.env.VITE_PROJECTS;
  await browser?.close();
  for (const server of servers) await new Promise((resolve) => server.close(resolve));
  await vite?.close();
});

/** One deployment on a random port: /api and /auth go to the real app, the rest to Vite. */
async function site(sync: boolean) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const app = createApp({
    origin,
    dev: true,
    ...(sync ? { vaultSync: { quotaBytes: 200 * 1024 * 1024, maxDevices: 5, store: new MemorySyncStore() } } : {}),
  });
  const counts = { sync: 0 };
  server.on("request", (req, res) => {
    const path = req.url ?? "/";
    if (path.startsWith("/api/sync")) counts.sync++;
    if (path.startsWith("/api/") || path.startsWith("/auth")) {
      const account = /(?:^|;\s*)test-account=([a-f0-9-]{36})/.exec(req.headers.cookie ?? "")?.[1];
      (res as unknown as { locals: object }).locals = account ? { accountId: account, accessEpoch: "synthetic" } : {};
      return app(req, res);
    }
    vite.middlewares(req, res);
  });
  return { origin, counts };
}
type Site = Awaited<ReturnType<typeof site>>;

async function device(s: Site, account: string | undefined, lang: "en" | "de" = "en", width = 1280) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    hasTouch: width < 760,
    acceptDownloads: true,
  });
  context.setDefaultTimeout(20_000);
  if (account) await context.addCookies([{ name: "test-account", value: account, url: s.origin }]);
  // The session exists before the page loads, as after a real sign-in. Without it, two first
  // /api/status calls of a cookieless page can open two sessions, and the page keeps one's CSRF
  // token and the other's cookie until the next status poll (reported; not a sync matter).
  await context.request.get(`${s.origin}/api/status`);
  const page = await context.newPage();
  await answerQuestions(page);
  await page.route("**/*", (route) => (new URL(route.request().url()).origin === s.origin ? route.continue() : route.abort()));
  await page.goto(s.origin, { timeout: 90_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}

async function menuItem(page: Page, name: string) {
  const menu = page.locator(".conversation-menu");
  if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
  await menu.getByRole("button", { name, exact: true }).click();
}
const settings = (page: Page) => page.locator("dialog.settings-dialog");
async function openSettings(page: Page, lang: "en" | "de", section: string) {
  await menuItem(page, appText[lang].settings);
  await settings(page).getByRole("button", { name: section, exact: true }).click();
}
const closeSettings = (page: Page, lang: "en" | "de") => settings(page).getByRole("button", { name: appText[lang].closeSettings }).click();
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

/** A passphrase vault with a chat, a memory and a project with instructions, written as the app writes them. */
async function seed(page: Page, account: string, data: Data) {
  await page.evaluate(
    async ({ account, passphrase, data }) => {
      const load = (path: string) => new Function("p", "return import(p)")(path);
      const { Vault } = (await load("/src/vault.ts")) as typeof import("../src/vault");
      const { emptyConversation } = (await load("/shared/contracts.ts")) as typeof import("../shared/contracts");
      const { newMessage } = (await load("/src/conversation.ts")) as typeof import("../src/conversation");
      const store = new Vault();
      store.selectAccount(account);
      await store.unlock(passphrase);
      await store.save({ ...emptyConversation(), title: data.chat, messages: [newMessage("user", "Synthetic question for sync.")] });
      await store.writeMemories(() => [{ id: crypto.randomUUID(), text: data.memory, at: new Date().toISOString() }]);
      await store.changeProjects(() => [{ id: crypto.randomUUID(), name: data.project, instructions: data.instructions }]);
      store.close(false);
    },
    { account, passphrase: PASS, data },
  );
}
type Data = { chat: string; memory: string; project: string; instructions: string };
const DATA: Data = {
  chat: "SYNTHETIC SYNC CHAT",
  memory: "SYNTHETIC SYNC MEMORY",
  project: "SYNTHETIC PROJECT",
  instructions: "SYNTHETIC PROJECT INSTRUCTIONS",
};

/** The chat in Saved, the memory in Settings and the project with its instructions, as the user sees them. */
async function expectData(page: Page, lang: "en" | "de", data: Data, chat = data.chat) {
  await menuItem(page, appText[lang].renameSave);
  await ui(page.getByRole("article", { name: chat })).toBeVisible();
  await openSettings(page, lang, memoryText[lang].title);
  await ui(settings(page).getByText(data.memory, { exact: true })).toBeVisible();
  await closeSettings(page, lang);
  const openNavigation = page.getByRole("button", { name: appText[lang].openNavigation });
  if (await openNavigation.isVisible()) await openNavigation.click();
  await page.getByLabel(workspaceText[lang].projectActions(data.project)).click();
  await page.getByRole("button", { name: projectText[lang].open, exact: true }).click();
  await ui(page.getByRole("textbox", { name: projectText[lang].instructions, exact: true })).toHaveValue(data.instructions);
  await page.keyboard.press("Escape");
}

/** (a) and (b): A turns sync on with the recovery key; B is approved by code and opens with A's data. */
async function turnOnAndPair(s: Site, account: string, lang: "en" | "de", width: number) {
  const a = appText[lang];
  const t = syncText[lang];
  const A = await device(s, account, lang, width);
  await seed(A, account, DATA);
  await menuItem(A, a.renameSave);
  await A.getByLabel(a.passphrase, { exact: true }).fill(PASS);
  await A.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(A.getByRole("article", { name: DATA.chat })).toBeVisible();
  await openSettings(A, lang, t.section);
  await settings(A).getByRole("button", { name: t.turnOn }).click();
  await settings(A).getByLabel(t.deviceName).fill("Laptop");
  await settings(A).getByRole("button", { name: t.continue }).click();
  const groups = settings(A).getByRole("list", { name: t.keyGroups(7) });
  await ui(groups.getByRole("listitem")).toHaveCount(7);
  const key = (await groups.locator("span[aria-hidden]").allTextContents()).join("-");
  expect(key).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/);
  await settings(A).getByRole("button", { name: t.saved }).click();
  await settings(A).getByLabel(t.confirmLabel).fill(key.slice(-4).toLowerCase());
  await settings(A).getByRole("button", { name: t.confirmButton }).click();
  await ui(settings(A).getByText(t.onDone).first()).toBeVisible();
  await ui(settings(A).locator(".sync-devices").getByRole("listitem").filter({ hasText: "Laptop" })).toContainText(t.thisDevice);
  await ui(settings(A).getByText(t.pending(0))).toBeVisible();
  await noSidewaysScroll(A);
  await closeSettings(A, lang);

  const B = await device(s, account, lang, width);
  const welcome = B.getByRole("dialog", { name: t.newHeading });
  await ui(welcome).toBeVisible();
  await welcome.getByRole("button", { name: t.approveFromOther }).click();
  const code = ((await welcome.locator(".pairing-code [aria-hidden]").textContent()) ?? "").replace(/[\s-]/g, "");
  expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
  await noSidewaysScroll(B);
  // A's quiet notice appears by itself (the engine checks every 10 seconds); the user opens it.
  const prompt = A.getByRole("region", { name: t.promptHeading });
  await ui(prompt.getByRole("button", { name: t.reviewRequest })).toBeVisible({ timeout: 25_000 });
  await prompt.getByRole("button", { name: t.reviewRequest }).click();
  await prompt.getByRole("checkbox", { name: t.holdingLabel }).check();
  await prompt.getByLabel(t.promptCode).fill(code);
  await prompt.getByLabel(t.promptName).fill("Phone");
  await prompt.getByRole("button", { name: t.approve }).click();
  await ui(prompt.getByText(t.approvedOther)).toBeVisible();
  await ui(A.getByRole("region", { name: t.deviceAddedHeading })).toContainText("Phone");
  await ui(welcome).toHaveCount(0, { timeout: 25_000 });
  await ui(B.getByRole("article", { name: DATA.chat })).toBeVisible({ timeout: 25_000 });
  await ui(B.getByRole("heading", { name: vaultUnlockText[lang].newDeviceHeading })).toHaveCount(0);
  await noSidewaysScroll(B);
  return { A, B, key };
}

it("375 px, German: turn on sync and approve a second device with the real engine and server", async () => {
  const s = await site(true);
  const { A, B } = await turnOnAndPair(s, randomUUID(), "de", 375);
  await expectData(B, "de", DATA);
  for (const page of [A, B]) await page.context().close();
}, 240_000);

it("1280 px, English: setup, pairing, edits both ways, recovery key on a third device, forgotten passphrase, reload, revoke", async () => {
  const s = await site(true);
  const account = randomUUID();
  const a = appText.en;
  const t = syncText.en;
  const v = vaultUnlockText.en;
  const { A, B, key } = await turnOnAndPair(s, account, "en", 1280);
  // (b) B shows A's chat, memory and project with its instructions.
  await expectData(B, "en", DATA);

  // (c) Edits on B (a renamed chat, a new memory) appear on A after Sync now.
  await menuItem(B, a.renameSave);
  await B.getByRole("article", { name: DATA.chat }).getByRole("button").first().click();
  await menuItem(B, a.renameSave);
  await B.getByLabel(a.titleLabel).fill("SYNTHETIC CHAT RENAMED ON B");
  await B.getByRole("button", { name: a.saveSnapshot }).click();
  await ui(B.getByRole("article", { name: "SYNTHETIC CHAT RENAMED ON B" })).toBeVisible();
  await openSettings(B, "en", memoryText.en.title);
  await settings(B).getByLabel(memoryText.en.addLabel).fill("SYNTHETIC MEMORY FROM B");
  await settings(B).getByRole("button", { name: memoryText.en.add, exact: true }).click();
  await ui(settings(B).getByText("SYNTHETIC MEMORY FROM B", { exact: true })).toBeVisible();
  await settings(B).getByRole("button", { name: t.section, exact: true }).click();
  await settings(B).getByRole("button", { name: t.syncNow }).click();
  await ui(settings(B).getByText(t.pending(0))).toBeVisible();
  await closeSettings(B, "en");
  // A syncs on focus (as on every visit); B's push may still be on its way, so try again until it lands.
  await openSettings(A, "en", memoryText.en.title);
  await ui(async () => {
    await A.evaluate(() => window.dispatchEvent(new Event("focus")));
    await ui(settings(A).getByText("SYNTHETIC MEMORY FROM B", { exact: true })).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await closeSettings(A, "en");
  await menuItem(A, a.renameSave);
  await ui(A.getByRole("article", { name: "SYNTHETIC CHAT RENAMED ON B" })).toBeVisible();
  const renamed = { ...DATA, chat: "SYNTHETIC CHAT RENAMED ON B" };

  // (d) C: the recovery key, first with one wrong character (the hint shows), then right.
  const C = await device(s, account);
  const welcome = C.getByRole("dialog", { name: t.newHeading });
  await welcome.getByRole("button", { name: t.useRecovery }).click();
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const typo = alphabet[(alphabet.indexOf(key[0]) + 1) % 32] + key.slice(1);
  await welcome.getByLabel(t.recoveryLabel).fill(typo);
  await ui(welcome.getByText(t.hintTypo)).toBeVisible();
  await welcome.getByRole("button", { name: t.unlock }).click();
  await ui(welcome.getByText(t.wrongKey)).toBeVisible();
  await welcome.getByLabel(t.recoveryLabel).fill(key.replaceAll("-", " ").toLowerCase());
  await ui(welcome.getByText(t.hintOk)).toBeVisible();
  await welcome.getByLabel(t.deviceName).fill("Tablet");
  // Not remembered: a local passphrase is asked for (VS-5); a reload then asks for it.
  await welcome.getByRole("checkbox", { name: v.rememberLabel }).uncheck();
  await welcome.getByRole("button", { name: t.unlock }).click();
  await ui(welcome).toHaveCount(0, { timeout: 25_000 });
  const local = C.getByRole("dialog", { name: v.newPassphraseHeading });
  await ui(local.getByText(t.localPassphraseNotRemembered)).toBeVisible();
  await local.getByLabel(v.newPassphrase).fill("synthetic local passphrase C");
  await local.getByRole("button", { name: v.newPassphraseSave }).click();
  await ui(C.getByText(v.newPassphraseDone).first()).toBeVisible();
  await expectData(C, "en", renamed);
  await C.reload();
  await menuItem(C, a.renameSave);
  await ui(C.getByLabel(a.passphrase, { exact: true })).toBeVisible();
  await ui(C.getByRole("button", { name: v.openRemembered })).toHaveCount(0);
  await ui(C.getByRole("article", { name: renamed.chat })).toHaveCount(0);
  // The local passphrase with "Remember this device" ticked: remembered for sync from then on.
  await C.getByLabel(a.passphrase, { exact: true }).fill("synthetic local passphrase C");
  await C.getByRole("checkbox", { name: v.rememberLabel }).check();
  await C.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(C.getByRole("article", { name: renamed.chat })).toBeVisible();
  await ui(C.getByText(a.vaultUnlocked).first()).toBeVisible();
  await C.reload();
  await menuItem(C, a.renameSave);
  await ui(C.getByRole("article", { name: renamed.chat })).toBeVisible({ timeout: 25_000 });
  await ui(C.locator(".sync-indicator")).toHaveText(t.stateSynced, { timeout: 25_000 });

  // (e) A locks, forgot the passphrase: recovery key, a new passphrase, all data, and it unlocks after a lock.
  await menuItem(A, a.renameSave);
  await A.getByRole("button", { name: a.lockAndClear }).click();
  await A.getByRole("button", { name: v.forgotLink }).click();
  const forgot = A.locator(".forgot-passphrase");
  await ui(forgot.getByText(v.forgotWithSync)).toBeVisible();
  await forgot.getByLabel(t.recoveryLabel).fill(key);
  await forgot.getByRole("button", { name: t.unlock }).click();
  await ui(A.getByText(t.recovered)).toBeVisible();
  await A.getByLabel(v.newPassphrase, { exact: true }).fill("synthetic new local passphrase");
  await A.getByRole("button", { name: v.newPassphraseSave }).click();
  await ui(A.getByRole("article", { name: renamed.chat })).toBeVisible();
  await expectData(A, "en", renamed);
  await menuItem(A, a.renameSave);
  await A.getByRole("button", { name: a.lockAndClear }).click();
  await A.getByLabel(a.passphrase, { exact: true }).fill("synthetic new local passphrase");
  await A.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(A.getByRole("article", { name: renamed.chat })).toBeVisible();

  // (g) A remembered device: a reload opens it without the passphrase, still syncing.
  await A.reload();
  await menuItem(A, a.renameSave);
  await ui(A.getByRole("article", { name: renamed.chat })).toBeVisible({ timeout: 25_000 });
  await ui(A.locator(".sync-indicator")).toHaveText(t.stateSynced, { timeout: 25_000 });
  // After a lock, "Open saved chats" opens it with the device key (so it still syncs, not "Locked").
  await A.getByRole("button", { name: a.lockAndClear }).click();
  await A.getByRole("button", { name: v.openRemembered }).click();
  await ui(A.getByRole("article", { name: renamed.chat })).toBeVisible();
  await A.evaluate(() => window.dispatchEvent(new Event("focus")));
  await ui(A.locator(".sync-indicator")).toHaveText(t.stateSynced, { timeout: 25_000 });

  // (f) A removes B; B's next sync says so, keeps its data open, and is not asked to join as new.
  await openSettings(A, "en", t.section);
  await settings(A).getByRole("button", { name: t.revoke("Phone") }).click();
  await A.getByRole("dialog", { name: t.revokeTitle("Phone") }).getByRole("button", { name: t.revokeConfirm }).click();
  await ui(settings(A).locator(".sync-devices").getByRole("listitem").filter({ hasText: "Phone" })).toContainText(t.revoked);
  await closeSettings(A, "en");
  await B.evaluate(() => window.dispatchEvent(new Event("focus")));
  await ui(B.locator(".sync-indicator")).toHaveText(t.stateApproval, { timeout: 25_000 });
  await openSettings(B, "en", t.section);
  await ui(settings(B).getByText(h.detachedRemoved)).toBeVisible();
  await ui(settings(B).getByRole("button", { name: h.syncAgain })).toBeVisible();
  await closeSettings(B, "en");
  await ui(B.getByRole("dialog", { name: t.newHeading })).toHaveCount(0);
  await menuItem(B, a.renameSave);
  await ui(B.getByRole("article", { name: renamed.chat })).toBeVisible();

  // Delete everything on C, without the synced copy: C leaves sync, A keeps syncing and lists C as removed.
  await menuItem(C, a.renameSave);
  await C.getByRole("button", { name: a.deleteAll, exact: true }).click();
  const erase = C.getByRole("dialog", { name: a.deleteAll });
  await ui(erase.getByRole("checkbox", { name: t.alsoDeleteSynced })).not.toBeChecked();
  await erase.getByRole("button", { name: a.deleteAll }).click();
  await ui(C.getByText(a.erased).first()).toBeVisible();
  await ui(C.getByRole("dialog", { name: t.newHeading })).toBeVisible({ timeout: 25_000 });
  await openSettings(A, "en", t.section);
  await settings(A).getByRole("button", { name: t.syncNow }).click();
  await ui(settings(A).locator(".sync-devices").getByRole("listitem").filter({ hasText: "Tablet" })).toContainText(t.revoked);
  await ui(settings(A).locator(".sync-error")).toHaveCount(0);
  for (const page of [A, B, C]) await page.context().close();
}, 420_000);

it("1280 px, English: A resets sync; B says it was reset elsewhere and still opens its data, also after a reload", async () => {
  const s = await site(true);
  const account = randomUUID();
  const a = appText.en;
  const t = syncText.en;
  const { A, B } = await turnOnAndPair(s, account, "en", 1280);
  await openSettings(A, "en", t.section);
  await settings(A).getByRole("button", { name: t.reset }).click();
  const reset = A.getByRole("dialog", { name: t.resetTitle });
  await reset.getByLabel(t.resetTypeLabel(t.resetPhrase)).fill(t.resetPhrase);
  await reset.getByRole("button", { name: t.resetConfirm }).click();
  await ui(settings(A).getByText(t.resetDone).first()).toBeVisible();
  await closeSettings(A, "en");
  await B.evaluate(() => window.dispatchEvent(new Event("focus")));
  await ui(B.locator(".sync-indicator")).toHaveText(t.stateApproval, { timeout: 25_000 });
  await openSettings(B, "en", t.section);
  await ui(settings(B).getByText(h.detachedResetElsewhere)).toBeVisible();
  await ui(settings(B).locator(".sync-settings .danger-button")).toHaveCount(0);
  await closeSettings(B, "en");
  await menuItem(B, a.renameSave);
  await ui(B.getByRole("article", { name: DATA.chat })).toBeVisible();
  await B.reload();
  await menuItem(B, a.renameSave);
  await ui(B.getByRole("article", { name: DATA.chat })).toBeVisible({ timeout: 25_000 });
  await ui(B.getByRole("dialog", { name: t.newHeading })).toHaveCount(0);
  for (const page of [A, B]) await page.context().close();
}, 240_000);

it("Stage 0: a vault remembered without sync, then sync turned on, opens after a reload through the device key", async () => {
  const s = await site(true);
  const account = randomUUID();
  const a = appText.en;
  const t = syncText.en;
  const D = await device(s, account);
  await seed(D, account, DATA);
  await menuItem(D, a.renameSave);
  await D.getByLabel(a.passphrase, { exact: true }).fill(PASS);
  await D.getByRole("checkbox", { name: vaultUnlockText.en.rememberLabel }).check();
  await D.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(D.getByRole("article", { name: DATA.chat })).toBeVisible();
  await D.reload();
  await menuItem(D, a.renameSave);
  await ui(D.getByRole("article", { name: DATA.chat })).toBeVisible();
  await openSettings(D, "en", t.section);
  await settings(D).getByRole("button", { name: t.turnOn }).click();
  await settings(D).getByRole("button", { name: t.continue }).click();
  const groups = settings(D).getByRole("list", { name: t.keyGroups(7) });
  await ui(groups.getByRole("listitem")).toHaveCount(7);
  const last = (await groups.locator("span[aria-hidden]").allTextContents()).at(-1)!;
  await settings(D).getByRole("button", { name: t.saved }).click();
  await settings(D).getByLabel(t.confirmLabel).fill(last);
  await settings(D).getByRole("button", { name: t.confirmButton }).click();
  await ui(settings(D).getByText(t.onDone).first()).toBeVisible();
  await closeSettings(D, "en");
  await D.reload();
  await menuItem(D, a.renameSave);
  await ui(D.getByRole("article", { name: DATA.chat })).toBeVisible({ timeout: 25_000 });
  // Opened with the account key: sync runs (not "Locked"), and no unlock error was shown.
  await ui(D.locator(".sync-indicator")).toHaveText(t.stateSynced, { timeout: 25_000 });
  await ui(D.getByText(a.unlockFailed)).toHaveCount(0);

  // Locked and the passphrase forgotten: the last resort deletes this device's data (not the synced copy).
  const v = vaultUnlockText.en;
  await D.getByRole("button", { name: a.lockAndClear }).click();
  await D.getByRole("button", { name: v.forgotLink }).click();
  await ui(D.locator(".forgot-passphrase").getByText(v.forgotWithSync)).toBeVisible();
  await D.getByRole("button", { name: v.resetButton }).click();
  const reset = D.getByRole("dialog", { name: v.resetTitle });
  await ui(reset.getByRole("checkbox", { name: t.alsoDeleteSynced })).not.toBeChecked();
  await reset.getByLabel(v.resetTypeLabel(v.resetWord)).fill(v.resetWord);
  await reset.getByRole("button", { name: v.resetConfirm }).click();
  await ui(D.getByText(v.resetDone)).toBeVisible();
  // The synced copy stays, so this browser is now a new device of the account.
  await ui(D.getByRole("dialog", { name: t.newHeading })).toBeVisible({ timeout: 25_000 });
  await D.context().close();
}, 240_000);

it("switch absent: no request to /api/sync and no database before the user creates a vault", async () => {
  const s = await site(false);
  const account = randomUUID();
  const a = appText.en;
  const page = await device(s, account);
  const status = await page.evaluate(() => fetch("/api/status").then((r) => r.json()));
  expect(status.accountId).toBe(account);
  expect(status).not.toHaveProperty("vaultSync");
  await menuItem(page, a.renameSave);
  await ui(page.getByRole("heading", { name: vaultUnlockText.en.newDeviceHeading })).toBeVisible();
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toEqual([]);
  await page.getByLabel(a.passphrase, { exact: true }).fill(PASS);
  await page.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
  await page.reload();
  await menuItem(page, a.renameSave);
  await ui(page.getByLabel(a.passphrase, { exact: true })).toBeVisible();
  await ui(page.locator(".sync-indicator")).toHaveCount(0);
  expect(s.counts.sync).toBe(0);
  await page.context().close();
}, 120_000);
