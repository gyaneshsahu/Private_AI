// Live voice loop (src/live-voice.ts) with fakes and fake timers: every transition, every
// interruption, the caps, and Stop from every state releasing everything.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLiveVoice,
  createSilenceDetector,
  SILENCE_DEFAULTS,
  speechTimeoutMs,
  type LivePhase,
  type LiveSnapshot,
  type LiveStop,
  type SendOutcome,
} from "../src/live-voice";

const flush = () => vi.advanceTimersByTimeAsync(0);

function setup(options: Partial<Parameters<typeof createLiveVoice>[1]> = {}) {
  const phases: LivePhase[] = [];
  const signals: AbortSignal[] = [];
  let finishSpeech: ((result: "spoken" | { refused: string }) => void) | undefined;
  const deps = {
    recorder: { start: vi.fn(async () => {}), stop: vi.fn(() => live.heard(1)), cancel: vi.fn() },
    transcribe: vi.fn(async (signal: AbortSignal) => {
      signals.push(signal);
      return { text: " What is the time? ", failed: 0 };
    }),
    blocked: vi.fn((): LiveStop | undefined => undefined),
    send: vi.fn(async (_text: string, signal: AbortSignal): Promise<SendOutcome> => {
      signals.push(signal);
      return "answered";
    }),
    speaker: {
      speak: vi.fn(
        (started: (ms: number) => void) =>
          new Promise<"spoken" | { refused: string }>((resolve) => {
            started(5000);
            finishSpeech = resolve;
          }),
      ),
      cancel: vi.fn(),
    },
    clock: {
      now: () => Date.now(),
      setTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
      clearTimeout: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
    },
    earcon: vi.fn(),
    onChange: vi.fn((snapshot: LiveSnapshot) => {
      if (phases.at(-1) !== snapshot.phase) phases.push(snapshot.phase);
    }),
  };
  const live = createLiveVoice(deps, {
    review: 2,
    maxTurns: 15,
    maxMs: 600_000,
    speechCost: 1,
    messageCost: 1,
    ...options,
  });
  return { live, deps, phases, signals, speechDone: (r: "spoken" | { refused: string } = "spoken") => finishSpeech?.(r) };
}
type Setup = ReturnType<typeof setup>;

/** Drives a fresh session to `phase`. */
async function reach(s: Setup, phase: LivePhase) {
  s.live.start();
  await flush();
  if (phase === "listening") return;
  if (phase === "starting") throw Error("use a pending recorder");
  if (phase === "transcribing") {
    s.deps.transcribe.mockImplementationOnce(() => new Promise(() => {}));
    s.live.doneSpeaking();
    await flush();
    return;
  }
  s.live.doneSpeaking();
  await flush();
  if (phase === "review") return;
  if (phase === "answering") {
    s.deps.send.mockImplementationOnce((_t, signal) => {
      s.signals.push(signal);
      return new Promise(() => {});
    });
  }
  await vi.advanceTimersByTimeAsync(2000);
  if (phase === "answering" || phase === "speaking") return;
  if (phase === "paused") {
    s.live.pause();
    return;
  }
  throw Error(phase);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("the loop", () => {
  it("listens, transcribes, shows, sends, speaks and listens again", async () => {
    const s = setup();
    s.live.start();
    await flush();
    expect(s.live.snapshot().phase).toBe("listening");
    s.live.doneSpeaking();
    await flush();
    expect(s.live.snapshot()).toMatchObject({ phase: "review", transcript: "What is the time?", reviewLeft: 2, units: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.live.snapshot().reviewLeft).toBe(1);
    expect(s.deps.send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.deps.send).toHaveBeenCalledWith("What is the time?", expect.any(AbortSignal));
    expect(s.live.snapshot()).toMatchObject({ phase: "speaking", turns: 1, units: 2 });
    s.speechDone();
    await flush();
    expect(s.live.snapshot().phase).toBe("listening");
    expect(s.phases).toEqual(["starting", "listening", "transcribing", "review", "answering", "speaking", "starting", "listening"]);
    expect(s.deps.earcon.mock.calls.map(([name]) => name)).toEqual(["listen", "heard", "sent", "listen"]);
  });

  it("never opens the microphone while the answer is spoken (echo)", async () => {
    const s = setup();
    await reach(s, "speaking");
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(1);
    s.speechDone();
    await flush();
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(2);
  });

  it("times out a speech engine that never reports the end", async () => {
    const s = setup();
    await reach(s, "speaking");
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.deps.speaker.cancel).toHaveBeenCalled();
    expect(s.live.snapshot().phase).toBe("listening");
    s.speechDone(); // late: ignored
    await flush();
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(2);
  });

  it("skips the rest of the answer on a tap and listens", async () => {
    const s = setup();
    await reach(s, "speaking");
    s.live.skipSpeech();
    await flush();
    expect(s.deps.speaker.cancel).toHaveBeenCalled();
    expect(s.live.snapshot().phase).toBe("listening");
    s.speechDone();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(2);
  });

  it("with always ask, waits for Send now", async () => {
    const s = setup({ review: "ask" });
    await reach(s, "review");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(s.deps.send).not.toHaveBeenCalled();
    expect(s.live.snapshot().reviewLeft).toBeUndefined();
    s.live.sendNow();
    await flush();
    expect(s.deps.send).toHaveBeenCalledTimes(1);
  });

  it("Cancel pauses without sending; Resume listens again", async () => {
    const s = setup();
    await reach(s, "review");
    s.live.cancelReview();
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.deps.send).not.toHaveBeenCalled();
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "cancelled" } });
    s.live.resume();
    await flush();
    expect(s.live.snapshot().phase).toBe("listening");
  });

  it("Edit ends the session and hands over the transcript", async () => {
    const s = setup();
    await reach(s, "review");
    expect(s.live.edit()).toBe("What is the time?");
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.deps.send).not.toHaveBeenCalled();
    expect(s.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "edit" } });
    expect(s.live.edit()).toBeUndefined();
  });

  it("the silence detector's 'nothing said' pauses without transcribing", async () => {
    const s = setup();
    await reach(s, "listening");
    s.live.noSpeech();
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "noSpeech" } });
    expect(s.deps.transcribe).not.toHaveBeenCalled();
  });
});

