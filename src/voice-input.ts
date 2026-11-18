// Voice input (dictation): record in the browser, send the recording through the verified
// Privatemode session, get text back for the message box. The recording exists only in this
// tab's memory (never the vault, a saved conversation or storage) and is dropped after the call.
// The browser's own dictation (Web Speech API) is not used: it would send audio to Google or Apple.
import type { AppStatus } from "../shared/contracts";
import { VOICE_BITS_PER_SECOND, VOICE_UNIT_SECONDS, voiceUnits } from "../shared/voice";
import { AttestationBusyError, inferenceClientFor } from "./providers/inference-client";
import "./providers/privatemode-client";
import { textFor } from "./text/core";
import { voiceText } from "./text/voice";
import { limitSentence } from "./limit-message";

export type VoiceRecorderState = "idle" | "starting" | "recording";
export type MicrophoneFailure = "unsupported" | "denied" | "noDevice" | "micFailed";

/** Containers the browsers record: WebM/Opus in Chromium and Firefox, MP4/AAC in Safari. */
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

interface RecorderLike {
  mimeType: string;
  state: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
}
export interface VoiceRecorderOptions {
  /** Longest turn in seconds; read at each start. */
  maxSeconds: number;
  /** Longest chunk in seconds. */
  chunkSeconds: number;
  onState(state: VoiceRecorderState): void;
  /** Whole seconds recorded so far in this turn, about once a second. */
  onTick(elapsed: number): void;
  /** One finished chunk, a standalone file, with its voice units. In order; never after cancel(). */
  onChunk(audio: Blob, units: number): void;
  /** After stop() or the maximum, once the last chunk was handed over; never after cancel(). */
  onEnd(): void;
  /** Test seams; the browser's own by default. */
  media?: { getUserMedia(constraints: { audio: true }): Promise<MediaStream> };
  Recorder?: {
    new (stream: MediaStream, options: { mimeType?: string; audioBitsPerSecond: number }): RecorderLike;
    isTypeSupported?(type: string): boolean;
  };
}

function microphoneFailure(cause: unknown): MicrophoneFailure {
  const name = String((cause as { name?: unknown } | undefined)?.name ?? "");
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "noDevice";
  if (name === "NotSupportedError" || name === "TypeError") return "unsupported";
  return "micFailed";
}

/** A chunk smaller than this holds no sound (a header and a few frames): it is not sent. */
const EMPTY_CHUNK_BYTES = 1000;

/**
 * One recorder for a turn of speech. start() asks for the microphone (only ever from the user's
 * tap) and rejects with a MicrophoneFailure; stop() ends the turn and hands over the last chunk;
 * cancel() drops everything. The microphone is released the moment recording ends.
 * Chunks: every `chunkSeconds` the running MediaRecorder is stopped and a new one starts on the
 * same stream, so every chunk is a complete file with its own header (MediaRecorder's timeslice
 * pieces are not: only the first carries the header). The switch takes a few milliseconds.
 */
