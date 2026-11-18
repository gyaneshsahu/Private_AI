// Voice input in the browser, offline (docs/voice-to-text-20261114.md): the recorder with a fake
// MediaRecorder and fake timers, the transcription call with the SDK as a test double, and the
// text landing in the draft. No microphone, no audio, no provider call. Synthetic only.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  transcribe: vi.fn(),
  chat: vi.fn(),
  verify: vi.fn(async () => undefined),
  refreshSecret: vi.fn(async () => undefined),
  close: vi.fn(),
}));
vi.mock("privatemode-ai", () => ({
  PrivatemodeAI: class {
    chat = { completions: { create: (body: unknown, options: unknown) => ({ asResponse: () => sdk.chat(body, options) }) } };
    audio = { transcriptions: { create: sdk.transcribe } };
    verify = sdk.verify;
    refreshSecret = sdk.refreshSecret;
    close = sdk.close;
  },
}));
import type { AppStatus } from "../shared/contracts";
import { VOICE_BITS_PER_SECOND } from "../shared/voice";
import { createMaskingSession } from "../src/identifier-masking";
import { AttestationBusyError, inferenceClientFor } from "../src/providers/inference-client";
import { discardPrivatemodeSession } from "../src/providers/privatemode-client";
import { voiceText } from "../src/text/voice";
import {
  createChunkQueue,
  createVoiceRecorder,
  finalVoiceRefusal,
  insertTranscript,
  turnSeconds,
  transcribeRecording,
  voiceFailureText,
  type VoiceRecorderState,
} from "../src/voice-input";
import { fakeManifest, privatemodeReport } from "./fixtures/privatemode-report";

// --- Recorder -----------------------------------------------------------------------------
class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static supported = ["audio/webm;codecs=opus"];
  static isTypeSupported = (type: string) => FakeRecorder.supported.includes(type);
  state = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: MediaStream,
    public options: { mimeType?: string; audioBitsPerSecond: number },
  ) {
    this.mimeType = options.mimeType ?? "";
    FakeRecorder.instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  /** Real recorders report the stop a moment later; `deferred` keeps it until the test releases it. */
  static deferred: (() => void)[] | undefined;
  /** Bytes each recorder hands over; under 1,000 is a chunk without sound. */
  static bytes = 2000;
  stop() {
    this.state = "inactive";
    const finish = () => {
      this.ondataavailable?.({ data: new Blob([new Uint8Array(FakeRecorder.bytes)]) });
      this.onstop?.();
    };
    if (FakeRecorder.deferred) FakeRecorder.deferred.push(finish);
    else finish();
  }
}
function harness(getUserMedia?: () => Promise<MediaStream>, maxSeconds = 120, chunkSeconds = 30) {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const states: VoiceRecorderState[] = [];
  const ticks: number[] = [];
  const audio: Blob[] = [];
  const units: number[] = [];
  const ends = { count: 0 };
  const media = { getUserMedia: vi.fn(getUserMedia ?? (async () => stream)) };
  const recorder = createVoiceRecorder({
    maxSeconds,
    chunkSeconds,
    onState: (state) => states.push(state),
    onTick: (elapsed) => ticks.push(elapsed),
    onChunk: (blob, n) => {
      audio.push(blob);
      units.push(n);
    },
    onEnd: () => ends.count++,
    media,
    Recorder: FakeRecorder,
  });
  return { recorder, track, stream, states, ticks, audio, units, ends, media };
}
beforeEach(() => {
  FakeRecorder.instances = [];
  FakeRecorder.supported = ["audio/webm;codecs=opus"];
  FakeRecorder.deferred = undefined;
  FakeRecorder.bytes = 2000;
});
afterEach(() => {
  discardPrivatemodeSession();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const mock of Object.values(sdk)) mock.mockReset();
  sdk.verify.mockImplementation(async () => undefined);
  sdk.refreshSecret.mockImplementation(async () => undefined);
});

