// German rules in the real app (docs/german-rules-20261113.md; owner, 18 November: nothing asks).
// A German-rules question with automatic search off is sent at once, with no "search first?" card
// and no search; an answer without web results that states figures gets the warning under it, and
// no search-again offer. "+" > "Search the web" searches the masked typed text on Send. Automatic
// search, or "Always search for rules, fees and deadlines" (Research tab), searches the masked
// question with the country first. With web results of which none is official, the page note and a
// note under the answer say so (official-source preference). Offline: a Vite plugin replaces src/inference.ts.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { workspaceControl } from "../evaluation/workspace-navigation";
import { appText } from "../src/text/app";
import { searchNextText } from "../src/text/search-next";

it("sends rules questions without asking, warns about unchecked figures, and searches only from the + menu or a setting", async () => {
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
            (window.__sent ??= []).push([c.messages.filter(m => m.role === "user").at(-1).text, sources.length]);
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
    // The result the synthetic search returns: an official page first, a non-official one later.
    let result = { url: "https://www.gesetze-im-internet.de/bgb/__573c.html", tier: "official" };
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
                url: result.url,
                retrievedAt: new Date().toISOString(),
                evidenceKind: "search-excerpt",
              },
            ],
            topPage: { url: result.url, outcome: "read", official: result.tier === "official", tier: result.tier },
          },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const message = page.getByLabel("Message CometRow");
    const suggestion = page.getByRole("region", { name: "Search suggestion" });
    const send = page.getByRole("button", { name: "Send message", exact: true });
    const noCard = async () => {
      await ui(suggestion).toHaveCount(0);
      await ui(page.getByRole("button", { name: /^Search and answer|^Answer without/ })).toHaveCount(0);
    };
    const sent = () => page.evaluate(() => (window as unknown as { __sent?: [string, number][] }).__sent ?? []);
    const question = "Welche Kündigungsfrist habe ich als Mieter bei einem unbefristeten Mietvertrag?";
    // The question names no country, so the automatic search text ends with one (14 November).
    const searched = `${question} Deutschland`;
    const warning = "This answer gives figures or deadlines that were not checked against an official source.";

    // A question that is not about rules sends directly.
    await message.fill("Explain recursion");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await expect.poll(sent).toEqual([["Explain recursion", 0]]);
    await page.reload();

    // Answer-side check: a rules question the detector misses is sent directly, and an answer
    // that states a law reference still gets the warning; nothing offers a search.
    // "Was darf mein Chef mir schenken?" is recognised since the German cues of 13 November.
    const missed = "Was ist bei Geschenken vom Chef zu beachten?";
    await message.fill(missed);
    await send.click();
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveText(warning);
    await noCard();
    expect(searches).toEqual([]);
    await page.reload();

    // About German rules, automatic search off: no card while typing, and Send answers at once
    // without a search. The answer states figures without web results: the warning, and no offer.
    await message.fill(question);
    await noCard();
    await send.click();
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    await ui(answer.locator(".arithmetic-check")).toHaveText(warning);
    await expect.poll(sent).toEqual([[question, 0]]);
    await noCard();
    await ui(page.getByLabel("Always search for rules, fees and deadlines")).toHaveCount(0);
    expect(searches).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // "+" > "Search the web": Send searches exactly the typed text, masked on this device (no
    // country added), then answers from the results without the warning. The question is sent as typed.
    await page.reload();
    const masked = "Wie hoch ist das Bußgeld innerorts bei 21 km/h zu schnell? Mail max.mustermann@example.com";
    const maskedSearch = "Wie hoch ist das Bußgeld innerorts bei 21 km/h zu schnell? Mail [email address removed]";
    await page.getByLabel(appText.en.tools, { exact: true }).click();
    await page.locator(".tools-menu").getByRole("button", { name: searchNextText.en.menu, exact: true }).click();
    await message.fill(masked);
    await send.click();
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic: drei Monate gesetze-im-internet.de");
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveCount(0);
    await ui(page.getByRole("status").filter({ hasText: `Searched the web for: "${maskedSearch}"` })).toBeVisible();
    expect(searches).toEqual([{ kind: "search", value: maskedSearch }]);
    await expect.poll(async () => (await sent()).at(-1)).toEqual([masked, 1]);
    await noCard();

    // Automatic search on: searched first, with the country, and shown.
    await page.evaluate(() => localStorage.setItem("privateai.autoSearch", "on"));
    await page.reload();
    await message.fill(question);
    await send.click();
    await ui(
      page.getByRole("status").filter({ hasText: "Searched the web automatically for:" }),
    ).toContainText(searched);
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await noCard();
    expect(searches.at(-1)).toEqual({ kind: "search", value: searched });
    expect(searches).toHaveLength(2);
    // An official source in the results: the page note says so, and no note under the answer.
    await ui(page.getByRole("status").filter({ hasText: "Searched the web automatically for:" })).toContainText(
      "Our server also opened an official source and read its text: https://www.gesetze-im-internet.de/bgb/__573c.html",
    );
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveCount(0);

    // No official source in the results: the page note and a note under the answer say so.
    result = { url: "https://www.example-umzug.de/ratgeber", tier: "other" };
    await page.reload();
    await message.fill(question);
    await send.click();
    await ui(page.getByRole("status").filter({ hasText: "Searched the web automatically for:" })).toContainText(
      "Our server also opened a non-official page and read its text: https://www.example-umzug.de/ratgeber No official source was found in the search results.",
    );
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveText(
      "No official source was found in the search results. Check the responsible authority before relying on these figures.",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // "Always search for rules, fees and deadlines": only in the Research tab now, off by default,
    // kept only in this browser.
    await page.evaluate(() => localStorage.removeItem("privateai.autoSearch"));
    await page.reload();
    const always = page.getByLabel("Always search for rules, fees and deadlines");
    await workspaceControl(page, "Research").click();
    await ui(always).not.toBeChecked();
    await always.check();
    expect(await page.evaluate(() => localStorage.getItem("privateai.autoSearchRules"))).toBe("on");
    await workspaceControl(page, "Conversation").click();
    // A rules question: searched with its masked text and the country, without a card, and shown.
    const next = "Wie viele Tage Mindesturlaub habe ich? Mail max.mustermann@example.com";
    const nextSearch = "Wie viele Tage Mindesturlaub habe ich? Mail [email address removed] Deutschland";
    await message.fill(next);
    await send.click();
    await ui(page.getByRole("status").filter({ hasText: "Searched the web automatically for:" })).toContainText(nextSearch);
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await noCard();
    expect(searches.at(-1)).toEqual({ kind: "search", value: nextSearch });
    expect(searches).toHaveLength(4);
    // With web results selected, a follow-up rules question is answered from them directly.
    await message.fill("Und welche Frist gilt für den Vermieter?");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(2);
    await expect.poll(async () => (await sent()).at(-1)).toEqual(["Und welche Frist gilt für den Vermieter?", 1]);
    expect(searches).toHaveLength(4);
    // Other time-sensitive questions are not covered: Send answers without a search.
    await page.reload();
    await message.fill("Wer ist aktuell Bundeskanzler?");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await expect.poll(async () => (await sent()).at(-1)).toEqual(["Wer ist aktuell Bundeskanzler?", 0]);
    await noCard();
    expect(searches).toHaveLength(4);
    // Switched off again in the Research tab.
    await workspaceControl(page, "Research").click();
    await ui(always).toBeChecked();
    await always.uncheck();
    expect(await page.evaluate(() => localStorage.getItem("privateai.autoSearchRules"))).toBeNull();
  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