export function createVoiceRecorder(options: VoiceRecorderOptions) {
  let state: VoiceRecorderState = "idle";
  let stream: MediaStream | undefined;
  let stopCurrent: ((keep: boolean) => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let run = 0; // a cancel during the permission prompt makes the pending start a no-op
  let generation = 0; // a cancel makes the pending chunks of the turn no-ops
  // Chunks finish asynchronously; they are handed over in the order they were started.
  let made = 0;
  let next = 0;
  let ending = false;
  const done = new Map<number, [Blob, number] | null>();
  const set = (state_: VoiceRecorderState) => {
    state = state_;
    options.onState(state_);
  };
  const deliver = () => {
    while (done.has(next)) {
      const chunk = done.get(next);
      done.delete(next++);
      if (chunk) options.onChunk(...chunk);
    }
    if (ending && next === made) {
      ending = false;
      options.onEnd();
    }
  };
  const end = (keep: boolean) => {
    run++;
    clearInterval(timer);
    if (keep) ending = !!stopCurrent; // only a running turn ends with onEnd
    else {
      generation++;
      done.clear();
      ending = false;
    }
    stopCurrent?.(keep);
    stopCurrent = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
    if (state !== "idle") set("idle");
    if (ending) deliver();
  };
  /** Starts the next chunk on the open stream. */
  const begin = (Recorder: NonNullable<VoiceRecorderOptions["Recorder"]>, mimeType: string | undefined) => {
    const index = made++;
    const mine = generation;
    const active = new Recorder(stream!, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: VOICE_BITS_PER_SECOND,
    });
    const parts: Blob[] = [];
    const startedAt = Date.now();
    let ms = 0;
    active.ondataavailable = (event) => {
      if (event.data.size) parts.push(event.data);
    };
    active.onstop = () => {
      if (mine !== generation) return;
      const audio = new Blob(parts, { type: active.mimeType || mimeType || "audio/webm" });
      done.set(index, audio.size < EMPTY_CHUNK_BYTES ? null : [audio, voiceUnits(ms, options.chunkSeconds)]);
      deliver();
    };
    active.start();
    stopCurrent = (keep) => {
      ms = Date.now() - startedAt;
      if (!keep) active.ondataavailable = active.onstop = null;
      if (active.state !== "inactive") active.stop();
    };
    return startedAt;
  };
  return {
    get state() {
      return state;
    },
    async start() {
      if (state !== "idle") return;
      const media = options.media ?? globalThis.navigator?.mediaDevices;
      const Recorder =
        options.Recorder ?? (globalThis.MediaRecorder as VoiceRecorderOptions["Recorder"] | undefined);
      if (!media?.getUserMedia || !Recorder) throw "unsupported" satisfies MicrophoneFailure;
      const mine = ++run;
      let mimeType: string | undefined;
      let chunkStartedAt = 0;
      set("starting");
      try {
        const granted = await media.getUserMedia({ audio: true });
        if (mine !== run) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        mimeType = MIME_TYPES.find((type) => Recorder.isTypeSupported?.(type));
        chunkStartedAt = begin(Recorder, mimeType);
      } catch (cause) {
        end(false);
        throw microphoneFailure(cause);
      }
      const startedAt = Date.now();
      const max = options.maxSeconds; // fixed for the turn, even if the budget shown changes
      set("recording");
      options.onTick(0);
      timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startedAt) / 1000);
        options.onTick(Math.min(elapsed, max));
        if (elapsed >= max) return end(true);
        if (now - chunkStartedAt >= options.chunkSeconds * 1000) {
          // The next chunk starts first: speech is never cut off at a chunk boundary.
          const previous = stopCurrent!;
          chunkStartedAt = begin(Recorder, mimeType);
          previous(true);
        }
      }, 250);
    },
    stop: () => end(true),
    cancel: () => end(false),
  };
}

/** One chunk as text, through the session chat already verified (or one new verification). */
export async function transcribeRecording(
  audio: Blob,
  units: number,
  status: Pick<AppStatus, "csrf" | "inference">,
  signal: AbortSignal,
  turn?: string,
): Promise<string> {
  const report = status.inference.qualification;
  if (!report?.speech) throw new Error(textFor(voiceText).off);
  // The same policy fields chat verifies under, so both share one verified client.
  const destination = await inferenceClientFor(report.provider).verify(
    { ...report, csrf: status.csrf },
    signal,
    () => {},
  );
  if (!destination.transcribe) throw new Error(textFor(voiceText).off);
  return (await destination.transcribe(audio, report.speech.model, units, signal, turn)).trim();
}

/**
 * Longest next turn in seconds: the turn maximum while any of today's voice time is left, else 0.
 * A recording that has started always finishes (owner, 18 November): the relay checks the day's
 * voice time at its first part only, and the turn maximum is the cap for a runaway recording.
 */
export const turnSeconds = (voice: NonNullable<AppStatus["voice"]>, used = voice.usedUnits) =>
  used === undefined || used < voice.dailyUnits ? voice.maxTurnSeconds : 0;

/** Relay refusals after which no further chunk can work today; a busy verification also stops. */
const FINAL = ["refused_voice_daily", "refused_daily", "refused_allowance", "refused_spend", "stopped", "off"];
export function finalVoiceRefusal(error: unknown): boolean {
  if (error instanceof AttestationBusyError) return true;
  const headers = (error as { headers?: unknown } | undefined)?.headers;
  return headers instanceof Headers && FINAL.includes(headers.get("x-privateai-voice") ?? "");
}

