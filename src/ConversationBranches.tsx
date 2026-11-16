import type { Conversation } from "../shared/contracts";
import { useRef } from "react";
import { branchLabel } from "./conversation-branches";
import { useLang, useText } from "./i18n";
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
  const { lang } = useLang();
  const branches = conversation.branches;
  if (!branches) return null;
  const active = branchLabel(branches.activeLabel, lang);
  return (
    <details className="panel">
      <summary ref={summary}>
        {t.summary(branches.archived.length + 1, active)}
      </summary>
      <p>{t.intro}</p>
      <p>
        {t.active} <strong>{active}</strong>
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
              {t.open(branchLabel(branch.label, lang))}
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
