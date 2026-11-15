// Pairing (docs/vault-sync-screens-20261115.md): the existing device approves a new one by typing
// the code the new device shows; the new device shows that code and waits.
import { useEffect, useRef, useState } from "react";
import { useText } from "./i18n";
import { syncText } from "./text/sync";
import { approvePairing, startPairing } from "./sync";

/**
 * Characters in a pairing code. The engine's code is 6 digits today; the planned 8-character
 * Crockford code (two groups of 4) is this one line.
 */
export const PAIRING_CODE_LENGTH = 6;
/** Forgiving input: case, spaces and dashes do not matter, O is read as 0, I and L as 1. */
export const normalizePairingCode = (input: string) =>
  input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
/** Two halves for reading (3 and 3, or 4 and 4). */
export const pairingCodeGroups = (code: string) => [code.slice(0, PAIRING_CODE_LENGTH / 2), code.slice(PAIRING_CODE_LENGTH / 2)];
const complete = (code: string) => code.length === PAIRING_CODE_LENGTH && /^[0-9A-HJKMNP-TV-Z]+$/.test(code);
const digitsOnly = PAIRING_CODE_LENGTH === 6;

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
  /** When the request was noticed here, already formatted. */
  requestedAt?: string;
  autoFocus?: boolean;
}) {
  const t = useText(syncText);
  const [holding, setHolding] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState(t.promptNameDefault);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const heading = useRef<HTMLHeadingElement>(null);
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
        if (busy || !holding || !complete(typed)) return;
        setBusy(true);
        setResult(undefined);
        try {
          const outcome = await approvePairing(typed, label.trim() || t.promptNameDefault);
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
      {requestedAt && <p>{t.promptRequestedAt(requestedAt)}</p>}
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
              inputMode={digitsOnly ? "numeric" : "text"}
              autoCapitalize="characters"
              autoComplete="one-time-code"
              spellCheck={false}
              maxLength={PAIRING_CODE_LENGTH + 2}
              onChange={(e) => {
                setResult(undefined);
                setCode(e.target.value.replace(/[^0-9A-Za-z\s-]/g, ""));
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
          <button className="primary" disabled={busy || !holding || !complete(typed)}>
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

/** Shows a pairing code in two halves for reading; screen readers get it character by character. */
export function PairingCode({ code, label }: { code: string; label: string }) {
  return (
    <p className="pairing-code">
      <span aria-hidden="true">{pairingCodeGroups(code).join(" ")}</span>
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
            // The dialog may already be closed (the engine left "needs-approval"): still report it.
            if (result === "approved") onApproved();
            if (active) setOutcome(result);
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
