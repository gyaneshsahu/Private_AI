// Deterministic checks for the two cases added to the model selection screen
// on 22 October 2026 (evaluation/cases/model-selection-checks-20261022.json).
// They score the reply text only; they do not replace human grades.

/**
 * True when every expected placeholder appears verbatim and no altered form of
 * any placeholder kind (missing braces, single braces, square brackets, changed
 * case or numbering) appears anywhere in the reply.
 */
export function placeholdersCopiedExactly(
  reply: string,
  placeholders: readonly string[],
): { ok: boolean; missing: string[]; altered: string[] } {
  const missing = placeholders.filter((p) => !reply.includes(p));
  const kinds = new Set(
    placeholders
      .map((p) => /^\{\{([A-Z]+)-\d+\}\}$/.exec(p)?.[1])
      .filter((k): k is string => !!k),
  );
  const altered: string[] = [];
  for (const kind of kinds) {
    const loose = new RegExp(
      `(?<!\\{)\\{?\\[?${kind}-\\d+\\]?\\}?(?!\\})|\\{\\{${kind.toLowerCase()}-\\d+\\}\\}`,
      "gi",
    );
    for (const match of reply.matchAll(loose)) {
      const text = match[0];
      if (!placeholders.includes(text)) altered.push(text);
    }
  }
  return { ok: missing.length === 0 && altered.length === 0, missing, altered };
}

const SQUARE = /\[[a-zA-Z0-9][a-zA-Z0-9-]{3,99}\]/g;
const FULLWIDTH = /【[a-zA-Z0-9][a-zA-Z0-9-]{3,99}】/g;

/** Which delimiter the reply uses for source citations. */
export function citationForm(
  reply: string,
): "square" | "fullwidth" | "mixed" | "none" {
  const square = (reply.match(SQUARE) ?? []).length;
  const fullwidth = (reply.match(FULLWIDTH) ?? []).length;
  if (square && fullwidth) return "mixed";
  if (square) return "square";
  if (fullwidth) return "fullwidth";
  return "none";
}
