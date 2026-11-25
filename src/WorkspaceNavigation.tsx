import { feedbackText } from "./text/feedback";
import { ownerText } from "./text/owner";
import { sidePanelsText } from "./text/side-panels";
import { BrandLockup } from "./CometMark";
import { UsageMeter } from "./UsageMeter";
import { containDialogFocus } from "./dialog-focus";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppStatus, Conversation } from "../shared/contracts";
import { conversationTitle, dateGroup, findConversations, lastActivity } from "./conversation-library";
import type { Project } from "./projects";
import { Icon } from "./Icon";
import { useLang, useText } from "./i18n";
import { savedListText } from "./text/saved-list";
import { workspaceText } from "./text/workspace";
import { projectText } from "./text/projects";
import { projectSpacesEnabled } from "./device-features";
import { scheduledText } from "./text/scheduled";
import { messageActionsText } from "./text/message-actions";
import { ChatMenuItems } from "./ChatMenuItems";
import { ConfirmDialog } from "./ConfirmDialog";
import { ProjectDeleteDialog } from "./ProjectDeleteDialog";
import { shortcutsText } from "./text/shortcuts";
import { forStorage, modeCopyText, type Storage } from "./text/mode-copy";
import { settingsText } from "./text/settings";

export function WorkspaceNavigation(props: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  conversations: Conversation[];
  projects: Project[];
  unlocked: boolean;
  busy: boolean;
  newDisabled: boolean;
  currentId: string;
  status?: AppStatus;
  onOpen: (c: Conversation) => void;
  onNew: (projectId?: string) => void;
  onNewIncognito: () => void;
  onNavigate: (tab: "Saved" | "Account" | "Help") => void;
  onSettings: () => void;
  /** Counts up when Settings asks for the archived chats: the list switches to Archived. */
  showArchived?: number;
  /** Secure only: replaces "Loading your chats" when the store could not open. */
  loadingNote?: string;
  onSignOut: () => void;
  onCreateProject: (name: string) => Promise<string | undefined>;
  onEditProject: (id: string, name?: string) => Promise<boolean>;
  /** The project screen (docs/projects-20261114.md); offered only while its switch is on. The row and Create open it. */
  onOpenProject?: (id: string) => void;
  /** Deletes the project, and its chats when chosen; resolves true when it is gone. Without it the chats are kept. */
  onDeleteProject?: (id: string, deleteChats: boolean) => Promise<boolean>;
  /** Where these projects are kept, as given to ProjectPanel; decides what the delete question promises. */
  projectStorage?: Storage;
  /** Where the normal list's chats are kept: decides what the search box, list and footer may promise. */
  storage?: Storage;
  /** Opens the keyboard shortcuts list (src/ShortcutHelp.tsx); the account menu entry is shown only when given. */
  onShortcuts?: () => void;
  /** The Scheduled screen (docs/scheduled-20261115.md); absent while its switch is off. */
  onScheduled?: () => void;
  /** Whiteboard: a new chat with the board open (absent when the whiteboard is off). */
  onWhiteboard?: () => void;
  /** A background task exists: the entry keeps its badge. */
  backgroundActive?: boolean;
  /** The quiet sync status (src/SyncScreens.tsx), only when the deployment has sync. */
  syncIndicator?: ReactNode;
  /** The Secure Max section (src/SecureMaxSection.tsx with src/SecureMaxLists.tsx), below the normal lists; absent while it is not offered. */
  maxSection?: ReactNode;
  onOrganize: (
    c: Conversation,
    change: Pick<Conversation, "pinned" | "archived" | "projectId" | "title">,
  ) => void;
  /** Deletes the saved chat after the row menu's confirmation; the entry is shown only when given. */
  onDelete?: (c: Conversation) => void;
  /** Starts a new chat inside this project, from the project's own menu; the entry is shown only when given. */
  onNewChatInProject?: (projectId: string) => void;
  /** Opens the owner's dashboard (docs/analytics-20261125.md); given only for an account on the owner list. */
  onOwnerDashboard?: () => void;
  /** Opens the feedback form (docs/feedback-20261125.md); given only while feedback is switched on. */
  onFeedback?: () => void;
}) {
  const {
    open,
    collapsed,
    onClose,
    onCollapse,
    onExpand,
    conversations,
    projects,
    unlocked,
    busy,
    newDisabled,
    currentId,
    status,
    onOpen,
    onNew,
    onNewIncognito,
    onNavigate,
    onSettings,
    showArchived,
    loadingNote,
    onSignOut,
    onCreateProject,
    onEditProject,
    onOpenProject,
    onDeleteProject,
    projectStorage,
    storage,
    onShortcuts,
    onScheduled,
    backgroundActive,
    onOrganize,
    onDelete,
    syncIndicator,
    maxSection,
  } = props;
  const { lang } = useLang();
  // Mode texts (src/text/mode-copy.ts) replace the device-vault wording where chats are kept with the account.
  const t = forStorage(useMemo(() => ({ ...workspaceText[lang], ...modeCopyText[lang] }), [lang]), storage);
  const ma = useText(messageActionsText);
  // Rename in place: the row becomes a field. The ref ends it once (Enter, Escape or leaving the field).
  const [renaming, setRenaming] = useState<string>();
  const [renameDraft, setRenameDraft] = useState("");
  const renameRef = useRef<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<Conversation>();
  const [deletingProject, setDeletingProject] = useState<Project>();
  const sk = useText(shortcutsText);
  const finishRename = (c: Conversation, save: boolean, refocus: boolean) => {
    if (renameRef.current !== c.id) return;
    renameRef.current = undefined;
    setRenaming(undefined);
    const title = renameDraft.trim();
    if (save && title && title !== conversationTitle(c)) onOrganize(c, { title });
    if (refocus) requestAnimationFrame(() => document.getElementById(`chat-row-${c.id}`)?.focus());
  };
  const pt = useText(projectText);
  const groups = useText(savedListText);
  const st = useText(scheduledText);
  const sp = useText(sidePanelsText);
  // Pinned chats first under their own heading, the rest by the day they were last used.
  const groupOf = (c: Conversation) => (c.pinned ? "pinned" : dateGroup(lastActivity(c)));
  const dialog = useRef<HTMLDialogElement>(null);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("recent");
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<string>();
  const [projectName, setProjectName] = useState("");
  const drawer = narrow || collapsed;
  // The project screen exists only while its switch is on; otherwise a project row filters the list.
  const openProject = projectSpacesEnabled() ? onOpenProject : undefined;
  const visible = useMemo(
    () =>
      findConversations(conversations, query, "newest")
        .filter((c) =>
          filter === "archived"
            ? c.archived
            : !c.archived && (filter === "recent" || c.projectId === filter),
        )
        .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)),
    [conversations, query, filter],
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 760px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (drawer && open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [drawer, open]);
  useEffect(() => {
    if (!unlocked) {
      setQuery("");
      setFilter("recent");
      setCreating(false);
      setProjectName("");
    }
  }, [unlocked]);
  useEffect(() => {
    if (!showArchived) return;
    setQuery("");
    setFilter("archived");
    // After Settings has closed and given the focus back: the Archived filter takes it.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".history-filters button:nth-child(2)")?.focus());
  }, [showArchived]);
  const identity =
    status?.accountEmail ??
    (status?.accountId
      ? t.account(status.accountId.slice(0, 8))
      : t.localSession);
  const allowance = status?.requestAllowance;
  const usage =
    allowance && allowance.state !== "unavailable"
      ? t.usage(allowance.remaining, allowance.limit)
      : t.usageUnavailable;
  const body = (
    <aside className="sidebar" aria-label={t.chatNavigation}>
      <div className="sidebar-heading">
        <a className="brand" href="/" aria-label={t.home}>
          <BrandLockup />
        </a>
        <button
          className="icon-button"
          aria-label={drawer ? t.closeNavigation : t.collapseNavigation}
          onClick={drawer ? onClose : onCollapse}
        >
          <Icon name={drawer ? "close" : "sidebar"} />
        </button>
      </div>
      {collapsed && !narrow && (
        <button onClick={onExpand}>
          <Icon name="sidebar" />
          {t.keepOpen}
        </button>
      )}
      <div className="new-chat-row">
        <button
          className="new-chat"
          onClick={() =>
            onNew(projects.some((p) => p.id === filter) ? filter : undefined)
          }
          disabled={newDisabled}
          aria-label={t.newConversation}
        >
          <Icon name="plus" />
          {t.newChat}
        </button>
        <button
          className="new-chat new-incognito"
          onClick={onNewIncognito}
          disabled={newDisabled}
          aria-label={t.newIncognito}
          title={t.incognitoTitle}
        >
          <Icon name="incognito" />
          {t.incognito}
        </button>
      </div>
      {/* Secure Max sits with the other ways to start a chat (owner, 17 November), not at the bottom. */}
      {maxSection}
      {props.onWhiteboard && (
        <button className="whiteboard-entry" onClick={props.onWhiteboard} disabled={newDisabled} aria-label={sp.newWhiteboard}>
          <Icon name="whiteboard" />
          <span>{sp.whiteboard}</span>
        </button>
      )}
      {onScheduled && (
        <button
          className="scheduled-entry"
          onClick={onScheduled}
          aria-label={backgroundActive ? st.menuBackground : undefined}
        >
          <Icon name="clock" />
          <span>{st.menu}</span>
          {backgroundActive && (
            <span className="background-dot" title={st.background} aria-hidden="true">
              {st.background}
            </span>
          )}
        </button>
      )}
      {unlocked ? (
        <>
          <label className="history-search">
            <span>
              <Icon name="search" />
              {t.searchChats}
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
            />
          </label>
          <div className="navigation-history">
            <div className="section-heading">
              <h2>{t.projects}</h2>
              <button
                className="icon-button"
                aria-label={t.createProject}
                disabled={busy}
                onClick={() => {
                  setEditingProject(undefined);
                  setProjectName("");
                  setCreating(!creating);
                }}
              >
                <Icon name="plus" />
              </button>
            </div>
            {creating && (
              <form
                className="project-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const id = editingProject
                    ? (await onEditProject(editingProject, projectName))
                      ? editingProject
                      : undefined
                    : await onCreateProject(projectName);
                  if (id) {
                    setFilter(id);
                    setProjectName("");
                    setCreating(false);
                    setEditingProject(undefined);
                    // A new project opens its screen, so instructions and files can be added right away.
                    if (!editingProject) openProject?.(id);
                  }
                }}
              >
                <label>
                  {t.projectName}
                  <input
                    autoFocus
                    value={projectName}
                    maxLength={80}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </label>
                <div className="row">
                  <button type="submit" disabled={busy || !projectName.trim()}>
                    {editingProject ? t.saveProjectName : t.create}
                  </button>
                  <button type="button" onClick={() => setCreating(false)}>
                    {t.cancel}
                  </button>
                </div>
              </form>
            )}
            <div className="project-list">
              {projects.map((p) => (
                <div className="project-row" key={p.id}>
                  <button
                    className={filter === p.id ? "selected" : ""}
                    aria-pressed={filter === p.id}
                    disabled={!!openProject && busy}
                    onClick={() => {
                      // The list also shows the project's chats, so New chat and closing the screen land in it.
                      setFilter(p.id);
                      openProject?.(p.id);
                    }}
                  >
                    <Icon name="folder" />
                    <span>{p.name}</span>
                    <small>
                      {
                        conversations.filter(
                          (c) => c.projectId === p.id && !c.archived,
                        ).length
                      }
                    </small>
                  </button>
                  <details className="project-actions">
                    <summary id={`project-menu-${p.id}`} aria-label={t.projectActions(p.name)}>
                      <Icon name="more" />
                    </summary>
                    <div>
                      {props.onNewChatInProject && (
                        <button disabled={busy || newDisabled} onClick={() => props.onNewChatInProject!(p.id)}>
                          <Icon name="plus" />
                          {pt.newChat}
                        </button>
                      )}
                      {openProject && (
                        <button disabled={busy} onClick={() => openProject(p.id)}>
                          <Icon name="folder" />
                          {pt.open}
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => {
                          setEditingProject(p.id);
                          setProjectName(p.name);
                          setCreating(true);
                        }}
                      >
                        <Icon name="edit" />
                        {t.renameProject}
                      </button>
                      <button
                        className="chat-menu-danger"
                        disabled={busy}
                        onClick={(e) => {
                          e.currentTarget.closest("details")!.open = false;
                          setDeletingProject(p);
                        }}
                      >
                        <Icon name="trash" />
                        {pt.delete}
                      </button>
                    </div>
                  </details>
                </div>
              ))}
            </div>
            <div className="history-filters">
              <button
                aria-pressed={filter === "recent"}
                onClick={() => setFilter("recent")}
              >
                <Icon name="chat" />
                {t.recent}
              </button>
              <button
                aria-pressed={filter === "archived"}
                onClick={() => setFilter("archived")}
              >
                <Icon name="archive" />
                {t.archived}
              </button>
            </div>
            <div className="recent-chats">
              {/* Recent or Archived is already said by the pressed tab above: the heading is for screen readers then. */}
              <h2 className={!query && (filter === "recent" || filter === "archived") ? "sr-only" : undefined}>
                {query
                  ? t.searchResults
                  : (projects.find((p) => p.id === filter)?.name ??
                    (filter === "archived"
                      ? t.archivedChats
                      : t.recentConversations))}
              </h2>
              {!visible.length && (
                <p className="sidebar-hint">
                  {query ? t.noMatch : t.noSaved}
                </p>
              )}
              {visible.map((c, index) => (
                <div className="chat-list-item" key={c.id}>
                  {!query &&
                    groupOf(c) !== (index ? groupOf(visible[index - 1]) : "") && (
                      <h3 className="chat-group">{groups[groupOf(c)]}</h3>
                    )}
                  <div className="chat-list-row">
                    {renaming === c.id ? (
                      <input
                        className="chat-rename"
                        autoFocus
                        aria-label={ma.chatName(conversationTitle(c))}
                        value={renameDraft}
                        maxLength={120}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== "Escape") return;
                          // Escape cancels here only: it must not close the drawer or a menu.
                          e.preventDefault();
                          e.stopPropagation();
                          finishRename(c, e.key === "Enter", true);
                        }}
                        onBlur={() => finishRename(c, true, false)}
                      />
                    ) : (
                      <button
                        id={`chat-row-${c.id}`}
                        disabled={busy}
                        aria-current={c.id === currentId ? "page" : undefined}
                        onClick={() => onOpen(c)}
                      >
                        {c.pinned && <Icon name="pin" />}
                        <span>{conversationTitle(c)}</span>
                      </button>
                    )}
                    {/* The menu sits inside the scrolling chat list: opening it scrolls the list so all of it shows. */}
                    <details
                      className="chat-item-menu"
                      onToggle={(event) => {
                        const menu = event.currentTarget;
                        if (menu.open) requestAnimationFrame(() => (menu.querySelector(".chat-item-actions") ?? menu).scrollIntoView({ block: "nearest" }));
                      }}
                    >
                      <summary
                        id={`chat-menu-${c.id}`}
                        aria-label={t.chatActions(conversationTitle(c))}
                      >
                        <Icon name="more" />
                      </summary>
                      <div className="chat-item-actions chat-menu-popover">
                        <ChatMenuItems
                          chat={c}
                          projects={projects}
                          busy={busy}
                          close={() => document.getElementById(`chat-menu-${c.id}`)?.closest("details")?.removeAttribute("open")}
                          onOrganize={onOrganize}
                          onRename={() => {
                            renameRef.current = c.id;
                            setRenameDraft(conversationTitle(c));
                            setRenaming(c.id);
                          }}
                          onCreateProject={onCreateProject}
                          onDelete={onDelete ? () => setDeleting(c) : undefined}
                        />
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="history-locked">
          <h2>{t.yourConversations}</h2>
          {/* Secure opens by itself after sign-in: nothing to unlock, only a short wait. */}
          {storage === "secure" ? (
            <p>{loadingNote ?? settingsText[lang].loadingChats}</p>
          ) : (
            <>
              <p>{t.unlockNote}</p>
              <button onClick={() => onNavigate("Saved")}>
                <Icon name="shield" />
                {t.unlockHistory}
              </button>
            </>
          )}
        </div>
      )}
      {deleting && onDelete && (
        <ConfirmDialog
          title={groups.deleteTitle}
          text={groups.deleteText(conversationTitle(deleting))}
          confirmLabel={groups.deleteConfirm}
          cancelLabel={t.cancel}
          // Kept: back to the row's "…"; deleted: to the search field.
          fallback={() =>
            document.getElementById(`chat-menu-${deleting.id}`) ??
            document.querySelector<HTMLElement>(".history-search input")
          }
          onClose={(confirmed) => {
            setDeleting(undefined);
            if (confirmed) onDelete(deleting);
          }}
        />
      )}
      {deletingProject && (() => {
        const p = deletingProject;
        const chats = conversations.filter((c) => c.projectId === p.id).length;
        const choice = !!onDeleteProject && chats > 0;
        return (
          <ProjectDeleteDialog
            name={p.name}
            text={
              choice
                ? projectSpacesEnabled() ? forStorage(pt, projectStorage).deleteText : t.deleteProjectChoose
                : projectSpacesEnabled() ? `${pt.removeAlso} ${t.deleteProjectKeeps}` : t.deleteProjectKeeps
            }
            chats={choice ? chats : 0}
            // Kept: back to the row's "…"; deleted: to the create button.
            fallback={() =>
              document.getElementById(`project-menu-${p.id}`) ??
              document.querySelector<HTMLElement>(".navigation-history .section-heading button")
            }
            onClose={async (confirmed, deleteChats) => {
              setDeletingProject(undefined);
              if (!confirmed) return;
              const gone = onDeleteProject ? await onDeleteProject(p.id, deleteChats) : await onEditProject(p.id);
              if (gone) {
                setFilter("recent");
                setCreating(false);
              }
            }}
          />
        );
      })()}
      <nav aria-label={t.workspace} className="sidebar-bottom">
        <details className="account-menu">
          <summary aria-label={t.accountMenu}>
            <span className="account-avatar">
              <Icon name="user" />
            </span>
            <span className="account-label">
              <strong>{identity}</strong>
              <small>{usage}</small>
            </span>
            <Icon name="more" />
          </summary>
          <div className="account-popover">
            <p className="account-identity">{identity}</p>
            <p className="muted">{usage}</p>
            {status?.metering && <UsageMeter compact refresh={status} />}
            <button onClick={() => onNavigate("Account")}>
              <Icon name="usage" />
              {t.accountUsage}
            </button>
            <button onClick={onSettings}>
              <Icon name="settings" />
              {t.settings}
            </button>
            <button onClick={() => onNavigate("Saved")}>
              <Icon name="drive" />
              {t.savedData}
            </button>
            {props.onOwnerDashboard && (
              <button type="button" onClick={props.onOwnerDashboard}>
                <Icon name="usage" />
                {ownerText[lang].menu}
              </button>
            )}
            <button onClick={() => onNavigate("Help")}>
              <Icon name="help" />
              {t.help}
            </button>
            {props.onFeedback && (
              <button type="button" onClick={props.onFeedback}>
                <Icon name="chat" />
                {feedbackText[lang].menu}
              </button>
            )}
            {onShortcuts && (
              <button type="button" onClick={onShortcuts}>
                <Icon name="keyboard" />
                {sk.menuEntry}
              </button>
            )}
            {status?.accountId && (
              <button disabled={busy} onClick={onSignOut}>
                <Icon name="logout" />
                {t.signOut}
              </button>
            )}
          </div>
        </details>
        <p>{[unlocked ? t.vaultUnlocked : storage === "secure" ? (loadingNote ? "" : settingsText[lang].loadingChats) : t.temporarySession, t.thisDevice].filter(Boolean).join(" · ")}</p>
        {syncIndicator}
      </nav>
    </aside>
  );
  return drawer ? (
    <dialog
      ref={dialog}
      onKeyDown={containDialogFocus}
      className="navigation-drawer"
      aria-label={t.navigation}
      // Only the drawer's own events: React passes a nested dialog's close and cancel (the Secure Max explanation) up the tree.
      onCancel={(event) => event.target === event.currentTarget && onClose()}
      onClose={(event) => event.target === event.currentTarget && onClose()}
    >
      {body}
    </dialog>
  ) : (
    body
  );
}
