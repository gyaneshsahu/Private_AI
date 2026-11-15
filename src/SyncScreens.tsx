// Devices and sync (docs/vault-sync-screens-20261115.md): the Settings section, the quiet status
// indicator, the pairing prompt on an existing device and the new-device screen. Shown only when the
// deployment has sync (status.vaultSync); every call goes to the engine API in src/sync/.
import { useEffect, useId, useRef, useState } from "react";
import { useLang, useText } from "./i18n";
import { syncText } from "./text/sync";
import { ConfirmDialog } from "./ConfirmDialog";
import { containDialogFocus } from "./dialog-focus";
import { resetSync, revokeDevice, syncNow, turnOffSyncOnThisDevice, useSyncState, type SyncState } from "./sync";
import { SyncSetup } from "./SyncSetup";
import { ApprovePairing, ShowPairingCode } from "./SyncPairing";
import { RecoveryKeyForm, RememberChoice } from "./SyncRecoveryKey";

/** A destructive question that needs a typed word or phrase before its button works. */
export function TypedConfirm({
  title,
  text,
  label,
  phrase,
  confirmLabel,
  cancelLabel,
  onClose,
}: {
  title: string;
  text: string;
  label: string;
  phrase: string;
  confirmLabel: string;
  cancelLabel: string;
  onClose: (confirmed: boolean) => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toUpperCase() === phrase.toUpperCase();
  return (
    <ConfirmDialog
      title={title}
      text={text}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmDisabled={!matches}
      onClose={(confirmed) => onClose(confirmed && matches)}
    >
      <label className="typed-confirm">
        {label}
        <input value={typed} autoComplete="off" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />
      </label>
    </ConfirmDialog>
  );
}

type Errorish = Pick<SyncState, "phase" | "error">;
/** The engine's error, in plain words. Codes: offline, quota, revoked, conflict (see the doc). */
export function syncErrorText(state: Errorish, t: (typeof syncText)["en"]): string {
  if (!state.error) return state.phase === "error" ? t.errorOther : "";
  const code = state.error.toLowerCase();
  if (code.includes("offline")) return t.errorOffline;
  if (code.includes("quota")) return t.errorQuota;
  if (code.includes("revoked")) return t.errorRevoked;
  if (code.includes("conflict")) return t.errorConflict;
  return t.errorOther;
}

function indicatorState(state: SyncState, t: (typeof syncText)["en"]): { key: string; text: string } | undefined {
  if (state.phase === "off") return undefined;
  if (state.phase === "syncing") return { key: "syncing", text: t.stateSyncing };
  if (state.phase === "locked") return { key: "locked", text: t.stateLocked };
  if (state.phase === "needs-approval") return { key: "approval", text: t.stateApproval };
  if (state.phase === "error" || state.error)
    return state.error?.toLowerCase().includes("offline") ? { key: "offline", text: t.stateOffline } : { key: "error", text: t.stateError };
  return { key: "synced", text: t.stateSynced };
}

/** Quiet status in the sidebar footer: a shape and a word, never colour alone. */
export function SyncIndicator({ onOpen }: { onOpen: () => void }) {
  const t = useText(syncText);
  const state = useSyncState();
  const shown = indicatorState(state, t);
  if (!shown) return null;
  return (
    <button type="button" className="sync-indicator text-button" data-state={shown.key} aria-label={t.indicatorLabel(shown.text)} onClick={onOpen}>
      <span className="sync-dot" aria-hidden="true" />
      {shown.text}
    </button>
  );
}

const megabytes = (bytes: number, lang: string) =>
  `${new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB`;

/** Settings, Devices and sync. */
export function SyncSettings({ unlocked, onNotice }: { unlocked: boolean; onNotice: (text: string) => void }) {
  const t = useText(syncText);
  const { lang } = useLang();
  const state = useSyncState();
  const [setup, setSetup] = useState(false);
  const [approving, setApproving] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "revoke"; id: string; name: string } | { kind: "off" } | { kind: "reset" }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const headingId = useId();
  const date = (iso: string) =>
    new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const run = async (action: () => Promise<void>, done: string, failed = t.actionFailed) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(done);
      onNotice(done);
    } catch {
      setMessage(failed);
    } finally {
      setBusy(false);
    }
  };

  if (state.phase === "off" || state.phase === "needs-approval")
    return (
      <section aria-labelledby={headingId} className="sync-settings">
        <h3 id={headingId}>{t.section}</h3>
        {setup ? (
          <SyncSetup
            onCancel={() => setSetup(false)}
            onDone={() => {
              setSetup(false);
              setMessage(t.onDone);
              onNotice(t.onDone);
            }}
          />
        ) : (
          <>
            <p>{t.offIntro}</p>
            {state.phase === "needs-approval" ? (
              <p>{t.newText}</p>
            ) : unlocked ? (
              <button className="primary" onClick={() => setSetup(true)}>
                {t.turnOn}
              </button>
            ) : (
              <p className="muted">{t.unlockFirst}</p>
            )}
            {message && <p role="alert">{message}</p>}
          </>
        )}
      </section>
    );

  const error = syncErrorText(state, t);
  const quota = state.quota;
  return (
    <section aria-labelledby={headingId} className="sync-settings">
      <h3 id={headingId}>{t.section}</h3>
      <h4>{t.statusHeading}</h4>
      <p>{state.lastSyncAt ? t.lastSync(date(state.lastSyncAt)) : t.neverSynced}</p>
      <p>{t.pending(state.pending)}</p>
      {error && <p className="sync-error">{error}</p>}
      {quota && (
        <>
          <label className="sync-quota">
            {t.quotaLabel}
            <progress max={quota.limitBytes} value={Math.min(quota.usedBytes, quota.limitBytes)} />
          </label>
          <p>
            {t.quota(megabytes(quota.usedBytes, lang), megabytes(quota.limitBytes, lang), megabytes(Math.max(0, quota.limitBytes - quota.usedBytes), lang))}
          </p>
        </>
      )}
      <div className="row sync-actions">
        <button disabled={busy} onClick={() => void run(syncNow, t.lastSync(date(new Date().toISOString())))}>
          {t.syncNow}
        </button>
        <button disabled={busy} onClick={() => setApproving(true)}>
          {t.approveNew}
        </button>
      </div>
      {approving && <ApprovePairing onClose={() => setApproving(false)} />}
      <h4>{t.devicesHeading}</h4>
      <ul className="sync-devices">
        {state.devices.map((device) => (
          <li key={device.deviceId}>
            <strong>{device.label}</strong>
            {device.thisDevice && <span className="sync-badge">{t.thisDevice}</span>}
            {device.revoked && <span className="sync-badge">{t.revoked}</span>}
            <span className="muted">{t.added(date(device.createdAt))}</span>
            <span className="muted">{t.lastSeen(date(device.lastSeenAt))}</span>
            {!device.thisDevice && !device.revoked && (
              <button
                disabled={busy}
                aria-label={t.revoke(device.label)}
                onClick={() => setConfirm({ kind: "revoke", id: device.deviceId, name: device.label })}
              >
                {t.revokeShort}
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="sync-danger">
        <button disabled={busy} onClick={() => setConfirm({ kind: "off" })}>
          {t.turnOffHere}
        </button>
        <button disabled={busy} className="danger-button" onClick={() => setConfirm({ kind: "reset" })}>
          {t.reset}
        </button>
      </div>
      <p aria-live="polite">{message}</p>
      {confirm?.kind === "revoke" && (
        <ConfirmDialog
          title={t.revokeTitle(confirm.name)}
          text={t.revokeText}
          confirmLabel={t.revokeConfirm}
          cancelLabel={t.cancel}
          onClose={(yes) => {
            const target = confirm;
            setConfirm(undefined);
            if (yes) void run(() => revokeDevice(target.id), t.revokeDone, t.revokeFailed);
          }}
        />
      )}
      {confirm?.kind === "off" && (
        <ConfirmDialog
          title={t.turnOffTitle}
          text={t.turnOffText}
          confirmLabel={t.turnOffConfirm}
          cancelLabel={t.cancel}
          onClose={(yes) => {
            setConfirm(undefined);
            if (yes) void run(turnOffSyncOnThisDevice, t.turnedOff);
          }}
        />
      )}
      {confirm?.kind === "reset" && (
        <TypedConfirm
          title={t.resetTitle}
          text={t.resetText}
          label={t.resetTypeLabel(t.resetPhrase)}
          phrase={t.resetPhrase}
          confirmLabel={t.resetConfirm}
          cancelLabel={t.cancel}
          onClose={(yes) => {
            setConfirm(undefined);
            // The server takes the contract's English phrase; the user typed it in their language.
            if (yes) void run(() => resetSync("DELETE SYNCED DATA"), t.resetDone);
          }}
        />
      )}
    </section>
  );
}

/** On an existing device: the prompt shows by itself when a new device asks to pair. */
export function PairingPrompt() {
  const state = useSyncState();
  // Stays open after the request is answered, so the result shows, until the user closes it.
  const [open, setOpen] = useState(false);
  const member = state.phase !== "off" && state.phase !== "needs-approval";
  useEffect(() => {
    if (state.pairingRequested && member) setOpen(true);
  }, [state.pairingRequested, member]);
  const t = useText(syncText);
  if (!open) return null;
  return (
    <section className="pairing-prompt" aria-label={t.promptHeading} aria-live="polite">
      <ApprovePairing autoFocus={false} onClose={() => setOpen(false)} />
    </section>
  );
}

/** The new-device screen over the app, until the user picks Not now. */
export function SyncGate({ dismissed, onDismiss, onUnlocked }: { dismissed: boolean; onDismiss: () => void; onUnlocked: () => void }) {
  const state = useSyncState();
  // The engine moves this device out of "needs-approval" once approved or recovered; that is the signal.
  const waiting = useRef(false);
  useEffect(() => {
    if (state.phase === "needs-approval") waiting.current = true;
    else if (waiting.current && state.phase !== "off") {
      waiting.current = false;
      onUnlocked();
    }
  }, [state.phase]);
  return state.phase === "needs-approval" && !dismissed ? <NewDeviceDialog onNotNow={onDismiss} /> : null;
}

/**
 * On a new device whose account has sync on: one primary way in (approval), the recovery key, and
 * Not now (an empty local vault, labelled not synced). "Remember this device" is preselected.
 * It closes when the engine leaves "needs-approval" (SyncGate).
 */
export function NewDeviceDialog({ onNotNow }: { onNotNow: () => void }) {
  const t = useText(syncText);
  const [view, setView] = useState<"choose" | "code" | "recovery">("choose");
  const [remember, setRemember] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (view === "choose") heading.current?.focus();
  }, [view]);
  return (
    <dialog
      ref={dialog}
      className="new-device-dialog"
      aria-labelledby="new-device-heading"
      onKeyDown={containDialogFocus}
      onCancel={(event) => {
        event.preventDefault();
        onNotNow();
      }}
    >
      {view === "choose" && (
        <div className="sync-step">
          <h2 id="new-device-heading" ref={heading} tabIndex={-1}>
            {t.newHeading}
          </h2>
          <p>{t.newText}</p>
          <RememberChoice checked={remember} onChange={setRemember} />
          <div className="new-device-actions">
            <button className="primary" onClick={() => setView("code")}>
              {t.approveFromOther}
            </button>
            <button onClick={() => setView("recovery")}>{t.useRecovery}</button>
            <button className="text-button" onClick={onNotNow}>
              {t.notNow}
            </button>
          </div>
          <p className="muted">{t.notNowNote}</p>
        </div>
      )}
      {view !== "choose" && <h2 id="new-device-heading" className="sr-only">{t.newHeading}</h2>}
      {view === "code" && <ShowPairingCode rememberDevice={remember} onApproved={() => {}} onBack={() => setView("choose")} />}
      {view === "recovery" && <RecoveryKeyForm rememberDefault={remember} onDone={() => {}} onBack={() => setView("choose")} />}
    </dialog>
  );
}
