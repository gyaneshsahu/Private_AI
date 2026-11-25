// Projects with instructions and files (docs/projects-20261114.md) in a real browser at phone,
// tablet and desktop width, in English and German: the project screen and its flows.
// Offline: a Vite plugin replaces src/inference.ts (it records what would be sent), the status is
// faked, and the vault is the browser's own storage. Nothing here is live provider evidence.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { appText } from "../src/text/app";
import { projectText } from "../src/text/projects";
import { workspaceText } from "../src/text/workspace";
import { answerQuestions } from "./fixtures/app-questions";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const WIDTHS = [375, 768, 1280];
const LANGS = ["en", "de"] as const;

async function serve(on: boolean) {
  // A build setting (src/device-features.ts): on for this server only.
  if (on) process.env.VITE_PROJECTS = "1";
  else delete process.env.VITE_PROJECTS;
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: `node_modules/.vite-projects-ui-test${on ? "" : "-off"}`,
    plugins: [
      {
        name: "synthetic-answer",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // Records the whole outgoing request as the real path composes it (before masking).
          return `import { composeContext, withChosenPassages } from "./conversation";
          export async function streamReply(c,q,csrf,signal,chunk){
            (window.__sent ??= []).push(JSON.stringify(composeContext(withChosenPassages(c), 100000)));
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
  delete process.env.VITE_PROJECTS;
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
          inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 20000 } },
          search: false,
        },
      });
    return route.continue();
  });
  // window.confirm (leaving an unsaved chat) is accepted.
  await answerQuestions(page);
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
    project: "Tenancy dispute",
    renamed: "Tenancy 2026",
    instructions: "Always cite the clause of the tenancy agreement. I am the tenant.",
    question: "How long is my notice period?",
    again: "And for the deposit?",
    incognito: "What is a deposit?",
  },
  de: {
    project: "Mietstreit",
    renamed: "Mietstreit 2026",
    instructions: "Nenne immer die Klausel des Mietvertrags. Ich bin der Mieter.",
    question: "Wie lange ist meine Kündigungsfrist?",
    again: "Und für die Kaution?",
    incognito: "Was ist eine Kaution?",
  },
};
const BLOCK = "[Instructions the user wrote for every chat in this project.";
// Synthetic, in both languages, so one file answers the English and the German question.
const LEASE = `Tenancy agreement (synthetic)\n\n§ 5 Kündigung. Die Kündigungsfrist für den Mieter beträgt drei Monate. Notice period for the tenant: three months.\n\n§ 7 Haustiere. Kleintiere sind erlaubt.\n`;

for (const width of WIDTHS)
  for (const lang of LANGS)
    it(`${width} px, ${lang}: project screen, instructions sent and noted, moved out, incognito, rename, delete`, async () => {
      const a = appText[lang];
      const p = projectText[lang];
      const w = workspaceText[lang];
      const x = WORDS[lang];
      const { page, outside } = await open(origin, width, lang);
      const menu = page.locator(".conversation-menu");
      const input = page.getByLabel(a.messageInput);
      const send = page.getByRole("button", { name: a.sendLabel, exact: true });
      const panel = page.locator("dialog.project-dialog");
      const openMenu = async () => {
        if ((await menu.getAttribute("open")) === null) await menu.locator("summary").click();
      };
      const sidebar = async () => {
        if (!(await page.getByRole("button", { name: w.createProject, exact: true }).isVisible()))
          await page.getByRole("button", { name: a.openNavigation }).click();
      };
      // The sidebar row itself opens the project screen (FE-08).
      const projectRow = (name: string) => page.locator(".project-list .project-row").filter({ hasText: name });
      const openProject = async (name: string) => {
        await sidebar();
        await projectRow(name).locator(":scope > button").click();
        await ui(panel.getByRole("heading", { name, exact: true })).toBeFocused();
      };
      const ask = async (text: string, index: number) => {
        await input.fill(text);
        await send.click();
        await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer.");
        await ui.poll(async () => (await sent(page)).length).toBe(index + 1);
        return (await sent(page))[index];
      };
      try {
        // Create the vault and a project.
        await openMenu();
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic projects ui passphrase");
        await page.getByRole("button", { name: a.createOrUnlock }).click();
        await ui(page.getByRole("button", { name: a.lockAndClear })).toBeVisible();
        await sidebar();
        await page.getByRole("button", { name: w.createProject, exact: true }).click();
        await page.getByLabel(w.projectName, { exact: true }).fill(x.project);
        await page.getByRole("button", { name: w.create, exact: true }).click();
        await ui(page.getByText(a.projectCreated)).toBeVisible();

        // The project screen opens right after Create: no chats yet, instructions with a counter and a cap said in words.
        await ui(panel.getByRole("heading", { name: x.project, exact: true })).toBeFocused();
        await ui(panel.getByText(p.noChats)).toBeVisible();
        const field = panel.getByRole("textbox", { name: p.instructions, exact: true });
        const save = panel.getByRole("button", { name: p.saveInstructions });
        await ui(save).toBeDisabled();
        await field.fill("x".repeat(2001));
        await ui(panel.getByText(p.problem("long"))).toBeVisible();
        await ui(save).toBeDisabled();
        await field.fill(x.instructions);
        await ui(panel.getByText(p.length(x.instructions.length, 2000))).toBeVisible();
        await target(save, width);
        await save.click();
        await ui(panel.locator(".project-status")).toHaveText(p.instructionsSaved);
        await ui(save).toBeDisabled();
        for (const name of [p.newChat, p.rename, p.delete, p.close, p.addFile])
          await target(panel.getByRole("button", { name, exact: true }), width);
        // A file, read on this device: listed with its size; pictures are not offered.
        await ui(panel.getByText(p.noFiles)).toBeVisible();
        const picker = panel.locator('input[type="file"]');
        expect(await picker.getAttribute("accept")).not.toMatch(/png|jpe?g/);
        await picker.setInputFiles({ name: "mietvertrag.txt", mimeType: "text/plain", buffer: Buffer.from(LEASE) });
        await ui(panel.locator(".project-status")).toHaveText(p.fileAdded("mietvertrag.txt"));
        const files = panel.getByRole("list", { name: p.files });
        await ui(files.getByRole("listitem")).toHaveCount(1);
        await ui(files).toContainText("mietvertrag.txt");
        await ui(files).toContainText(p.fileSize("").trim());
        await target(files.getByRole("button", { name: p.removeFile("mietvertrag.txt") }), width);
        // The same name again is refused.
        await picker.setInputFiles({ name: "mietvertrag.txt", mimeType: "text/plain", buffer: Buffer.from(LEASE) });
        await ui(panel.locator(".project-status")).toHaveText(p.problem("duplicate"));
        await noSidewaysScroll(page);
        // Escape closes the screen.
        await page.keyboard.press("Escape");
        await ui(panel).toHaveCount(0);
        // The sidebar row keeps its "…" on its own line, beside the name.
        await sidebar();
        const button = (await projectRow(x.project).locator(":scope > button").boundingBox())!;
        const more = (await projectRow(x.project).locator("summary").boundingBox())!;
        expect(more.y).toBeGreaterThanOrEqual(button.y - 1);
        expect(more.y + more.height).toBeLessThanOrEqual(button.y + button.height + 1);
        expect(more.x).toBeGreaterThanOrEqual(button.x + button.width - 1);
        await target(projectRow(x.project).locator("summary"), width);

        // New chat in this project: the instructions go in front of the question, and the answer says so.
        await openProject(x.project);
        await panel.getByRole("button", { name: p.newChat }).click();
        await ui(panel).toHaveCount(0);
        await ui(page.locator(".project-breadcrumb")).toHaveText(x.project);
        const first = await ask(x.question, 0);
        expect(first).toContain(BLOCK);
        expect(first).toContain(`${x.instructions}\\n[End of project instructions]\\n\\n${x.question}`);
        const note = page.locator("article.assistant").last().locator(".project-used");
        await ui(note).toHaveText(p.instructionsSent);
        // The matching passage of the project file went with it, and the answer names the file.
        expect(first).toContain("Notice period for the tenant: three months");
        await ui(page.locator("article.assistant").last().locator(".passages-used")).toContainText("mietvertrag.txt");
        await noSidewaysScroll(page);
        // The context review counts the instructions for the next question.
        await input.fill(x.again);
        await openMenu();
        await menu.getByRole("button", { name: a.includedContext }).click();
        const row = page.getByRole("row", { name: new RegExp(p.contextRow) });
        await ui(row).toBeVisible();
        expect(Number((await row.getByRole("cell").textContent())!.replace(/\D/g, ""))).toBeGreaterThan(
          x.instructions.length,
        );
        await page.keyboard.press("Escape");
        await input.fill("");

        // Save the chat; the project screen lists it and opens it.
        await openMenu();
        await menu.getByRole("button", { name: a.renameSave }).click();
        await page.getByRole("button", { name: a.saveSnapshot, exact: true }).click();
        await ui(page.getByText(a.snapshotSaved)).toBeVisible();
        await openProject(x.project);
        // Remove the file (asked first); it is no longer used, and the earlier answer stays as it was.
        await panel.getByRole("button", { name: p.removeFile("mietvertrag.txt") }).click();
        const removeConfirm = page.locator("dialog.confirm-dialog");
        await ui(removeConfirm.getByRole("button", { name: p.cancel })).toBeFocused();
        await removeConfirm.getByRole("button", { name: p.remove, exact: true }).click();
        await ui(panel.locator(".project-status")).toHaveText(p.fileRemoved);
        await ui(panel.getByText(p.noFiles)).toBeVisible();
        const chat = panel.locator(".project-chats button").first();
        await ui(chat).toContainText(x.question);
        // Rename the chat in place (owner, 25 November): Escape keeps the name and the screen, Enter saves.
        const pencil = panel.locator(".project-chat-rename").first();
        const renameField = panel.locator(".project-chats .chat-rename");
        await target(pencil, width);
        await pencil.click();
        await ui(renameField).toBeFocused();
        await renameField.fill("Discarded 2026");
        await renameField.press("Escape");
        await ui(panel).toBeVisible();
        await ui(chat).toContainText(x.question);
        await ui(pencil).toBeFocused();
        await pencil.click();
        await renameField.fill("Lease 2026");
        await renameField.press("Enter");
        await ui(chat).toContainText("Lease 2026");
        // Back to the first name, which the rest of this journey looks for.
        await pencil.click();
        await renameField.fill(x.question);
        await renameField.press("Enter");
        await ui(chat).toContainText(x.question);
        await target(chat, width);
        await chat.click();
        await ui(panel).toHaveCount(0);
        await ui(page.locator("article.assistant")).toHaveCount(1);
        const after = await ask(x.question, 1);
        expect(after).toContain(BLOCK);
        expect(after).not.toContain("Notice period for the tenant");
        await ui(page.locator("article.assistant").first().locator(".passages-used")).toContainText("mietvertrag.txt");

        // Moved out of the project from the sidebar: the next question carries no instructions.
        await sidebar();
        await page.getByRole("button", { name: w.recent, exact: true }).click();
        await page.getByLabel(w.chatActions(x.question), { exact: true }).click();
        await page.getByLabel(w.projectFor(x.question), { exact: true }).selectOption("");
        await ui(page.getByText(a.organized)).toBeVisible();
        if (width < 760) await page.getByRole("button", { name: w.closeNavigation }).click();
        await ui(page.locator(".project-breadcrumb")).toHaveCount(0);
        const moved = await ask(x.again, 2);
        expect(moved).not.toContain(BLOCK);
        expect(moved).not.toContain(x.instructions);
        await ui(page.locator("article.assistant").last().locator(".project-used")).toHaveCount(0);

        // Incognito: nothing from the project.
        await sidebar();
        await page.getByRole("button", { name: w.newIncognito }).click();
        const incognito = await ask(x.incognito, 3);
        expect(incognito).not.toContain(x.instructions);

        // Rename from the project screen.
        await openProject(x.project);
        await panel.getByRole("button", { name: p.rename, exact: true }).click();
        const name = panel.getByLabel(p.nameLabel, { exact: true });
        await ui(name).toBeFocused();
        await name.fill(x.renamed);
        await panel.getByRole("button", { name: p.saveName }).click();
        await ui(panel.getByRole("heading", { name: x.renamed, exact: true })).toBeVisible();
        await ui(panel.locator(".project-status")).toHaveText(p.renamed);
        // The instructions are still there.
        await ui(panel.getByRole("textbox", { name: p.instructions, exact: true })).toHaveValue(x.instructions);

        // Delete asks first, focus on Cancel; with no chats there is no choice to make.
        await panel.getByRole("button", { name: p.delete, exact: true }).click();
        const confirm = page.locator("dialog.confirm-dialog");
        await ui(confirm.getByRole("heading", { name: p.deleteTitle(x.renamed) })).toBeVisible();
        await ui(confirm.getByRole("button", { name: p.cancel })).toBeFocused();
        await ui(confirm.getByRole("radio")).toHaveCount(0);
        await page.keyboard.press("Escape");
        await ui(confirm).toHaveCount(0);
        // The confirmation closing does not close the project screen around it.
        await ui(panel).toBeVisible();
        await panel.getByRole("button", { name: p.close }).click();

        // Move the chat back in; deleting then offers the choice, keeping the chats by default.
        await sidebar();
        await page.getByRole("button", { name: w.recent, exact: true }).click();
        await page.getByLabel(w.chatActions(x.question), { exact: true }).click();
        await page.getByLabel(w.projectFor(x.question), { exact: true }).selectOption({ label: x.renamed });
        await ui(page.getByText(a.organized)).toBeVisible();
        if (width < 760) await page.getByRole("button", { name: w.closeNavigation }).click();
        await openProject(x.renamed);
        await panel.getByRole("button", { name: p.delete, exact: true }).click();
        const keep = confirm.getByRole("radio", { name: p.keepChats });
        await ui(keep).toBeChecked();
        await ui(confirm.getByRole("radio", { name: p.deleteChats(1) })).not.toBeChecked();
        await target(confirm.locator(".project-delete-choice label").first(), width);
        await noSidewaysScroll(page);
        await confirm.getByRole("button", { name: p.delete, exact: true }).click();
        await ui(panel).toHaveCount(0);
        await ui(page.getByText(a.projectRemoved)).toBeVisible();
        // The chat is kept, without a project.
        await sidebar();
        await page.getByRole("button", { name: w.recent, exact: true }).click();
        await ui(page.getByRole("button", { name: x.question, exact: true })).toBeVisible();
        await ui(page.getByLabel(w.projectActions(x.renamed), { exact: true })).toHaveCount(0);
        // Nothing but this page's own files and the faked status was requested.
        expect(outside).toEqual([]);
      } finally {
        await page.context().close();
      }
    }, 150_000);

it("with the switch off there is no project screen and no instructions are sent", async () => {
  const off = await serve(false);
  try {
    const { page } = await open(off.origin, 1280, "en");
    const a = appText.en;
    const w = workspaceText.en;
    const menu = page.locator(".conversation-menu");
    await menu.locator("summary").click();
    await menu.getByRole("button", { name: a.renameSave }).click();
    await page.getByLabel(a.passphrase, { exact: true }).fill("synthetic projects ui passphrase");
    await page.getByRole("button", { name: a.createOrUnlock }).click();
    await page.getByRole("button", { name: w.createProject, exact: true }).click();
    await page.getByLabel(w.projectName, { exact: true }).fill("Grouping only");
    await page.getByRole("button", { name: w.create, exact: true }).click();
    // The row only filters: no screen opens, after Create or on a click.
    const row = page.locator(".project-row > button").filter({ hasText: "Grouping only" });
    await row.click();
    await ui(row).toHaveAttribute("aria-pressed", "true");
    await ui(page.locator("dialog.project-dialog")).toHaveCount(0);
    await page.getByLabel(w.projectActions("Grouping only"), { exact: true }).click();
    await ui(page.getByRole("button", { name: w.renameProject })).toBeVisible();
    await ui(page.getByRole("button", { name: projectText.en.open })).toHaveCount(0);
    // Delete asks in the app's own dialog (no window.confirm): no chats, so no choice; the project goes.
    page.removeAllListeners("dialog");
    page.on("dialog", () => {
      throw Error("native dialog");
    });
    await page.getByRole("button", { name: projectText.en.delete, exact: true }).click();
    const confirm = page.locator("dialog.confirm-dialog");
    await ui(confirm).toContainText(w.deleteProjectKeeps);
    await ui(confirm.getByRole("radio")).toHaveCount(0);
    await confirm.getByRole("button", { name: projectText.en.delete, exact: true }).click();
    await ui(page.getByText(a.projectRemoved)).toBeVisible();
    await ui(page.locator(".project-row")).toHaveCount(0);
    await page.context().close();
  } finally {
    await off.server.close();
  }
}, 120_000);
