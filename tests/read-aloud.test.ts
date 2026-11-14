// Read aloud (docs/read-aloud-and-pdf-export-20261114.md): the local-voice rule, text clean-up,
// chunking, the reader's states and the switch. The rendered-answer walk needs a real page and is
// covered in tests/device-features-ui.test.ts.
import { afterEach, expect, it, vi } from "vitest";
import { pdfExportEnabled, readAloudEnabled } from "../src/device-features";
import { chooseVoice, createReader, loadVoices, speechChunks, tidySpeech } from "../src/read-aloud";
import { deviceText } from "../src/text/device-features";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const voice = (name: string, lang: string, localService: boolean | undefined, extra = {}) =>
  ({ name, lang, localService, voiceURI: name, default: false, ...extra }) as SpeechSynthesisVoice;
const desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0 Safari/537.36";

it("is off unless the build sets the variable to 1, each feature on its own", () => {
  expect([readAloudEnabled(), pdfExportEnabled()]).toEqual([false, false]);
  vi.stubEnv("VITE_READ_ALOUD", "true");
  expect(readAloudEnabled()).toBe(false);
  vi.stubEnv("VITE_READ_ALOUD", "1");
  expect([readAloudEnabled(), pdfExportEnabled()]).toEqual([true, false]);
  vi.stubEnv("VITE_PDF_EXPORT", "1");
  expect(pdfExportEnabled()).toBe(true);
});

it("picks a local voice for the answer's language (Chrome and Edge on Windows)", () => {
  const voices = [
    voice("Microsoft David - English (United States)", "en-US", true),
    voice("Microsoft Hedda - German (Germany)", "de-DE", true),
    voice("Google Deutsch", "de-DE", false),
    voice("Microsoft Katja Online (Natural) - German (Germany)", "de-DE", false),
  ];
  expect(chooseVoice(voices, "de", desktop)).toBe(voices[1]);
  expect(chooseVoice(voices, "en", desktop)).toBe(voices[0]);
});

it("prefers the browser's default voice among the local ones (Safari, Firefox)", () => {
  const voices = [voice("Anna", "de-DE", true), voice("Markus", "de-DE", true, { default: true })];
  expect(chooseVoice(voices, "de", desktop)).toBe(voices[1]);
});

it("refuses when only remote voices exist for the language, and never falls back", () => {
  const voices = [
    voice("Microsoft David - English (United States)", "en-US", true),
    voice("Google Deutsch", "de-DE", false),
    voice("Microsoft Katja Online (Natural) - German (Germany)", "de-DE", false),
  ];
  expect(chooseVoice(voices, "de", desktop)).toBe("none");
  expect(chooseVoice([], "en", desktop)).toBe("none");
});

it("does not trust a flag that is missing or contradicted by the voice's name", () => {
  expect(chooseVoice([voice("Deutsch", "de-DE", undefined)], "de", desktop)).toBe("none");
  // A browser that wrongly reports a network voice as local.
  expect(chooseVoice([voice("Google Deutsch", "de-DE", true)], "de", desktop)).toBe("none");
  expect(
    chooseVoice([voice("Katja", "de-DE", true, { voiceURI: "urn:voice:online:katja" })], "de", desktop),
  ).toBe("none");
});

it("does not speak on Android, where the flag cannot be relied on", () => {
  const android = "Mozilla/5.0 (Linux; Android 15; SM-A525F) Chrome/142.0 Mobile Safari/537.36";
  expect(chooseVoice([voice("Deutsch Deutschland", "de_DE", true)], "de", android)).toBe("unverifiable");
});

it("waits for voiceschanged when the list is empty at first, with a time limit", async () => {
  vi.useFakeTimers();
  let list: SpeechSynthesisVoice[] = [];
  let changed = () => {};
  const synth = {
    getVoices: () => list,
    addEventListener: (_: string, listener: () => void) => void (changed = listener),
    removeEventListener: vi.fn(),
  } as unknown as SpeechSynthesis;
  const late = loadVoices(synth);
  list = [voice("Anna", "de-DE", true)];
  changed();
  expect(await late).toEqual(list);
  expect(synth.removeEventListener).toHaveBeenCalled();
  list = [];
  const never = loadVoices(synth, 500);
  vi.advanceTimersByTime(500);
  expect(await never).toEqual([]);
});

