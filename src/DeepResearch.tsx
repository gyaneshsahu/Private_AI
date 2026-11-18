// Deep research in the Research tab (docs/deep-research-20261114.md): the question, one progress
// line with its Stop button, and the result. A run starts straight away (owner, 18 November): the
// plan's search texts are masked on this device and sent without an approval step; a text the
// masking cannot make safe is skipped (src/deep-research.ts parsePlan). The pipeline is
// src/deep-research.ts; the app passes the ways out (model request, its own POST, the send).
// Stays mounted while another tab is shown, so a run keeps its progress.
// `inline` (docs/deep-research-in-chat-20261116.md): the same progress line as a card in the
// conversation for the sent draft, started at once; every ending closes the card and the answer is
// already in the chat.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Source } from "../shared/contracts";
import { RESEARCH_LIMITS } from "../shared/deep-research";
import { preloadAnswer } from "./ChatMessage";
import { limitReached } from "./limit-message";
import { parsePlan, planPrompt, researchNote, runResearch, type Api } from "./deep-research";
import { useText } from "./i18n";
import { IncompleteReplyError } from "./reply-stream";
import { deepResearchText } from "./text/deep-research";
import { researchNextText } from "./text/research-next";

export function DeepResearch(props: {
  hidden: boolean;
  limits: { cost: number; dailyRuns: number };
  /** The app is busy with something else (a message, an import). */
  busy: boolean;
  conversationId: string;
  /** Why a run cannot start now, in the user's words; undefined when it can. */
  blocked: (question: string) => string | undefined;
  /** Characters of source text the answer request has room for (at most the cap). */
  sourceRoom: (question: string) => number;
  /** Shows the app as busy under `label` with `abort` as what Stop stops; "" ends it. */
  hold: (label: string, abort?: AbortController) => void;
  /** The plan request: one message to the Fast model, declared as a research plan. Resolves to its text. */
  plan: (prompt: string, signal: AbortSignal) => Promise<string>;
  api: Api;
  /** The answer request: the question with the sources, sent like any message. True when complete. */
  answer: (
    question: string,
    queries: string[],
    sources: Source[],
    note: string,
    abort: AbortController,
  ) => Promise<boolean>;
  /** Keeps sources of a run that ended early in the conversation. */
  keep: (sources: Source[], queries: string[]) => void;
  showAnswer: () => void;
  /**
   * In the conversation: `question` is the sent draft, the card is drawn into `slot` (null: the
   * chat is not shown, the run goes on). `close` ends it with a line for the app's notice ("" none).
   */
  inline?: { question: string; slot: HTMLElement | null; close: (note: string) => void };
}) {
  const t = useText(deepResearchText);
  const rn = useText(researchNextText);
  const inline = props.inline;
  const ids = inline ? "deep-research-inline" : "deep-research";
  const [question, setQuestion] = useState(inline?.question ?? "");
  const [phase, setPhase] = useState<"idle" | "running" | "writing" | "ended">("idle");
  const [problem, setProblem] = useState("");
  /** The one progress line: what the run is doing now. */
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ text: string; kept?: string; show?: string }>();
  const abort = useRef<AbortController>(undefined);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const questionField = useRef<HTMLTextAreaElement>(null);
  // Gone (another chat, the switch off): nothing more is sent, kept or said for this run.
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false; // StrictMode runs the cleanup once at mount
    return () => {
      gone.current = true;
      abort.current?.abort();
    };
  }, []);
  // In the conversation the run starts at once. A timer, so StrictMode's trial mount sends nothing.
  useEffect(() => {
    if (!inline) return;
    const timer = setTimeout(() => void start());
    return () => clearTimeout(timer);
  }, []);

  // Another conversation (or a lock): the run belongs to the one it started in.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    abort.current?.abort();
    setPhase("idle");
    setResult(undefined);
    setProblem("");
  }, [props.conversationId]);
  useEffect(() => {
    if (!props.hidden && phase === "ended") resultHeading.current?.focus();
  }, [phase, props.hidden]);

  const finish = (text: string, extra: { kept?: string; show?: string } = {}) => {
    if (gone.current) return;
    if (inline) {
      // The run is over: closing must not abort the answer's controller (it is the send's own).
      abort.current = undefined;
      return inline.close([text, extra.kept].filter(Boolean).join(" "));
    }
    setResult({ text, ...extra });
    setPhase("ended");
  };
  const show = (label: string, stop: AbortController) => {
    setProgress(label);
    props.hold(label, stop);
  };

  async function start() {
    const asked = question.trim();
    const reason = props.busy
      ? t.busy
      : asked.length > RESEARCH_LIMITS.questionCharacters
        ? rn.tooLong(RESEARCH_LIMITS.questionCharacters)
        : props.blocked(asked);
    if (reason && inline) return finish(reason);
    setProblem(reason ?? "");
    if (reason || !asked) return;
    const stop = (abort.current = new AbortController());
    setResult(undefined);
    setPhase("running");
    show(t.stepPlan, stop);
    let texts: string[];
    try {
      texts = parsePlan(await props.plan(planPrompt(asked), stop.signal), asked);
      stop.signal.throwIfAborted();
    } catch (error) {
      props.hold("");
      const limit = error instanceof IncompleteReplyError ? limitReached(error) : undefined;
      return finish(stop.signal.aborted ? t.resultCancelled : (limit ?? t.resultPlanFailed));
    }
    // The answer is written while the conversation is hidden: load its renderer now, so "Show
    // answer" never meets the plain-text placeholder (raw Markdown and source codes).
    preloadAnswer();
    const outcome = await runResearch(
      asked,
      texts,
      {
        api: props.api,
        answer: (sources, tally) => {
          // From here the app's own send shows the progress and owns Stop (the same controller).
          props.hold("");
          setProgress(t.stepWrite);
          // In the chat the answer itself is the progress: the card steps aside for it.
          if (inline) setPhase("writing");
          return props.answer(asked, tally.queries, sources, researchNote(tally), stop);
        },
      },
      stop.signal,
      (name, done, total) => {
        if (name === "write") return;
        show(name === "search" ? t.searching(done, total) : t.reading(done, total), stop);
      },
      { ...RESEARCH_LIMITS, sourceCharacters: props.sourceRoom(asked) },
    ).finally(() => props.hold(""));
    // Sources of a run that ended before the answer was requested are kept for a normal question.
    const kept = !outcome.answerSent && outcome.sources.length ? outcome.sources : undefined;
    if (kept && !gone.current) props.keep(kept, outcome.tally.queries);
    finish(
      outcome.status === "done"
        ? t.resultDone
        : outcome.status === "cancelled"
          ? t.resultCancelled
          : outcome.status === "timeout"
            ? t.resultTimeout(Math.round(RESEARCH_LIMITS.wallClockMs / 60_000))
            : outcome.step === "write"
              ? t.resultWriteFailed
              : t.resultSearchFailed,
      {
        kept: kept && t.kept(kept.length),
        show: outcome.status === "done" ? t.showAnswer : kept || outcome.answerSent ? t.showConversation : undefined,
      },
    );
  }

  if (inline && (phase !== "running" || !inline.slot)) return null;
  const card = (
    <section
      className={inline ? "deep-research deep-research-inline" : "content-view deep-research"}
      hidden={props.hidden}
      aria-labelledby={`${ids}-heading`}
    >
      <div className="panel">
        <h3 id={`${ids}-heading`}>{t.heading}</h3>
        {!inline && (
          <p className="muted">
            {t.intro(props.limits.cost, RESEARCH_LIMITS.searches, RESEARCH_LIMITS.pages, props.limits.dailyRuns)}
          </p>
        )}
        {phase === "idle" && (
          <>
            <label>
              {t.question}
              <textarea
                ref={questionField}
                rows={3}
                maxLength={RESEARCH_LIMITS.questionCharacters}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setProblem("");
                }}
              />
            </label>
            {problem && (
              <p className="warning" role="alert">
                {problem}
              </p>
            )}
            <button className="primary" disabled={props.busy || !question.trim()} onClick={() => void start()}>
              {t.start}
            </button>
          </>
        )}
        {(phase === "running" || phase === "writing") && (
          <>
            <p className="research-question">{question.trim()}</p>
            <div className="research-progress">
              <span aria-live="polite">{progress}</span>
              {phase === "running" && (
                <button className="research-stop" onClick={() => abort.current?.abort()}>
                  {t.stop}
                </button>
              )}
            </div>
          </>
        )}
        {phase === "ended" && result && (
          <div className="research-result">
            <h4 tabIndex={-1} ref={resultHeading}>
              {result.text}
            </h4>
            {result.kept && <p>{result.kept}</p>}
            {result.show && (
              <button className="primary" onClick={props.showAnswer}>
                {result.show}
              </button>
            )}
            <button
              onClick={() => {
                setPhase("idle");
                setResult(undefined);
                setQuestion("");
                setTimeout(() => questionField.current?.focus());
              }}
            >
              {t.again}
            </button>
          </div>
        )}
      </div>
    </section>
  );
  return inline?.slot ? createPortal(card, inline.slot) : card;
}
