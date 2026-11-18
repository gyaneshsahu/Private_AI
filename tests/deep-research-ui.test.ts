// Deep research in the actual application (docs/deep-research-20261114.md): it starts at once
// (owner, 18 November), with one progress line and Stop, at phone, tablet and desktop width, in
// English and German; the plan's texts are masked before they are sent; a stop while searching;
// the calm limit message at 0; hidden without the switch. Offline: a Vite plugin replaces src/inference.ts, the
// status and the two research routes are faked, nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { deepResearchText } from "../src/text/deep-research";
import { WHEN_TO_SEARCH_TEXT } from "../src/when-to-search";
import { limitSentence } from "../src/limit-message";

type Lang = "en" | "de";
let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const qualification = {
  maxInputCharacters: 100000,
  model: "SYNTHETIC_FAST",
  modes: {
    fast: { model: "SYNTHETIC_FAST", maxOutputTokens: 1024, allowanceCost: 1 },
    thinking: { model: "SYNTHETIC_DEEP", maxOutputTokens: 4096, allowanceCost: 5 },
  },
};

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-deep-research-ui-test",
    plugins: [
      {
        name: "synthetic-research-model",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // The plan proposes three texts, one with an email address; the answer cites source 1.
          return `export async function streamReply(c,q,csrf,signal,chunk,status,calc,kept,choice,mode,salt,image,code,research){
            const sources = c.attachments.flatMap((a) => a.sources);
            (window.__calls ??= []).push({ research, mode, choice, code: !!code, sources: sources.length });
            if (signal.aborted) throw signal.reason;
            if (research === "plan")
              chunk("1. synthetic notice period\\n2. synthetic fee for person@example.test\\n3. synthetic law");
            // As the live model did (14 November): headings, a note after a code, a plain code, an invented code.
            else chunk("## Synthetic heading\\n\\nSynthetic research answer [" + sources[0].id + " (§ 573c Abs. 1 BGB)]. More [" + sources[1].id + "]. Invented [0dffd17f5269].");
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
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await vite?.close();
});

async function open(lang: Lang, width: number, research = true, allowance?: Record<string, unknown>) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    reducedMotion: lang === "de" ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  /** Every body the page posted to the research routes, in order. */
  const posted: { path: string; body: { kind?: string; value?: string; request?: { kind: string; value: string } } }[] = [];
  let serial = 0;
  let release: (() => void) | undefined;
  let held: Promise<void> | undefined;
  const source = (url: string, evidenceKind: string) => ({
    id: `synthetic-${String(++serial).padStart(4, "0")}`,
    title: `Synthetic page ${serial}`,
    text: "The synthetic notice period is three months.",
    url,
    retrievedAt: new Date().toISOString(),
    evidenceKind,
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/api/status")
      return route.fulfill({
        json: {
          csrf: "SYNTHETIC",
          inference: { ready: true, reason: "OFFLINE ONLY", qualification },
          search: true,
          ...(research ? { research: { cost: 15, dailyRuns: 3 } } : {}),
          ...(allowance ? { requestAllowance: allowance } : {}),
        },
      });
    if (url.pathname.startsWith("/api/research/")) {
      const body = route.request().postDataJSON();
      posted.push({ path: url.pathname, body });
      if (url.pathname.endsWith("/prepare")) return route.fulfill({ json: { id: "s".repeat(48) } });
      if (held) await held;
      const n = posted.length;
      return route
        .fulfill({
          json:
            body.request.kind === "page"
              ? { sources: [source(body.request.value, "page")] }
              : {
                  sources: [
                    source(`https://one.example/result-${n}`, "search-excerpt"),
                    source(`https://two.example/result-${n}`, "search-excerpt"),
                    source(`https://one.example/result-${n}`, "page"),
                  ],
                  topPage: { url: `https://one.example/result-${n}`, outcome: "read" },
                },
        })
        .catch(() => {}); // the page stopped waiting
    }
    return route.continue();
  });
  await page.goto(origin, { timeout: 90000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  const t = appText[lang];
  await page.getByLabel(t.tools, { exact: true }).click();
  await page.locator(".tools-menu").getByRole("button", { name: t.tabResearch, exact: true }).click();
  return {
    context,
    page,
    posted,
    /** Searches and page reads wait until the returned function is called. */
    hold() {
      held = new Promise((resolve) => (release = resolve));
      return () => release?.();
    },
  };
}
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls?: Record<string, unknown>[] }).__calls ?? []);
const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
/** Primary actions: 44 px on phones, 24 px everywhere. */
const tallEnough = async (page: Page, name: string, width: number) => {
  const box = await page.getByRole("button", { name, exact: true }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 24);
};
const executed = (posted: Awaited<ReturnType<typeof open>>["posted"], kind: string) =>
  posted.filter((p) => p.path.endsWith("/execute") && p.body.request?.kind === kind).map((p) => p.body.request!.value);

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`a whole run at ${width} px, ${lang}: starts at once, masked texts, one progress line with Stop, answer with sources`, async () => {
      const t = deepResearchText[lang];
      const { context, page, posted, hold } = await open(lang, width);
      try {
        const panel = page.getByRole("region", { name: t.heading });
        await ui(panel).toBeVisible();
        await ui(panel).toContainText(t.intro(15, 4, 6, 3));
        await noSidewaysScroll(page);
        const start = page.getByRole("button", { name: t.start, exact: true });
        await ui(start).toBeDisabled();
        await page.getByLabel(t.question).fill("How long is the synthetic notice period, and what is the fee?");
        await tallEnough(page, t.start, width);
        // Keyboard: the button is reached and pressed without a pointer. No approval step follows.
        const release = hold();
        await start.focus();
        await page.keyboard.press("Enter");
        // One progress line with Stop; the first plan on a cold dev server also loads the model module.
        const progress = page.locator(".research-progress");
        await ui(progress).toContainText(t.searching(1, 3), { timeout: 20000 });
        await ui(page.getByRole("button", { name: t.stop, exact: true })).toBeVisible();
        await ui(page.getByRole("textbox")).toHaveCount(1); // the message box only: no search texts to edit
        await tallEnough(page, t.stop, width);
        await noSidewaysScroll(page);
        release();

        // The end: the result takes the focus.
        const done = page.getByRole("heading", { name: t.resultDone });
        await ui(done).toBeVisible({ timeout: 20000 });
        await ui(done).toBeFocused();
        await ui(page.locator(".research-result")).not.toContainText(/\d+ (requests|Anfragen)/);
        await noSidewaysScroll(page);

        // The plan's three texts were searched, masked on this device: the address the model repeated never left it.
        const searched = executed(posted, "search");
        expect(searched).toHaveLength(3);
        expect(searched[0]).toBe("synthetic notice period");
        expect(searched[1]).toMatch(/^synthetic fee for /);
        expect(JSON.stringify(posted)).not.toContain("person@example.test");
        for (const url of executed(posted, "page")) expect(url).toMatch(/^https:\/\/two\.example\/result-/);
        // Two model requests: the plan in Fast, the answer in Thinking with the sources; no code tool.
        const made = await calls(page);
        expect(made.map(({ research, mode, choice, code }) => ({ research, mode, choice, code }))).toEqual([
          { research: "plan", mode: "fast", choice: "primary", code: false },
          { research: "answer", mode: "thinking", choice: "primary", code: false },
        ]);
        expect(made[1].sources).toBeGreaterThan(1);

        // The answer is in the conversation with its source and the note of what was searched and read.
        await page.getByRole("button", { name: t.showAnswer, exact: true }).click();
        const answer = page.locator("article.assistant").last();
        // Rendered at once (the renderer was loaded during the run), not the plain-text placeholder.
        const first = await answer.innerText();
        expect(first).toContain("Synthetic heading");
        expect(first).not.toContain("## Synthetic heading");
        expect(first).not.toContain("[synthetic-");
        await ui(answer.locator("button.citation")).toHaveCount(2);
        await ui(answer).toContainText("(§ 573c Abs. 1 BGB)");
        await ui(answer).not.toContainText("0dffd17f5269");
        await answer.locator("button.citation").first().click();
        await ui(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await ui(answer.locator(".passages-used")).toContainText('"synthetic notice period"');
        await noSidewaysScroll(page);
      } finally {
        await context.close();
      }
    }, 120_000);

