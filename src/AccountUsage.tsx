import type { RequestAllowance } from "../shared/contracts";

export function AccountUsage({
  allowance,
  consumer,
  busy,
  onManage,
}: {
  allowance?: RequestAllowance;
  consumer?: boolean;
  busy?: boolean;
  onManage?: () => void;
}) {
  return (
    <section className="content-view" aria-label="Account and usage">
      <h2>Account and usage</h2>
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
      {!allowance || allowance.state === "unavailable" ? (
        <p role="status">
          No request allowance is available to display. Paid subscriptions are
          not enabled.
        </p>
      ) : (
        <div className="panel">
          <h3>{allowance.remaining} requests remaining</h3>
          <p>
            {allowance.used} of {allowance.limit} requests reserved or attempted
            in this period.
          </p>
          <p>
            Period ends:{" "}
            <time dateTime={allowance.resetsAt}>
              {new Date(allowance.resetsAt).toLocaleString()}
            </time>
            . A new allowance is not guaranteed.
          </p>
          <p>
            {allowance.pending} pending or interrupted before settlement;{" "}
            {allowance.uncertain} with an uncertain transport outcome.
          </p>
          {allowance.state === "exhausted" && (
            <p role="status">
              Request allowance exhausted. Another request will not be forwarded
              under this allowance.
            </p>
          )}
          <p className="muted">
            These are request counts, not token charges or completed-answer
            counts. Interrupted attempts remain counted. Account information
            refreshes when you return to this window and every 30 seconds.
          </p>
        </div>
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
