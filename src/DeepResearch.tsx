// Deep research in the Research tab (docs/deep-research-20261114.md): the question, the approval
// of the search texts, the visible step list with its Stop button, and the result. The pipeline
// is src/deep-research.ts; the app passes the ways out (model request, its own POST, the send).
// Stays mounted while another tab is shown, so a run keeps its progress.
import { useEffect, useRef, useState } from "react";
import type { Source } from "../shared/contracts";
import { RESEARCH_LIMITS, researchWeights } from "../shared/deep-research";
import { parsePlan, planPrompt, researchNote, runResearch, type Api, type RunStep } from "./deep-research";
import { useText } from "./i18n";
import { IncompleteReplyError } from "./reply-stream";
import { SearchSuggestionField } from "./SearchSuggestionField";
import { deepResearchText } from "./text/deep-research";
import { editedSearchText, WHEN_TO_SEARCH } from "./when-to-search";

type Step = "plan" | RunStep;
type StepView = { state: "waiting" | "running" | "done" | "failed" | "stopped"; detail?: string };
const ORDER: Step[] = ["plan", "search", "read", "write"];
const fresh = (): Record<Step, StepView> => ({
  plan: { state: "waiting" },
  search: { state: "waiting" },
  read: { state: "waiting" },
  write: { state: "waiting" },
});

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
}) {
  const t = useText(deepResearchText);
  const weights = researchWeights(props.limits.cost);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<"idle" | "planning" | "approve" | "running" | "ended">("idle");
  const [problem, setProblem] = useState("");
  const [rows, setRows] = useState<{ id: number; text: string }[]>([]);
  const [steps, setSteps] = useState(fresh);
  const [result, setResult] = useState<{ text: string; used: string; kept?: string; show?: string }>();
  const abort = useRef<AbortController>(undefined);
  const approveHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const approveButton = useRef<HTMLButtonElement>(null);
  const questionField = useRef<HTMLTextAreaElement>(null);
  const step = (name: Step, view: StepView) => setSteps((all) => ({ ...all, [name]: view }));

  // Another conversation (or a lock): the run belongs to the one it started in.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    abort.current?.abort();
    setPhase("idle");
    setSteps(fresh());
    setResult(undefined);
    setProblem("");
  }, [props.conversationId]);
  // Each new stage takes the focus, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (props.hidden) return;
    if (phase === "approve") approveHeading.current?.focus();
    if (phase === "ended") resultHeading.current?.focus();
  }, [phase, props.hidden]);

  const finish = (text: string, used: string, extra: { kept?: string; show?: string } = {}) => {
    setResult({ text, used, ...extra });
    setPhase("ended");
  };

  async function start() {
    const asked = question.trim();
    const reason = props.busy ? t.busy : props.blocked(asked);
    setProblem(reason ?? "");
    if (reason || !asked) return;
    const stop = (abort.current = new AbortController());
    setSteps({ ...fresh(), plan: { state: "running" } });
    setResult(undefined);
    setPhase("planning");
    props.hold(t.stepPlan, stop);
    try {
      const raw = await props.plan(planPrompt(asked), stop.signal);
      stop.signal.throwIfAborted();
      const texts = parsePlan(raw, asked);
      setRows(texts.map((text, id) => ({ id, text })));
      step("plan", { state: "done", detail: t.planDone(texts.length) });
      setPhase("approve");
    } catch (error) {
      step("plan", { state: stop.signal.aborted ? "stopped" : "failed" });
      // The plan request may or may not have been counted: say the most it can be.
      finish(
        stop.signal.aborted
          ? t.resultCancelled
          : error instanceof IncompleteReplyError && error.diagnostic?.code === "HTTP_RATE_LIMITED"
            ? t.resultPlanRefused
            : t.resultPlanFailed,
        t.usedAtMost(weights.plan, props.limits.cost),
      );
    } finally {
      props.hold("");
    }
  }

  const masked = rows.map((row) => editedSearchText(row.text));
  const approvedTexts = [...new Set(masked.map((entry) => entry.value))];

  async function go() {
    if (props.busy || !rows.length || masked.some((entry) => entry.problem)) return;
    const asked = question.trim();
    const stop = (abort.current = new AbortController());
    setPhase("running");
    props.hold(t.stepSearch, stop);
    const outcome = await runResearch(
      asked,
      approvedTexts,
      {
        api: props.api,
        answer: (sources, tally) => {
          // From here the app's own send shows the progress and owns Stop (the same controller).
          props.hold("");
          return props.answer(asked, tally.queries, sources, researchNote(tally), stop);
        },
      },
      stop.signal,
      (name, done, total, tally) => {
        const label = name === "search" ? t.searching(done, total) : name === "read" ? t.reading(done, total) : undefined;
        props.hold(label ?? t.stepWrite, stop);
        setSteps((all) => ({
          ...all,
          ...(name !== "search"
            ? { search: { state: "done", detail: t.searchDone(tally.searches, tally.searchesFailed) } }
            : {}),
          ...(name === "write"
            ? { read: { state: "done", detail: t.readDone(tally.pages - tally.pagesFailed, tally.pagesFailed) } }
            : {}),
          [name]: { state: "running", detail: label },
        }));
      },
      { ...RESEARCH_LIMITS, sourceCharacters: props.sourceRoom(asked) },
    ).finally(() => props.hold(""));
    const { tally } = outcome;
    const ended: StepView["state"] =
      outcome.status === "done" ? "done" : outcome.status === "failed" ? "failed" : "stopped";
    const at = ORDER.indexOf(outcome.step);
    setSteps((all) => ({
      ...all,
      search: {
        state: at > 1 ? "done" : ended,
        detail: t.searchDone(tally.searches, tally.searchesFailed),
      },
      read: {
        state: at > 2 ? "done" : at === 2 ? ended : "waiting",
        detail:
          at >= 2
            ? `${t.readDone(tally.pages - tally.pagesFailed, tally.pagesFailed)}${tally.outOfTime ? ` ${t.outOfTime}` : ""}`
            : undefined,
      },
      write: { state: at === 3 ? ended : "waiting", detail: outcome.status === "done" ? t.writeDone : undefined },
    }));
    // Sources of a run that ended before the answer was requested are kept for a normal question.
    const kept = !outcome.answerSent && outcome.sources.length ? outcome.sources : undefined;
    if (kept) props.keep(kept, tally.queries);
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
      outcome.status === "done"
        ? t.used(props.limits.cost, props.limits.cost)
        : outcome.answerSent
          ? t.usedAtMost(props.limits.cost, props.limits.cost)
          : t.used(weights.plan, props.limits.cost),
      {
        kept: kept && t.kept(kept.length),
        show: outcome.status === "done" ? t.showAnswer : kept || outcome.answerSent ? t.showConversation : undefined,
      },
    );
  }

  const stateLabel = (view: StepView) => t[view.state];
  const names: Record<Step, string> = {
    plan: t.stepPlan,
    search: t.stepSearch,
    read: t.stepRead,
    write: t.stepWrite,
  };
  return (
    <section className="content-view deep-research" hidden={props.hidden} aria-labelledby="deep-research-heading">
      <div className="panel">
        <h3 id="deep-research-heading">{t.heading}</h3>
        <p className="muted">
          {t.intro(props.limits.cost, RESEARCH_LIMITS.searches, RESEARCH_LIMITS.pages, props.limits.dailyRuns)}
        </p>
        {phase === "idle" ? (
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
            <p className="muted">{t.planNote}</p>
            {problem && (
              <p className="warning" role="alert">
                {problem}
              </p>
            )}
            <button className="primary" disabled={props.busy || !question.trim()} onClick={() => void start()}>
              {t.plan}
            </button>
          </>
        ) : (
          <>
            <p className="research-question">{question.trim()}</p>
            <ol className="research-steps" aria-label={t.steps}>
              {ORDER.map((name) => (
                <li key={name} data-state={steps[name].state}>
                  {/* While a step runs, its count stands in for its name ("Searching 2 of 4"). */}
                  <span className="research-step-name">
                    {(steps[name].state === "running" && steps[name].detail) || names[name]}
                  </span>
                  <span className="sr-only">: {stateLabel(steps[name])}. </span>
                  {steps[name].state !== "running" && steps[name].detail && (
                    <span className="muted">{steps[name].detail}</span>
                  )}
                </li>
              ))}
            </ol>
            {/* One polite line for screen readers: the step that is running now. */}
            <p className="sr-only" aria-live="polite">
              {ORDER.filter((name) => steps[name].state === "running")
                .map((name) => steps[name].detail ?? names[name])
                .join("")}
            </p>
          </>
        )}
        {(phase === "planning" || phase === "running") && (
          <button className="research-stop" onClick={() => abort.current?.abort()}>
            {t.stop}
          </button>
        )}
        {phase === "approve" && (
          <div className="approval search-suggestion" role="group" aria-labelledby="deep-research-approve">
            <h4 id="deep-research-approve" tabIndex={-1} ref={approveHeading}>
              {t.approveHeading}
            </h4>
            {rows.map((row, index) => (
              <div className="research-query" key={row.id}>
                <span id={`deep-research-label-${row.id}`} className="muted">
                  {t.field(index + 1)}
                </span>
                <SearchSuggestionField
                  labelledBy={`deep-research-label-${row.id}`}
                  sentId={`deep-research-sent-${row.id}`}
                  text={row.text}
                  sent={masked[index].value}
                  problem={masked[index].problem}
                  onChange={(text) => setRows((all) => all.map((r) => (r.id === row.id ? { ...r, text } : r)))}
                  onEnter={() => approveButton.current?.click()}
                />
                {masked[index].note && <p className="muted">{masked[index].note}</p>}
                <button
                  aria-label={t.remove(index + 1)}
                  onClick={() => {
                    setRows((all) => all.filter((r) => r.id !== row.id));
                    approveHeading.current?.focus();
                  }}
                >
                  {t.removeShort}
                </button>
              </div>
            ))}
            {masked.some((entry) => entry.warning) && <p className="warning">{WHEN_TO_SEARCH.warning}</p>}
            {rows.length ? <p>{t.approveNote(RESEARCH_LIMITS.pages)}</p> : <p className="warning">{t.noneLeft}</p>}
            <button
              className="primary"
              ref={approveButton}
              disabled={props.busy || !rows.length || masked.some((entry) => entry.problem)}
              onClick={() => void go()}
            >
              {t.approve(Math.max(1, approvedTexts.length))}
            </button>
            <button onClick={() => finish(t.resultCancelled, t.used(weights.plan, props.limits.cost))}>
              {t.cancel}
            </button>
          </div>
        )}
        {phase === "ended" && result && (
          <div className="research-result">
            <h4 tabIndex={-1} ref={resultHeading}>
              {result.text}
            </h4>
            <p>{result.used}</p>
            {result.kept && <p>{result.kept}</p>}
            {result.show && (
              <button className="primary" onClick={props.showAnswer}>
                {result.show}
              </button>
            )}
            <button
              onClick={() => {
                setPhase("idle");
                setSteps(fresh());
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
}