describe("interruptions", () => {
  it("a silent recording is neither transcribed nor sent", async () => {
    const s = setup();
    await reach(s, "listening");
    s.live.heard(0);
    await flush();
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "noSpeech" }, units: 0 });
    expect(s.deps.transcribe).not.toHaveBeenCalled();
  });

  it("a long turn in several chunks counts each chunk; a part that failed waits for a tap before sending", async () => {
    const s = setup({ speechCost: 1 });
    s.deps.recorder.stop.mockImplementationOnce(() => s.live.heard(3));
    s.deps.transcribe.mockResolvedValueOnce({ text: "First part [part not transcribed] third part", failed: 1 });
    await reach(s, "review");
    expect(s.live.snapshot()).toMatchObject({ phase: "review", units: 3, reviewLeft: undefined });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.deps.send).not.toHaveBeenCalled();
    s.live.sendNow();
    await flush();
    expect(s.deps.send).toHaveBeenCalledWith("First part [part not transcribed] third part", expect.any(AbortSignal));
  });

  it("an empty transcript pauses and costs the transcription only", async () => {
    const s = setup();
    s.deps.transcribe.mockResolvedValueOnce({ text: "  ", failed: 0 });
    await reach(s, "review");
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "emptyTranscript" }, units: 1 });
    expect(s.deps.send).not.toHaveBeenCalled();
  });

  it("a failed transcription pauses; a final refusal (daily cap) ends", async () => {
    const s = setup();
    s.deps.transcribe.mockRejectedValueOnce({ detail: "Try again." } satisfies LiveStop);
    await reach(s, "review");
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "transcribeFailed", detail: "Try again." } });
    const t = setup();
    t.deps.transcribe.mockRejectedValueOnce({ detail: "Daily limit.", end: true } satisfies LiveStop);
    await reach(t, "review");
    expect(t.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "transcribeFailed", detail: "Daily limit." }, units: 0 });
  });

  it("a microphone that cannot open ends with the reason", async () => {
    const s = setup();
    s.deps.recorder.start.mockRejectedValueOnce("Microphone access was refused.");
    s.live.start();
    await flush();
    expect(s.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "mic", detail: "Microphone access was refused." } });
  });

  it("a block before listening pauses or ends; before sending it stops the send", async () => {
    const s = setup();
    s.deps.blocked.mockReturnValueOnce({ detail: "Offline." });
    s.live.start();
    await flush();
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "blocked", detail: "Offline." } });
    expect(s.deps.recorder.start).not.toHaveBeenCalled();

    const t = setup();
    await reach(t, "review");
    t.deps.blocked.mockReturnValueOnce({ detail: "No allowance.", end: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "blocked", detail: "No allowance." } });
    expect(t.deps.send).not.toHaveBeenCalled();
  });

  it("health consent and the search-first choice end the session; nothing counts as sent", async () => {
    for (const [outcome, key] of [
      ["consent", "consent"],
      ["choice", "searchChoice"],
    ] as const) {
      const s = setup();
      s.deps.send.mockResolvedValueOnce(outcome);
      await reach(s, "speaking");
      expect(s.live.snapshot()).toMatchObject({ phase: "ended", reason: { key }, turns: 0, units: 1 });
      expect(s.deps.speaker.speak).not.toHaveBeenCalled();
    }
  });

  it("a failed answer pauses and counts as a request", async () => {
    const s = setup();
    s.deps.send.mockResolvedValueOnce("failed");
    await reach(s, "speaking");
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "sendFailed" }, turns: 1, units: 1 });
    s.deps.send.mockRejectedValueOnce(Error("network"));
    s.live.resume();
    await flush();
    s.live.doneSpeaking();
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "sendFailed" }, turns: 2 });
  });

  it("no on-device voice: the answer stays on screen and the loop pauses", async () => {
    const s = setup();
    await reach(s, "speaking");
    s.speechDone({ refused: "No voice." });
    await flush();
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "noVoice", detail: "No voice." } });
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(1);
  });

  it("a speaker that throws still goes on listening", async () => {
    const s = setup();
    s.deps.speaker.speak.mockRejectedValueOnce(Error("engine"));
    await reach(s, "speaking");
    await flush();
    expect(s.live.snapshot().phase).toBe("listening");
  });

  it("pause from the outside (hidden tab, lost microphone) releases everything", async () => {
    const s = setup();
    await reach(s, "answering");
    s.live.pause({ key: "hidden" });
    expect(s.signals.at(-1)!.aborted).toBe(true);
    expect(s.live.snapshot()).toMatchObject({ phase: "paused", reason: { key: "hidden" } });
    s.live.pause({ key: "micLost" }); // already paused: keeps the first reason
    expect(s.live.snapshot().reason?.key).toBe("hidden");
  });
});

