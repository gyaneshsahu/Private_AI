import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("reviews and changes bounded context in the actual workspace, preserves encrypted selections and never sends them", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-context-review",
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No listener");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  const unexpected: string[] = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultTimeout(5000);
    page.on("dialog", (dialog) => void dialog.accept());
    await page.route("**/*", (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== origin || request.method() !== "GET") {
        unexpected.push(request.url());
        return route.abort();
      }
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "synthetic",
            search: false,
            inference: {
              ready: false,
              reason: "Synthetic offline context test",
              qualification: { maxInputCharacters: 6000 },
            },
          },
        });
      return route.continue();
    });
    await page.goto(origin);
    await page.evaluate(`(async () => {
      const { Vault } = await import('/src/vault.ts');
      const { emptyConversation } = await import('/shared/contracts.ts');
      const { newMessage } = await import('/src/conversation.ts');
      const vault = new Vault();
      await vault.unlock('synthetic context review passphrase');
      const c = emptyConversation(); c.title = 'Synthetic context review'; c.draft = 'Preserve this unsent question';
      c.messages = [newMessage('user', 'Earlier date: June 3'), newMessage('user', 'Correction: June 4'), {...newMessage('assistant', 'INCOMPLETE CANARY'),status:'partial'}];
      c.attachments = [{id:'doc',name:'SYNTHETIC long notes.txt',selected:true,sources:[{id:'s1',title:'Notes',text:'SYNTHETIC '.repeat(1000)}]}];
      await vault.save(c); vault.close();
    })()`);
    await page.reload();
    const tab = (name: string) =>
      page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name, exact: false });
    await tab("Saved").click();
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic context review passphrase");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await page
      .getByRole("article", { name: "Synthetic context review" })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await tab("Conversation").click();
    const summary = page.locator(".context-review summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const review = page.locator(".context-review");
    await ui(review).toContainText("Over the sending limit by");
    const partial = review.getByRole("checkbox", { name: /INCOMPLETE CANARY/ });
    await ui(partial).not.toBeChecked();
    await ui(partial).toBeDisabled();
    await review
      .getByRole("checkbox", { name: /SYNTHETIC long notes/ })
      .uncheck();
    await review.getByRole("checkbox", { name: /Earlier date/ }).uncheck();
    await ui(review).not.toContainText("Over the sending limit by");
    await ui(summary).toContainText("1 messages · 0 source passages");
    await ui(page.getByLabel("Message PrivateAI")).toHaveValue(
      "Preserve this unsent question",
    );
    await tab("Saved").click();
    await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
    await ui(
      page.getByText("No unsaved workspace changes.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lock and clear workspace" })
      .click();
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic context review passphrase");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await page
      .getByRole("article", { name: "Synthetic context review" })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await tab("Conversation").click();
    await page.locator(".context-review summary").click();
    await ui(
      review.getByRole("checkbox", { name: /Earlier date/ }),
    ).not.toBeChecked();
    await ui(
      review.getByRole("checkbox", { name: /Correction/ }),
    ).toBeChecked();
    await page.addStyleTag({ content: "html { font-size: 30px !important; }" });
    const overflowing = await page.evaluate(() =>
      Array.from(document.querySelectorAll("body *"))
        .filter(
          (element) => element.getBoundingClientRect().right > innerWidth + 1,
        )
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          text: element.textContent?.slice(0, 80),
          right: element.getBoundingClientRect().right,
        }))
        .slice(0, 12),
    );
    expect(overflowing).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 25000);
