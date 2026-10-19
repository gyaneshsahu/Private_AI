import type { Conversation } from "../shared/contracts";
import { useRef } from "react";

export function ConversationBranches({
  conversation,
  busy,
  open,
}: {
  conversation: Conversation;
  busy: boolean;
  open: (id: string) => void;
}) {
  const summary = useRef<HTMLElement>(null);
  const branches = conversation.branches;
  if (!branches) return null;
  return (
    <details className="panel">
      <summary ref={summary}>
        Conversation branches · {branches.archived.length + 1} ·{" "}
        {branches.activeLabel}
      </summary>
      <p>
        Only selected context from the active branch is sent. Switching keeps
        each branch’s messages, references and draft; it makes no request. Save
        an encrypted snapshot to keep all branches after reload. Temporary
        research cannot be saved.
      </p>
      <p>
        Active: <strong>{branches.activeLabel}</strong>
      </p>
      <ul>
        {branches.archived.map((branch) => (
          <li key={branch.id}>
            <button
              disabled={busy}
              onClick={() => {
                open(branch.id);
                summary.current?.focus();
              }}
            >
              Open {branch.label} branch
            </button>
            {" · "}
            {branch.messages.length} messages
            {branch.messages.some((message) => message.status !== "complete")
              ? " · includes an incomplete attempt"
              : ""}
          </li>
        ))}
      </ul>
      <p>
        Up to 20 branches per conversation. No branches are silently discarded.
      </p>
    </details>
  );
}
