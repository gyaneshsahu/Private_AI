import { SignInIcon } from "./SignInIcon";
import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import "./account-preview.css";
import AccountAccess from "./AccountAccess";
import AccountDeletion from "./AccountDeletion";
import AccountExport from "./AccountExport";
import { SupportPanel } from "./SupportPanel";
import { accountRequest } from "./account-request";
import { createPasskeyTransport } from "./passkey-transport";
import { useLang, useText } from "./i18n";
import { accountLabText } from "./text/account";

const sessionSchema = z
  .object({ user: z.object({ id: z.string(), email: z.string() }) })
  .nullable();
const providerSchema = z.enum(["google", "apple"]);
type Provider = z.infer<typeof providerSchema>;
const optionsSchema = z.object({
  synthetic: z.boolean(),
  socialProviders: z.array(providerSchema),
  workspaceEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});
const accountsSchema = z.object({
  providers: z.array(z.object({ providerId: z.string() })),
});
const noticesSchema = z.object({
  notices: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.enum(["sign_in_recovery", "credential_removed"]),
      createdAt: z.string().datetime(),
      deliveryState: z.enum([
        "pending",
        "dispatching",
        "accepted",
        "uncertain",
        "blocked",
        "sent",
      ]),
    }),
  ),
});
const noticeKeys = {
  pending: "noticePending",
  dispatching: "noticeDispatching",
  accepted: "noticeAccepted",
  uncertain: "noticeUncertain",
  blocked: "noticeBlocked",
  sent: "noticeSent",
} as const;
const passkeyTransport = createPasskeyTransport(window.location.origin);
const client = createAuthClient({
  baseURL: window.location.origin,
  plugins: [passkeyClient()],
  fetchOptions: { customFetchImpl: passkeyTransport.fetch, retry: 0 },
});

