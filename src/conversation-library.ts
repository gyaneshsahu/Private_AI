import type { Conversation } from "../shared/contracts";
import { titleFrom } from "./title-from";

export function conversationTitle(conversation: Conversation): string {
  return conversation.title === "New conversation"
    ? titleFrom(conversation.draft ?? "") ||
        conversation.attachments[0]?.name ||
        conversation.title
    : conversation.title;
}

/** When the chat was last used: its newest message time, else when it was created. */
export function lastActivity(conversation: Conversation): string {
  let latest = conversation.createdAt;
  for (const message of conversation.messages)
    if (message.at && (Date.parse(message.at) || 0) > (Date.parse(latest) || 0)) latest = message.at;
  return latest;
}

/** Where a saved chat falls in the sidebar's date groups. The week starts on Monday. */
export function dateGroup(
  iso: string,
  now = new Date(),
): "today" | "yesterday" | "week" | "older" {
  const then = Date.parse(iso) || 0;
  const daysAgo = (days: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).getTime();
  if (then >= daysAgo(0)) return "today";
  if (then >= daysAgo(1)) return "yesterday";
  return then >= daysAgo((now.getDay() + 6) % 7) ? "week" : "older";
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
        (Date.parse(lastActivity(a)) || 0) - (Date.parse(lastActivity(b)) || 0);
      return (order === "oldest" ? time : -time) || a.id.localeCompare(b.id);
    });
}
