// Devices and sync (docs/vault-sync-screens-20261115.md): the Settings section, the quiet status
// indicator, the pairing prompt on an existing device and the new-device screen. Shown only when the
// deployment has sync (status.vaultSync); every call goes to the engine API in src/sync/.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLang, useText } from "./i18n";
import { syncText, vaultUnlockText } from "./text/sync";
import { ConfirmDialog } from "./ConfirmDialog";
import { containDialogFocus } from "./dialog-focus";
import { SyncError, resetSync, revokeDevice, syncNow, turnOffSyncOnThisDevice, useSyncState, type SyncState } from "./sync";
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
  children,
}: {
  title: string;
  text: string;
  label: string;
  phrase: string;
  confirmLabel: string;
  cancelLabel: string;
  onClose: (confirmed: boolean) => void;
  children?: ReactNode;
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
      {children}
    </ConfirmDialog>
  );
}

/** "Also delete the synced copy" for the two "delete everything on this device" questions. */
export function AlsoDeleteSynced({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const t = useText(syncText);
  const id = useId();
  return (
    <div className="remember-choice">
      <label className="row">
        <input type="checkbox" checked={checked} aria-describedby={id} onChange={(e) => onChange(e.target.checked)} />
        {t.alsoDeleteSynced}
      </label>
      <p id={id} className="muted">
        {t.alsoDeleteSyncedNote}
      </p>
    </div>
  );
}

/**
 * Asks for a local passphrase for a synced vault: when this device is not remembered (owner
 * decision VS-5), and when turning sync off or deleting the synced copy needs one first.
 */
export function LocalPassphraseDialog({
  text,
  cancelLabel,
  onSubmit,
  onClose,
}: {
  text: string;
  cancelLabel: string;
  onSubmit: (passphrase: string) => Promise<void>;
  onClose: (done: boolean) => void;
}) {
  const v = useText(vaultUnlockText);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={id}
      onKeyDown={containDialogFocus}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose(false);
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || value.length < 12) return;
          setBusy(true);
          setError("");
          try {
            await onSubmit(value);
            onClose(true);
          } catch {
            setError(v.newPassphraseFailed);
            setBusy(false);
          }
        }}
      >
        <h2 id={id}>{v.newPassphraseHeading}</h2>
        <p>{text}</p>
        <label>
          {v.newPassphrase}
          <input type="password" autoComplete="new-password" minLength={12} required value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="confirm-actions">
          <button type="button" disabled={busy} onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button className="primary" disabled={busy || value.length < 12}>
            {v.newPassphraseSave}
          </button>
        </div>
      </form>
    </dialog>
  );
}

type Errorish = Pick<SyncState, "phase" | "error">;
/** The engine's error, in plain words. Codes: offline, quota, revoked, server, rate-limited, item-too-large. */
export function syncErrorText(state: Errorish, t: (typeof syncText)["en"]): string {
  if (!state.error) return state.phase === "error" ? t.errorOther : "";
  const code = state.error.toLowerCase();
  if (code.includes("offline")) return t.errorOffline;
  if (code.includes("quota")) return t.errorQuota;
  if (code.includes("revoked")) return t.errorRevoked;
  // Not reported by the engine yet (security review C1): the synced data was reset from another device.
  if (code.includes("reset")) return t.errorReset;
  if (code.includes("rate-limited")) return t.errorRateLimited;
  if (code.includes("item-too-large")) return t.errorItemTooLarge;
  if (code.includes("server")) return t.errorServer;
  // The engine merges conflicts and never reports one; kept for older codes.
  if (code.includes("conflict")) return t.errorConflict;
  return t.errorOther;
}
const needsPassphrase = (error: unknown) => error instanceof SyncError && error.code === "needs-local-passphrase";

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
export function SyncSettings({
  unlocked,
  onNotice,
  onOpened,
}: {
  unlocked: boolean;
  onNotice: (text: string) => void;
  /** Sync was turned on here, with this device's "Remember this device" choice. */
  onOpened?: (remember: boolean) => void;
}) {
  const t = useText(syncText);
  const { lang } = useLang();
  const state = useSyncState();
  const [setup, setSetup] = useState(false);
  const [approving, setApproving] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "revoke"; id: string; name: string } | { kind: "off" } | { kind: "reset" }>();
  // Turning sync off or deleting the synced copy needs a local passphrase first: asked, then retried.
  const [retry, setRetry] = useState<{ action: (localPassphrase: string) => Promise<void>; done: string }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const headingId = useId();
  const date = (iso: string) =>
    new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const run = async (action: () => Promise<void>, done: string, failed = t.actionFailed, again?: (localPassphrase: string) => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(done);
      onNotice(done);
    } catch (error) {
      if (again && needsPassphrase(error)) setRetry({ action: again, done });
      else setMessage(failed);
    } finally {
      setBusy(false);
    }
  };
  const passphraseDialog = retry && (
    <LocalPassphraseDialog
      text={t.localPassphraseNeeded}
      cancelLabel={t.cancel}
      onSubmit={retry.action}
      onClose={(done) => {
        setRetry(undefined);
        if (done) {
          setMessage(retry.done);
          onNotice(retry.done);
        }
      }}
    />
  );

  if (state.phase === "off" || state.phase === "needs-approval")
    return (
      <section aria-labelledby={headingId} className="sync-settings">
        <h3 id={headingId}>{t.section}</h3>
        {setup ? (
          <SyncSetup
            onCancel={() => setSetup(false)}
            onDone={(remember) => {
              setSetup(false);
              setMessage(t.onDone);
              onNotice(t.onDone);
              onOpened?.(remember);
            }}
          />
        ) : (
          <>
            <p>{t.offIntro}</p>
            {state.error && <p className="sync-error">{syncErrorText(state, t)}</p>}
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
        {passphraseDialog}
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
            if (yes)
              void run(() => turnOffSyncOnThisDevice(), t.turnedOff, t.actionFailed, (localPassphrase) =>
                turnOffSyncOnThisDevice({ localPassphrase }),
              );
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
            if (yes)
              void run(() => resetSync("DELETE SYNCED DATA"), t.resetDone, t.actionFailed, (localPassphrase) =>
                resetSync("DELETE SYNCED DATA", { localPassphrase }),
              );
          }}
        />
      )}
      {passphraseDialog}
    </section>
  );
}

