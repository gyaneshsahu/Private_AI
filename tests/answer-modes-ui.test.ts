// Answer modes in the composer (owner, 12 November): mode names only, Auto by default, the choice
// remembered on the device, and one labelled automatic retry on the backup after a rejection.
// Offline: a Vite plugin replaces src/inference.ts and the status is faked.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

const MODEL_NAMES = ["SYNTHETIC_MODEL_PRIMARY", "SYNTHETIC_MODEL_BACKUP", "SYNTHETIC_MODEL_DEEP"];
const qualification = {
  maxInputCharacters: 8000,
  model: MODEL_NAMES[0],
  modes: {
    fast: { model: MODEL_NAMES[0], backupModel: MODEL_NAMES[1], maxOutputTokens: 1024, allowanceCost: 1 },
    thinking: { model: MODEL_NAMES[2], backupModel: MODEL_NAMES[1], maxOutputTokens: 4096, allowanceCost: 3 },
  },
};

it("shows Auto, Fast and Thinking only, remembers the choice, and labels a backup answer", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-answer-modes-ui-test",
    plugins: [
      {
        name: "synthetic-answer-modes",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          // The primary model rejects every request; the backup answers.
          return `import { IncompleteReplyError } from "./reply-stream";
          export async function streamReply(c,q,csrf,signal,chunk,status,calc,kept,choice,mode){
            (window.__calls ??= []).push({ choice, mode });
            if (choice !== "backup")
              throw new IncompleteReplyError("The protected service did not accept this request and gave no answer. No automatic retry was made.", undefined,
                { code: "HTTP_UPSTREAM_REJECTED", events: 0, usageEvents: 0, textCharacters: 0, finish: "NONE" });
            chunk("Synthetic backup answer.");
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
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification }, search: false },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    const control = page.getByRole("combobox", { name: "Answer mode" });
    await ui(control).toBeVisible();
    await ui(control).toHaveValue("auto");
    expect(await control.locator("option").allTextContents()).toEqual(["Auto", "Fast", "Thinking"]);
    // Phone width: the control fits without horizontal page scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // Keyboard: focus the control and choose Fast, then reload: the choice is remembered.
    await control.focus();
    await control.selectOption("fast");
    await page.reload();
    await ui(page.getByRole("combobox", { name: "Answer mode" })).toHaveValue("fast");
    await page.getByRole("combobox", { name: "Answer mode" }).selectOption("auto");

    // Auto picks Thinking on this device; the primary model rejects, the backup answers once.
    await page.getByLabel("Message CometRow").fill("Explain step by step why the synthetic sum is 4.");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText("Synthetic backup answer.");
    await ui(answer.locator(".answered-by")).toHaveText("Auto · Thinking · Answered by the backup model");
    expect(await page.evaluate(() => (window as unknown as { __calls: unknown[] }).__calls)).toEqual([
      { choice: "primary", mode: "thinking" },
      { choice: "backup", mode: "thinking" },
    ]);
    await ui(page.getByRole("dialog")).toHaveCount(0);

    // No model name anywhere in the page.
    const html = await page.content();
    for (const name of MODEL_NAMES) expect(html).not.toContain(name);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);

it("hides the mode control when the report has no modes", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-answer-modes-ui-test",
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
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: { csrf: "SYNTHETIC", inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } }, search: false },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    await ui(page.getByLabel("Message CometRow")).toBeVisible();
    await ui(page.getByRole("combobox", { name: "Answer mode" })).toHaveCount(0);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
