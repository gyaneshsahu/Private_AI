// The plans (docs/plans-20261125.md): Free, Plus and Pro side by side, the account's own plan
// marked, and the way to another one. A paid plan goes through the checkout the server names and
// counts only once the server confirms it; coming back from the checkout opens this dialog again.
import { useEffect, useRef, useState } from "react";
import { PLANS, type PlanId, type PlansView } from "../../shared/plans";
import { containDialogFocus } from "../dialog-focus";
import { Icon } from "../Icon";
import { useLang, useText } from "../i18n";
import { plansText } from "../text/plans";
import "./plans.css";

type Loaded = PlansView & { state?: "open" | "paid" | "cancelled" };
// The answer to "what became of the checkout", asked once per return. An effect can run again while
// the dialog is open (React hides and shows it when another part of the page loads), and the id is
// already out of the address then.
let returned: Promise<Loaded> | undefined;

export function PlansDialog(props: { csrf: string; onClose(): void }) {
  const t = useText(plansText);
  const { lang } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<PlansView>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const call = (path: string, body?: unknown) =>
    fetch(path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      headers: { "X-PrivateAI-CSRF": props.csrf, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
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
    let active = true;
    void (async () => {
      try {
        // Back from a checkout: ask the server what became of it, and take the id out of the address.
        const url = new URL(location.href);
        const checkout = url.searchParams.get("plan-checkout");
        if (checkout) {
          url.searchParams.delete("plan-checkout");
          history.replaceState(history.state, "", url);
        }
        const load = async (path: string, body?: unknown) => {
          const response = await call(path, body);
          if (!response.ok) throw Error("failed");
          return (await response.json()) as Loaded;
        };
        // An unknown checkout id is no reason to show nothing: the plans load without it.
        if (checkout) returned = load("/api/plans/confirm", { checkout }).catch(() => load("/api/plans"));
        const body = await (returned ?? load("/api/plans"));
        if (!active) return;
        setView({ current: body.current, checkout: body.checkout });
        if (body.state === "paid") setNote(t.paid(PLANS.find((p) => p.id === body.current)!.name));
        else if (body.state === "cancelled") setNote(t.cancelled);
        else if (body.state === "open") setNote(t.pending);
      } catch {
        if (active) setNote(t.failed);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function choose(plan: PlanId) {
    if (busy) return;
    setBusy(true);
    try {
      if (plan === "free") {
        const response = await call("/api/plans/change", { plan });
        if (!response.ok) throw Error("failed");
        setView((await response.json()) as PlansView);
        setSure(false);
        setNote(t.nowFree);
      } else {
        setNote(t.opening);
        const response = await call("/api/plans/checkout", { plan });
        if (!response.ok) throw Error("failed");
        // The server names the checkout page; the browser leaves the app for it.
        location.assign(((await response.json()) as { url: string }).url);
        return;
      }
    } catch {
      setNote(plan === "free" ? t.failed : t.checkoutFailed);
    }
    setBusy(false);
  }
  const close = () => {
    returned = undefined;
    props.onClose();
  };
  const price = (minor: number) =>
    minor ? t.perMonth(new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100)) : t.freePrice;
  return (
    <dialog
      ref={dialog}
      className="plans-dialog"
      aria-label={t.title}
      onKeyDown={containDialogFocus}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{t.title}</h2>
        <button type="button" className="icon-button" aria-label={t.close} onClick={close}>
          <Icon name="close" />
        </button>
      </header>
      <p role="status" className="plans-note">
        {note || (view ? "" : t.loading)}
      </p>
      {view && (
        <ul className="plans-list">
          {PLANS.map((plan) => {
            const mine = plan.id === view.current;
            return (
              <li key={plan.id} className={mine ? "plan mine" : "plan"} aria-current={mine ? "true" : undefined}>
                <h3>
                  {plan.name}
                  {mine && <span className="plan-yours">{t.yours}</span>}
                </h3>
                <p className="plan-price">{price(plan.monthlyMinor)}</p>
                <p className="muted">{t[`${plan.id}For`]}</p>
                <ul>
                  {[
                    t.units(plan.limits.unitsPerWeek),
                    t.searches(plan.limits.searchesPerDay),
                    t.images(plan.limits.imagesPerDay),
                    t.research(plan.limits.researchRunsPerDay),
                    t.voice(plan.limits.voiceMinutesPerDay),
                    t.tasks(plan.limits.backgroundTasks),
                  ].map((line) => (
                    <li key={line}>
                      <Icon name="check" />
                      {line}
                    </li>
                  ))}
                </ul>
                {!mine && plan.id !== "free" && view.checkout && (
                  <button type="button" className="primary" disabled={busy} onClick={() => void choose(plan.id)}>
                    {t.choose(plan.name)}
                  </button>
                )}
                {!mine && plan.id === "free" && (
                  // Leaving a paid plan takes a second, deliberate press.
                  <button type="button" disabled={busy} onClick={() => (sure ? void choose("free") : setSure(true))}>
                    {sure ? t.toFreeSure : t.toFree}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {view && !view.checkout && <p className="muted">{t.closed}</p>}
    </dialog>
  );
}