const timeOf = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/**
 * On an existing device: a quiet notice when a new device asks to join (security review M1: never
 * a form that opens by itself). The user opens it deliberately; the form then asks for "I am
 * holding this device" before the code. Also the one-time "A new device was added" notice.
 */
export function PairingPrompt() {
  const state = useSyncState();
  const t = useText(syncText);
  const { lang } = useLang();
  // When this device first noticed the request (the engine does not report the request's time).
  const [askedAt, setAskedAt] = useState<string>();
  const [open, setOpen] = useState(false);
  const member = state.phase !== "off" && state.phase !== "needs-approval";
  useEffect(() => {
    if (state.pairingRequested && member) setAskedAt((at) => at ?? new Date().toISOString());
    // Stays while the form is open, so its result shows until the user closes it.
    else if (!open) setAskedAt(undefined);
  }, [state.pairingRequested, member]);
  return (
    <>
      {askedAt && (
        <section className="pairing-prompt" aria-label={t.promptHeading} aria-live="polite">
          {open ? (
            <ApprovePairing
              requestedAt={timeOf(askedAt, lang)}
              onClose={() => {
                setOpen(false);
                setAskedAt(undefined);
              }}
            />
          ) : (
            <>
              <p>{t.pairingNotice(timeOf(askedAt, lang))}</p>
              <div className="row sync-actions">
                <button onClick={() => setOpen(true)}>{t.reviewRequest}</button>
                <button className="text-button" onClick={() => setAskedAt(undefined)}>
                  {t.dismiss}
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <DeviceAddedNotice />
    </>
  );
}

/**
 * "A new device was added: <name>, <time>", once per device on every other device of the
 * account. The device ids this browser has seen are kept in localStorage (ids only, no names).
 */
function DeviceAddedNotice() {
  const state = useSyncState();
  const t = useText(syncText);
  const { lang } = useLang();
  const [added, setAdded] = useState<SyncState["devices"]>([]);
  useEffect(() => {
    const me = state.devices.find((d) => d.thisDevice);
    // Names are readable only with the account key (not while locked).
    if (!me || state.phase === "locked" || state.devices.some((d) => !d.label)) return;
    const key = `cometrow-sync-seen-${me.deviceId}`;
    let seen: string[] | undefined;
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? "null") ?? undefined;
      localStorage.setItem(key, JSON.stringify(state.devices.map((d) => d.deviceId)));
    } catch {
      return;
    }
    // The first look on this device only records what is there.
    const fresh = seen ? state.devices.filter((d) => !d.thisDevice && !d.revoked && !seen!.includes(d.deviceId)) : [];
    if (fresh.length) setAdded((list) => [...list, ...fresh]);
  }, [state.devices, state.phase]);
  if (!added.length) return null;
  return (
    <section className="pairing-prompt" aria-label={t.deviceAddedHeading} aria-live="polite">
      {added.map((d) => (
        <p key={d.deviceId}>{t.deviceAdded(d.label, timeOf(d.createdAt, lang))}</p>
      ))}
      <button onClick={() => setAdded([])}>{t.closeNotice}</button>
    </section>
  );
}

/** The new-device screen over the app, until the user picks Not now. */
export function SyncGate({
  dismissed,
  onDismiss,
  onUnlocked,
  onOpened,
}: {
  dismissed: boolean;
  onDismiss: () => void;
  onUnlocked: () => void;
  /** Approved or recovered here, with this device's "Remember this device" choice. */
  onOpened?: (remember: boolean) => void;
}) {
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
  return state.phase === "needs-approval" && !dismissed ? <NewDeviceDialog onNotNow={onDismiss} onOpened={onOpened} /> : null;
}

/**
 * On a new device whose account has sync on: one primary way in (approval), the recovery key, and
 * Not now (an empty local vault, labelled not synced). "Remember this device" is preselected.
 * It closes when the engine leaves "needs-approval" (SyncGate).
 */
export function NewDeviceDialog({ onNotNow, onOpened }: { onNotNow: () => void; onOpened?: (remember: boolean) => void }) {
  const t = useText(syncText);
  const state = useSyncState();
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
          {state.error === "revoked" && <p className="sync-error">{t.errorRevoked}</p>}
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
          <p className="muted">{state.error === "revoked" ? t.notNowRevoked : t.notNowNote}</p>
        </div>
      )}
      {view !== "choose" && <h2 id="new-device-heading" className="sr-only">{t.newHeading}</h2>}
      {view === "code" && <ShowPairingCode rememberDevice={remember} onApproved={() => onOpened?.(remember)} onBack={() => setView("choose")} />}
      {view === "recovery" && (
        <RecoveryKeyForm rememberDefault={remember} onDone={(choice) => onOpened?.(choice)} onBack={() => setView("choose")} />
      )}
    </dialog>
  );
}
