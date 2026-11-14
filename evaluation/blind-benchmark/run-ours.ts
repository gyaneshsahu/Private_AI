// Runs our side of the blind benchmark through the real app (real browser, real relay, live
// Tinfoil; level 4 uses the app's Research flow with Brave) in each answer mode, and writes
// .local/blind-benchmark/ours/<mode>/<id>.json ({text, ttftMs, totalMs, model, mode, label}).
// The report is a LOCAL BENCHMARK FIXTURE built from the draft report's `modes` block (or a
// tiers file), never a qualification report. Keys from Windows Credential Manager:
//   Invoke-WithPrivateAiSecret -Name TINFOIL_API_KEY -Action { Invoke-WithPrivateAiSecret -Name BRAVE_SEARCH_API_KEY -Action {
//     npx tsx evaluation/blind-benchmark/run-ours.ts [--tiers tiers.json] [--only L3-01,L6-02] [--modes auto,fast] } }
import { appText } from "../../src/text/app";
import { WHEN_TO_SEARCH_TEXT } from "../../src/when-to-search";
import { GERMAN_RULES_TEXT } from "../../src/german-rules";
import express from "express";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createServer } from "vite";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createApp } from "../../server/app";
import { checks } from "../../shared/contracts";
import { browserLaunchOptions } from "../../scripts/browser-runtime.mjs";
import { workspaceControl } from "../workspace-navigation";
import { createServer as createHttpsServer } from "node:https";
import { localTLS } from "../../tests/fixtures/local-tls";

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
// --privatemode: the Stage 3 path (owner decision 12 Nov: Privatemode is primary). The report is
// the local test report .local/qualification-privatemode.json with benchmark-only limits.
const privatemode = process.argv.includes("--privatemode");
const apiKey = privatemode ? process.env.PRIVATEMODE_API_KEY : process.env.TINFOIL_API_KEY;
const searchKey = process.env.BRAVE_SEARCH_API_KEY;
if (!apiKey) throw Error("Load TINFOIL_API_KEY or PRIVATEMODE_API_KEY (and BRAVE_SEARCH_API_KEY for research) with scripts/WindowsSecrets.psm1");
const MODES = (arg("modes") ?? "auto,fast,thinking").split(",") as ("auto" | "fast" | "thinking")[];
const only = arg("only")?.split(",");
// --tap-suggestion-all: tap the one-tap search suggestion on the first turn whenever it appears.
const tapAll = process.argv.includes("--tap-suggestion-all");
// --choice search|without: what to pick when Send on a German-rules question asks first
// ("Search and answer" or "Answer without checking", decided 13 November). Default: without,
// which is what Send did before, so older prompt sets keep their meaning.
const choice = arg("choice") ?? "without";
if (choice !== "search" && choice !== "without") throw Error("--choice must be search or without");
// --goggles: the server flag for the Brave Goggle on German-rules searches (default off).
const goggles = process.argv.includes("--goggles");
// BENCH_DIR runs another prompt set (e.g. evaluation/benchmark-fresh-20261112).
const DIR = process.env.BENCH_DIR ?? "evaluation/blind-benchmark";
// BENCH_OUT writes elsewhere, so a measurement run does not overwrite earlier evidence.
const OUT = process.env.BENCH_OUT ?? `.local/${basename(DIR)}/ours${privatemode ? "-privatemode" : ""}${tapAll ? "-tapped" : ""}${arg("choice") ? `-choice-${choice}` : ""}`;
// Each Privatemode message makes three POSTs (attest, secret, chat) against the 200-POST
// session limit, so start a new browser context (a new session) every few prompts.
// Each prompt also opens a fresh page, so it verifies again, and the relay gives one session 10
// verifications per 10 minutes (13 November): 9 prompts per context stays under that. With 15,
// prompts 11 to 15 of every context failed (German-English run, 14 November).
const PROMPTS_PER_CONTEXT = privatemode ? 9 : Infinity;
const PACE_MS = privatemode ? Number(process.env.PACE_MS ?? 6500) : 0;
let lastSend = 0;

