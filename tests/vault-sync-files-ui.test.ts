// Vault sync Stage 3 in the project screen (src/ProjectPanel.tsx) in the real app at 375, 768 and
// 1280 px, English and German: a file of another device "Not downloaded yet", Download with
// progress, a failed download and Try again, a local file waiting or too large, the quota line, and
// removing a file never downloaded here. Offline: src/inference.ts is replaced, and the file sync
// view is driven through test hooks added to src/sync/files.ts (the engine itself is covered by
// tests/vault-sync-files.test.ts). Nothing reaches a server.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { appText } from "../src/text/app";
import { projectText } from "../src/text/projects";
import { syncFilesText } from "../src/text/sync-files";
import { workspaceText } from "../src/text/workspace";

const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;
const FILES_SOURCE = readFileSync(new URL("../src/sync/files.ts", import.meta.url), "utf8");
// Appended to src/sync/files.ts for this test only: publish a view and act as the engine.
const HOOKS = `
import { heldProjects as __held, holdProjects as __hold } from "../projects";
(window as any).__syncFiles = { publish: (patch: object) => publishFiles({ ...views.max, ...patch }), view: () => views.max, bind: bindFileActions, held: __held, hold: __hold };
`;

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  process.env.VITE_PROJECTS = "1";
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-vault-sync-files-ui-test",
    plugins: [
      {
        name: "synthetic-answer-and-file-hooks",
        enforce: "pre",
        load(id) {
          const path = id.replaceAll("\\", "/");
          if (path.endsWith("/src/inference.ts"))
            return `export async function streamReply(c,q,csrf,signal,chunk){ chunk("Synthetic answer."); return { input: 1, output: 1, total: 2, estimatedUSD: 0 }; }`;
          if (path.endsWith("/src/sync/files.ts")) return FILES_SOURCE + HOOKS;
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
  delete process.env.VITE_PROJECTS;
  await browser?.close();
  await vite?.close();
});

async function open(width: number, lang: "en" | "de") {
  const context = await browser.newContext({ locale: lang === "de" ? "de-DE" : "en-US", viewport: { width, height: 900 }, hasTouch: width < 760 });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const outside: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || route.request().method() !== "GET") {
      outside.push(`${route.request().method()} ${url.href}`);
      return route.abort();
    }
    if (url.pathname === "/api/status")
      return route.fulfill({ json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 20000 } }, search: false } });
    return route.continue();
  });
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto(origin, { timeout: 30_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { page, outside };
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
type Hooks = {
  publish(patch: object): void;
  view(): { remote: object[]; states: Record<string, object> };
  bind(actions: object): void;
  held(): { projects: { id: string }[]; files: Record<string, { id: string }[]> };
  hold(change: object): void;
};
const MB = 1024 * 1024;

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: files of other devices, download with progress and retry, waiting, too large, quota, remove`, async () => {
      const a = appText[lang];
      const p = projectText[lang];
      const f = syncFilesText[lang];
      const w = workspaceText[lang];
      const { page, outside } = await open(width, lang);
      const panel = page.locator("dialog.project-dialog");
      const status = panel.locator(".project-status");
      try {
        // A vault, a project and one file added on this device.
        const menu = page.locator(".conversation-menu");
        await menu.locator("summary").click();
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic sync files ui passphrase");
        await page.getByRole("button", { name: a.createOrUnlock }).click();
        await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
        const sidebar = async () => {
          if (!(await page.getByRole("button", { name: w.createProject, exact: true }).isVisible())) await page.getByRole("button", { name: a.openNavigation }).click();
        };
        await sidebar();
        await page.getByRole("button", { name: w.createProject, exact: true }).click();
        await page.getByLabel(w.projectName, { exact: true }).fill("Thesis");
        await page.getByRole("button", { name: w.create, exact: true }).click();
        await ui(page.getByText(a.projectCreated)).toBeVisible();
        // Create opens the project screen.
        await ui(panel.getByRole("heading", { name: "Thesis", exact: true })).toBeFocused();
        await panel.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("Synthetic notes for the thesis.\n") });
        await ui(status).toHaveText(p.fileAdded("notes.txt"));
        // Without file sync the screen is as before.
        await ui(panel.getByText(f.intro)).toHaveCount(0);

        // File sync on: one file of another device, the local file waiting, the quota line.
        const ids = await page.evaluate(() => {
          const hooks = (window as unknown as { __syncFiles: Hooks }).__syncFiles;
          const projectId = hooks.held().projects[0].id;
          return { projectId, localId: hooks.held().files[projectId][0].id };
        });
        const remoteEntry = (id: string, name: string) => ({
          id,
          projectId: ids.projectId,
          name,
          characters: 1200,
          at: "2026-11-15T10:00:00.000Z",
          size: 2400,
          type: "extracted-text-v1",
          blobId: crypto.randomUUID(),
          hash: "A".repeat(43) + "=",
        });
        const remoteId = crypto.randomUUID();
        const otherId = crypto.randomUUID();
        await page.evaluate(
          ({ ids, remote, other }) => {
            const hooks = (window as unknown as { __syncFiles: Hooks; __download?: (r: string) => void; __removed?: string[] }).__syncFiles;
            const w = window as unknown as { __download?: (r: string) => void; __removed: string[] };
            w.__removed = [];
            hooks.bind({
              // A download that waits for the test: progress first, then the answer the test gives.
              downloadFile: (id: string) =>
                new Promise((resolve) => {
                  hooks.publish({ states: { ...hooks.view().states, [id]: { state: "downloading", progress: 0.4 } } });
                  w.__download = (result: string) => {
                    const { [id]: _done, ...states } = hooks.view().states as Record<string, object>;
                    if (result === "ok") {
                      const held = hooks.held();
                      const file = { id, name: remote.name, characters: 1200, at: remote.at, sources: [{ id: "p1", title: remote.name, text: "Synthetic remote text." }] };
                      hooks.hold({ files: { ...held.files, [ids.projectId]: [...held.files[ids.projectId], file] } });
                      hooks.publish({ states, remote: (hooks.view().remote as { id: string }[]).filter((e) => e.id !== id) });
                    } else hooks.publish({ states: { ...states, [id]: { state: "error", reason: result } } });
                    resolve(result);
                  };
                }),
              removeRemoteFile: async (id: string) => {
                w.__removed.push(id);
                hooks.publish({ remote: (hooks.view().remote as { id: string }[]).filter((e) => e.id !== id) });
              },
              ensureProjectFiles: async () => true,
            });
            hooks.publish({
              enabled: true,
              quota: { count: 2, usedBytes: 5 * 1024 * 1024, limitBytes: 1024 * 1024 * 1024, maxFileBytes: 10 * 1024 * 1024 },
              remote: [remote, other],
              states: { [ids.localId]: { state: "waiting" } },
            });
          },
          { ids, remote: remoteEntry(remoteId, "Remote.pdf"), other: remoteEntry(otherId, "Other.txt") },
        );
        const left = (1024 - 5).toLocaleString(lang === "de" ? "de-DE" : "en-GB");
        await ui(panel.getByText(f.intro)).toBeVisible();
        await ui(panel.getByText(f.quota("5 MB", "1 GB", `${left} MB`))).toBeVisible();
        const files = panel.getByRole("list", { name: p.files });
        await ui(files.getByRole("listitem")).toHaveCount(3);
        // The files not downloaded here count toward the project's limits.
        await ui(panel.getByText(p.filesLimits(3, 20, "", "").split(" · ")[0], { exact: false })).toBeVisible();
        const remoteRow = files.getByRole("listitem").filter({ hasText: "Remote.pdf" });
        const localRow = files.getByRole("listitem").filter({ hasText: "notes.txt" });
        await ui(remoteRow).toContainText(f.notDownloaded);
        await ui(localRow).toContainText(f.waiting);
        const download = remoteRow.getByRole("button", { name: f.downloadFile("Remote.pdf") });
        await target(download, width);
        await target(remoteRow.getByRole("button", { name: p.removeFile("Remote.pdf") }), width);
        await noSidewaysScroll(page);

        // Download: progress while it runs, then a failure with its reason and Try again.
        await download.click();
        const progress = remoteRow.getByRole("progressbar", { name: f.progressLabel("Remote.pdf") });
        await ui(progress).toBeVisible();
        await ui(remoteRow).toContainText(f.downloading(40));
        await ui(remoteRow.getByRole("button", { name: f.downloadFile("Remote.pdf") })).toHaveCount(0);
        await noSidewaysScroll(page);
        await page.evaluate(() => (window as unknown as { __download: (r: string) => void }).__download("offline"));
        await ui(status).toHaveText(f.error("offline"));
        await ui(remoteRow).toContainText(f.error("offline"));
        const retry = remoteRow.getByRole("button", { name: f.retryFile("Remote.pdf") });
        await ui(retry).toHaveText(f.retry);
        await target(retry, width);
        await retry.click();
        await page.evaluate(() => (window as unknown as { __download: (r: string) => void }).__download("ok"));
        await ui(status).toHaveText(f.downloaded("Remote.pdf"));
        const downloaded = files.getByRole("listitem").filter({ hasText: "Remote.pdf" });
        await ui(downloaded).not.toContainText(f.notDownloaded);
        await ui(downloaded.getByRole("button", { name: f.downloadFile("Remote.pdf") })).toHaveCount(0);

        // A local file too large to sync, then storage full: each said in words.
        await page.evaluate((localId) => {
          const hooks = (window as unknown as { __syncFiles: Hooks }).__syncFiles;
          hooks.publish({ states: { [localId]: { state: "too-large" } } });
        }, ids.localId);
        await ui(localRow).toContainText(f.tooLarge("10 MB"));
        await page.evaluate((localId) => {
          const hooks = (window as unknown as { __syncFiles: Hooks }).__syncFiles;
          hooks.publish({ states: { [localId]: { state: "quota" } } });
        }, ids.localId);
        await ui(localRow).toContainText(f.full);
        await noSidewaysScroll(page);

        // Removing a file never downloaded here: asked first, with the all-devices sentence.
        const otherRow = files.getByRole("listitem").filter({ hasText: "Other.txt" });
        await otherRow.getByRole("button", { name: p.removeFile("Other.txt") }).click();
        const confirm = page.locator("dialog.confirm-dialog");
        await ui(confirm.getByText(f.removeText)).toBeVisible();
        await ui(confirm.getByRole("button", { name: p.cancel })).toBeFocused();
        await confirm.getByRole("button", { name: p.remove, exact: true }).click();
        await ui(status).toHaveText(p.fileRemoved);
        await ui(files.getByRole("listitem").filter({ hasText: "Other.txt" })).toHaveCount(0);
        expect(await page.evaluate(() => (window as unknown as { __removed: string[] }).__removed)).toEqual([otherId]);
        // No always-present status role was added by the file states.
        expect(await panel.getByRole("status").count()).toBe(0);
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 150_000);
