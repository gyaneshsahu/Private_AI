import { z } from "zod";
import type { Source } from "../shared/contracts";

const resultSchema = z.object({
  sources: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9-]{6,36}$/),
    title: z.string().min(1).max(2000).refine((value) => value.trim().length > 0),
    text: z.string().min(1).max(60000).refine((value) => value.trim().length > 0),
    url: z.string().url().max(2000).refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash;
    }),
    retrievedAt: z.string().datetime(),
  }).strict()).max(5),
}).strict();

export function parseResearchResult(input: unknown, existingIds: Iterable<string>): Source[] {
  const result = resultSchema.safeParse(input);
  if (!result.success)
    throw new Error("Research returned invalid source information. Nothing was added; no automatic retry was made.");
  const ids = new Set(existingIds);
  for (const source of result.data.sources) {
    if (ids.has(source.id))
      throw new Error("Research returned conflicting source identifiers. Nothing was added; no automatic retry was made.");
    ids.add(source.id);
  }
  return result.data.sources;
}
