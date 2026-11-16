import { textFor, uiLang, type Lang } from "./text/core";
import { messageActionsText } from "./text/message-actions";
import { chatErrorText } from "./text/chat-errors";
import type { Conversation, ConversationBranch } from "../shared/contracts";
import { newMessage } from "./conversation";
import { containsTemporaryResearch } from "./saved-conversation";

export const MAX_BRANCHES = 20;

/**
 * Branch names are stored as language-neutral tokens, kind plus number ("Original", "Retry 2",
 * "Edit 3"), the same strings older versions saved, so saved and synced chats need no migration.
 * They are shown in the interface language; any other stored name is shown as it is.
 */
export function branchLabel(stored: string, lang: Lang = uiLang()): string {
  const t = messageActionsText[lang];
  if (stored === "Original") return t.branchOriginal;
  const match = /^(Retry|Edit) (\d+)$/.exec(stored);
  if (!match) return stored;
  return (match[1] === "Retry" ? t.branchRetry : t.branchEdit)(Number(match[2]));
}

function snapshot(c: Conversation, draft: string): ConversationBranch {
  return structuredClone({
    id: c.branches?.activeId ?? crypto.randomUUID(),
    label: c.branches?.activeLabel ?? "Original",
    messages: c.messages,
    attachments: c.attachments,
    draft,
    temporarySearch: c.temporarySearch,
  });
}

/** Preserve the old workspace before replacing its active message sequence. */
export function branchConversation(
  conversation: Conversation,
  draft: string,
  userId: string,
  replacement?: string,
): Conversation {
  const index = conversation.messages.findIndex(
    (message) => message.id === userId && message.role === "user",
  );
  if (index < 0 || (replacement !== undefined && !replacement.trim()))
    throw Error(textFor(chatErrorText).branchChoose);
  const archived = conversation.branches?.archived ?? [];
  if (archived.length >= MAX_BRANCHES - 1)
    throw Error(
      textFor(chatErrorText).branchLimit,
    );
  const original = snapshot(conversation, draft);
  const next = structuredClone(conversation);
  return {
    ...next,
    draft,
    temporarySearch: containsTemporaryResearch(conversation),
    messages: [
      ...next.messages.slice(0, index),
      ...(replacement === undefined
        ? []
        : [newMessage("user", replacement.trim())]),
    ],
    branches: {
      activeId: crypto.randomUUID(),
      activeLabel: `${replacement === undefined ? "Retry" : "Edit"} ${archived.length + 1}`,
      archived: [...(next.branches?.archived ?? []), original],
    },
  };
}

export function switchBranch(
  c: Conversation,
  draft: string,
  id: string,
): Conversation {
  if (id === c.branches?.activeId) return c;
  const chosen = c.branches?.archived.find((branch) => branch.id === id);
  if (!chosen) throw Error(textFor(chatErrorText).branchGone);
  const selected = structuredClone(chosen);
  return {
    ...c,
    messages: selected.messages,
    attachments: selected.attachments,
    draft: selected.draft,
    // Search-derived content can exist in other branches even after switching.
    temporarySearch: containsTemporaryResearch(c),
    branches: {
      activeId: selected.id,
      activeLabel: selected.label,
      archived: [
        ...c.branches!.archived.filter((branch) => branch.id !== id),
        snapshot(c, draft),
      ],
    },
  };
}
