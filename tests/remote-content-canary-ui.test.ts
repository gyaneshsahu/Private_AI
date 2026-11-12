// A15: model output must not make the browser contact any third party. A stub reply
// carries every kind of remote reference; the browser must request none of them.
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

const CANARY = "canary-a15.example";
const reply = [
  "Synthetic answer with remote references.",
  `![pixel](https://${CANARY}/markdown-image.png)`,
  `<img src="https://${CANARY}/html-image.png">`,
  `<iframe src="https://${CANARY}/embed"></iframe>`,
  `<link rel="stylesheet" href="https://${CANARY}/style.css">`,
  `<video src="https://${CANARY}/clip.mp4" autoplay></video>`,
  `[a link](https://${CANARY}/link)`,
  `Autolink: https://${CANARY}/autolink and <https://${CANARY}/angle>`,
  `![ref image][r]`,
  "",
  `[r]: https://${CANARY}/reference-image.png`,
].join("\n");

it("renders model output without loading any remote image, embed, stylesheet or link", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-remote-content-canary-test",
    plugins: [
      {
        name: "synthetic-remote-references",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            chunk(${JSON.stringify(reply)});
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
  try {
    const page = await browser.newPage();
    const external: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== origin) external.push(request.url());
    });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "SYNTHETIC",
            inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
            search: false,
          },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    await page.getByLabel("Message CometRow").fill("Synthetic question");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    const answer = page.locator("article.assistant").last();
    await ui(answer).toContainText("Synthetic answer with remote references.");
    await ui(answer).toContainText("[Image omitted: pixel]");
    // AI transparency (F1, EU AI Act Art. 50): the composer says answers come from an AI.
    await ui(page.locator(".composer-caption")).toContainText("Answers come from an AI, not a person");
    // Give any lazy loader a moment, then check the network and the DOM.
    await page.waitForTimeout(1000);
    expect(external.filter((url) => url.includes(CANARY))).toEqual([]);
    expect(
      await answer.evaluate((node) =>
        [...node.querySelectorAll("img,iframe,video,audio,source,link,object,embed,a[href^='http']")].map(
          (el) => el.outerHTML,
        ),
      ),
    ).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
