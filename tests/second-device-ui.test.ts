// "Second device today" (docs/multi-device-and-usability-20261115.md, section 1): two separate
// browser contexts are two devices signed in to the same account. Shows what follows the account
// (identity and allowance, from the server) and what does not (the vault), the backup file moving
// saved data from one device to the other, and that a lost passphrase has no back door.
// Offline: src/inference.ts is replaced, /api/status is answered by one shared fake account record
// (the real account server and Postgres are not exercised here; see account-usage-http.test.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { workspaceControl } from "../evaluation/workspace-navigation";
import { appText } from "../src/text/app";
import { vaultBackupText } from "../src/text/vault-ui";
import { vaultUnlockText } from "../src/text/sync";
import { workspaceText } from "../src/text/workspace";
import { decodeVaultBackupContent } from "../src/vault-backup";

const a = appText.en;
const b = vaultBackupText.en;
const w = workspaceText.en;
const ACCOUNT = "3f6c2a1e-7b4d-4c8e-9a21-5d0e8f7b6c45";
const EMAIL = "synthetic.user@example.test";
const PASSPHRASE = "synthetic second device passphrase";
const QUESTION = "SYNTHETIC-CHAT-CANARY question about a notice period";
const ANSWER = "SYNTHETIC-ANSWER-CANARY three months.";
const MEMORY = "SYNTHETIC-MEMORY-CANARY prefers answers in German";
const PROJECT = "SYNTHETIC-PROJECT-CANARY tenancy";
const FILE_TEXT = "SYNTHETIC-FILE-CANARY clause 4: notice period";
const TASK = "SYNTHETIC-TASK-CANARY weekly rent reminder";
const CANARIES = /SYNTHETIC-(CHAT|ANSWER|MEMORY|PROJECT|FILE|TASK)-CANARY|second device passphrase/;

// The one account record "on the server": both devices read it through /api/status.
const server = { used: 12 };
const allowance = () => ({
  state: "active",
  limit: 150,
  used: server.used,
  remaining: 150 - server.used,
  pending: 0,
  uncertain: 0,
  resetsAt: "2026-11-20T00:00:00.000Z",
  meteredRequests: 0,
  promptTokens: 0,
  completionTokens: 0,
  unmeteredRequests: 0,
});

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
let deviceA: { context: BrowserContext; page: Page; requests: string[] };
let deviceB: { context: BrowserContext; page: Page; requests: string[] };
let backup = "";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-second-device-ui-test",
    plugins: [
      {
        name: "synthetic-answer",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            chunk(${JSON.stringify(ANSWER)});
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
  await vite.warmupRequest("/src/vault.ts");
  await vite.warmupRequest("/src/scheduled.ts");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 60_000);

afterAll(async () => {
  await deviceA?.context.close();
  await deviceB?.context.close();
  await browser?.close();
  await vite?.close();
});

/** A device: its own browser profile (storage, IndexedDB), signed in to the same account. */
async function device(width: number) {
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width, height: 900 },
    hasTouch: width < 760,
    acceptDownloads: true,
  });
  context.setDefaultTimeout(15_000);
  const requests: string[] = [];
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.dismiss());
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname.startsWith("/api/")) requests.push(`${request.method()} ${url.pathname}`);
    if (request.method() !== "GET") return route.abort();
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          consumerWorkspace: true,
          accountId: ACCOUNT,
          accountEmail: EMAIL,
          accessEpoch: "synthetic-epoch",
          requestAllowance: allowance(),
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
          search: false,
        },
      });
    return route.continue();
  });
  await page.goto(origin + "/", { timeout: 30_000 });
  await ui(page.locator(".account-label")).toContainText(EMAIL);
  return { context, page, requests };
}

/** Reads this device's vault directly (a second Vault object in the page), for assertions only. */
const readVault = (page: Page, passphrase: string) =>
  page.evaluate(
    async ({ account, passphrase }) => {
      const { Vault } = (await new Function("p", "return import(p)")("/src/vault.ts")) as typeof import("../src/vault");
      const v = new Vault();
      v.selectAccount(account);
      try {
        await v.unlock(passphrase);
        const conversations = (await v.readAvailable()).conversations;
        return {
          conversations: conversations.map((c) => c.messages.map((m) => m.text).join(" ")),
          projects: (await v.readProjects()).map((p) => ({ name: p.name, instructions: p.instructions })),
          projectFiles: Object.values(await v.readProjectFiles()).flat().length,
          memories: (await v.readMemories()).map((m) => m.text),
          tasks: (await v.readTasks()).map((t) => ({ name: t.name, mode: t.mode })),
        };
      } finally {
        v.close(false);
      }
    },
    { account: ACCOUNT, passphrase },
  );

