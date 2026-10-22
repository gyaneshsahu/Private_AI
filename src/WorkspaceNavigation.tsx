import { containDialogFocus } from "./dialog-focus";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppStatus, Conversation } from "../shared/contracts";
import { conversationTitle, findConversations } from "./conversation-library";
import type { Project } from "./projects";
import { Icon } from "./Icon";

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
      ? `Account ${status.accountId.slice(0, 8)}`
      : "Local development session");
  const allowance = status?.requestAllowance;
  const usage =
    allowance && allowance.state !== "unavailable"
      ? `${allowance.remaining} of ${allowance.limit} requests remaining`
      : "Usage unavailable · No active plan shown";
  const body = (
    <aside className="sidebar" aria-label="Chat navigation">
      <div className="sidebar-heading">
        <a className="brand" href="/" aria-label="PrivateAI home">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          Private<span>AI</span>
        </a>
        <button
          className="icon-button"
          aria-label={drawer ? "Close navigation" : "Collapse navigation"}
          onClick={drawer ? onClose : onCollapse}
        >
          <Icon name={drawer ? "close" : "sidebar"} />
        </button>
      </div>
      {collapsed && !narrow && (
        <button onClick={onExpand}>
          <Icon name="sidebar" />
          Keep sidebar open
        </button>
      )}
      <button
        className="new-chat"
        onClick={() =>
          onNew(projects.some((p) => p.id === filter) ? filter : undefined)
        }
        disabled={newDisabled}
        aria-label="New conversation"
      >
        <Icon name="plus" />
        New chat
      </button>
      <button
        className="new-chat new-incognito"
        onClick={onNewIncognito}
        disabled={newDisabled}
        aria-label="New incognito chat"
        title="Never saved on this device; gone when you close, lock or sign out"
      >
        <Icon name="shield" />
        Incognito chat
      </button>
      {unlocked ? (
        <>
          <label className="history-search">
            <span>
              <Icon name="search" />
              Search chats
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this vault"
            />
          </label>
          <div className="navigation-history">
            <div className="section-heading">
              <h2>Projects</h2>
              <button
                className="icon-button"
                aria-label="Create project"
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
                  Project name
                  <input
                    autoFocus
                    value={projectName}
                    maxLength={80}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </label>
                <div className="row">
                  <button type="submit" disabled={busy || !projectName.trim()}>
                    {editingProject ? "Save project name" : "Create"}
                  </button>
                  <button type="button" onClick={() => setCreating(false)}>
                    Cancel
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
                    <summary aria-label={`Actions for project ${p.name}`}>
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
                        Rename project
                      </button>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          if (
                            confirm(
                              `Remove project “${p.name}”? Its chats will be kept without a project, including archived chats.`,
                            ) &&
                            (await onEditProject(p.id))
                          ) {
                            setFilter("recent");
                            setCreating(false);
                          }
                        }}
                      >
                        Remove project
                      </button>
                    </div>
                  </details>
                </div>
              ))}
            </div>
            {!projects.length && (
              <p className="sidebar-hint">Group saved chats by project.</p>
            )}
            <div className="history-filters">
              <button
                aria-pressed={filter === "recent"}
                onClick={() => setFilter("recent")}
              >
                <Icon name="chat" />
                Recent
              </button>
              <button
                aria-pressed={filter === "archived"}
                onClick={() => setFilter("archived")}
              >
                <Icon name="archive" />
                Archived
              </button>
            </div>
            <div className="recent-chats">
              <h2>
                {query
                  ? "Search results"
                  : (projects.find((p) => p.id === filter)?.name ??
                    (filter === "archived"
                      ? "Archived chats"
                      : "Recent conversations"))}
              </h2>
              {!visible.length && (
                <p className="sidebar-hint">
                  {query
                    ? "No matching conversations."
                    : "No saved chats here yet. Save a conversation to keep it."}
                </p>
              )}
              {visible.map((c) => (
                <div className="chat-list-item" key={c.id}>
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
                        aria-label={`Actions for ${conversationTitle(c)}`}
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
                          {c.pinned ? "Unpin" : "Pin"}
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
                          {c.archived ? "Restore chat" : "Archive"}
                        </button>
                        <label>
                          Move to project
                          <select
                            aria-label={`Project for ${conversationTitle(c)}`}
                            disabled={busy}
                            value={c.projectId ?? ""}
                            onChange={(e) =>
                              onOrganize(c, {
                                title: c.title,
                                projectId: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">No project</option>
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
                          Rename &amp; manage
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
          <h2>Your conversations</h2>
          <p>
            Unlock your local vault to search and organize saved chats and
            projects.
          </p>
          <button onClick={() => onNavigate("Saved")}>
            <Icon name="shield" />
            Unlock history
          </button>
        </div>
      )}
      <nav aria-label="Workspace" className="sidebar-bottom">
        <details className="account-menu">
          <summary aria-label="Account menu">
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
              Account &amp; usage
            </button>
            <button onClick={onSettings}>
              <Icon name="settings" />
              Settings
            </button>
            <button onClick={() => onNavigate("Saved")}>
              <Icon name="archive" />
              Saved · Data controls
            </button>
            <button onClick={() => onNavigate("Help")}>
              <Icon name="help" />
              Help
            </button>
            {status?.accountId && (
              <button disabled={busy} onClick={onSignOut}>
                <Icon name="logout" />
                Sign out
              </button>
            )}
          </div>
        </details>
        <p>
          {unlocked ? "Local vault unlocked" : "Temporary session"} · This
          device
        </p>
      </nav>
    </aside>
  );
  return drawer ? (
    <dialog
      ref={dialog}
      onKeyDown={containDialogFocus}
      className="navigation-drawer"
      aria-label="Navigation"
      onCancel={onClose}
      onClose={onClose}
    >
      {body}
    </dialog>
  ) : (
    body
  );
}
