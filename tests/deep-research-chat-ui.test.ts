// Deep research in the chat (FE-07, docs/deep-research-in-chat-20261116.md) in the actual
// application, at 375, 768 and 1280 px, in English and German: "+" > "Deep research" arms the next
// Send, Send opens the plan step in the conversation with the cost, Escape and Cancel return to the
// message box with the draft kept, nothing is searched before the approval, the progress shows in
// the card and the answer lands in the conversation without a further click. Offline: a Vite plugin
// replaces src/inference.ts, the status and the research routes are answered here.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Locator, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { deepResearchText } from "../src/text/deep-research";
import { researchNextText } from "../src/text/research-next";
import { skipLinkText } from "../src/text/skip-link";
import { titleFrom } from "../src/title-from";
import { workspaceText } from "../src/text/workspace";
import { answerIfAsked } from "./fixtures/app-questions";

type Lang = "en" | "de";
let vite: ViteDevServer;
let browser: Browser;
let origin = "";
const outside: string[] = [];
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
    cacheDir: "node_modules/.vite-deep-research-chat-ui-test",
    plugins: [
      {
        name: "synthetic-research-model",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk,status,calc,kept,choice,mode,salt,image,code,research){
            const sources = c.attachments.filter((a) => a.selected).flatMap((a) => a.sources);
            (window.__calls ??= []).push({ research, mode });
            if (signal.aborted) throw signal.reason;
            if (research === "plan")
              chunk("1. synthetic notice period\\n2. synthetic fee for person@example.test\\n3. synthetic law");
            else if (research === "answer") chunk("Synthetic research answer [" + sources[0].id + "].");
            else chunk("Synthetic plain answer.");
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
  });
  context.setDefaultTimeout(20_000);
  const page = await context.newPage();
  const posted: { path: string; value?: string }[] = [];
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
    if (url.origin !== origin) {
      outside.push(url.href);
      return route.abort();
    }
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
      posted.push({ path: url.pathname, value: body.request?.kind === "search" ? body.request.value : undefined });
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
                  ],
                  topPage: { url: `https://one.example/result-${n}`, outcome: "read" },
                },
        })
        .catch(() => {});
    }
    return route.continue();
  });
  await page.goto(origin, { timeout: 90_000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return {
    context,
    page,
    posted,
    hold() {
      held = new Promise((resolve) => (release = resolve));
      return () => release?.();
    },
  };
}
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls?: { research?: string }[] }).__calls ?? []);
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
/** Buttons: 44 px on phones, 24 px everywhere, inside the screen. */
const tall = async (width: number, buttons: Locator) => {
  for (const item of await buttons.all()) {
    const box = (await item.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(width < 760 ? 44 : 24);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  }
};
const searched = (posted: { path: string; value?: string }[]) =>
  posted.filter((p) => p.path.endsWith("/execute") && p.value).map((p) => p.value);

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`${width} px, ${lang}: armed from "+", plan and approve in the chat, the answer lands in the conversation`, async () => {
      const t = deepResearchText[lang];
      const rn = researchNextText[lang];
      const a = appText[lang];
      const { context, page, posted, hold } = await open(lang, width);
      try {
        const box = page.getByLabel(a.messageInput);
        const send = page.getByRole("button", { name: a.sendLabel, exact: true });
        const item = page.locator(".tools-menu").getByRole("button", { name: t.heading, exact: true });
        const arm = async () => {
          await page.getByLabel(a.tools, { exact: true }).click();
          await item.click();
        };
        const card = page.getByRole("region", { name: t.heading });
        const question = "How long is the synthetic notice period, and what is the fee?";

        // "+" > "Deep research": the note says what the next Send does and what it costs.
        await arm();
        await ui(box).toBeFocused();
        const armed = page.locator(".search-next");
        await ui(armed).toContainText(rn.armed(15));
        await tall(width, armed.getByRole("button"));
        await noSidewaysScroll(page);
        await box.fill(question);
        await send.click();

        // Send opens the plan step in the conversation, with the cost; nothing is requested yet.
        await ui(card).toBeVisible({ timeout: 30_000 }); // loaded on demand
        await ui(card).toContainText(t.intro(15, 4, 6, 3));
        await ui(card).toContainText(question);
        await ui(card.getByRole("button", { name: t.plan, exact: true })).toBeFocused();
        await ui(armed).toHaveCount(0);
        await ui(box).toHaveValue(question);
        await ui(page.locator("article.message")).toHaveCount(0);
        await tall(width, card.getByRole("button"));
        await noSidewaysScroll(page);
        // Send while the card is open changes nothing.
        await send.click();
        expect(await calls(page)).toEqual([]);
        // Escape: back to the message box, the draft kept, nothing sent.
        await card.getByRole("button", { name: t.plan, exact: true }).focus();
        await page.keyboard.press("Escape");
        await ui(card).toHaveCount(0);
        await ui(box).toBeFocused();
        await ui(box).toHaveValue(question);
        expect(await calls(page)).toEqual([]);

        // Again: Plan (by keyboard) leads to the approval of each search text. Nothing searched.
        await arm();
        await send.click();
        await card.getByRole("button", { name: t.plan, exact: true }).press("Enter");
        const approval = card.getByRole("group", { name: t.approveHeading });
        await ui(approval).toBeVisible({ timeout: 20_000 });
        await ui(page.locator("#deep-research-inline-approve")).toBeFocused();
        await ui(approval.getByRole("textbox")).toHaveCount(3);
        await ui(approval.getByRole("textbox", { name: t.field(2) })).not.toHaveValue(/person@example\.test/);
        expect(posted).toEqual([]);
        await tall(width, approval.getByRole("button"));
        await noSidewaysScroll(page);
        // Another tab and back (the skip link): the run waits at the approval, nothing searched.
        await page.getByLabel(a.tools, { exact: true }).click();
        await page.locator(".tools-menu").getByRole("button", { name: a.tabResearch, exact: true }).click();
        await ui(page.locator(".deep-research-inline")).toHaveCount(0); // the page's own panel shows here
        await page.getByRole("link", { name: skipLinkText[lang].toMessageBox }).focus();
        await page.keyboard.press("Enter");
        await ui(approval.getByRole("textbox")).toHaveCount(3);
        expect(posted).toEqual([]);
        // Escape at the approval: closed, the draft kept, the plan's count said, nothing searched.
        await page.locator("#deep-research-inline-approve").focus();
        await page.keyboard.press("Escape");
        await ui(card).toHaveCount(0);
        await ui(box).toHaveValue(question);
        await ui(box).toBeFocused();
        await ui(page.locator(".dock-notice")).toContainText(t.used(5, 15));
        expect(posted).toEqual([]);
        expect((await calls(page)).map((c) => c.research)).toEqual(["plan"]);

        // Again, approved: the progress shows in the card, then the answer is in the conversation.
        await arm();
        await send.click();
        await card.getByRole("button", { name: t.plan, exact: true }).click();
        await ui(approval).toBeVisible({ timeout: 20_000 });
        await approval.getByRole("textbox", { name: t.field(1) }).fill("synthetic notice period tenancy");
        await card.getByRole("button", { name: t.remove(3), exact: true }).click();
        expect(posted).toEqual([]);
        const release = hold();
        await card.getByRole("button", { name: t.approve(2), exact: true }).click();
        const steps = card.getByRole("list", { name: t.steps });
        await ui(steps.locator('li[data-state="running"]')).toContainText(t.searching(1, 2));
        await ui(card.getByRole("button", { name: t.stop, exact: true })).toBeVisible();
        await tall(width, card.getByRole("button"));
        await noSidewaysScroll(page);
        release();
        const answer = page.locator("article.assistant").last();
        await ui(answer).toContainText("Synthetic research answer", { timeout: 20_000 });
        await ui(card).toHaveCount(0);
        await ui(page.getByRole("button", { name: t.showAnswer })).toHaveCount(0);
        await ui(page.locator("article.user").last()).toContainText(question);
        await ui(page.locator("h1")).toHaveText(titleFrom(question)); // this chat, named by the question
        await ui(box).toHaveValue("");
        await ui(page.locator(".dock-notice")).toContainText(t.used(15, 15));
        // Exactly the approved texts were searched (the second masked on this device).
        const texts = searched(posted);
        expect(texts).toHaveLength(2);
        expect(texts[0]).toBe("synthetic notice period tenancy");
        expect(JSON.stringify(posted)).not.toContain("person@example.test");
        expect((await calls(page)).map((c) => c.research)).toEqual(["plan", "plan", "answer"]);
        await noSidewaysScroll(page);

        // One-shot: the next message is a normal one.
        await box.fill("SYNTHETIC FOLLOW-UP");
        await send.click();
        await ui(page.locator("article.assistant").nth(1)).toContainText("Synthetic plain answer.");
        await ui(card).toHaveCount(0);
        expect((await calls(page)).map((c) => c.research)).toEqual(["plan", "plan", "answer", undefined]);
        expect(searched(posted)).toHaveLength(2);
      } finally {
        await context.close();
      }
    }, 150_000);

