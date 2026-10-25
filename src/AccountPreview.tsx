import { useEffect, useRef, useState } from "react";
import "./account-preview.css";

export function AccountPreview() {
  const [step, setStep] = useState<"choose" | "email" | "code">("choose");
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const changeStep = (next: typeof step) => {
    setNotice("");
    setStep(next);
  };
  return (
    <main className="account-preview">
      <a
        className="account-preview-brand"
        href="/"
        aria-label="CometRow workspace"
      >
        Comet<span>Row</span>
      </a>
      <aside className="account-preview-banner" aria-label="Preview status">
        Design preview · Sign-in is not connected. No account is created and no
        email is sent.
      </aside>
      <section
        className="account-preview-card account-entry"
        aria-labelledby="account-heading"
      >
        <h1 id="account-heading" ref={heading} tabIndex={-1}>
          {step === "choose"
            ? "Welcome to CometRow"
            : step === "email"
              ? "Continue with email"
              : "Check your email"}
        </h1>
        <p className="account-preview-intro">
          {step === "choose"
            ? "A space to think, explore and create."
            : step === "email"
              ? "Sign in or create an account with a one-time code."
              : "This is the planned verification step. No code has been sent."}
        </p>
        {step === "choose" ? (
          <div className="account-preview-actions">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Google sign-in is not connected in this preview. The live flow will ask you to choose a Google account and approve the requested identity information.",
                )
              }
            >
              Continue with Google
            </button>
            <div className="account-preview-divider">
              <span>or</span>
            </div>
            <button
              className="account-preview-primary"
              type="button"
              onClick={() => changeStep("email")}
            >
              Continue with email
            </button>
          </div>
        ) : step === "email" ? (
          <div className="account-preview-actions">
            <label htmlFor="preview-email">Email address</label>
            <input
              id="preview-email"
              type="email"
              value="you@example.test"
              readOnly
              autoComplete="off"
              aria-describedby="preview-email-help"
            />
            <p id="preview-email-help" className="account-preview-small">
              Synthetic example only. This preview does not collect an address.
            </p>
            <button
              className="account-preview-primary"
              type="button"
              onClick={() => changeStep("code")}
            >
              Preview verification step
            </button>
            <button type="button" onClick={() => changeStep("choose")}>
              Other sign-in options
            </button>
          </div>
        ) : (
          <div className="account-preview-actions">
            <p>
              A short-lived, one-use code will verify your email before you can
              access an account. You can add a passkey after signing in.
            </p>
            <p className="account-preview-small">
              Verification, resend limits and account recovery are not active in
              this preview.
            </p>
            <button type="button" onClick={() => changeStep("email")}>
              Back to email
            </button>
            <button type="button" onClick={() => changeStep("choose")}>
              Other sign-in options
            </button>
          </div>
        )}
        <p className="account-preview-notice" role="status">
          {notice}
        </p>
        <details className="account-preview-privacy">
          <summary>How sign-in affects your privacy</summary>
          <p>
            Planned account data: your email address, linked sign-in
            identifiers, passkey public credentials and session/security
            records. Google or Apple learns that you sign in to CometRow. The
            email-delivery provider processes your address and sign-in messages.
          </p>
          <p>
            Sign-in providers will not receive your conversations through this
            sign-in flow. We will not request access to your mail, contacts or
            files. Apple’s Hide My Email can supply a relay address.
          </p>
          <p>
            Passkeys use your device or credential manager. CometRow does not
            receive your fingerprint or face scan.
          </p>
          <p>
            Account recovery restores sign-in access. It cannot recover a lost
            vault passphrase or local encrypted history. Accounts with matching
            emails will not be silently merged.
          </p>
          <p>
            These are design commitments. Provider configuration, retention
            terms and the final privacy notice still need review before
            activation. Private-data chat remains gated separately.
          </p>
        </details>
      </section>
      <p className="account-preview-footer">
        Existing accounts and saved conversations are unchanged.
      </p>
    </main>
  );
}
