import { useEffect, useRef, useState } from "react";
import "./account-preview.css";
import { useText } from "./i18n";
import { accountPreviewText } from "./text/account";

export function AccountPreview() {
  const [step, setStep] = useState<"choose" | "email" | "code">("choose");
  const [notice, setNotice] = useState("");
  const t = useText(accountPreviewText);
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
        aria-label={t.brandLabel}
      >
        Comet<span>Row</span>
      </a>
      <aside className="account-preview-banner" aria-label={t.previewStatus}>
        {t.banner}
      </aside>
      <section
        className="account-preview-card account-entry"
        aria-labelledby="account-heading"
      >
        <h1 id="account-heading" ref={heading} tabIndex={-1}>
          {step === "choose"
            ? t.welcome
            : step === "email"
              ? t.continueEmail
              : t.checkEmail}
        </h1>
        <p className="account-preview-intro">
          {step === "choose"
            ? t.introChoose
            : step === "email"
              ? t.introEmail
              : t.introCode}
        </p>
        {step === "choose" ? (
          <div className="account-preview-actions">
            <button
              type="button"
              onClick={() => setNotice(t.googleNotice)}
            >
              {t.continueGoogle}
            </button>
            <div className="account-preview-divider">
              <span>{t.or}</span>
            </div>
            <button
              className="account-preview-primary"
              type="button"
              onClick={() => changeStep("email")}
            >
              {t.continueEmail}
            </button>
          </div>
        ) : step === "email" ? (
          <div className="account-preview-actions">
            <label htmlFor="preview-email">{t.emailAddress}</label>
            <input
              id="preview-email"
              type="email"
              value="you@example.test"
              readOnly
              autoComplete="off"
              aria-describedby="preview-email-help"
            />
            <p id="preview-email-help" className="account-preview-small">
              {t.emailHelp}
            </p>
            <button
              className="account-preview-primary"
              type="button"
              onClick={() => changeStep("code")}
            >
              {t.previewStep}
            </button>
            <button type="button" onClick={() => changeStep("choose")}>
              {t.otherOptions}
            </button>
          </div>
        ) : (
          <div className="account-preview-actions">
            <p>{t.codeNote}</p>
            <p className="account-preview-small">{t.codeSmall}</p>
            <button type="button" onClick={() => changeStep("email")}>
              {t.backToEmail}
            </button>
            <button type="button" onClick={() => changeStep("choose")}>
              {t.otherOptions}
            </button>
          </div>
        )}
        <p className="account-preview-notice" role="status">
          {notice}
        </p>
        <details className="account-preview-privacy">
          <summary>{t.privacySummary}</summary>
          <p>{t.privacy1}</p>
          <p>{t.privacy2}</p>
          <p>{t.privacy3}</p>
          <p>{t.privacy4}</p>
          <p>{t.privacy5}</p>
        </details>
      </section>
      <p className="account-preview-footer">
        {t.footer}
      </p>
    </main>
  );
}
