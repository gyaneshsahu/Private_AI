// Live check of session verification and the attestation queue against Privatemode's real
// attestation limit (owner, 13 Nov). Through the real app (createApp + Vite dev + Chromium) on the
// local test report. Counts the attest, secret and chat requests the browser sends through our relay.
//   Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx evaluation/privatemode/session-verify-live.ts [--skip-refresh | --parallel-only] }
// Scenarios:
//   A burst: one session, 20 messages back to back (no pacing). Before session verification this
//     pattern hit HTTP 429 after about 15. Expect 1 attestation, 20 answers.
//   B parallel: five sessions starting at once, 4 messages each (attestation queue). Expect 0 failed
//     answers; the queue may hold some verifications a few seconds. Per session it records the time
//     its attest calls took through our relay (queue wait plus upstream) and its message times.
//   C stop: stop a long answer mid-stream; the next message must attest again (fail closed, re-check).
//   D refresh: wait 10.5 minutes in one session; the next message must attest again.
// Synthetic prompts only; no answer text and no key is printed or saved.
import express from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { createServer } from "vite";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createApp } from "../../server/app";
import { localTLS } from "../../server/local-tls";
import { browserLaunchOptions } from "../../scripts/browser-runtime.mjs";

const apiKey = process.env.PRIVATEMODE_API_KEY;
if (!apiKey) throw Error("Load PRIVATEMODE_API_KEY with scripts/WindowsSecrets.psm1");
const report = JSON.parse(await readFile(".local/qualification-privatemode.json", "utf8"));
const qualification = { ...report, approvedSpendUSD: 200, maxInputCharacters: 32000 };
const providerManifest = new Uint8Array(await readFile(".local/privatemode-manifest.json"));

// `verifications` counts the app's own verifications (each fetches the approved manifest first);
// attest calls beyond one per verification come from the SDK itself: three attempts on a refusal,
// and a secret refresh when Privatemode no longer knows a client's secret (`sdkSecretRefresh`
// counts the SDK's own console note "Secret expired, refreshing and retrying...").
const counts = { verifications: 0, sdkSecretRefresh: 0, attest: 0, secret: 0, chat: 0, attest429: 0, attestBusy503: 0 };
/** Milliseconds spent in attest calls through our relay, per browser session (cookie; never printed). */
const attestMs = new Map<string, number>();
const sessionOf = (cookie = "") => /privateai-session=([0-9a-f]+)/.exec(cookie)?.[1] ?? "none";
const outer = express();
outer.use((req, res, next) => {
  if (req.method === "GET" && req.path === "/api/inference/privatemode/manifest") counts.verifications++;
  if (req.method === "POST") {
    if (/\/privatemode\/v1\/attest$/.test(req.path)) {
      counts.attest++;
      const started = Date.now();
      const id = sessionOf(req.headers.cookie);
      res.on("finish", () => {
        if (res.statusCode === 429) counts.attest429++;
        if (res.statusCode === 503) counts.attestBusy503++;
        attestMs.set(id, (attestMs.get(id) ?? 0) + Date.now() - started);
      });
    } else if (/\/privatemode\/v1\/secret$/.test(req.path)) counts.secret++;
    else if (/\/v1\/chat\/completions$/.test(req.path)) counts.chat++;
  }
  next();
});
const tls = await localTLS();
const server = createHttpsServer({ key: tls.key, cert: tls.cert }, outer);
server.listen(0, "127.0.0.1");
await new Promise((ok) => server.once("listening", ok));
const origin = `https://localhost:${(server.address() as { port: number }).port}`;
const inner = createApp({ origin, dev: true, qualification, apiKey, providerManifest });
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "spa", logLevel: "error" });
inner.use(vite.middlewares);
outer.use(inner);

const browser = await chromium.launch(browserLaunchOptions());
const session = () => browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
const busy = (page: Page) => page.getByRole("button", { name: "Stop response" });