describe("caps", () => {
  async function turn(s: Setup) {
    s.live.doneSpeaking();
    await vi.advanceTimersByTimeAsync(2000);
    s.speechDone();
    await flush();
  }

  it("ends after the turn cap: requests equal turns", async () => {
    const s = setup({ maxTurns: 3 });
    s.live.start();
    await flush();
    for (let i = 0; i < 3; i++) await turn(s);
    expect(s.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "turnCap" }, turns: 3, units: 6 });
    expect(s.deps.send).toHaveBeenCalledTimes(3);
    expect(s.deps.transcribe).toHaveBeenCalledTimes(3);
    expect(s.deps.recorder.start).toHaveBeenCalledTimes(3);
  });

  it("ends at the time cap before the next listening", async () => {
    const s = setup({ maxMs: 60_000 });
    s.live.start();
    await flush();
    await vi.advanceTimersByTimeAsync(61_000);
    await turn(s);
    expect(s.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "timeCap" }, turns: 1 });
  });

  it("counts Thinking at its cost", async () => {
    const s = setup({ speechCost: 1, messageCost: 5 });
    s.live.start();
    await flush();
    await turn(s);
    expect(s.live.snapshot().units).toBe(6);
  });

  it("starts again with fresh counters", async () => {
    const s = setup({ maxTurns: 1 });
    s.live.start();
    await flush();
    await turn(s);
    expect(s.live.snapshot().phase).toBe("ended");
    s.live.start();
    await flush();
    expect(s.live.snapshot()).toMatchObject({ phase: "listening", turns: 0, units: 0 });
  });
});

