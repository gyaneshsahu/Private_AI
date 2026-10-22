import { z } from "zod";
import type { Conversation } from "../shared/contracts";

const source = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  page: z.number().int().positive().optional(),
  url: z.string().optional(),
  retrievedAt: z.string().optional(),
  evidenceKind: z.enum(["search-excerpt", "page", "llm-context"]).optional(),
  providerDate: z.string().max(100).optional(),
  userEdited: z.boolean().optional(),
});

// Older snapshots have no draft, attachment kind or message source snapshot.
const conversationBody = z.object({
  id: z.string().min(1),
  title: z.string(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  projectId: z.string().uuid().optional(),
  createdAt: z.string(),
  draft: z.string().optional(),
  temporarySearch: z.boolean().optional(),
  disappearAfter: z.enum(["hour", "day", "week"]).optional(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      text: z.string(),
      status: z.enum(["complete", "partial", "error"]),
      included: z.boolean(),
      sourceSnapshot: z.array(source).optional(),
      failure: z
        .enum(["stopped", "timeout", "incomplete", "unavailable", "empty"])
        .optional(),
      keptOnDevice: z.string().max(300).optional(),
      answeredBy: z.string().max(300).optional(),
      at: z.string().datetime().optional(),
    }),
  ),
  attachments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      selected: z.boolean(),
      sources: z.array(source),
      warning: z.string().optional(),
      kind: z.enum(["document", "screenshot", "research"]).optional(),
      researchQuery: z.string().max(400).optional(),
      liveSearch: z
        .object({ strippedAt: z.string().datetime() })
        .strict()
        .optional(),
    }),
  ),
  usage: z.array(
    z.object({
      input: z.number().nonnegative(),
      output: z.number().nonnegative(),
      total: z.number().nonnegative(),
      estimatedUSD: z.number().nonnegative(),
    }),
  ),
});

export const savedConversationSchema: z.ZodType<Conversation> =
  conversationBody.extend({
    branches: z
      .object({
        activeId: z.string().min(1),
        activeLabel: z.string().min(1).max(80),
        archived: z
          .array(
            conversationBody
              .pick({
                messages: true,
                attachments: true,
                temporarySearch: true,
              })
              .extend({
                id: z.string().min(1),
                label: z.string().min(1).max(80),
                draft: z.string(),
              })
              .strict(),
          )
          .max(19),
      })
      .strict()
      .refine((branches) => {
        const ids = [
          branches.activeId,
          ...branches.archived.map((branch) => branch.id),
        ];
        return new Set(ids).size === ids.length;
      }, "Duplicate conversation branch identity.")
      .optional(),
  });

const temporarySource = (
  s: Conversation["attachments"][number]["sources"][number],
) => s.evidenceKind === "search-excerpt" || s.evidenceKind === "llm-context";

/**
 * True while live search results, links or the sticky session flag are present.
 * A search attachment that was stripped on save (`liveSearch` set, no temporary
 * sources) is not temporary: only the approved query and the written answer
 * remain. Defense in depth for older or imported state.
 */
export function containsTemporaryResearch(conversation: Conversation): boolean {
  return [conversation, ...(conversation.branches?.archived ?? [])].some(
    (branch) => {
      const searchIds = searchResultIds(branch.attachments);
      return (
        !!branch.temporarySearch ||
        branch.attachments.some(
          (a) =>
            (a.researchQuery !== undefined &&
              (!a.liveSearch || a.sources.length > 0)) ||
            a.sources.some(temporarySource),
        ) ||
        (branch.messages?.some((m) =>
          m.sourceSnapshot?.some(
            (s) => temporarySource(s) || searchIds.has(s.id),
          ),
        ) ??
          false)
      );
    },
  );
}

/** Every source that arrived through an approved search belongs to a search attachment, whatever its labelled kind. */
function searchResultIds(
  attachments: Conversation["attachments"],
): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(attachments)) return ids;
  for (const attachment of attachments)
    if (attachment.researchQuery !== undefined)
      for (const source of attachment.sources ?? []) ids.add(source.id);
  return ids;
}

/**
 * What a save keeps of a live search (owner decision, 22 October 2026): the
 * written answers and the approved query, never the provider's results or
 * links. Pages the user opened through the page workflow are their own action
 * and stay. Returns a copy; the in-session conversation keeps its results.
 */
export function stripLiveSearch(
  conversation: Conversation,
  now = new Date(),
): Conversation {
  const strippedAt = now.toISOString();
  const stripBranch = <
    T extends Pick<
      Conversation,
      "messages" | "attachments" | "temporarySearch"
    >,
  >(
    branch: T,
  ): T => {
    // Malformed input is left for schema validation to refuse, unchanged.
    if (!Array.isArray(branch.attachments) || !Array.isArray(branch.messages))
      return branch;
    const searchIds = searchResultIds(branch.attachments);
    const dropped = (
      s: Conversation["attachments"][number]["sources"][number],
    ) => temporarySource(s) || searchIds.has(s.id);
    const attachments = branch.attachments.map((attachment) => {
      // A search attachment keeps nothing of its results, whatever their labelled kind.
      const kept =
        attachment.researchQuery !== undefined
          ? []
          : attachment.sources.filter((s) => !temporarySource(s));
      if (
        kept.length === attachment.sources.length &&
        (attachment.researchQuery === undefined || attachment.liveSearch)
      )
        return attachment;
      const { researchQuery, ...rest } = attachment;
      return {
        ...rest,
        sources: kept,
        ...(researchQuery !== undefined
          ? {
              researchQuery,
              liveSearch: attachment.liveSearch ?? { strippedAt },
            }
          : {}),
      };
    });
    const messages = branch.messages.map((message) => {
      if (!message.sourceSnapshot?.some(dropped)) return message;
      const kept = message.sourceSnapshot.filter((s) => !dropped(s));
      const { sourceSnapshot, ...rest } = message;
      return kept.length ? { ...rest, sourceSnapshot: kept } : rest;
    });
    const { temporarySearch, ...rest } = branch;
    return { ...rest, attachments, messages } as T;
  };
  const stripped = stripBranch(conversation);
  return conversation.branches && Array.isArray(conversation.branches.archived)
    ? {
        ...stripped,
        branches: {
          ...conversation.branches,
          archived: conversation.branches.archived.map(stripBranch),
        },
      }
    : stripped;
}
