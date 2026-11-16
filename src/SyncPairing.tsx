// Pairing (docs/vault-sync-screens-20261115.md): the existing device approves a new one by typing
// the code the new device shows; the new device shows that code and waits. The code is the
// engine's (8 Crockford base32 characters, 4 and 4; PAIRING_CODE_LENGTH and the helpers in src/sync).
import { useEffect, useId, useRef, useState } from "react";
import { useText } from "./i18n";
import { syncText } from "./text/sync";
import { syncHardeningText } from "./text/sync-hardening";
import { PAIRING_CODE_LENGTH, SyncError, approvePairing, formatPairingCode, normalizePairingCode, startPairing } from "./sync";

/**
 * On the existing device: when it was asked, "I am holding this device", then the code, name,
 * approve, result. Says to approve only a device in your hand.
 */
export function ApprovePairing({
  onClose,
  requestedAt,
  autoFocus = true,
}: {
  onClose: () => void;
  /** When the request was made (from the engine), already formatted. */
  requestedAt?: string;
  autoFocus?: boolean;
}) {
  const t = useText(syncText);
  const h = useText(syncHardeningText);
  const [holding, setHolding] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState(t.promptNameDefault);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const heading = useRef<HTMLHeadingElement>(null);
  const hintId = useId();
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, []);
  const typed = normalizePairingCode(code);
  return (
    <form
      className="sync-step pairing-approve"
      aria-labelledby="pairing-approve-heading"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !holding || !typed) return;
        setBusy(true);
        setResult(undefined);
        try {
          const outcome = await approvePairing(typed, label.trim() || t.promptNameDefault);
          setResult(
            outcome === "approved"
              ? { ok: true, text: t.approvedOther }
              : { ok: false, text: outcome === "expired" ? t.expiredOther : t.wrongCode },
          );
        } catch (error) {
          const code = error instanceof SyncError ? error.code : "";
          setResult({ ok: false, text: code === "locked" ? h.unlockFirst : code === "rate-limited" ? h.rateLimited : t.approveFailed });
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 id="pairing-approve-heading" ref={heading} tabIndex={-1}>
        {t.promptHeading}
      </h3>
      {requestedAt && <p>{h.pairingRequestedAt(requestedAt)}</p>}
      <p className="sync-warning">
        <strong>{t.promptWarning}</strong>
      </p>
      {result?.ok ? (
        <p role="alert">{result.text}</p>
      ) : (
        <>
          <label className="row holding-choice">
            <input type="checkbox" checked={holding} onChange={(e) => setHolding(e.target.checked)} />
            {t.holdingLabel}
          </label>
          <p className="muted">{t.promptText}</p>
          <label>
            {t.promptCode}
            <input
              className="pairing-code-input"
              value={code}
              disabled={!holding}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              spellCheck={false}
              aria-describedby={hintId}
              maxLength={PAIRING_CODE_LENGTH + 2}
              onChange={(e) => {
                setResult(undefined);
                setCode(e.target.value.replace(/[^0-9A-Za-z\s-]/g, ""));
              }}
            />
          </label>
          <p id={hintId} className="muted">
            {h.codeHint}
          </p>
          <label>
            {t.promptName}
            <input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
          </label>
          {result && <p role="alert">{result.text}</p>}
        </>
      )}
      <div className="row sync-actions">
        {!result?.ok && (
          <button className="primary" disabled={busy || !holding || !typed}>
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

/** Shows a pairing code as 4 and 4 for reading; screen readers get it character by character. */
export function PairingCode({ code, label }: { code: string; label: string }) {
  return (
    <p className="pairing-code">
      <span aria-hidden="true">{formatPairingCode(code)}</span>
      <span className="sr-only">{`${label}: ${[...code].join(" ")}`}</span>
    </p>
  );
}

/** On the new device: get a code, show it large, wait; expiry, refusal and a failed check offer a new code. */
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
  const h = useText(syncHardeningText);
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<"waiting" | "expired" | "refused" | "unverified" | "failed" | "approved">("waiting");
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
            // The dialog may already be closed (the engine left "needs-approval"): still report it.
            if (result === "approved") onApproved();
            if (active) setOutcome(result);
          },
          // The approval did not pass the engine's check: nothing on this device was used or changed.
          (error) => active && setOutcome(error instanceof SyncError && error.code === "pairing-unverified" ? "unverified" : "failed"),
        );
      },
      () => active && setOutcome("failed"),
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  const message = {
    waiting: "",
    approved: t.approved,
    expired: t.expired,
    refused: t.refused,
    unverified: h.pairingUnverified,
    failed: t.pairingFailed,
  }[outcome];
  return (
    <div className="sync-step">
      <h3 ref={heading} tabIndex={-1}>
        {t.codeHeading}
      </h3>
      {code && outcome === "waiting" && (
        <>
          <PairingCode code={code} label={t.codeLabel} />
          <p className="muted">{h.codeHint}</p>
          <p>{t.codeSteps}</p>
          <p className="muted">{t.codeExpiry}</p>
          <p className="muted" aria-live="polite">
            {t.waiting}
          </p>
        </>
      )}
      {message && <p role="alert">{message}</p>}
      <div className="row sync-actions">
        {outcome !== "waiting" && outcome !== "approved" && (
          <button className="primary" onClick={() => setAttempt((n) => n + 1)}>
            {t.newCode}
          </button>
        )}
        {outcome !== "approved" && <button onClick={onBack}>{t.back}</button>}
      </div>
    </div>
  );
}