describe("Stop", () => {
  for (const phase of ["listening", "transcribing", "review", "answering", "speaking", "paused"] as const) {
    it(`from ${phase} releases everything and sends nothing more`, async () => {
      const s = setup();
      await reach(s, phase);
      expect(s.live.snapshot().phase).toBe(phase);
      const sent = s.deps.send.mock.calls.length;
      s.deps.recorder.cancel.mockClear();
      s.deps.speaker.cancel.mockClear();
      s.live.stop();
      expect(s.live.snapshot()).toMatchObject({ phase: "ended", reason: { key: "stopped" } });
      expect(s.deps.recorder.cancel).toHaveBeenCalled();
      expect(s.deps.speaker.cancel).toHaveBeenCalled();
      expect(s.signals.every((signal) => signal.aborted || signal === s.signals[0])).toBe(true);
      if (s.signals.length) expect(s.signals.at(-1)!.aborted || phase === "speaking" || phase === "paused").toBe(true);
      s.speechDone();
      await vi.advanceTimersByTimeAsync(60_000);
      s.live.sendNow();
      s.live.doneSpeaking();
      s.live.resume();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(s.deps.send).toHaveBeenCalledTimes(sent);
      expect(s.live.snapshot().phase).toBe("ended");
      expect(s.deps.earcon).toHaveBeenLastCalledWith("end");
    });
  }

  it("during the permission prompt: the late microphone is not used", async () => {
    const s = setup();
    let grant!: () => void;
    s.deps.recorder.start.mockImplementationOnce(() => new Promise<void>((resolve) => (grant = resolve)));
    s.live.start();
    await flush();
    expect(s.live.snapshot().phase).toBe("starting");
    s.live.stop();
    grant();
    await flush();
    expect(s.live.snapshot().phase).toBe("ended");
    expect(s.deps.recorder.cancel).toHaveBeenCalled();
  });

  it("aborts the request that is running", async () => {
    const s = setup();
    await reach(s, "answering");
    s.live.stop();
    expect(s.signals.at(-1)!.aborted).toBe(true);
  });

  it("aborts a running transcription and drops its late text", async () => {
    const s = setup();
    let finish!: (text: string) => void;
    s.deps.transcribe.mockImplementationOnce((signal) => {
      s.signals.push(signal);
      return new Promise((resolve) => (finish = (text) => resolve({ text, failed: 0 })));
    });
    s.live.start();
    await flush();
    s.live.doneSpeaking();
    await flush();
    s.live.stop();
    expect(s.signals.at(-1)!.aborted).toBe(true);
    finish("late");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.live.snapshot()).toMatchObject({ phase: "ended", transcript: "", units: 0 });
  });

  it("is a no-op before a session starts", () => {
    const s = setup();
    s.live.stop();
    expect(s.live.snapshot().phase).toBe("idle");
    expect(s.deps.onChange).not.toHaveBeenCalled();
  });
});

describe("silence detector", () => {
  /** Levels every 50 ms from [level, milliseconds] pieces; the first event and when it came. */
  function run(pieces: [number, number][], custom = {}) {
    const detector = createSilenceDetector(custom);
    let at = 0;
    for (const [level, ms] of pieces)
      for (let end = at + ms; at < end; at += 50) {
        const event = detector.push(level, at);
        if (event) return { event, at, threshold: detector.threshold() };
      }
    return { event: undefined, at, threshold: detector.threshold() };
  }

  it("ends 1.5 s after speech in a quiet room", () => {
    const result = run([
      [0.004, 300],
      [0.2, 1200],
      [0.004, 3000],
    ]);
    expect(result.event).toBe("speechEnd");
    expect(result.at).toBe(1500 + SILENCE_DEFAULTS.silenceMs);
    expect(result.threshold).toBe(SILENCE_DEFAULTS.minThreshold);
  });

  it("keeps listening through a short pause inside a sentence", () => {
    const result = run([
      [0.01, 300],
      [0.2, 800],
      [0.01, 1000],
      [0.2, 800],
      [0.01, 3000],
    ]);
    expect(result).toMatchObject({ event: "speechEnd", at: 2900 + SILENCE_DEFAULTS.silenceMs });
  });

  it("calibrates to a noisy room and ends when the voice stops", () => {
    const result = run([
      [0.015, 300],
      [0.25, 1000],
      [0.016, 3000],
    ]);
    expect(result.threshold).toBeCloseTo(0.045);
    expect(result).toMatchObject({ event: "speechEnd", at: 1300 + SILENCE_DEFAULTS.silenceMs });
  });

  it("talking during calibration cannot push the threshold out of reach", () => {
    const result = run([
      [0.3, 300],
      [0.3, 1000],
      [0.01, 3000],
    ]);
    expect(result.threshold).toBe(SILENCE_DEFAULTS.maxThreshold);
    expect(result.event).toBe("speechEnd");
  });

  it("a click is not speech; nothing said for 8 s reports no speech", () => {
    const result = run([
      [0.004, 300],
      [0.5, 100],
      [0.004, 10_000],
    ]);
    expect(result).toMatchObject({ event: "noSpeech", at: SILENCE_DEFAULTS.noSpeechMs });
  });

  it("reports once", () => {
    const detector = createSilenceDetector({ calibrateMs: 0, noSpeechMs: 100 });
    expect(detector.push(0, 0)).toBeUndefined();
    expect(detector.push(0, 100)).toBe("noSpeech");
    expect(detector.push(0, 200)).toBeUndefined();
  });
});

