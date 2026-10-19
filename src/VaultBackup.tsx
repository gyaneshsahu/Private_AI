import { useState } from "react";
import { BACKUP_MAX_BYTES } from "./vault-backup";

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
  return (
    <section className="panel" aria-label="Encrypted backup and restore">
      <h3>Keep an encrypted backup</h3>
      <p>
        Download saved conversations to your device, protected by this vault’s
        passphrase. Unsaved work and temporary research are not included.
        Nothing is uploaded.
      </p>
      <p className="muted">
        Up to 100 saved conversations and 10 MiB of content. Keep the file and
        passphrase safe: there is no passphrase recovery. Deleting history here
        cannot delete downloaded copies.
      </p>
      <button disabled={busy || !canExport} onClick={() => void onExport()}>
        Download encrypted backup
      </button>
      <h3>Restore into this unlocked vault</h3>
      <p>
        Choose your backup and its original passphrase. Conversations are added
        as new copies; existing snapshots and your open workspace stay
        unchanged. Repeating a restore adds more copies.
      </p>
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
          Encrypted backup file
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
                setError(
                  "Choose a non-empty encrypted backup file of at most 16 MiB.",
                );
              } else setFile(selected);
            }}
          />
        </label>
        <label>
          Original backup passphrase
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
          I want to add copies from this backup to the current vault.
        </label>
        <button
          disabled={busy || !file || !confirmed || passphrase.length < 12}
        >
          Restore as new copies
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
