import type { Conversation, ConversationBranch } from "../shared/contracts";
import { newMessage } from "./conversation";
import { containsTemporaryResearch } from "./saved-conversation";

export const MAX_BRANCHES = 20;

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
    throw Error("Choose a user message and enter its replacement.");
  const archived = conversation.branches?.archived ?? [];
  if (archived.length >= MAX_BRANCHES - 1)
    throw Error(
      "This conversation has 20 branches. Start a new conversation to continue; existing branches were kept.",
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
  if (!chosen) throw Error("That branch is no longer available.");
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
