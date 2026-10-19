import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("keeps citations tied to captured evidence through correction, removal and encrypted reopen", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-source-history",
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No listener");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  const disclosures: string[] = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultTimeout(5000);
    page.on("dialog", (dialog) => void dialog.accept());
    await page.route("**/*", (route) => {
      if (
        new URL(route.request().url()).origin !== origin ||
        route.request().method() !== "GET"
      ) {
        disclosures.push(route.request().url());
        return route.abort();
      }
      if (new URL(route.request().url()).pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "synthetic",
            search: false,
            inference: { ready: false, reason: "Offline synthetic test" },
          },
        });
      return route.continue();
    });
    await page.goto(origin);
    await page.evaluate(`(async () => {
      const { Vault } = await import('/src/vault.ts');
      const { emptyConversation } = await import('/shared/contracts.ts');
      const { newMessage } = await import('/src/conversation.ts');
      const vault = new Vault(); await vault.unlock('synthetic source history passphrase');
      const c = emptyConversation(); c.title = 'Source history fixture';
      const s = { id:'source-1', title:'Synthetic notice', text:'Collection before 14:00', page:1 };
      c.attachments = [{id:'a1',name:'notice.txt',selected:true,sources:[s]}];
      c.messages = [{...newMessage('assistant','Earlier captured answer [source-1]'),sourceSnapshot:[structuredClone(s)]},newMessage('assistant','Legacy answer [source-1]')];
      await vault.save(c); vault.close();
    })()`);
    await page.reload();
    const tab = (name: string) =>
      page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name, exact: false });
    const unlock = async () => {
      await tab("Saved").click();
      await page
        .getByLabel("Vault passphrase")
        .fill("synthetic source history passphrase");
      await page
        .getByRole("button", { name: "Create or unlock vault" })
        .click();
      await page.getByRole("button", { name: "Open", exact: true }).click();
    };
    await unlock();
    await tab("Context").click();
    await page.locator("details summary").click();
    await page
      .getByLabel("Text for Synthetic notice page 1", { exact: true })
      .fill("Collection before 15:00");
    await ui(
      page.getByText("User-edited text. This is not", { exact: false }),
    ).toBeVisible();
    await tab("Conversation").click();
    const answers = page.locator("article.message.assistant");
    await ui(answers.nth(0)).toContainText("Reference material changed");
    await ui(answers.nth(1)).toContainText("no recorded source snapshot");
    await ui(answers.nth(1).locator("button.citation")).toHaveCount(0);
    await answers.nth(0).locator("button.citation").click();
    await ui(page.getByRole("dialog")).toContainText("Collection before 14:00");
    await ui(page.getByRole("dialog")).not.toContainText(
      "Collection before 15:00",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await answers
      .nth(0)
      .getByRole("checkbox", { name: "Include in context" })
      .uncheck();
    await tab("Saved").click();
    await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
    await ui(
      page.getByText("No unsaved workspace changes.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lock and clear workspace" })
      .click();
    await unlock();
    await tab("Context").click();
    await page.locator("details summary").click();
    await ui(
      page.getByLabel("Text for Synthetic notice page 1", { exact: true }),
    ).toHaveValue("Collection before 15:00");
    await ui(
      page.getByText("User-edited text. This is not", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await tab("Conversation").click();
    await ui(
      answers.nth(0).getByRole("checkbox", { name: "Include in context" }),
    ).not.toBeChecked();
    await answers.nth(0).locator("button.citation").click();
    await ui(page.getByRole("dialog")).toContainText("Collection before 14:00");
    expect(disclosures).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 25000);
