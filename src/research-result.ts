import { z } from "zod";
import type { Source } from "../shared/contracts";
import { GERMAN_RULES, sourceTier } from "./german-rules";

export function researchSourceUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      ? url.href : undefined;
  } catch { return undefined; }
}

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
    evidenceKind: z.enum(["search-excerpt", "page", "llm-context"]).optional(),
    providerDate: z.string().min(1).max(100).optional(),
  }).strict()).max(7), // five results (six on a German-rules search) and the top page
  topPage: z.object({
    url: z.string().url().max(2000),
    outcome: z.enum(["read", "read-without-query", "skipped", "failed"]),
    official: z.boolean().optional(),
    tier: z.enum(["official", "public-interest", "other"]).optional(),
  }).strict().optional(),
}).strict();

/** Added to every search approval: the same approval also opens one page. */
export const TOP_PAGE_APPROVAL =
  "Our server will also open the top result page, preferring an official site, and read its text for this answer. That site sees our server's address, not yours.";

/** What happened to the top result page, in the words shown to the user. */
export function topPageNote(input: unknown): string {
  const data = resultSchema.safeParse(input).data;
  const top = data?.topPage;
  if (!top) return "";
  const host = new URL(top.url).hostname;
  // Say "official" only when the page that was read is one (a fallback result may not be).
  // A German-rules search (tier set) names the tier of the page read.
  const which = top.tier
    ? {
        official: "an official source",
        "public-interest": "a public-interest page (not an official source)",
        other: "a non-official page",
      }[top.tier]
    : top.official ? "the top official result" : "the top result";
  const none = top.tier && !data.sources.some((s) => sourceTier(s.url) === "official")
    ? ` ${GERMAN_RULES.noOfficial}` : "";
  return {
    read: `Our server also opened ${which} and read its text: ${top.url}`,
    "read-without-query": `Our server also opened ${which} without the part of its address after "?", because that part contained a personal detail: ${top.url}`,
    skipped: `The top result (${host}) was not opened, because its address contained a personal detail. The answer uses the search excerpts only.`,
    failed: `The top result (${host}) could not be opened. The answer uses the search excerpts only.`,
  }[top.outcome] + none;
}

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
