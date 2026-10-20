import { containDialogFocus } from "./dialog-focus";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { conversationTitle, findConversations } from "./conversation-library";

export function WorkspaceNavigation({
  open,
  collapsed,
  onClose,
  onCollapse,
  onExpand,
  conversations,
  unlocked,
  busy,
  newDisabled,
  currentId,
  onOpen,
  onNew,
  onNavigate,
  onSettings,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onExpand: () => void;
  conversations: Conversation[];
  unlocked: boolean;
  busy: boolean;
  newDisabled: boolean;
  currentId: string;
  onOpen: (conversation: Conversation) => void;
  onNew: () => void;
  onNavigate: (tab: "Saved" | "Account" | "Help") => void;
  onSettings: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => findConversations(conversations, query, "newest"),
    [conversations, query],
  );
  const drawer = narrow || collapsed;
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
    if (!unlocked) setQuery("");
  }, [unlocked]);
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
          ‹
        </button>
      </div>
      {collapsed && !narrow && (
        <button onClick={onExpand}>Keep sidebar open</button>
      )}
      <button className="new-chat" onClick={onNew} disabled={newDisabled}>
        ＋ New conversation
      </button>
      {unlocked ? (
        <>
          <label className="history-search">
            Search chats
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this vault"
            />
          </label>
          <div className="recent-chats">
            <h2>{query ? "Search results" : "Saved conversations"}</h2>
            {!visible.length && (
              <p className="muted">
                {query
                  ? "No matching conversations."
                  : "No saved chats yet. Save a conversation to keep it here."}
              </p>
            )}
            {visible.map((conversation) => (
              <button
                key={conversation.id}
                disabled={busy}
                aria-current={
                  conversation.id === currentId ? "page" : undefined
                }
                onClick={() => onOpen(conversation)}
              >
                {conversationTitle(conversation)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="history-locked">
          <h2>Your conversations</h2>
          <p>Unlock your local vault to search and reopen saved chats.</p>
          <button onClick={() => onNavigate("Saved")}>Unlock history</button>
        </div>
      )}
      <nav aria-label="Workspace" className="sidebar-bottom">
        <button onClick={() => onNavigate("Saved")}>
          Saved · Data controls
        </button>
        <button onClick={onSettings}>Settings</button>
        <button onClick={() => onNavigate("Account")}>
          Account &amp; usage
        </button>
        <button onClick={() => onNavigate("Help")}>Help</button>
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
