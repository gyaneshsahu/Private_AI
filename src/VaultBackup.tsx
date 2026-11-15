import { useState } from "react";
import { BACKUP_MAX_BYTES, BackupError } from "./vault-backup";
import { useLang, useText } from "./i18n";
import { vaultBackupText } from "./text/vault-ui";
import { backupPartsText } from "./text/sync";
import { memoryEnabled, projectSpacesEnabled } from "./device-features";
import { memoryText } from "./text/memory";
import { projectText } from "./text/projects";

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function VaultBackup({
  busy,
  canExport,
  exportParts,
  onRestore,
}: {
  busy: boolean;
  canExport: boolean;
  /** The backup files (src/vault.ts, exportBackupParts); one file unless there is too much for one. */
  exportParts: (includeFiles: boolean) => Promise<string[]>;
  onRestore: (file: File, passphrase: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [passphrase, setPassphrase] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [includeFiles, setIncludeFiles] = useState(true);
  const [parts, setParts] = useState<string[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const t = useText(vaultBackupText);
  const p = useText(backupPartsText);
  const { lang } = useLang();
  return (
    <section className="panel" aria-label={t.label}>
      <h3>{t.keepHeading}</h3>
      <p>
        {t.keepIntro}
        {memoryEnabled() && ` ${memoryText[lang].backupAlso}`}
        {projectSpacesEnabled() && ` ${projectText[lang].notInBackup}`}
      </p>
      <p>{p.limitsUpFront}</p>
      <p className="muted">{t.limits}</p>
      {projectSpacesEnabled() && (
        <label className="row">
          <input
            type="checkbox"
            checked={includeFiles}
            disabled={busy || exporting}
            onChange={(event) => {
              setIncludeFiles(event.target.checked);
              setParts([]);
            }}
          />
          {p.includeFiles}
        </label>
      )}
      {projectSpacesEnabled() && <p className="muted">{p.includeFilesNote}</p>}
      <button
        disabled={busy || exporting || !canExport}
        onClick={async () => {
          setExporting(true);
          setExportError("");
          setParts([]);
          setDone([]);
          try {
            const texts = await exportParts(projectSpacesEnabled() && includeFiles);
            if (texts.length === 1) download(texts[0], "privateai-encrypted.privateai-backup");
            else setParts(texts);
          } catch (caught) {
            const code = caught instanceof BackupError ? caught.code : undefined;
            setExportError(code ? p[code] : p.failed);
          } finally {
            setExporting(false);
          }
        }}
      >
        {t.download}
      </button>
      {exportError && <p role="alert">{exportError}</p>}
      {parts.length > 1 && (
        <div className="backup-parts">
          <p>{p.parts(parts.length)}</p>
          <ul>
            {parts.map((text, index) => (
              <li key={index}>
                <button
                  onClick={() => {
                    download(text, `privateai-encrypted-part-${index + 1}-of-${parts.length}.privateai-backup`);
                    setDone((list) => [...list, index]);
                  }}
                >
                  {done.includes(index) ? p.downloaded(index + 1, parts.length) : p.downloadPart(index + 1, parts.length)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
