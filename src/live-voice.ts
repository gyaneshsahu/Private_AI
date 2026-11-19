// Live voice conversation (docs/live-voice-20261114.md): a hands-free, turn-by-turn loop built from
// voice input and read aloud. Listen, turn speech into text, show it, send it, read the answer
// aloud, listen again. It is NOT a real-time voice model: one side speaks at a time.
// This file is the loop only. Everything that touches the browser is injected, so every path can
// be tested with fakes (tests/live-voice.test.ts). The browser parts are in src/live-voice-audio.ts
// and src/LiveVoice.tsx.

export type LivePhase =
  | "idle"
  | "starting" // waiting for the microphone (permission prompt)
  | "listening"
  | "transcribing"
  | "review" // the transcript is on screen before it is sent
  | "answering" // sent; the answer streams in
  | "speaking"
  | "paused" // nothing runs; Resume opens the microphone again
  | "ended";

/** Why the loop paused or ended. `detail` is a ready sentence from the browser side, when there is one. */
export type LiveReasonKey =
  | "stopped"
  | "paused"
  | "turnCap"
  | "timeCap"
  | "hidden"
  | "locked"
  | "conversationChanged"
  | "otherRequest"
  | "micLost"
  | "mic"
  | "noSpeech"
  | "emptyTranscript"
  | "transcribeFailed"
  | "cancelled"
  | "edit"
  | "blocked"
  | "consent"
  | "sendFailed"
  | "noVoice";
export interface LiveReason {
  key: LiveReasonKey;
  detail?: string;
}
/** A failure the browser side has already put into words. `end`: the session cannot go on today. */
export interface LiveStop {
  detail: string;
  end?: boolean;
}

export interface LiveSnapshot {
  phase: LivePhase;
  reason?: LiveReason;
  /** What was heard in this turn. */
  transcript: string;
  /** Questions sent in this session: one chat request each. */
  turns: number;
  /** Allowance units this session used: transcriptions plus messages. */
  units: number;
  /** Whole seconds until the transcript is sent by itself; undefined while it waits for a tap. */
  reviewLeft?: number;
  /** This turn's delay from the end of speech to the first spoken word of the answer, in ms. */
  replyDelayMs?: number;
}

export type SendOutcome = "answered" | "consent" | "failed";
export type Earcon = "listen" | "heard" | "sent" | "end";

export interface LiveVoiceDeps {
  /**
   * start() rejects when the microphone cannot be opened. The recorder sends chunks off to be
   * transcribed while the user talks; after stop() it reports the turn's chunk count through heard().
   */
  recorder: { start(): Promise<void>; stop(): void; cancel(): void };
  /**
   * The turn's text once the recorder ended: the chunks' texts joined, `failed` chunks marked.
   * Rejects with a LiveStop (or anything else: a plain failure).
   */
  transcribe(signal: AbortSignal): Promise<{ text: string; failed: number }>;
  /** Asked before the microphone opens and before a question is sent: a reason not to go on. */
  blocked(): LiveStop | undefined;
  /**
   * One question through the app's ordinary send path (it searches the web by itself when the
   * question needs it). "consent" (health consent): nothing was sent, so the session ends.
   */
  /** The question of the turn just recorded, sent with that recording's id. */
  send(text: string, signal: AbortSignal): Promise<SendOutcome>;
  speaker: {
    /**
     * Optional: called when the question is sent, so the answer can be read sentence by sentence
     * while it is still being written (voice conversation, 17 November). speak() then reads the rest.
     */
    follow?(): void;
    /** Resolves when the answer was read. Calls `started` with a generous length for the time-out. */
    speak(started: (expectedMs: number) => void): Promise<"spoken" | { refused: string }>;
    cancel(): void;
  };
  clock: {
    now(): number;
    setTimeout(run: () => void, ms: number): unknown;
    clearTimeout(id: unknown): void;
  };
  earcon?(name: Earcon): void;
  onChange(snapshot: LiveSnapshot): void;
}

