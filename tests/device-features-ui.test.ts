// Read aloud and PDF export in headless Chromium (docs/read-aloud-and-pdf-export-20261114.md).
// Offline: its own Vite server on a random port, a fake speech engine, and print() replaced.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  // Both switches on for this server only; they are build settings (src/device-features.ts).
  process.env.VITE_READ_ALOUD = "1";
  process.env.VITE_PDF_EXPORT = "1";
  vite = await createServer({
    logLevel: "silent",
    cacheDir: "node_modules/.vite-device-features-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  await vite.listen();
  await vite.warmupRequest("/tests/fixtures/device-features-entry.tsx");
  await vite.warmupRequest("/src/pdf-export.tsx");
  await vite.waitForRequestsIdle();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch(browserLaunchOptions());
}, 60_000);

afterAll(async () => {
  delete process.env.VITE_READ_ALOUD;
  delete process.env.VITE_PDF_EXPORT;
  await browser?.close();
  await vite?.close();
});

type FakeVoice = { name: string; lang: string; localService: boolean };
async function open(answer: "de" | "en", voices: FakeVoice[], locale = "en-GB") {
  const context = await browser.newContext({ locale, colorScheme: "dark" });
  context.setDefaultTimeout(10_000);
  const page = await context.newPage();
  await page.addInitScript((list) => {
    const state = { spoken: [] as { text: string; voice: string }[], calls: [] as string[], prints: 0 };
    // Chromium accepts only its own voice objects on a real utterance, so the utterance is faked too.
    class Utterance {
      constructor(public text: string) {}
    }
    Object.assign(window, { fake: state, print: () => void state.prints++, SpeechSynthesisUtterance: Utterance });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => list.map((voice) => ({ ...voice, voiceURI: voice.name, default: false })),
        addEventListener() {},
        removeEventListener() {},
        speak: (u: SpeechSynthesisUtterance) => void state.spoken.push({ text: u.text, voice: u.voice!.name }),
        cancel: () => void state.calls.push("cancel"),
        pause: () => void state.calls.push("pause"),
        resume: () => void state.calls.push("resume"),
      },
    });
  }, voices);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/device-features")
      return route.fulfill({
        contentType: "text/html",
        body: await vite.transformIndexHtml(
          "/device-features",
          `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/device-features-entry.tsx"></script></body></html>`,
        ),
      });
    return route.continue();
  });
  await page.goto(`${origin}/device-features?answer=${answer}`, { timeout: 30_000 });
  return page;
}
const fake = (page: Awaited<ReturnType<typeof open>>) =>
  page.evaluate(() => (window as unknown as { fake: { spoken: { text: string; voice: string }[]; calls: string[]; prints: number } }).fake);

const local = [
  { name: "Microsoft Hedda - German (Germany)", lang: "de-DE", localService: true },
  { name: "Microsoft David - English (United States)", lang: "en-US", localService: true },
  { name: "Google Deutsch", lang: "de-DE", localService: false },
];