it("records only after start, counts the seconds, and on stop hands over the audio and releases the microphone at once", async () => {
  vi.useFakeTimers();
  const h = harness();
  expect(h.media.getUserMedia).not.toHaveBeenCalled();
  await h.recorder.start();
  expect(h.media.getUserMedia).toHaveBeenCalledWith({ audio: true });
  expect(h.states).toEqual(["starting", "recording"]);
  expect(FakeRecorder.instances[0].options).toEqual({
    mimeType: "audio/webm;codecs=opus",
    audioBitsPerSecond: VOICE_BITS_PER_SECOND,
  });
  vi.advanceTimersByTime(12_300);
  expect(h.ticks.at(-1)).toBe(12);
  expect(h.track.stop).not.toHaveBeenCalled();
  h.recorder.stop();
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  expect(h.states.at(-1)).toBe("idle");
  expect(h.audio).toHaveLength(1);
  expect(h.audio[0].type).toBe("audio/webm;codecs=opus");
  expect(h.audio[0].size).toBe(2000);
  // 12.3 seconds are 7 voice units (2 seconds each, rounded up); the turn ended once.
  expect(h.units).toEqual([7]);
  expect(h.ends.count).toBe(1);
  // Nothing keeps running after the stop.
  vi.advanceTimersByTime(300_000);
  expect(h.audio).toHaveLength(1);
  expect(h.ticks.at(-1)).toBe(12);
  h.recorder.stop(); // a second stop is not a second turn
  expect(h.ends.count).toBe(1);
});

it("splits a long turn into standalone chunks of at most 30 seconds, each a new recorder on the same stream, without stopping the user", async () => {
  vi.useFakeTimers();
  const h = harness(undefined, 180, 30);
  await h.recorder.start();
  vi.advanceTimersByTime(30_000);
  // The first chunk is handed over while recording goes on; the next recorder started first.
  expect(h.units).toEqual([15]);
  expect(FakeRecorder.instances).toHaveLength(2);
  expect(FakeRecorder.instances.every((r) => r.stream === h.stream)).toBe(true);
  expect(h.recorder.state).toBe("recording");
  expect(h.track.stop).not.toHaveBeenCalled();
  vi.advanceTimersByTime(30_000);
  vi.advanceTimersByTime(5_100);
  h.recorder.stop();
  // 30 s, 30 s and about 5 s: 15, 15 and 3 units; never more than 15 for one chunk.
  expect(h.units).toEqual([15, 15, 3]);
  expect(h.ends.count).toBe(1);
  expect(h.track.stop).toHaveBeenCalledTimes(1);
});

it("hands chunks over in order even when the recorders report their stop late, and ends the turn after the last", async () => {
  vi.useFakeTimers();
  FakeRecorder.deferred = [];
  const h = harness(undefined, 180, 10);
  await h.recorder.start();
  vi.advanceTimersByTime(10_000);
  vi.advanceTimersByTime(3_000);
  h.recorder.stop();
  expect(h.audio).toHaveLength(0);
  expect(h.ends.count).toBe(0);
  const [first, second] = FakeRecorder.deferred;
  second(); // the last chunk reports first: it waits for the first
  expect(h.units).toEqual([]);
  first();
  expect(h.units).toEqual([5, 2]);
  expect(h.ends.count).toBe(1);
});

it("stops by itself at the turn maximum, and a cancel drops chunks that were still on their way", async () => {
  vi.useFakeTimers();
  const h = harness(undefined, 120, 30);
  await h.recorder.start();
  vi.advanceTimersByTime(119_000);
  expect(h.recorder.state).toBe("recording");
  vi.advanceTimersByTime(1_500);
  expect(h.recorder.state).toBe("idle");
  expect(h.ticks.at(-1)).toBe(120);
  expect(h.units).toEqual([15, 15, 15, 15]);
  expect(h.ends.count).toBe(1);
  expect(h.track.stop).toHaveBeenCalledTimes(1);

  FakeRecorder.deferred = [];
  const c = harness(undefined, 120, 10);
  await c.recorder.start();
  vi.advanceTimersByTime(10_000); // one chunk on its way
  c.recorder.cancel();
  for (const finish of FakeRecorder.deferred) finish();
  expect(c.audio).toEqual([]);
  expect(c.ends.count).toBe(0);
});

