import type { Conversation } from "../shared/contracts";
import type { measureContext } from "./conversation";
import { useLang } from "./i18n";
import { contextReviewText } from "./text/conversation-ui";

export function ContextReview({
  expanded = false,
  conversation,
  size,
  limit,
  busy,
  includeMessage,
  includeAttachment,
}: {
  expanded?: boolean;
  conversation: Conversation;
  size: ReturnType<typeof measureContext>;
  limit?: number;
  busy: boolean;
  includeMessage: (id: string, included: boolean) => void;
  includeAttachment: (id: string, included: boolean) => void;
}) {
  const { lang } = useLang();
  const t = contextReviewText[lang];
  const locale = lang === "de" ? "de-DE" : undefined;
  const remaining = limit === undefined ? undefined : limit - size.characters;
  return (
    <details className="context-review" open={expanded || undefined}>
      <summary>
        {t.summary(size.includedMessages, size.sourceCount)}
      </summary>
      <p>{t.intro}</p>
      <p aria-live="polite">
        {remaining === undefined
          ? t.noLimit
          : remaining < 0
            ? t.over((-remaining).toLocaleString(locale))
            : t.remain(remaining.toLocaleString(locale))}
      </p>
      <table>
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.content}</th>
            <th scope="col">{t.characters}</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              [t.instructions, size.breakdown.instructions],
              [t.selectedMessages, size.breakdown.conversation],
              [t.selectedReferences, size.breakdown.references],
              [t.draft, size.breakdown.draft],
            ] as const
          ).map(([label, count]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{count.toLocaleString(locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">{t.formatting}</p>
      <fieldset disabled={busy}>
        <legend>{t.messagesLegend}</legend>
        {!conversation.messages.length && <p>{t.noMessages}</p>}
        {conversation.messages.map((message, index) => (
          <label key={message.id}>
            <input
              type="checkbox"
              checked={message.included && message.status === "complete"}
              disabled={message.status !== "complete"}
              onChange={(event) =>
                includeMessage(message.id, event.target.checked)
              }
            />
            {index + 1}. {message.role === "user" ? t.you : "CometRow"}:{" "}
            {message.text.slice(0, 90) || t.noAnswer}
            {message.text.length > 90 ? "…" : ""}
            {message.status !== "complete" && t.incomplete}
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>{t.documentsLegend}</legend>
        {!conversation.attachments.length && <p>{t.noDocuments}</p>}
        {conversation.attachments.map((attachment) => (
          <label key={attachment.id}>
            <input
              type="checkbox"
              checked={attachment.selected}
              onChange={(event) =>
                includeAttachment(attachment.id, event.target.checked)
              }
            />
            {attachment.name} · {t.passages(attachment.sources.length)}
          </label>
        ))}
      </fieldset>
      {size.passageNotes.map((note) => (
        <p key={note} data-testid="passage-note">
          {note}
        </p>
      ))}
      <p>{t.excluded(size.excludedMessages)}</p>
    </details>
  );
}