it("a new chat during the searches stops the run; nothing of it reaches the new chat", async () => {
  const t = deepResearchText.en;
  const a = appText.en;
  const { context, page, posted, hold } = await open("en", 1280);
  try {
    await page.getByLabel(a.tools, { exact: true }).click();
    await page.locator(".tools-menu").getByRole("button", { name: t.heading, exact: true }).click();
    await page.getByLabel(a.messageInput).fill("How long is the synthetic notice period?");
    await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
    const card = page.getByRole("region", { name: t.heading });
    await card.getByRole("button", { name: t.plan, exact: true }).click({ timeout: 30_000 });
    const release = hold();
    await card.getByRole("button", { name: t.approve(3), exact: true }).click();
    await ui(card.getByRole("list", { name: t.steps }).locator('li[data-state="running"]')).toContainText(t.searching(1, 3));
    await page.getByRole("button", { name: workspaceText.en.newConversation, exact: true }).first().click();
    await answerIfAsked(page, true);
    await ui(card).toHaveCount(0);
    const sent = posted.length;
    release();
    await page.waitForTimeout(500);
    expect(posted).toHaveLength(sent);
    await ui(page.locator(".context-count")).toHaveCount(0); // no research results in the new chat
    await ui(page.getByText(t.resultCancelled)).toHaveCount(0);
    expect((await calls(page)).map((c) => c.research)).toEqual(["plan"]);
  } finally {
    await context.close();
  }
}, 120_000);

