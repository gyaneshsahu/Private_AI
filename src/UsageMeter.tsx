// Usage meter (docs/usage-metering-20261115.md): shown only while metering is on. The full view on
// the account's usage page, a compact one in the account menu, and the cost line under a
// calculation with code. Everything comes from GET /api/usage/meter: the account's own numbers.
import { useEffect, useId, useState } from "react";
import type { Message } from "../shared/contracts";
import { activeWeights, type UsageMeterView } from "../shared/usage-config";
import { voiceTodayClocks } from "../shared/voice";
import { useLang, useText } from "./i18n";
import { usageMeterText } from "./text/usage-meter";
import { voiceText } from "./text/voice";

/** Loads the meter; `refresh` changing (the app's status every 30 s) or the window regaining focus reloads it. */
function useMeter(refresh: unknown) {
  const [view, setView] = useState<UsageMeterView | "error">();
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/usage/meter", { credentials: "same-origin", redirect: "error" })
        .then((response) => (response.ok ? (response.json() as Promise<UsageMeterView>) : Promise.reject()))
        .then(
          (next) => live && setView(next),
          () => live && setView("error"),
        );
    void load();
    addEventListener("focus", load);
    return () => {
      live = false;
      removeEventListener("focus", load);
    };
  }, [refresh]);
  return view;
}

function Bar({ used, limit, label }: { used: number; limit: number; label: string }) {
  return <meter className="usage-bar" min={0} max={limit} value={Math.min(used, limit)} aria-label={label} />;
}

export function UsageMeter({ compact = false, refresh }: { compact?: boolean; refresh?: unknown }) {
  const t = useText(usageMeterText);
  const vt = useText(voiceText);
  const { lang } = useLang();
  const view = useMeter(refresh);
  const headingId = useId();
  const number = (n: number) => n.toLocaleString(lang);
  if (!view) return <p className="muted usage-meter">{t.loading}</p>;
  if (view === "error") return <p className="muted usage-meter">{t.unavailable}</p>;
  const { week, today } = view;
  const todayLeft = today.limit === undefined ? undefined : Math.max(0, today.limit - today.used);
  if (compact)
    return (
      <div className="usage-meter compact" aria-label={t.label}>
        {week ? (
          <>
            <p>
              {t.compact(week.remaining, week.limit)}
              {todayLeft !== undefined && ` · ${t.compactToday(todayLeft)}`}
            </p>
            <Bar used={week.used} limit={week.limit} label={t.week(week.used, week.limit)} />
          </>
        ) : (
          <p className="muted">{t.noPeriod}</p>
        )}
      </div>
    );
  const caps = view.plan.caps;
  const capLines = [
    caps.imagesPerDay > 0 && t.pictures(view.todayCounts.images, caps.imagesPerDay),
    caps.researchRunsPerDay > 0 && t.researchRuns(view.todayCounts.researchRuns, caps.researchRunsPerDay),
    caps.searchesPerDay > 0 && t.searches(view.todayCounts.searches, caps.searchesPerDay),
    // The same count and words as "Voice today" at the microphone.
    view.voice?.usedUnits !== undefined && vt.today(...voiceTodayClocks(view.voice.usedUnits, view.voice.dailyUnits)),
  ].filter((line): line is string => !!line);
  const describe = (r: UsageMeterView["recent"][number]) =>
    r.followUps > 0 ? t.calculation(r.units, r.followUps) : `${t[r.feature]}: ${t.counted(r.units)}`;
  return (
    <section className="panel usage-meter" aria-labelledby={headingId}>
      <h3 id={headingId}>{t.heading}</h3>
      {week ? (
        <div className="usage-line">
          <p>
            {t.week(week.used, week.limit)} · <strong>{t.left(week.remaining)}</strong>
          </p>
          <Bar used={week.used} limit={week.limit} label={t.week(week.used, week.limit)} />
          <p className="muted">
            {t.resets(new Date(week.resetsAt).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" }))}
          </p>
        </div>
      ) : (
        <p>{t.noPeriod}</p>
      )}
      <div className="usage-line">
        <p>
          {today.limit === undefined ? t.todayNoLimit(today.used) : t.today(today.used, today.limit)}
          {todayLeft !== undefined && (
            <>
              {" · "}
              <strong>{t.left(todayLeft)}</strong>
            </>
          )}
        </p>
        {today.limit !== undefined && <Bar used={today.used} limit={today.limit} label={t.today(today.used, today.limit)} />}
      </div>
      {capLines.length > 0 && (
        <>
          <h4>{t.caps}</h4>
          <ul className="usage-caps">
            {capLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <h4>{t.byFeature}</h4>
      {view.features.length ? (
        <table className="usage-table">
          <thead>
            <tr>
              <th scope="col">{t.feature}</th>
              <th scope="col">{t.requests}</th>
              <th scope="col">{t.charged}</th>
              <th scope="col">{t.tokens}</th>
            </tr>
          </thead>
          <tbody>
            {view.features.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{t[row.feature]}</th>
                <td>{number(row.requests)}</td>
                <td>{number(row.units)}</td>
                <td>{row.reported ? number(row.tokens) : t.tokensUnknown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">{t.none}</p>
      )}
      {view.recent.length > 0 && (
        <>
          <h4>{t.recent}</h4>
          <ul className="usage-recent">
            {view.recent.map((r) => (
              <li key={r.at + r.feature}>
                <time dateTime={new Date(r.at).toISOString()}>
                  {new Date(r.at).toLocaleString(lang, { dateStyle: "short", timeStyle: "short" })}
                </time>{" "}
                {describe(r)} · {r.tokens === undefined ? t.tokensUnknown : t.tokensCount(number(r.tokens))}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted">
        {t.weights(view.weightsVersion)} {t.costs(view.units["chat-thinking"], view.units.image, view.units["research-run"])}
        {view.voice && <> {t.voiceCost(view.units.voice, view.voice.chunkSeconds)}</>}
      </p>
      <p className="muted">{t.tokensNote}</p>
    </section>
  );
}

/** Under an answer calculated with code: what it counted, by the weights in force. */
export function CodeCost({ message }: { message: Message }) {
  const t = useText(usageMeterText);
  const steps = message.codeSteps ?? 0;
  if (!steps) return null;
  const weights = activeWeights();
  const units = weights.units[message.mode === "thinking" ? "chat-thinking" : "chat-fast"];
  const free = Math.min(steps, weights.freeCodeFollowUps);
  const charged = steps - free;
  return (
    <p className="muted code-cost">
      {charged ? t.codeCostCharged(units, free, charged, charged * units) : t.codeCost(units, steps)}
    </p>
  );
}
