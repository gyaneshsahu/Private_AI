import type { Source } from "../shared/contracts";

// Mechanical evidence checks, not a semantic faithfulness score.
export function auditResearchAnswer(answer: string, sources: Source[]) {
  const references = [
    ...answer.matchAll(
      /[\[【]\s*\*{0,2}([a-zA-Z0-9][a-zA-Z0-9‐‑‒–—−-]{3,99})([^\]】\n]*)[\]】]/g,
    ),
  ].filter((match) => match[1].length >= 6 || /[-‐‑‒–—−]/.test(match[1]));
  const known = new Set(sources.map((source) => source.id));
  const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
  const evidence = sources.map((source) => normalize(source.text));
  const quotes = [...answer.matchAll(/[“"]([^”"\n]{8,})[”"]/g)].map((match) =>
    normalize(match[1]),
  );
  return {
    citationReferences: references.length,
    unknownSourceReferences: references.filter((match) => !known.has(match[1]))
      .length,
    unsupportedLineReferences: references.filter((match) =>
      /†L\d/i.test(match[2]),
    ).length,
    quotedPassages: quotes.length,
    quotesNotFoundVerbatim: quotes.filter(
      (quote) => !evidence.some((text) => text.includes(quote)),
    ).length,
    semanticSupport: "NOT_ASSESSED" as const,
  };
}
