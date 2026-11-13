import { useState } from "react";
import { BACKUP_MAX_BYTES } from "./vault-backup";
import { useText } from "./i18n";
import { vaultBackupText } from "./text/vault-ui";

export function VaultBackup({
  busy,
  canExport,
  onExport,
  onRestore,
}: {
  busy: boolean;
  canExport: boolean;
  onExport: () => Promise<void>;
  onRestore: (file: File, passphrase: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [passphrase, setPassphrase] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const t = useText(vaultBackupText);
  return (
    <section className="panel" aria-label={t.label}>
      <h3>{t.keepHeading}</h3>
      <p>{t.keepIntro}</p>
      <p className="muted">{t.limits}</p>
      <button disabled={busy || !canExport} onClick={() => void onExport()}>
        {t.download}
      </button>
      <h3>{t.restoreHeading}</h3>
      <p>{t.restoreIntro}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!file || busy || !confirmed) return;
          const secret = passphrase;
          setPassphrase("");
          setConfirmed(false);
          void onRestore(file, secret);
        }}
      >
        <label>
          {t.file}
          <input
            type="file"
            accept=".privateai-backup,application/json"
            disabled={busy}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              setPassphrase("");
              setConfirmed(false);
              setError("");
              if (
                selected &&
                (selected.size > BACKUP_MAX_BYTES || selected.size === 0)
              ) {
                setFile(undefined);
                event.target.value = "";
                setError(t.fileError);
              } else setFile(selected);
            }}
          />
        </label>
        <label>
          {t.passphrase}
          <input
            type="password"
            autoComplete="off"
            value={passphrase}
            minLength={12}
            required
            disabled={busy || !file}
            onChange={(event) => setPassphrase(event.target.value)}
          />
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy || !file}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {t.confirm}
        </label>
        <button
          disabled={busy || !file || !confirmed || passphrase.length < 12}
        >
          {t.restore}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
