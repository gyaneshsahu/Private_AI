// The composer's microphone button (voice input). Rendered only while the server says voice input
// is switched on. Logic lives in src/voice-input.ts; this file is the button and its wiring.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppStatus } from "../shared/contracts";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import { AttestationBusyError } from "./providers/inference-client";
import { voiceText } from "./text/voice";
import {
  createVoiceRecorder,
  insertTranscript,
  transcribeRecording,
  voiceFailureText,
  type MicrophoneFailure,
  type VoiceRecorderState,
} from "./voice-input";

const NOTE_KEY = "cometrow.voice.note-seen";
function noteSeen() {
  try {
    return localStorage.getItem(NOTE_KEY) === "1";
  } catch {
    return false; // storage blocked: the note is simply shown each time
  }
}
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function VoiceInput({
  status,
  maxSeconds,
  busy,
  setInput,
  notify,
  onVerifyWait,
}: {
  status: AppStatus;
  maxSeconds: number;
  /** A message is being sent or answered: no recording runs beside it. */
  busy: boolean;
  setInput(value: string): void;
  /** The app's notice line (a live region): start, stop, result and failures are announced there. */
  notify(text: string): void;
  onVerifyWait(retryAt: number): void;
}) {
  const t = useText(voiceText);
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [askNote, setAskNote] = useState(false);
  const abort = useRef<AbortController | undefined>(undefined);
  // The recorder outlives renders; it always calls the latest handler.
  const onAudio = useRef<(audio: Blob) => void>(() => {});
  onAudio.current = async (audio) => {
    if (audio.size < 1000) return notify(t.empty);
    const controller = new AbortController();
    abort.current = controller;
    setTranscribing(true);
    notify(t.transcribing);
    try {
      const text = await transcribeRecording(audio, status, controller.signal);
      if (!text) return notify(t.noText);
      // Into the message box only: the user reads, edits and presses Send as for typed text.
      const field = document.getElementById("message-input") as HTMLTextAreaElement | null;
      const value = field?.value ?? "";
      const next = insertTranscript(
        value,
        field?.selectionStart ?? value.length,
        field?.selectionEnd ?? value.length,
        text,
      );
      setInput(next.value);
      requestAnimationFrame(() => {
        field?.focus();
        field?.setSelectionRange(next.caret, next.caret);
      });
      notify(t.inserted);
    } catch (error) {
      if (controller.signal.aborted) return notify(t.cancelled);
      if (error instanceof AttestationBusyError && error.retryAt) onVerifyWait(error.retryAt);
      else notify(voiceFailureText(error));
    } finally {
      abort.current = undefined;
      setTranscribing(false);
    }
  };
  const recorder = useMemo(
    () =>
      createVoiceRecorder({
        maxSeconds,
        onState: setState,
        onTick: setElapsed,
        onAudio: (audio) => onAudio.current(audio),
      }),
    [maxSeconds],
  );
  // Leaving the page or the composer drops the recording and frees the microphone. A hidden tab
  // ends the recording (the microphone never stays open unseen) and still turns it into text.
  useEffect(() => {
    const leave = () => {
      recorder.cancel();
      abort.current?.abort();
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
      notify(t.discardedForSend);
    }
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = () => {
    setAskNote(false);
    try {
      localStorage.setItem(NOTE_KEY, "1");
    } catch {
      /* storage blocked */
    }
    notify("");
    recorder.start().then(
      () => {
        if (recorder.state === "recording") notify(t.started(maxSeconds));
      },
      (failure: MicrophoneFailure) => notify(t[failure] ?? t.micFailed),
    );
  };
  const recording = state === "recording";
  const label = transcribing ? t.cancel : recording ? t.stop : t.start;
  return (
    <span className="voice-input">
      <button
        type="button"
        className={`voice-input-button${recording ? " recording" : ""}`}
        aria-pressed={recording}
        aria-label={label}
        title={label}
        disabled={state === "starting" || (busy && !recording && !transcribing)}
        onClick={() => {
          if (transcribing) abort.current?.abort();
          else if (recording) recorder.stop();
          else if (noteSeen()) begin();
          else setAskNote(true);
        }}
      >
        <Icon name={transcribing ? "close" : "mic"} />
        {/* Visible countdown; the start and the end are announced once through the notice line. */}
        {recording && <small aria-hidden="true">{t.recording(elapsed, maxSeconds)}</small>}
        {transcribing && <small aria-hidden="true">{t.transcribing}</small>}
      </button>
      {askNote && (
        <span className="voice-input-note" role="group" aria-label={t.noteTitle}>
          <strong>{t.noteTitle}</strong>
          <span>{t.note}</span>
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