for (const [lang, width] of [
  ["en", 375],
  ["de", 1280],
] as const)
  it(`stop while searching at ${width} px, ${lang}: it ends at once and sends nothing more`, async () => {
    const t = deepResearchText[lang];
    const { context, page, posted, hold } = await open(lang, width);
    try {
      await page.getByLabel(t.question).fill("How long is the synthetic notice period?");
      const release = hold();
      await page.getByRole("button", { name: t.start, exact: true }).click();
      await ui(page.locator(".research-progress")).toContainText(t.searching(1, 3), { timeout: 20000 });
      // Keyboard stop.
      await page.getByRole("button", { name: t.stop, exact: true }).focus();
      await page.keyboard.press("Enter");
      const stopped = page.getByRole("heading", { name: t.resultCancelled });
      await ui(stopped).toBeVisible();
      await ui(stopped).toBeFocused();
      const sentAtStop = posted.length;
      release();
      await page.waitForTimeout(300);
      expect(posted).toHaveLength(sentAtStop);
      expect(executed(posted, "search")).toHaveLength(1);
      // Only the plan request went to the model.
      expect((await calls(page)).map((call) => call.research)).toEqual(["plan"]);
      // A new run can be started.
      await page.getByRole("button", { name: t.again, exact: true }).click();
      await ui(page.getByLabel(t.question)).toBeFocused();
    } finally {
      await context.close();
    }
  }, 120_000);

it("at 0 left the one calm limit message, with no unit counts, and nothing is sent; without the switch no deep research", async () => {
  const t = deepResearchText.en;
  const resetsAt = new Date(Date.now() + 3 * 3600_000).toISOString();
  const empty = { state: "exhausted", limit: 50, used: 50, remaining: 0, pending: 0, uncertain: 0, resetsAt, meteredRequests: 0, promptTokens: 0, completionTokens: 0, unmeteredRequests: 0 };
  const none = await open("en", 768, true, empty);
  try {
    await none.page.getByLabel(t.question).fill("How long is the synthetic notice period?");
    await none.page.getByRole("button", { name: t.start, exact: true }).click();
    const alert = none.page.getByRole("region", { name: t.heading }).getByRole("alert");
    await ui(alert).toHaveText(limitSentence(resetsAt, "en"));
    await ui(alert).toHaveText(/^Limit reached\. It resets at \d\d:\d\d\.$/);
    expect(none.posted).toEqual([]);
    expect(await calls(none.page)).toEqual([]);
  } finally {
    await none.context.close();
  }
  const off = await open("en", 768, false);
  try {
    await ui(off.page.getByText(WHEN_TO_SEARCH_TEXT.en.researchIntro)).toBeVisible();
    await ui(off.page.getByText(t.heading)).toHaveCount(0);
  } finally {
    await off.context.close();
  }
}, 120_000);
