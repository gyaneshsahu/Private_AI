import type { Conversation } from "../shared/contracts";
import { useRef } from "react";
import { useText } from "./i18n";
import { branchesText } from "./text/conversation-ui";

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
  const t = useText(branchesText);
  const branches = conversation.branches;
  if (!branches) return null;
  return (
    <details className="panel">
      <summary ref={summary}>
        {t.summary(branches.archived.length + 1, branches.activeLabel)}
      </summary>
      <p>{t.intro}</p>
      <p>
        {t.active} <strong>{branches.activeLabel}</strong>
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
              {t.open(branch.label)}
            </button>
            {" · "}
            {t.messages(branch.messages.length)}
            {branch.messages.some((message) => message.status !== "complete")
              ? t.incomplete
              : ""}
          </li>
        ))}
      </ul>
      <p>{t.limit}</p>
    </details>
  );
}
