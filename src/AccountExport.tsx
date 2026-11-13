import { useState } from "react";
import { accountRequest } from "./account-request";
import { useLang } from "./i18n";
import { accountExportText } from "./text/account";
import { serverMessage } from "./server-messages";

/**
 * Downloads everything the service holds about the signed-in account as one
 * JSON file: identity, sign-in methods without secrets, sessions, security
 * notices, usage and cost records, billing operations and closure state.
 * Conversations are never held by the service; their export is the encrypted
 * vault backup on this device.
 */
export default function AccountExport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { lang } = useLang();
  const t = accountExportText[lang];
  return (
    <section aria-label={t.heading}>
      <h2>{t.heading}</h2>
      <p>{t.body}</p>
      <button
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setMessage("");
          void accountRequest(
            "/api/account/export",
            { method: "GET" },
            async (response) => {
              if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as {
                  error?: string;
                };
                throw new Error(
                  body.error ? serverMessage(body.error, lang) : t.unavailable,
                );
              }
              const text = await response.text();
              const blob = new Blob([text], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `cometrow-account-data-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.append(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
              return undefined;
            },
          )
            .then(() => setMessage(t.downloaded))
            .catch((error: unknown) =>
              setMessage(
                error instanceof Error ? error.message : t.failed,
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        {t.button}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