it("a chunk without sound (under 1,000 bytes) is not sent, and the turn still ends", async () => {
  vi.useFakeTimers();
  const h = harness(undefined, 120, 10);
  await h.recorder.start();
  vi.advanceTimersByTime(10_000);
  FakeRecorder.bytes = 400;
  vi.advanceTimersByTime(3_000);
  h.recorder.stop();
  expect(h.units).toEqual([5]);
  expect(h.ends.count).toBe(1);
});

it("cancel drops the recording and releases the microphone, also while the permission prompt is open", async () => {
  const h = harness();
  await h.recorder.start();
  h.recorder.cancel();
  expect(h.audio).toEqual([]);
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  expect(h.recorder.state).toBe("idle");
  // Cancelled before the user answered the prompt: the stream that arrives later is released unused.
  let grant!: (stream: MediaStream) => void;
  const late = harness(() => new Promise<MediaStream>((resolve) => (grant = resolve)));
  const starting = late.recorder.start();
  expect(late.recorder.state).toBe("starting");
  late.recorder.cancel();
  grant(late.stream);
  await starting;
  expect(late.track.stop).toHaveBeenCalledTimes(1);
  expect(late.recorder.state).toBe("idle");
  expect(FakeRecorder.instances).toHaveLength(1);
});

it("names each microphone failure: refused, no device, busy, unsupported browser", async () => {
  const named = (name: string) => Object.assign(new Error("x"), { name });
  for (const [name, failure] of [
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "noDevice"],
    ["NotReadableError", "micFailed"],
    ["NotSupportedError", "unsupported"],
  ] as const) {
    const h = harness(async () => {
      throw named(name);
    });
    await expect(h.recorder.start()).rejects.toBe(failure);
    expect(h.recorder.state).toBe("idle");
    expect(voiceText.en[failure]).not.toBe(voiceText.de[failure]);
  }
  const none = createVoiceRecorder({
    maxSeconds: 120,
    chunkSeconds: 30,
    onState() {},
    onTick() {},
    onChunk() {},
    onEnd() {},
    media: undefined,
    Recorder: undefined,
  });
  await expect(none.start()).rejects.toBe("unsupported");
});

it("records MP4 where WebM is missing (Safari) and lets the browser choose when nothing is listed", async () => {
  FakeRecorder.supported = ["audio/mp4"];
  const safari = harness();
  await safari.recorder.start();
  expect(FakeRecorder.instances[0].options.mimeType).toBe("audio/mp4");
  safari.recorder.cancel();
  FakeRecorder.supported = [];
  const other = harness();
  await other.recorder.start();
  expect(FakeRecorder.instances[1].options).toEqual({ audioBitsPerSecond: VOICE_BITS_PER_SECOND });
  other.recorder.cancel();
});

// --- Transcript into the draft ------------------------------------------------------------
it("inserts the transcript at the cursor or over the selection, spaced from its neighbours, within the box limit", () => {
  expect(insertTranscript("", 0, 0, "Hallo Welt")).toEqual({ value: "Hallo Welt", caret: 10 });
  expect(insertTranscript("Dear team,", 10, 10, "see you on Monday.")).toEqual({
    value: "Dear team, see you on Monday.",
    caret: 29,
  });
  expect(insertTranscript("one three", 4, 4, "two").value).toBe("one two three");
  expect(insertTranscript("keep REPLACE keep", 5, 12, "this").value).toBe("keep this keep");
  expect(insertTranscript("x".repeat(19_990), 19_990, 19_990, "y".repeat(50)).value).toHaveLength(20_000);
});

