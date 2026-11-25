// "make the background white" after an image means: edit that image (docs/image-editing-20261125.md).
// ChatGPT lets its model decide; here a short list of rules decides on the device, before anything
// is sent, and only when the chat's last message is an image. In doubt it is a normal message.

const EDIT_VERB =
  /^(?:please\s+|now\s+|and\s+|then\s+|can you\s+|could you\s+|bitte\s+|jetzt\s+|und\s+|kannst du\s+|können sie\s+|kannst du bitte\s+)*(make|change|turn|add|remove|replace|erase|delete|put|give|paint|colou?r|recolou?r|brighten|darken|lighten|blur|sharpen|crop|rotate|flip|move|swap|extend|zoom|mach|mache|machen sie|ändere|ändern sie|füge|fügen sie|entferne|entfernen sie|ersetze|ersetzen sie|lösche|löschen sie|setze|male|färbe|helle|dunkle|drehe|spiegle|verschiebe|tausche|erweitere)\b/i;
// A noun phrase that is itself an edit: "a darker sky", "more contrast", "without the car", "in watercolour".
const EDIT_PHRASE =
  /^(?:please\s+|now\s+|bitte\s+|jetzt\s+)*(?:more|less|without|with|no|mehr|weniger|ohne|mit|kein[e]?)\s+\S+|^(?:the\s+)?(?:same|again)\b.*\b(?:but|with|without|in)\b|^(?:das|dasselbe|nochmal|noch einmal)\b.*\b(?:aber|mit|ohne|in)\b|^in\s+(?:black and white|watercolou?r|schwarz-?weiß|aquarell)/i;
// Words that make it a question or a new task for the chat model, not an edit.
const NOT_EDIT =
  /\b(?:list|recipe|summary|e-?mail|letter|table|code|essay|poem|plan|story|liste|rezept|zusammenfassung|brief|tabelle|gedicht|geschichte)\b|\?\s*$|^(?:what|why|how|who|where|when|which|is|are|does|do|did|was|were|explain|describe|tell|write|summari[sz]e|translate|was|warum|wie|wer|wo|wann|welche[rs]?|ist|sind|erkläre|beschreibe|erzähle|schreibe|fasse|übersetze)\b/i;

/** True when `text`, sent right after an image, asks for a change to that image. */
export function looksLikeImageEdit(text: string): boolean {
  const said = text.trim();
  if (!said || said.length > 240 || said.includes("\n")) return false;
  // "Why is the sky red?" and "Describe the picture" are for the chat; "Make ...?" is still an edit.
  if (NOT_EDIT.test(said)) return false;
  return EDIT_VERB.test(said) || EDIT_PHRASE.test(said);
}
