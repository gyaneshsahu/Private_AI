// The answer renderer cannot be fetched (offline before it was ever loaded): the app stays up,
// the answer text stays readable, a retry line appears, and Retry renders the answer once the
// file can be fetched again (src/LoadBoundary.tsx). Phone, tablet and desktop, English and German,
// on the dev server; once more on a production build, where Vite preloads the chunk's stylesheet.
// Offline: a Vite plugin replaces src/inference.ts, the status is faked, nothing leaves the machine.
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { build, createServer, preview, type Plugin, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { appText } from "../src/text/app";
import { loadRetryText } from "../src/text/load-retry";

type Lang = "en" | "de";
const fakeInference: Plugin = {
  name: "synthetic-markdown-answer",
  enforce: "pre",
  load(id) {
    if (!id.replaceAll("\\", "/").split("?")[0].endsWith("/src/inference.ts")) return;
    return `export async function streamReply(c,q,csrf,signal,chunk){
      chunk("Synthetic **bold** answer.");
      return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
    }`;
  },
};
const status = {
  csrf: "SYNTHETIC",
  inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
  search: false,
};

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-lazy-retry-ui-test",
    plugins: [fakeInference],
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

/** Opens the app with the answer renderer blocked; returns the switch that lets it through. */
async function open(at: string, lang: Lang, width: number, blocked: (path: string) => boolean) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
  });
  const page = await context.newPage();
  const origins = new Set<string>();
  page.on("request", (request) => origins.add(new URL(request.url()).origin));
  const gate = { open: false };
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== at) return route.abort();
    if (url.pathname === "/api/status") return route.fulfill({ json: status });
    // Blocked before the page loads, so the idle prefetch fails too (the query covers ?retry=).
    if (!gate.open && blocked(url.pathname)) return route.abort("internetdisconnected");
    return route.continue();
  });
  await page.goto(at, { timeout: 90000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { context, page, origins, gate };
}

async function failThenRecover(at: string, lang: Lang, width: number, blocked: (path: string) => boolean) {
  const t = appText[lang];
  const rt = loadRetryText[lang];
  const { context, page, origins, gate } = await open(at, lang, width, blocked);
  try {
    const box = page.getByLabel(t.messageInput);
    await box.fill("Say something bold.");
    await page.getByRole("button", { name: t.sendLabel, exact: true }).click();
    const answer = page.locator("article.assistant").last();
    // The app is still there, the answer is readable as plain text, and the retry line shows.
    await ui(answer.getByText(rt.failed)).toBeVisible();
    await ui(answer).toContainText("Synthetic **bold** answer.");
    await ui(box).toBeVisible();
    const retry = answer.getByRole("button", { name: rt.retry, exact: true });
    const size = (await retry.boundingBox())!;
    expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(width <= 760 ? 44 : 24);
    expect(size.x + size.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);

    // Still blocked: Retry fails again and the focus comes back to the button.
    await retry.focus();
    await page.keyboard.press("Enter");
    await ui(answer.getByRole("button", { name: rt.retry, exact: true })).toBeFocused();

    // The file can be fetched again: Retry from the keyboard renders the answer.
    gate.open = true;
    await page.keyboard.press("Enter");
    await ui(answer.locator("strong").filter({ hasText: /^bold$/ })).toBeVisible();
    await ui(answer.getByText(rt.failed)).toHaveCount(0);
    await ui(answer).not.toContainText("**");
    expect([...origins]).toEqual([at]);
    return page;
  } catch (error) {
    await context.close();
    throw error;
  }
}

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`dev server at ${width} px, ${lang}: a failed answer renderer shows a retry line and recovers`, async () => {
      const page = await failThenRecover(origin, lang, width, (path) => path === "/src/Answer.tsx");
      await page.context().close();
    }, 120_000);

it("production build: the chunk and its stylesheet fail, the fonts are files, Retry recovers with styles", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "cometrow-lazy-retry-"));
  try {
    await build({
      configFile: "vite.config.ts",
      logLevel: "silent",
      plugins: [fakeInference],
      build: { outDir, emptyOutDir: true },
    });
    const css = await Promise.all(
      (await readdir(join(outDir, "assets")))
        .filter((name) => name.endsWith(".css"))
        .map((name) => readFile(join(outDir, "assets", name), "utf8")),
    );
    expect(css.join("")).toMatch(/KaTeX_Main-Regular-[\w-]+\.woff2/);
    expect(css.join("")).not.toMatch(/url\(\s*["']?data:(font|application\/font)/);

    const server = await preview({
      configFile: false,
      logLevel: "silent",
      build: { outDir },
      preview: { host: "127.0.0.1", port: 0 },
    });
    try {
      const address = server.httpServer.address();
      if (!address || typeof address === "string") throw Error("No local port");
      const at = `http://127.0.0.1:${address.port}`;
      const page = await failThenRecover(at, "en", 1280, (path) => /^\/assets\/Answer-[\w-]+\.(js|css)$/.test(path));
      try {
        // The stylesheet Vite gave up on was fetched again and applies.
        expect(
          await page.evaluate(() =>
            [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].some(
              (link) => /\/assets\/Answer-/.test(link.href) && (link.sheet?.cssRules.length ?? 0) > 0,
            ),
          ),
        ).toBe(true);
      } finally {
        await page.context().close();
      }
    } finally {
      await new Promise((done) => server.httpServer.close(done));
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}, 300_000);
