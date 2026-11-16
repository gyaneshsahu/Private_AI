import { useEffect, useState } from "react";
import { z } from "zod";
import { accountRequest } from "./account-request";
import { useLang, useText } from "./i18n";
import { accountAccessText } from "./text/account";
import { accountConfirmText } from "./text/account-confirm";
import { questionText } from "./text/questions";
import { ConfirmDialog } from "./ConfirmDialog";

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
  const c = useText(accountConfirmText);
  const q = useText(questionText);
  // The question before signing out a session or removing a method (the app's dialog, not window.confirm).
  const [asking, setAsking] = useState<{ path: "revoke" | "remove"; body: object; current?: boolean; label?: string }>();
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
        className="account-access-refresh"
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
                  onClick={() => setAsking({ path: "revoke", body: { id: session.id }, current: session.current })}
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
                  onClick={() => setAsking({ path: "remove", body: { kind: method.kind, id: method.id }, label: method.label })}
                >
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {asking && (
        <ConfirmDialog
          title={asking.path === "remove" ? c.removeTitle : asking.current ? t.confirmThis : t.confirmOther}
          text={asking.path === "remove" ? t.confirmRemove(asking.label!) : c.signOutText}
          confirmLabel={asking.path === "remove" ? t.remove : q.signOut}
          cancelLabel={q.cancel}
          // The row's button is gone after a change: the refresh button.
          fallback={() => document.querySelector<HTMLElement>(".account-access-refresh")}
          onClose={(yes) => {
            setAsking(undefined);
            if (yes) void update(asking.path, asking.body);
          }}
        />
      )}
      <p aria-live="polite">
        {busy ? t.updating : loading ? t.checking : message}
      </p>
    </section>
  );
}