export interface TurnText {
  /** The chunks' texts in order, joined; a chunk that failed twice is a marker in the text. */
  text: string;
  /** Chunks sent (each may have used allowance units), and how many of them failed. */
  chunks: number;
  failed: number;
  /** The last failure, for the message. */
  error?: unknown;
}

/**
 * Transcribes a turn's chunks one after the other (one request per account) while the user keeps
 * talking. A failed chunk is tried once more after a second; then its place gets `marker` and the
 * rest goes on. A final refusal (budget, allowance, verification busy) marks the remaining chunks
 * without sending them and calls `onFinal`, so the caller can stop recording.
 */
export function createChunkQueue(
  transcribe: (audio: Blob, units: number, signal: AbortSignal, turn: string) => Promise<string>,
  marker: string,
  onFinal: (error: unknown) => void = () => {},
  retryMs = 1000,
) {
  const abort = new AbortController();
  // One recording is one turn: the relay admits its first part and continues the rest.
  const turn = crypto.randomUUID();
  const parts: string[] = [];
  let tail = Promise.resolve();
  let chunks = 0;
  let failed = 0;
  let error: unknown;
  let final = false;
  const fail = (index: number) => {
    parts[index] = marker;
    failed++;
  };
  return {
    add(audio: Blob, units: number) {
      const index = parts.push("") - 1;
      tail = tail.then(async () => {
        if (abort.signal.aborted) return;
        if (final) return fail(index);
        chunks++;
        for (let attempt = 0; ; attempt++) {
          try {
            parts[index] = (await transcribe(audio, units, abort.signal, turn)).trim();
            return;
          } catch (cause) {
            if (abort.signal.aborted) return;
            error = cause;
            if (finalVoiceRefusal(cause)) {
              final = true;
              onFinal(cause);
              return fail(index);
            }
            if (attempt >= 1) return fail(index);
            await new Promise((resolve) => setTimeout(resolve, retryMs));
            if (abort.signal.aborted) return;
          }
        }
      });
    },
    /** Waits for every chunk added so far. */
    async finish(): Promise<TurnText> {
      await tail;
      abort.signal.throwIfAborted();
      return { text: parts.filter(Boolean).join(" "), chunks, failed, error };
    },
    cancel: () => abort.abort(),
    /** This recording's id, sent with each part and with a voice conversation's answer. */
    turn,
    get size() {
      return parts.length;
    },
  };
}
export type ChunkQueue = ReturnType<typeof createChunkQueue>;

const REFUSALS: Record<string, keyof (typeof voiceText)["en"]> = {
  refused_size: "tooLarge",
  refused_voice_daily: "voiceDaily",
  refused_daily: "daily",
  refused_allowance: "allowance",
  refused_account_busy: "busy",
  refused_instance_busy: "busy",
  refused_spend: "spend",
  stopped: "paused",
  off: "off",
};

/** A plain message for a failed transcription. The relay names its refusal in a header. */
export function voiceFailureText(error: unknown): string {
  const t = textFor(voiceText);
  if (error instanceof AttestationBusyError) return error.message;
  const { status, headers } = (error ?? {}) as { status?: unknown; headers?: unknown };
  const reason = headers instanceof Headers ? headers.get("x-privateai-voice") : null;
  // The allowance or the day's request cap at a recording's start: the one calm limit message.
  if (reason === "refused_allowance" || reason === "refused_daily")
    return limitSentence((headers as Headers).get("x-privateai-resets-at") ?? undefined);
  const key = (reason && REFUSALS[reason]) || (status === 413 ? "tooLarge" : "failed");
  return t[key] as string;
}

/** The message with the transcript at the cursor (or over the selection), spaced from its neighbours. */
export function insertTranscript(
  value: string,
  start: number,
  end: number,
  transcript: string,
  maxLength = 20000,
): { value: string; caret: number } {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const text =
    (before && !/\s$/.test(before) ? " " : "") + transcript + (after && !/^\s/.test(after) ? " " : "");
  const room = Math.max(0, maxLength - before.length - after.length);
  const inserted = text.slice(0, room);
  return { value: before + inserted + after, caret: before.length + inserted.length };
}
