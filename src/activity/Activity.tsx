// Activity (docs/activity-states-20261126.md): the shared pieces for "something is happening".
//  - ActivityLine: one live line with a softly pulsing dot (thinking, searching, reading, …);
//  - Thought: what that line becomes once the answer starts: "Thought for N s", opened on click
//    to the model's reasoning when the provider sent it, to the steps otherwise;
//  - Shimmer: a placeholder in the final size (an image in work);
//  - SkeletonRows: rows in the shape of a list that is loading.
// Motion is soft and stops under "reduce motion"; sizes are fixed, so nothing jumps when the
// content arrives.
import { useSyncExternalStore, type CSSProperties } from "react";
import { useText } from "../i18n";
import { activityText } from "../text/activity";
import { pending, snapshot, subscribe, turnFor, type Turn } from "./store";
import "./activity.css";

export function ActivityLine({ label }: { label?: string }) {
  const t = useText(activityText);
  return (
    <div className="activity-line" role="status">
      <span className="activity-dot" aria-hidden="true" />
      <span className="activity-label">{label || t.thinking}</span>
    </div>
  );
}

/** The turn of one answer, read from the store; undefined when nothing was recorded for it. */
export function useTurn(id: string): Turn | undefined {
  useSyncExternalStore(subscribe, snapshot);
  return turnFor(id);
}

/** Before the answer exists (a search, a file being read): the live line on its own row. */
export function PendingActivity() {
  useSyncExternalStore(subscribe, snapshot);
  const turn = pending();
  return turn ? (
    <article className="message assistant activity-pending">
      <ActivityLine label={turn.live} />
    </article>
  ) : null;
}

export function Thought({ turn }: { turn: Turn }) {
  const t = useText(activityText);
  if (!turn.answeredAt) return null;
  const seconds = Math.round((turn.answeredAt - turn.startedAt) / 1000);
  const reasoning = turn.reasoning.trim();
  // Without the model's own text: what was done, in order, ending in the writing.
  const steps = [...(turn.steps.length ? turn.steps : [t.stepThinking]), t.stepWriting];
  return (
    <details className="activity-thought">
      <summary>
        <span className="activity-dot done" aria-hidden="true" />
        {t.thought(seconds)}
      </summary>
      {reasoning ? (
        <div className="activity-reasoning" role="group" aria-label={t.reasoning} tabIndex={0}>
          {reasoning}
        </div>
      ) : (
        <ol aria-label={t.steps}>
          {steps.map((step, index) => (
            <li key={`${index}-${step}`}>{step.replace(/…$/, "")}</li>
          ))}
        </ol>
      )}
    </details>
  );
}

/** A placeholder with the final proportions; `label` is said once to screen readers. */
export function Shimmer({ label, ratio = "1 / 1", className = "" }: { label: string; ratio?: string; className?: string }) {
  return (
    <div className={`activity-shimmer ${className}`.trim()} role="status" style={{ aspectRatio: ratio } as CSSProperties}>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function SkeletonRows({ label, rows = 6 }: { label: string; rows?: number }) {
  return (
    <div className="activity-skeleton" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} aria-hidden="true" style={{ width: `${[78, 62, 86, 54, 70, 46][index % 6]}%` }} />
      ))}
    </div>
  );
}
