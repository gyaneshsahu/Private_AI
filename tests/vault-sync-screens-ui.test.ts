// Stage 0 vault fixes and the Devices and sync screens (docs/vault-sync-screens-20261115.md) in the
// actual app at 375, 768 and 1280 px, English and German. Offline: src/inference.ts and the sync
// engine (src/sync/index.ts) are replaced; the fake engine (tests/fixtures/sync-fake.js) asks this
// test for every answer through /__sync/*, so separate browser contexts act as separate devices of
// one fake account. Nothing reaches a real server.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { appText } from "../src/text/app";
import { vaultBackupText } from "../src/text/vault-ui";
import { backupPartsText, syncText, vaultUnlockText } from "../src/text/sync";
import { syncHardeningText } from "../src/text/sync-hardening";
import { decodeVaultBackupContent } from "../src/vault-backup";
import { encodeRecoveryKey } from "../src/sync/crypto";

// The engine's recovery key format (src/sync/crypto.ts): 28 Crockford base32 characters in 7 groups of 4.
const normalizeRecoveryKey = (key: string) => key.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
const recoveryKeyGroups = (key: string) => normalizeRecoveryKey(key).match(/.{1,4}/g) ?? [];
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const makeRecoveryKey = () => normalizeRecoveryKey(encodeRecoveryKey(crypto.getRandomValues(new Uint8Array(16))));

const WIDTHS = [375, 768, 1280] as const;
const LANGS = ["en", "de"] as const;
const PASS = "synthetic sync screens passphrase";
const FAKE = readFileSync(new URL("./fixtures/sync-fake.js", import.meta.url), "utf8");
const FILES_FAKE = readFileSync(new URL("./fixtures/sync-files-fake.js", import.meta.url), "utf8");

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const contexts: BrowserContext[] = [];