export interface LiveVoiceOptions {
  /** Seconds the transcript is shown before it is sent; "ask" waits for a tap. */
  review: number | "ask";
  maxTurns: number;
  maxMs: number;
  /** Allowance units of one transcribed chunk and of one message in this session's mode. */
  speechCost: number;
  messageCost: number;
}
/** 15 minutes: a turn may now be up to 3 minutes of speech, and the voice budget is the daily cap. */
export const LIVE_VOICE_CAPS = { maxTurns: 15, maxMs: 15 * 60_000 } as const;

export function createLiveVoice(deps: LiveVoiceDeps, options: LiveVoiceOptions) {
  let snapshot: LiveSnapshot = { phase: "idle", transcript: "", turns: 0, units: 0 };
  let run = 0; // every pause, stop and new step makes older pending steps no-ops
  let startedAt = 0;
  let abort: AbortController | undefined;
  let timer: unknown;
  /** When this turn's speech ended (tap or silence), for the reply delay. */
  let heardAt: number | undefined;
  /** The user talked over the answer while it was still being written: do not read the rest. */
  let talkedOver = false;
  /** This turn's first sound was already timed. */
  let soundTimed = false;
  const set = (next: Partial<LiveSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    deps.onChange(snapshot);
  };
  /** Everything at once: microphone released, request aborted, speech cancelled, timers cleared. */
  const release = () => {
    run++;
    deps.clock.clearTimeout(timer);
    timer = undefined;
    deps.recorder.cancel();
    abort?.abort();
    abort = undefined;
    deps.speaker.cancel();
  };
  const active = () => !["idle", "paused", "ended"].includes(snapshot.phase);
  const halt = (phase: "paused" | "ended", reason: LiveReason) => {
    if (snapshot.phase === "idle" || snapshot.phase === "ended") return;
    release();
    if (phase === "ended") deps.earcon?.("end");
    set({ phase, reason, reviewLeft: undefined });
  };
  const stopFor = (stop: LiveStop, key: LiveReasonKey) =>
    halt(stop.end ? "ended" : "paused", { key, detail: stop.detail });

  async function listen() {
    if (snapshot.turns >= options.maxTurns) return halt("ended", { key: "turnCap" });
    if (deps.clock.now() - startedAt >= options.maxMs) return halt("ended", { key: "timeCap" });
    const stop = deps.blocked();
    if (stop) return stopFor(stop, "blocked");
    const mine = ++run;
    heardAt = undefined;
    talkedOver = false;
    soundTimed = false;
    // replyDelayMs stays: the last turn's delay until this turn has its own.
    set({ phase: "starting", reason: undefined, transcript: "", reviewLeft: undefined });
    // Before the microphone opens, so the tone is not part of the room's noise measurement.
    deps.earcon?.("listen");
    try {
      await deps.recorder.start();
    } catch (cause) {
      if (mine === run) halt("ended", { key: "mic", detail: typeof cause === "string" ? cause : undefined });
      return;
    }
    if (mine !== run) return; // stopped during the permission prompt: release() cancelled the recorder
    set({ phase: "listening" });
  }

  async function transcribe(chunks: number) {
    if (snapshot.phase !== "listening") return;
    // No chunk held sound: nothing was sent.
    if (!chunks) return halt("paused", { key: "noSpeech" });
    const mine = ++run;
    abort = new AbortController();
    deps.earcon?.("heard");
    set({ phase: "transcribing" });
    let text: string;
    let failed: number;
    try {
      ({ text, failed } = await deps.transcribe(abort.signal));
      text = text.trim();
    } catch (cause) {
      if (mine !== run) return;
      const stop = cause as Partial<LiveStop> | undefined;
      return halt(stop?.end ? "ended" : "paused", {
        key: "transcribeFailed",
        detail: typeof stop?.detail === "string" ? stop.detail : undefined,
      });
    }
    if (mine !== run) return;
    set({ units: snapshot.units + chunks * options.speechCost });
    if (!text) return halt("paused", { key: "emptyTranscript" });
    set({ phase: "review", transcript: text });
    // A part that could not be turned into text is marked: never sent without a tap.
    if (options.review === "ask" || failed) return;
    let left = options.review;
    const tick = () => {
      if (mine !== run) return;
      if (left <= 0) return void sendNow();
      set({ reviewLeft: left-- });
      timer = deps.clock.setTimeout(tick, 1000);
    };
    tick();
  }

  async function sendNow() {
    if (snapshot.phase !== "review") return;
    deps.clock.clearTimeout(timer);
    const stop = deps.blocked();
    if (stop) return stopFor(stop, "blocked");
    const mine = ++run;
    abort = new AbortController();
    deps.earcon?.("sent");
    set({ phase: "answering", turns: snapshot.turns + 1, reviewLeft: undefined });
    deps.speaker.follow?.();
    let outcome: SendOutcome;
    try {
      outcome = await deps.send(snapshot.transcript, abort.signal);
    } catch {
      outcome = "failed";
    }
    if (mine !== run) return;
    if (outcome === "consent") {
      set({ turns: snapshot.turns - 1 }); // nothing was sent
      return halt("ended", { key: "consent" });
    }
    if (outcome === "failed") return halt("paused", { key: "sendFailed" });
    // Talked over while the answer was still being written: straight back to listening.
    if (talkedOver) {
      set({ units: snapshot.units + options.messageCost });
      return void listen();
    }
    set({ phase: "speaking", units: snapshot.units + options.messageCost });
    // The microphone stays closed while the answer is spoken, so the answer is never recorded.
    const next = () => {
      if (mine !== run) return;
      deps.clock.clearTimeout(timer);
      void listen();
    };
    let result: "spoken" | { refused: string };
    try {
      result = await deps.speaker.speak((expectedMs) => {
        if (mine !== run) return;
        // An engine that never reports the end must not hold the loop for ever.
        timer = deps.clock.setTimeout(() => {
          if (mine !== run) return;
          deps.speaker.cancel();
          next();
        }, expectedMs);
      });
    } catch {
      result = "spoken"; // a failed voice is not a reason to end: the answer is on screen
    }
    if (mine !== run) return;
    // No voice on this device for the answer's language: the answer stays on screen and the
    // microphone does not open by itself while the user reads.
    if (result !== "spoken") return halt("paused", { key: "noVoice", detail: result.refused });
    next();
  }

  return {
    snapshot: () => snapshot,
    start() {
      if (snapshot.phase !== "idle" && snapshot.phase !== "ended") return;
      startedAt = deps.clock.now();
      snapshot = { phase: "starting", transcript: "", turns: 0, units: 0 };
      void listen();
    },
    /** The big button: ends everything at once. */
    stop: () => halt("ended", { key: "stopped" }),
    end: (reason: LiveReason) => halt("ended", reason),
    pause(reason: LiveReason = { key: "paused" }) {
      if (active()) halt("paused", reason);
    },
    resume() {
      if (snapshot.phase === "paused") void listen();
    },
    /** The user's tap, or the silence detector: the question is complete. */
    doneSpeaking() {
      if (snapshot.phase !== "listening") return;
      heardAt = deps.clock.now();
      deps.recorder.stop();
    },
    /** The first sound of the answer: records this turn's reply delay once. */
    firstSound() {
      if (heardAt === undefined || soundTimed) return;
      soundTimed = true;
      set({ replyDelayMs: deps.clock.now() - heardAt });
    },
    /**
     * The user talked over the answer (barge-in by voice). While it is spoken: stop and listen, as
     * the Interrupt button does. While it is still being written: stop reading; listen once it is done.
     */
    bargeIn() {
      if (snapshot.phase === "speaking") return this.skipSpeech();
      if (snapshot.phase !== "answering") return;
      talkedOver = true;
      deps.speaker.cancel();
    },
    /** The silence detector heard nothing at all: nothing is sent or transcribed. */
    noSpeech() {
      if (snapshot.phase === "listening") halt("paused", { key: "noSpeech" });
    },
    /** The recorder ended the turn (after doneSpeaking, or its maximum length); `chunks` were sent. */
    heard: (chunks: number) => void transcribe(chunks),
    sendNow: () => void sendNow(),
    cancelReview() {
      if (snapshot.phase === "review") halt("paused", { key: "cancelled" });
    },
    /** Ends the session and hands the transcript over for the message box. */
    edit(): string | undefined {
      if (snapshot.phase !== "review") return undefined;
      const text = snapshot.transcript;
      halt("ended", { key: "edit" });
      return text;
    },
    /** A tap while the answer is spoken (barge-in by tap): stop the speech and listen. */
    skipSpeech() {
      if (snapshot.phase !== "speaking") return;
      run++; // the pending end of speech is now a no-op
      deps.clock.clearTimeout(timer);
      deps.speaker.cancel();
      void listen();
    },
  };
}
export type LiveVoice = ReturnType<typeof createLiveVoice>;

