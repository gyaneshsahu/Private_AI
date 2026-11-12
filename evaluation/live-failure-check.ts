// T6 (agent part): the real app, in a real browser, against the live Tinfoil router, on this
// machine only. Four synthetic cases, each with its own local server and test report:
//   baseline   a short reply completes
//   stop       the user presses Stop mid-reply; the next request still works
//   truncated  a tiny output limit; the app must not present the cut-off reply as complete
//   attest     a report pinned to a wrong release digest; nothing may reach the relay
// The test report is a LOCAL FIXTURE written to .local/, never a qualification report.
// Key from Windows Credential Manager (scripts/WindowsSecrets.psm1), never printed:
//   Invoke-WithPrivateAiSecret -Name TINFOIL_API_KEY -Action { npx tsx evaluation/live-failure-check.ts <routerDigest> }
// Spend: gpt-oss-120b, at most 6 forwarded requests, worst case well under USD 0.01.
import express from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium, type Page } from "@playwright/test";
import { createApp } from "../server/app";
import { checks } from "../shared/contracts";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

const digest = process.argv[2];
const apiKey = process.env.TINFOIL_API_KEY;
if (!/^[a-f0-9]{64}$/.test(digest ?? "") || !apiKey)
  throw Error("Usage: TINFOIL_API_KEY in the process env, router digest as the argument");

const PRICE = { input: 0.15, output: 0.6 }; // gpt-oss-120b, catalog of 26 October
function report(maxOutputTokens: number, releaseDigest: string) {
  const now = Date.now();
  const evidence = ["LOCAL T6 FIXTURE on the agent machine only; not a qualification report"];
  return {
    provider: "tinfoil",
    model: "gpt-oss-120b",
    origin: "https://inference.tinfoil.sh/",
    repository: "tinfoilsh/confidential-model-router",
    releaseDigests: [releaseDigest],
    reviewedAt: new Date(now - 60_000).toISOString(),
    validUntil: new Date(now + 3_600_000).toISOString(),
    review: Object.fromEntries(checks.map((c) => [c, { status: "pass", evidence }])),
    maxInputCharacters: 8000,
    maxOutputTokens,
    pricing: { inputPerMillion: PRICE.input, outputPerMillion: PRICE.output, currency: "USD" },
    approvedSpendUSD: 0.05,
    gptOssReasoningEffort: "low",
  };
}

