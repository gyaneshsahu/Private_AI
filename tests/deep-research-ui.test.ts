// Deep research in the actual application (docs/deep-research-20261114.md): the approval step and
// the progress list at phone, tablet and desktop width, in English and German; a stop while
// searching; hidden without the switch. Offline: a Vite plugin replaces src/inference.ts, the
// status and the two research routes are faked, nothing leaves the machine.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { deepResearchText } from "../src/text/deep-research";
import { WHEN_TO_SEARCH_TEXT } from "../src/when-to-search";

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

async function open(lang: Lang, width: number, research = true) {
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
    it(`a whole run at ${width} px, ${lang}: plan, edit and approve the texts, visible progress, answer with sources`, async () => {
      const t = deepResearchText[lang];
      const { context, page, posted, hold } = await open(lang, width);
      try {
        const panel = page.getByRole("region", { name: t.heading });
        await ui(panel).toBeVisible();
        await ui(panel).toContainText(t.intro(15, 4, 6, 3));
        await noSidewaysScroll(page);
        const plan = page.getByRole("button", { name: t.plan, exact: true });
        await ui(plan).toBeDisabled();
        await page.getByLabel(t.question).fill("How long is the synthetic notice period, and what is the fee?");
        await tallEnough(page, t.plan, width);
        // Keyboard: the button is reached and pressed without a pointer.
        await plan.focus();
        await page.keyboard.press("Enter");

        // The approval step takes the focus. Nothing was searched yet.
        const approval = page.getByRole("group", { name: t.approveHeading });
        // The first plan on a cold dev server also loads the model module: allow for it.
        await ui(approval).toBeVisible({ timeout: 20000 });
        await ui(page.locator("#deep-research-approve")).toBeFocused();
        expect(posted).toEqual([]);
        await ui(approval.getByRole("textbox")).toHaveCount(3);
        // The address the model repeated was removed on this device before the text was shown.
        const second = approval.getByRole("textbox", { name: t.field(2) });
        await ui(second).toHaveValue(/^synthetic fee for /);
        await ui(second).not.toHaveValue(/person@example\.test/);
        // Typed in by the user, it is masked again: the text that will be sent is shown beneath.
        await second.fill("synthetic fee for person@example.test");
        await ui(approval.getByText(WHEN_TO_SEARCH_TEXT[lang].willBeSent)).toBeVisible();
        await ui(approval.locator("pre")).not.toContainText("person@example.test");
        const sentSecond = (await approval.locator("pre").innerText()).trim();
        await ui(approval).toContainText(t.approveNote(6));
        await ui(page.getByRole("button", { name: t.approve(3), exact: true })).toBeVisible();
        // Edit the first text, remove the third: the button counts what will be searched.
        await approval.getByRole("textbox", { name: t.field(1) }).fill("synthetic notice period tenancy");
        await page.getByRole("button", { name: t.remove(3), exact: true }).click();
        await ui(approval.getByRole("textbox")).toHaveCount(2);
        // A text that is too short blocks the approval and says why.
        await second.fill("x");
        await ui(approval.getByText(WHEN_TO_SEARCH_TEXT[lang].tooShort)).toBeVisible();
        await ui(page.getByRole("button", { name: t.approve(2), exact: true })).toBeDisabled();
        await second.fill("synthetic fee for person@example.test");
        const approve = page.getByRole("button", { name: t.approve(2), exact: true });
        await ui(approve).toBeEnabled();
        await tallEnough(page, t.approve(2), width);
        await tallEnough(page, t.remove(1), width);
        await noSidewaysScroll(page);

        // Approve: the step list shows the search that is running, with a Stop button.
        const release = hold();
        await approve.click();
        const steps = page.getByRole("list", { name: t.steps });
        await ui(steps.locator('li[data-state="running"]')).toContainText(t.searching(1, 2));
        await ui(steps.locator("li").first()).toContainText(t.planDone(3));
        await ui(page.getByRole("button", { name: t.stop, exact: true })).toBeVisible();
        await tallEnough(page, t.stop, width);
        await noSidewaysScroll(page);
        release();

        // The end: the result takes the focus; every step is done with its outcome.
        const done = page.getByRole("heading", { name: t.resultDone });
        await ui(done).toBeVisible({ timeout: 20000 });
        await ui(done).toBeFocused();
        await ui(steps.locator('li[data-state="done"]')).toHaveCount(4);
        await ui(steps).toContainText(t.searchDone(2, 0));
        await ui(steps).toContainText(t.readDone(4, 0));
        await ui(steps).toContainText(t.writeDone);
        await ui(panel).toContainText(t.used(15, 15));
        await noSidewaysScroll(page);

        // Exactly the two approved, masked texts were searched; pages came from the results.
        expect(executed(posted, "search")).toEqual(["synthetic notice period tenancy", sentSecond]);
        expect(JSON.stringify(posted)).not.toContain("person@example.test");
        for (const url of executed(posted, "page")) expect(url).toMatch(/^https:\/\/two\.example\/result-/);
        // Two model requests: the plan in Fast, the answer in Thinking with the sources; no code tool.
        expect(await calls(page)).toEqual([
          { research: "plan", mode: "fast", choice: "primary", code: false, sources: 0 },
          { research: "answer", mode: "thinking", choice: "primary", code: false, sources: 4 },
        ]);

        // The answer is in the conversation with its source and the note of what was searched and read.
        await page.getByRole("button", { name: t.showAnswer, exact: true }).click();
        const answer = page.locator("article.assistant").last();
        // Rendered at once (the renderer was loaded during the run), not the plain-text placeholder
        // with raw Markdown and codes that the live run read on 14 November. No waiting here.
        const first = await answer.innerText();
        expect(first).toContain("Synthetic heading");
        expect(first).not.toContain("## Synthetic heading");
        expect(first).not.toContain("[synthetic-");
        await ui(answer.getByRole("heading", { name: "Synthetic heading" })).toBeVisible();
        await ui(answer).toContainText("Synthetic research answer");
        await ui(answer.locator("button.citation")).toHaveCount(2);
        await ui(answer).toContainText("(§ 573c Abs. 1 BGB)");
        await ui(answer).not.toContainText("[synthetic-");
        await ui(answer).not.toContainText("0dffd17f5269");
        // A button opens its source.
        await answer.locator("button.citation").first().click();
        await ui(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await ui(answer.locator(".passages-used")).toContainText(
          t.note(2, 0, 4, 0, `"synthetic notice period tenancy"; "${sentSecond}"`),
        );
        await noSidewaysScroll(page);
      } finally {
        await context.close();
      }
    }, 120_000);

for (const [lang, width] of [
  ["en", 375],
  ["de", 1280],
] as const)
  it(`stop while searching at ${width} px, ${lang}: it ends at once, says what was counted, and sends nothing more`, async () => {
    const t = deepResearchText[lang];
    const { context, page, posted, hold } = await open(lang, width);
    try {
      await page.getByLabel(t.question).fill("How long is the synthetic notice period?");
      await page.getByRole("button", { name: t.plan, exact: true }).click();
      const release = hold();
      await page.getByRole("button", { name: t.approve(3), exact: true }).click();
      const steps = page.getByRole("list", { name: t.steps });
      await ui(steps.locator('li[data-state="running"]')).toContainText(t.searching(1, 3));
      // Keyboard stop.
      await page.getByRole("button", { name: t.stop, exact: true }).focus();
      await page.keyboard.press("Enter");
      const stopped = page.getByRole("heading", { name: t.resultCancelled });
      await ui(stopped).toBeVisible();
      await ui(stopped).toBeFocused();
      await ui(steps.locator('li[data-state="stopped"]')).toHaveCount(1);
      await ui(page.getByRole("region", { name: t.heading })).toContainText(t.used(5, 15));
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

it("cancel at the approval step searches nothing; without the switch there is no deep research at all", async () => {
  const t = deepResearchText.en;
  const on = await open("en", 768);
  try {
    await on.page.getByLabel(t.question).fill("How long is the synthetic notice period?");
    await on.page.getByRole("button", { name: t.plan, exact: true }).click();
    await on.page.getByRole("group", { name: t.approveHeading }).getByRole("button", { name: t.cancel, exact: true }).click();
    await ui(on.page.getByRole("heading", { name: t.resultCancelled })).toBeFocused();
    await ui(on.page.getByRole("region", { name: t.heading })).toContainText(t.used(5, 15));
    expect(on.posted).toEqual([]);
  } finally {
    await on.context.close();
  }
  const off = await open("en", 768, false);
  try {
    await ui(off.page.getByText(WHEN_TO_SEARCH_TEXT.en.researchIntro)).toBeVisible();
    await ui(off.page.getByText(t.heading)).toHaveCount(0);
  } finally {
    await off.context.close();
  }
}, 120_000);
