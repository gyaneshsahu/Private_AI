import { useMemo, useRef, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { ConfirmDialog } from "./ConfirmDialog";
import { conversationTitle, findConversations } from "./conversation-library";
import { useLang } from "./i18n";
import { libraryText } from "./text/conversation-ui";
import { savedListText } from "./text/saved-list";

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
  // Deleting asks first (owner, 14 November 2026): the conversation waiting for an answer.
  const [deleting, setDeleting] = useState<Conversation>();
  const section = useRef<HTMLElement>(null);
  const c = savedListText[lang];
  const visible = useMemo(
    () => findConversations(conversations, query, order),
    [conversations, query, order],
  );
  return (
    <section aria-label={t.label} ref={section} tabIndex={-1}>
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
          <button disabled={busy} onClick={() => setDeleting(conversation)}>
            {t.delete}
          </button>
        </article>
      ))}
      {deleting && (
        <ConfirmDialog
          title={c.deleteTitle}
          text={c.deleteText(conversationTitle(deleting))}
          confirmLabel={c.deleteConfirm}
          cancelLabel={c.cancel}
          fallback={() => section.current}
          onClose={(confirmed) => {
            setDeleting(undefined);
            if (confirmed) onDelete(deleting);
          }}
        />
      )}
    </section>
  );
}
