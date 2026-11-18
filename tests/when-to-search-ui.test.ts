// When to search in the real app (docs/when-to-search-20261112.md; owner, 18 November: no card):
// with automatic search off a time-sensitive question is simply sent, nothing asks and nothing is
// searched; "+" > "Search the web" searches the masked typed text on Send; automatic search is off
// by default, remembered on the device, and shows what it sent.
// Offline: a Vite plugin replaces src/inference.ts, and the research routes are faked.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { workspaceControl } from "../evaluation/workspace-navigation";

it("sends a time-sensitive question without a card or a search, searches the masked text from the + menu, and offers an opt-in automatic search", async () => {
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
            topPage: { url: "https://www.example.gov/fees", outcome: "read", official: true },
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
    const send = page.getByRole("button", { name: "Send message", exact: true });
    const noCard = async () => {
      await ui(suggestion).toHaveCount(0);
      await ui(page.getByRole("button", { name: /^Search and answer/ })).toHaveCount(0);
    };

    // Timeless question: no card.
    await message.fill("Explain recursion");
    await noCard();

    // Time-sensitive question, automatic search off: no card, Send answers at once without a search.
    await message.fill("Who is the current CEO of Siemens, mail max.mustermann@example.com");
    await noCard();
    await send.click();
    await ui(page.locator("article.assistant").last()).toContainText(
      "Synthetic answer from training data.",
    );
    expect(searches).toEqual([]);
    // After that answer (no web results) nothing offers a search either.
    await noCard();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // "+" > "Search the web": Send searches exactly the masked typed text once, then answers from
    // the results; no card. The chat message itself is the question as typed.
    const tools = page.getByLabel("Attachments and tools", { exact: true });
    const armed = page.locator(".search-next");
    await tools.click();
    await page.locator(".tools-menu").getByRole("button", { name: "Search the web", exact: true }).click();
    await ui(armed).toHaveText(/Your next message searches the web first\./);
    await message.fill("Wer ist Bundeskanzler? Mail max.mustermann@example.com");
    await send.click();
    await ui(page.locator("article.assistant").last()).toContainText(
      "Synthetic answer from the results",
    );
    expect(searches).toEqual([{ kind: "search", value: "Wer ist Bundeskanzler? Mail [email address removed]" }]);
    await ui(
      page.getByRole("status").filter({ hasText: 'Searched the web for: "Wer ist Bundeskanzler? Mail [email address removed]"' }),
    ).toContainText(
      "Our server also opened the top official result and read its text: https://www.example.gov/fees",
    );
    await noCard();
    await ui(armed).toHaveCount(0);
    // Armed with a text too short to search: it is sent without a search.
    await tools.click();
    await page.locator(".tools-menu").getByRole("button", { name: "Search the web", exact: true }).click();
    await message.fill("x");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(3);
    await ui.poll(() => page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent.length)).toBe(3);
    expect(searches).toHaveLength(1);
    await noCard();

    // Switched on: Send on a detected question searches the masked text first and shows it.
    await workspaceControl(page, "Research").click();
    await setting().check();
    await workspaceControl(page, "Conversation").click();
    await message.fill("Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com");
    await send.click();
    await ui(
      page.getByRole("status").filter({ hasText: "Searched the web automatically for:" }),
    ).toContainText('"Wie hoch ist der Mindestlohn? Mail [email address removed] Deutschland"');
    expect(searches.at(-1)).toEqual({
      kind: "search",
      value: "Wie hoch ist der Mindestlohn? Mail [email address removed] Deutschland",
    });
    await noCard();
    // A timeless question is not searched even with the setting on.
    await ui(page.locator("article.assistant")).toHaveCount(4);
    const before = searches.length;
    await message.fill("Explain recursion");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(5);
    // The reply placeholder can appear before the send is recorded; wait for the fifth send.
    await ui.poll(() => page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent.length)).toBe(5);
    expect(searches.length).toBe(before);
    expect(
      (await page.evaluate(() => (window as unknown as { __sent: { question: string; sources: number }[] }).__sent)).map(
        (sent) => [sent.question, sent.sources],
      ),
    ).toEqual([
      ["Who is the current CEO of Siemens, mail max.mustermann@example.com", 0],
      // Searched with the masked text; the question is sent as typed.
      ["Wer ist Bundeskanzler? Mail max.mustermann@example.com", 1],
      ["x", 1],
      ["Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com", 2],
      ["Explain recursion", 2],
    ]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
