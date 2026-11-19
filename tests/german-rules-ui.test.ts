// German rules in the real app (docs/german-rules-20261113.md; owner, 19 November: search is
// automatic, nothing asks). A German-rules question is searched on Send with its masked text and the
// country, then answered from the results without the unchecked-figures warning. With web results of
// which none is official, a note under the answer says so (official-source preference). A rules
// question the detector misses, or any rules question with "Look things up online" off, is sent at
// once, and an answer that states figures without web results gets the warning under it.
// Offline: a Vite plugin replaces src/inference.ts.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { WHEN_TO_SEARCH_TEXT } from "../src/when-to-search";

it("searches rules questions automatically with the country, warns about unchecked figures without web results, and searches nothing with Look things up online off", async () => {
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
            chunk(sources.length ? "Synthetic: drei Monate [" + sources.at(-1).id + "]." : "Synthetic: drei Monate (§ 573c BGB).");
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
                id: `synthetic-0${searches.length}`,
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
    const send = page.getByRole("button", { name: "Send message", exact: true });
    const noCard = async () => {
      await ui(page.getByRole("region", { name: "Search suggestion" })).toHaveCount(0);
      await ui(page.getByRole("button", { name: /^Search and answer|^Answer without/ })).toHaveCount(0);
    };
    const sent = () => page.evaluate(() => (window as unknown as { __sent?: [string, number][] }).__sent ?? []);
    const answers = page.locator("article.assistant");
    const s = WHEN_TO_SEARCH_TEXT.en;
    const question = "Welche Kündigungsfrist habe ich als Mieter bei einem unbefristeten Mietvertrag?";
    // The question names no country, so the search text ends with one (14 November).
    const searched = `${question} Deutschland`;
    const warning = "This answer gives figures or deadlines that were not checked against an official source.";

    // A question that is not about rules sends directly.
    await message.fill("Explain recursion");
    await send.click();
    await ui(answers).toHaveCount(1);
    await expect.poll(sent).toEqual([["Explain recursion", 0]]);
    expect(searches).toEqual([]);
    await page.reload();

    // Answer-side check: a rules question the detector misses is sent directly, and an answer
    // that states a law reference still gets the warning; nothing offers a search.
    // "Was darf mein Chef mir schenken?" is recognised since the German cues of 13 November.
    const missed = "Was ist bei Geschenken vom Chef zu beachten?";
    await message.fill(missed);
    await send.click();
    await ui(answers.last()).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    await ui(answers.last().locator(".arithmetic-check")).toHaveText(warning);
    await ui(answers.last().locator("details.searched-web")).toHaveCount(0);
    await noCard();
    expect(searches).toEqual([]);
    await page.reload();

    // About German rules (on by default): Send searches the question with the country at once, then
    // answers from the results; an official source among them, so no warning and no note.
    await message.fill(question);
    await noCard();
    await send.click();
    const answer = answers.last();
    await ui(answer).toContainText("Synthetic: drei Monate gesetze-im-internet.de");
    expect(searches).toEqual([{ kind: "search", value: searched }]);
    await expect.poll(sent).toEqual([[question, 1]]);
    await ui(answer.locator(".arithmetic-check")).toHaveCount(0);
    await answer.locator("details.searched-web summary").click();
    await ui(answer.locator("details.searched-web").getByText(s.searchedFor(searched))).toBeVisible();
    await ui(answer.locator("details.searched-web").getByRole("link", { name: "Synthetic official page" })).toHaveAttribute(
      "href",
      "https://www.gesetze-im-internet.de/bgb/__573c.html",
    );
    await noCard();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // Identifiers are removed on this device before the search; the question is sent as typed.
    const masked = "Wie hoch ist das Bußgeld innerorts bei 21 km/h zu schnell? Mail max.mustermann@example.com";
    const maskedSearch = "Wie hoch ist das Bußgeld innerorts bei 21 km/h zu schnell? Mail [email address removed] Deutschland";
    await message.fill(masked);
    await send.click();
    await ui(answers).toHaveCount(2);
    await ui(answers.last()).toContainText("Synthetic: drei Monate gesetze-im-internet.de");
    expect(searches.at(-1)).toEqual({ kind: "search", value: maskedSearch });
    expect(JSON.stringify(searches)).not.toContain("max.mustermann@example.com");
    await expect.poll(async () => (await sent()).at(-1)).toEqual([masked, 2]);

    // No official source in the results: a note under the answer says so.
    result = { url: "https://www.example-umzug.de/ratgeber", tier: "other" };
    await page.reload();
    await message.fill(question);
    await send.click();
    await ui(answers.last().locator(".arithmetic-check")).toHaveText(
      "No official source was found in the search results. Check the responsible authority before relying on these figures.",
    );
    await ui(answers.last().locator("details.searched-web")).toHaveCount(1);
    expect(searches.at(-1)).toEqual({ kind: "search", value: searched });
    expect(searches).toHaveLength(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // A time-sensitive question that is not about rules: searched as typed, no country added.
    result = { url: "https://www.gesetze-im-internet.de/bgb/__573c.html", tier: "official" };
    await page.reload();
    await message.fill("Wer ist aktuell Bundeskanzler?");
    await send.click();
    await ui(answers).toHaveCount(1);
    expect(searches.at(-1)).toEqual({ kind: "search", value: "Wer ist aktuell Bundeskanzler?" });

    // "Look things up online" off: a rules question is sent at once without a search, and its
    // figures without web results get the warning; nothing offers a search.
    await page.evaluate(() => localStorage.setItem("privateai.lookUpOnline", "off"));
    await page.reload();
    const before = searches.length;
    const next = "Wie viele Tage Mindesturlaub habe ich? Mail max.mustermann@example.com";
    await message.fill(next);
    await send.click();
    await ui(answers.last()).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    await ui(answers.last().locator(".arithmetic-check")).toHaveText(warning);
    await ui(answers.last().locator("details.searched-web")).toHaveCount(0);
    await expect.poll(sent).toEqual([[next, 0]]);
    await noCard();
    expect(searches).toHaveLength(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
