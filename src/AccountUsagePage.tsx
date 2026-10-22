import type { RequestAllowance } from "../shared/contracts";
import { AccountBilling } from "./AccountBilling";
import {
  costBasisSentence,
  isActiveAllowance,
  meteredTokensSentence,
  noActivePlanMessage,
  periodEndLabel,
  publishedCostSentence,
  requestsRemainingHeading,
  requestsUsedSentence,
  settlementSentence,
  unmeteredSentence,
  type ActiveAllowance,
} from "./account-usage-format";

/** Request counts for the current period: the admission unit, not a bill. */
function PlanAllowance({ allowance }: { allowance: ActiveAllowance }) {
  return (
    <div className="panel" aria-label="Plan and requests">
      <h3>{requestsRemainingHeading(allowance)}</h3>
      <p>{requestsUsedSentence(allowance)}</p>
      <p>
        Period ends:{" "}
        <time dateTime={allowance.resetsAt}>{periodEndLabel(allowance)}</time>.
        A new allowance is not guaranteed.
      </p>
      <p>{settlementSentence(allowance)}</p>
      {allowance.state === "exhausted" && (
        <p role="status">
          Request allowance exhausted. Another request will not be forwarded
          under this allowance.
        </p>
      )}
      <p className="muted">
        Request counts are the admission unit, not token charges or
        completed-answer counts. Interrupted attempts remain counted. Account
        information refreshes when you return to this window and every 30
        seconds.
      </p>
    </div>
  );
}

/** Provider metering recorded for completed requests only. */
function MeteredUsage({ allowance }: { allowance: ActiveAllowance }) {
  return (
    <div className="panel" aria-label="Tokens and cost">
      <h3>Tokens and cost this period</h3>
      <p>{meteredTokensSentence(allowance)}</p>
      <p>{publishedCostSentence(allowance)}</p>
      <p>{unmeteredSentence(allowance)}</p>
      <p className="muted">{costBasisSentence}</p>
    </div>
  );
}

function NoActivePlan() {
  return (
    <p role="status">
      {noActivePlanMessage} Paid subscriptions are not enabled.
    </p>
  );
}

export function AccountUsagePage({
  allowance,
  consumer,
  busy,
  onManage,
  billing,
}: {
  allowance?: RequestAllowance;
  consumer?: boolean;
  busy?: boolean;
  onManage?: () => void;
  billing?: { csrf: string; onNavigate: (url: string) => void };
}) {
  return (
    <section className="content-view" aria-label="Account and usage">
      <h2>Account and usage</h2>
      {billing && (
        <AccountBilling
          csrf={billing.csrf}
          busy={!!busy}
          onNavigate={billing.onNavigate}
        />
      )}
      {consumer && (
        <div className="panel">
          <p>
            Manage your sign-in methods and account access. Paid subscriptions
            are not enabled.
          </p>
          <button disabled={busy} onClick={onManage}>
            Manage sign-in methods
          </button>
        </div>
      )}
      {isActiveAllowance(allowance) ? (
        <>
          <PlanAllowance allowance={allowance} />
          <MeteredUsage allowance={allowance} />
        </>
      ) : (
        <NoActivePlan />
      )}
      <p>
        Saved conversation encryption is separate from sign-in. Your vault
        passphrase cannot currently be recovered; saved history stays in this
        browser.
      </p>
      <p className="muted">
        Provider qualification is still required before private chat is
        available. An allowance does not approve a provider or guarantee an
        answer.
      </p>
    </section>
  );
}
