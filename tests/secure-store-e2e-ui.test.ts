// Secure mode in the real app against the real server routes, with no fake store: the Express app
// (server/app.ts) with inference.secureStore (and, where said, the encrypted sync with files), the
// client from Vite in middleware mode on the same random port, and several Chromium contexts signed
// in to the SAME synthetic account as separate devices (style of tests/vault-sync-e2e-ui.test.ts).
// The signed-in session is simulated by a test cookie. The only patched answer is the `inference`
// field of /api/status (no provider is configured) and the provider client (a stub that answers
// "Synthetic answer."). Synthetic data only; every other origin is aborted.
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as playwrightExpect, type Browser, type Page } from "@playwright/test";
import { createServer as createVite, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { createApp } from "../server/app";
import { ephemeralCustodyMaster } from "../server/custody";
import { MemorySecureStore } from "../server/secure-store";
import { MemorySyncStore } from "../server/vault-sync";
import { MemoryBlobStore } from "../server/vault-sync-blobs";
import { appText } from "../src/text/app";
import { memoryText } from "../src/text/memory";
import { modesText } from "../src/text/modes";
import { secureStoreText } from "../src/text/secure-store";
import { syncText, vaultUnlockText } from "../src/text/sync";
import { workspaceText } from "../src/text/workspace";

const ui = playwrightExpect.configure({ timeout: 20_000 });
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
    cacheDir: "node_modules/.vite-secure-store-e2e-test",
    plugins: [
      {
        name: "no-provider",
        enforce: "pre",
        load(id) {
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
async function site(o: { secure: boolean; sync: boolean }) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const stores = { secure: new MemorySecureStore(), sync: new MemorySyncStore() };
  const app = createApp({
    origin,
    dev: true,
    ...(o.sync
      ? { vaultSync: { quotaBytes: 200 * 1024 * 1024, maxDevices: 5, store: stores.sync, blobs: { quotaBytes: 1024 * 1024 * 1024, maxFileBytes: 10 * 1024 * 1024, store: new MemoryBlobStore() } } }
      : {}),
    ...(o.secure
      ? { secureStore: { quotaBytes: 200 * 1024 * 1024, filesQuotaBytes: 1024 * 1024 * 1024, master: ephemeralCustodyMaster(), store: stores.secure, blobs: new MemoryBlobStore() } }
      : {}),
  });
  const counts = { secure: 0, sync: 0 };
  server.on("request", (req, res) => {
    const path = req.url ?? "/";
    if (path.startsWith("/api/secure")) counts.secure++;
    if (path.startsWith("/api/sync")) counts.sync++;
    if (path.startsWith("/api/") || path.startsWith("/auth")) {
      const account = /(?:^|;\s*)test-account=([a-f0-9-]{36})/.exec(req.headers.cookie ?? "")?.[1];
      (res as unknown as { locals: object }).locals = account ? { accountId: account, accessEpoch: "synthetic" } : {};
      return app(req, res);
    }
    vite.middlewares(req, res);
  });
  return { origin, counts, stores };
}
type Site = Awaited<ReturnType<typeof site>>;

async function device(s: Site, account: string, lang: "en" | "de" = "en", width = 1280) {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: width < 700 ? 812 : 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(20_000);
  await context.addCookies([{ name: "test-account", value: account, url: s.origin }]);
  await context.request.get(`${s.origin}/api/status`);
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== s.origin) return route.abort();
    // The real status, with chat marked ready (no provider is configured in this test).
    if (url.pathname === "/api/status") {
      const real = await route.fetch();
      if (!real.ok()) return route.fulfill({ response: real });
      return route.fulfill({ response: real, json: { ...(await real.json()), inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 100000 } }, search: false } });
    }
    // Sign-out of the simulated session: the app's own steps run, then the page leaves.
    if (url.pathname === "/auth/logout") return route.fulfill({ status: 200, body: "" });
    if (url.pathname === "/auth") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>signed out</title>" });
    return route.continue();
  });
  await page.goto(s.origin, { timeout: 90_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}
const databases = (page: Page) => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ""));
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function ask(page: Page, lang: "en" | "de", text: string) {
  const before = await page.locator(':text("Synthetic answer."):visible').count();
  await page.getByLabel(appText[lang].messageInput).fill(text);
  await page.getByRole("button", { name: appText[lang].sendLabel, exact: true }).click();
  await ui(page.locator(':text("Synthetic answer."):visible')).not.toHaveCount(before);
}
/** The saved chats and projects of the normal lists (Secure only), with the navigation opened first on a phone. */
async function navigation(page: Page, lang: "en" | "de") {
  const openNavigation = page.getByRole("button", { name: appText[lang].openNavigation });
  if (await openNavigation.isVisible()) await openNavigation.click();
  return page.locator(".navigation-history").locator(".chat-list-row, .project-row");
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
/** The Secure Max section of the sidebar. */
const maxSection = (page: Page) => page.getByRole("region", { name: modesText.en.maxLabel });
/** Opens the section from its one entry; the first time in this browser, the explanation is confirmed. */
async function openMax(page: Page, lang: "en" | "de" = "en") {
  const m = modesText[lang];
  if (!(await page.locator(".secure-max-entry").isVisible())) await navigation(page, lang);
  await page.locator(".secure-max-entry").click();
  const intro = page.getByRole("dialog", { name: m.maxIntroTitle });
  if (await intro.waitFor({ timeout: 3000 }).then(() => true, () => false)) {
    await intro.getByRole("checkbox", { name: m.maxUnderstand }).check();
    await intro.getByRole("button", { name: m.maxConfirm }).click();
  }
  await ui(maxSection(page)).toBeVisible();
  await ui(page.locator(".secure-max-entry")).toHaveCount(0);
}
async function memories(page: Page) {
  await openSettings(page, "en", memoryText.en.title);
  const texts = await settings(page).locator("li").allTextContents();
  await closeSettings(page, "en");
  return texts.join("\n");
}
const focus = (page: Page) => page.evaluate(() => void window.dispatchEvent(new Event("focus")));

it("1280 px, English: a chat saves by itself, a second device has everything after sign-in, edits travel, sign-out deletes the local copy, the Secure Max section stays locked and apart", async () => {
  const s = await site({ secure: true, sync: true });
  const account = randomUUID();
  const a = appText.en;
  const w = workspaceText.en;
  const st = secureStoreText.en;
  const t = syncText.en;
  const m = modesText.en;

  // A signs in and types. Nothing else: no passphrase, no dialog, no save button.
  const A = await device(s, account);
  await ui(A.getByText(st.captionSecure)).toBeVisible();
  await ui(A.getByRole("dialog")).toHaveCount(0);
  await ask(A, "en", "SYNTHETIC SECURE QUESTION");
  await ui((await navigation(A, "en")).filter({ hasText: "SYNTHETIC SECURE QUESTION" })).toBeVisible();
  // A memory and a project, both in Secure.
  await openSettings(A, "en", memoryText.en.title);
  await settings(A).getByLabel(memoryText.en.addLabel).fill("SYNTHETIC SECURE MEMORY");
  await settings(A).getByRole("button", { name: memoryText.en.add }).click();
  await ui(settings(A).getByText("SYNTHETIC SECURE MEMORY", { exact: true })).toBeVisible();
  await closeSettings(A, "en");
  await A.getByRole("button", { name: w.createProject }).click();
  await A.getByLabel(w.projectName).fill("SYNTHETIC SECURE PROJECT");
  await A.getByRole("button", { name: w.create, exact: true }).click();
  await ui((await navigation(A, "en")).filter({ hasText: "SYNTHETIC SECURE PROJECT" }).first()).toBeVisible();
  await focus(A); // sends what the 2-second timer has not sent yet
  await expect.poll(async () => (await s.stores.secure.usage(account)).cursor, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);

  // B signs in: the chat, the memory and the project are there. No passphrase, code or key anywhere.
  const B = await device(s, account);
  await ui((await navigation(B, "en")).filter({ hasText: "SYNTHETIC SECURE QUESTION" })).toBeVisible();
  await ui((await navigation(B, "en")).filter({ hasText: "SYNTHETIC SECURE PROJECT" }).first()).toBeVisible();
  await ui(B.getByRole("dialog")).toHaveCount(0);
  await ui(B.locator('input[type="password"]')).toHaveCount(0);
  await openSettings(B, "en", memoryText.en.title);
  await ui(settings(B).getByText("SYNTHETIC SECURE MEMORY", { exact: true })).toBeVisible();
  await closeSettings(B, "en");

  // An edit on B (a second question in the same chat) reaches A, where the chat is still open.
  await (await navigation(B, "en")).filter({ hasText: "SYNTHETIC SECURE QUESTION" }).getByRole("button").first().click();
  await ask(B, "en", "SECOND QUESTION FROM B");
  await focus(B);
  await expect
    .poll(
      async () => {
        await focus(A);
        return A.getByText("SECOND QUESTION FROM B").count();
      },
      { timeout: 30_000, interval: 1500 },
    )
    .toBeGreaterThan(0);
  expect(s.counts.secure).toBeGreaterThan(0);

  // Sign-out on B deletes its local Secure databases.
  expect((await databases(B)).filter((n) => n.startsWith("cometrow-secure")).sort()).toEqual([`cometrow-secure-${account}`, `cometrow-secure-sync-${account}`]);
  await B.locator("button", { hasText: w.signOut }).first().dispatchEvent("click");
  await B.waitForURL(/\/auth$/);
  expect((await databases(B)).filter((n) => n.startsWith("cometrow-secure"))).toEqual([]);
  await B.context().close();

  // Secure Max on A: the encrypted sync is set up with its recovery key, then a Secure Max chat.
  // The section is one entry until opened; Cancel on the first explanation returns to the normal sidebar.
  await ui(maxSection(A)).toHaveCount(0);
  await A.locator(".secure-max-entry").click();
  await A.getByRole("dialog", { name: m.maxIntroTitle }).getByRole("button", { name: m.cancel }).click();
  await ui(maxSection(A)).toHaveCount(0);
  await ui(A.locator(".secure-max-entry")).toBeFocused();
  await openMax(A);
  await maxSection(A).getByRole("button", { name: m.maxUnlock }).click();
  await A.getByLabel(a.passphrase, { exact: true }).fill("synthetic secure max passphrase");
  await A.getByRole("button", { name: a.createOrUnlock }).click();
  await ui(maxSection(A).getByRole("button", { name: m.maxNewChat })).toBeVisible();
  await openSettings(A, "en", t.section);
  await settings(A).getByRole("button", { name: t.turnOn }).click();
  await settings(A).getByLabel(t.deviceName).fill("Laptop");
  await settings(A).getByRole("button", { name: t.continue }).click();
  const groups = settings(A).getByRole("list", { name: t.keyGroups(7) });
  await ui(groups.getByRole("listitem")).toHaveCount(7);
  const key = (await groups.locator("span[aria-hidden]").allTextContents()).join("-");
  await settings(A).getByRole("button", { name: t.saved }).click();
  await settings(A).getByLabel(t.confirmLabel).fill(key.slice(-4).toLowerCase());
  await settings(A).getByRole("button", { name: t.confirmButton }).click();
  await ui(settings(A).getByText(t.onDone).first()).toBeVisible();
  await closeSettings(A, "en");
  // The section is unlocked on A now; a chat made inside it is a Secure Max chat.
  await maxSection(A).getByRole("button", { name: m.maxNewChat }).click();
  await ui(A.getByText(st.captionMax)).toBeVisible();
  await ask(A, "en", "SYNTHETIC MAX QUESTION");
  // A memory added while working in Secure Max is Secure Max's: the normal section never shows it.
  await openSettings(A, "en", memoryText.en.title);
  await settings(A).getByLabel(memoryText.en.addLabel).fill("SYNTHETIC MAX MEMORY");
  await settings(A).getByRole("button", { name: memoryText.en.add }).click();
  await ui(settings(A).getByText("SYNTHETIC MAX MEMORY", { exact: true })).toBeVisible();
  expect(await settings(A).getByText("SYNTHETIC SECURE MEMORY", { exact: true }).count()).toBe(0);
  await closeSettings(A, "en");
  // It is listed inside the section and nowhere else; the Secure chat is never inside the section.
  await ui(maxSection(A).getByText("SYNTHETIC MAX QUESTION")).toBeVisible();
  await ui((await navigation(A, "en")).filter({ hasText: "SYNTHETIC MAX QUESTION" })).toHaveCount(0);
  await ui(maxSection(A).getByText("SYNTHETIC SECURE QUESTION")).toHaveCount(0);
  const secureItems = (await s.stores.secure.usage(account)).cursor;
  await openSettings(A, "en", t.section);
  await settings(A).getByRole("button", { name: t.syncNow }).click();
  await expect.poll(async () => (await s.stores.sync.usage(account)).usedBytes, { timeout: 20_000 }).toBeGreaterThan(0);
  await closeSettings(A, "en");
  // The Secure Max chat went to the encrypted sync only: the Secure store got nothing new.
  expect((await s.stores.secure.usage(account)).cursor).toBe(secureItems);

  // A new device C: Secure is there at once; the Secure Max section is locked, without a title, until it is approved.
  const C = await device(s, account);
  await ui((await navigation(C, "en")).filter({ hasText: "SYNTHETIC SECURE QUESTION" })).toBeVisible();
  await ui(C.getByRole("dialog")).toHaveCount(0); // nothing is asked at sign-in
  await ui(C.getByRole("button", { name: m.maxLocked })).toBeVisible(); // the entry says it is locked
  expect(await memories(C)).not.toContain("SYNTHETIC MAX MEMORY");
  await openMax(C);
  await ui(maxSection(C).getByText(m.maxIsLocked)).toBeVisible();
  await ui(C.getByText("SYNTHETIC MAX QUESTION")).toHaveCount(0);
  await noSidewaysScroll(C);
  await maxSection(C).getByRole("button", { name: m.maxUnlock }).click();
  const welcome = C.getByRole("dialog", { name: t.newHeading });
  await welcome.getByRole("button", { name: t.approveFromOther }).click();
  const code = ((await welcome.locator(".pairing-code [aria-hidden]").textContent()) ?? "").replace(/[\s-]/g, "");
  const prompt = A.getByRole("region", { name: t.promptHeading });
  await ui(prompt.getByRole("button", { name: t.reviewRequest })).toBeVisible({ timeout: 25_000 });
  await prompt.getByRole("button", { name: t.reviewRequest }).click();
  await prompt.getByRole("checkbox", { name: t.holdingLabel }).check();
  await prompt.getByLabel(t.promptCode).fill(code);
  await prompt.getByLabel(t.promptName).fill("Phone");
  await prompt.getByRole("button", { name: t.approve }).click();
  await ui(welcome).toHaveCount(0, { timeout: 25_000 });
  await ui(maxSection(C).getByText("SYNTHETIC MAX QUESTION")).toBeVisible({ timeout: 25_000 });
  await ui(maxSection(C).getByText(m.maxIsLocked)).toHaveCount(0);
  await ui(maxSection(C).getByText("SYNTHETIC SECURE QUESTION")).toHaveCount(0);
  await ui((await navigation(C, "en")).filter({ hasText: "SYNTHETIC MAX QUESTION" })).toHaveCount(0);
  await C.context().close();

  // Lock now on A: the Secure Max titles and the open Secure Max chat go; what is typed next is saved nowhere.
  await maxSection(A).getByRole("button", { name: m.maxLockNow }).click();
  await ui(maxSection(A).getByText(m.maxIsLocked)).toBeVisible();
  await ui(A.getByText("SYNTHETIC MAX QUESTION")).toHaveCount(0);
  const before = { secure: (await s.stores.secure.usage(account)).cursor, sync: (await s.stores.sync.usage(account)).cursor };
  await ui(A.getByText(st.captionMaxLocked)).toBeVisible();
  await ask(A, "en", "TYPED WHILE LOCKED");
  await focus(A);
  await A.waitForTimeout(1500);
  expect({ secure: (await s.stores.secure.usage(account)).cursor, sync: (await s.stores.sync.usage(account)).cursor }).toEqual(before);
  await ui((await navigation(A, "en")).filter({ hasText: "TYPED WHILE LOCKED" })).toHaveCount(0);
  // Unlocking again on the same device (remembered for sync here) brings the chat back inside the section.
  await maxSection(A).getByRole("button", { name: m.maxUnlock }).click();
  await A.getByRole("button", { name: vaultUnlockText.en.openRemembered }).click();
  await ui(maxSection(A).getByText("SYNTHETIC MAX QUESTION")).toBeVisible();
  // Back in the normal section (New chat), Settings shows Secure's memory, never Secure Max's.
  await navigation(A, "en");
  await A.locator("button.new-chat:not(.new-incognito)").click();
  await ui(maxSection(A)).toHaveCount(0);
  const normal = await memories(A);
  expect(normal).toContain("SYNTHETIC SECURE MEMORY");
  expect(normal).not.toContain("SYNTHETIC MAX MEMORY");
  await A.context().close();
}, 300_000);

it("375 px, German: the Secure wiring fits a phone", async () => {
  const s = await site({ secure: true, sync: true });
  const account = randomUUID();
  const page = await device(s, account, "de", 375);
  await ui(page.getByText(secureStoreText.de.captionSecure)).toBeVisible();
  await noSidewaysScroll(page);
  await ask(page, "de", "SYNTHETISCHE FRAGE");
  await ui((await navigation(page, "de")).filter({ hasText: "SYNTHETISCHE FRAGE" })).toBeVisible();
  // The Secure Max section: one entry, then (after the explanation) the locked section with its unlock button.
  await ui(page.getByRole("button", { name: modesText.de.maxLocked })).toBeVisible();
  await openMax(page, "de");
  await ui(page.getByRole("region", { name: modesText.de.maxLabel }).getByRole("button", { name: modesText.de.maxUnlock })).toBeVisible();
  await noSidewaysScroll(page);
  await page.keyboard.press("Escape");
  await openSettings(page, "de", appText.de.sectionPrivacy);
  await ui(settings(page).getByText(modesText.de.secureLong)).toBeVisible();
  await noSidewaysScroll(page);
  await page.context().close();
}, 180_000);

it("768 px, English, the switch absent: no Secure request, no Secure database, the app as before", async () => {
  const s = await site({ secure: false, sync: false });
  const account = randomUUID();
  const page = await device(s, account, "en", 768);
  await ui(page.getByText(appText.en.captionTemporary)).toBeVisible();
  await ui(maxSection(page)).toHaveCount(0);
  await ui(page.locator(".secure-max-entry")).toHaveCount(0);
  await ask(page, "en", "SYNTHETIC QUESTION WITHOUT SECURE");
  // Not saved by itself: the old explicit save is the only way.
  await menuItem(page, appText.en.renameSave);
  await ui(page.getByLabel(appText.en.passphrase, { exact: true })).toBeVisible();
  await ui(page.getByRole("article", { name: "SYNTHETIC QUESTION WITHOUT SECURE" })).toHaveCount(0);
  expect(s.counts.secure).toBe(0);
  expect((await databases(page)).filter((n) => n.startsWith("cometrow-secure"))).toEqual([]);
  expect(await (await page.context().request.get(`${s.origin}/api/secure/key`)).status()).toBe(404);
  await noSidewaysScroll(page);
  await page.context().close();
}, 180_000);
