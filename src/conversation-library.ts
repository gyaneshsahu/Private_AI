import type { Conversation } from "../shared/contracts";

export function conversationTitle(conversation: Conversation): string {
  return conversation.title === "New conversation"
    ? conversation.draft?.slice(0, 60) ||
        conversation.attachments[0]?.name ||
        conversation.title
    : conversation.title;
}

/** Searches only already-unlocked records; creates no durable search index. */
export function findConversations(
  conversations: readonly Conversation[],
  query: string,
  order: "newest" | "oldest" | "title",
): Conversation[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return conversations
    .filter((conversation) => {
      if (!terms.length) return true;
      const text = [
        conversationTitle(conversation),
        conversation.draft ?? "",
        ...conversation.messages.map((message) => message.text),
        ...conversation.attachments.map((attachment) => attachment.name),
        ...(conversation.branches?.archived ?? []).flatMap((branch) => [
          branch.draft,
          ...branch.messages.map((message) => message.text),
          ...branch.attachments.map((attachment) => attachment.name),
        ]),
      ]
        .join("\n")
        .toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => {
      if (order === "title")
        return (
          conversationTitle(a).localeCompare(conversationTitle(b)) ||
          a.id.localeCompare(b.id)
        );
      const time =
        (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
      return (order === "oldest" ? time : -time) || a.id.localeCompare(b.id);
    });
}
