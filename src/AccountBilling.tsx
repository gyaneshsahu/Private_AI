import { billingRequest } from "./billing-request";
import { useEffect, useState } from "react";
import { useLang } from "./i18n";
import { billingText } from "./text/account";
import { serverMessage } from "./server-messages";
import {
  billingOverviewSchema,
  hostedBillingUrl,
  type BillingOverview,
} from "../shared/billing";

export function AccountBilling({
  csrf,
  busy,
  onNavigate,
}: {
  csrf: string;
  busy: boolean;
  onNavigate: (url: string) => void;
}) {
  const [overview, setOverview] = useState<BillingOverview>();
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const { lang } = useLang();
  const t = billingText[lang];
  async function refresh(signal?: AbortSignal) {
    const next = await billingRequest(
      "/api/billing/overview",
      { signal },
      async (response) => {
        if (!response.ok)
          throw Error(t.statusUnavailableRefresh);
        return billingOverviewSchema.parse(await response.json());
      },
    );
    if (!signal?.aborted) setOverview(next);
  }
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setNotice(t.statusUnavailableRefresh);
    });
    return () => controller.abort();
  }, [csrf]);
  async function act(kind: "checkout" | "portal", planId?: string) {
    setWorking(true);
    setNotice("");
    try {
      await billingRequest(
        `/api/billing/${kind}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PrivateAI-CSRF": csrf,
          },
          body: JSON.stringify(planId ? { planId } : {}),
          cache: "no-store",
        },
        async (response) => {
          const result = await response.json();
          if (!response.ok)
            throw Error(
              typeof result.error === "string"
                ? serverMessage(result.error, lang)
                : t.notConfirmed,
            );
          if (result.url) onNavigate(hostedBillingUrl(result.url, kind));
          else
            setNotice(
              typeof result.message === "string"
                ? serverMessage(result.message, lang)
                : t.refreshToCheck,
            );
        },
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? serverMessage(error.message, lang) : t.notComplete,
      );
    } finally {
      await refresh().catch(() => setOverview(undefined));
      setWorking(false);
    }
  }
  const blocked = busy || working || !overview;
  const hold =
    overview &&
    (overview.reviewRequired ||
      [overview.checkout, overview.customer].some(
        (state) => state === "submitted" || state === "uncertain",
      ));
  const returned = new URLSearchParams(location.search).get("billing");
  return (
    <section className="panel" aria-label={t.heading}>
      <h3>{t.heading}</h3>
      <p>{t.intro}</p>
      {returned && (
        <p role="status">
          {returned === "cancel" ? t.returnedCancel : t.returned}
        </p>
      )}
      <p>{t.stripe}</p>
      {overview?.plans.map((plan) => (
        <div key={plan.id}>
          <h4>{plan.name}</h4>
          <p>
            {t.price(
              new Intl.NumberFormat(lang === "de" ? "de-DE" : undefined, {
                style: "currency",
                currency: plan.currency,
              }).format(plan.amountMinor / 100),
              plan.interval,
            )}
          </p>
          <button
            disabled={blocked || !!hold}
            onClick={() => void act("checkout", plan.id)}
          >
            {overview.checkout === "ready" ? t.continueCheckout : t.openCheckout}
          </button>
        </div>
      ))}
      {hold && (
        <p role="status">{t.hold}</p>
      )}
      <button
        disabled={
          blocked ||
          !overview?.customerBound ||
          overview?.portal === "submitted" ||
          overview?.portal === "uncertain"
        }
        onClick={() => void act("portal")}
      >
        {t.manage}
      </button>
      <button
        disabled={busy || working}
        onClick={() => {
          setWorking(true);
          void refresh()
            .then(() =>
              setNotice(t.refreshed),
            )
            .catch(() => {
              setOverview(undefined);
              setNotice(t.unavailable);
            })
            .finally(() => setWorking(false));
        }}
      >
        {t.refresh}
      </button>
      {notice && <p role="status">{notice}</p>}
      {working && <p role="status">{t.checking}</p>}
      <p>{t.separate}</p>
    </section>
  );
}