// What a user would type into the Research tab for each level-4 prompt (the product sends
// only the exact query the user approves; the question itself is asked in the chat).
const SEARCH_QUERIES: Record<string, string> = {
  "L4-01": "BahnCard 25 2. Klasse Preis Erwachsene",
  "L4-02": "EU AI Act application timeline obligations apply from date",
  "L4-03": "Basiszinssatz Bundesbank aktuell EZB Hauptrefinanzierungssatz",
  "L4-04": "screen time sleep adolescents systematic review 2026",
  "L4-05": "Deutsches Museum Museumsinsel Öffnungszeiten Eintritt Erwachsene",
};

// Lines the app adds around an answer (checks, masking and backup notes), not model text.
const NOTICES = [
  /^Evidence needs review/,
  /^A number in this answer could be read/,
  /^Some calculations written in this answer/,
  /^We recalculated the figures/,
  /^Answered by the backup model/,
  /kept on this device/i,
  /^Not every number is recognised/,
  /^Incomplete · excluded from context/,
  /^Stopped by you/,
  /^This answer may not state every figure/,
  /^This answer gives figures or deadlines/,
  /^Searched the web/,
  /^Our server also opened (the top (official )?result|an official source|a public-interest page|a non-official page)/,
  /^No official source was found/,
  /^The top result \(/,
];

// Controls are found by the app's own English and German labels, so --locale de-DE works too.
const either = (en: string, de: string) => new RegExp(`^(${[en, de].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`);
const uiLabel = (key: keyof typeof appText.en) => either(appText.en[key] as string, appText.de[key] as string);
const searchName = either(WHEN_TO_SEARCH_TEXT.en.button, WHEN_TO_SEARCH_TEXT.de.button);
const searchAgainName = either(WHEN_TO_SEARCH_TEXT.en.againButton, WHEN_TO_SEARCH_TEXT.de.againButton);
const withoutName = either(GERMAN_RULES_TEXT.en.without, GERMAN_RULES_TEXT.de.without);
type Prompt = { id: string; level: number | string; prompt: string | string[]; attachments?: { path: string }[]; searchExpected?: boolean; searchQuery?: string };
const prompts = (JSON.parse(await readFile(`${DIR}/prompts.json`, "utf8")).prompts as Prompt[]).filter((p) => !only || only.includes(p.id));

// Router release digest of the day (attestation only, no key). Tinfoil only.
const digest = privatemode
  ? undefined
  : /"releaseDigest": "([a-f0-9]{64})"/.exec(execFileSync(process.execPath, ["scripts/probe-provider.mjs"], { encoding: "utf8" }))?.[1];
if (!privatemode && !digest) throw Error("Router attestation probe failed");

const draft = JSON.parse(await readFile("evaluation/qualification-drafts/tinfoil-gpt-oss-120b-20261112.json", "utf8"));
// Privatemode: the local test report (approved manifest of the day), with benchmark limits.
const pmReport = privatemode ? JSON.parse(await readFile(".local/qualification-privatemode.json", "utf8")) : undefined;
// The local report is git-ignored and differs per checkout. On 13 November this checkout still had
// Thinking at max after the time-out work chose high in another checkout, and every live run here
// was slow (docs/thinking-slow-20261113.md). Refuse to measure anything but the committed draft's
// Thinking setting unless --tiers says so on purpose.
if (pmReport && !arg("tiers")) {
  const want = JSON.parse(await readFile("evaluation/qualification-drafts/privatemode-20261112.json", "utf8")).modes.thinkingCandidates[0];
  const have = pmReport.modes?.thinking;
  if (have?.model !== want.model || have?.glmReasoningEffort !== want.glmReasoningEffort)
    throw Error(`.local/qualification-privatemode.json has Thinking at ${have?.model} ${have?.glmReasoningEffort}; the committed draft says ${want.model} ${want.glmReasoningEffort}. Fix the local file or pass --tiers.`);
}
const tiers = arg("tiers") ? JSON.parse(await readFile(arg("tiers")!, "utf8")) : (pmReport?.modes ?? draft.modes);
const catalog = JSON.parse(await readFile("evaluation/results/model-catalog-20261026.json", "utf8")).data as { id: string; pricing?: { inputTokenPricePer1M: number; outputTokenPricePer1M: number } }[];
const price = (m: string) => catalog.find((c) => c.id === m)?.pricing;
const tierModels = Object.values(tiers as Record<string, { model: string; backupModel?: string }>).flatMap((t) => [t.model, t.backupModel].filter(Boolean) as string[]);
const now = Date.now();
const evidence = ["LOCAL BENCHMARK FIXTURE on the agent machine only; not a qualification report"];
const tinfoilFixture = {
  provider: "tinfoil",
  model: tiers.fast.model,
  origin: "https://inference.tinfoil.sh/",
  repository: "tinfoilsh/confidential-model-router",
  releaseDigests: [digest],
  reviewedAt: new Date(now - 60_000).toISOString(),
  validUntil: new Date(now + 24 * 3_600_000).toISOString(),
  review: Object.fromEntries(checks.map((c) => [c, { status: "pass", evidence }])),
  maxInputCharacters: 32000,
  maxOutputTokens: Math.max(...Object.values(tiers as Record<string, { maxOutputTokens: number }>).map((t) => t.maxOutputTokens)),
  pricing: {
    inputPerMillion: Math.max(...tierModels.map((m) => price(m)?.inputTokenPricePer1M ?? 5)),
    outputPerMillion: Math.max(...tierModels.map((m) => price(m)?.outputTokenPricePer1M ?? 20)),
    currency: "USD",
  },
  approvedSpendUSD: 50,
  modes: tiers,
};
// Benchmark-only limits: 32,000 input characters (as the Tinfoil runs) and a spend cap that the
// worst-case booking of unmetered Privatemode requests does not exhaust mid-run.
const qualification = pmReport
  ? {
      ...pmReport,
      modes: tiers,
      maxInputCharacters: 32000,
      approvedSpendUSD: 200,
      review: Object.fromEntries(Object.entries(pmReport.review as Record<string, { evidence: string[] }>).map(([k, v]) => [k, { ...v, status: "pass", evidence: [...evidence, ...v.evidence].slice(0, 8) }])),
    }
  : tinfoilFixture;

// Server: the real app (dev middleware), with a counter of relay requests. Privatemode's SDK
// always calls HTTPS, so it runs on an ephemeral local certificate.
let relayRequests = 0;
// Longest silence on a chat reply (request start to first byte, between writes, to the end):
// a proxy with an idle limit (the Render bridge's is 15 s) would cut a reply at that point.
let maxGapMs = 0;
const outer = express();
outer.use((req, res, next) => {
  if (req.method === "POST" && /\/v1\/chat\/completions$/.test(req.path)) {
    relayRequests++;
    let last = Date.now();
    const tick = () => {
      maxGapMs = Math.max(maxGapMs, Date.now() - last);
      last = Date.now();
    };
    const write = res.write.bind(res);
    res.write = ((...args: Parameters<typeof res.write>) => (tick(), write(...args))) as typeof res.write;
    res.on("finish", tick);
  }
  next();
});
const tls = privatemode ? await localTLS() : undefined;
const listener = tls ? createHttpsServer({ key: tls.key, cert: tls.cert }, outer) : outer.listen(0, "127.0.0.1");
if (tls) listener.listen(0, "127.0.0.1");
await new Promise((ok) => listener.once("listening", ok));
const port = (listener.address() as { port: number }).port;
const origin = tls ? `https://localhost:${port}` : `http://127.0.0.1:${port}`;
const providerManifest = privatemode ? new Uint8Array(await readFile(".local/privatemode-manifest.json")) : undefined;
const inner = createApp({ origin, dev: true, qualification, apiKey, searchKey, providerManifest, searchGoggles: goggles });
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "spa", logLevel: "error" });
inner.use(vite.middlewares);
outer.use(inner);

