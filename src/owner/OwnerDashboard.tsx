// The owner's dashboard (docs/analytics-20261125.md): counts only, for an account on the owner
// list. Headline numbers, one row per day, then feature use, errors and limits reached as lists.
// Plain tables: every number can be read by a screen reader and copied into a spreadsheet.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isErrorCounter, isLimitCounter, type AnalyticsDay, type AnalyticsView } from "../../shared/analytics";
import { containDialogFocus } from "../dialog-focus";
import { Icon } from "../Icon";
import { useLang, useText } from "../i18n";
import { ownerFeatureText, ownerText } from "../text/owner";
import "./owner.css";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
/** Totals over the period of every name a day can hold under `pick`. */
function totals(days: readonly AnalyticsDay[], pick: (day: AnalyticsDay) => Record<string, number>, keep: (name: string) => boolean) {
  const out = new Map<string, number>();
  for (const day of days) for (const [name, value] of Object.entries(pick(day))) if (keep(name)) out.set(name, (out.get(name) ?? 0) + value);
  return [...out].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function OwnerDashboard(props: {
  onClose(): void;
  /** False when analytics is off and the dashboard only holds what `children` bring (feedback). */
  analytics?: boolean;
  children?: ReactNode;
}) {
  const counted = props.analytics !== false;
  const t = useText(ownerText);
  const { lang } = useLang();
  const names = ownerFeatureText[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [range, setRange] = useState(30);
  const [view, setView] = useState<AnalyticsView | "failed">();
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  useEffect(() => {
    let live = true;
    if (!counted) return;
    setView(undefined);
    fetch(`/api/owner/analytics?days=${range}`, { credentials: "same-origin" })
      .then((response) => (response.ok ? (response.json() as Promise<AnalyticsView>) : Promise.reject()))
      .then(
        (next) => live && setView(next),
        () => live && setView("failed"),
      );
    return () => {
      live = false;
    };
  }, [range, counted]);
  const number = (n: number) => n.toLocaleString(lang === "de" ? "de-DE" : "en-GB");
  const euros = (n: number) => n.toLocaleString(lang === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const list = (heading: string, rows: [string, number][]) => (
    <section>
      <h3>{heading}</h3>
      {rows.length ? (
        <table className="owner-table owner-list">
          <thead>
            <tr>
              <th scope="col">{t.name}</th>
              <th scope="col">{t.count}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, value]) => (
              <tr key={name}>
                <th scope="row">{names[name] ?? name}</th>
                <td>{number(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">{t.none}</p>
      )}
    </section>
  );
  const open = view && view !== "failed" ? view : undefined;
  const days = open ? [...open.days].reverse() : [];
  const today = open?.days.at(-1);
  const counterSum = (day: AnalyticsDay, keep: (name: string) => boolean) => sum(Object.entries(day.counters).filter(([name]) => keep(name)).map(([, value]) => value));
  return (
    <dialog
      ref={dialog}
      className="owner-dialog"
      aria-label={t.title}
      onKeyDown={containDialogFocus}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <header>
        <h2>{t.title}</h2>
        {counted && (
          <label>
            <span>{t.range}</span>
            <select value={range} onChange={(event) => setRange(Number(event.target.value))}>
              {[7, 30, 90].map((n) => (
                <option key={n} value={n}>
                  {t.days(n)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="icon-button" aria-label={t.close} onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </header>
      {counted && !view && <p role="status">{t.loading}</p>}
      {counted && view === "failed" && <p role="status">{t.failed}</p>}
      {open && (
        <>
          <p className="muted">{t.intro(open.retentionDays)}</p>
          {!open.records && <p>{t.noRecords}</p>}
          <dl className="owner-tiles">
            <div>
              <dt>{t.weeklyActive}</dt>
              <dd>{number(open.weeklyActive)}</dd>
              <dd className="muted">{t.weeklyBefore(open.weeklyActiveBefore)}</dd>
            </div>
            <div>
              <dt>{t.weeklyReturning}</dt>
              <dd>{number(open.weeklyReturning)}</dd>
            </div>
            <div>
              <dt>{t.activeToday}</dt>
              <dd>{number(today?.active ?? 0)}</dd>
            </div>
            <div>
              <dt>{t.costRange}</dt>
              <dd>{euros(sum(open.days.map((d) => d.costEUR)))} EUR</dd>
              <dd className="muted">
                {t.costNote}
                {sum(open.days.map((d) => d.unpriced)) > 0 && ` ${t.unpriced(sum(open.days.map((d) => d.unpriced)))}`}
              </dd>
            </div>
          </dl>
          <section>
            <h3>{t.byDay}</h3>
            <div className="owner-scroll" tabIndex={0} role="group" aria-label={t.byDay}>
              <table className="owner-table">
                <thead>
                  <tr>
                    {[t.day, t.active, t.returning, t.fast, t.thinking, t.other, t.errors, t.limits, t.cost].map((heading) => (
                      <th key={heading} scope="col">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.day}>
                      <th scope="row">{date(day.day)}</th>
                      <td>{number(day.active)}</td>
                      <td>{number(day.returning)}</td>
                      <td>{number(day.requests["chat-fast"] ?? 0)}</td>
                      <td>{number(day.requests["chat-thinking"] ?? 0)}</td>
                      <td>{number(sum(Object.entries(day.requests).filter(([kind]) => kind !== "chat-fast" && kind !== "chat-thinking").map(([, n]) => n)))}</td>
                      <td>{number(counterSum(day, isErrorCounter))}</td>
                      <td>{number(counterSum(day, isLimitCounter))}</td>
                      <td>{euros(day.costEUR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {list(t.featureUse, [...totals(open.days, (d) => d.requests, () => true), ...totals(open.days, (d) => d.counters, (name) => name.startsWith("use."))])}
          {list(t.errorsHeading, totals(open.days, (d) => d.counters, isErrorCounter))}
          {list(t.limitsHeading, totals(open.days, (d) => d.counters, isLimitCounter))}
        </>
      )}
      {props.children}
    </dialog>
  );
}