it("gives slow voices enough time", () => {
  expect(speechTimeoutMs(0)).toBe(10_000);
  expect(speechTimeoutMs(1000)).toBe(160_000);
});

// Voice conversation (18 November): talk-over, reading while the answer is written, reply delay.
import { createTalkOverDetector } from "../src/live-voice-audio";

describe("voice conversation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends at once without a review countdown, and asks the speaker to follow the answer", async () => {
    const s = setup({ review: 0 });
    const follow = vi.fn();
    (s.deps.speaker as { follow?: () => void }).follow = follow;
    s.live.start();
    await flush();
    s.live.doneSpeaking();
    await flush();
    expect(s.deps.send).toHaveBeenCalledWith("What is the time?", expect.anything());
    expect(follow).toHaveBeenCalledTimes(1);
    // No countdown: the transcript passes through review for no time at all.
    expect(s.live.snapshot().reviewLeft).toBeUndefined();
    expect(["answering", "speaking"]).toContain(s.live.snapshot().phase);
  });

  it("measures the delay from the end of speech to the first spoken word, once per turn", async () => {
    const s = setup({ review: 0 });
    s.live.start();
    await flush();
    s.live.doneSpeaking();
    await vi.advanceTimersByTimeAsync(1700);
    s.live.firstSound();
    await vi.advanceTimersByTimeAsync(500);
    s.live.firstSound(); // a second sound does not change it
    expect(s.live.snapshot().replyDelayMs).toBe(1700);
  });

  it("talking over the spoken answer stops it and listens again", async () => {
    const s = setup({ review: 0 });
    await reach(s, "speaking");
    expect(s.live.snapshot().phase).toBe("speaking");
    s.live.bargeIn();
    await flush();
    expect(s.deps.speaker.cancel).toHaveBeenCalled();
    expect(s.live.snapshot().phase).toBe("listening");
  });

  it("talking over while the answer is still written stops the reading; once it is done, it listens without reading", async () => {
    const s = setup({ review: 0 });
    let finish: (o: SendOutcome) => void = () => {};
    s.deps.send.mockImplementationOnce(() => new Promise<SendOutcome>((resolve) => (finish = resolve)));
    s.live.start();
    await flush();
    s.live.doneSpeaking();
    await flush();
    expect(s.live.snapshot().phase).toBe("answering");
    s.live.bargeIn();
    expect(s.deps.speaker.cancel).toHaveBeenCalled();
    finish("answered");
    await flush();
    expect(s.deps.speaker.speak).not.toHaveBeenCalled();
    expect(s.live.snapshot().phase).toBe("listening");
    expect(s.live.snapshot().units).toBe(2); // the transcription and the message were still counted
  });

  it("ends a turn after 1 s of silence (was 1.5 s)", () => {
    expect(SILENCE_DEFAULTS.silenceMs).toBe(1000);
  });
});

describe("talk-over detector", () => {
  const feed = (levels: [number, number][]) => {
    const d = createTalkOverDetector();
    return levels.findIndex(([level, at]) => d.push(level, at));
  };
  it("ignores the answer leaking back from the speaker", () => {
    const echo: [number, number][] = Array.from({ length: 60 }, (_, i) => [0.03 + (i % 3) * 0.005, i * 50]);
    expect(feed(echo)).toBe(-1);
  });
  it("fires once the user talks over it for 350 ms", () => {
    const levels: [number, number][] = [
      ...Array.from({ length: 10 }, (_, i): [number, number] => [0.02, i * 50]),
      ...Array.from({ length: 12 }, (_, i): [number, number] => [0.2, 500 + i * 50]),
    ];
    const at = feed(levels);
    expect(at).toBeGreaterThan(10);
    expect(levels[at][1] - 500).toBeGreaterThanOrEqual(350);
  });
  it("a short click does not interrupt", () => {
    const levels: [number, number][] = [
      ...Array.from({ length: 10 }, (_, i): [number, number] => [0.02, i * 50]),
      [0.3, 500],
      [0.3, 550],
      ...Array.from({ length: 20 }, (_, i): [number, number] => [0.02, 600 + i * 50]),
    ];
    expect(feed(levels)).toBe(-1);
  });
});