const answer = (page: Page) => page.locator("article.assistant").last();
const answerText = async (page: Page) => (await answer(page).innerText().catch(() => "")).trim();
const busy = (page: Page) => page.getByRole("button", { name: uiLabel("stopResponse") });

// The when-to-search suggestion (src/when-to-search.ts) is decided on the device from the draft.
const suggestionBox = (page: Page) => page.getByRole("region", { name: uiLabel("searchSuggestion") });

async function sendTurn(page: Page, text: string, opts: { tapSuggestion?: boolean } = {}) {
  const before = await page.locator("article.assistant").count();
  await page.getByLabel(uiLabel("messageInput")).fill(text);
  await page.waitForFunction(() => !document.querySelector("button[aria-label='Send ↑']")?.hasAttribute("disabled"), null, { timeout: 60_000 });
  await page.waitForTimeout(300);
  const suggestionShown = await suggestionBox(page).isVisible().catch(() => false);
  const suggestedQuery = suggestionShown ? ((await suggestionBox(page).locator("pre").innerText().catch(() => "")) || undefined) : undefined;
  const suggestionHeading = suggestionShown ? ((await suggestionBox(page).locator("strong").innerText().catch(() => "")) || undefined) : undefined;
  const tapped = !!(opts.tapSuggestion && suggestionShown);
  // Privatemode limits attestations per organisation (12 Nov probe: 10/min passes, 20/min gets
  // HTTP 429). The app now verifies once per session and at least every 10 minutes, but every new
  // session (every 15 prompts) and every failure verifies again: keep message starts spaced out.
  const wait = lastSend + PACE_MS - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  lastSend = Date.now();
  maxGapMs = 0;
  let started = Date.now();
  if (tapped) await suggestionBox(page).getByRole("button", { name: searchName }).click();
  else await page.getByRole("button", { name: uiLabel("sendLabel") }).click();
  // Search first: Send on a German-rules question shows the choice instead of answering.
  const withoutButton = suggestionBox(page).getByRole("button", { name: withoutName });
  const choiceShown =
    !tapped &&
    (await Promise.race([
      withoutButton.waitFor({ timeout: 5000 }).then(() => true),
      page.locator("article.assistant").nth(before).waitFor({ timeout: 5000 }).then(() => false),
    ]).catch(() => false));
  const choiceHeading = choiceShown ? ((await suggestionBox(page).locator("strong").innerText().catch(() => "")) || undefined) : undefined;
  const choiceQuery = choiceShown ? ((await suggestionBox(page).locator("pre").innerText().catch(() => "")) || undefined) : undefined;
  if (choiceShown) {
    // Timed from the choice, like a tapped suggestion.
    started = Date.now();
    await (choice === "search" ? suggestionBox(page).getByRole("button", { name: searchName }) : withoutButton).click();
  }
  let ttftMs: number | undefined;
  let baseline = "";
  while (Date.now() - started < 300_000) {
    const count = await page.locator("article.assistant").count();
    const text = count > before ? await answerText(page) : "";
    if (!baseline && text) baseline = text; // label line before any answer text
    if (ttftMs === undefined && text && text.length > baseline.length + 2) ttftMs = Date.now() - started;
    if (count > before && !(await busy(page).isVisible().catch(() => false)) && Date.now() - started > 800) break;
    await page.waitForTimeout(100);
  }
  const totalMs = Date.now() - started;
  const tokens = Number(/Reported inference: (\d+) tokens/.exec(await page.locator("main").innerText().catch(() => ""))?.[1]) || undefined;
  // The after-answer "Search and answer again" box (shown when the answer used no web results).
  await page.waitForTimeout(300);
  const againShown = await suggestionBox(page).getByRole("button", { name: searchAgainName }).isVisible().catch(() => false);
  return { ttftMs, totalMs, text: await answerText(page), suggestionShown, suggestedQuery, suggestionHeading, tapped, choiceShown, choiceHeading, choiceQuery, chose: choiceShown ? choice : undefined, againShown, maxGapMs, tokens };
}

