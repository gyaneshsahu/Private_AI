// The project screen (docs/projects-20261114.md): a project's chats, instructions and files, with
// "New chat in this project", rename and delete. Everything it shows and changes is in the vault.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { projectMemoryEnabled } from "./device-features";
import { ProjectMemory } from "./project-memory/ProjectMemory";
import type { Conversation } from "../shared/contracts";
import { ConfirmDialog } from "./ConfirmDialog";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { conversationTitle } from "./conversation-library";
import { containDialogFocus } from "./dialog-focus";
import { Icon } from "./Icon";
import { useLang } from "./i18n";
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
import { forStorage, type Storage } from "./text/mode-copy";
import { ChatMenuItems, type Organize } from "./ChatMenuItems";
import { messageActionsText } from "./text/message-actions";
import { savedListText } from "./text/saved-list";
import { workspaceText } from "./text/workspace";
import { projectText } from "./text/projects";
import { syncFilesText } from "./text/sync-files";
// From src/sync/files.ts, not the whole sync API: the screen works the same without sync.
import { downloadProjectFile, removeSyncedProjectFile, useSyncFiles, type FileSlot, type FileState } from "./sync/files";
import type { Vault } from "./vault";

// Pictures are not project files in this pass.
const FILE_ACCEPT = DOCUMENT_ACCEPT.replace(/,\.(png|jpe?g)\b/g, "");

export const projectProblem = (error: unknown) =>
  error instanceof ProjectError ? error.problem : "failed";

