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
});

// Older snapshots have no draft, attachment kind or message source snapshot.
export const savedConversationSchema: z.ZodType<Conversation> = z.object({
  id: z.string().min(1),
  title: z.string(),
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
