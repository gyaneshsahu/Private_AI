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

/** Defense in depth for older/imported state missing the sticky session flag. */
export function containsTemporaryResearch(conversation: Conversation): boolean {
  const temporarySource = (
    s: Conversation["attachments"][number]["sources"][number],
  ) => s.evidenceKind === "search-excerpt" || s.evidenceKind === "llm-context";
  return [conversation, ...(conversation.branches?.archived ?? [])].some(
    (branch) =>
      !!branch.temporarySearch ||
      branch.attachments.some(
        (a) => a.researchQuery !== undefined || a.sources.some(temporarySource),
      ) ||
      (branch.messages?.some((m) => m.sourceSnapshot?.some(temporarySource)) ??
        false),
  );
}
