// The project screen (docs/projects-20261114.md): a project's chats, instructions and files, with
// "New chat in this project", rename and delete. Everything it shows and changes is in the vault.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { Conversation } from "../shared/contracts";
import { ConfirmDialog } from "./ConfirmDialog";
import { conversationTitle } from "./conversation-library";
import { containDialogFocus } from "./dialog-focus";
import { Icon } from "./Icon";
import { useLang } from "./i18n";
import { projectSpacesEnabled } from "./device-features";
import { DOCUMENT_ACCEPT } from "./document-formats";
import { extract } from "./documents";
import {
  addProjectFile,
  charactersOf,
  heldProjects,
  holdProjects,
  PROJECT_LIMITS,
  ProjectError,
  removeProjectFile,
  setInstructions,
  watchProjects,
  type Project,
} from "./projects";
import { projectText } from "./text/projects";
import { syncFilesText } from "./text/sync-files";
// From src/sync/files.ts, not the whole sync API: the screen works the same without sync.
import { downloadProjectFile, removeSyncedProjectFile, useSyncFiles, type FileState } from "./sync/files";
import type { Vault } from "./vault";

// Pictures are not project files in this pass.
const FILE_ACCEPT = DOCUMENT_ACCEPT.replace(/,\.(png|jpe?g)\b/g, "");

export const projectProblem = (error: unknown) =>
  error instanceof ProjectError ? error.problem : "failed";

/**
 * Holds the app's project list for src/conversation.ts (instructions go with questions from what
 * is held). The app empties its list on lock, sign-out and account switch, so nothing stays held.
 */
export const useHeldProjects = () => useSyncExternalStore(watchProjects, heldProjects);
export function useProjectVault(projects: readonly Project[], vault: Vault | null, unlocked: boolean) {
  useEffect(() => {
    // Files of a project that is gone are dropped from the page too.
    const files = heldProjects().files;
    holdProjects({
      projects,
      files: Object.fromEntries(projects.flatMap((p) => (files[p.id] ? [[p.id, files[p.id]]] : []))),
    });
  }, [projects]);
  useEffect(() => {
    if (!unlocked || !vault || !projectSpacesEnabled()) return;
    // A vault that locked in between, or an unreadable record: no project file is held or sent.
    vault.readProjectFiles().then((files) => holdProjects({ files }), () => {});
    return () => holdProjects({ files: {} });
  }, [vault, unlocked]);
}

