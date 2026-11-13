import { useMemo, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { conversationTitle, findConversations } from "./conversation-library";
import { useLang } from "./i18n";
import { libraryText } from "./text/conversation-ui";

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
  const { lang } = useLang();
  const t = libraryText[lang];
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest" | "title">("newest");
  const visible = useMemo(
    () => findConversations(conversations, query, order),
    [conversations, query, order],
  );
  return (
    <section aria-label={t.label}>
      <div className="panel">
        <label>
          {t.search}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="muted">{t.searchNote}</p>
        <label>
          {t.sort}
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as typeof order)}
          >
            <option value="newest">{t.newest}</option>
            <option value="oldest">{t.oldest}</option>
            <option value="title">{t.title}</option>
          </select>
        </label>
        <p role="status">
          {t.count(visible.length, conversations.length)}
        </p>
        {query && <button onClick={() => setQuery("")}>{t.clear}</button>}
      </div>
      {!visible.length && conversations.length > 0 && (
        <p>{t.noMatch}</p>
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
              {new Date(conversation.createdAt).toLocaleDateString(
                lang === "de" ? "de-DE" : undefined,
              )}{" "}
              ·{" "}
              {t.meta(conversation.messages.length, conversation.attachments.length)}
              {conversation.draft ? t.draft : ""}
              {conversation.pinned ? t.pinned : ""}
              {conversation.archived ? t.archived : ""}
              {conversation.branches
                ? t.branches(conversation.branches.archived.length + 1)
                : ""}
            </p>
          </div>
          <button disabled={busy} onClick={() => onOpen(conversation)}>
            {t.open}
          </button>
          <button disabled={busy} onClick={() => onDelete(conversation)}>
            {t.delete}
          </button>
        </article>
      ))}
    </section>
  );
}
