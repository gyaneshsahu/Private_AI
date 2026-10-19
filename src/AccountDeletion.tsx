import { useState } from "react";

export default function AccountDeletion({
  closed,
}: {
  closed: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section aria-label="Delete test account">
      <h2>Delete test account</h2>
      <p>
        This closes account access and signs out every session. Verify your
        email again first. This action cannot be undone in the lab.
      </p>
      <p className="account-preview-small">
        Credential deletion is prepared for a seven-day retention period, but no
        automatic purge or backup deletion is active. Usage records remain for
        reconciliation. Saved conversations in this browser, other devices,
        exports and provider records are not erased here. Delete local snapshots
        in Saved before closing the account. No real subscription is connected
        to this lab.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmation !== "DELETE TEST ACCOUNT") return;
          setBusy(true);
          setMessage("");
          void (async () => {
            try {
              const response = await fetch("/api/account/close", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ confirmation }),
              });
              if (response.status === 403) {
                setMessage(
                  "Sign out and sign in with a new email code before closing the account.",
                );
                return;
              }
              if (response.status === 409) {
                setMessage(
                  "Another account change is in progress. Refresh before retrying.",
                );
                return;
              }
              if (!response.ok) throw Error("unconfirmed");
              await closed();
            } catch {
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
          Type DELETE TEST ACCOUNT to confirm
        </label>
        <input
          id="close-account-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || confirmation !== "DELETE TEST ACCOUNT"}
        >
          Close test account
        </button>
      </form>
      <p aria-live="polite">{busy ? "Closing account…" : message}</p>
    </section>
  );
}
