import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import "./account-preview.css";

const sessionSchema = z
  .object({ user: z.object({ id: z.string(), email: z.string() }) })
  .nullable();
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
  const codeInput = useRef<HTMLInputElement>(null);
  async function refresh() {
    const response = await fetch("/api/auth/get-session", {
      cache: "no-store",
    });
    if (!response.ok) throw Error("unavailable");
    setSession(sessionSchema.parse(await response.json()));
  }
  useEffect(() => {
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
            <button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const result = await client.passkey.addPasskey({
                    name: "PrivateAI synthetic passkey",
                  });
                  if (result.error) throw Error("registration failed");
                  setNotice("Test passkey added.");
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
          Google and Apple are not connected. Recovering sign-in cannot recover
          a lost vault passphrase. This lab grants no access to existing
          accounts or private-data chat.
        </p>
      </section>
    </main>
  );
}
