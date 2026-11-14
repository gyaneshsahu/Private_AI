// Collapsing a long own message (docs/chat-feature-gaps-20261114.md, 3.1 a). A pure decision from
// measured heights, so the rule is the same at every width: characters are never counted.

/** Lines shown while collapsed. The style sheet's max-height uses the same number. */
export const COLLAPSED_LINES = 12;

/**
 * Collapse only when the full text is at least 1.5 times the collapsed height, so the button
 * never hides just a few lines. Once collapsible it stays so until the text is clearly shorter
 * (1.25 times): a scrollbar appearing or going changes the width by a few pixels and must not
 * make the button flicker.
 */
export function shouldCollapse(fullHeight: number, lineHeight: number, was = false): boolean {
  if (!(lineHeight > 0)) return false;
  return fullHeight >= COLLAPSED_LINES * lineHeight * (was ? 1.25 : 1.5);
}
