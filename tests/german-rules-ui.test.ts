// German rules in the real app (docs/german-rules-20261113.md): a German-rules question gets the
// one-tap search with its own heading; Send asks first ("Search and answer" or "Answer without
// checking") and sends nothing until a choice; Escape goes back to editing; an answer without web
// results that states figures gets the warning and the "Search and answer again" box; other
// questions and automatic search send directly. With web results of which none is official, the
// page note and a note under the answer say so (official-source preference). Offline: a Vite plugin replaces src/inference.ts.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { workspaceControl } from "../evaluation/workspace-navigation";

it("asks to search first on Send, warns about unchecked figures, and offers the search again", async () => {
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
    const send = page.getByRole("button", { name: "Send ↑", exact: true });
    const searchFirst = suggestion.getByRole("button", { name: "Search and answer", exact: true });
    const without = suggestion.getByRole("button", { name: "Answer without checking" });
    const sent = () => page.evaluate(() => (window as unknown as { __sent?: [string, number][] }).__sent ?? []);
    const question = "Welche Kündigungsfrist habe ich als Mieter bei einem unbefristeten Mietvertrag?";

    // A question that is not about rules sends directly.
    await message.fill("Explain recursion");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await expect.poll(sent).toEqual([["Explain recursion", 0]]);
    await page.reload();

    // Answer-side check: a rules question the detector misses is sent directly, and an answer
    // that states a law reference still gets the warning and the search-again box.
    const missed = "Was darf mein Chef mir schenken?";
    await message.fill(missed);
    await ui(suggestion).toHaveCount(0);
    await send.click();
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveText(
      "This answer gives figures or deadlines that were not checked against an official source.",
    );
    await ui(suggestion).toContainText("This answer did not use current information.");
    await ui(suggestion.locator("pre")).toHaveText(missed);
    await ui(suggestion.getByRole("button", { name: "Search and answer again" })).toBeVisible();
    expect(searches).toEqual([]);
    await page.reload();

    // Not time-sensitive, but about German rules: the suggestion shows with its own heading.
    await message.fill(question);
    await ui(suggestion).toContainText(
      "Rules, fees and deadlines change. Check the official source first. Search the web for:",
    );
    await ui(suggestion.locator("pre")).toHaveText(question);
    await ui(suggestion).not.toContainText("Press Send instead");
    await ui(without).toHaveCount(0);

    // Send asks first and sends nothing; the search button has the focus; it fits a phone.
    await send.click();
    await ui(suggestion).toContainText(
      "This is about rules, fees or deadlines, which change. Search the official source first? Search the web for:",
    );
    await ui(suggestion.locator("pre")).toHaveText(question);
    await ui(without).toBeVisible();
    await ui(searchFirst).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await ui(page.locator("article.assistant")).toHaveCount(0);
    expect(searches).toEqual([]);
    expect(await sent()).toEqual([]);

    // Escape goes back to editing, with the draft kept and nothing sent.
    await page.keyboard.press("Escape");
    await ui(without).toHaveCount(0);
    await ui(message).toBeFocused();
    await ui(message).toHaveValue(question);
    expect(await sent()).toEqual([]);

    // "Answer without checking": answered without any search.
    await send.click();
    await without.click();
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText("Synthetic: drei Monate (§ 573c BGB).");
    expect(searches).toEqual([]);
    await expect.poll(sent).toEqual([[question, 0]]);

    // Answered without web results and with figures: the warning and the search-again box.
    await ui(answer.locator(".arithmetic-check")).toHaveText(
      "This answer gives figures or deadlines that were not checked against an official source.",
    );
    await ui(suggestion).toContainText("This answer did not use current information.");
    await suggestion.getByRole("button", { name: "Search and answer again" }).click();

    // The answer from the approved results replaces it, without the warning.
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic: drei Monate gesetze-im-internet.de");
    await ui(page.locator("article.assistant").last().locator(".arithmetic-check")).toHaveCount(0);
    expect(await page.locator("article.assistant").count()).toBe(1);
    expect(searches).toEqual([{ kind: "search", value: question }]);
    // With web results selected, a follow-up rules question is answered from them directly.
    await message.fill("Und welche Frist gilt für den Vermieter?");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(2);
    expect(searches).toHaveLength(1);

    // "Search and answer" (here by keyboard, Enter on the focused button) searches exactly the
    // shown text, then answers from the results.
    await page.reload();
    const masked = "Wie hoch ist das Bußgeld innerorts bei 21 km/h zu schnell? Mail max.mustermann@example.com";
    await message.fill(masked);
    await send.click();
    await ui(searchFirst).toBeFocused();
    const shown = await suggestion.locator("pre").innerText();
    expect(shown).toBe("Wie hoch ist das Bußgeld innerorts bei 21 km/h zu schnell? Mail [email address removed]");
    await page.keyboard.press("Enter");
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic: drei Monate gesetze-im-internet.de");
    expect(searches.at(-1)).toEqual({ kind: "search", value: shown });
    expect(searches).toHaveLength(2);
    await expect.poll(async () => (await sent()).at(-1)).toEqual([masked, 1]);

    // Automatic search on: no choice, searched first and shown.
    await page.evaluate(() => localStorage.setItem("privateai.autoSearch", "on"));
    await page.reload();
    await message.fill(question);
    await send.click();
    await ui(
      page.getByRole("status").filter({ hasText: "Searched the web automatically for:" }),
    ).toContainText(question);
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await ui(without).toHaveCount(0);
    expect(searches.at(-1)).toEqual({ kind: "search", value: question });
    expect(searches).toHaveLength(3);
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

    // "Always search for rules, fees and deadlines": a checkbox in the choice, off by default,
    // kept only in this browser; ticking it keeps the choice open for this question.
    await page.evaluate(() => localStorage.removeItem("privateai.autoSearch"));
    await page.reload();
    const always = page.getByLabel("Always search for rules, fees and deadlines");
    await message.fill(question);
    await send.click();
    await ui(always).not.toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await always.check();
    expect(await page.evaluate(() => localStorage.getItem("privateai.autoSearchRules"))).toBe("on");
    await ui(without).toBeVisible();
    await searchFirst.click();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    expect(searches).toHaveLength(5);
    // Next rules question: searched with its masked text without the choice, and shown.
    await page.reload();
    const next = "Wie viele Tage Mindesturlaub habe ich? Mail max.mustermann@example.com";
    await message.fill(next);
    await send.click();
    await ui(page.getByRole("status").filter({ hasText: "Searched the web automatically for:" })).toContainText(
      "Wie viele Tage Mindesturlaub habe ich? Mail [email address removed]",
    );
    await ui(without).toHaveCount(0);
    expect(searches.at(-1)).toEqual({ kind: "search", value: "Wie viele Tage Mindesturlaub habe ich? Mail [email address removed]" });
    // Other time-sensitive questions are not covered: Send answers without a search.
    await page.reload();
    await message.fill("Wer ist aktuell Bundeskanzler?");
    await send.click();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    expect(searches).toHaveLength(6);
    // The matching setting in the Research tab, switched off again there.
    await workspaceControl(page, "Research").click();
    await ui(always).toBeChecked();
    await always.uncheck();
    expect(await page.evaluate(() => localStorage.getItem("privateai.autoSearchRules"))).toBeNull();
  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
