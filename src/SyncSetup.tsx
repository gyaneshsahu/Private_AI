// Turn on sync: explanation, device name and "Remember this device", the recovery key shown once
// (copy, download, print), then typing its last group back (docs/vault-sync-screens-20261115.md).
import { useEffect, useRef, useState } from "react";
import { useText } from "./i18n";
import { syncText } from "./text/sync";
import { confirmRecoveryKeySaved, setUpSync } from "./sync";
import { RecoveryKeyGroups, RememberChoice, defaultDeviceName, normalizeRecoveryKey } from "./SyncRecoveryKey";

type Step = "explain" | "key" | "confirm";

export function SyncSetup({
  onDone,
  onCancel,
  onAlreadySetUp,
}: {
  onDone: (remember: boolean) => void;
  onCancel: () => void;
  /** Another device set sync up again meanwhile: join it by approval instead. */
  onAlreadySetUp?: () => void;
}) {
  const t = useText(syncText);
  const [step, setStep] = useState<Step>("explain");
  const [label, setLabel] = useState(defaultDeviceName);
  const [remember, setRemember] = useState(true);
  const [key, setKey] = useState("");
  const [lastGroup, setLastGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const print = useRef<HTMLButtonElement>(null);
  // Each step starts at its heading, so a screen reader hears where it is; the key starts at Print,
  // the safest way to keep it (security review L7).
  useEffect(() => (step === "key" ? print : heading).current?.focus(), [step]);
  useEffect(() => {
    const after = () => document.body.classList.remove("printing-recovery-key");
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  if (step === "explain")
    return (
      <form
        className="sync-step"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const { recoveryKey } = await setUpSync({ deviceLabel: label.trim() || defaultDeviceName(), rememberDevice: remember });
            setKey(recoveryKey);
            setStep("key");
          } catch (error) {
            if ((error as { code?: string } | null)?.code === "already-set-up" && onAlreadySetUp) onAlreadySetUp();
            else setError(t.setupFailed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3 ref={heading} tabIndex={-1}>
          {t.explainHeading}
        </h3>
        <p>{t.explainWhat}</p>
        <p>{t.explainServer}</p>
        <p>
          <strong>{t.explainRecovery}</strong>
        </p>
        <label>
          {t.deviceName}
          <input value={label} maxLength={60} required onChange={(e) => setLabel(e.target.value)} />
        </label>
        <p className="muted">{t.deviceNameHint}</p>
        <RememberChoice checked={remember} onChange={setRemember} disabled={busy} />
        {error && <p role="alert">{error}</p>}
        <div className="row sync-actions">
          <button className="primary" disabled={busy || !label.trim()}>
            {busy ? t.working : t.continue}
          </button>
          <button type="button" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </button>
        </div>
      </form>
    );

  if (step === "key")
    return (
      <div className="sync-step">
        <h3 ref={heading} tabIndex={-1}>
          {t.keyHeading}
        </h3>
        <p>
          <strong>{t.keyOnce}</strong>
        </p>
        <div className="recovery-key-sheet">
          <p className="print-only">{t.keyFileTitle}</p>
          <RecoveryKeyGroups value={key} />
          <p className="print-only">{t.keyFileText}</p>
        </div>
        <div className="row sync-actions">
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(key).then(
                () => setMessage(t.copied),
                () => setMessage(t.copyFailed),
              )
            }
          >
            {t.copy}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([`${t.keyFileTitle}\n\n${key}\n\n${t.keyFileText}\n`], { type: "text/plain" }));
              const link = document.createElement("a");
              link.href = url;
              link.download = "cometrow-recovery-key.txt";
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            {t.download}
          </button>
          <button
            ref={print}
            type="button"
            onClick={() => {
              document.body.classList.add("printing-recovery-key");
              window.print();
            }}
          >
            {t.print}
          </button>
        </div>
        <p className="muted">{t.keyCopyRisk}</p>
        <p aria-live="polite" className="muted">
          {message}
        </p>
        <p className="sync-warning">{t.keyWarning}</p>
        <button className="primary" onClick={() => setStep("confirm")}>
          {t.saved}
        </button>
      </div>
    );

  return (
    <form
      className="sync-step"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          // The engine compares exactly; read O as 0 and I or L as 1 here, as the key's format does.
          if (await confirmRecoveryKeySaved(normalizeRecoveryKey(lastGroup))) {
            setKey("");
            onDone(remember);
          } else setError(t.confirmWrong);
        } catch {
          setError(t.setupFailed);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 ref={heading} tabIndex={-1}>
        {t.confirmHeading}
      </h3>
      <label>
        {t.confirmLabel}
        <input
          className="recovery-key-input"
          value={lastGroup}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(e) => setLastGroup(e.target.value.toUpperCase())}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="row sync-actions">
        <button className="primary" disabled={busy || !lastGroup.trim()}>
          {busy ? t.working : t.confirmButton}
        </button>
        <button type="button" disabled={busy} onClick={() => setStep("key")}>
          {t.showAgain}
        </button>
      </div>
    </form>
  );
}
