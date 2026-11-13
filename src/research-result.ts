import { textFor, uiLang, type Lang } from "./text/core";
import { chatErrorText } from "./text/chat-errors";
import { researchText } from "./text/research";
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

/** Added to every search approval: the same approval also opens one page. English; the screen uses researchText.approval. */
export const TOP_PAGE_APPROVAL = researchText.en.approval;

/** What happened to the top result page, in the words shown to the user. */
export function topPageNote(input: unknown, lang: Lang = uiLang()): string {
  const t = textFor(researchText, lang);
  const data = resultSchema.safeParse(input).data;
  const top = data?.topPage;
  if (!top) return "";
  const host = new URL(top.url).hostname;
  // Say "official" only when the page that was read is one (a fallback result may not be).
  // A German-rules search (tier set) names the tier of the page read.
  const which = top.tier
    ? {
        official: t.official,
        "public-interest": t.publicInterest,
        other: t.other,
      }[top.tier]
    : top.official ? t.topOfficial : t.top;
  const none = top.tier && !data.sources.some((s) => sourceTier(s.url) === "official")
    ? ` ${GERMAN_RULES.noOfficial}` : "";
  return {
    read: t.read(which, top.url),
    "read-without-query": t.readWithoutQuery(which, top.url),
    skipped: t.skipped(host),
    failed: t.failed(host),
  }[top.outcome] + none;
}

export function parseResearchResult(input: unknown, existingIds: Iterable<string>): Source[] {
  const result = resultSchema.safeParse(input);
  if (!result.success)
    throw new Error(textFor(chatErrorText).researchInvalid);
  const ids = new Set(existingIds);
  for (const source of result.data.sources) {
    if (ids.has(source.id))
      throw new Error(textFor(chatErrorText).researchConflict);
    ids.add(source.id);
  }
  return result.data.sources;
}
