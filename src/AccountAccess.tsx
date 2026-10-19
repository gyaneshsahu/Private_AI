import { useEffect, useState } from "react";
import { z } from "zod";

const accessSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
      current: z.boolean(),
    }),
  ),
  passkeys: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      createdAt: z.string().datetime().nullable(),
    }),
  ),
  providers: z.array(
    z.object({
      id: z.string().uuid(),
      providerId: z.enum(["google", "apple"]),
    }),
  ),
});

export default function AccountAccess({
  revision,
  changed,
  verifyEmail,
}: {
  revision: number;
  changed: () => Promise<void>;
  verifyEmail: () => void;
}) {
  const [access, setAccess] = useState<z.infer<typeof accessSchema>>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/account/access", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("unavailable");
        const result = accessSchema.parse(await response.json());
        if (!abort.signal.aborted) setAccess(result);
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setAccess(undefined);
          setMessage(
            "Account access is unavailable. Refresh before changing access.",
          );
        }
      });
    return () => abort.abort();
  }, [revision]);
  async function update(path: "revoke" | "remove", body: object) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/account/access/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 403 && path === "remove") {
        setMessage(
          "Verify your email again before removing a method. Each verification permits one removal for five minutes.",
        );
        return;
      }
      if (response.status === 409) {
        setMessage(
          "Another sign-in method change is in progress. Wait for it to finish, then refresh before retrying.",
        );
        return;
      }
      if (!response.ok) throw Error("not confirmed");
      setMessage(
        path === "remove"
          ? "Sign-in method removed and other sessions signed out. Email sign-in remains available; a security notice is queued. Your vault is unchanged."
          : "Session signed out. This cannot erase copies already on another device.",
      );
      await changed();
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh account access before retrying; no automatic retry was made.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Account access">
      <h2>Account access</h2>
      <p className="account-preview-small">
        Sessions show sign-in times, not verified device names. We do not retain
        device fingerprints or location. Activity times are approximate.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void changed().catch(() => setMessage("Refresh failed."))
        }
      >
        Refresh account access
      </button>
      {access && (
        <>
          <h3>Active sessions</h3>
          <ul>
            {access.sessions.map((session) => (
              <li key={session.id}>
                {session.current ? "This session" : "Other session"} ·{" "}
                {new Date(session.createdAt).toLocaleString()} ·{" "}
                {session.id.slice(0, 8)}
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        session.current
                          ? "Sign out this session?"
                          : "Sign out this other session?",
                      )
                    )
                      void update("revoke", { id: session.id });
                  }}
                >
                  {session.current
                    ? "Sign out this session"
                    : `Sign out session ${session.id.slice(0, 8)}`}
                </button>
              </li>
            ))}
          </ul>
          <h3>Sign-in methods</h3>
          <p>
            Email remains available. Removal requires a new email-code sign-in
            and signs out other sessions. Removing a provider here does not
            revoke its permissions on the provider's website.
          </p>
          <button disabled={busy} onClick={verifyEmail}>
            Verify email for removal
          </button>
          <ul>
            {[
              ...access.passkeys.map((key) => ({
                id: key.id,
                kind: "passkey",
                label: key.name || "Unnamed passkey",
              })),
              ...access.providers.map((provider) => ({
                id: provider.id,
                kind: "provider",
                label: provider.providerId === "google" ? "Google" : "Apple",
              })),
            ].map((method) => (
              <li key={method.id}>
                {method.label}
                <button
                  disabled={busy}
                  aria-label={`Remove ${method.label}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${method.label} from PrivateAI and sign out other sessions? Your email sign-in and encrypted vault stay unchanged.`,
                      )
                    )
                      void update("remove", {
                        kind: method.kind,
                        id: method.id,
                      });
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p aria-live="polite">{busy ? "Updating account access…" : message}</p>
    </section>
  );
}
