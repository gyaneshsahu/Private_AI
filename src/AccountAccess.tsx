import { useEffect, useState } from "react";
import { z } from "zod";
import { accountRequest } from "./account-request";

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
  const [loading, setLoading] = useState(true);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setAccess(undefined);
    accountRequest(
      "/api/account/access",
      { signal: abort.signal },
      async (response) => {
        if (!response.ok) throw Error("unavailable");
        return accessSchema.parse(await response.json());
      },
    )
      .then((result) => {
        if (!abort.signal.aborted) {
          setAccess(result);
          setNeedsRefresh(false);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setAccess(undefined);
          setMessage(
            "Account access is unavailable. Refresh before changing access.",
          );
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);
  async function update(path: "revoke" | "remove", body: object) {
    if (busy || loading || needsRefresh) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await accountRequest(
        `/api/account/access/${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        async (response) => {
          await response.body?.cancel();
          return response;
        },
      );
      if (response.status === 403 && path === "remove") {
        setMessage(
          "Verify your email again before removing a method. Each verification permits one removal for five minutes.",
        );
        return;
      }
      if (response.status === 409) {
        setNeedsRefresh(true);
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
      setNeedsRefresh(true);
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
        disabled={busy || loading}
        onClick={() => {
          setBusy(true);
          setMessage("");
          void changed()
            .catch(() => {
              setNeedsRefresh(true);
              setMessage(
                "Refresh failed. Account changes remain unavailable until status can be checked.",
              );
            })
            .finally(() => setBusy(false));
        }}
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
                  disabled={busy || loading || needsRefresh}
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
            Removal requires working email delivery and a new email-code sign-in
            and signs out other sessions. Removing a provider here does not
            revoke its permissions on the provider's website.
          </p>
          <button
            disabled={busy || loading || needsRefresh}
            onClick={verifyEmail}
          >
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
                  disabled={busy || loading || needsRefresh}
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
      <p aria-live="polite">
        {busy
          ? "Updating account access…"
          : loading
            ? "Checking account access…"
            : message}
      </p>
    </section>
  );
}
