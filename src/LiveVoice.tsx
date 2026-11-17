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
import { playEarcon, watchSpeech, watchTalkOver } from "./live-voice-audio";
import { AttestationBusyError } from "./providers/inference-client";
import { chooseVoice, loadVoices, pageReader, speechChunks, spokenText } from "./read-aloud";
import { textFor, uiLang } from "./text/core";
import { deviceText } from "./text/device-features";
import { liveVoiceText } from "./text/live-voice";
import { voiceText } from "./text/voice";
import {
  createChunkQueue,
  createVoiceRecorder,
  finalVoiceRefusal,
  transcribeRecording,
  turnSeconds,
  voiceFailureText,
  type ChunkQueue,
  type MicrophoneFailure,
} from "./voice-input";
import { useVoiceUsed, voiceToday } from "./VoiceInput";
import { focusOrigin } from "./focus-origin";

const PREFS_KEY = "cometrow.live-voice";
type Prefs = { ask: boolean; sounds: boolean; talkOver: boolean };
function readPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return { ask: saved.ask === true, sounds: saved.sounds !== false, talkOver: saved.talkOver !== false };
  } catch {
    return { ask: false, sounds: true, talkOver: true }; // storage blocked: defaults each time
  }
}
/**
 * Seconds the transcript is shown before it is sent by itself: none since 18 November (voice
 * conversation), so the reply starts sooner. "Always ask before sending" still waits for a tap.
 */
