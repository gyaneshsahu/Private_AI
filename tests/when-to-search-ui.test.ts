// When to search in the real app (docs/when-to-search-20261112.md; owner, 19 November: search is
// automatic, nothing asks): a time-sensitive question is searched with its masked text on Send, then
// answered from the results; the answer shows "Searched the web", which opens to the searched text
// and the sources. "Look things up online" in Settings > General is on by default, remembered on
// the device, and switched off means no search. A failed search still answers. The "+" menu has no
// "Search the web" and no "Research".
// Offline: a Vite plugin replaces src/inference.ts, and the research routes are faked.
import { it, expect } from "vitest";
import { chromium, expect as ui, type Page } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { workspaceText } from "../src/text/workspace";
import { WHEN_TO_SEARCH_TEXT } from "../src/when-to-search";

/** Settings opens from the account menu only (SS-15), in the drawer on phones. */
async function openSettings(page: Page) {
  const toggle = page.getByRole("button", { name: appText.en.openNavigation });
  if (await toggle.isVisible()) await toggle.click();
  const account = page.locator(".account-menu");
  if (!(await account.evaluate((el) => (el as HTMLDetailsElement).open)))
    await page.getByLabel(workspaceText.en.accountMenu, { exact: true }).click();
  await page.getByRole("navigation", { name: workspaceText.en.workspace }).getByRole("button", { name: workspaceText.en.settings, exact: true }).click();
}

