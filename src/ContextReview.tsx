import type { Conversation } from "../shared/contracts";
import type { measureContext } from "./conversation";

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
  const remaining = limit === undefined ? undefined : limit - size.characters;
  return (
    <details className="context-review" open={expanded || undefined}>
      <summary>
        Review included context · {size.includedMessages} messages ·{" "}
        {size.sourceCount} source passages
      </summary>
      <p>
        These selections control your next request. They do not delete saved
        history or change what was sent earlier. Saved conversations are not
        recalled automatically.
      </p>
      <p aria-live="polite">
        {remaining === undefined
          ? "The sending limit is unavailable until a chat configuration is qualified."
          : remaining < 0
            ? `Over the sending limit by ${(-remaining).toLocaleString()} characters. Shorten your draft or deselect context; nothing will be shortened automatically.`
            : `${remaining.toLocaleString()} characters remain within this configuration's input limit.`}
      </p>
      <table>
        <caption>Selected input size</caption>
        <thead>
          <tr>
            <th scope="col">Content</th>
            <th scope="col">Characters</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              ["Instructions", size.breakdown.instructions],
              ["Selected messages", size.breakdown.conversation],
              ["Selected documents and sources", size.breakdown.references],
              ["Your draft", size.breakdown.draft],
            ] as const
          ).map(([label, count]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Source formatting is included. Characters are not tokens; these numbers
        do not promise that the model will recall every included fact.
      </p>
      <fieldset disabled={busy}>
        <legend>Messages included in the next request</legend>
        {!conversation.messages.length && (
          <p>No previous messages in this conversation.</p>
        )}
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
            {index + 1}. {message.role === "user" ? "You" : "CometRow"}:{" "}
            {message.text.slice(0, 90) || "No completed answer"}
            {message.text.length > 90 ? "…" : ""}
            {message.status !== "complete" && " · Incomplete; always excluded"}
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Documents and sources included in the next request</legend>
        {!conversation.attachments.length && (
          <p>No documents or sources added.</p>
        )}
        {conversation.attachments.map((attachment) => (
          <label key={attachment.id}>
            <input
              type="checkbox"
              checked={attachment.selected}
              onChange={(event) =>
                includeAttachment(attachment.id, event.target.checked)
              }
            />
            {attachment.name} · {attachment.sources.length} source passages
          </label>
        ))}
      </fieldset>
      <p>
        {size.excludedMessages} messages excluded. Incomplete answers are never
        used as conversation context.
      </p>
    </details>
  );
}
