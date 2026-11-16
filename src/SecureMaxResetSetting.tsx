import { useState } from "react";
import { useText } from "./i18n";
import { TypedConfirm } from "./SyncScreens";
import { modesText } from "./text/modes";

/**
 * Settings: "Reset Secure Max". The warning stands on the screen; the typed confirmation
 * (ConfirmDialog with its red button, as for deleting synced data) comes before `onReset`.
 * Without a recent sign-in the button is off and says why.
 */
export function SecureMaxResetSetting({ onReset, recentSignIn }: { onReset: () => Promise<void>; recentSignIn: boolean }) {
  const t = useText(modesText);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="secure-max-reset">
      <p>{t.maxResetWarning}</p>
      {!recentSignIn && <p className="muted">{t.maxResetSignInFirst}</p>}
      <button type="button" className="danger-button" disabled={!recentSignIn || busy} onClick={() => setAsking(true)}>
        {t.maxResetLabel}
      </button>
      {failed && <p role="alert">{t.maxResetFailed}</p>}
      {asking && (
        <TypedConfirm
          title={t.maxResetLabel}
          text={t.maxResetWarning}
          label={t.maxResetTypeLabel(t.maxResetPhrase)}
          phrase={t.maxResetPhrase}
          confirmLabel={t.maxResetLabel}
          cancelLabel={t.cancel}
          onClose={async (confirmed) => {
            setAsking(false);
            if (!confirmed) return;
            setBusy(true);
            setFailed(false);
            try {
              await onReset();
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
