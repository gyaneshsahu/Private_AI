// The locked vault screen (docs/vault-sync-screens-20261115.md). Stage 0, live without the sync
// switch: the new-device notice, "Remember this device", and a way out of a forgotten passphrase.
// With sync on for the account, a forgotten passphrase goes to the recovery key first.
import { useEffect, useState } from "react";
import { useText } from "./i18n";
import { appText } from "./text/app";
import { syncText, vaultUnlockText } from "./text/sync";
import type { Vault } from "./vault";
import { setLocalPassphrase, useSyncState } from "./sync";
import { RecoveryKeyForm, RememberChoice } from "./SyncRecoveryKey";
import { AlsoDeleteSynced, TypedConfirm } from "./SyncScreens";

export function VaultUnlock({
  vault,
  scope,
  busy,
  passphrase,
  onPassphrase,
  onUnlock,
  onOpenRemembered,
  onReset,
  syncAvailable,
  onSyncRecovered,
  onGetFromOther,
}: {
  vault: Vault | null;
  /** The account the vault belongs to; a change re-reads what this device holds. */
  scope?: string;
  busy: boolean;
  passphrase: string;
  onPassphrase: (value: string) => void;
  onUnlock: (remember: boolean) => void;
  onOpenRemembered: () => void;
  /** Deletes this device's saved data; with sync on here, the user chose whether the synced copy goes too. */
  onReset: (alsoDeleteSynced: boolean) => Promise<boolean>;
  syncAvailable: boolean;
  /** The recovery key opened the vault and a new passphrase is set; "Remember this device" as chosen. */
  onSyncRecovered: (remember: boolean) => void;
  onGetFromOther?: () => void;
}) {
  const t = useText(appText);
  const v = useText(vaultUnlockText);
  const s = useText(syncText);
  const sync = useSyncState();
  // This device is in sync (unlocked through the engine): the Stage 0 "nothing here" notice would be wrong.
  const syncOn = syncAvailable && sync.phase !== "off" && sync.phase !== "needs-approval";
  const [exists, setExists] = useState<boolean>();
  const [remembered, setRemembered] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgot, setForgot] = useState<"closed" | "open" | "new-passphrase">("closed");
  const [confirming, setConfirming] = useState(false);
  const [alsoSynced, setAlsoSynced] = useState(false);
  const [recoveredRemember, setRecoveredRemember] = useState(true);
  const [version, setVersion] = useState(0);
  const [newSecret, setNewSecret] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    vault?.exists().then((value) => active && setExists(value), () => {});
    vault?.isRemembered().then((value) => {
      if (!active) return;
      setRemembered(value);
      // Typing the passphrase on a remembered device keeps it remembered unless unticked.
      setRemember(value);
    }, () => {});
    return () => {
      active = false;
    };
  }, [vault, scope, version]);

  return (
    <div className="vault-unlock">
      {exists === false && !syncOn && (
        <section className="panel new-device-notice" aria-labelledby="new-device-notice-heading">
          <h3 id="new-device-notice-heading">{v.newDeviceHeading}</h3>
          <p>{v.newDeviceText}</p>
          <p>{v.newDeviceHowBackup}</p>
          {syncAvailable && <p>{v.newDeviceHowSync}</p>}
        </section>
      )}
      {syncAvailable && sync.phase === "needs-approval" && onGetFromOther && (
        <div className="panel">
          <p>{s.notSyncedLabel}</p>
          <button onClick={onGetFromOther}>{s.getFromOther}</button>
        </div>
      )}
      {remembered && exists && (
        <div className="panel">
          <p>{v.rememberedText}</p>
          <button className="primary" disabled={busy} onClick={onOpenRemembered}>
            {v.openRemembered}
          </button>
        </div>
      )}
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          onUnlock(remember);
        }}
      >
        <label>
          {t.passphrase}
          <input
            type="password"
            autoComplete="off"
            minLength={12}
            value={passphrase}
            onChange={(e) => onPassphrase(e.target.value)}
            required
          />
        </label>
        <p className="muted">{t.passphraseNote}</p>
        <RememberChoice checked={remember} onChange={setRemember} disabled={busy} />
        <button className="primary" disabled={busy}>
          {t.createOrUnlock}
        </button>
        {exists && forgot === "closed" && (
          <button type="button" className="text-button" onClick={() => setForgot("open")}>
            {v.forgotLink}
          </button>
        )}
      </form>
      {message && <p role="alert">{message}</p>}
      {forgot === "new-passphrase" && (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const secret = newSecret;
            setNewSecret("");
            try {
              await setLocalPassphrase(secret);
              setMessage(v.newPassphraseDone);
              setForgot("closed");
              onSyncRecovered(recoveredRemember);
            } catch {
              setMessage(v.newPassphraseFailed);
            }
          }}
        >
          <h3>{v.newPassphraseHeading}</h3>
          <label>
            {v.newPassphrase}
            <input type="password" autoComplete="new-password" minLength={12} required value={newSecret} onChange={(e) => setNewSecret(e.target.value)} />
          </label>
          <button className="primary">{v.newPassphraseSave}</button>
        </form>
      )}
      {forgot === "open" && (
        <section className="panel forgot-passphrase" aria-labelledby="forgot-heading">
          <h3 id="forgot-heading">{v.forgotHeading}</h3>
          {syncOn ? (
            <>
              <p>{v.forgotWithSync}</p>
              <RecoveryKeyForm
                onDone={(remember) => {
                  setRecoveredRemember(remember);
                  setMessage(s.recovered);
                  setForgot("new-passphrase");
                }}
              />
              <h4>{v.lastResortHeading}</h4>
            </>
          ) : (
            <>
              <p>{v.forgotNoSync}</p>
              {syncAvailable && <p>{v.forgotSyncHint}</p>}
            </>
          )}
          <div className="row sync-actions">
            <button className="danger-button" disabled={busy} onClick={() => setConfirming(true)}>
              {v.resetButton}
            </button>
            <button type="button" onClick={() => setForgot("closed")}>
              {v.cancel}
            </button>
          </div>
        </section>
      )}
      {confirming && (
        <TypedConfirm
          title={v.resetTitle}
          text={v.resetText}
          label={v.resetTypeLabel(v.resetWord)}
          phrase={v.resetWord}
          confirmLabel={v.resetConfirm}
          cancelLabel={v.cancel}
          onClose={async (yes) => {
            setConfirming(false);
            if (!yes) return;
            const done = await onReset(syncOn && alsoSynced);
            setMessage(done ? v.resetDone : v.resetFailed);
            if (done) {
              setForgot("closed");
              setVersion((n) => n + 1);
            }
          }}
        >
          {syncOn && <AlsoDeleteSynced checked={alsoSynced} onChange={setAlsoSynced} />}
        </TypedConfirm>
      )}
    </div>
  );
}
