import { useState } from "react";
import { accountRequest } from "./account-request";

export default function AccountDeletion({
  closed,
  synthetic = true,
}: {
  closed: () => Promise<void>;
  synthetic?: boolean;
}) {
  const phrase = synthetic ? "DELETE TEST ACCOUNT" : "DELETE ACCOUNT";
  const title = synthetic ? "Delete test account" : "Close account";
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>
        This closes account access and signs out every session. Verify your
        email again first. Account reopening is not available.
      </p>
      <p className="account-preview-small">
        Credential deletion is prepared for a seven-day retention period, but no
        automatic purge or backup deletion is active. Usage records remain for
        reconciliation. Saved conversations in this browser, other devices,
        exports and provider records are not erased here. Delete local snapshots
        in Saved before closing the account. No real subscription is connected
        here yet.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || uncertain || confirmation !== phrase) return;
          setBusy(true);
          setMessage("");
          void (async () => {
            try {
              const response = await accountRequest(
                "/api/account/close",
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ confirmation }),
                },
                async (response) => {
                  await response.body?.cancel();
                  return response;
                },
              );
              if (response.status === 403) {
                setMessage(
                  "Sign out and sign in with a new email code before closing the account.",
                );
                return;
              }
              if (response.status === 409) {
                setUncertain(true);
                setMessage(
                  "Another account change is in progress. Refresh before retrying.",
                );
                return;
              }
              if (!response.ok) throw Error("unconfirmed");
              await closed();
            } catch {
              setUncertain(true);
              setMessage(
                "Closure could not be confirmed. Check account access before retrying. No automatic retry was made.",
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <label htmlFor="close-account-confirmation">
          Type {phrase} to confirm
        </label>
        <input
          id="close-account-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          disabled={busy || uncertain}
        />
        <button
          type="submit"
          disabled={busy || uncertain || confirmation !== phrase}
        >
          {synthetic ? "Close test account" : "Close account"}
        </button>
      </form>
      {uncertain && (
        <button onClick={() => window.location.reload()}>
          Reload account status
        </button>
      )}
      <p aria-live="polite">{busy ? "Closing account…" : message}</p>
    </section>
  );
}