it("says link and masked value instead of spelling addresses and placeholders", () => {
  expect(
    tidySpeech("See https://www.example.org/a/b?c=1#d, or www.example.org. Pay to {{IBAN-1}} and {phone-2}}.", deviceText.en),
  ).toBe("See link, or link. Pay to masked value and masked value.");
  expect(tidySpeech("Mehr unter (https://example.de/seite).  Konto {{IBAN-1}}", deviceText.de)).toBe(
    "Mehr unter (Link). Konto verborgener Wert",
  );
});

it("splits at sentence ends, keeps numbers whole and breaks an overlong sentence at a space", () => {
  expect(speechChunks("Das kostet 3.5 Euro. Wirklich? Ja!\nNeue Zeile ohne Punkt", 25)).toEqual([
    "Das kostet 3.5 Euro.",
    "Wirklich? Ja!",
    "Neue Zeile ohne Punkt",
  ]);
  const long = speechChunks(`${"word ".repeat(100)}end. Short one.`, 60);
  expect(long.every((chunk) => chunk.length <= 60)).toBe(true);
  expect(long.join(" ")).toBe(`${"word ".repeat(100)}end. Short one.`);
  expect(speechChunks("  \n ")).toEqual([]);
});

function fakeSynth() {
  const spoken: SpeechSynthesisUtterance[] = [];
  const calls: string[] = [];
  return {
    spoken,
    calls,
    speak: (utterance: SpeechSynthesisUtterance) => void spoken.push(utterance),
    cancel: () => void calls.push("cancel"),
    pause: () => void calls.push("pause"),
    resume: () => void calls.push("resume"),
  };
}
const utterance = (text: string) => ({ text }) as SpeechSynthesisUtterance;
const end = (u: SpeechSynthesisUtterance) => u.onend?.call(u, {} as SpeechSynthesisEvent);

it("reads the chunks in order with the chosen voice and returns to idle", () => {
  const synth = fakeSynth();
  const reader = createReader(synth, utterance);
  const seen: unknown[] = [];
  reader.subscribe(() => seen.push(reader.state()));
  const anna = voice("Anna", "de-DE", true);
  reader.start("m1", ["Eins.", "Zwei."], anna);
  expect(reader.state()).toEqual({ id: "m1", paused: false });
  expect(synth.spoken.map((u) => [u.text, u.voice, u.lang])).toEqual([["Eins.", anna, "de-DE"]]);
  end(synth.spoken[0]);
  expect(synth.spoken[1].text).toBe("Zwei.");
  end(synth.spoken[1]);
  expect(reader.state()).toBeUndefined();
  expect(seen).toEqual([{ id: "m1", paused: false }, undefined]);
  expect(synth.calls).toEqual([]);
});

it("pauses, resumes and stops; a stopped run speaks nothing more", () => {
  const synth = fakeSynth();
  const reader = createReader(synth, utterance);
  reader.pause();
  reader.resume();
  reader.stop();
  expect(synth.calls).toEqual([]);
  reader.start("m1", ["Eins.", "Zwei."], voice("Anna", "de-DE", true));
  reader.pause();
  reader.pause();
  expect(reader.state()).toEqual({ id: "m1", paused: true });
  reader.resume();
  expect(reader.state()).toEqual({ id: "m1", paused: false });
  reader.stop();
  expect(synth.calls).toEqual(["pause", "resume", "cancel"]);
  expect(reader.state()).toBeUndefined();
  // Engines fire end or error for the cancelled utterance; neither may continue the run.
  end(synth.spoken[0]);
  synth.spoken[0].onerror?.call(synth.spoken[0], {} as SpeechSynthesisErrorEvent);
  expect(synth.spoken).toHaveLength(1);
  expect(synth.calls).toHaveLength(3);
});

it("reads one answer at a time and stops on an engine error", () => {
  const synth = fakeSynth();
  const reader = createReader(synth, utterance);
  const anna = voice("Anna", "de-DE", true);
  reader.start("m1", ["Eins.", "Zwei."], anna);
  reader.start("m2", ["Drei."], anna);
  expect(synth.calls).toEqual(["cancel"]);
  expect(reader.state()).toEqual({ id: "m2", paused: false });
  end(synth.spoken[0]);
  expect(synth.spoken.map((u) => u.text)).toEqual(["Eins.", "Drei."]);
  synth.spoken[1].onerror?.call(synth.spoken[1], {} as SpeechSynthesisErrorEvent);
  expect(reader.state()).toBeUndefined();
  reader.start("m3", [], anna);
  expect(reader.state()).toBeUndefined();
});
