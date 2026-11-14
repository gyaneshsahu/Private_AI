// Live voice conversation (docs/live-voice-20261114.md): the composer button and the one panel
// that shows the state, what was heard, the answer, and the controls. The loop is src/live-voice.ts;
// this file wires it to the browser: the voice input recorder, the silence detector, transcription,
// the app's own send path (given by App), and the page's on-device reader.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { AppStatus } from "../shared/contracts";
import { languageOf } from "./arithmetic/numbers";
import { Icon } from "./Icon";
import { useLang, useText } from "./i18n";
import {
  createLiveVoice,
  LIVE_VOICE_CAPS,
  speechTimeoutMs,
  type LiveSnapshot,
  type LiveStop,
  type SendOutcome,
} from "./live-voice";
import { playEarcon, watchSpeech } from "./live-voice-audio";
import { AttestationBusyError } from "./providers/inference-client";
import { chooseVoice, loadVoices, pageReader, speechChunks, spokenText } from "./read-aloud";
import { textFor, uiLang } from "./text/core";
import { deviceText } from "./text/device-features";
import { liveVoiceText } from "./text/live-voice";
import { voiceText } from "./text/voice";
import { createVoiceRecorder, transcribeRecording, voiceFailureText, type MicrophoneFailure } from "./voice-input";