// One browser context per mode keeps one app session: the local server allows 100 open
// sessions, and a fresh context per prompt hit that limit after about 100 prompts. A new
// page (reload) still starts an empty temporary conversation.
async function runOne(context: BrowserContext, mode: string, p: Prompt) {
  const page = await context.newPage();
  // Failed requests (status and path only, never bodies or headers), for diagnosing failures.
  const httpErrors: string[] = [];
  let research: Promise<unknown> | undefined;
  page.on("response", (r) => {
    if (r.status() >= 400) httpErrors.push(`${r.status()} ${new URL(r.url()).pathname}`);
    // The search result list (addresses and the top-page record only, no text), to tell
    // afterwards whether an official source was among the results.
    if (r.ok() && new URL(r.url()).pathname === "/api/research/execute")
      research = r.json().then((b: { sources: { url?: string; evidenceKind?: string }[]; topPage?: unknown }) => ({
        results: b.sources.filter((s) => s.evidenceKind !== "page").map((s) => s.url),
        topPage: b.topPage,
      })).catch(() => undefined);
  });
  try {
    await page.goto(origin, { timeout: 60_000 });
    await page.getByRole("combobox", { name: uiLabel("answerMode") }).selectOption(mode, { timeout: 60_000 });
    for (const a of p.attachments ?? []) {
      const body = await readFile(join(DIR, a.path));
      await page.getByLabel(uiLabel("attachFiles")).setInputFiles({ name: a.path.split("/").pop()!, mimeType: "text/markdown", buffer: body });
      await page.getByRole("region", { name: uiLabel("importResults") }).filter({ hasText: "added" }).waitFor({ timeout: 30_000 });
    }
    let searched = false;
    const turns = Array.isArray(p.prompt) ? p.prompt : [p.prompt];
    // Level-4/research prompts: tap the one-tap suggestion when it appears; otherwise approve the
    // written query in the Research tab first (the old path).
    const query = p.searchQuery ?? SEARCH_QUERIES[p.id];
    let probe = { suggestionShown: false, suggestedQuery: undefined as string | undefined };
    if (query && searchKey) {
      await page.getByLabel(uiLabel("messageInput")).fill(turns[0]);
      await page.waitForTimeout(300);
      probe = { suggestionShown: await suggestionBox(page).isVisible().catch(() => false), suggestedQuery: undefined };
      await page.getByLabel(uiLabel("messageInput")).fill("");
    }
    if (query && searchKey && !probe.suggestionShown) {
      await workspaceControl(page, "Research").click();
      await page.getByLabel(uiLabel("exactQuery")).fill(query);
      await page.getByRole("button", { name: uiLabel("reviewDisclosure") }).click();
      await page.getByRole("button", { name: uiLabel("approve") }).click();
      await page.getByRole("status").filter({ hasText: "Search results added" }).waitFor({ timeout: 60_000 });
      await workspaceControl(page, "Conversation").click();
      searched = true;
    }
    let last = { ttftMs: undefined as number | undefined, totalMs: 0, text: "", suggestionShown: false, suggestedQuery: undefined as string | undefined, suggestionHeading: undefined as string | undefined, tapped: false, choiceShown: false, choiceHeading: undefined as string | undefined, choiceQuery: undefined as string | undefined, chose: undefined as string | undefined, againShown: false, maxGapMs: 0, tokens: undefined as number | undefined };
    const all: { ttftMs?: number; totalMs: number; maxGapMs: number; tokens?: number }[] = [];
    let first: typeof last | undefined;
    for (const t of turns) {
      last = await sendTurn(page, t, { tapSuggestion: (tapAll || !!(query && searchKey && probe.suggestionShown)) && !first });
      first ??= last;
      all.push({ ttftMs: last.ttftMs, totalMs: last.totalMs, maxGapMs: last.maxGapMs, tokens: last.tokens });
    }
    if (first?.tapped || first?.chose === "search") searched = true;
    const mainText = await page.locator("main").innerText().catch(() => "");
    // Citations render as site-name links, so innerText hides the address: keep the hrefs.
    const links = await answer(page).locator("a[href^='http']").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href)).catch(() => [] as string[]);
    // Web citations are buttons that open the source; their accessible name is "<site>: <title>".
    const citations = await answer(page).locator("button.citation").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label") ?? "")).catch(() => [] as string[]);
    // The page note's wording before and after the official-source preference (13 November).
    const opened = String.raw`Our server also opened (?:the top (?:official )?result|an official source|a public-interest page|a non-official page)`;
    const pageRead = new RegExp(String.raw`${opened}[^:]*: (https:\/\/\S+)`).exec(mainText)?.[1]?.replace(/[.,)]+$/, "");
    const topPageNote = new RegExp(String.raw`(${opened}[^\n]*|The top result \([^)]*\)[^\n]*)`).exec(mainText)?.[1];
    const noOfficialNote = /No official source was found in the search results\. Check the responsible authority/.test(last.text);
    const uncheckedWarning = /This answer gives figures or deadlines that were not checked/.test(last.text);
    const searchedQuery = /Searched the web(?: automatically)? for: "([^"]*)"/.exec(mainText)?.[1] ?? (searched ? query : undefined);
    // Strip UI chrome: the "CometRow" heading line and the copy button text.
    const lines = last.text.split("\n").filter((l) => l.trim() && !/^(CometRow|Copy answer)$/.test(l.trim()));
    const label = lines.find((l) => /^(Auto|Fast|Thinking)( ·|$)/.test(l.trim())) ?? "";
    // App notices would reveal which answer is ours on the blind sheet: kept separately.
    const notice = (l: string) => NOTICES.some((n) => n.test(l.trim()));
    const notices = lines.filter((l) => l !== label && notice(l));
    const text = lines.filter((l) => l !== label && !notice(l)).join("\n");
    // The app's own failure line (why a reply is incomplete), for diagnosis only.
    const failure = /Response ended incomplete|Incomplete/.test(last.text)
      ? (await page.locator("main").innerText().catch(() => ""))
          .split("\n")
          .filter((l) => /incomplete|limit|unavailable|did not accept|timed out|refused|protocol|retry/i.test(l))
          .slice(0, 4)
      : undefined;
    return {
      text, notices, failure, ...(httpErrors.length ? { httpErrors } : {}), ttftMs: all[0].ttftMs, totalMs: all.reduce((n, t) => n + t.totalMs, 0), turnTimings: all, model: "(see tiers)", mode, label, searched,
      suggestionShown: probe.suggestionShown || !!first?.suggestionShown, suggestedQuery: first?.suggestedQuery, suggestionHeading: first?.suggestionHeading, tapped: !!first?.tapped, choiceShown: !!first?.choiceShown, choiceHeading: first?.choiceHeading, choiceQuery: first?.choiceQuery, chose: first?.chose, againShown: last.againShown, searchedQuery, pageRead, topPageNote, noOfficialNote, uncheckedWarning, links, citations, research: await research,
    };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch(browserLaunchOptions());
