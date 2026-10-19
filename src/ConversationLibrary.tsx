import { useMemo, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { conversationTitle, findConversations } from "./conversation-library";

export function ConversationLibrary({
  conversations,
  busy,
  onOpen,
  onDelete,
}: {
  conversations: Conversation[];
  busy: boolean;
  onOpen: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
}) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest" | "title">("newest");
  const visible = useMemo(
    () => findConversations(conversations, query, order),
    [conversations, query, order],
  );
  return (
    <section aria-label="Saved conversation library">
      <div className="panel">
        <label>
          Search saved conversations
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="muted">
          Search titles, messages, drafts and file names, including other
          branches, in this unlocked browser. Nothing is sent to a server.
        </p>
        <label>
          Sort conversations
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as typeof order)}
          >
            <option value="newest">Newest created first</option>
            <option value="oldest">Oldest created first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
        <p role="status">
          {visible.length} of {conversations.length} saved conversations
        </p>
        {query && <button onClick={() => setQuery("")}>Clear search</button>}
      </div>
      {!visible.length && conversations.length > 0 && (
        <p>No matching conversations. Try another word or clear the search.</p>
      )}
      {visible.map((conversation) => (
        <article
          className="panel row"
          key={conversation.id}
          aria-label={conversationTitle(conversation)}
        >
          <div>
            <strong>{conversationTitle(conversation)}</strong>
            <p className="muted">
              {new Date(conversation.createdAt).toLocaleDateString()} ·{" "}
              {conversation.messages.length} messages ·{" "}
              {conversation.attachments.length} attachments
              {conversation.draft ? " · Unsent draft" : ""}
              {conversation.branches
                ? ` · ${conversation.branches.archived.length + 1} branches`
                : ""}
            </p>
          </div>
          <button disabled={busy} onClick={() => onOpen(conversation)}>
            Open
          </button>
          <button disabled={busy} onClick={() => onDelete(conversation)}>
            Delete
          </button>
        </article>
      ))}
    </section>
  );
}