beforeAll(async () => {
  process.env.VITE_MEMORY = "1";
  process.env.VITE_PROJECTS = "1";
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-vault-sync-screens-ui-test",
    plugins: [
      {
        name: "synthetic-answer-and-sync",
        enforce: "pre",
        load(id) {
          const path = id.replaceAll("\\", "/");
          if (path.endsWith("/src/inference.ts"))
            return `export async function streamReply(c,q,csrf,signal,chunk){
              chunk("Synthetic answer.");
              return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
            }`;
          if (path.endsWith("/src/sync/index.ts")) return FAKE;
          if (path.endsWith("/src/sync/files.ts")) return FILES_FAKE;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  await vite.warmupRequest("/src/vault.ts");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);

afterAll(async () => {
  delete process.env.VITE_MEMORY;
  delete process.env.VITE_PROJECTS;
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
  await vite?.close();
});

// The one fake account "on the server" that every device of a test reads.
type Device = { deviceId: string; label: string; createdAt: string; lastSeenAt: string; revoked: boolean };
function fakeAccount() {
  return {
    on: false,
    key: "",
    pendingKey: "",
    pendingLabel: "",
    devices: [] as Device[],
    pairing: undefined as undefined | { code: string; device: string; result: string; at: string },
    override: {} as Record<string, unknown>,
    lastSyncAt: undefined as string | undefined,
  };
}
type Account = ReturnType<typeof fakeAccount>;
const ACCOUNT_ID = "6b3d1f2e-4a5c-4e7b-9d8a-1c2b3a4d5e6f";

function stateFor(account: Account, device: string) {
  const me = account.devices.find((d) => d.deviceId === device);
  const devices = account.devices.map((d) => ({ ...d, thisDevice: d.deviceId === device }));
  if (!account.on || (!me && account.devices.length === 0)) return { phase: "off", pending: 0, devices: [] };
  if (!me) return { phase: "needs-approval", pending: 0, devices: [] };
  if (me.revoked) return { phase: "error", error: "removed", detached: "removed", remembered: true, pending: 0, devices };
  return {
    phase: "idle",
    pending: 0,
    lastSyncAt: account.lastSyncAt,
    quota: { usedBytes: 12_500_000, limitBytes: 200_000_000 },
    devices,
    pairingRequested: account.pairing?.result === "waiting",
    pairingRequestedAt: account.pairing?.result === "waiting" ? account.pairing.at : undefined,
    ...account.override,
  };
}

function operate(account: Account, operation: string, body: Record<string, any>): unknown {
  const now = new Date().toISOString();
  const add = (deviceId: string, label: string) =>
    account.devices.push({ deviceId, label, createdAt: now, lastSeenAt: now, revoked: false });
  switch (operation) {
    case "state":
      return undefined;
    case "setup":
      account.pendingKey = encodeRecoveryKey(crypto.getRandomValues(new Uint8Array(16)));
      account.pendingLabel = body.deviceLabel;
      return { recoveryKey: account.pendingKey };
    case "confirm":
      if (normalizeRecoveryKey(body.lastGroup) !== recoveryKeyGroups(account.pendingKey).at(-1)) return false;
      account.on = true;
      account.key = normalizeRecoveryKey(account.pendingKey);
      account.lastSyncAt = now;
      add(body.device, account.pendingLabel);
      return true;
    case "pair-start":
      // The engine's code: 8 Crockford base32 characters.
      account.pairing = {
        code: Array.from({ length: 8 }, () => CROCKFORD[Math.floor(Math.random() * 32)]).join(""),
        device: body.device,
        result: "waiting",
        at: now,
      };
      return { code: account.pairing.code };
    case "pair-result":
      return account.pairing?.device === body.device ? account.pairing!.result : "expired";
    case "pair-approve":
      if (!account.pairing || account.pairing.result !== "waiting") return "expired";
      if (normalizeRecoveryKey(body.code) !== account.pairing.code) return "wrong-code";
      add(account.pairing.device, body.deviceLabel);
      account.pairing.result = "approved";
      return "approved";
    case "recover":
      if (normalizeRecoveryKey(body.recoveryKey) !== account.key) return "wrong-key";
      if (!account.devices.some((d) => d.deviceId === body.device)) add(body.device, body.deviceLabel);
      return "ok";
    case "set-passphrase":
      return undefined;
    case "revoke":
      account.devices = account.devices.map((d) => (d.deviceId === body.deviceId ? { ...d, revoked: true } : d));
      return undefined;
    case "reset":
      if (body.confirm !== "DELETE SYNCED DATA") throw Error("phrase");
      Object.assign(account, fakeAccount());
      return undefined;
    case "sync-now":
      account.lastSyncAt = now;
      return undefined;
    case "turn-off":
      account.devices = account.devices.filter((d) => d.deviceId !== body.device);
      return undefined;
  }
  throw Error(`unknown ${operation}`);
}

async function open(width: number, lang: "en" | "de", account: Account, sync: boolean) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    hasTouch: width < 760,
    acceptDownloads: true,
  });
  contexts.push(context);
  context.setDefaultTimeout(15_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.startsWith("/__sync/")) {
      const body = request.postDataJSON() ?? {};
      try {
        const result = operate(account, url.pathname.slice("/__sync/".length), body);
        return route.fulfill({ json: { result, state: stateFor(account, body.device) } });
      } catch (error) {
        return route.fulfill({ status: 400, json: { error: String(error) } });
      }
    }
    if (request.method() !== "GET") return route.abort();
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          accountId: ACCOUNT_ID,
          accessEpoch: "synthetic",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
          search: false,
          ...(sync ? { vaultSync: { quotaBytes: 200_000_000, maxDevices: 5 } } : {}),
        },
      });
    return route.continue();
  });
  await page.goto(origin, { timeout: 60_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return page;
}

const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function target(control: Locator, width: number) {
  const box = (await control.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}
const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");

async function menuItem(page: Page, name: string) {
  const menu = page.locator(".conversation-menu");
  if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
  await menu.getByRole("button", { name, exact: true }).click();
}
async function download(page: Page, click: () => Promise<void>) {
  const pending = page.waitForEvent("download");
  await click();
  const file = await pending;
  const chunks: Buffer[] = [];
  for await (const chunk of (await file.createReadStream())!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}
/** This device's vault, read by a second Vault object in the page (assertions only). */
const vaultHolds = (page: Page, passphrase: string) =>
  page.evaluate(
    async ({ account, passphrase }) => {
      const { Vault } = (await new Function("p", "return import(p)")("/src/vault.ts")) as typeof import("../src/vault");
      const v = new Vault();
      v.selectAccount(account);
      try {
        if (!(await v.exists())) return undefined;
        await v.unlock(passphrase);
        return { chats: (await v.readAvailable()).conversations.length, memories: (await v.readMemories()).length };
      } finally {
        v.close(false);
      }
    },
    { account: ACCOUNT_ID, passphrase },
  );

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: Stage 0: new-device notice, remember this device, backup with only memories, restore twice without duplicates, forgotten passphrase reset`, async () => {
      const a = appText[lang];
      const v = vaultUnlockText[lang];
      const b = vaultBackupText[lang];
      const p = backupPartsText[lang];
      const page = await open(width, lang, fakeAccount(), false);
      await menuItem(page, a.renameSave);

      // A device with no vault says plainly that other devices' chats are not here, and how to bring them.
      await ui(page.getByRole("heading", { name: v.newDeviceHeading })).toBeVisible();
      await ui(page.getByText(v.newDeviceHowBackup)).toBeVisible();
      await ui(page.getByText(v.newDeviceHowSync)).toHaveCount(0);
      await ui(page.getByRole("button", { name: v.forgotLink })).toHaveCount(0);
      const remember = page.getByRole("checkbox", { name: v.rememberLabel });
      await ui(remember).not.toBeChecked();
      await ui(page.getByText(v.rememberRisk)).toBeVisible();
      await noSidewaysScroll(page);

      // Memories only (written the way the app writes them), then unlock and remember this device.
      await page.evaluate(
        async ({ account, passphrase }) => {
          const { Vault } = (await new Function("p", "return import(p)")("/src/vault.ts")) as typeof import("../src/vault");
          const store = new Vault();
          store.selectAccount(account);
          await store.unlock(passphrase);
          await store.writeMemories(() => [{ id: crypto.randomUUID(), text: "SYNTHETIC MEMORY", at: new Date().toISOString() }]);
          store.close(false);
        },
        { account: ACCOUNT_ID, passphrase: PASS },
      );
      await page.getByLabel(a.passphrase, { exact: true }).fill(PASS);
      await remember.check();
      await page.getByRole("button", { name: a.createOrUnlock }).click();
      await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();

      // The backup works with only a memory; limits are stated up front; project files are an option.
      const region = page.getByRole("region", { name: b.label });
      await ui(region.getByText(p.limitsUpFront)).toBeVisible();
      await ui(region.getByRole("checkbox", { name: p.includeFiles })).toBeChecked();
      const exportButton = region.getByRole("button", { name: b.download });
      await ui(exportButton).toBeEnabled();
      const memoryOnly = await download(page, () => exportButton.click());
      const content = await decodeVaultBackupContent(memoryOnly, PASS);
      expect(content.conversations).toHaveLength(0);
      expect(content.memories.map((m) => m.text)).toEqual(["SYNTHETIC MEMORY"]);

      // A chat, then a backup with it.
      await page.evaluate(
        async ({ account, passphrase }) => {
          const { Vault } = (await new Function("p", "return import(p)")("/src/vault.ts")) as typeof import("../src/vault");
          const { emptyConversation } = (await new Function("p", "return import(p)")("/shared/contracts.ts")) as typeof import("../shared/contracts");
          const store = new Vault();
          store.selectAccount(account);
          await store.unlock(passphrase);
          await store.save({ ...emptyConversation(), title: "SYNTHETIC CHAT" });
          store.close(false);
        },
        { account: ACCOUNT_ID, passphrase: PASS },
      );
      const withChat = await download(page, () => exportButton.click());
      expect((await decodeVaultBackupContent(withChat, PASS)).conversations).toHaveLength(1);

      // Remember this device: a reload opens the vault without the passphrase.
      await page.reload();
      await menuItem(page, a.renameSave);
      await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();

      // Forgotten passphrase: a clear way out, with a typed confirmation.
      await page.getByRole("button", { name: a.lockAndClear }).click();
      await ui(page.getByRole("button", { name: v.openRemembered })).toBeVisible();
      await page.getByRole("button", { name: v.forgotLink }).click();
      await ui(page.getByRole("heading", { name: v.forgotHeading })).toBeVisible();
      await ui(page.getByText(v.forgotNoSync)).toBeVisible();
      await ui(page.getByText(v.forgotSyncHint)).toHaveCount(0);
      const resetButton = page.getByRole("button", { name: v.resetButton });
      await target(resetButton, width);
      await resetButton.click();
      const dialog = page.getByRole("dialog", { name: v.resetTitle });
      await ui(dialog.getByText(v.resetText)).toBeVisible();
      const confirm = dialog.getByRole("button", { name: v.resetConfirm });
      await ui(confirm).toBeDisabled();
      await dialog.getByLabel(v.resetTypeLabel(v.resetWord)).fill(v.resetWord.toLowerCase());
      await confirm.click();
      await ui(page.getByText(v.resetDone)).toBeVisible();
      await ui(page.getByRole("heading", { name: v.newDeviceHeading })).toBeVisible();
      expect(await vaultHolds(page, PASS)).toBeUndefined();

      // A new vault; the same backup restored twice adds the chat once.
      await page.getByLabel(a.passphrase, { exact: true }).fill(PASS + " new");
      await page.getByRole("button", { name: a.createOrUnlock }).click();
      await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
      for (const count of [1, 0]) {
        await region.getByLabel(b.file, { exact: true }).setInputFiles({
          name: "backup.privateai-backup",
          mimeType: "application/json",
          buffer: Buffer.from(withChat),
        });
        await region.getByLabel(b.passphrase, { exact: true }).fill(PASS);
        await region.getByLabel(b.confirm).check();
        await region.getByRole("button", { name: b.restore }).click();
        await ui(page.getByText(a.restored(count)).first()).toBeVisible();
      }
      expect(await vaultHolds(page, PASS + " new")).toEqual({ chats: 1, memories: 1 });
      await noSidewaysScroll(page);
    }, 120_000);

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: sync: turn on with the recovery key, a new device approved by code, the recovery key with a typo, devices, revoke, status, forgotten passphrase, reset`, async () => {
      const a = appText[lang];
      const s = syncText[lang];
      const h = syncHardeningText[lang];
      const v = vaultUnlockText[lang];
      const account = fakeAccount();
      const settings = (page: Page) => page.locator("dialog.settings-dialog");
      const openSync = async (page: Page) => {
        await menuItem(page, a.settings);
        await settings(page).getByRole("button", { name: s.section, exact: true }).click();
      };
      const closeSettings = (page: Page) => settings(page).getByRole("button", { name: a.closeSettings }).click();

      // Device A: an existing device turns sync on.
      const A = await open(width, lang, account, true);
      await menuItem(A, a.renameSave);
      await A.getByLabel(a.passphrase, { exact: true }).fill(PASS);
      await A.getByRole("button", { name: a.createOrUnlock }).click();
      await ui(A.getByRole("button", { name: a.lockAndClear })).toBeVisible();
      await openSync(A);
      await settings(A).getByRole("button", { name: s.turnOn }).click();
      await ui(settings(A).getByRole("heading", { name: s.explainHeading })).toBeFocused();
      for (const text of [s.explainWhat, s.explainServer, s.explainRecovery]) await ui(settings(A).getByText(text)).toBeVisible();
      await ui(settings(A).getByRole("checkbox", { name: v.rememberLabel })).toBeChecked();
      await settings(A).getByLabel(s.deviceName).fill("Laptop");
      await settings(A).getByRole("button", { name: s.continue }).click();
      // The key starts at Print, the safest way to keep it; copying and downloading carry a warning.
      await ui(settings(A).getByRole("heading", { name: s.keyHeading })).toBeVisible();
      await ui(settings(A).getByRole("button", { name: s.print })).toBeFocused();
      await ui(settings(A).getByText(s.keyCopyRisk)).toBeVisible();
      const groups = settings(A).getByRole("list", { name: s.keyGroups(7) });
      await ui(groups.getByRole("listitem")).toHaveCount(7);
      const key = account.pendingKey;
      const last = recoveryKeyGroups(key).at(-1)!;
      await ui(groups.getByRole("listitem").last()).toContainText(s.keyGroup(7, [...last].join(" ")));
      await ui(settings(A).getByText(s.keyWarning)).toBeVisible();
      expect(await download(A, () => settings(A).getByRole("button", { name: s.download }).click())).toContain(key);
      await settings(A).getByRole("button", { name: s.saved }).click();
      await ui(settings(A).getByRole("heading", { name: s.confirmHeading })).toBeFocused();
      await settings(A).getByLabel(s.confirmLabel).fill("ZZZZ");
      await settings(A).getByRole("button", { name: s.confirmButton }).click();
      await ui(settings(A).getByText(s.confirmWrong)).toBeVisible();
      await settings(A).getByLabel(s.confirmLabel).fill(last.toLowerCase());
      await settings(A).getByRole("button", { name: s.confirmButton }).click();
      await ui(settings(A).getByText(s.onDone)).toBeVisible();
      const list = settings(A).locator(".sync-devices");
      await ui(list.getByRole("listitem").filter({ hasText: "Laptop" })).toContainText(s.thisDevice);
      await noSidewaysScroll(A);
      await closeSettings(A);

      // Delete everything with sync on here asks about the synced copy too (Cancel deletes nothing).
      await menuItem(A, a.renameSave);
      await A.getByRole("button", { name: a.deleteAll, exact: true }).click();
      const erase = A.getByRole("dialog", { name: a.deleteAll });
      const alsoSynced = erase.getByRole("checkbox", { name: s.alsoDeleteSynced });
      await ui(alsoSynced).not.toBeChecked();
      await ui(erase.getByText(s.alsoDeleteSyncedNote)).toBeVisible();
      await target(erase.getByRole("button", { name: a.deleteAll }), width);
      await noSidewaysScroll(A);
      await erase.getByRole("button", { name: s.cancel }).click();
      await ui(erase).toHaveCount(0);
      await ui(A.getByRole("button", { name: a.lockAndClear })).toBeVisible();

      // Device B: a new device; approval from A is the obvious way in.
      const B = await open(width, lang, account, true);
      const welcome = B.getByRole("dialog", { name: s.newHeading });
      await ui(welcome).toBeVisible();
      await ui(welcome.getByRole("checkbox", { name: v.rememberLabel })).toBeChecked();
      await ui(welcome.getByText(v.rememberRisk)).toBeVisible();
      const approveButton = welcome.getByRole("button", { name: s.approveFromOther });
      await target(approveButton, width);
      await approveButton.click();
      await ui(welcome.getByText(s.codeSteps)).toBeVisible();
      await ui(welcome.locator(".pairing-code")).toContainText(`${account.pairing!.code.slice(0, 4)}-${account.pairing!.code.slice(4)}`);
      const shown = (await welcome.locator(".pairing-code [aria-hidden]").textContent())!.replace(/[\s-]/g, "");
      expect(shown).toBe(account.pairing!.code);
      await noSidewaysScroll(B);

      // Device A shows a quiet notice by itself (never the form); the user opens it, says they hold
      // the device, then a wrong code is refused and the right one approves.
      const prompt = A.getByRole("region", { name: s.promptHeading });
      await ui(prompt).toBeVisible();
      await ui(prompt.getByLabel(s.promptCode)).toHaveCount(0);
      await ui(prompt).toContainText(s.pairingNotice("").split(" ").slice(0, 4).join(" "));
      await target(prompt.getByRole("button", { name: s.reviewRequest }), width);
      await noSidewaysScroll(A);
      await prompt.getByRole("button", { name: s.reviewRequest }).click();
      await ui(prompt.getByText(s.promptWarning)).toBeVisible();
      await ui(prompt.getByText(new RegExp(`^${h.pairingRequestedAt("").split(" ")[0]} `))).toBeVisible();
      await ui(prompt.getByLabel(s.promptCode)).toBeDisabled();
      await prompt.getByRole("checkbox", { name: s.holdingLabel }).check();
      await noSidewaysScroll(A);
      const wrong = CROCKFORD[(CROCKFORD.indexOf(shown[0]) + 1) % 32] + shown.slice(1);
      await prompt.getByLabel(s.promptCode).fill(wrong);
      await prompt.getByRole("button", { name: s.approve }).click();
      await ui(prompt.getByText(s.wrongCode)).toBeVisible();
      await prompt.getByLabel(s.promptCode).fill(`${shown.slice(0, 4)}-${shown.slice(4)}`.toLowerCase());
      await prompt.getByLabel(s.promptName).fill("Phone");
      await prompt.getByRole("button", { name: s.approve }).click();
      await ui(prompt.getByText(s.approvedOther)).toBeVisible();
      // Every other device says once that a device was added.
      const added = A.getByRole("region", { name: s.deviceAddedHeading });
      await ui(added).toContainText("Phone");
      await added.getByRole("button", { name: s.closeNotice }).click();
      await ui(added).toHaveCount(0);
      await ui(welcome).toHaveCount(0);
      await ui(B.getByText(s.approved).first()).toBeVisible();
      // Saved on the approved device does not claim that it is empty (the Stage 0 notice is for unsynced devices).
      await ui(B.getByRole("heading", { name: v.newDeviceHeading })).toHaveCount(0);

      // Device C: the code expires and a new one comes; then the recovery key, with a typo caught.
      const C = await open(width, lang, account, true);
      const again = C.getByRole("dialog", { name: s.newHeading });
      await again.getByRole("button", { name: s.approveFromOther }).click();
      await ui(again.locator(".pairing-code")).toBeVisible();
      account.pairing!.result = "expired";
      await ui(again.getByText(s.expired)).toBeVisible();
      await again.getByRole("button", { name: s.newCode }).click();
      await ui(again.locator(".pairing-code")).toBeVisible();
      await again.getByRole("button", { name: s.back }).click();
      await again.getByRole("button", { name: s.useRecovery }).click();
      await ui(again.getByRole("heading", { name: s.recoveryHeading })).toBeFocused();
      const field = again.getByLabel(s.recoveryLabel);
      const unlock = again.getByRole("button", { name: s.unlock });
      const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
      const typo = alphabet[(alphabet.indexOf(account.key[0]) + 1) % 32] + account.key.slice(1);
      await field.fill(typo);
      await ui(again.getByText(s.hintTypo)).toBeVisible();
      // The local check is a hint, never a block: the engine decides.
      await ui(unlock).toBeEnabled();
      await field.fill(account.key.slice(0, 10));
      await ui(again.getByText(s.hintShort(18))).toBeVisible();
      await ui(unlock).toBeDisabled();
      await ui(field).toHaveValue(recoveryKeyGroups(account.key.slice(0, 10)).join("-"));
      await field.fill("U" + account.key.slice(1));
      await ui(again.getByText(s.hintCharacter("U"))).toBeVisible();
      let other = makeRecoveryKey();
      while (other === account.key) other = makeRecoveryKey();
      await field.fill(other);
      await ui(again.getByText(s.hintOk)).toBeVisible();
      await unlock.click();
      await ui(again.getByText(s.wrongKey)).toBeVisible();
      await field.fill(account.key.toLowerCase());
      await again.getByLabel(s.deviceName).fill("Tablet");
      // Not remembered: a local passphrase is asked for (owner decision VS-5).
      await again.getByRole("checkbox", { name: v.rememberLabel }).uncheck();
      await unlock.click();
      await ui(again).toHaveCount(0);
      const local = C.getByRole("dialog", { name: v.newPassphraseHeading });
      await ui(local.getByText(s.localPassphraseNotRemembered)).toBeVisible();
      await ui(local.getByRole("button", { name: v.newPassphraseSave })).toBeDisabled();
      await noSidewaysScroll(C);
      await local.getByLabel(v.newPassphrase).fill("synthetic local passphrase C");
      await local.getByRole("button", { name: v.newPassphraseSave }).click();
      await ui(local).toHaveCount(0);

      // Device C turns sync off for itself.
      await openSync(C);
      await settings(C).getByRole("button", { name: s.turnOffHere }).click();
      const off = C.getByRole("dialog", { name: s.turnOffTitle });
      await ui(off.getByText(s.turnOffText)).toBeVisible();
      await off.getByRole("button", { name: s.turnOffConfirm }).click();
      // The engine needs a local passphrase before sync goes off here: asked, then retried.
      const offPassphrase = C.getByRole("dialog", { name: v.newPassphraseHeading });
      await ui(offPassphrase.getByText(h.turnOffNeedsPassphrase)).toBeVisible();
      await offPassphrase.getByLabel(v.newPassphrase).fill("synthetic local passphrase C2");
      await offPassphrase.getByRole("button", { name: v.newPassphraseSave }).click();
      await ui(settings(C).getByText(s.turnedOff).first()).toBeVisible();
      expect(account.devices.map((d) => d.label)).toEqual(["Laptop", "Phone"]);

      // Device A: the devices list, revoke with its sentence on what it does and does not do.
      await openSync(A);
      await ui(list.getByRole("listitem")).toHaveCount(2);
      await ui(settings(A).getByText(s.quotaLabel)).toBeVisible();
      await ui(settings(A).getByText(s.pending(0))).toBeVisible();
      await settings(A).getByRole("button", { name: s.revoke("Phone") }).click();
      const revoke = A.getByRole("dialog", { name: s.revokeTitle("Phone") });
      await ui(revoke.getByText(s.revokeText)).toBeVisible();
      await revoke.getByRole("button", { name: s.revokeConfirm }).click();
      await ui(list.getByRole("listitem").filter({ hasText: "Phone" })).toContainText(s.revoked);
      await ui(settings(A).getByRole("button", { name: s.revoke("Phone") })).toHaveCount(0);
      // The removed device says what happened and that its data stays; no deletion is offered there.
      await ui(B.getByRole("dialog", { name: s.newHeading })).toHaveCount(0);
      await openSync(B);
      await ui(settings(B).getByText(h.detachedRemoved)).toBeVisible();
      await target(settings(B).getByRole("button", { name: h.syncAgain }), width);
      await ui(settings(B).locator(".sync-settings .danger-button")).toHaveCount(0);
      await noSidewaysScroll(B);
      await closeSettings(B);

      // Errors in plain words.
      account.override = { phase: "error", error: "offline" };
      await ui(settings(A).getByText(s.errorOffline)).toBeVisible();
      account.override = { phase: "error", error: "quota-full" };
      await ui(settings(A).getByText(s.errorQuota)).toBeVisible();
      account.override = { error: "conflict-copies" };
      await ui(settings(A).getByText(s.errorConflict)).toBeVisible();
      for (const [code, text] of [["server", s.errorServer], ["rate-limited", h.rateLimited], ["item-too-large", h.itemTooLarge], ["needs-upgrade", h.needsUpgrade(1)]] as const) {
        account.override = { phase: "error", error: code };
        await ui(settings(A).getByText(text)).toBeVisible();
      }
      await noSidewaysScroll(A);
      await closeSettings(A);

      // The quiet status indicator: a word for each state, and it opens Devices and sync.
      const openNavigation = A.getByRole("button", { name: a.openNavigation });
      if (await openNavigation.isVisible()) await openNavigation.click();
      const indicator = A.locator(".sync-indicator");
      for (const [override, word] of [
        [{ phase: "syncing" }, s.stateSyncing],
        [{ phase: "error", error: "offline" }, s.stateOffline],
        [{ phase: "error", error: "quota-full" }, s.stateError],
        [{}, s.stateSynced],
      ] as const) {
        account.override = override;
        await ui(indicator).toHaveText(word);
        await ui(indicator).toHaveAccessibleName(s.indicatorLabel(word));
      }
      await indicator.click();
      await ui(settings(A).getByRole("heading", { name: s.section })).toBeVisible();
      await closeSettings(A);

      // Forgotten passphrase with sync on: the recovery key first, then a new passphrase; delete is last.
      await menuItem(A, a.renameSave);
      await A.getByRole("button", { name: a.lockAndClear }).click();
      await A.getByRole("button", { name: v.forgotLink }).click();
      const forgot = A.locator(".forgot-passphrase");
      await ui(forgot.getByText(v.forgotWithSync)).toBeVisible();
      await ui(forgot.getByRole("heading", { name: v.lastResortHeading })).toBeVisible();
      await ui(forgot.getByRole("button", { name: v.resetButton })).toBeVisible();
      await forgot.getByLabel(s.recoveryLabel).fill(account.key);
      await forgot.getByRole("button", { name: s.unlock }).click();
      await ui(A.getByText(s.recovered)).toBeVisible();
      await A.getByLabel(v.newPassphrase, { exact: true }).fill("synthetic new local passphrase");
      await A.getByRole("button", { name: v.newPassphraseSave }).click();
      await ui(A.getByText(v.newPassphraseDone)).toBeVisible();

      // Delete synced data on the server: only after typing the phrase.
      await openSync(A);
      await settings(A).getByRole("button", { name: s.reset }).click();
      const reset = A.getByRole("dialog", { name: s.resetTitle });
      await ui(reset.getByText(s.resetText)).toBeVisible();
      const confirm = reset.getByRole("button", { name: s.resetConfirm });
      await ui(confirm).toBeDisabled();
      await reset.getByLabel(s.resetTypeLabel(s.resetPhrase)).fill(s.resetPhrase);
      await confirm.click();
      await ui(settings(A).getByText(s.resetDone).first()).toBeVisible();
      expect(account.on).toBe(false);
      await noSidewaysScroll(A);
      for (const page of [B, C]) await noSidewaysScroll(page);
      for (const page of [A, B, C]) await page.context().close();
    }, 180_000);

it("the forgotten-passphrase confirmation starts on Cancel and Escape deletes nothing", async () => {
  const v = vaultUnlockText.en;
  const a = appText.en;
  const page = await open(1280, "en", fakeAccount(), false);
  await menuItem(page, a.renameSave);
  await page.getByLabel(a.passphrase, { exact: true }).fill(PASS);
  await page.getByRole("button", { name: a.createOrUnlock }).click();
  await page.getByRole("button", { name: a.lockAndClear }).click();
  await page.getByRole("button", { name: v.forgotLink }).click();
  await page.getByRole("button", { name: v.resetButton }).click();
  expect(await focusedText(page)).toBe(v.cancel);
  await page.keyboard.press("Escape");
  await ui(page.getByRole("dialog", { name: v.resetTitle })).toHaveCount(0);
  expect(await vaultHolds(page, PASS)).toEqual({ chats: 0, memories: 0 });
}, 60_000);

for (const [width, lang] of [[1280, "en"], [375, "de"]] as const)
  it(`${width} px, ${lang}: a question in a project whose synced files could not be downloaded asks before sending`, async () => {
    const a = appText[lang];
    const s = syncText[lang];
    const account = fakeAccount();
    // This device is in sync (fake engine) and file sync is on (fake files module).
    Object.assign(account, { on: true, key: "K", devices: [{ deviceId: "x", label: "Other", createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), revoked: false }] });
    const page = await open(width, lang, account, true);
    const device = await page.evaluate(() => localStorage.getItem("fake-sync-device"));
    account.devices.push({ deviceId: device!, label: "Laptop", createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), revoked: false });
    await page.evaluate(
      async ({ account, passphrase }) => {
        const load = (path: string) => new Function("p", "return import(p)")(path);
        const { Vault } = (await load("/src/vault.ts")) as typeof import("../src/vault");
        const { emptyConversation } = (await load("/shared/contracts.ts")) as typeof import("../shared/contracts");
        const { newMessage } = (await load("/src/conversation.ts")) as typeof import("../src/conversation");
        const store = new Vault();
        store.selectAccount(account);
        await store.unlock(passphrase);
        const projectId = crypto.randomUUID();
        await store.changeProjects(() => [{ id: projectId, name: "SYNTHETIC PROJECT" }]);
        await store.save({ ...emptyConversation(), title: "SYNTHETIC PROJECT CHAT", projectId, messages: [newMessage("user", "Synthetic first question.")] });
        store.close(false);
      },
      { account: ACCOUNT_ID, passphrase: PASS },
    );
    await menuItem(page, a.renameSave);
    await page.getByLabel(a.passphrase, { exact: true }).fill(PASS);
    await page.getByRole("button", { name: a.createOrUnlock }).click();
    await page.getByRole("article", { name: "SYNTHETIC PROJECT CHAT" }).getByRole("button").first().click();
    const ask = async () => {
      await page.locator("#message-input").fill("Synthetic question about the project files.");
      await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
      return page.getByRole("dialog", { name: s.missingFilesTitle });
    };
    // Cancel: nothing is sent, the question stays in the composer.
    let dialog = await ask();
    await ui(dialog.getByText(s.missingFilesText)).toBeVisible();
    await target(dialog.getByRole("button", { name: s.sendAnyway }), width);
    await noSidewaysScroll(page);
    await dialog.getByRole("button", { name: s.cancel }).click();
    await ui(dialog).toHaveCount(0);
    await ui(page.locator("#message-input")).toHaveValue("Synthetic question about the project files.");
    await ui(page.getByText("Synthetic answer.")).toHaveCount(0);
    // Send anyway: the question goes without the files.
    dialog = await ask();
    await dialog.getByRole("button", { name: s.sendAnyway }).click();
    await ui(page.getByText("Synthetic answer.").first()).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __ensureProjectFiles: number }).__ensureProjectFiles)).toBe(2);
    await page.context().close();
  }, 120_000);