/** Everything this device stored in its browser, as raw text: never the plaintext. */
const rawStorage = (page: Page) =>
  page.evaluate(async (account) => {
    const open = indexedDB.open(`privateai-vault-${account}`);
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const dump = async (store: string) =>
      new Promise<unknown[]>((resolve) => {
        const request = db.transaction(store).objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
      });
    const toText = (value: unknown): string =>
      JSON.stringify(value, (_k, v) =>
        v instanceof ArrayBuffer || ArrayBuffer.isView(v)
          ? new TextDecoder().decode(v instanceof ArrayBuffer ? v : (v as Uint8Array))
          : v,
      );
    const text = toText([await dump("meta"), await dump("conversations")]) + JSON.stringify({ ...localStorage });
    db.close();
    return text;
  }, ACCOUNT);

async function unlockInSaved(page: Page, passphrase: string) {
  await workspaceControl(page, "Saved").click();
  await page.getByLabel(a.passphrase, { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: a.createOrUnlock }).click();
}

describe("a second device on the same account, today", () => {
  it("device A (computer): saves a chat, a project with instructions and a file, a memory and a task, then downloads the encrypted backup", async () => {
    deviceA = await device(1280);
    const page = deviceA.page;
    // Seed the vault the way the app writes it (memory, project, file, task), with the passphrase.
    await page.evaluate(
      async ({ account, passphrase, memory, project, fileText, task }) => {
        const { Vault } = (await new Function("p", "return import(p)")("/src/vault.ts")) as typeof import("../src/vault");
        const { addTask, newTask } = (await new Function("p", "return import(p)")("/src/scheduled.ts")) as typeof import("../src/scheduled");
        const v = new Vault();
        v.selectAccount(account);
        await v.unlock(passphrase);
        const at = new Date().toISOString();
        await v.writeMemories(() => [{ id: crypto.randomUUID(), text: memory, at }]);
        const [created] = await v.createProject(project);
        await v.changeProjects((list) =>
          list.map((p) => (p.id === created.id ? { ...p, instructions: "Answer in German." } : p)),
        );
        await v.changeProjectFiles((files) => ({
          ...files,
          [created.id]: [
            {
              id: crypto.randomUUID(),
              name: "lease.txt",
              characters: fileText.length,
              at,
              sources: [{ id: "lease-1", title: "lease.txt", text: fileText }],
            },
          ],
        }));
        await v.writeTasks(
          addTask(
            newTask({
              name: task,
              instruction: "Remind me to pay the rent.",
              trigger: { every: 1, unit: "week", time: "09:00", timeZone: "Europe/Berlin" },
              mode: "manual",
              notify: { inApp: true, calendar: false },
              answerMode: "fast",
              useSearch: false,
            }),
          ),
        );
        v.close(false);
      },
      { account: ACCOUNT, passphrase: PASSPHRASE, memory: MEMORY, project: PROJECT, fileText: FILE_TEXT, task: TASK },
    );
    // A chat, saved through the app.
    await page.getByLabel(a.messageInput).fill(QUESTION);
    await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
    await ui(page.locator("article.assistant").last()).toContainText(ANSWER);
    await unlockInSaved(page, PASSPHRASE);
    await page.getByRole("button", { name: a.saveSnapshot }).click();
    await ui(page.getByText(a.noSaved)).toHaveCount(0);

    const stored = await readVault(page, PASSPHRASE);
    expect(stored.conversations).toEqual([`${QUESTION} ${ANSWER}`]);
    expect(stored.projects).toEqual([{ name: PROJECT, instructions: "Answer in German." }]);
    expect(stored.projectFiles).toBe(1);
    expect(stored.memories).toEqual([MEMORY]);
    expect(stored.tasks).toEqual([{ name: TASK, mode: "manual" }]);
    // Stored only as ciphertext on this device.
    expect(await rawStorage(page)).not.toMatch(CANARIES);

    // The backup file: downloaded by the user, encrypted with the vault passphrase.
    await page.getByRole("region", { name: b.label }).scrollIntoViewIfNeeded();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: b.download }).click();
    const file = await download;
    const chunks: Buffer[] = [];
    for await (const chunk of (await file.createReadStream())!) chunks.push(Buffer.from(chunk));
    backup = Buffer.concat(chunks).toString();
    expect(backup).not.toMatch(CANARIES);
    const content = await decodeVaultBackupContent(backup, PASSPHRASE);
    expect(content.conversations).toHaveLength(1);
    expect(content.memories.map((m) => m.text)).toEqual([MEMORY]);
    expect(content.projects.map((p) => p.name)).toEqual([PROJECT]);
    expect(content.scheduledTasks.map((t) => t.name)).toEqual([TASK]);
    // Project files are not in the backup (docs/projects-20261114.md, "Backup").
    expect(JSON.stringify(content)).not.toContain("SYNTHETIC-FILE-CANARY");
  }, 120_000);

  it("device B (phone): the account and allowance follow; the vault does not, even with the same passphrase", async () => {
    deviceB = await device(375);
    const page = deviceB.page;
    // The same account and the same allowance on both devices: they come from the server.
    for (const { page: p } of [deviceA, deviceB])
      await ui(p.locator(".account-label")).toContainText(w.usage(138, 150));
    // A request booked on device A is visible on device B after the next status read.
    server.used = 13;
    await page.reload();
    await ui(page.locator(".account-label")).toContainText(w.usage(137, 150));

    // Nothing saved on device A is here. The same passphrase silently creates a new, empty vault.
    await unlockInSaved(page, PASSPHRASE);
    await ui(page.getByText(a.noSaved)).toBeVisible();
    expect(await readVault(page, PASSPHRASE)).toEqual({
      conversations: [],
      projects: [],
      projectFiles: 0,
      memories: [],
      tasks: [],
    });
  }, 120_000);

  it("device B: restoring device A's backup file with the original passphrase brings chats, project names and instructions, memory and tasks, but not project files", async () => {
    const page = deviceB.page;
    const region = page.getByRole("region", { name: b.label });
    await region.getByLabel(b.file, { exact: true }).setInputFiles({
      name: "history.privateai-backup",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
    await region.getByLabel(b.passphrase, { exact: true }).fill(PASSPHRASE);
    await region.getByLabel(b.confirm).check();
    await region.getByRole("button", { name: b.restore }).click();
    await ui(page.getByText(a.restored(1), { exact: false }).first()).toBeVisible();
    await ui(page.getByText(a.noSaved)).toHaveCount(0);

    const restored = await readVault(page, PASSPHRASE);
    expect(restored.conversations).toEqual([`${QUESTION} ${ANSWER}`]);
    expect(restored.projects).toEqual([{ name: PROJECT, instructions: "Answer in German." }]);
    expect(restored.memories).toEqual([MEMORY]);
    expect(restored.tasks).toEqual([{ name: TASK, mode: "manual" }]);
    expect(restored.projectFiles).toBe(0);
    expect(await rawStorage(page)).not.toMatch(CANARIES);

    // A change on device B does not reach device A: there is no sync.
    await page.evaluate(async ({ account, passphrase }) => {
      const { Vault } = (await new Function("p", "return import(p)")("/src/vault.ts")) as typeof import("../src/vault");
      const v = new Vault();
      v.selectAccount(account);
      await v.unlock(passphrase);
      await v.writeMemories((list) => [...list, { id: crypto.randomUUID(), text: "Only on device B", at: new Date().toISOString() }]);
      v.close(false);
    }, { account: ACCOUNT, passphrase: PASSPHRASE });
    expect((await readVault(deviceA.page, PASSPHRASE)).memories).toEqual([MEMORY]);

    // Neither device sent anything but status reads to our server: the vault never left a device.
    for (const { requests } of [deviceA, deviceB])
      expect(new Set(requests)).toEqual(new Set(["GET /api/status"]));
  }, 120_000);

  it("a lost passphrase: the vault does not open, the backup does not open, and there is no reset or recovery in the app", async () => {
    const page = deviceA.page;
    await page.getByRole("button", { name: a.lockAndClear }).click();
    await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic forgotten passphrase");
    await page.getByRole("button", { name: a.createOrUnlock }).click();
    await ui(page.getByText(a.unlockFailed).first()).toBeVisible();
    await ui(page.getByLabel(a.passphrase, { exact: true })).toBeVisible();
    // While locked there is no "Delete everything" and no backup. Since Stage 0 there is "Forgot your
    // passphrase?" (docs/vault-sync-screens-20261115.md): without sync it can only delete this device's
    // data after a typed confirmation; it recovers nothing. Not pressed here.
    await ui(page.getByRole("region", { name: a.deleteAll })).toHaveCount(0);
    await ui(page.getByRole("region", { name: b.label })).toHaveCount(0);
    await ui(page.getByRole("button", { name: /recover|reset/i })).toHaveCount(0);
    await ui(page.getByRole("button", { name: vaultUnlockText.en.forgotLink })).toBeVisible();
    // The stored data is only ciphertext; the wrong passphrase is refused by the vault itself.
    await expect(readVault(page, "synthetic forgotten passphrase")).rejects.toThrow();
    expect(await rawStorage(page)).not.toMatch(CANARIES);
    // The backup file is just as closed without its original passphrase.
    await expect(decodeVaultBackupContent(backup, "synthetic forgotten passphrase")).rejects.toThrow();
    // The data is still there for whoever has the passphrase.
    expect((await readVault(page, PASSPHRASE)).conversations).toHaveLength(1);
  }, 120_000);
});