/** Shared screen; the production candidate backend remains unmounted. */
export default function AccountLab({
  synthetic = true,
}: {
  synthetic?: boolean;
}) {
  const [session, setSession] = useState<z.infer<typeof sessionSchema>>(null);
  const [email, setEmail] = useState(synthetic ? "alice@example.test" : "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [workspaceEnabled, setWorkspaceEnabled] = useState(false);
  const [accessRevision, setAccessRevision] = useState(0);
  const [notices, setNotices] = useState<
    z.infer<typeof noticesSchema>["notices"]
  >([]);
  const codeInput = useRef<HTMLInputElement>(null);
  const t = useText(accountLabText);
  const locale = useLang().lang === "de" ? "de-DE" : undefined;
  async function refresh() {
    try {
      const current = await accountRequest(
        "/api/auth/get-session",
        {},
        async (response) => {
          if (!response.ok) throw Error("unavailable");
          return sessionSchema.parse(await response.json());
        },
      );
      setSession(current);
      if (current) {
        const accounts = await accountRequest(
          "/api/account/access",
          {},
          async (response) => {
            if (!response.ok) throw Error("account list unavailable");
            return accountsSchema.parse(await response.json());
          },
        );
        setLinked(accounts.providers.map((account) => account.providerId));
        const notices = await accountRequest(
          "/api/account/security-notices",
          {},
          async (response) => {
            if (!response.ok) throw Error("security notices unavailable");
            return noticesSchema.parse(await response.json()).notices;
          },
        );
        setNotices(notices);
        setAccessRevision((value) => value + 1);
      } else {
        setLinked([]);
        setNotices([]);
      }
    } catch {
      throw Error("outcome-unconfirmed");
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("error")) {
      setNotice(t.providerFailed);
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      window.history.replaceState(null, "", url);
    }
    accountRequest("/api/account/options", {}, async (response) => {
      if (!response.ok) throw Error("unavailable");
      return optionsSchema.parse(await response.json());
    })
      .then(async (options) => {
        if (options.synthetic !== synthetic)
          throw Error("Account mode mismatch");
        setProviders(options.socialProviders);
        setEmailEnabled(options.emailEnabled === true);
        setWorkspaceEnabled(options.workspaceEnabled === true);
        await refresh();
        setReady(true);
      })
      .catch(() => {
        setReady(false);
        setProviders([]);
        setNotice(synthetic ? t.syntheticNotRunning : t.signInUnavailable);
      });
  }, [synthetic]);
  useEffect(() => {
    if (sent) codeInput.current?.focus();
  }, [sent]);
  async function action(run: () => Promise<void>) {
    if (!ready || busy || uncertain) return;
    setBusy(true);
    setNotice("");
    try {
      await run();
    } catch (error) {
      if (error instanceof Error && error.message === "outcome-unconfirmed") {
        setUncertain(true);
        setCode("");
        setNotice(t.unconfirmed);
        return;
      }
      setNotice(
        error instanceof Error && error.message === "service-not-admitted"
          ? t.notAdmitted
          : error instanceof Error && error.message === "delivery-unconfirmed"
            ? t.deliveryUnconfirmed
            : error instanceof Error &&
                error.message === "passkey-options-unavailable"
              ? t.passkeyOptions
              : error instanceof Error &&
                  error.message === "passkey-not-completed"
                ? t.passkeyNotCompleted
                : t.actionFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  async function passkey(
    run: () => Promise<{ data: unknown; error: unknown }>,
  ) {
    passkeyTransport.reset();
    const result = await run().catch(() => ({ data: null, error: true }));
    if (passkeyTransport.failure() === "verification")
      throw Error("outcome-unconfirmed");
    if (passkeyTransport.failure() === "options")
      throw Error("passkey-options-unavailable");
    if (result.error || !result.data) throw Error("passkey-not-completed");
  }
  async function post(path: string, body: object) {
    let result: { status: number; ok: boolean; notAdmitted: boolean };
    try {
      result = await accountRequest(
        `/api/auth/${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        async (response) => {
          const data: unknown =
            response.status === 503 ? await response.json() : null;
          if (response.status !== 503) await response.body?.cancel();
          return {
            status: response.status,
            ok: response.ok,
            notAdmitted: z
              .object({ code: z.literal("SERVICE_NOT_ADMITTED") })
              .safeParse(data).success,
          };
        },
      );
    } catch {
      if (path === "email-otp/send-verification-otp") {
        setSent(true);
        throw Error("delivery-unconfirmed");
      }
      throw Error("outcome-unconfirmed");
    }
    if (result.notAdmitted) throw Error("service-not-admitted");
    if (!result.ok) {
      if (path === "email-otp/send-verification-otp" && result.status >= 500) {
        setSent(true);
        throw Error("delivery-unconfirmed");
      }
      throw Error(
        result.status >= 500 ? "outcome-unconfirmed" : "not completed",
      );
    }
  }
  async function social(provider: Provider, link = false) {
    const callbackURL = `${window.location.origin}${synthetic ? "/?account-lab=1" : "/account"}`;
    const result = await accountRequest(
      `/api/auth/${link ? "link-social" : "sign-in/social"}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          callbackURL,
          errorCallbackURL: callbackURL,
          disableRedirect: true,
        }),
      },
      async (response) => {
        if (!response.ok) throw Error("provider unavailable");
        return z.object({ url: z.string().url() }).parse(await response.json());
      },
    ).catch(() => {
      throw Error("outcome-unconfirmed");
    });
    const target = new URL(result.url);
    if (
      target.origin !==
      (provider === "google"
        ? "https://accounts.google.com"
        : "https://appleid.apple.com")
    )
      throw Error("unrecognized provider redirect");
    window.location.assign(target.href);
  }
  return (
    <main
      className={`account-preview ${!session && !synthetic ? "account-login-page" : ""}`}
    >
      <a className="account-preview-brand" href="/">
        Comet<span>Row</span>
      </a>
      <aside className="account-preview-banner">
        {synthetic ? t.bannerSynthetic : t.bannerEarly}
      </aside>
      <section
        className={`account-preview-card ${!session ? "account-entry" : ""}`}
      >
        {!session && !synthetic && (
          <a
            href="/"
            className="account-entry-close"
            aria-label={t.closeSignIn}
          >
            ×
          </a>
        )}
        <h1>
          {session
            ? synthetic
              ? t.headingTestAccount
              : t.headingAccount
            : synthetic
              ? t.headingLab
              : t.headingLogin}
        </h1>
        <p className="account-preview-intro">
          {session ? t.introSession : t.introLogin}
        </p>
        {session ? (
          <div className="account-preview-actions">
            <p>
              {t.signedInAs} <strong>{session.user.email}</strong>
            </p>
            {workspaceEnabled && (
              <a href="/">
                {synthetic ? t.openTestWorkspace : t.openWorkspace}
              </a>
            )}
            {providers.map((provider) => (
              <button
                key={provider}
                disabled={busy || uncertain || linked.includes(provider)}
                onClick={() => action(() => social(provider, true))}
              >
                {t.connect(
                  linked.includes(provider),
                  provider === "google" ? "Google" : "Apple",
                )}
              </button>
            ))}
            <button
              disabled={!emailEnabled || busy || uncertain}
              onClick={() =>
                action(async () => {
                  const response = await accountRequest(
                    "/api/account/recovery/complete",
                    { method: "POST" },
                    async (response) => {
                      await response.body?.cancel();
                      return response;
                    },
                  ).catch(() => {
                    throw Error("outcome-unconfirmed");
                  });
                  if (!response.ok) {
                    if (response.status >= 500)
                      throw Error("outcome-unconfirmed");
                    setNotice(t.recoveryNotConfirmed);
                    return;
                  }
                  setNotice(t.recoveryComplete(synthetic));
                  await refresh();
                })
              }
            >
              {t.finishRecovery}
            </button>
            <p className="account-preview-small">
              {t.recoveryNote}
            </p>
            {notices.length > 0 && (
              <section aria-label={t.securityNotices}>
                <h2>{t.securityNotices}</h2>
                <ul>
                  {notices.map((item) => (
                    <li key={item.id}>
                      {item.kind === "credential_removed"
                        ? t.methodRemoved
                        : t.signInRecovery}{" "}
                      ·{" "}
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString(locale)}
                      </time>
                      : {t[noticeKeys[item.deliveryState]]}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <button
              disabled={busy || uncertain}
              onClick={() =>
                action(async () => {
                  await passkey(() =>
                    client.passkey.addPasskey({
                      name: synthetic
                        ? "CometRow synthetic passkey"
                        : "CometRow passkey",
                    }),
                  );
                  setNotice(
                    synthetic ? t.testPasskeyAdded : t.passkeyAdded,
                  );
                  await refresh();
                })
              }
            >
              {synthetic ? t.addTestPasskey : t.addPasskey}
            </button>
            {synthetic && (
              <button
                disabled={busy || uncertain}
                onClick={() =>
                  action(async () => {
                    await post("revoke-other-sessions", {});
                    setNotice(t.otherTestSessionsRevoked);
                    await refresh();
                  })
                }
              >
                {t.signOutOtherTest}
              </button>
            )}
            <button
              disabled={busy || uncertain}
              onClick={() =>
                action(async () => {
                  await post("sign-out", {});
                  setSession(null);
                  setCode("");
                  setSent(false);
                  setNotice(t.signedOut);
                })
              }
            >
              {t.signOut}
            </button>
            <AccountExport />
            <AccountDeletion
              emailEnabled={emailEnabled}
              synthetic={synthetic}
              closed={async () => {
                await refresh();
                setCode("");
                setSent(false);
                setNotice(t.accountClosed(synthetic));
              }}
            />
            <AccountAccess
              emailEnabled={emailEnabled}
              revision={accessRevision}
              changed={refresh}
              verifyEmail={() =>
                void action(async () => {
                  await post("sign-out", {});
                  setEmail(session.user.email);
                  setSession(null);
                  setSent(false);
                  setCode("");
                  setNotice(t.verifyEmailNotice);
                })
              }
            />
          </div>
        ) : (
          <form
            className="account-preview-actions"
            onSubmit={(event) => {
              event.preventDefault();
              void action(async () => {
                if (!sent) {
                  if (synthetic && !/^[^\s@]+@[^\s@]+\.test$/i.test(email)) {
                    setNotice(t.useTestEmail);
                    return;
                  }
                  await post("email-otp/send-verification-otp", {
                    email,
                    type: "sign-in",
                  });
                  setSent(true);
                  setNotice(
                    synthetic ? t.testCodeAvailable : t.codeAccepted,
                  );
                } else {
                  await post("sign-in/email-otp", { email, otp: code });
                  setCode("");
                  await refresh();
                }
              });
            }}
          >
            {(synthetic
              ? (["google", "apple"] as const)
              : (["google"] as const)
            ).map((provider) => (
              <button
                key={provider}
                type="button"
                className="account-social"
                disabled={
                  !providers.includes(provider) || busy || uncertain || !ready
                }
                onClick={() => action(() => social(provider))}
              >
                <SignInIcon provider={provider} />
                {t.continueWith(provider === "google" ? "Google" : "Apple")}
                {!providers.includes(provider) && <small>{t.comingSoon}</small>}
              </button>
            ))}
            <div className="account-preview-divider">{t.or}</div>
            <label className="sr-only" htmlFor="lab-email">
              {synthetic ? t.testEmailAddress : t.emailAddress}
            </label>
            <input
              id="lab-email"
              placeholder={t.emailAddress}
              type="email"
              required
              readOnly={sent}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete={synthetic ? "off" : "email"}
              disabled={!emailEnabled || !ready || busy || uncertain}
            />
            {sent && (
              <>
                <label htmlFor="lab-code">{t.verificationCode}</label>
                <input
                  id="lab-code"
                  ref={codeInput}
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                />
              </>
            )}
            <button
              className="account-preview-primary"
              disabled={!emailEnabled || busy || uncertain || !ready}
              type="submit"
            >
              {sent
                ? synthetic
                  ? t.verifyTestCode
                  : t.verifyCode
                : synthetic
                  ? t.sendTestCode
                  : t.continueEmail}
            </button>
            {!emailEnabled && ready && (
              <p role="status">
                {t.emailUnavailable}
              </p>
            )}
            {sent && (
              <button
                disabled={busy || uncertain}
                type="button"
                onClick={() => {
                  setCode("");
                  setSent(false);
                  setNotice("");
                }}
              >
                {t.useAnotherEmail}
              </button>
            )}
          </form>
        )}
        {uncertain && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await refresh();
                setUncertain(false);
                setNotice(t.statusChecked);
              } catch {
                setNotice(t.statusUnavailable);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t.checkStatus}
          </button>
        )}
        <p role="status" className="account-preview-notice">
          {busy ? t.working : notice}
        </p>
      </section>
      <div className="account-entry-extras">
        {!session && synthetic && (
          <details open={synthetic}>
            <summary>{t.usePasskey}</summary>{" "}
            <button
              disabled={busy || uncertain || !ready}
              type="button"
              onClick={() =>
                action(async () => {
                  await passkey(() => client.signIn.passkey());
                  await refresh();
                })
              }
            >
              {synthetic ? t.signInTestPasskey : t.signInPasskey}
            </button>
          </details>
        )}
        <details className="account-preview-privacy">
          <summary>{t.privacySummary}</summary>
          <p className="account-preview-small">
            {synthetic ? t.privacySynthetic : ""}
            {t.privacyBody}
          </p>
        </details>
        <details>
          <summary>{t.helpSummary}</summary>
          <SupportPanel initialArea="account" />
        </details>
      </div>
    </main>
  );
}
