// Voice input (dictation): record in the browser, send the recording through the verified
// Privatemode session, get text back for the message box. The recording exists only in this
// tab's memory (never the vault, a saved conversation or storage) and is dropped after the call.
// The browser's own dictation (Web Speech API) is not used: it would send audio to Google or Apple.
import type { AppStatus } from "../shared/contracts";
import { VOICE_BITS_PER_SECOND } from "../shared/voice";
import { AttestationBusyError, inferenceClientFor } from "./providers/inference-client";
import "./providers/privatemode-client";
import { textFor } from "./text/core";
import { voiceText } from "./text/voice";

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
  maxSeconds: number;
  onState(state: VoiceRecorderState): void;
  /** Whole seconds recorded so far, about once a second. */
  onTick(elapsed: number): void;
  /** The finished recording after stop() or the maximum; never called after cancel(). */
  onAudio(audio: Blob): void;
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

/**
 * One recorder for the composer. start() asks for the microphone (only ever from the user's tap)
 * and rejects with a MicrophoneFailure; stop() ends the recording and hands it over; cancel()
 * drops it. The microphone is released the moment recording ends, whatever ended it.
 */
export function createVoiceRecorder(options: VoiceRecorderOptions) {
  let state: VoiceRecorderState = "idle";
  let stream: MediaStream | undefined;
  let recorder: RecorderLike | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let run = 0; // a cancel during the permission prompt makes the pending start a no-op
  const set = (next: VoiceRecorderState) => {
    state = next;
    options.onState(next);
  };
  const end = (keep: boolean) => {
    run++;
    clearInterval(timer);
    const active = recorder;
    recorder = undefined;
    if (active) {
      if (!keep) active.ondataavailable = active.onstop = null;
      if (active.state !== "inactive") active.stop();
    }
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
    if (state !== "idle") set("idle");
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
      set("starting");
      try {
        const granted = await media.getUserMedia({ audio: true });
        if (mine !== run) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        const mimeType = MIME_TYPES.find((type) => Recorder.isTypeSupported?.(type));
        const active = new Recorder(granted, {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: VOICE_BITS_PER_SECOND,
        });
        const chunks: Blob[] = [];
        active.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        active.onstop = () =>
          options.onAudio(new Blob(chunks, { type: active.mimeType || mimeType || "audio/webm" }));
        active.start();
        recorder = active;
      } catch (cause) {
        end(false);
        throw microphoneFailure(cause);
      }
      const startedAt = Date.now();
      set("recording");
      options.onTick(0);
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        options.onTick(Math.min(elapsed, options.maxSeconds));
        if (elapsed >= options.maxSeconds) end(true);
      }, 250);
    },
    stop: () => end(true),
    cancel: () => end(false),
  };
}

/** The recording as text, through the session chat already verified (or one new verification). */
export async function transcribeRecording(
  audio: Blob,
  status: Pick<AppStatus, "csrf" | "inference">,
  signal: AbortSignal,
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
  return (await destination.transcribe(audio, report.speech.model, signal)).trim();
}

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
