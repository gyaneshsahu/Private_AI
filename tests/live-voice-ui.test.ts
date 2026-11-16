// Live voice (docs/live-voice-20261114.md) in the actual application at phone, tablet and desktop
// width, English and German. Offline: a Vite plugin replaces src/inference.ts and the transcription,
// the microphone is a generated tone (quiet "room" and loud "speech"), speechSynthesis is faked.
// The first turn ends by the silence detector alone (no tap), so this is also the browser test of
// silence detection with synthetic audio. Every request the fakes receive is recorded.
import { afterAll, beforeAll, expect, it } from "vitest";
import { chromium, expect as ui, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { liveVoiceText } from "../src/text/live-voice";
import { voiceText } from "../src/text/voice";

let vite: ViteDevServer;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  process.env.VITE_LIVE_VOICE = "1";
  process.env.VITE_READ_ALOUD = "1";
  vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-live-voice-ui-test",
    plugins: [
      {
        name: "synthetic-model-and-speech",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `export async function streamReply(c,q,csrf,signal,chunk){
            (window.__calls ??= []).push(c.messages.at(-1).text);
            await new Promise((r) => setTimeout(r, 200));
            if (signal.aborted) throw signal.reason;
            chunk("Synthetic answer about the time.");
            return { input: 1, output: 1, total: 2, estimatedUSD: 0 };
          }`;
        },
        transform(code, id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/voice-input.ts")) return;
          return code.replace(
            "export async function transcribeRecording(",
            `export async function transcribeRecording(audio, units, status, signal) {
              (window.__heard ??= []).push(audio.size);
              await new Promise((r) => setTimeout(r, 100));
              signal.throwIfAborted();
              return "What time is it";
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
  browser = await chromium.launch({
    ...browserLaunchOptions(),
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
}, 120_000);

afterAll(async () => {
  delete process.env.VITE_LIVE_VOICE;
  delete process.env.VITE_READ_ALOUD;
  await browser?.close();
  await vite?.close();
});

async function open(lang: "en" | "de", width: number) {
  const context = await browser.newContext({
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width, height: width < 700 ? 812 : 900 },
    reducedMotion: lang === "de" ? "reduce" : "no-preference",
  });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  await page.addInitScript(() => {
    const fake = { spoken: [] as string[], tracks: [] as MediaStreamTrack[], loud: (on: boolean) => void on };
    // The microphone: a tone whose level the test sets. 0.004 is a quiet room, 0.3 is speech.
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        async getUserMedia() {
          const context = new AudioContext();
          const tone = context.createOscillator();
          const gain = context.createGain();
          gain.gain.value = 0.004;
          const out = context.createMediaStreamDestination();
          tone.connect(gain).connect(out);
          tone.start();
          fake.loud = (on) => void (gain.gain.value = on ? 0.3 : 0.004);
          fake.tracks.push(...out.stream.getTracks());
          return out.stream;
        },
      },
    });
    class Utterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const voices = [
      { name: "Local English", lang: "en-US", localService: true, voiceURI: "Local English", default: true },
      { name: "Local German", lang: "de-DE", localService: true, voiceURI: "Local German", default: false },
    ];
    Object.assign(window, { fake, SpeechSynthesisUtterance: Utterance });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => voices,
        addEventListener() {},
        removeEventListener() {},
        speak(u: Utterance) {
          fake.spoken.push(u.text);
          setTimeout(() => u.onend?.(), 150);
        },
        cancel() {},
        pause() {},
        resume() {},
      },
    });
  });
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
          voice: { chunkSeconds: 10, maxTurnSeconds: 180, dailyUnits: 150, usedUnits: 10 },
        },
      });
    return route.continue();
  });
  await page.goto(origin, { timeout: 90000 });
  await ui(page.locator("html")).toHaveAttribute("lang", lang);
  return { context, page };
}

type Fake = { spoken: string[]; tracks: { readyState: string }[] };
const fake = (page: Page) =>
  page.evaluate(() => {
    const f = (window as unknown as { fake: Fake }).fake;
    return { spoken: f.spoken, live: f.tracks.filter((t) => t.readyState === "live").length };
  });
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __calls?: string[] }).__calls ?? []);
const loud = (page: Page, on: boolean) =>
  page.evaluate((value) => (window as unknown as { fake: { loud(on: boolean): void } }).fake.loud(value), on);

for (const lang of ["en", "de"] as const)
  for (const width of [375, 768, 1280])
    it(`live voice at ${width} px, ${lang}: a spoken turn by silence, then Stop sends nothing`, async () => {
      const t = liveVoiceText[lang];
      const { context, page } = await open(lang, width);
      try {
        const trigger = page.getByRole("button", { name: t.open, exact: true });
        await ui(trigger).toBeVisible();
        // The disabled placeholder is gone; the menu no longer lists live voice as coming later.
        await ui(page.locator(".future-voice, .coming-later-list")).toHaveCount(0);
        await trigger.click();
        const panel = page.getByRole("region", { name: t.title });
        await ui(panel).toBeVisible();
        await ui(panel).toContainText(t.what);
        await ui(panel).toContainText(t.cost(2, "Fast", 15, 15).split("(")[0]);
        // Today's voice time, from the status.
        await ui(panel).toContainText(voiceText[lang].today("0:20", "4:40"));
        // Focus moves into the panel; it fits the screen; no sideways scroll.
        await ui(panel.getByRole("button", { name: t.start })).toBeFocused();
        const box = (await panel.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        ).toBe(true);
        for (const button of await panel.getByRole("button").all()) {
          const size = (await button.boundingBox())!;
          expect(size.height).toBeGreaterThanOrEqual(44);
        }

        // Turn 1: speak for a second, then quiet. The silence detector ends the recording.
        await panel.getByRole("button", { name: t.start }).click();
        const done = panel.getByRole("button", { name: t.doneSpeaking });
        await ui(done).toBeVisible();
        await page.waitForTimeout(600); // the room's level is measured first
        await loud(page, true);
        await page.waitForTimeout(1000);
        await loud(page, false);
        await ui(panel).toContainText("What time is it", { timeout: 6000 });
        await ui(panel.getByRole("button", { name: t.sendNow })).toBeVisible(); // the countdown before sending
        await ui(panel).toContainText("Synthetic answer about the time.", { timeout: 8000 });
        // The answer was read aloud, then the microphone opened again.
        await ui(done).toBeVisible({ timeout: 8000 });
        expect((await fake(page)).spoken.join(" ")).toContain("Synthetic answer about the time.");
        expect(await calls(page)).toEqual(["What time is it"]);
        await ui(panel).toContainText(t.used(1, 15, 2));
        await ui(page.locator("article.assistant").last()).toContainText("Synthetic answer about the time.");
        // The turn went through the chunked recorder: one chunk of the real MediaRecorder, its units reported.
        const heard = await page.evaluate(() => (window as unknown as { __heard: number[] }).__heard);
        expect(heard).toHaveLength(1);
        expect(heard[0]).toBeGreaterThan(1000);

        // Turn 2: tap to stop speaking, then End during the countdown. Nothing more is sent.
        await loud(page, true);
        await page.waitForTimeout(400);
        await done.click();
        await ui(panel.getByRole("button", { name: t.sendNow })).toBeVisible();
        await panel.getByRole("button", { name: t.end, exact: true }).click();
        await ui(panel).toContainText(t.stopped);
        await page.waitForTimeout(3500);
        expect(await calls(page)).toEqual(["What time is it"]);
        expect((await fake(page)).live).toBe(0); // the microphone is released

        // Escape closes; the focus goes back to the button.
        await page.keyboard.press("Escape");
        await ui(panel).toHaveCount(0);
        await ui(trigger).toBeFocused();
      } finally {
        await context.close();
      }
    }, 90_000);