async function open(context: BrowserContext) {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.text().startsWith("Secret expired")) counts.sdkSecretRefresh++;
  });
  await page.goto(origin, { timeout: 60_000 });
  await page.getByRole("combobox", { name: "Answer mode" }).selectOption("fast");
  return page;
}
/** Sends one message and waits for the reply; returns "ok", "ok (backup)" or the app's notice. */
async function ask(page: Page, text: string) {
  const before = await page.locator("article.assistant").count();
  await page.getByLabel("Message CometRow").fill(text);
  await page.getByRole("button", { name: "Send ↑", exact: true }).click();
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    if ((await page.locator("article.assistant").count()) > before && !(await busy(page).isVisible().catch(() => false))) break;
    await page.waitForTimeout(150);
  }
  const reply = await page.locator("article.assistant").last().innerText().catch(() => "");
  if (!/Incomplete · excluded from context|No answer received/.test(reply))
    return /Answered by the backup model/.test(reply) ? "ok (backup)" : "ok";
  // The app's notice says why (busy, time-out, unavailable); no answer text is recorded.
  const notice = await page.locator("div.notice[role=status]").last().innerText().catch(() => "");
  return `FAIL: ${notice.split("\n")[0] || "no notice"}`;
}
/** The browser session id of a page (to match attest timings); never printed. */
async function sessionId(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "privateai-session")?.value ?? "none";
}
const failed = (outcomes: string[]) => outcomes.filter((o) => o.startsWith("FAIL"));
const delta = (from: typeof counts) => Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v - from[k as keyof typeof counts]]));
const results: Record<string, unknown> = {};
const parallelOnly = process.argv.includes("--parallel-only");
const snapshot = () => ({ ...counts });

try {
  // A: burst in one session.
  let mark = snapshot();
  const a = await session();
  const pa = await open(a);
  const outcomesA: string[] = [];
  for (let i = 1; i <= (parallelOnly ? 0 : 20); i++) outcomesA.push(await ask(pa, `Reply with only the number ${i}.`));
  results.A_burst = {
    ...delta(mark),
    failures: failed(outcomesA),
    backups: outcomesA.filter((o) => o === "ok (backup)").length,
    attestMs: attestMs.get(await sessionId(pa)) ?? 0,
  };
  console.log("A burst", JSON.stringify(results.A_burst));

  // B: five sessions starting at once.
  mark = snapshot();
  const contexts = await Promise.all(Array.from({ length: 5 }, session));
  const pages = await Promise.all(contexts.map(open));
  const perSession = await Promise.all(
    pages.map(async (p, s) => {
      const outcomes: string[] = [];
      const ms: number[] = [];
      for (let i = 1; i <= 4; i++) {
        const t = Date.now();
        outcomes.push(await ask(p, `Session ${s + 1}: reply with only the word ok.`));
        ms.push(Date.now() - t);
      }
      return { outcomes, ms };
    }),
  );
  const sessionsB = [];
  for (const [s, p] of pages.entries())
    sessionsB.push({
      session: s + 1,
      attestMs: attestMs.get(await sessionId(p)) ?? 0,
      messageMs: perSession[s].ms,
      failures: failed(perSession[s].outcomes),
      backups: perSession[s].outcomes.filter((o) => o === "ok (backup)").length,
    });
  const outcomesB = perSession.flatMap((x) => x.outcomes);
  results.B_parallel = { ...delta(mark), answers: outcomesB.length, failures: failed(outcomesB), sessions: sessionsB };
  console.log("B parallel", JSON.stringify(results.B_parallel));
  await Promise.all(contexts.map((c) => c.close()));

  if (parallelOnly) process.argv.push("--skip-stop", "--skip-refresh");
  // C: stop mid-stream, then ask again in the same session.
  mark = snapshot();
  if (!process.argv.includes("--skip-stop")) {
  await pa.getByLabel("Message CometRow").fill("Write a 400-word story about a lighthouse keeper.");
  await pa.getByRole("button", { name: "Send ↑", exact: true }).click();
  await busy(pa).waitFor({ timeout: 60_000 });
  await pa.waitForTimeout(2500);
  await busy(pa).click();
  await pa.waitForTimeout(1500);
  const afterStop = snapshot();
  const outcomeC = await ask(pa, "Reply with only the word ok.");
  results.C_stop = { stopPhase: delta(mark), nextMessage: delta(afterStop), outcome: outcomeC };
  console.log("C stop", JSON.stringify(results.C_stop));
  }

  // D: the 10-minute refresh.
  if (!process.argv.includes("--skip-refresh")) {
    mark = snapshot();
    const o1 = await ask(pa, "Reply with only the word ok.");
    const afterFirst = snapshot();
    console.log("D waiting 10.5 minutes ...");
    await pa.waitForTimeout(10.5 * 60_000);
    const o2 = await ask(pa, "Reply with only the word ok.");
    results.D_refresh = { firstMessage: { ...delta(mark), outcome: o1 }, afterTenAndAHalfMinutes: { ...delta(afterFirst), outcome: o2 } };
    console.log("D refresh", JSON.stringify(results.D_refresh));
  }
  await a.close();
} finally {
  await browser.close();
  await vite.close();
  server.close();
}
results.totals = counts;
await mkdir(".local/session-verify-live", { recursive: true });
await writeFile(`.local/session-verify-live/result-${Date.now()}.json`, JSON.stringify(results, null, 2));
console.log("totals", JSON.stringify(counts));
