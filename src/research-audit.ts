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
  const quoteText = (text: string) =>
    normalize(text.replace(/\\([\\`*_{}\[\]()<>#+.!|~$-])/g, "$1"));
  const evidence = sources.map((source) => normalize(source.text));
  const quoteMatches = [...answer.matchAll(/[“"]([^”"\n]{8,})[”"]/g)];
  const quotes = quoteMatches.map((match) => quoteText(match[1]));
  // Only bind immediately following citations. Other placements need human review;
  // guessing sentence scope can attribute a proposed draft to unrelated evidence.
  const attributions = quoteMatches.map((quote) => {
    let end = quote.index + quote[0].length;
    const cited: string[] = [];
    for (const reference of references) {
      if (reference.index < end) continue;
      if (!/^[ \t.,;:!?*_]*$/.test(answer.slice(end, reference.index))) break;
      cited.push(reference[1]);
      end = reference.index + reference[0].length;
    }
    return { quote: quoteText(quote[1]), cited };
  });
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
    quotesWithAdjacentCitations: attributions.filter(
      ({ cited }) => cited.length > 0,
    ).length,
    quotesNotFoundInCitedSources: attributions.filter(
      ({ quote, cited }) =>
        cited.length > 0 &&
        !sources.some(
          (source) =>
            cited.includes(source.id) && normalize(source.text).includes(quote),
        ),
    ).length,
    semanticSupport: "NOT_ASSESSED" as const,
  };
}
