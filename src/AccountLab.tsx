import { SignInIcon } from "./SignInIcon";
import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import "./account-preview.css";
import AccountAccess from "./AccountAccess";
import AccountDeletion from "./AccountDeletion";
import { SupportPanel } from "./SupportPanel";
import { accountRequest } from "./account-request";
import { createPasskeyTransport } from "./passkey-transport";

const sessionSchema = z
  .object({ user: z.object({ id: z.string(), email: z.string() }) })
  .nullable();
const providerSchema = z.enum(["google", "apple"]);
type Provider = z.infer<typeof providerSchema>;
const optionsSchema = z.object({
  synthetic: z.boolean(),
  socialProviders: z.array(providerSchema),
  workspaceEnabled: z.boolean().optional(),
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
const noticeLabels = {
  pending: "Queued; not submitted",
  dispatching: "Submission started; result not confirmed",
  accepted: "Submission accepted; inbox delivery not verified",
  uncertain: "Submission uncertain; review required before any resend",
  blocked: "Submission blocked; review required",
  sent: "Historical sent marker; inbox delivery not verified",
};
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
  const [workspaceEnabled, setWorkspaceEnabled] = useState(false);
  const [accessRevision, setAccessRevision] = useState(0);
  const [notices, setNotices] = useState<
    z.infer<typeof noticesSchema>["notices"]
  >([]);
  const codeInput = useRef<HTMLInputElement>(null);
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
      setNotice(
        "Provider sign-in or linking did not complete. Your existing sign-in methods are unchanged.",
      );
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
        setWorkspaceEnabled(options.workspaceEnabled === true);
        await refresh();
        setReady(true);
      })
      .catch(() => {
        setReady(false);
        setProviders([]);
        setNotice(
          synthetic
            ? "The synthetic account service is not running here."
            : "Account sign-in is not available here yet. No information has been submitted.",
        );
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
        setNotice(
          "The sign-in or account-change result is unconfirmed. Check sign-in status before trying another action. No automatic retry was made.",
        );
        return;
      }
      setNotice(
        error instanceof Error && error.message === "service-not-admitted"
          ? "Account service is temporarily unavailable. This action was not started. Try again later; no automatic retry was made."
          : error instanceof Error && error.message === "delivery-unconfirmed"
            ? "Code delivery could not be confirmed. If a delayed code arrives, enter it below. Wait before requesting another code; no automatic retry was made."
            : error instanceof Error &&
                error.message === "passkey-options-unavailable"
              ? "Passkey preparation is unavailable. No verification was submitted. Try again later or use email."
              : error instanceof Error &&
                  error.message === "passkey-not-completed"
                ? "Passkey verification did not complete. You can try again or use email. No automatic retry was made."
                : "This action could not complete. Check the code or use another sign-in method. No automatic retry was made.",
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
        Private<span>AI</span>
      </a>
      <aside className="account-preview-banner">
        {synthetic
          ? "Synthetic account lab · .test addresses only. No real email, provider login or private chat."
          : "Early access preparation · Private chat is not available."}
      </aside>
      <section
        className={`account-preview-card ${!session ? "account-entry" : ""}`}
      >
        {!session && !synthetic && (
          <a
            href="/"
            className="account-entry-close"
            aria-label="Close sign-in"
          >
            ×
          </a>
        )}
        <h1>
          {session
            ? synthetic
              ? "Your test account"
              : "Your account"
            : synthetic
              ? "Sign in to the account lab"
              : "Log in or sign up"}
        </h1>
        <p className="account-preview-intro">
          {session
            ? "Sign-in access is separate from your encrypted vault."
            : "Chat, explore ideas and work with your files."}
        </p>
        {session ? (
          <div className="account-preview-actions">
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            {workspaceEnabled && (
              <a href="/">
                {synthetic ? "Open test workspace" : "Open workspace"}
              </a>
            )}
            {providers.map((provider) => (
              <button
                key={provider}
                disabled={busy || uncertain || linked.includes(provider)}
                onClick={() => action(() => social(provider, true))}
              >
                {linked.includes(provider) ? "Connected to" : "Connect"}{" "}
                {provider === "google" ? "Google" : "Apple"}
              </button>
            ))}
            <button
              disabled={busy || uncertain}
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
                    setNotice(
                      "Recovery was not confirmed. Sign in again and retry this step; do not assume other sessions were revoked.",
                    );
                    return;
                  }
                  setNotice(
                    `Sign-in recovery complete. Other sessions were signed out. Check the security-notice status below${synthetic ? "; this lab sends no real email" : ""}. Linked credentials and vault encryption are unchanged.`,
                  );
                  await refresh();
                })
              }
            >
              Finish sign-in recovery
            </button>
            <p className="account-preview-small">
              Recovery requires working email delivery. After signing in again
              with email, finish recovery to close other sessions. Use Account
              access below to remove a lost passkey or linked provider after
              verifying email.
            </p>
            {notices.length > 0 && (
              <section aria-label="Security notices">
                <h2>Security notices</h2>
                <ul>
                  {notices.map((item) => (
                    <li key={item.id}>
                      {item.kind === "credential_removed"
                        ? "Sign-in method removed"
                        : "Sign-in recovery"}{" "}
                      ·{" "}
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                      : {noticeLabels[item.deliveryState]}
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
                        ? "PrivateAI synthetic passkey"
                        : "PrivateAI passkey",
                    }),
                  );
                  setNotice(
                    synthetic ? "Test passkey added." : "Passkey added.",
                  );
                  await refresh();
                })
              }
            >
              {synthetic ? "Add test passkey" : "Add passkey"}
            </button>
            {synthetic && (
              <button
                disabled={busy || uncertain}
                onClick={() =>
                  action(async () => {
                    await post("revoke-other-sessions", {});
                    setNotice("Other test sessions revoked.");
                    await refresh();
                  })
                }
              >
                Sign out other test sessions
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
                  setNotice("Signed out.");
                })
              }
            >
              Sign out
            </button>
            <AccountDeletion
              synthetic={synthetic}
              closed={async () => {
                await refresh();
                setCode("");
                setSent(false);
                setNotice(
                  `${synthetic ? "Test account" : "Account"} closed; all sessions were signed out. Credential purge is not scheduled. Local saved history and retained usage records were not erased.`,
                );
              }}
            />
            <AccountAccess
              revision={accessRevision}
              changed={refresh}
              verifyEmail={() =>
                void action(async () => {
                  await post("sign-out", {});
                  setEmail(session.user.email);
                  setSession(null);
                  setSent(false);
                  setCode("");
                  setNotice(
                    "Sign in with an email code, then remove the affected method under Account access.",
                  );
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
                    setNotice("Use a synthetic .test email address.");
                    return;
                  }
                  await post("email-otp/send-verification-otp", {
                    email,
                    type: "sign-in",
                  });
                  setSent(true);
                  setNotice(
                    synthetic
                      ? "A test code is available in the test harness. No email was sent."
                      : "Code request accepted. Check your email; delivery may take a moment.",
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
                Continue with {provider === "google" ? "Google" : "Apple"}
                {!providers.includes(provider) && <small>Coming soon</small>}
              </button>
            ))}
            <div className="account-preview-divider">OR</div>
            <label className="sr-only" htmlFor="lab-email">
              {synthetic ? "Test email address" : "Email address"}
            </label>
            <input
              id="lab-email"
              placeholder="Email address"
              type="email"
              required
              readOnly={sent}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete={synthetic ? "off" : "email"}
              disabled={!ready || busy || uncertain}
            />
            {sent && (
              <>
                <label htmlFor="lab-code">Verification code</label>
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
              disabled={busy || uncertain || !ready}
              type="submit"
            >
              {sent
                ? synthetic
                  ? "Verify test code"
                  : "Verify code"
                : synthetic
                  ? "Send test code"
                  : "Continue with email"}
            </button>
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
                Use another email
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
                setNotice(
                  "Sign-in status checked. Review the account shown before continuing; this check does not prove whether an email was delivered or a provider change completed.",
                );
              } catch {
                setNotice(
                  "Sign-in status is still unavailable. Keep this page open and check again later; no action was replayed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Check sign-in status
          </button>
        )}
        <p role="status" className="account-preview-notice">
          {busy ? "Working…" : notice}
        </p>
      </section>
      <div className="account-entry-extras">
        {!session && synthetic && (
          <details open={synthetic}>
            <summary>Use a passkey</summary>{" "}
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
              {synthetic
                ? "Sign in with a test passkey"
                : "Sign in with a passkey"}
            </button>
          </details>
        )}
        <details className="account-preview-privacy">
          <summary>Privacy and account recovery</summary>
          <p className="account-preview-small">
            {synthetic
              ? "Social buttons, when available, use synthetic provider fixtures only. "
              : ""}
            PrivateAI stores your email address, provider identifiers, passkey
            public credentials and session records. Email sign-in requires an
            email-delivery provider. Social sign-in, when enabled, shares your
            verified email and provider identity with PrivateAI; the provider
            learns that you signed in here. No chat content is part of sign-in.
            Recovering sign-in cannot recover a lost vault passphrase.
            Private-data chat remains unavailable.
          </p>
        </details>
        <details>
          <summary>Help with sign-in or reporting a problem</summary>
          <SupportPanel initialArea="account" />
        </details>
      </div>
    </main>
  );
}
