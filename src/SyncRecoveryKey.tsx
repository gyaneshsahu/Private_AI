// The recovery key on screen: shown in groups (one list item per group, read out character by
// character), and typed back with grouping and hints (docs/vault-sync-screens-20261115.md).
import { useEffect, useId, useRef, useState } from "react";
import { useText } from "./i18n";
import { syncText, vaultUnlockText } from "./text/sync";
import { formatRecoveryKey, recoveryKeyGroups, recoveryKeyHint } from "./recovery-key-format";
import { unlockWithRecoveryKey } from "./sync";

/** A name for this browser to start from, from its own description of itself. */
export function defaultDeviceName(): string {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const system = /iPhone|iPad/.test(agent) ? "iOS" : /Android/.test(agent) ? "Android" : /Windows/.test(agent) ? "Windows" : /Mac OS/.test(agent) ? "Mac" : /Linux/.test(agent) ? "Linux" : "";
  return system ? `${browser}, ${system}` : browser;
}

export function RecoveryKeyGroups({ value }: { value: string }) {
  const t = useText(syncText);
  const groups = recoveryKeyGroups(value);
  return (
    <ol className="recovery-key" aria-label={t.keyGroups(groups.length)}>
      {groups.map((group, index) => (
        <li key={index}>
          <span aria-hidden="true">{group}</span>
          <span className="sr-only">{t.keyGroup(index + 1, [...group].join(" "))}</span>
        </li>
      ))}
    </ol>
  );
}

/** "Remember this device" with its risk sentence beside it. */
export function RememberChoice({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const v = useText(vaultUnlockText);
  const id = useId();
  return (
    <div className="remember-choice">
      <label className="row">
        <input type="checkbox" checked={checked} disabled={disabled} aria-describedby={id} onChange={(e) => onChange(e.target.checked)} />
        {v.rememberLabel}
      </label>
      <p id={id} className="muted">
        {v.rememberRisk}
      </p>
    </div>
  );
}

/** Typing the recovery key in: grouping as you type, hints, then unlockWithRecoveryKey. */
export function RecoveryKeyForm({
  onDone,
  onBack,
  rememberDefault = true,
}: {
  onDone: () => void;
  onBack?: () => void;
  rememberDefault?: boolean;
}) {
  const t = useText(syncText);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState(defaultDeviceName);
  const [remember, setRemember] = useState(rememberDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const hintId = useId();
  useEffect(() => heading.current?.focus(), []);
  const hint = recoveryKeyHint(key);
  const hintText =
    hint.kind === "short"
      ? t.hintShort(hint.missing)
      : hint.kind === "long"
        ? t.hintLong(hint.extra)
        : hint.kind === "character"
          ? t.hintCharacter(hint.character)
          : hint.kind === "typo"
            ? t.hintTypo
            : hint.kind === "ok"
              ? t.hintOk
              : t.recoveryHint;
  return (
    <form
      className="sync-step"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || hint.kind !== "ok") return;
        setBusy(true);
        setError("");
        try {
          const result = await unlockWithRecoveryKey(key, { deviceLabel: label.trim() || defaultDeviceName(), rememberDevice: remember });
          if (result === "ok") onDone();
          else setError(t.wrongKey);
        } catch {
          setError(t.recoveryFailed);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 ref={heading} tabIndex={-1}>
        {t.recoveryHeading}
      </h3>
      <label>
        {t.recoveryLabel}
        <input
          className="recovery-key-input"
          value={key}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={hintId}
          aria-invalid={hint.kind === "character" || hint.kind === "typo" || hint.kind === "long" || undefined}
          onChange={(e) => {
            setError("");
            setKey(formatRecoveryKey(e.target.value));
          }}
        />
      </label>
      <p id={hintId} className="muted" aria-live="polite">
        {hintText}
      </p>
      <label>
        {t.deviceName}
        <input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <RememberChoice checked={remember} onChange={setRemember} disabled={busy} />
      {error && <p role="alert">{error}</p>}
      <div className="row sync-actions">
        <button className="primary" disabled={busy || hint.kind !== "ok"}>
          {busy ? t.working : t.unlock}
        </button>
        {onBack && (
          <button type="button" onClick={onBack} disabled={busy}>
            {t.back}
          </button>
        )}
      </div>
    </form>
  );
}
