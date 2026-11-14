import { containDialogFocus } from "./dialog-focus";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppStatus, Conversation } from "../shared/contracts";
import { conversationTitle, dateGroup, findConversations } from "./conversation-library";
import type { Project } from "./projects";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import { savedListText } from "./text/saved-list";
import { workspaceText } from "./text/workspace";

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
  onSignOut: () => void;
  onCreateProject: (name: string) => Promise<string | undefined>;
  onEditProject: (id: string, name?: string) => Promise<boolean>;
  onOrganize: (
    c: Conversation,
    change: Pick<Conversation, "pinned" | "archived" | "projectId" | "title">,
  ) => void;
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
    onSignOut,
    onCreateProject,
    onEditProject,
    onOrganize,
  } = props;
  const t = useText(workspaceText);
  const groups = useText(savedListText);
  // Pinned chats first under their own heading, the rest by the day they were created.
  const groupOf = (c: Conversation) => (c.pinned ? "pinned" : dateGroup(c.createdAt));
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
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          Comet<span>Row</span>
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
          <Icon name="shield" />
          {t.incognito}
        </button>
      </div>
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
                    onClick={() => setFilter(p.id)}
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
                    <summary aria-label={t.projectActions(p.name)}>
                      <Icon name="more" />
                    </summary>
                    <div>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setEditingProject(p.id);
                          setProjectName(p.name);
                          setCreating(true);
                        }}
                      >
                        {t.renameProject}
                      </button>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          if (
                            confirm(t.confirmRemoveProject(p.name)) &&
                            (await onEditProject(p.id))
                          ) {
                            setFilter("recent");
                            setCreating(false);
                          }
                        }}
                      >
                        {t.removeProject}
                      </button>
                    </div>
                  </details>
                </div>
              ))}
            </div>
            {!projects.length && (
              <p className="sidebar-hint">{t.groupHint}</p>
            )}
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
              <h2>
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
                    <button
                      disabled={busy}
                      aria-current={c.id === currentId ? "page" : undefined}
                      onClick={() => onOpen(c)}
                    >
                      {c.pinned && <Icon name="pin" />}
                      <span>{conversationTitle(c)}</span>
                    </button>
                    <details className="chat-item-menu">
                      <summary
                        aria-label={t.chatActions(conversationTitle(c))}
                      >
                        <Icon name="more" />
                      </summary>
                      <div className="chat-item-actions">
                        <button
                          disabled={busy}
                          onClick={() =>
                            onOrganize(c, { title: c.title, pinned: !c.pinned })
                          }
                        >
                          <Icon name="pin" />
                          {c.pinned ? t.unpin : t.pin}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            onOrganize(c, {
                              title: c.title,
                              archived: !c.archived,
                            })
                          }
                        >
                          <Icon name="archive" />
                          {c.archived ? t.restoreChat : t.archive}
                        </button>
                        <label>
                          {t.moveToProject}
                          <select
                            aria-label={t.projectFor(conversationTitle(c))}
                            disabled={busy}
                            value={c.projectId ?? ""}
                            onChange={(e) =>
                              onOrganize(c, {
                                title: c.title,
                                projectId: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">{t.noProject}</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          disabled={busy}
                          onClick={() => {
                            onOpen(c);
                            onNavigate("Saved");
                          }}
                        >
                          <Icon name="edit" />
                          {t.renameManage}
                        </button>
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
          <p>{t.unlockNote}</p>
          <button onClick={() => onNavigate("Saved")}>
            <Icon name="shield" />
            {t.unlockHistory}
          </button>
        </div>
      )}
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
            <button onClick={() => onNavigate("Account")}>
              <Icon name="usage" />
              {t.accountUsage}
            </button>
            <button onClick={onSettings}>
              <Icon name="settings" />
              {t.settings}
            </button>
            <button onClick={() => onNavigate("Saved")}>
              <Icon name="archive" />
              {t.savedData}
            </button>
            <button onClick={() => onNavigate("Help")}>
              <Icon name="help" />
              {t.help}
            </button>
            {status?.accountId && (
              <button disabled={busy} onClick={onSignOut}>
                <Icon name="logout" />
                {t.signOut}
              </button>
            )}
          </div>
        </details>
        <p>
          {unlocked ? t.vaultUnlocked : t.temporarySession} · {t.thisDevice}
        </p>
      </nav>
    </aside>
  );
  return drawer ? (
    <dialog
      ref={dialog}
      onKeyDown={containDialogFocus}
      className="navigation-drawer"
      aria-label={t.navigation}
      onCancel={onClose}
      onClose={onClose}
    >
      {body}
    </dialog>
  ) : (
    body
  );
}