it("a dictated identifier is masked at send time exactly like a typed one", () => {
  // The transcript becomes ordinary draft text; sending runs the same masking session over it.
  const draft = insertTranscript("", 0, 0, "Meine IBAN ist DE89 3704 0044 0532 0130 00, bitte prüfen.").value;
  const masked = createMaskingSession().mask(draft);
  expect(masked).toContain("{{IBAN-1}}");
  expect(masked).not.toContain("DE89");
});

it("the voice code only writes to the draft: it never sends, saves or uses the browser's own dictation", () => {
  const source = ["src/voice-input.ts", "src/VoiceInput.tsx"].map((file) => readFileSync(file, "utf8")).join("\n");
  expect(source).not.toMatch(/SpeechRecognition|streamVerifiedConversation|from "\.\/(vault|conversation|saved)|indexedDB|sessionStorage|createObjectURL/);
  // The only stored value is the flag that the first-use note was shown.
  expect(source.match(/localStorage\.setItem\([^)]*\)/g)).toEqual(['localStorage.setItem(NOTE_KEY, "1")']);
});

// --- Transcription call -------------------------------------------------------------------
const report = privatemodeReport({ speech: { model: "whisper-large-v3", allowanceCost: 1 } });
const status = {
  csrf: "c".repeat(64),
  inference: { ready: true, reason: "", qualification: report },
} as unknown as AppStatus;
const serveManifest = () => {
  vi.stubGlobal("location", { origin: "https://app.example.test", host: "app.example.test" });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(fakeManifest)));
};
const recording = () => new Blob([new Uint8Array(4000)], { type: "audio/webm;codecs=opus" });
const signal = () => new AbortController().signal;

it("one verification covers chat and transcription; the recording goes through the SDK with the pinned speech model", async () => {
  serveManifest();
  // Chat verified first, as in the app.
  const chat = await inferenceClientFor("privatemode").verify(
    { ...report, provider: "privatemode", csrf: status.csrf } as never,
    signal(),
    () => {},
  );
  sdk.chat.mockResolvedValueOnce(new Response("data: [DONE]\n\n"));
  await (await chat.transport()).request("ignored", { method: "POST", body: "{}" });
  sdk.transcribe.mockResolvedValue({ text: "  Guten Morgen, das ist ein Test.  " });
  expect(await transcribeRecording(recording(), 2, status, signal())).toBe("Guten Morgen, das ist ein Test.");
  expect(await transcribeRecording(recording(), 2, status, signal())).toBe("Guten Morgen, das ist ein Test.");
  expect(sdk.verify).toHaveBeenCalledTimes(1);
  expect(sdk.refreshSecret).toHaveBeenCalledTimes(1);
  const [body, options] = sdk.transcribe.mock.calls[0];
  expect(body.model).toBe("whisper-large-v3");
  expect(body.response_format).toBe("json");
  expect(body.language).toBeUndefined(); // the model detects German or English itself
  expect(body.file.name).toBe("recording.webm");
  expect(body.file.type).toBe("audio/webm");
  expect(body.file.size).toBe(4000);
  // The chunk's measured length travels in a header the relay checks against the encrypted size.
  expect(options.headers).toEqual({ "privatemode-target-model": "whisper-large-v3", "x-privateai-voice-units": "2" });
  expect(options.signal).toBeInstanceOf(AbortSignal);
});