it("searches a time-sensitive question automatically with the masked text, shows what it searched and the sources, and searches nothing with Look things up online off", async () => {
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
    const executed: unknown[] = [];
    let failNext: number | false = false;
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
      if (url.pathname === "/api/research/execute") {
        executed.push(route.request().postDataJSON());
        if (failNext) {
          const status = failNext;
          failNext = false;
          return route.fulfill({ status, json: { error: "Synthetic search failure." } });
        }
        return route.fulfill({
          json: {
            sources: [
              {
                id: `synthetic-0${searches.length}`,
                title: `Synthetic official page ${searches.length}`,
                text: "Search excerpt only (full page not fetched): synthetic fee 10 EUR.",
                url: `https://www.example.gov/fees-${searches.length}`,
                retrievedAt: new Date().toISOString(),
                evidenceKind: "search-excerpt",
              },
            ],
            topPage: { url: `https://www.example.gov/fees-${searches.length}`, outcome: "read", official: true },
          },
        });
      }
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const s = WHEN_TO_SEARCH_TEXT.en;
    const settings = page.locator("dialog.settings-dialog");
    const lookUp = settings.getByRole("switch", { name: s.lookUpLabel });
    const closeSettings = () => settings.getByRole("button", { name: appText.en.closeSettings }).click();
    const sent = () =>
      page.evaluate(() =>
        ((window as unknown as { __sent?: { question: string; sources: number }[] }).__sent ?? []).map((m) => [m.question, m.sources]),
      );

    // "Look things up online": on by default, with its one line of help; nothing stored while on.
    await openSettings(page);
    await ui(lookUp).toBeChecked();
    await ui(settings.getByText(s.lookUpHelp)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("privateai.lookUpOnline"))).toBeNull();
    // The old per-feature checkboxes are gone.
    await ui(page.getByLabel("Search automatically when a question needs current information")).toHaveCount(0);
    await ui(page.getByLabel("Always search for rules, fees and deadlines")).toHaveCount(0);
    await closeSettings();

    const message = page.getByLabel("Message CometRow");
    const send = page.getByRole("button", { name: "Send message", exact: true });
    const answers = page.locator("article.assistant");
    const searchedWeb = (answer: ReturnType<Page["locator"]>) => answer.locator("details.searched-web");

    // The "+" menu has no "Search the web" and no "Research"; Deep research is a separate switch.
    await page.getByLabel(appText.en.tools, { exact: true }).click();
    const menu = page.locator(".tools-menu");
    await ui(menu.getByRole("button", { name: appText.en.attachFile, exact: true })).toBeVisible();
    await ui(menu.getByRole("button", { name: "Search the web", exact: true })).toHaveCount(0);
    await ui(menu.getByRole("button", { name: "Research", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await ui(page.locator(".search-next")).toHaveCount(0);

    // Timeless question: sent at once, nothing searched, no "Searched the web".
    await message.fill("Explain recursion");
    await send.click();
    await ui(answers.last()).toContainText("Synthetic answer from training data.");
    await ui(searchedWeb(answers.last())).toHaveCount(0);
    expect(searches).toEqual([]);

    // Time-sensitive question: Send searches exactly the masked text once, then answers from the
    // results. The question itself is sent as typed. Nothing asks first.
    const ceo = "Who is the current CEO of Siemens, mail max.mustermann@example.com";
    const ceoSearch = "Who is the current CEO of Siemens, mail [email address removed]";
    await message.fill(ceo);
    await send.click();
    await ui(answers.last()).toContainText("Synthetic answer from the results");
    expect(searches).toEqual([{ kind: "search", value: ceoSearch }]);
    expect(executed).toEqual([{ id: "s".repeat(48), request: { kind: "search", value: ceoSearch } }]);
    await ui(page.getByRole("region", { name: "Search suggestion" })).toHaveCount(0);
    await ui(page.getByRole("button", { name: /^Search and answer/ })).toHaveCount(0);
    // "Searched the web" under the answer: closed, then the searched text and the source links.
    const line = searchedWeb(answers.last());
    await ui(line.locator("summary")).toHaveText(s.searchedWeb);
    await ui(line).not.toHaveAttribute("open", "");
    await ui(line.getByText(s.searchedFor(ceoSearch))).toBeHidden();
    await line.locator("summary").click();
    await ui(line.getByText(s.searchedFor(ceoSearch))).toBeVisible();
    await ui(line.getByRole("listitem")).toHaveCount(1);
    await ui(line.getByRole("link", { name: "Synthetic official page 1" })).toHaveAttribute("href", "https://www.example.gov/fees-1");
    expect(JSON.stringify(searches)).not.toContain("max.mustermann@example.com");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    // The user's own message has no such line.
    await ui(page.locator("article.user details.searched-web")).toHaveCount(0);

    // A German-rules question in German: searched masked, with the country added.
    const wage = "Wie hoch ist der Mindestlohn? Mail max.mustermann@example.com";
    const wageSearch = "Wie hoch ist der Mindestlohn? Mail [email address removed] Deutschland";
    await message.fill(wage);
    await send.click();
    await ui(answers).toHaveCount(3);
    await ui(searchedWeb(answers.last())).toHaveCount(1);
    expect(searches.at(-1)).toEqual({ kind: "search", value: wageSearch });
    await searchedWeb(answers.last()).locator("summary").click();
    await ui(searchedWeb(answers.last()).getByText(s.searchedFor(wageSearch))).toBeVisible();

    // An explicit ask to search is searched even without a time cue.
    const asked = "Search the web for synthetic apple cake recipes";
    await message.fill(asked);
    await send.click();
    await ui(answers).toHaveCount(4);
    await ui(searchedWeb(answers.last())).toHaveCount(1);
    // The request words are left out of the search text.
    expect(searches.at(-1)).toEqual({ kind: "search", value: "synthetic apple cake recipes" });
    // Its line lists only this search's sources, never an earlier search's (the chat holds several).
    await searchedWeb(answers.last()).locator("summary").click();
    const listed = await searchedWeb(answers.last()).locator("ol a").allInnerTexts();
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((title) => title.endsWith(` ${searches.length}`))).toBe(true);

    // A failed search: the note says so, and the question is still answered.
    failNext = 502;
    const failed = "What is the latest synthetic news today?";
    await message.fill(failed);
    await send.click();
    await ui(page.getByRole("status").filter({ hasText: s.automaticFailed })).toBeVisible();
    await ui(answers).toHaveCount(5);
    await ui(searchedWeb(answers.last())).toHaveCount(0);
    expect(searches).toHaveLength(4);

    // The day's searches are used up: one calm line, and the question is still answered.
    failNext = 429;
    const capped = "What is the latest synthetic weather today?";
    await message.fill(capped);
    await send.click();
    await ui(page.getByRole("status").filter({ hasText: s.dailyCapReached })).toBeVisible();
    await ui(answers).toHaveCount(6);
    await ui(searchedWeb(answers.last())).toHaveCount(0);

    // The search service has no credit left: answered without a search, with no note and no error.
    failNext = 503;
    const noCredit = "What is the latest synthetic score today?";
    await message.fill(noCredit);
    await send.click();
    await ui(answers).toHaveCount(7);
    await ui(searchedWeb(answers.last())).toHaveCount(0);
    await ui(page.locator("p.notice.composer-note")).toHaveCount(0);
    await ui(page.getByText("Synthetic search failure.")).toHaveCount(0);

    await expect.poll(sent).toEqual([
      ["Explain recursion", 0],
      // Searched with the masked text; the question is sent as typed.
      [ceo, 1],
      [wage, 2],
      [asked, 3],
      [failed, 3],
      [capped, 3],
      [noCredit, 3],
    ]);

    // Switched off: stored on this device, kept over a reload, and a time-sensitive question is
    // answered without a search and without "Searched the web".
    await openSettings(page);
    await lookUp.click();
    await ui(lookUp).not.toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem("privateai.lookUpOnline"))).toBe("off");
    await page.reload();
    await openSettings(page);
    await ui(lookUp).not.toBeChecked();
    await closeSettings();
    const before = searches.length;
    await message.fill("Who is the current CEO of Siemens?");
    await send.click();
    await ui(answers.last()).toContainText("Synthetic answer from training data.");
    await ui(searchedWeb(answers.last())).toHaveCount(0);
    expect(searches).toHaveLength(before);
    expect(await sent()).toEqual([["Who is the current CEO of Siemens?", 0]]);

    // Switched on again: nothing stored.
    await openSettings(page);
    await lookUp.click();
    await ui(lookUp).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem("privateai.lookUpOnline"))).toBeNull();
    await closeSettings();

  } finally {
    await browser.close();
    await vite.close();
  }
}, 180_000);
