import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
type FixtureWindow = Window & {
  fixtureCalls: Array<Array<{ role: string; content: string }>>;
  fixturePending: boolean;
};
import { createServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("real conversation UI stops partial output, retries explicitly, preserves source evidence and clears late work", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-chat-ui-test",
    plugins: [
      {
        name: "TEST-only-chat-transport",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `
        import { composeContext } from '/src/conversation.ts';
        import { IncompleteReplyError } from '/src/reply-stream.ts';
        export async function streamReply(c, qualification, csrf, signal, chunk, status) {
          window.fixtureCalls ??= [];
          window.fixtureCalls.push(composeContext(c, 20000));
          status('TEST synthetic response');
          if (window.fixtureMode === 'stall') {
            window.fixturePending = true;
            chunk('TEST_PARTIAL');
            await new Promise(resolve => { if(signal.aborted) resolve(); else signal.addEventListener('abort', resolve, {once:true}); });
            await new Promise(resolve => setTimeout(resolve, 30));
            chunk('TEST_LATE_OUTPUT'); status('TEST_LATE_STATUS');
            window.fixturePending = false;
            throw new IncompleteReplyError('TEST interrupted response');
          }
          const source=c.attachments[0]?.sources[0];
          chunk('TEST complete answer' + (source ? ' ['+source.id+']' : ''));
          return {input:2,output:3,total:5,estimatedUSD:0};
        }
      `;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  const external: string[] = [];
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== origin || request.method() !== "GET") {
        external.push(request.url());
        return route.abort();
      }
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "TEST_ONLY",
            inference: { ready: true, reason: "TEST TRANSPORT ONLY" },
            search: false,
          },
        });
      return route.continue();
    });
    await page.goto(origin);
    const tab = (name: string) =>
      page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name, exact: false });
    await tab("Context").click();
    await page.getByLabel("Add documents or screenshots").setInputFiles({
      name: "synthetic-source.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("ORIGINAL SYNTHETIC SOURCE: 95 EUR"),
    });
    await ui(page.locator("details summary")).toBeVisible();
    await tab("Conversation").click();
    await page.evaluate(() => Object.assign(window, { fixtureMode: "stall" }));
    await page
      .getByLabel("Message PrivateAI")
      .fill("TEST question with a source");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(page.getByText("TEST_PARTIAL", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await ui(
      page.getByText("Response stopped.", { exact: false }),
    ).toBeVisible();
    await ui(page.getByText("TEST_LATE_OUTPUT", { exact: false })).toHaveCount(
      0,
    );
    await ui(page.getByText("TEST_LATE_STATUS", { exact: false })).toHaveCount(
      0,
    );
    expect(
      await page.evaluate(
        () => (window as unknown as FixtureWindow).fixtureCalls.length,
      ),
    ).toBe(1);
    await page.evaluate(() =>
      Object.assign(window, { fixtureMode: "complete" }),
    );
    await page
      .getByRole("button", { name: "Retry last turn explicitly", exact: false })
      .click();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await ui(
      page.getByText("TEST complete answer", { exact: false }),
    ).toBeVisible();
    const calls = await page.evaluate(
      () =>
        (window as unknown as FixtureWindow).fixtureCalls as Array<
          Array<{ role: string; content: string }>
        >,
    );
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls[1])).not.toContain("TEST_PARTIAL");
    expect(
      calls[1].filter((m) => m.content === "TEST question with a source"),
    ).toHaveLength(1);
    await tab("Context").click();
    await page.locator("details summary").click();
    await page
      .getByLabel("Text for synthetic-source.txt", { exact: true })
      .fill("CORRECTED SYNTHETIC SOURCE: 90 EUR");
    await tab("Conversation").click();
    await page
      .getByRole("button", { name: "synthetic-source.txt", exact: true })
      .click();
    await ui(page.getByRole("dialog")).toContainText(
      "ORIGINAL SYNTHETIC SOURCE: 95 EUR",
    );
    await page
      .getByRole("button", { name: "Close source", exact: true })
      .click();
    await page
      .getByLabel("Message PrivateAI")
      .fill("TEST follow-up correction");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(page.locator("article.assistant")).toHaveCount(2);
    await ui(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toHaveCount(0);
    const followup = await page.evaluate(
      () =>
        (window as unknown as FixtureWindow).fixtureCalls[2] as Array<{
          role: string;
          content: string;
        }>,
    );
    expect(
      followup.some(
        (m) =>
          m.role === "assistant" && m.content.includes("TEST complete answer"),
      ),
    ).toBe(true);
    expect(JSON.stringify(followup)).toContain("CORRECTED SYNTHETIC SOURCE");
    await page
      .getByRole("button", { name: "Edit into a new branch" })
      .first()
      .click();
    await page
      .getByLabel("Edited message")
      .fill("TEST revised original question");
    await page
      .getByRole("button", { name: "Create branch", exact: true })
      .click();
    await ui(page.locator("article.assistant")).toHaveCount(0);
    await page
      .getByLabel("Message PrivateAI")
      .fill("TEST continue revised branch");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(
      page.getByRole("button", { name: "Stop", exact: true }),
    ).toHaveCount(0);
    const branch = await page.evaluate(
      () =>
        (window as unknown as FixtureWindow).fixtureCalls[3] as Array<{
          role: string;
          content: string;
        }>,
    );
    expect(
      branch.some((m) => m.content === "TEST revised original question"),
    ).toBe(true);
    expect(branch.some((m) => m.role === "assistant")).toBe(false);
    expect(JSON.stringify(branch)).not.toContain("TEST follow-up correction");
    await page.evaluate(() => Object.assign(window, { fixtureMode: "stall" }));
    await page
      .getByLabel("Message PrivateAI")
      .fill("TEST clear during response");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(page.getByText("TEST_PARTIAL", { exact: true })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "New conversation", exact: false })
      .click();
    await ui(page.locator("article.message")).toHaveCount(0);
    // Wait on the fixture's actual delayed callback, not a timing guess.
    await page.waitForFunction(
      () => !(window as unknown as FixtureWindow).fixturePending,
    );
    await ui(page.getByText("TEST_LATE_OUTPUT", { exact: false })).toHaveCount(
      0,
    );
    await ui(page.getByText("TEST_LATE_STATUS", { exact: false })).toHaveCount(
      0,
    );
    await tab("Saved").click();
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic recovery test passphrase");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await ui(
      page.getByRole("button", { name: "Lock and clear workspace" }),
    ).toBeVisible();
    await tab("Conversation").click();
    await page
      .getByLabel("Message PrivateAI")
      .fill("TEST lock during response");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(page.getByText("TEST_PARTIAL", { exact: true })).toBeVisible();
    await tab("Saved").click();
    await page
      .getByRole("button", { name: "Lock and clear workspace" })
      .click();
    await page.waitForFunction(
      () => !(window as unknown as FixtureWindow).fixturePending,
    );
    await tab("Conversation").click();
    await ui(page.locator("article.message")).toHaveCount(0);
    await ui(page.getByText("TEST_LATE_STATUS", { exact: false })).toHaveCount(
      0,
    );
    await ui(page.getByText("Local vault unlocked")).toHaveCount(0);
    expect(external).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 60000);
