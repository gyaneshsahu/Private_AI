import { useState } from "react";
import { accountRequest } from "./account-request";

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
  return (
    <section aria-label="Download your account data">
      <h2>Download your account data</h2>
      <p>
        One file with the records this service holds about your account: your
        account identity and contact email, sign-in methods (never their secret
        keys or tokens), active sessions, security notices, request and usage
        records with their published cost, billing operations and any closure
        request. It contains no conversations, documents or search text, because
        the service never holds them; use the encrypted backup under Saved for
        those.
      </p>
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
                throw new Error(body.error ?? "Export is unavailable.");
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
            .then(() => setMessage("Your account data file was downloaded."))
            .catch((error: unknown) =>
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Export could not be completed.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        Download account data
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