it("reads a German answer with the local German voice: prose only, then pause and stop", async () => {
  const page = await open("de", local);
  try {
    const read = page.getByRole("button", { name: "Read aloud" });
    await ui(read).toHaveAttribute("aria-pressed", "false");
    await read.click();
    await ui(read).toHaveAttribute("aria-pressed", "true");
    const first = (await fake(page)).spoken;
    expect(first).toHaveLength(1);
    expect(first[0].voice).toBe("Microsoft Hedda - German (Germany)");
    // The whole text the reader was given, before chunking.
    const spoken = await page.evaluate(() => (window as unknown as { spokenFor(lang: string): string }).spokenFor("de"));
    expect(spoken).toBe(
      [
        "Ergebnis",
        "Die Gebühr ist nicht hoch und wird mit der Rechnung für das Jahr fällig.",
        "Tabelle.",
        "Posten, Betrag.",
        "Gebühr, 3,50 Euro.",
        "Codeblock ausgelassen.",
        "Es gilt Formel und das ist einfach. Mehr unter Link. Konto verborgener Wert.",
        "Erster Punkt",
        "Zweiter Punkt",
      ].join("\n"),
    );
    expect(spoken.startsWith(first[0].text.split(" ")[0])).toBe(true);
    const pause = page.getByRole("button", { name: "Pause reading" });
    await pause.click();
    await ui(pause).toHaveAttribute("aria-pressed", "true");
    await pause.click();
    await ui(pause).toHaveAttribute("aria-pressed", "false");
    await read.click();
    await ui(read).toHaveAttribute("aria-pressed", "false");
    await ui(pause).toHaveCount(0);
    expect((await fake(page)).calls).toEqual(["pause", "resume", "cancel"]);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("reads an English answer in English words and leaves the code and the address out", async () => {
  const page = await open("en", local);
  try {
    await page.getByRole("button", { name: "Read aloud" }).click();
    await ui(page.getByRole("button", { name: "Pause reading" })).toBeVisible();
    const spoken = await page.evaluate(() => (window as unknown as { spokenFor(lang: string): string }).spokenFor("en"));
    expect((await fake(page)).spoken[0].voice).toBe("Microsoft David - English (United States)");
    expect(spoken).toContain("Code block omitted.");
    expect(spoken).toContain("We get formula and that is simple. More at the page (link). Account masked value.");
    expect(spoken).not.toMatch(/secret|xxxx|https?:|src-000001|example\.org|[#*|`$]/);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("does not speak when the only German voice is an online one, and says why in the interface language", async () => {
  const page = await open("de", local.slice(1), "de-DE");
  try {
    await page.getByRole("button", { name: "Vorlesen" }).click();
    await ui(page.getByRole("status").filter({ hasText: "keine Stimme für Deutsch installiert" })).toBeVisible();
    await ui(page.getByRole("button", { name: "Vorlesen" })).toHaveAttribute("aria-pressed", "false");
    expect((await fake(page)).spoken).toEqual([]);
  } finally {
    await page.context().close();
  }
}, 60_000);

it("exports the conversation: print view only, nothing wider than the page, a PDF of several pages", async () => {
  const page = await open("en", local);
  try {
    await ui(page.locator(".print-root")).toHaveCount(0);
    await page.getByRole("button", { name: "Export conversation as PDF" }).click();
    await ui.poll(async () => (await fake(page)).prints).toBe(1);
    // On screen the export view is not shown.
    await ui(page.locator(".print-root")).toBeHidden();
    await page.emulateMedia({ media: "print" });
    // A4 less the 16 mm side margins, at 96 px per inch.
    await page.setViewportSize({ width: 672, height: 1000 });
    await ui(page.locator(".print-root")).toBeVisible();
    for (const chrome of ["#chrome", "#composer", ".message-actions"]) await ui(page.locator(chrome)).toBeHidden();
    await ui(page.locator(".print-root h1")).toHaveText("Synthetic fees");
    await ui(page.locator(".print-root .print-notice").first()).toBeVisible();
    await ui(page.locator(".print-root .katex").first()).toBeVisible();
    const layout = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".print-root")!;
      const width = document.documentElement.clientWidth;
      const style = (selector: string) => getComputedStyle(root.querySelector(selector)!);
      return {
        scrolls: document.documentElement.scrollWidth > width,
        tooWide: [...root.querySelectorAll<HTMLElement>("table, pre, .katex-display, li, p")].filter(
          (element) => element.getBoundingClientRect().right > width + 1,
        ).length,
        buttons: [...root.querySelectorAll("button:not(.citation)")].filter((b) => b.checkVisibility()).length,
        color: style("p").color,
        background: getComputedStyle(document.body).backgroundColor,
        pre: style("pre").whiteSpace,
      };
    });
    expect(layout).toEqual({
      scrolls: false,
      tooWide: 0,
      buttons: 0,
      color: "rgb(0, 0, 0)",
      background: "rgb(255, 255, 255)",
      pre: "pre-wrap",
    });
    const pdf = await page.pdf({ preferCSSPageSize: true, format: "A4" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
    expect(pages).toBeGreaterThanOrEqual(12);
    expect(pages).toBeLessThanOrEqual(40);
    // The dialog closing removes the view again.
    await page.evaluate(() => dispatchEvent(new Event("afterprint")));
    await ui(page.locator(".print-root")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.className)).toBe("");
  } finally {
    await page.context().close();
  }
}, 90_000);