/**
 * End of speech from loudness alone (there is no voice activity model on the device). Fed the
 * level (RMS, 0 to 1) of short slices with their time in milliseconds:
 *  - the first `calibrateMs` set the room's noise floor; the threshold is `factor` times that,
 *    kept between `minThreshold` and `maxThreshold` (so talking during calibration cannot push it
 *    out of reach);
 *  - speech counts once the level stayed over the threshold for `minSpeechMs` in a row;
 *  - "speechEnd" comes when, after speech, the level stayed under it for `silenceMs`;
 *  - "noSpeech" comes when no speech was heard for `noSpeechMs`.
 * Each result is given once. Limits: loud steady noise looks like speech, a long thinking pause
 * looks like the end. The "Done speaking" button and the maximum length are the fallbacks.
 */
export function createSilenceDetector(custom: Partial<typeof SILENCE_DEFAULTS> = {}) {
  const o = { ...SILENCE_DEFAULTS, ...custom };
  let first: number | undefined;
  let floorSum = 0;
  let floorCount = 0;
  let threshold: number | undefined;
  let loudSince: number | undefined;
  let quietSince: number | undefined;
  let spoke = false;
  let done = false;
  return {
    threshold: () => threshold,
    push(level: number, at: number): "speechEnd" | "noSpeech" | undefined {
      if (done) return undefined;
      first ??= at;
      if (at - first < o.calibrateMs) {
        floorSum += level;
        floorCount++;
        return undefined;
      }
      threshold ??= Math.min(
        o.maxThreshold,
        Math.max(o.minThreshold, (floorCount ? floorSum / floorCount : 0) * o.factor),
      );
      if (level > threshold) {
        loudSince ??= at;
        quietSince = undefined;
        if (at - loudSince >= o.minSpeechMs) spoke = true;
      } else {
        loudSince = undefined;
        quietSince ??= at;
      }
      if (spoke && quietSince !== undefined && at - quietSince >= o.silenceMs) {
        done = true;
        return "speechEnd";
      }
      if (!spoke && at - first >= o.noSpeechMs) {
        done = true;
        return "noSpeech";
      }
      return undefined;
    },
  };
}
export const SILENCE_DEFAULTS = {
  calibrateMs: 300,
  factor: 3,
  minThreshold: 0.015,
  maxThreshold: 0.06,
  minSpeechMs: 150,
  // 1 s (was 1.5 s until 17 November): the reply starts sooner; a longer thinking pause can end
  // a turn early, which "Always ask before sending" and Edit cover.
  silenceMs: 1000,
  noSpeechMs: 8000,
};

/** A generous time for reading `characters` aloud: slow voices manage about 10 characters a second. */
export const speechTimeoutMs = (characters: number) => 10_000 + characters * 150;
