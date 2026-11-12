// When to search in the real app (docs/when-to-search-20261112.md): the one-tap suggestion
// shows the exact masked text and sends only that; Send alone searches nothing; automatic
// search is off by default, remembered on the device, and shows what it sent.
// Offline: a Vite plugin replaces src/inference.ts, and the research routes are faked.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { workspaceControl } from "../evaluation/workspace-navigation";

it("suggests a one-tap search with the masked text, never searches on Send alone, and offers an opt-in automatic search", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-when-to-search-ui-test",
    plugins: [
      {
        name: "synthetic-when-to-search",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            const sources = c.attachments.filter(a => a.selected).flatMap(a => a.sources);
            (window.__sent ??= []).push({ question: c.messages.filter(m => m.role === "user").at(-1).text, sources: sources.length });
            chunk(sources.length ? "Synthetic answer from the results [synthetic-01]." : "Synthetic answer from training data.");
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
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const searches: unknown[] = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "SYNTHETIC",
            inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 20000 } },
            search: true,
          },
        });
      if (url.pathname === "/api/research/prepare") {
        searches.push(route.request().postDataJSON());
        return route.fulfill({ json: { id: "s".repeat(48) } });
      }
      if (url.pathname === "/api/research/execute")
        return route.fulfill({
          json: {
            sources: [
              {
                id: `synthetic-0${searches.length}`,
                title: "Synthetic official page",
                text: "Search excerpt only (full page not fetched): synthetic fee 10 EUR.",
                url: "https://www.example.gov/fees",
                retrievedAt: new Date().toISOString(),
                evidenceKind: "search-excerpt",
              },
            ],
            topPage: { url: "https://www.example.gov/fees", outcome: "read" },
          },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const setting = () =>
      page.getByLabel("Search automatically when a question needs current information");

    // Automatic search: off by default, remembered on this device only, switched off again here.
    await workspaceControl(page, "Research").click();
    await ui(setting()).not.toBeChecked();
    await setting().check();
    expect(await page.evaluate(() => localStorage.getItem("privateai.autoSearch"))).toBe("on");
    await page.reload();
    await workspaceControl(page, "Research").click();
    await ui(setting()).toBeChecked();
    await setting().uncheck();
    expect(await page.evaluate(() => localStorage.getItem("privateai.autoSearch"))).toBeNull();
    await workspaceControl(page, "Conversation").click();

    const message = page.getByLabel("Message CometRow");
    const suggestion = page.getByRole("region", { name: "Search suggestion" });
    const send = page.getByRole("button", { name: "Send ↑", exact: true });

    // Timeless question: no suggestion.
    await message.fill("Explain recursion");
    await ui(suggestion).toHaveCount(0);

    // Time-sensitive question: the exact masked text is shown. Send alone searches nothing.
    await message.fill("What is the current fee for transfers, mail max.mustermann@example.com");
    await ui(suggestion).toContainText("This question may need current information.");
    await ui(suggestion.locator("pre")).toHaveText(
      "What is the current fee for transfers, mail [email address removed]",
    );
    await ui(suggestion).toContainText(
      "Removed from the search text before approval: 1 email address.",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await send.click();
    await ui(page.locator("article.assistant").last()).toContainText(
      "Synthetic answer from training data.",
    );
    expect(searches).toEqual([]);

    // One tap runs exactly the shown text, then answers from the results.
    await message.fill("Wer ist Bundeskanzler?");
    await suggestion.getByRole("button", { name: "Search and answer" }).click();
    await ui(page.locator("article.assistant").last()).toContainText(
      "Synthetic answer from the results",
    );
    expect(searches).toEqual([{ kind: "search", value: "Wer ist Bundeskanzler?" }]);
    await ui(
      page.getByRole("status").filter({ hasText: 'Searched the web for: "Wer ist Bundeskanzler?"' }),
    ).toContainText(
      "Our server also opened the top official result and read its text: https://www.example.gov/fees",
    );

    // Switched on: Send on a detected question searches the masked text first and shows it.
    await workspaceControl(page, "Research").click();
    await setting().check();
    await workspaceControl(page, "Conversation").click();
    await message.fill("Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com");
    await send.click();
    await ui(
      page.getByRole("status").filter({ hasText: "Searched the web automatically for:" }),
    ).toContainText('"Wie hoch ist der Mindestlohn? Mail [email address removed]"');
    expect(searches.at(-1)).toEqual({
      kind: "search",
      value: "Wie hoch ist der Mindestlohn? Mail [email address removed]",
    });
    // A timeless question is not searched even with the setting on.
    await ui(page.locator("article.assistant")).toHaveCount(3);
    const before = searches.length;
    await message.fill("Explain recursion");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(4);
    expect(searches.length).toBe(before);
    expect(
      (await page.evaluate(() => (window as unknown as { __sent: { question: string; sources: number }[] }).__sent)).map(
        (sent) => [sent.question, sent.sources],
      ),
    ).toEqual([
      ["What is the current fee for transfers, mail max.mustermann@example.com", 0],
      ["Wer ist Bundeskanzler?", 1],
      ["Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com", 2],
      ["Explain recursion", 2],
    ]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