let forwarded = 0;
let worstCaseUSD = 0;
async function withApp(qualification: ReturnType<typeof report>, run: (page: Page, relayHits: () => number) => Promise<unknown>) {
  const outer = express();
  let hits = 0;
  outer.use((req, _res, next) => {
    if (req.method === "POST" && req.path === "/api/inference/v1/chat/completions") {
      hits++;
      forwarded++;
      // Upper bound per request: the whole input limit (4 chars per token is generous) plus the output limit.
      worstCaseUSD += (2000 * PRICE.input + qualification.maxOutputTokens * PRICE.output) / 1e6;
    }
    next();
  });
  const server0 = outer.listen(0, "127.0.0.1");
  await new Promise((ok) => server0.once("listening", ok));
  const port = (server0.address() as { port: number }).port;
  const inner = createApp({ origin: `http://127.0.0.1:${port}`, dev: true, qualification, apiKey });
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "spa", logLevel: "error" });
  inner.use(vite.middlewares);
  outer.use(inner);
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}`, { timeout: 60_000 });
    await page.getByRole("button", { name: "Send ↑", exact: true }).waitFor();
    return await run(page, () => hits);
  } finally {
    await browser.close();
    await vite.close();
    server0.close();
  }
}

async function send(page: Page, text: string) {
  await page.getByLabel("Message CometRow").fill(text);
  const button = page.getByRole("button", { name: "Send ↑", exact: true });
  await page.waitForFunction(() => !document.querySelector("button[aria-label='Send ↑']")?.hasAttribute("disabled"), null, { timeout: 30_000 });
  await button.click();
}
const assistantText = (page: Page) => page.locator("article.assistant").last().innerText().catch(() => "");
const pageText = (page: Page) => page.locator("main").innerText().catch(() => "");
const settle = (page: Page) =>
  page.getByRole("button", { name: "Stop response" }).waitFor({ state: "detached", timeout: 120_000 });

const results: Record<string, unknown> = { observedAt: new Date().toISOString(), routerDigest: digest, model: "gpt-oss-120b" };
const verdict = (name: string, pass: boolean, detail: Record<string, unknown>) => {
  results[name] = { pass, ...detail };
  console.log(`${pass ? "PASS" : "FAIL"} ${name} ${JSON.stringify(detail).slice(0, 300)}`);
};

await withApp(report(2048, digest), async (page, hits) => {
  // baseline
  await send(page, "Synthetic test. Reply with exactly the word: ready");
  await settle(page);
  const text = await assistantText(page);
  verdict("baseline", /ready/i.test(text) && hits() === 1, { relayHits: hits(), reply: text.slice(0, 120) });

  // stop before sending (during verification): nothing may reach the relay
  await send(page, "Synthetic test. Reply with exactly the word: early");
  await page.getByRole("button", { name: "Stop response" }).click({ timeout: 10_000 });
  await settle(page);
  verdict("stopBeforeSend", hits() === 1 && /stopped/i.test(await pageText(page)), { relayHits: hits() });

  // stop mid-stream, then a second request on the same account must still be admitted
  await send(page, "Synthetic test. Write a 400-word story about a lighthouse keeper, one paragraph per line.");
  // Timeline of what the user sees while the reply arrives (length of the last answer, Stop present).
  const timeline: string[] = [];
  const t0 = Date.now();
  let streaming = false;
  while (Date.now() - t0 < 90_000) {
    const text = await assistantText(page);
    const stopVisible = await page.getByRole("button", { name: "Stop response" }).isVisible().catch(() => false);
    timeline.push(`${Date.now() - t0}ms:${text.length}${stopVisible ? "+stop" : ""}`);
    if (stopVisible && text.length > 300) { streaming = true; break; }
    if (!stopVisible && Date.now() - t0 > 3000) break;
    await page.waitForTimeout(250);
  }
  if (!streaming)
    console.log(
      "timeline:", timeline.slice(-8).join(" "),
      "\nstatus lines:", (await pageText(page)).split("\n").filter((l) => /incomplete|limit|stopped|retry|unavailable|reject|timed|cost/i.test(l)),
    );
  const streamedBeforeStop = (await assistantText(page)).length;
  if (streaming) await page.getByRole("button", { name: "Stop response" }).click({ timeout: 10_000 });
  await settle(page);
  const stopped = streaming && /stopped/i.test(await pageText(page));
  await send(page, "Synthetic test. Reply with exactly the word: again");
  await settle(page);
  const again = await assistantText(page);
  verdict("stopMidStream", stopped && /again/i.test(again) && hits() === 3, {
    relayHits: hits(),
    streamedCharactersBeforeStop: streamedBeforeStop,
    stoppedShown: stopped,
    nextReply: again.slice(0, 80),
  });
});

// A longer reply left to finish must complete (an earlier run saw one end as incomplete).
await withApp(report(2048, digest), async (page, hits) => {
  await send(page, "Synthetic test. Write a 200-word story about a lighthouse keeper.");
  await settle(page);
  const text = await assistantText(page);
  const complete = !/incomplete/i.test(text) && text.length > 400;
  verdict("longReply", complete && hits() === 1, {
    relayHits: hits(),
    answerCharacters: text.length,
    statusLines: (await pageText(page)).split("\n").filter((l) => /incomplete|limit|stopped|unavailable|reject|timed|tokens/i.test(l)),
  });
});

await withApp(report(16, digest), async (page, hits) => {
  await send(page, "Synthetic test. List the numbers from 1 to 200 separated by commas.");
  await settle(page);
  const text = await pageText(page);
  const flagged = /limit|incomplete|cut off|not complete|stopped/i.test(text);
  verdict("truncated", flagged && hits() === 1, {
    relayHits: hits(),
    shownToUser: text.split("\n").filter((l) => /limit|incomplete|cut off|complete|stopped|retry/i.test(l)).slice(0, 4),
  });
});

await withApp(report(512, "0".repeat(64)), async (page, hits) => {
  await send(page, "Synthetic test. Reply with exactly the word: should-not-send");
  await page.waitForTimeout(500);
  await settle(page).catch(() => {});
  await page.waitForTimeout(15_000); // attestation runs before any send
  const text = await pageText(page);
  verdict("attest", hits() === 0 && /Nothing was sent|not match|verif/i.test(text), {
    relayHits: hits(),
    shownToUser: text.split("\n").filter((l) => /sent|match|verif/i.test(l)).slice(0, 3),
  });
});

results.forwardedRequests = forwarded;
results.worstCaseUSD = Number(worstCaseUSD.toFixed(4));
await mkdir(".local/live-failure-20261112", { recursive: true });
await writeFile(`.local/live-failure-20261112/result-${Date.now()}.json`, JSON.stringify(results, null, 2));
console.log(`forwarded ${forwarded} request(s); worst-case spend USD ${worstCaseUSD.toFixed(4)}`);
process.exit(Object.values(results).some((r) => typeof r === "object" && r && "pass" in r && !(r as { pass: boolean }).pass) ? 1 : 0);