const startedAt = new Date().toISOString();
try {
  // Privatemode: one mode at a time, so the pacing above holds for the whole run.
  const each = async <T,>(xs: readonly T[], f: (x: T) => Promise<void>) =>
    privatemode ? xs.reduce((p, x) => p.then(() => f(x)), Promise.resolve()) : Promise.all(xs.map(f)).then(() => undefined);
  await each(
    MODES,
    (async (mode) => {
      await mkdir(`${OUT}/${mode}`, { recursive: true });
      // --locale de-DE: the browser language, which picks the interface language (13 November).
      const fresh = () => browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: !!tls, ...(arg("locale") ? { locale: arg("locale") } : {}) });
      let context = await fresh();
      let used = 0;
      for (const p of prompts) {
        if (used++ >= PROMPTS_PER_CONTEXT) {
          await context.close();
          context = await fresh();
          used = 1;
        }
        let result: Record<string, unknown>;
        try {
          result = await runOne(context, mode, p);
        } catch (error) {
          result = { text: "", error: String((error as Error).message).slice(0, 300), mode, model: "(see tiers)" };
        }
        await writeFile(`${OUT}/${mode}/${p.id}.json`, JSON.stringify(result, null, 2));
        console.log(`${mode.padEnd(8)} ${p.id} ${result.error ? "ERROR " + result.error : `ttft ${result.ttftMs ?? "-"} ms, total ${result.totalMs} ms, ${String(result.text).length} chars, gap ${(result.turnTimings as { maxGapMs: number }[])[0]?.maxGapMs} ms, ${(result.turnTimings as { tokens?: number }[])[0]?.tokens ?? "-"} tokens ${result.label ?? ""}${result.failure ? " FAILURE " + JSON.stringify(result.failure) : ""}`}`);
      }
      await context.close();
    }),
  );
} finally {
  await browser.close();
  await vite.close();
  listener.close();
}
await writeFile(`${OUT}/run.json`, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), digest, tiers, relayRequests, prompts: prompts.length, modes: MODES, choice, goggles }, null, 2));
// The relay's own content-free counts (chat outcomes, attestation calls): shows a run that verified too often.
console.log(`done: ${relayRequests} relay requests; counts ${JSON.stringify((await import("../../server/counters")).takeCounts())}`);
