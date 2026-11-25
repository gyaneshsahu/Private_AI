import { z } from "zod";
import type { Conversation } from "../shared/contracts";
import { QUANTITY_KEYS } from "./arithmetic/completeness";
import { boardSchema } from "../shared/whiteboard";

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
  memoryOff: z.literal(true).optional(),
  // Canvas: absent in conversations saved before it existed. The limit is CANVAS_LIMITS.characters.
  canvas: z
    .object({ text: z.string().max(18000), resolved: z.string().max(100).optional() })
    .strict()
    .optional(),
  // Whiteboard: absent in conversations saved before it existed.
  board: boardSchema.optional(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      text: z.string(),
      status: z.enum(["complete", "partial", "error"]),
      included: z.boolean(),
      sourceSnapshot: z.array(source).optional(),
      failure: z
        .enum(["stopped", "timeout", "incomplete", "unavailable", "empty", "busy", "capacity", "error"])
        .optional(),
      keptOnDevice: z.string().max(300).optional(),
      passagesUsed: z.string().max(4000).optional(),
      searchedFor: z.string().max(400).optional(),
      searchedSources: z.array(z.string().min(1).max(200)).max(50).optional(),
      memoriesUsed: z.array(z.string().uuid()).max(8).optional(),
      projectInstructionsSent: z.literal(true).optional(),
      report: z.literal(true).optional(),
      answeredBy: z.string().max(300).optional(),
      mode: z.enum(["fast", "thinking"]).optional(),
      // Only the fact that a picture was asked about. There is no field that could hold a picture.
      image: z.literal(true).optional(),
      // The picture was the whiteboard; its typed words as sent (BOARD_LIMITS.sentText).
      board: z.object({ text: z.string().max(2000).optional() }).strict().optional(),
      // A created image (base64, not a data URL); about 3 MB at most.
      createdImage: z
        .object({
          type: z.enum(["image/jpeg", "image/png", "image/webp"]),
          data: z.string().max(4_000_000).regex(/^[A-Za-z0-9+/]+=*$/),
          model: z.string().max(64),
          prompt: z.string().max(1000),
          maskedNote: z.string().max(300).optional(),
          // Image editing: the other versions (IMAGE_EDIT.versions at most, with the one above) and the shown one's place.
          versions: z
            .array(
              z
                .object({
                  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
                  data: z.string().max(4_000_000).regex(/^[A-Za-z0-9+/]+=*$/),
                  prompt: z.string().max(1000),
                })
                .strict(),
            )
            .max(11)
            .optional(),
          at: z.number().int().min(0).max(11).optional(),
          source: z.literal("upload").optional(),
          edited: z.literal(true).optional(),
        })
        .strict()
        .optional(),
      at: z.string().datetime().optional(),
      arithmeticCheck: z
        .object({
          relations: z.number().int().nonnegative(),
          mismatches: z.number().int().nonnegative(),
          ambiguous: z.number().int().nonnegative().optional(),
        })
        .strict()
        .optional(),
      completenessCheck: z
        .object({
          requested: z.number().int().nonnegative(),
          missing: z.array(z.enum(QUANTITY_KEYS)),
        })
        .strict()
        .optional(),
      uncheckedFigures: z.literal(true).optional(),
      noOfficialSource: z.literal(true).optional(),
      // Limits follow src/python-sandbox.ts and src/code-tool.ts, with room for the cut note.
      codeRuns: z
        .array(
          z
            .object({
              code: z.string().max(4000),
              output: z.string().max(4200),
              error: z.literal(true).optional(),
            })
            .strict(),
        )
        .max(12)
        .optional(),
      codeUnavailable: z.literal(true).optional(),
      codeSteps: z.number().int().min(0).max(10).optional(),
    }),
  ),
  attachments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      selected: z.boolean(),
      large: z.boolean().optional(),
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

/**
 * True when any value in the conversation is an embedded picture (a base64 data URL). A picture
 * question keeps only a flag on its message (docs/images-20261114.md); the picture is never part
 * of a conversation. The vault refuses to save one that carries a picture anyway.
 */
export function containsImageData(conversation: Conversation): boolean {
  return /"data:image\/[a-z0-9.+-]+;base64,/i.test(JSON.stringify(conversation));
}

/** Every source that arrived through a web search belongs to a search attachment, whatever its labelled kind. */
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
 * The stored copy of a chat (live search stripped) with the open copy's live search put back:
 * search attachments by id, each message's source snapshot by id and the session flag. Used when a
 * change from elsewhere replaces the open chat, so this session keeps the results it fetched.
 */
export function keepLiveSearch(stored: Conversation, open: Conversation): Conversation {
  type Branch = Pick<Conversation, "messages" | "attachments">;
  const restore = <T extends Branch>(into: T, from: Branch | undefined): T => {
    if (!from) return into;
    const live = new Map(from.attachments.filter((a) => a.researchQuery !== undefined).map((a) => [a.id, a]));
    const snapshots = new Map(from.messages.flatMap((m) => (m.sourceSnapshot ? [[m.id, m.sourceSnapshot] as const] : [])));
    return {
      ...into,
      attachments: into.attachments.map((a) => live.get(a.id) ?? a),
      messages: into.messages.map((m) => (snapshots.has(m.id) ? { ...m, sourceSnapshot: snapshots.get(m.id) } : m)),
    };
  };
  const out = restore(stored, open);
  if (open.temporarySearch) out.temporarySearch = true;
  const openBranches = new Map((open.branches?.archived ?? []).map((b) => [b.id, b]));
  if (out.branches?.archived)
    out.branches = { ...out.branches, archived: out.branches.archived.map((b) => restore(b, openBranches.get(b.id))) };
  return out;
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
