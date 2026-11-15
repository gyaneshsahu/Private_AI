// Pairing (docs/vault-sync-screens-20261115.md): the existing device approves a new one by typing
// the code the new device shows; the new device shows that code and waits.
import { useEffect, useRef, useState } from "react";
import { useText } from "./i18n";
import { syncText } from "./text/sync";
import { approvePairing, startPairing } from "./sync";

/** On the existing device: code, name, approve, result. Says to approve only a device in your hand. */
export function ApprovePairing({ onClose, autoFocus = true }: { onClose: () => void; autoFocus?: boolean }) {
  const t = useText(syncText);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState(t.promptNameDefault);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, []);
  const digits = code.replace(/\D/g, "");
  return (
    <form
      className="sync-step pairing-approve"
      aria-labelledby="pairing-approve-heading"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || digits.length !== 6) return;
        setBusy(true);
        setResult(undefined);
        try {
          const outcome = await approvePairing(digits, label.trim() || t.promptNameDefault);
          setResult(
            outcome === "approved"
              ? { ok: true, text: t.approvedOther }
              : { ok: false, text: outcome === "expired" ? t.expiredOther : t.wrongCode },
          );
        } catch {
          setResult({ ok: false, text: t.approveFailed });
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 id="pairing-approve-heading" ref={heading} tabIndex={-1}>
        {t.promptHeading}
      </h3>
      <p>{t.promptText}</p>
      <p className="sync-warning">
        <strong>{t.promptWarning}</strong>
      </p>
      {result?.ok ? (
        <p role="alert">{result.text}</p>
      ) : (
        <>
          <label>
            {t.promptCode}
            <input
              className="pairing-code-input"
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              onChange={(e) => {
                setResult(undefined);
                setCode(e.target.value.replace(/[^\d ]/g, ""));
              }}
            />
          </label>
          <label>
            {t.promptName}
            <input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
          </label>
          {result && <p role="alert">{result.text}</p>}
        </>
      )}
      <div className="row sync-actions">
        {!result?.ok && (
          <button className="primary" disabled={busy || digits.length !== 6}>
            {busy ? t.working : t.approve}
          </button>
        )}
        <button type="button" onClick={onClose} disabled={busy}>
          {result?.ok ? t.back : t.dismiss}
        </button>
      </div>
    </form>
  );
}

/** Groups a 6-digit code as 3 and 3 for reading; screen readers get it digit by digit. */
export function PairingCode({ code, label }: { code: string; label: string }) {
  return (
    <p className="pairing-code">
      <span aria-hidden="true">
        {code.slice(0, 3)} {code.slice(3)}
      </span>
      <span className="sr-only">{`${label}: ${[...code].join(" ")}`}</span>
    </p>
  );
}

/** On the new device: get a code, show it large, wait; expiry and refusal offer a new code. */
export function ShowPairingCode({
  rememberDevice,
  onApproved,
  onBack,
}: {
  rememberDevice: boolean;
  onApproved: () => void;
  onBack: () => void;
}) {
  const t = useText(syncText);
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<"waiting" | "expired" | "refused" | "failed" | "approved">("waiting");
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [attempt]);
  useEffect(() => {
    let active = true;
    setCode("");
    setOutcome("waiting");
    startPairing({ rememberDevice }).then(
      ({ code, wait }) => {
        if (!active) return;
        setCode(code);
        wait.then(
          (result) => {
            if (!active) return;
            setOutcome(result);
            if (result === "approved") onApproved();
          },
          () => active && setOutcome("failed"),
        );
      },
      () => active && setOutcome("failed"),
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  const message =
    outcome === "expired" ? t.expired : outcome === "refused" ? t.refused : outcome === "failed" ? t.pairingFailed : outcome === "approved" ? t.approved : "";
  return (
    <div className="sync-step">
      <h3 ref={heading} tabIndex={-1}>
        {t.codeHeading}
      </h3>
      {code && outcome === "waiting" && (
        <>
          <PairingCode code={code} label={t.codeLabel} />
          <p>{t.codeSteps}</p>
          <p className="muted">{t.codeExpiry}</p>
          <p className="muted" aria-live="polite">
            {t.waiting}
          </p>
        </>
      )}
      {message && <p role="alert">{message}</p>}
      <div className="row sync-actions">
        {(outcome === "expired" || outcome === "refused" || outcome === "failed") && (
          <button className="primary" onClick={() => setAttempt((n) => n + 1)}>
            {t.newCode}
          </button>
        )}
        {outcome !== "approved" && <button onClick={onBack}>{t.back}</button>}
      </div>
    </div>
  );
}