it("our relay's own refusal keeps the verified session and gives a plain message in both languages", async () => {
  serveManifest();
  const refusal = (reason: string, statusCode = 429) =>
    Object.assign(new Error("refused"), { status: statusCode, headers: new Headers({ "x-privateai-voice": reason }) });
  // The allowance and the day's request cap give the one calm limit message (owner, 18 November).
  for (const reason of ["refused_daily", "refused_allowance"]) {
    sdk.transcribe.mockRejectedValueOnce(refusal(reason));
    const error = await transcribeRecording(recording(), 2, status, signal()).catch((e: unknown) => e);
    expect(voiceFailureText(error)).toBe("Limit reached.");
    vi.stubGlobal("document", { documentElement: { lang: "de" } });
    expect(voiceFailureText(error)).toBe("Limit erreicht.");
    vi.stubGlobal("document", undefined);
  }
  for (const [reason, key] of [
    ["refused_voice_daily", "voiceDaily"],
    ["refused_account_busy", "busy"],
    ["refused_spend", "spend"],
    ["refused_size", "tooLarge"],
    ["stopped", "paused"],
  ] as const) {
    sdk.transcribe.mockRejectedValueOnce(refusal(reason));
    const error = await transcribeRecording(recording(), 2, status, signal()).catch((e: unknown) => e);
    expect(voiceFailureText(error)).toBe(voiceText.en[key]);
    vi.stubGlobal("document", { documentElement: { lang: "de" } });
    expect(voiceFailureText(error)).toBe(voiceText.de[key]);
    vi.stubGlobal("document", undefined);
  }
  expect(sdk.verify).toHaveBeenCalledTimes(1);
  expect(sdk.close).not.toHaveBeenCalled();
});

it("a provider failure ends the session (the next request verifies afresh) and never shows provider text", async () => {
  serveManifest();
  sdk.transcribe.mockRejectedValueOnce(
    Object.assign(new Error("502 secret upstream detail"), {
      status: 502,
      headers: new Headers({ "x-privateai-voice": "upstream_rejected", "x-privateai-upstream": "rejected" }),
    }),
  );
  const error = await transcribeRecording(recording(), 2, status, signal()).catch((e: unknown) => e);
  expect(voiceFailureText(error)).toBe(voiceText.en.failed);
  expect(sdk.close).toHaveBeenCalledTimes(1);
  sdk.transcribe.mockResolvedValueOnce({ text: "ok" });
  expect(await transcribeRecording(recording(), 2, status, signal())).toBe("ok");
  expect(sdk.verify).toHaveBeenCalledTimes(2);
  // A bare 413 (for example from the hosting bridge, without our header) still reads as too large.
  expect(voiceFailureText(Object.assign(new Error("x"), { status: 413 }))).toBe(voiceText.en.tooLarge);
  expect(voiceFailureText(new Error("anything"))).toBe(voiceText.en.failed);
});

it("a refused verification gives the verification countdown, and no speech model in the report means off", async () => {
  vi.stubGlobal("location", { origin: "https://app.example.test", host: "app.example.test" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).endsWith("/verify-wait") ? Response.json({ seconds: 42 }) : new Response(fakeManifest),
    ),
  );
  sdk.verify.mockRejectedValueOnce(new Error("updating mesh CA: doing attest request: unexpected status code: 503"));
  const busy = await transcribeRecording(recording(), 2, status, signal()).catch((e: unknown) => e);
  expect(busy).toBeInstanceOf(AttestationBusyError);
  expect((busy as AttestationBusyError).retryAt).toBeGreaterThan(Date.now());
  expect(sdk.transcribe).not.toHaveBeenCalled();
  const off = { ...status, inference: { ...status.inference, qualification: privatemodeReport() } } as unknown as AppStatus;
  await expect(transcribeRecording(recording(), 2, off, signal())).rejects.toThrow(voiceText.en.off);
});

// --- Chunk queue: joining, retry, failure marker, final refusal -----------------------------
const refusedBy = (reason: string) =>
  Object.assign(new Error("refused"), { status: 429, headers: new Headers({ "x-privateai-voice": reason }) });
const chunk = (n: number) => new Blob([new Uint8Array(1000 + n)]);

