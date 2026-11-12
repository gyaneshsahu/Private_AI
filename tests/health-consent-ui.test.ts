// The draft health-consent step in the actual application (offline: inference is a stub).
import { it } from "vitest";
import { chromium, expect as ui, type Page } from "@playwright/test";
import { createServer } from "vite";
import { workspaceControl } from "../evaluation/workspace-navigation";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { HEALTH_CONSENT } from "../shared/health-consent";

it("asks once before the first message, holds the message until a choice, remembers it and can withdraw it; the draft provider section shows only with its flag", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-health-consent-ui-test",
    plugins: [
      {
        name: "synthetic-reply",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk,status,session,kept){
            window.__sent = (window.__sent ?? 0) + 1;
            kept?.({ IBAN: 1 });
            chunk('SYNTHETIC REPLY ' + window.__sent);
            return {input:1,output:1,total:2,estimatedUSD:0};
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
  const statusFor = (flag: boolean) => ({
    csrf: "SYNTHETIC",
    inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
    search: false,
    ...(flag ? { healthConsentDraft: true, providerDisclosureDraft: "tinfoil" } : {}),
  });
  const open = async (flag: boolean) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
      if (url.pathname === "/api/status") return route.fulfill({ json: statusFor(flag) });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    return { context, page };
  };
  const ask = async (page: Page, text: string) => {
    await page.getByLabel("Message CometRow").fill(text);
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
  };
  const prompt = (page: Page) => page.getByRole("region", { name: HEALTH_CONSENT.title });
  try {
    // Flag off (production): no consent step at all.
    const off = await open(false);
    await ask(off.page, "Synthetic question without the flag");
    await ui(off.page.locator("article.assistant").last()).toContainText("SYNTHETIC REPLY 1");
    await ui(prompt(off.page)).toHaveCount(0);
    await workspaceControl(off.page, "Settings").click();
    await off.page.getByRole("button", { name: "Privacy & data" }).click();
    await off.page.getByRole("button", { name: "Privacy policy ↗" }).click();
    await ui(off.page.getByText("Who is responsible")).toBeVisible();
    await ui(off.page.getByText("Who processes your messages")).toHaveCount(0);
    await off.context.close();

    // Flag on: the first message waits for a choice and is not sent before it.
    const on = await open(true);
    const { page } = on;
    await ask(page, "Synthetic question about a headache");
    await ui(prompt(page)).toBeVisible();
    await ui(page.locator("article.assistant")).toHaveCount(0);
    await prompt(page).getByRole("button", { name: HEALTH_CONSENT.accept }).click();
    await ui(page.locator("article.assistant").last()).toContainText("SYNTHETIC REPLY 1");
    // The kept-on-device note states the masking limit (T3).
    await ui(page.locator(".kept-on-device").last()).toContainText("least of all in photos and scans");
    await ui(prompt(page)).toHaveCount(0);

    // Remembered on this device: no second prompt, also after a reload.
    await ask(page, "Second synthetic question");
    await ui(page.locator("article.assistant").last()).toContainText("SYNTHETIC REPLY 2");
    await page.reload();
    await ask(page, "Synthetic question after reload");
    await ui(page.locator("article.assistant").last()).toContainText("SYNTHETIC REPLY 1");
    await ui(prompt(page)).toHaveCount(0);

    // Withdrawn in Settings: the reminder appears and chatting still works.
    await workspaceControl(page, "Settings").click();
    await page.getByRole("button", { name: "Privacy & data" }).click();
    await page.getByRole("button", { name: "Withdraw permission" }).click();
    await ui(page.getByText("You chose not to allow health and other sensitive details.")).toBeVisible();
    // The draft provider section appears in the policy only with its flag.
    await page.getByRole("button", { name: "Privacy policy ↗" }).click();
    await ui(page.getByText("Who processes your messages")).toBeVisible();
    await ui(page.getByText(/processes them in the United States/)).toBeVisible();
    await page.keyboard.press("Escape");
    await ui(page.getByRole("note")).toContainText(HEALTH_CONSENT.declinedNote);
    await on.context.close();
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