export function ProjectPanel({
  vault,
  project,
  chats,
  busy,
  onClose,
  onNewChat,
  onOpenChat,
  onRename,
  onDelete,
  onChange,
}: {
  vault: Vault;
  project: Project;
  /** The saved chats of this project, archived ones included. */
  chats: Conversation[];
  busy: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (c: Conversation) => void;
  onRename: (name: string) => Promise<boolean>;
  /** Resolves true when the project is gone; then the screen closes. */
  onDelete: (deleteChats: boolean) => Promise<boolean>;
  /** Writes a change of the project list to the vault; throws when nothing was saved. */
  onChange: (change: (projects: Project[]) => Project[]) => Promise<void>;
}) {
  const { lang } = useLang();
  const t = projectText[lang];
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [instructions, setDraft] = useState(project.instructions ?? "");
  const [deleting, setDeleting] = useState(false);
  const [deleteChats, setDeleteChats] = useState(false);
  const [status, setStatus] = useState("");
  const held = useSyncExternalStore(watchProjects, heldProjects);
  const files = held.files[project.id] ?? [];
  // Synced project files (Stage 3), only while file sync is on for this device.
  const sync = useSyncFiles();
  const f = syncFilesText[lang];
  const remote = sync.enabled ? sync.remote.filter((entry) => entry.projectId === project.id) : [];
  const remoteCharacters = (projectId?: string) =>
    sync.enabled ? sync.remote.filter((e) => projectId === undefined || e.projectId === projectId).reduce((n, e) => n + e.characters, 0) : 0;
  const rows = [
    ...files.map((file) => ({ id: file.id, name: file.name, characters: file.characters, remote: false })),
    ...remote.map((entry) => ({ id: entry.id, name: entry.name, characters: entry.characters, remote: true })),
  ];
  const bytes = (n: number) =>
    n >= 1024 ** 3
      ? `${(n / 1024 ** 3).toLocaleString(locale, { maximumFractionDigits: 1 })} GB`
      : n >= 1024 ** 2
        ? `${(n / 1024 ** 2).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`
        : `${Math.ceil(n / 1024).toLocaleString(locale)} KB`;
  const stateText = (state: FileState | undefined, isRemote: boolean) => {
    if (!state) return isRemote ? f.notDownloaded : "";
    if (state.state === "downloading") return f.downloading(Math.round(state.progress * 100));
    if (state.state === "error") return f.error(state.reason);
    if (state.state === "too-large") return f.tooLarge(bytes(sync.quota?.maxFileBytes ?? 0));
    if (state.state === "quota") return f.full;
    return state.state === "uploading" ? f.uploading : f.waiting;
  };
  const download = async (id: string, name: string) => {
    const result = await downloadProjectFile(id).catch(() => "server" as const);
    setStatus(result === "ok" ? f.downloaded(name) : f.error(result));
  };
  const [reading, setReading] = useState<AbortController>();
  const [removing, setRemoving] = useState<{ id: string; name: string; remote: boolean }>();
  const fileInput = useRef<HTMLInputElement>(null);
  // Reading stops when the screen closes.
  useEffect(() => () => reading?.abort(), [reading]);
  const changeFiles = async (change: (all: typeof held.files) => typeof held.files, done: string) => {
    try {
      holdProjects({ files: await vault.changeProjectFiles(change) });
      setStatus(done);
    } catch (error) {
      setStatus(t.problem(projectProblem(error)));
    }
  };
  const addFile = async (file: File) => {
    const abort = new AbortController();
    setReading(abort);
    setStatus(t.reading);
    try {
      const extracted = await extract(file, abort.signal, () => {});
      await changeFiles((all) => {
        // Files listed by another device and not downloaded here count toward the limits too.
        const here = remoteCharacters(project.id);
        const elsewhere =
          Object.entries(all)
            .filter(([id]) => id !== project.id)
            .reduce((sum, [, list]) => sum + charactersOf(list), 0) +
          remoteCharacters() -
          here;
        if (remote.length + (all[project.id]?.length ?? 0) >= PROJECT_LIMITS.files) throw new ProjectError("files");
        if (remote.some((entry) => entry.name === extracted.name)) throw new ProjectError("duplicate");
        const next = addProjectFile(extracted, elsewhere + here)(all[project.id] ?? []);
        if (charactersOf(next) + here > PROJECT_LIMITS.characters) throw new ProjectError("characters");
        return { ...all, [project.id]: next };
      }, t.fileAdded(file.name));
    } catch (error) {
      // Extraction messages are already in the interface language.
      if (!abort.signal.aborted) setStatus((error as Error).message);
    } finally {
      setReading(undefined);
    }
  };
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    heading.current?.focus();
    return () => {
      element?.close();
      if (trigger?.isConnected && !trigger.matches(":disabled") && trigger.checkVisibility())
        trigger.focus();
      else document.getElementById("message-input")?.focus();
    };
  }, []);
  const saved = project.instructions ?? "";
  const length = instructions.trim().length;
  const tooLong = length > PROJECT_LIMITS.instructions;
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      onKeyDown={containDialogFocus}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        // React passes a nested dialog's cancel up to here; only this dialog's own closes it.
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
    >
      <header className="project-dialog-header">
        <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>
          <Icon name="folder" />
          {project.name}
        </h2>
        <button type="button" className="icon-button" aria-label={t.close} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="project-dialog-actions">
        <button type="button" className="primary" disabled={busy} onClick={onNewChat}>
          <Icon name="plus" />
          {t.newChat}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-expanded={renaming}
          onClick={() => {
            setName(project.name);
            setRenaming(!renaming);
          }}
        >
          <Icon name="edit" />
          {t.rename}
        </button>
        <button type="button" disabled={busy} onClick={() => setDeleting(true)}>
          {t.delete}
        </button>
      </div>
      {renaming && (
        <form
          className="project-rename"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onRename(name)) {
              setRenaming(false);
              setStatus(t.renamed);
            }
          }}
        >
          <label htmlFor={`${id}-name`}>{t.nameLabel}</label>
          <input
            id={`${id}-name`}
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="row">
            <button type="submit" disabled={busy || !name.trim()}>
              {t.saveName}
            </button>
            <button type="button" onClick={() => setRenaming(false)}>
              {t.cancel}
            </button>
          </div>
        </form>
      )}
      <p className="project-status" aria-live="polite">
        {status}
      </p>
      <section className="project-section" aria-labelledby={`${id}-instructions`}>
        <h3 id={`${id}-instructions`}>{t.instructions}</h3>
        <p className="muted">{t.instructionsIntro}</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await onChange(setInstructions(project.id, instructions));
              setDraft(instructions.trim());
              setStatus(instructions.trim() ? t.instructionsSaved : t.instructionsCleared);
            } catch (error) {
              setStatus(t.problem(projectProblem(error)));
            }
          }}
        >
          <label className="sr-only" htmlFor={`${id}-text`}>
            {t.instructions}
          </label>
          <textarea
            id={`${id}-text`}
            rows={5}
            placeholder={t.instructionsHint}
            value={instructions}
            aria-invalid={tooLong}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="project-row">
            <span className={tooLong ? "warning" : "muted"}>
              {tooLong ? t.problem("long") : t.length(length, PROJECT_LIMITS.instructions)}
            </span>
            <button type="submit" disabled={busy || tooLong || instructions.trim() === saved}>
              {t.saveInstructions}
            </button>
          </div>
        </form>
      </section>
      <section className="project-section" aria-labelledby={`${id}-files`}>
        <h3 id={`${id}-files`}>{t.files}</h3>
        <p className="muted">{t.filesIntro}</p>
        <p className="muted">{t.notInBackup}</p>
        {sync.enabled && <p className="muted">{f.intro}</p>}
        {sync.enabled && sync.quota && (
          <p className="muted">
            {f.quota(bytes(sync.quota.usedBytes), bytes(sync.quota.limitBytes), bytes(Math.max(0, sync.quota.limitBytes - sync.quota.usedBytes)))}
          </p>
        )}
        <div className="project-row">
          <span>
            {t.filesLimits(
              rows.length,
              PROJECT_LIMITS.files,
              (charactersOf(files) + remoteCharacters(project.id)).toLocaleString(locale),
              PROJECT_LIMITS.characters.toLocaleString(locale),
            )}
          </span>
          <input
            ref={fileInput}
            type="file"
            hidden
            aria-label={t.addFile}
            accept={FILE_ACCEPT}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void addFile(file);
            }}
          />
          <button
            type="button"
            disabled={busy || !!reading || rows.length >= PROJECT_LIMITS.files}
            onClick={() => fileInput.current?.click()}
          >
            <Icon name="plus" />
            {t.addFile}
          </button>
        </div>
        {!rows.length ? (
          <p className="muted">{t.noFiles}</p>
        ) : (
          <ul className="project-files" aria-label={t.files}>
            {rows.map((file) => {
              const state = sync.enabled ? sync.states[file.id] : undefined;
              const label = sync.enabled ? stateText(state, file.remote) : "";
              const downloading = state?.state === "downloading";
              return (
                <li key={file.id}>
                  <span>
                    {file.name} <small>{t.fileSize(file.characters.toLocaleString(locale))}</small>
                    {label && <small className={`project-file-state${state?.state === "error" ? " warning" : ""}`}>{label}</small>}
                    {downloading && <progress max={1} value={state.progress} aria-label={f.progressLabel(file.name)} />}
                  </span>
                  <span className="project-file-actions">
                    {file.remote && !downloading && (
                      <button
                        type="button"
                        aria-label={state?.state === "error" ? f.retryFile(file.name) : f.downloadFile(file.name)}
                        disabled={busy}
                        onClick={() => void download(file.id, file.name)}
                      >
                        {state?.state === "error" ? f.retry : f.download}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={t.removeFile(file.name)}
                      disabled={busy || !!reading || downloading}
                      onClick={() => setRemoving(file)}
                    >
                      {t.remove}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="project-section" aria-labelledby={`${id}-chats`}>
        <h3 id={`${id}-chats`}>{t.chats}</h3>
        {!chats.length ? (
          <p className="muted">{t.noChats}</p>
        ) : (
          <ul className="project-chats">
            {chats.map((c) => (
              <li key={c.id}>
                <button type="button" disabled={busy} onClick={() => onOpenChat(c)}>
                  <Icon name="chat" />
                  <span>{conversationTitle(c)}</span>
                  {c.archived && <small>{t.archived}</small>}
                  <small>{new Date(c.createdAt).toLocaleDateString(locale)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {removing && (
        <ConfirmDialog
          title={t.removeFileTitle(removing.name)}
          text={sync.enabled ? f.removeText : t.removeFileText}
          confirmLabel={t.remove}
          cancelLabel={t.cancel}
          fallback={() => fileInput.current?.nextElementSibling as HTMLElement | null}
          onClose={(confirmed) => {
            setRemoving(undefined);
            if (confirmed && removing.remote)
              void removeSyncedProjectFile(removing.id).then(
                () => setStatus(t.fileRemoved),
                () => setStatus(t.problem("failed")),
              );
            else if (confirmed)
              void changeFiles(
                (all) => ({ ...all, [project.id]: removeProjectFile(removing.id)(all[project.id] ?? []) }),
                t.fileRemoved,
              );
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle(project.name)}
          text={t.deleteText}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          fallback={() => heading.current}
          onClose={(confirmed) => {
            setDeleting(false);
            if (confirmed) void onDelete(chats.length > 0 && deleteChats);
            setDeleteChats(false);
          }}
        >
          {chats.length > 0 && (
            <fieldset className="project-delete-choice">
              <legend className="sr-only">{t.chats}</legend>
              <label>
                <input
                  type="radio"
                  name={`${id}-chats`}
                  checked={!deleteChats}
                  onChange={() => setDeleteChats(false)}
                />
                {t.keepChats}
              </label>
              <label>
                <input
                  type="radio"
                  name={`${id}-chats`}
                  checked={deleteChats}
                  onChange={() => setDeleteChats(true)}
                />
                {t.deleteChats(chats.length)}
              </label>
            </fieldset>
          )}
        </ConfirmDialog>
      )}
    </dialog>
  );
}