it("transcribes chunks one after the other while recording goes on, and joins the texts in order", async () => {
  const running: number[] = [];
  let open = 0;
  const transcribe = vi.fn(async (audio: Blob, units: number) => {
    running.push(++open);
    await new Promise((resolve) => setTimeout(resolve, 5));
    open--;
    return ` part ${audio.size - 1000} (${units}) `;
  });
  const queue = createChunkQueue(transcribe, "[part not transcribed]");
  queue.add(chunk(1), 15);
  queue.add(chunk(2), 15);
  queue.add(chunk(3), 4);
  expect(await queue.finish()).toEqual({ text: "part 1 (15) part 2 (15) part 3 (4)", chunks: 3, failed: 0, error: undefined });
  expect(Math.max(...running)).toBe(1); // one request per account at a time
});

it("a failed chunk is tried once more; then it is marked and the rest goes on", async () => {
  const transcribe = vi
    .fn<(audio: Blob, units: number, signal: AbortSignal) => Promise<string>>()
    .mockResolvedValueOnce("one")
    .mockRejectedValueOnce(Error("network"))
    .mockResolvedValueOnce("two after retry")
    .mockRejectedValueOnce(Error("network"))
    .mockRejectedValueOnce(Error("network again"))
    .mockResolvedValueOnce("four");
  const queue = createChunkQueue(transcribe, "[part not transcribed]", undefined, 0);
  for (let i = 1; i <= 4; i++) queue.add(chunk(i), 15);
  const result = await queue.finish();
  expect(result).toMatchObject({ text: "one two after retry [part not transcribed] four", chunks: 4, failed: 1 });
  expect((result.error as Error).message).toBe("network again");
  expect(transcribe).toHaveBeenCalledTimes(6);
});

it("a final refusal (budget used up) stops at once: no retry, the remaining chunks are marked without being sent, the caller is told", async () => {
  const onFinal = vi.fn();
  const transcribe = vi
    .fn<(audio: Blob, units: number, signal: AbortSignal) => Promise<string>>()
    .mockResolvedValueOnce("kept")
    .mockRejectedValueOnce(refusedBy("refused_voice_daily"));
  const queue = createChunkQueue(transcribe, "[x]", onFinal, 0);
  for (let i = 1; i <= 3; i++) queue.add(chunk(i), 15);
  const result = await queue.finish();
  expect(result).toMatchObject({ text: "kept [x] [x]", chunks: 2, failed: 2 });
  expect(transcribe).toHaveBeenCalledTimes(2);
  expect(onFinal).toHaveBeenCalledTimes(1);
  expect(voiceFailureText(result.error)).toBe(voiceText.en.voiceDaily);
  expect(finalVoiceRefusal(refusedBy("refused_account_busy"))).toBe(false);
  expect(finalVoiceRefusal(new AttestationBusyError(30))).toBe(true);
});

it("cancel aborts the running chunk and finish rejects; nothing more is sent", async () => {
  const signals: AbortSignal[] = [];
  const transcribe = vi.fn(
    (_audio: Blob, _units: number, signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signals.push(signal);
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
  );
  const queue = createChunkQueue(transcribe, "[x]");
  queue.add(chunk(1), 15);
  queue.add(chunk(2), 15);
  await vi.waitFor(() => expect(signals).toHaveLength(1));
  queue.cancel();
  await expect(queue.finish()).rejects.toThrow();
  expect(signals[0].aborted).toBe(true);
  expect(transcribe).toHaveBeenCalledTimes(1);
});

it("the next turn's length: the turn maximum while any of today's voice time is left (a started recording finishes)", () => {
  const voice = { chunkSeconds: 30, maxTurnSeconds: 180, dailyUnits: 150 };
  expect(turnSeconds(voice)).toBe(180); // usage unknown: the server still enforces the budget
  expect(turnSeconds({ ...voice, usedUnits: 0 })).toBe(180);
  expect(turnSeconds({ ...voice, usedUnits: 130 })).toBe(180);
  expect(turnSeconds({ ...voice, usedUnits: 149 })).toBe(180);
  expect(turnSeconds({ ...voice, usedUnits: 150 })).toBe(0);
});