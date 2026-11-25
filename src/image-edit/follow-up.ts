// "make the background white" after an image means: edit that image (docs/image-editing-20261125.md).
// ChatGPT lets its model decide; here a short list of rules decides on the device, before anything
// is sent, and only when the chat's last message is an image. A wrong yes spends one of the day's
// images, so in doubt it is a normal message: the editor is one tap away.

const LEAD = "(?:please\\s+|now\\s+|and\\s+|then\\s+|can you\\s+|could you\\s+|bitte\\s+|jetzt\\s+|und\\s+|kannst du\\s+|können sie\\s+)*";
// Verbs that are about a picture by themselves.
const PICTURE_VERB = new RegExp(
  `^${LEAD}(remove|erase|replace|recolou?r|brighten|darken|lighten|blur|sharpen|crop|rotate|flip|entferne|entfernen sie|ersetze|ersetzen sie|färbe|helle|dunkle|drehe|spiegle)(?![\\wäöüß])`,
  "i",
);
// Verbs that could mean anything ("make a plan", "add a reminder"): an edit only with a word about the picture.
const GENERAL_VERB = new RegExp(
  `^${LEAD}(make|change|turn|add|put|paint|colou?r|move|swap|extend|mach|mache|machen sie|ändere|ändern sie|füge|fügen sie|setze|male|verschiebe|tausche|erweitere)(?![\\wäöüß])`,
  "i",
);
const PICTURE_WORD =
  /(?<![\wäöüß])(it|this|that|image|picture|photo|background|foreground|sky|colou?rs?|light\w*|dark\w*|bright\w*|bigger|smaller|larger|black|white|red|green|blue|yellow|orange|purple|pink|gr[ae]y|brown|night|sunset|sunrise|snow|rain|left|right|top|bottom|middle|corner|es|das|dies\w*|bild|foto|hintergrund|vordergrund|himmel|farbe\w*|hell\w*|dunk\w*|größer|kleiner|schwarz\w*|weiß\w*|rot\w*|grün\w*|blau\w*|gelb\w*|nacht|schnee|regen|links|rechts|oben|unten|mitte|ecke)(?![\wäöüß])/i;
// A phrase that is itself an edit: "more contrast", "without the car", "in black and white", "the same but at night".
const EDIT_PHRASE =
  /^(?:please\s+|now\s+|bitte\s+|jetzt\s+)*(?:more|less|without|mehr|weniger|ohne)\s+\S+|^(?:the\s+)?same\b.*\b(?:but|with|without|in)\b|^(?:dasselbe|nochmal|noch einmal)\b.*\b(?:aber|mit|ohne|in)\b|^in\s+(?:black and white|watercolou?r|schwarz-?weiß|aquarell)/i;
// A question, or a task for the chat model or another part of the app, whatever the verb.
const NOT_EDIT =
  /\?\s*$|^(?:what|why|how|who|where|when|which|is|are|does|do|did|was|were|explain|describe|tell|write|summari[sz]e|translate|remember|remind|was|warum|wie|wer|wo|wann|welche[rs]?|ist|sind|erkläre|beschreibe|erzähle|schreibe|fasse|übersetze|merke|erinnere)\b|(?<![\wäöüß])(?:list|recipe|summary|e-?mail|letter|table|code|essay|poem|haiku|plan|story|chat|conversation|message|words?|captions?|ideas?|sentence|reminder|task|memory|notes?|every day|every week|liste|rezept|zusammenfassung|brief|tabelle|gedicht|geschichte|unterhaltung|nachricht|wort|wörter|ideen?|satz|erinnerung|aufgabe|notiz\w*|jeden tag|jede woche)(?![\wäöüß])/i;

/** True when `text`, sent right after an image, asks for a change to that image. */
export function looksLikeImageEdit(text: string): boolean {
  const said = text.trim();
  if (!said || said.length > 240 || said.includes("\n") || NOT_EDIT.test(said)) return false;
  return PICTURE_VERB.test(said) || (GENERAL_VERB.test(said) && PICTURE_WORD.test(said)) || EDIT_PHRASE.test(said);
}
