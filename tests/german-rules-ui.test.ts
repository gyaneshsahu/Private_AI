// German rules in the real app (docs/german-rules-20261113.md): a German-rules question gets the
// one-tap search with its own heading even when it is not time-sensitive; an answer without web
// results that states figures gets the warning and the "Search and answer again" box; the answer
// from approved results gets no warning. Offline: a Vite plugin replaces src/inference.ts.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("suggests the official source first, warns about unchecked figures, and offers the search again", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-german-rules-ui-test",
    plugins: [
      {
        name: "synthetic-german-rules",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            const sources = c.attachments.filter(a => a.selected).flatMap(a => a.sources);
            chunk(sources.length ? "Synthetic: drei Monate [synthetic-01]." : "Synthetic: drei Monate (§ 573c BGB).");
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
                id: "synthetic-01",
                title: "Synthetic official page",
                text: "Search excerpt only (full page not fetched): synthetic rule.",
                url: "https://www.example.gov/rule",
                retrievedAt: new Date().toISOString(),
                evidenceKind: "search-excerpt",
              },
            ],
            topPage: { url: "https://www.example.gov/rule", outcome: "read", official: true },
          },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const message = page.getByLabel("Message CometRow");
    const suggestion = page.getByRole("region", { name: "Search suggestion" });
    const question = "Welche Kündigungsfrist habe ich als Mieter bei einem unbefristeten Mietvertrag?";

    // Not time-sensitive, but about German rules: the suggestion shows with its own heading.
    await message.fill(question);
    await ui(suggestion).toContainText("Rules, fees and deadlines change. Check the official source first:");
    await ui(suggestion.locator("pre")).toHaveText(question);
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();

    // Answered without web results and with figures: the warning and the search-again box.
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    await ui(answer.locator(".arithmetic-check")).toHaveText(
      "This answer gives figures or deadlines that were not checked against an official source.",
    );
    await ui(suggestion).toContainText("This answer did not use current information.");
    expect(searches).toEqual([]);
    await suggestion.getByRole("button", { name: "Search and answer again" }).click();

    // The answer from the approved results replaces it, without the warning.
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic: drei Monate");
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveCount(0);
    expect(await page.locator("article.assistant").count()).toBe(1);
    expect(searches).toEqual([{ kind: "search", value: question }]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