const REVIEW_SECONDS = 0;
const READER_ID = "live-voice";
/** Seconds before the turn maximum when the warning shows. */
const WARN_SECONDS = 20;
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export function LiveVoice(props: {
  status: AppStatus;
  voice: NonNullable<AppStatus["voice"]>;
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
  transcribe?(audio: Blob, units: number, signal: AbortSignal): Promise<string>;
}) {
  const t = useText(liveVoiceText);
  const vt = useText(voiceText);
  const { lang } = useLang();
  const [used, refreshUsed] = useVoiceUsed(props.status);
  const latest = useRef({ ...props, used, refreshUsed });
  latest.current = { ...props, used, refreshUsed };
  const [turnMax, setTurnMax] = useState(0);
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
    let queue: ChunkQueue | undefined;
    // Reading while the answer is written: each finished sentence of the newest answer is spoken at once.
    let follower: ReturnType<typeof followAnswer> | undefined;
    // The microphone that listens for talk-over while the answer is read.
    let stopTalkOver: (() => void) | undefined;
    const endTalkOver = () => {
      stopTalkOver?.();
      stopTalkOver = undefined;
    };
    const listenForTalkOver = () => {
      if (!prefsRef.current.talkOver || stopTalkOver) return;
      let stopped = false;
      stopTalkOver = () => {
        stopped = true;
      };
      void watchTalkOver(() => {
        endTalkOver();
        machine.bargeIn();
      })
        .then((stop) => {
          if (stopped) stop();
          else stopTalkOver = stop;
        })
        .catch(() => {
          stopTalkOver = undefined; // no microphone: the Interrupt button still works
        });
    };
    const recorder = createVoiceRecorder({
      get maxSeconds() {
        return turnSeconds(latest.current.voice, latest.current.used);
      },
      chunkSeconds: props.voice.chunkSeconds,
      onState: (state) => {
        if (state !== "idle") return;
        unwatch();
        unwatch = () => {};
      },
      onTick: setElapsed,
      // Each chunk is turned into text while the user keeps talking.
      onChunk: (audio, units) => queue?.add(audio, units),
      onEnd: () => machine.heard(queue?.size ?? 0),
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
          start: () => {
            setTurnMax(turnSeconds(latest.current.voice, latest.current.used));
            queue = createChunkQueue(
              (audio, units, signal) => {
                const p = latest.current;
                return (p.transcribe ?? ((a, u, s) => transcribeRecording(a, u, p.status, s)))(audio, units, signal);
              },
              textFor(voiceText).partMissing,
              // Budget or allowance gone: the turn ends here; the reason comes with its text.
              () => recorder.stop(),
            );
            return recorder.start().catch((failure: MicrophoneFailure) => {
              const vt = textFor(voiceText);
              throw vt[failure] ?? vt.micFailed;
            });
          },
          stop: recorder.stop,
          cancel: () => {
            recorder.cancel();
            queue?.cancel();
          },
        },
        async transcribe(signal) {
          const p = latest.current;
          const turn = queue!;
          signal.addEventListener("abort", turn.cancel);
          const result = await turn.finish();
          void p.refreshUsed();
          if (result.failed < turn.size) return result;
          const error = result.error;
          if (error instanceof AttestationBusyError && error.retryAt) p.onVerifyWait(error.retryAt);
          throw { detail: voiceFailureText(error), end: finalVoiceRefusal(error) } satisfies LiveStop;
        },
        blocked() {
          const p = latest.current;
          const lt = textFor(liveVoiceText);
          if (navigator.onLine === false) return { detail: lt.offline };
          if (p.busy) return { detail: lt.otherRequest };
          if (p.verifyWaiting) return { detail: lt.verifyWait };
          // Today's voice time: the next turn needs at least a second of it.
          if (machine.snapshot().phase !== "review" && turnSeconds(p.voice, p.used) < 1)
            return { detail: textFor(voiceText).usedUp, end: true };
          // Before listening a turn needs both; at review the transcription is already paid.
          const need = p.messageCost + (machine.snapshot().phase === "review" ? 0 : speechCost);
          const allowance = p.status.requestAllowance;
          if (allowance && allowance.state !== "unavailable" && allowance.remaining < need)
            return { detail: lt.allowance(need, allowance.remaining), end: true };
          return undefined;
        },
        send: (text, signal) => latest.current.send(text, signal),
        speaker: {
          follow() {
            follower?.cancel();
            follower = followAnswer(() => {
              machine.firstSound();
              listenForTalkOver();
            });
          },
          async speak(started) {
            if (follower) {
              const f = follower;
              const result = await f.finish((expectedMs) => started(expectedMs));
              setSpoken(f.text());
              endTalkOver();
              return result;
            }
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
            follower?.cancel();
            follower = undefined;
            endTalkOver();
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
  }, [props.voice.chunkSeconds, speechCost]);

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
    const focused = focusOrigin();
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

  // Read aloud never speaks on Android (src/read-aloud.ts), so live voice cannot work there: no button.
  if (android) return null;

  const { phase } = snap;
  const active = !["idle", "paused", "ended"].includes(phase);
  const warning = phase === "listening" && turnMax - elapsed <= WARN_SECONDS;
  const stateLine =
    phase === "idle"
      ? ""
      : phase === "starting"
        ? t.starting
        : phase === "listening"
          ? warning
            ? `${t.listening(elapsed, turnMax)} · ${vt.stopsIn(Math.max(0, turnMax - elapsed))}`
            : t.listening(elapsed, turnMax)
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
  // Announced once per change of state, and once 20 seconds before the end: not the ticking clock.
  const announced =
    phase === "listening"
      ? warning && turnMax > WARN_SECONDS
        ? t.warn(WARN_SECONDS)
        : t.listening(0, turnMax).replace(/\s*\d.*$/, "")
      : phase === "review"
        ? t.review
        : stateLine;

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
          // The last turn's delay from the end of speech to the first spoken word (measured, for tests and support).
          data-reply-delay-ms={snap.replyDelayMs}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            close();
          }}
        >
          <h2 id="live-voice-title">{t.title}</h2>
          {/* The colour ball (UI redesign, 18 November): it moves while listening, thinking or speaking
              and rests otherwise. CSS only; off under reduced motion. */}
          <div className="live-voice-orb" data-phase={phase} aria-hidden="true">
            <i />
          </div>
          <p className="live-voice-state" data-phase={phase}>
            {stateLine}
          </p>
          <p className="sr-only" aria-live="polite">
            {announced}
          </p>
          {phase === "idle" && (
            <>
              <p>{t.what}</p>
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
          {used !== undefined && <p className="muted live-voice-today">{voiceToday(vt, props.voice, used)}</p>}
          <div className="live-voice-prefs">
            <label>
              <input type="checkbox" checked={prefs.ask} onChange={(e) => save({ ...prefs, ask: e.target.checked })} />
              {t.alwaysAsk}
            </label>
            <label>
              <input type="checkbox" checked={prefs.sounds} onChange={(e) => save({ ...prefs, sounds: e.target.checked })} />
              {t.sounds}
            </label>
            <label>
              <input type="checkbox" checked={prefs.talkOver} onChange={(e) => save({ ...prefs, talkOver: e.target.checked })} />
              {t.talkOver}
            </label>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * Reads the newest answer aloud sentence by sentence while it is still being written (voice
 * conversation, 18 November). It watches the answer the send creates (the next assistant message),
 * speaks every finished sentence with the best local voice, and `finish()` reads the rest once the
 * answer is complete. `onSound` runs at the first spoken word. Same local-voice rule as read aloud:
 * no local voice, no speech.
 */
function followAnswer(onSound: () => void) {
  const index = document.querySelectorAll("article.message.assistant").length;
  const element = () => document.querySelectorAll("article.message.assistant")[index]?.querySelector(".message-text");
  let queued = 0; // characters of the spoken text already handed to the speech engine
  let pending = 0;
  let spokeOnce = false;
  let cancelled = false;
  let latestText = "";
  let voice: SpeechSynthesisVoice | "none" | "unverifiable" | undefined;
  let answerLang = uiLang();
  const waiters: (() => void)[] = [];
  const settle = () => {
    if (pending > 0) return;
    waiters.splice(0).forEach((resolve) => resolve());
  };
  const say = (piece: string) => {
    if (cancelled || !piece.trim() || !voice || typeof voice === "string") return;
    for (const chunk of speechChunks(piece)) {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      pending++;
      utterance.onstart = () => {
        if (spokeOnce) return;
        spokeOnce = true;
        onSound();
      };
      utterance.onend = utterance.onerror = () => {
        // An engine that never reports a start still marks the first sound by its end.
        if (!spokeOnce) utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
        pending--;
        settle();
      };
      speechSynthesis.speak(utterance);
    }
  };
  /** Hands every sentence finished so far (or, at the end, everything) to the speech engine. */
  const pump = (all: boolean) => {
    const shown = element();
    if (!shown) return;
    const text = spokenText(shown, deviceText[answerLang]);
    latestText = text;
    let end = text.length;
    if (!all) {
      const ends = [...text.matchAll(/[.!?…:](?=\s)|\n/g)];
      end = ends.length ? ends[ends.length - 1].index! + 1 : 0;
    }
    if (end <= queued) return;
    say(text.slice(queued, end));
    queued = end;
  };
  const ready = (async () => {
    pageReader()?.stop(); // one voice at a time
    // The first words decide the language and so the voice; the interface language until then.
    for (let i = 0; i < 40 && !cancelled && !element()?.textContent?.trim(); i++)
      await new Promise((resolve) => setTimeout(resolve, 50));
    answerLang = languageOf(element()?.textContent ?? "") ?? uiLang();
    voice =
      typeof speechSynthesis === "undefined" ? "unverifiable" : chooseVoice(await loadVoices(speechSynthesis), answerLang);
  })();
  const timer = setInterval(() => void ready.then(() => pump(false)), 200);
  return {
    text: () => latestText,
    async finish(started: (expectedMs: number) => void): Promise<"spoken" | { refused: string }> {
      clearInterval(timer);
      await ready;
      await frame();
      await frame();
      const dt = textFor(deviceText);
      if (voice === "none") return { refused: dt.noVoice(answerLang) };
      if (voice === "unverifiable" || !voice) return { refused: dt.voiceUnknown };
      pump(true);
      started(speechTimeoutMs(latestText.length));
      if (cancelled) return "spoken";
      return new Promise((resolve) => {
        waiters.push(() => resolve("spoken"));
        settle();
      });
    },
    cancel() {
      cancelled = true;
      clearInterval(timer);
      pending = 0;
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      settle();
    },
  };
}
