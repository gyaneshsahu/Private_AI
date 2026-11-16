import { useState } from "react";
import { accountRequest } from "./account-request";
import { useText } from "./i18n";
import { accountDeletionText } from "./text/account";

export default function AccountDeletion({
  emailEnabled,
  closed,
  synthetic = true,
  purgeDays,
}: {
  emailEnabled: boolean;
  closed: () => Promise<void>;
  synthetic?: boolean;
  /** Days until a closed account is deleted (status.accountPurge); absent while the purge is off. */
  purgeDays?: number;
}) {
  const t = useText(accountDeletionText);
  // The phrase in the page's language; the server accepts the English and the German one.
  const phrase = synthetic ? t.phraseTest : t.phrase;
  const title = synthetic ? t.titleTest : t.titleClose;
  const [confirmation, setConfirmation] = useState("");
  // "Ö" may arrive decomposed (some keyboards): compare and send the composed form.
  const typed = confirmation.trim().normalize("NFC");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>{t.intro}</p>
      <p className="account-preview-small">{t.retention(purgeDays)}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!emailEnabled || busy || uncertain || typed !== phrase)
            return;
          setBusy(true);
          setMessage("");
          void (async () => {
            try {
              const response = await accountRequest(
                "/api/account/close",
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ confirmation: typed }),
                },
                async (response) => {
                  await response.body?.cancel();
                  return response;
                },
              );
              if (response.status === 403) {
                setMessage(t.reauth);
                return;
              }
              if (response.status === 409) {
                setUncertain(true);
                setMessage(t.inProgress);
                return;
              }
              if (!response.ok) throw Error("unconfirmed");
              await closed();
            } catch {
              setUncertain(true);
              setMessage(t.unconfirmed);
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <label htmlFor="close-account-confirmation">
          {t.typeToConfirm(phrase)}
        </label>
        <input
          id="close-account-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          disabled={!emailEnabled || busy || uncertain}
        />
        <button
          type="submit"
          disabled={
            !emailEnabled || busy || uncertain || typed !== phrase
          }
        >
          {synthetic ? t.closeTest : t.close}
        </button>
      </form>
      {uncertain && (
        <button onClick={() => window.location.reload()}>
          {t.reload}
        </button>
      )}
      <p aria-live="polite">{busy ? t.closing : message}</p>
    </section>
  );
}