const PREFS_KEY = "cometrow.live-voice";
type Prefs = { ask: boolean; sounds: boolean };
function readPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return { ask: saved.ask === true, sounds: saved.sounds !== false };
  } catch {
    return { ask: false, sounds: true }; // storage blocked: defaults each time
  }
}
/** Seconds the transcript is shown before it is sent by itself. */
const REVIEW_SECONDS = 3;
const READER_ID = "live-voice";
/** Relay refusals after which no further turn can work today: the session ends. */
const FINAL = ["refused_voice_daily", "refused_daily", "refused_allowance", "refused_spend", "stopped", "off"];
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export function LiveVoice(props: {
  status: AppStatus;
  maxSeconds: number;
  /** The mode a live turn uses (Fast unless the user chose Thinking) and its allowance units. */
  modeName: string;
  messageCost: number;
  busy: boolean;
  verifyWaiting: boolean;
  conversationId: string;
  unlocked: boolean;
  /** One question through App's send(): masking, allowance, health consent, stop. */
  send(text: string, signal: AbortSignal): Promise<SendOutcome>;
  notify(text: string): void;
  onVerifyWait(retryAt: number): void;
  /** Review → Edit: the transcript goes into the message box. */
  onEdit(text: string): void;
  /** Test seam; the attested Privatemode session by default. */
  transcribe?(audio: Blob, signal: AbortSignal): Promise<string>;
}) {
  const t = useText(liveVoiceText);
  const { lang } = useLang();
  const latest = useRef(props);
  latest.current = props;
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<LiveSnapshot>({ phase: "idle", transcript: "", turns: 0, units: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [spoken, setSpoken] = useState("");
  const [prefs, setPrefs] = useState(readPrefs);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const speechCost = props.status.inference.qualification?.speech?.allowanceCost ?? 1;
  const android = /Android/i.test(navigator.userAgent);

  const live = useMemo(() => {
    let unwatch = () => {};
    const recorder = createVoiceRecorder({
      maxSeconds: props.maxSeconds,
      onState: (state) => {
        if (state !== "idle") return;
        unwatch();
        unwatch = () => {};
      },
      onTick: setElapsed,
      onAudio: (audio) => machine.audio(audio),
      // The stream is also watched for the end of speech and for another app taking the microphone.
      media: {
        async getUserMedia(constraints) {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getAudioTracks()[0]?.addEventListener("ended", () => machine.pause({ key: "micLost" }));
          unwatch = watchSpeech(stream, (event) =>
            event === "speechEnd" ? machine.doneSpeaking() : machine.noSpeech(),
          );
          return stream;
        },
      },
    });
    const machine = createLiveVoice(
      {
        recorder: {
          start: () =>
            recorder.start().catch((failure: MicrophoneFailure) => {
              const vt = textFor(voiceText);
              throw vt[failure] ?? vt.micFailed;
            }),
          stop: recorder.stop,
          cancel: recorder.cancel,
        },
        async transcribe(audio, signal) {
          const p = latest.current;
          try {
            return await (p.transcribe ?? ((a, s) => transcribeRecording(a, p.status, s)))(audio, signal);
          } catch (error) {
            if (error instanceof AttestationBusyError && error.retryAt) p.onVerifyWait(error.retryAt);
            const headers = (error as { headers?: unknown } | undefined)?.headers;
            const reason = headers instanceof Headers ? headers.get("x-privateai-voice") : null;
            throw { detail: voiceFailureText(error), end: FINAL.includes(reason ?? "") } satisfies LiveStop;
          }
        },
        blocked() {
          const p = latest.current;
          const lt = textFor(liveVoiceText);
          if (navigator.onLine === false) return { detail: lt.offline };
          if (p.busy) return { detail: lt.otherRequest };
          if (p.verifyWaiting) return { detail: lt.verifyWait };
          // Before listening a turn needs both; at review the transcription is already paid.
          const need = p.messageCost + (machine.snapshot().phase === "review" ? 0 : speechCost);
          const allowance = p.status.requestAllowance;
          if (allowance && allowance.state !== "unavailable" && allowance.remaining < need)
            return { detail: lt.allowance(need, allowance.remaining), end: true };
          return undefined;
        },
        send: (text, signal) => latest.current.send(text, signal),
        speaker: {
          async speak(started) {
            // The newest answer as the chat shows it, once React has rendered the finished text.
            await frame();
            await frame();
            const shown = [...document.querySelectorAll("article.message.assistant .message-text")].at(-1);
            const answerLang = languageOf(shown?.textContent ?? "") ?? uiLang();
            const text = shown ? spokenText(shown, deviceText[answerLang]) : "";
            setSpoken(text);
            const reader = pageReader();
            const dt = textFor(deviceText);
            if (!reader) return { refused: dt.voiceUnknown };
            if (!text) return "spoken";
            const voice = chooseVoice(await loadVoices(speechSynthesis), answerLang);
            if (voice === "none") return { refused: dt.noVoice(answerLang) };
            if (voice === "unverifiable") return { refused: dt.voiceUnknown };
            started(speechTimeoutMs(text.length));
            reader.start(READER_ID, speechChunks(text), voice);
            return new Promise<"spoken">((resolve) => {
              const done = () => {
                if (reader.state()?.id === READER_ID) return;
                off();
                resolve("spoken");
              };
              const off = reader.subscribe(done);
              done(); // an engine that refused the first piece has already stopped
            });
          },
          cancel() {
            const reader = pageReader();
            if (reader?.state()?.id === READER_ID) reader.stop();
          },
        },
        clock: {
          now: () => Date.now(),
          setTimeout: (run, ms) => setTimeout(run, ms),
          clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        },
        earcon: (name) => prefsRef.current.sounds && playEarcon(name),
        onChange(next) {
          if (next.phase === "transcribing") setSpoken("");
          setSnap(next);
        },
      },
      {
        get review() {
          return prefsRef.current.ask ? ("ask" as const) : REVIEW_SECONDS;
        },
        ...LIVE_VOICE_CAPS,
        speechCost,
        get messageCost() {
          return latest.current.messageCost;
        },
      },
    );
    return machine;
  }, [props.maxSeconds, speechCost]);

  // Another conversation or a locked vault ends the session; so does leaving the page.
  useEffect(() => () => live.end({ key: "conversationChanged" }), [live, props.conversationId]);
  useEffect(() => {
    if (props.unlocked) return () => live.end({ key: "locked" });
  }, [live, props.unlocked]);
  useEffect(() => {
    // The microphone never stays open unseen, and speech stops with it.
    const hidden = () => document.visibilityState === "hidden" && live.pause({ key: "hidden" });
    const leave = () => live.stop();
    document.addEventListener("visibilitychange", hidden);
    addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      removeEventListener("pagehide", leave);
    };
  }, [live]);

  const reasonText = (): string => {
    const reason = snap.reason;
    if (!reason) return "";
    if (reason.detail) return reason.detail;
    if (reason.key === "edit") return t.edit_;
    if (reason.key === "paused") return t.pausedByYou;
    if (reason.key in t) return t[reason.key as keyof typeof t] as string;
    return "";
  };
  // Endings that hand over to the screen close the panel; the notice line says why.
  useEffect(() => {
    if (snap.phase !== "ended" || !snap.reason) return;
    if (!["consent", "searchChoice", "edit"].includes(snap.reason.key)) return;
    setOpen(false);
    props.notify(reasonText());
  }, [snap]); // eslint-disable-line react-hooks/exhaustive-deps
  // On opening, and when the focused button went away with the state (End, Send now ...), the
  // focus goes to the panel's first action; it is not taken from elsewhere on the page.
  useEffect(() => {
    if (!open) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body && panel.current?.isConnected && focused !== trigger.current) return;
    panel.current?.querySelector<HTMLElement>(".live-voice-actions button")?.focus();
  }, [open, snap.phase]);

  const close = () => {
    live.stop();
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const save = (next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: the choice lasts for this page */
    }
  };

  if (android)
    return (
      <button type="button" className="live-voice-open" disabled aria-label={t.androidOff} title={t.androidOff}>
        <Icon name="voice" />
      </button>
    );

  const { phase } = snap;
  const active = !["idle", "paused", "ended"].includes(phase);
  const stateLine =
    phase === "idle"
      ? ""
      : phase === "starting"
        ? t.starting
        : phase === "listening"
          ? t.listening(elapsed, props.maxSeconds)
          : phase === "transcribing"
            ? t.transcribing
            : phase === "review"
              ? snap.reviewLeft !== undefined
                ? t.sendingIn(snap.reviewLeft)
                : t.review
              : phase === "answering"
                ? t.answering
                : phase === "speaking"
                  ? t.speaking
                  : `${phase === "paused" ? t.paused : t.ended} ${reasonText()}`;
  // Announced once per change of state: not the ticking clock or countdown.
  const announced =
    phase === "listening" ? t.listening(0, props.maxSeconds).replace(/\s*\d.*$/, "") : phase === "review" ? t.review : stateLine;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="live-voice-open"
        aria-label={t.open}
        title={t.open}
        aria-expanded={open}
        disabled={props.busy && !open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="voice" />
      </button>
      {open && (
        <section
          ref={panel}
          className="live-voice"
          role="region"
          aria-labelledby="live-voice-title"
          lang={lang}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            close();
          }}
        >
          <h2 id="live-voice-title">{t.title}</h2>
          <p className="live-voice-state" data-phase={phase}>
            {stateLine}
          </p>
          <p className="sr-only" aria-live="polite">
            {announced}
          </p>
          {phase === "idle" && (
            <>
              <p>{t.what}</p>
              <p className="muted">{t.note}</p>
              <p className="muted">
                {t.cost(speechCost + props.messageCost, props.modeName, LIVE_VOICE_CAPS.maxTurns, LIVE_VOICE_CAPS.maxMs / 60_000)}
              </p>
            </>
          )}
          {snap.transcript && (
            <div className="live-voice-text">
              <h3>{t.heard}</h3>
              <p>{snap.transcript}</p>
            </div>
          )}
          {spoken && (
            <div className="live-voice-text live-voice-answer">
              <h3>{t.answer}</h3>
              <p>{spoken}</p>
            </div>
          )}
          <div className="live-voice-actions">
            {(phase === "idle" || phase === "ended") && (
              <button type="button" className="primary" onClick={() => live.start()}>
                {phase === "idle" ? t.start : t.again}
              </button>
            )}
            {phase === "listening" && (
              <button type="button" className="primary" onClick={() => live.doneSpeaking()}>
                {t.doneSpeaking}
              </button>
            )}
            {phase === "review" && (
              <>
                <button type="button" className="primary" onClick={() => live.sendNow()}>
                  {t.sendNow}
                </button>
                <button type="button" onClick={() => live.cancelReview()}>
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = live.edit();
                    if (text) props.onEdit(text);
                  }}
                >
                  {t.edit}
                </button>
              </>
            )}
            {phase === "speaking" && (
              <button type="button" onClick={() => live.skipSpeech()}>
                {t.skip}
              </button>
            )}
            {phase === "paused" && (
              <button type="button" className="primary" onClick={() => live.resume()}>
                {t.resume}
              </button>
            )}
            {active && (
              <button type="button" onClick={() => live.pause()}>
                {t.pause}
              </button>
            )}
            {active || phase === "paused" ? (
              <button type="button" className="live-voice-end" onClick={() => live.stop()}>
                {t.end}
              </button>
            ) : (
              <button type="button" onClick={close}>
                {t.close}
              </button>
            )}
          </div>
          {phase !== "idle" && (
            <p className="muted">{t.used(snap.turns, LIVE_VOICE_CAPS.maxTurns, snap.units)}</p>
          )}
          <div className="live-voice-prefs">
            <label>
              <input type="checkbox" checked={prefs.ask} onChange={(e) => save({ ...prefs, ask: e.target.checked })} />
              {t.alwaysAsk}
            </label>
            <label>
              <input type="checkbox" checked={prefs.sounds} onChange={(e) => save({ ...prefs, sounds: e.target.checked })} />
              {t.sounds}
            </label>
          </div>
        </section>
      )}
    </>
  );
}