export function ProjectPanel({
  vault,
  memoryVault,
  fileSlot = "max",
  storage,
  project,
  chats,
  busy,
  onClose,
  onNewChat,
  onOpenChat,
  onRename,
  projects,
  onOrganizeChat,
  onDeleteChat,
  onDelete,
  onChange,
}: {
  vault: Vault;
  /** Memory per project: the vault that holds memories, when it is open and is this project's own store. */
  memoryVault?: Vault;
  /** Which sync serves this project's files: the encrypted sync, or Secure (src/stores.ts). */
  fileSlot?: FileSlot;
  /** Where the project is kept; decides what the texts promise (src/text/mode-copy.ts). */
  storage?: Storage;
  project: Project;
  /** The saved chats of this project, archived ones included. */
  chats: Conversation[];
  busy: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (c: Conversation) => void;
  onRename: (name: string) => Promise<boolean>;
  /** Every project the chats could move to (the same store as this one). */
  projects: readonly Project[];
  /** Rename, pin, archive, move or remove one of the project's chats, as the sidebar does. */
  onOrganizeChat: Organize;
  /** Deletes a chat after the question; the menu entry is shown only when given. */
  onDeleteChat?: (c: Conversation) => void;
  /** Resolves true when the project is gone; then the screen closes. */
  onDelete: (deleteChats: boolean) => Promise<boolean>;
  /** Writes a change of the project list to the vault; throws when nothing was saved. */
  onChange: (change: (projects: Project[]) => Project[]) => Promise<void>;
}) {
  const { lang } = useLang();
  const t = forStorage(projectText[lang], storage);
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [renaming, setRenaming] = useState(false);
  // Rename a chat in place, as in the sidebar: Enter or leaving the field saves, Escape cancels.
  const ma = messageActionsText[lang];
  const [chatRenaming, setChatRenaming] = useState<string>();
  const [deletingChat, setDeletingChat] = useState<Conversation>();
  const groups = savedListText[lang];
  const [chatDraft, setChatDraft] = useState("");
  const chatRenameRef = useRef<string | undefined>(undefined);
  const finishChatRename = (c: Conversation, save: boolean, refocus: boolean) => {
    if (chatRenameRef.current !== c.id) return;
    chatRenameRef.current = undefined;
    setChatRenaming(undefined);
    const title = chatDraft.trim();
    if (save && title && title !== conversationTitle(c)) onOrganizeChat(c, { title });
    if (refocus) requestAnimationFrame(() => document.getElementById(`${id}-menu-${c.id}`)?.focus());
  };
  const [name, setName] = useState(project.name);
  const [instructions, setDraft] = useState(project.instructions ?? "");
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const held = useSyncExternalStore(watchProjects, heldProjects);
  const files = held.files[project.id] ?? [];
  // Synced project files (Stage 3), only while file sync is on for this device.
  const sync = useSyncFiles(fileSlot);
  const f = forStorage(syncFilesText[lang], storage);
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
    const result = await downloadProjectFile(id, fileSlot).catch(() => "server" as const);
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
          <Icon name="trash" />
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
      <div className="project-body">
      <section className="project-section project-chats-section" aria-labelledby={`${id}-chats`}>
        <h3 id={`${id}-chats`}>{t.chats}</h3>
        {!chats.length ? (
          <p className="muted">{t.noChats}</p>
        ) : (
          <ul className="project-chats">
            {chats.map((c) => (
              <li key={c.id}>
                {chatRenaming === c.id ? (
                  <input
                    className="chat-rename"
                    autoFocus
                    aria-label={ma.chatName(conversationTitle(c))}
                    value={chatDraft}
                    maxLength={120}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setChatDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== "Escape") return;
                      // Escape cancels the rename only: it must not close the project screen.
                      e.preventDefault();
                      e.stopPropagation();
                      finishChatRename(c, e.key === "Enter", true);
                    }}
                    onBlur={() => finishChatRename(c, true, false)}
                  />
                ) : (
                  <button type="button" className="project-chat-open" disabled={busy} onClick={() => onOpenChat(c)}>
                    <Icon name="chat" />
                    <span>{conversationTitle(c)}</span>
                    {c.archived && <small>{t.archived}</small>}
                    <small>{new Date(c.createdAt).toLocaleDateString(locale)}</small>
                  </button>
                )}
                {chatRenaming !== c.id && (
                  <details className="chat-item-menu project-chat-menu">
                    <summary id={`${id}-menu-${c.id}`} aria-label={workspaceText[lang].chatActions(conversationTitle(c))}>
                      <Icon name="more" />
                    </summary>
                    <div className="chat-item-actions chat-menu-popover">
                      <ChatMenuItems
                        chat={c}
                        projects={projects}
                        busy={busy}
                        close={() => document.getElementById(`${id}-menu-${c.id}`)?.closest("details")?.removeAttribute("open")}
                        onOrganize={onOrganizeChat}
                        onRename={() => {
                          chatRenameRef.current = c.id;
                          setChatDraft(conversationTitle(c));
                          setChatRenaming(c.id);
                        }}
                        onDelete={onDeleteChat ? () => setDeletingChat(c) : undefined}
                      />
      </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="project-section project-instructions" aria-labelledby={`${id}-instructions`}>
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
      {projectMemoryEnabled() && <ProjectMemory vault={memoryVault} projectId={project.id} />}
      <section className="project-section project-files-section" aria-labelledby={`${id}-files`}>
        <h3 id={`${id}-files`}>{t.files}</h3>
        <p className="muted">{t.filesIntro}</p>
        {t.notInBackup && <p className="muted">{t.notInBackup}</p>}
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
      </div>
      {deletingChat && onDeleteChat && (
        <ConfirmDialog
          title={groups.deleteTitle}
          text={groups.deleteText(conversationTitle(deletingChat))}
          confirmLabel={groups.deleteConfirm}
          cancelLabel={t.cancel}
          fallback={() => heading.current}
          onClose={(confirmed) => {
            const chat = deletingChat;
            setDeletingChat(undefined);
            if (confirmed) onDeleteChat(chat);
          }}
        />
      )}
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
              void removeSyncedProjectFile(removing.id, fileSlot).then(
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
        <ProjectDeleteDialog
          name={project.name}
          text={t.deleteText}
          chats={chats.length}
          fallback={() => heading.current}
          onClose={(confirmed, withChats) => {
            setDeleting(false);
            if (confirmed) void onDelete(withChats);
          }}
        />
      )}
    </dialog>
  );
}

