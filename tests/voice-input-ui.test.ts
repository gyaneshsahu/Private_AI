// Voice input (docs/voice-to-text-20261114.md) in the actual application at phone, tablet and
// desktop width, English and German. Offline: the transcription call is replaced by a Vite plugin,
// the microphone is a generated tone, and the REAL MediaRecorder of Chromium records it in chunks
// of 2 seconds. Checked: each chunk is a standalone WebM file the browser can decode, chunks are
// transcribed while recording goes on, a chunk that fails twice is marked without losing the rest,
// the warning before the turn maximum, and the "used / left" line of today's voice time.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { voiceText } from "../src/text/voice";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";
/** Used before the test: 138 of 150 units, so 24 seconds are left and the turn maximum is 22 s. */
const USED = 138;

beforeAll(async () => {
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-voice-input-ui-test",
    plugins: [
      {
        name: "synthetic-transcription",
        enforce: "pre",
        transform(code, id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/voice-input.ts")) return;
          // Call 1 answers, calls 2 and 3 (the second chunk and its retry) fail, then all answer.
          return code.replace(
            "export async function transcribeRecording(",
            `export async function transcribeRecording(audio, units, status, signal) {
              const n = (window.__voiceCalls = (window.__voiceCalls ?? 0) + 1);
              if (n !== 3) (window.__chunks ??= []).push(audio);
              await new Promise((r) => setTimeout(r, 100));
              signal.throwIfAborted();
              if (n === 2 || n === 3) throw new Error("synthetic failure");
              (window.__units ??= []).push(units);
              return n === 1 ? "Hello there" : n === 4 ? "and goodbye" : "again";
            }
            async function realTranscribeRecording(`,
          );
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

/** "Voice today: 4:36 used, 0:24 left." as a pattern with any times. */
const todayPattern = (lang: "en" | "de") =>
  new RegExp(voiceText[lang].today("X", "Y").replace(/[.]/g, "\\.").replace("X", "\\d+:\\d\\d").replace("Y", "\\d+:\\d\\d"));

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`dictation at ${width} px, ${lang}: chunks while talking, a failed part marked, the warning, used and left`, async () => {
      const t = voiceText[lang];
      const context = await browser.newContext({
        locale: lang === "de" ? "de-DE" : "en-US",
        viewport: { width, height: width < 700 ? 812 : 900 },
        reducedMotion: lang === "de" ? "reduce" : "no-preference",
      });
      context.setDefaultTimeout(15_000);
      const page = await context.newPage();
      try {
        await page.addInitScript((used) => {
          // The microphone: a steady tone, recorded by the browser's real MediaRecorder.
          Object.defineProperty(navigator, "mediaDevices", {
            value: {
              async getUserMedia() {
                const audio = new AudioContext();
                const tone = audio.createOscillator();
                const gain = audio.createGain();
                gain.gain.value = 0.3;
                const out = audio.createMediaStreamDestination();
                tone.connect(gain).connect(out);
                tone.start();
                return out.stream;
              },
            },
          });
          // The server's count of today's units: what was used before plus what the fake charged.
          const realFetch = window.fetch.bind(window);
          window.fetch = async (input, init) => {
            const response = await realFetch(input, init);
            if (!String(input instanceof Request ? input.url : input).endsWith("/api/status")) return response;
            const json = await response.json();
            const charged = ((window as unknown as { __units?: number[] }).__units ?? []).reduce((a, b) => a + b, 0);
            if (json.voice) json.voice.usedUnits = used + charged;
            return new Response(JSON.stringify(json), { status: response.status, headers: { "content-type": "application/json" } });
          };
        }, USED);
        await page.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          if (url.pathname === "/api/status")
            return route.fulfill({
              json: {
                csrf: "SYNTHETIC",
                inference: {
                  ready: true,
                  reason: "OFFLINE ONLY",
                  qualification: { maxInputCharacters: 100000, speech: { model: "synthetic-speech", allowanceCost: 1 } },
                },
                search: false,
                voice: { chunkSeconds: 2, maxTurnSeconds: 22, dailyUnits: 150, usedUnits: USED },
              },
            });
          return route.continue();
        });
        await page.goto(origin, { timeout: 90000 });
        await ui(page.locator("html")).toHaveAttribute("lang", lang);

        // The first tap starts recording at once (owner, 17 November: no "Before you dictate" note).
        const mic = page.getByRole("button", { name: t.start, exact: true });
        await mic.click();
        await ui(page.getByRole("group", { name: t.noteTitle })).toHaveCount(0);

        // Recording: the start notice says how much is left; 22 s at most, so the warning comes at 2 s.
        const stop = page.getByRole("button", { name: t.stop, exact: true });
        await ui(stop).toBeVisible();
        await ui(stop).toHaveAttribute("aria-pressed", "true");
        await ui(page.locator("div.notice")).toContainText(t.today("4:36", "0:24"));
        await ui(stop).toContainText(t.stopsIn(19).slice(0, -2), { timeout: 5000 });
        await ui(page.locator("div.notice")).toContainText(t.warn(20));
        // Chunks are turned into text while recording goes on.
        await ui
          .poll(() => page.evaluate(() => (window as unknown as { __voiceCalls?: number }).__voiceCalls ?? 0), { timeout: 6000 })
          .toBeGreaterThanOrEqual(2);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await page.waitForTimeout(1000);
        await stop.click();

        // The parts in order, the failed one marked, a plain notice with the new used and left.
        const box = page.locator("#message-input");
        await ui(box).toHaveValue(`Hello there ${t.partMissing} and goodbye`, { timeout: 10_000 });
        const notice = page.locator("div.notice");
        await ui(notice).toContainText(t.partsFailed(1));
        await ui(notice).toContainText(todayPattern(lang));
        await ui(notice).not.toContainText(t.today("4:36", "0:24"));
        await ui(page.getByRole("button", { name: t.start, exact: true })).toBeEnabled();

        // Every chunk the real MediaRecorder made is a complete WebM file the browser can decode.
        const chunks = await page.evaluate(async () => {
          const all = (window as unknown as { __chunks: Blob[] }).__chunks;
          const audio = new AudioContext();
          return Promise.all(
            all.map(async (blob) => {
              const bytes = new Uint8Array(await blob.arrayBuffer());
              const decoded = await audio.decodeAudioData(bytes.slice().buffer).then((b) => b.duration, () => -1);
              return { type: blob.type, magic: [...bytes.slice(0, 4)].map((b) => b.toString(16)).join(""), decoded };
            }),
          );
        });
        expect(chunks.length).toBeGreaterThanOrEqual(3);
        for (const chunk of chunks) {
          expect(chunk.type).toContain("audio/webm");
          expect(chunk.magic).toBe("1a45dfa3"); // the EBML header: a standalone file
          expect(chunk.decoded).toBeGreaterThan(0.4);
        }
        const units = await page.evaluate(() => (window as unknown as { __units: number[] }).__units);
        expect(units.every((n) => n >= 1 && n <= 1)).toBe(true); // 2-second chunks: 1 unit each (clamped)
      } finally {
        await context.close();
      }
    }, 90_000);
