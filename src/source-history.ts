import type { Conversation, Message, Source } from "../shared/contracts";

export function correctSource(
  conversation: Conversation,
  id: string,
  text: string,
): Conversation {
  return {
    ...conversation,
    attachments: conversation.attachments.map((attachment) => ({
      ...attachment,
      sources: attachment.sources.map((source) =>
        source.id === id && source.text !== text
          ? { ...source, text, userEdited: true }
          : source,
      ),
    })),
  };
}

/** This detects changed evidence, not whether the answer actually depended on it. */
export function sourceHistoryStatus(
  message: Message,
  current: ReadonlyMap<string, Source>,
): "unchanged" | "changed" | "unrecorded" {
  if (message.role !== "assistant") return "unchanged";
  if (message.sourceSnapshot === undefined) return "unrecorded";
  return message.sourceSnapshot.some((original) => {
    const source = current.get(original.id);
    return (
      !source ||
      (
        [
          "text",
          "title",
          "url",
          "page",
          "retrievedAt",
          "evidenceKind",
          "providerDate",
          "userEdited",
        ] as const
      ).some((key) => source[key] !== original[key])
    );
  })
    ? "changed"
    : "unchanged";
}
