import { useEffect, useState } from "react";
import { z } from "zod";
import { accountRequest } from "./account-request";
import { useLang, useText } from "./i18n";
import { accountAccessText } from "./text/account";

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
  emailEnabled,
  revision,
  changed,
  verifyEmail,
}: {
  emailEnabled: boolean;
  revision: number;
  changed: () => Promise<void>;
  verifyEmail: () => void;
}) {
  const [access, setAccess] = useState<z.infer<typeof accessSchema>>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const t = useText(accountAccessText);
  const locale = useLang().lang === "de" ? "de-DE" : undefined;
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
          setMessage(t.unavailable);
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
        setMessage(t.verifyAgain);
        return;
      }
      if (response.status === 409) {
        setNeedsRefresh(true);
        setMessage(t.inProgress);
        return;
      }
      if (!response.ok) throw Error("not confirmed");
      setMessage(path === "remove" ? t.removed : t.revoked);
      await changed();
    } catch {
      setNeedsRefresh(true);
      setMessage(t.unconfirmed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label={t.heading}>
      <h2>{t.heading}</h2>
      <p className="account-preview-small">{t.sessionsNote}</p>
      <button
        disabled={busy || loading}
        onClick={() => {
          setBusy(true);
          setMessage("");
          void changed()
            .catch(() => {
              setNeedsRefresh(true);
              setMessage(t.refreshFailed);
            })
            .finally(() => setBusy(false));
        }}
      >
        {t.refresh}
      </button>
      {access && (
        <>
          <h3>{t.activeSessions}</h3>
          <ul>
            {access.sessions.map((session) => (
              <li key={session.id}>
                {session.current ? t.thisSession : t.otherSession} ·{" "}
                {new Date(session.createdAt).toLocaleString(locale)} ·{" "}
                {session.id.slice(0, 8)}
                <button
                  disabled={busy || loading || needsRefresh}
                  onClick={() => {
                    if (
                      window.confirm(
                        session.current ? t.confirmThis : t.confirmOther,
                      )
                    )
                      void update("revoke", { id: session.id });
                  }}
                >
                  {session.current
                    ? t.signOutThis
                    : t.signOutSession(session.id.slice(0, 8))}
                </button>
              </li>
            ))}
          </ul>
          <h3>{t.methods}</h3>
          {!emailEnabled && (
            <p>{t.emailDisabled}</p>
          )}
          <p>{t.removalNote}</p>
          <button
            disabled={!emailEnabled || busy || loading || needsRefresh}
            onClick={verifyEmail}
          >
            {t.verifyForRemoval}
          </button>
          <ul>
            {[
              ...access.passkeys.map((key) => ({
                id: key.id,
                kind: "passkey",
                label: key.name || t.unnamedPasskey,
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
                  disabled={!emailEnabled || busy || loading || needsRefresh}
                  aria-label={t.removeLabel(method.label)}
                  onClick={() => {
                    if (
                      window.confirm(t.confirmRemove(method.label))
                    )
                      void update("remove", {
                        kind: method.kind,
                        id: method.id,
                      });
                  }}
                >
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p aria-live="polite">
        {busy ? t.updating : loading ? t.checking : message}
      </p>
    </section>
  );
}
