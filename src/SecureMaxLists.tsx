// What the Secure Max section of the sidebar holds while it is unlocked (docs/secure-store-20261116.md):
// its own new chat, new project, search, projects and chats. Nothing of Secure Max is shown anywhere
// else, and nothing of Secure is shown here. The shell around it is src/SecureMaxSection.tsx.
import { useMemo, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { conversationTitle, findConversations } from "./conversation-library";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import type { Project } from "./projects";
import { secureStoreText } from "./text/secure-store";
import { workspaceText } from "./text/workspace";

export function SecureMaxLists(props: {
  conversations: Conversation[];
  projects: Project[];
  currentId: string;
  busy: boolean;
  /** Project spaces are switched on for this build. */
  projectsEnabled: boolean;
  onNewChat: () => void;
  /** Resolves to the new project's id, or undefined when nothing was created. */
  onNewProject: (name: string) => Promise<string | undefined>;
  onOpen: (c: Conversation) => void;
  onOpenProject: (id: string) => void;
}) {
  const { conversations, projects, currentId, busy, projectsEnabled, onNewChat, onNewProject, onOpen, onOpenProject } = props;
  const s = useText(secureStoreText);
  const w = useText(workspaceText);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const visible = useMemo(() => findConversations(conversations.filter((c) => query || !c.archived), query, "newest"), [conversations, query]);
  return (
    <>
      <button className="max-new" disabled={busy} onClick={onNewChat}>
        <Icon name="plus" />
        {s.newMaxChat}
      </button>
      {projectsEnabled && (
        <button className="max-new" disabled={busy} aria-expanded={creating} onClick={() => setCreating(!creating)}>
          <Icon name="folder" />
          {s.newMaxProject}
        </button>
      )}
      {creating && (
        <form
          className="project-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onNewProject(name)) {
              setName("");
              setCreating(false);
            }
          }}
        >
          <label>
            {w.projectName}
            <input autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="row">
            <button type="submit" disabled={busy || !name.trim()}>
              {w.create}
            </button>
            <button type="button" onClick={() => setCreating(false)}>
              {w.cancel}
            </button>
          </div>
        </form>
      )}
      <label className="history-search">
        <span>
          <Icon name="search" />
          {s.searchMax}
        </span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {projectsEnabled && projects.length > 0 && (
        <div className="project-list" role="group" aria-label={s.maxProjects}>
          {projects.map((p) => (
            <div className="project-row" key={p.id}>
              <button disabled={busy} onClick={() => onOpenProject(p.id)}>
                <Icon name="folder" />
                <span>{p.name}</span>
                <small>{conversations.filter((c) => c.projectId === p.id && !c.archived).length}</small>
              </button>
            </div>
          ))}
        </div>
      )}
      {!visible.length && <p className="sidebar-hint">{query ? w.noMatch : s.maxEmpty}</p>}
      <div role="group" aria-label={s.maxChats}>
        {visible.map((c) => (
          <div className="chat-list-item" key={c.id}>
            <div className="chat-list-row">
              <button disabled={busy} aria-current={c.id === currentId ? "page" : undefined} onClick={() => onOpen(c)}>
                {c.pinned && <Icon name="pin" />}
                <span>{conversationTitle(c)}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
