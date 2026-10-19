import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import "./account-preview.css";
import AccountAccess from "./AccountAccess";

const sessionSchema = z
  .object({ user: z.object({ id: z.string(), email: z.string() }) })
  .nullable();
const providerSchema = z.enum(["google", "apple"]);
type Provider = z.infer<typeof providerSchema>;
const optionsSchema = z.object({
  synthetic: z.literal(true),
  socialProviders: z.array(providerSchema),
  workspaceEnabled: z.boolean().optional(),
});
const accountsSchema = z.array(z.object({ providerId: z.string() }));
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

/** Synthetic-only UI; no production route mounts its authentication backend. */
export default function AccountLab() {
  const [session, setSession] = useState<z.infer<typeof sessionSchema>>(null);
  const [email, setEmail] = useState("alice@example.test");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
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
      const accounts = await fetch("/api/auth/list-accounts", {
        cache: "no-store",
      });
      if (!accounts.ok) throw Error("account list unavailable");
      setLinked(
        accountsSchema
          .parse(await accounts.json())
          .map((account) => account.providerId),
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
        setProviders(options.socialProviders);
        setWorkspaceEnabled(options.workspaceEnabled === true);
      })
      .catch(() => setProviders([]));
    refresh().catch(() =>
      setNotice("The synthetic account service is not running here."),
    );
  }, []);
  useEffect(() => {
    if (sent) codeInput.current?.focus();
  }, [sent]);
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await run();
    } catch {
      setNotice(
        "This action could not complete. Check the code or use another sign-in method. No automatic retry was made.",
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
    if (!response.ok) throw Error("not completed");
  }
  async function social(provider: Provider, link = false) {
    const callbackURL = `${window.location.origin}/?account-lab=1`;
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
        Synthetic account lab · .test addresses only. No real email, provider
        login or private chat.
      </aside>
      <section className="account-preview-card">
        <h1>{session ? "Your test account" : "Sign in to the account lab"}</h1>
        <p className="account-preview-intro">
          Sign-in access is separate from your encrypted vault.
        </p>
        {session ? (
          <div className="account-preview-actions">
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            {workspaceEnabled && <a href="/">Open test workspace</a>}
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
                    "Sign-in recovery complete. Other sessions were signed out. Check the security-notice status below; this lab sends no real email. Linked credentials and vault encryption are unchanged.",
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
                    name: "PrivateAI synthetic passkey",
                  });
                  if (result.error) throw Error("registration failed");
                  setNotice("Test passkey added.");
                  await refresh();
                })
              }
            >
              Add test passkey
            </button>
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
                  if (!/^[^\s@]+@[^\s@]+\.test$/i.test(email)) {
                    setNotice("Use a synthetic .test email address.");
                    return;
                  }
                  await post("email-otp/send-verification-otp", {
                    email,
                    type: "sign-in",
                  });
                  setSent(true);
                  setNotice(
                    "A test code is available in the test harness. No email was sent.",
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
            <label htmlFor="lab-email">Test email address</label>
            <input
              id="lab-email"
              type="email"
              required
              readOnly={sent}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
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
              disabled={busy}
              type="submit"
            >
              {sent ? "Verify test code" : "Send test code"}
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
              disabled={busy}
              type="button"
              onClick={() =>
                action(async () => {
                  const result = await client.signIn.passkey();
                  if (result.error) throw Error("passkey failed");
                  await refresh();
                })
              }
            >
              Sign in with a test passkey
            </button>
          </form>
        )}
        <p role="status" className="account-preview-notice">
          {busy ? "Working…" : notice}
        </p>
        <p className="account-preview-small">
          Social buttons, when available, use synthetic provider fixtures only.
          The planned live flow shares your verified email and provider identity
          with PrivateAI; the provider learns that you signed in here. No chat
          content is part of sign-in. Recovering sign-in cannot recover a lost
          vault passphrase. This lab grants no access to existing accounts or
          private-data chat.
        </p>
      </section>
    </main>
  );
}
