// The composer's microphone button (voice input). Rendered only while the server says voice input
// is switched on. Logic lives in src/voice-input.ts; this file is the button and its wiring.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppStatus } from "../shared/contracts";
import { voiceTodayClocks } from "../shared/voice";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import { AttestationBusyError } from "./providers/inference-client";
import { voiceText } from "./text/voice";
import {
  createChunkQueue,
  createVoiceRecorder,
  insertTranscript,
  transcribeRecording,
  turnSeconds,
  voiceFailureText,
  type ChunkQueue,
  type MicrophoneFailure,
  type VoiceRecorderState,
} from "./voice-input";

const NOTE_KEY = "cometrow.voice.note-seen";
/** Seconds before the turn maximum when the warning shows. */
const WARN_SECONDS = 20;
function noteSeen() {
  try {
    return localStorage.getItem(NOTE_KEY) === "1";
  } catch {
    return false; // storage blocked: the note is simply shown each time
  }
}

/** This account's voice units in the last 24 hours: from the status, read again after each turn. */
export function useVoiceUsed(status: AppStatus) {
  const [used, setUsed] = useState(status.voice?.usedUnits);
  useEffect(() => setUsed(status.voice?.usedUnits), [status.voice?.usedUnits]);
  const refresh = (): Promise<number | undefined> =>
    fetch("/api/status", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((next?: AppStatus) => {
        const fresh = next?.voice?.usedUnits;
        if (fresh !== undefined) setUsed(fresh);
        return fresh;
      })
      .catch(() => undefined);
  return [used, refresh] as const;
}
/** "Voice today: 2:10 used, 2:50 left." or nothing when the server could not say. */
export function voiceToday(t: (typeof voiceText)["en"], voice: NonNullable<AppStatus["voice"]>, used?: number) {
  return used === undefined ? "" : t.today(...voiceTodayClocks(used, voice.dailyUnits));
}

export function VoiceInput({
  status,
  voice,
  busy,
  setInput,
  notify,
  onVerifyWait,
}: {
  status: AppStatus;
  voice: NonNullable<AppStatus["voice"]>;
  /** A message is being sent or answered: no recording runs beside it. */
  busy: boolean;
  setInput(value: string): void;
  /** The app's notice line (a live region): start, stop, result and failures are announced there. */
  notify(text: string): void;
  onVerifyWait(retryAt: number): void;
}) {
  const t = useText(voiceText);
  const [used, refreshUsed] = useVoiceUsed(status);
  const maxSeconds = turnSeconds(voice, used);
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [turnMax, setTurnMax] = useState(maxSeconds);
  const [transcribing, setTranscribing] = useState(false);
  const [askNote, setAskNote] = useState(false);
  const latest = useRef({ status, maxSeconds });
  latest.current = { status, maxSeconds };
  const queue = useRef<ChunkQueue | undefined>(undefined);
  // The recorder outlives renders; it always calls the latest handler.
  const onEnd = useRef<() => void>(() => {});
  onEnd.current = async () => {
    const turn = queue.current;
    if (!turn) return;
    if (!turn.size) {
      queue.current = undefined;
      return notify(t.empty);
    }
    setTranscribing(true);
    notify(t.transcribing);
    try {
      const result = await turn.finish();
      if (result.failed === turn.size || !result.text) void refreshUsed();
      if (result.failed === turn.size) {
        // Nothing came back: the reason, or the verification countdown.
        if (result.error instanceof AttestationBusyError && result.error.retryAt) onVerifyWait(result.error.retryAt);
        else notify(voiceFailureText(result.error));
        return;
      }
      if (!result.text) return notify(t.noText);
      // Into the message box only: the user reads, edits and presses Send as for typed text.
      const field = document.getElementById("message-input") as HTMLTextAreaElement | null;
      const value = field?.value ?? "";
      const next = insertTranscript(
        value,
        field?.selectionStart ?? value.length,
        field?.selectionEnd ?? value.length,
        result.text,
      );
      setInput(next.value);
      requestAnimationFrame(() => {
        field?.focus();
        field?.setSelectionRange(next.caret, next.caret);
      });
      setTranscribing(false);
      const fresh = await refreshUsed();
      notify(
        [
          t.inserted,
          result.failed ? t.partsFailed(result.failed) : "",
          result.failed ? voiceFailureText(result.error) : "",
          voiceToday(t, voice, fresh),
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch {
      notify(t.cancelled);
    } finally {
      if (queue.current === turn) queue.current = undefined;
      setTranscribing(false);
    }
  };
  const recorder = useMemo(
    () =>
      createVoiceRecorder({
        get maxSeconds() {
          return latest.current.maxSeconds;
        },
        chunkSeconds: voice.chunkSeconds,
        onState: setState,
        onTick: setElapsed,
        // Each chunk is turned into text while the user keeps talking.
        onChunk: (audio, units) => queue.current?.add(audio, units),
        onEnd: () => onEnd.current(),
      }),
    [voice.chunkSeconds],
  );
  // Leaving the page or the composer drops the recording and frees the microphone. A hidden tab
  // ends the recording (the microphone never stays open unseen) and still turns it into text.
  useEffect(() => {
    const leave = () => {
      recorder.cancel();
      queue.current?.cancel();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") recorder.stop();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", hidden);
      leave();
    };
  }, [recorder]);
  // Sending a message ends a running recording: one request per account, and no surprise text later.
  useEffect(() => {
    if (busy && recorder.state !== "idle") {
      recorder.cancel();
      queue.current?.cancel();
      queue.current = undefined;
      notify(t.discardedForSend);
    }
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const recording = state === "recording";
  const left = turnMax - elapsed;
  const warning = recording && left <= WARN_SECONDS;
  // Announced once, 20 seconds before the end (a short turn says its length when it starts).
  useEffect(() => {
    if (warning && turnMax > WARN_SECONDS) notify(t.warn(WARN_SECONDS));
  }, [warning]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = () => {
    setAskNote(false);
    try {
      localStorage.setItem(NOTE_KEY, "1");
    } catch {
      /* storage blocked */
    }
    notify("");
    const max = latest.current.maxSeconds;
    setTurnMax(max);
    setElapsed(0);
    queue.current = createChunkQueue(
      (audio, units, signal) => transcribeRecording(audio, units, latest.current.status, signal),
      t.partMissing,
      // Budget or allowance gone: nothing more can be turned into text, so recording stops.
      () => recorder.stop(),
    );
    recorder.start().then(
      () => {
        if (recorder.state === "recording") notify(`${t.started(max)} ${voiceToday(t, voice, used)}`.trim());
      },
      (failure: MicrophoneFailure) => {
        queue.current = undefined;
        notify(t[failure] ?? t.micFailed);
      },
    );
  };
  const usedUp = maxSeconds < 1 && !recording && !transcribing;
  const label = transcribing ? t.cancel : recording ? t.stop : usedUp ? t.usedUp : t.start;
  return (
    <span className="voice-input">
      <button
        type="button"
        className={`voice-input-button${recording ? " recording" : ""}${warning ? " warning" : ""}`}
        aria-pressed={recording}
        aria-label={label}
        title={label}
        disabled={usedUp || state === "starting" || (busy && !recording && !transcribing)}
        onClick={() => {
          if (transcribing) queue.current?.cancel();
          else if (recording) recorder.stop();
          else begin(); // Owner, 18 November: no per-feature cautions; the first-start notice and the privacy page cover this.
        }}
      >
        <Icon name={transcribing ? "close" : "mic"} />
        {/* Visible countdown; the start, the warning and the end are announced once through the notice line. */}
        {recording && <small aria-hidden="true">{warning ? t.stopsIn(Math.max(0, left)) : t.recording(elapsed, turnMax)}</small>}
        {transcribing && <small aria-hidden="true">{t.transcribing}</small>}
      </button>
      {askNote && (
        <span className="voice-input-note" role="group" aria-label={t.noteTitle}>
          <strong>{t.noteTitle}</strong>
          <span>{t.note}</span>
          {used !== undefined && <span className="voice-input-today">{voiceToday(t, voice, used)}</span>}
          <span className="voice-input-note-actions">
            <button type="button" className="primary" autoFocus onClick={begin}>
              {t.noteStart}
            </button>
            <button type="button" className="text-button" onClick={() => setAskNote(false)}>
              {t.noteLater}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