it("a question longer than a research question may be is refused with the reason; nothing is sent", async () => {
  const t = deepResearchText.en;
  const a = appText.en;
  const { context, page } = await open("en", 768);
  try {
    await page.getByLabel(a.tools, { exact: true }).click();
    await page.locator(".tools-menu").getByRole("button", { name: t.heading, exact: true }).click();
    await page.getByLabel(a.messageInput).fill("synthetic question ".repeat(60));
    await page.getByRole("button", { name: a.sendLabel, exact: true }).click();
    const card = page.getByRole("region", { name: t.heading });
    await card.getByRole("button", { name: t.plan, exact: true }).click({ timeout: 30_000 });
    await ui(card.getByRole("alert")).toHaveText(researchNextText.en.tooLong(1000));
    expect(await calls(page)).toEqual([]);
  } finally {
    await context.close();
  }
}, 120_000);

it("without the deep research switch the menu has no Deep research", async () => {
  const { context, page } = await open("en", 768, false);
  try {
    await page.getByLabel(appText.en.tools, { exact: true }).click();
    await ui(page.locator(".tools-menu").getByRole("button", { name: appText.en.tabResearch, exact: true })).toBeVisible();
    await ui(page.locator(".tools-menu").getByRole("button", { name: deepResearchText.en.heading, exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
}, 120_000);

it("sent nothing outside this machine", () => {
  expect(outside).toEqual([]);
});
