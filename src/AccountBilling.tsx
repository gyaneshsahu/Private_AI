import { billingRequest } from "./billing-request";
import { useEffect, useState } from "react";
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
  async function refresh(signal?: AbortSignal) {
    const next = await billingRequest(
      "/api/billing/overview",
      { signal },
      async (response) => {
        if (!response.ok)
          throw Error("Billing status unavailable. Refresh before continuing.");
        return billingOverviewSchema.parse(await response.json());
      },
    );
    if (!signal?.aborted) setOverview(next);
  }
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setNotice("Billing status unavailable. Refresh before continuing.");
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
                ? result.error
                : "Billing could not be confirmed.",
            );
          if (result.url) onNavigate(hostedBillingUrl(result.url, kind));
          else
            setNotice(
              typeof result.message === "string"
                ? result.message
                : "Refresh status to check the result.",
            );
        },
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Billing could not complete. No automatic retry was made.",
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
    <section className="panel" aria-label="Subscription rehearsal">
      <h3>Subscription rehearsal</h3>
      <p>
        This is a synthetic billing test. No real payment is collected and no
        chat access is granted.
      </p>
      {returned && (
        <p role="status">
          {returned === "cancel"
            ? "You returned without completing checkout. An existing checkout may still be open."
            : "You returned from billing. A return link does not confirm payment or activate access."}
        </p>
      )}
      <p>
        Opening checkout or billing management sends you to Stripe. PrivateAI
        does not receive card details or send conversation content to billing.
      </p>
      {overview?.plans.map((plan) => (
        <div key={plan.id}>
          <h4>{plan.name}</h4>
          <p>
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: plan.currency,
            }).format(plan.amountMinor / 100)}{" "}
            / {plan.interval} — synthetic price only; not a launch offer.
          </p>
          <button
            disabled={blocked || !!hold}
            onClick={() => void act("checkout", plan.id)}
          >
            {overview.checkout === "ready"
              ? "Continue or check checkout"
              : "Open test checkout"}
          </button>
        </div>
      ))}
      {hold && (
        <p role="status">
          A billing operation needs verification. Another checkout will not be
          sent. Contact support before trying again.
        </p>
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
        Manage test billing
      </button>
      <button
        disabled={busy || working}
        onClick={() => {
          setWorking(true);
          void refresh()
            .then(() =>
              setNotice("Status refreshed. Paid access remains disabled."),
            )
            .catch(() => {
              setOverview(undefined);
              setNotice("Billing status unavailable.");
            })
            .finally(() => setWorking(false));
        }}
      >
        Refresh billing status
      </button>
      {notice && <p role="status">{notice}</p>}
      {working && <p role="status">Checking billing…</p>}
      <p>
        Request allowance and provider privacy approval are separate from
        billing. Cancellation and refunds follow the reviewed provider
        configuration; no such policy is active here.
      </p>
    </section>
  );
}
