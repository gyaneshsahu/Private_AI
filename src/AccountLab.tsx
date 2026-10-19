import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import "./account-preview.css";
import AccountAccess from "./AccountAccess";
import AccountDeletion from "./AccountDeletion";
import { SupportPanel } from "./SupportPanel";

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
const client = createAuthClient({
  baseURL: window.location.origin,
  plugins: [passkeyClient()],
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
    const response = await fetch("/api/auth/get-session", {
      cache: "no-store",
    });
    if (!response.ok) throw Error("unavailable");
    const current = sessionSchema.parse(await response.json());
    setSession(current);
    if (current) {
      const accounts = await fetch("/api/account/access", {
        cache: "no-store",
      });
      if (!accounts.ok) throw Error("account list unavailable");
      setLinked(
        accountsSchema
          .parse(await accounts.json())
          .providers.map((account) => account.providerId),
      );
      const response = await fetch("/api/account/security-notices", {
        cache: "no-store",
      });
      if (!response.ok) throw Error("security notices unavailable");
      setNotices(noticesSchema.parse(await response.json()).notices);
      setAccessRevision((value) => value + 1);
    } else {
      setLinked([]);
      setNotices([]);
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
    fetch("/api/account/options", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw Error("unavailable");
        const options = optionsSchema.parse(await response.json());
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
    if (!ready) return;
    setBusy(true);
    setNotice("");
    try {
      await run();
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === "service-not-admitted"
          ? "Account service is temporarily unavailable. This action was not started. Try again later; no automatic retry was made."
          : error instanceof Error && error.message === "delivery-unconfirmed"
            ? "Code delivery could not be confirmed. Wait before requesting another code; a delayed code may still arrive. No automatic retry was made."
            : "This action could not complete. Check the code or use another sign-in method. No automatic retry was made.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function post(path: string, body: object) {
    const response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      if (response.status === 503) {
        const result: unknown = await response.json().catch(() => null);
        if (
          z
            .object({ code: z.literal("SERVICE_NOT_ADMITTED") })
            .safeParse(result).success
        )
          throw Error("service-not-admitted");
      }
      throw Error(
        path === "email-otp/send-verification-otp" && response.status === 503
          ? "delivery-unconfirmed"
          : "not completed",
      );
    }
  }
  async function social(provider: Provider, link = false) {
    const callbackURL = `${window.location.origin}${synthetic ? "/?account-lab=1" : "/account"}`;
    const response = await fetch(
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
    );
    if (!response.ok) throw Error("provider unavailable");
    const result = z
      .object({ url: z.string().url() })
      .parse(await response.json());
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
    <main className="account-preview">
      <a className="account-preview-brand" href="/">
        Private<span>AI</span>
      </a>
      <aside className="account-preview-banner">
        {synthetic
          ? "Synthetic account lab · .test addresses only. No real email, provider login or private chat."
          : "Early access preparation · Private chat is not available."}
      </aside>
      <section className="account-preview-card">
        <h1>
          {session
            ? synthetic
              ? "Your test account"
              : "Your account"
            : synthetic
              ? "Sign in to the account lab"
              : "Sign in to PrivateAI"}
        </h1>
        <p className="account-preview-intro">
          Sign-in access is separate from your encrypted vault.
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
                disabled={busy || linked.includes(provider)}
                onClick={() => action(() => social(provider, true))}
              >
                {linked.includes(provider) ? "Connected to" : "Connect"}{" "}
                {provider === "google" ? "Google" : "Apple"}
              </button>
            ))}
            <button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const response = await fetch(
                    "/api/account/recovery/complete",
                    { method: "POST" },
                  );
                  if (!response.ok) {
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
              After signing in again with email, finish recovery to close other
              sessions. Use Account access below to remove a lost passkey or
              linked provider after verifying email.
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
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const result = await client.passkey.addPasskey({
                    name: synthetic
                      ? "PrivateAI synthetic passkey"
                      : "PrivateAI passkey",
                  });
                  if (result.error) throw Error("registration failed");
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
                disabled={busy}
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
              disabled={busy}
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
            {providers.map((provider) => (
              <button
                key={provider}
                type="button"
                disabled={busy}
                onClick={() => action(() => social(provider))}
              >
                Continue with {provider === "google" ? "Google" : "Apple"}
              </button>
            ))}
            <label htmlFor="lab-email">
              {synthetic ? "Test email address" : "Email address"}
            </label>
            <input
              id="lab-email"
              type="email"
              required
              readOnly={sent}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete={synthetic ? "off" : "email"}
              disabled={!ready || busy}
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
              disabled={busy || !ready}
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
                disabled={busy}
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
            <button
              disabled={busy || !ready}
              type="button"
              onClick={() =>
                action(async () => {
                  const result = await client.signIn.passkey();
                  if (result.error) throw Error("passkey failed");
                  await refresh();
                })
              }
            >
              {synthetic
                ? "Sign in with a test passkey"
                : "Sign in with a passkey"}
            </button>
          </form>
        )}
        <p role="status" className="account-preview-notice">
          {busy ? "Working…" : notice}
        </p>
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
        <details>
          <summary>Help with sign-in or reporting a problem</summary>
          <SupportPanel initialArea="account" />
        </details>
      </section>
    </main>
  );
}
