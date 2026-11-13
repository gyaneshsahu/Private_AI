// German rules, fees and deadlines (docs/german-rules-20261113.md): on-device rules that spot a
// question about German law or administration, and the after-answer check for figures that no
// official source backed. No model call; the text never leaves the device for this.

// A topic word alone is enough. \p{L} boundaries so umlauts count as letters; \p{L}* lets
// German compounds through (Kündigungsfrist, Vergleichsmiete, Grundfreibetrag).
const TOPIC_DE =
  /(?<!\p{L})(\p{L}*bu(ß|ss)geld\p{L}*|flensburg|geblitzt|blitzer\p{L}*|fahrverbot|innerorts|außerorts|winterreifen|hauptuntersuchung|rote\p{L}* ampel|rotlicht\p{L}*|(handy|alkohol) am steuer|promille\p{L}*|falschpark\p{L}*|parkverstoß|\p{L}*frist\p{L}*|(?!an)\p{L}*kündig\p{L}*|\p{L}*miet\p{L}*|vermieter\p{L}*|nebenkosten\p{L}*|mietkaution|mindesturlaub|urlaubsanspruch|resturlaub|urlaubstage|elternzeit|mutterschutz|probezeit|arbeitsvertrag|krankschreibung|lohnfortzahlung|abmahnung|abfindung|mindestlohn|kurzarbeit\p{L}*|gewährleistung\p{L}*|widerruf\p{L}*|rückgaberecht|umtauschrecht|steuererklärung|steuerklasse|\p{L}*freibetrag|einkommensteuer\p{L}*|finanzamt|kirchensteuer|grundsteuer|hundesteuer|kfz-steuer|kleinunternehmer\p{L}*|werbungskosten|pendlerpauschale|aufbewahr\p{L}*|steuer-id|steuernummer|kindergeld|elterngeld|bürgergeld|wohngeld|bafög|arbeitslosengeld|pflegegeld|\p{L}*rente(n\p{L}*)?|bürgeramt|einwohnermeldeamt|\p{L}*behörde\p{L}*|ausländerbehörde|standesamt|jobcenter|ummeld\p{L}*|wohnsitz\p{L}*|meldebescheinigung|wohnungsgeber\p{L}*|personalausweis|reisepass|\p{L}*ausweis|führerschein\p{L}*|fahrerlaubnis|zulassungsstelle|kfz-zulassung|\p{L}*zulassung|aufenthaltstitel|aufenthaltserlaubnis|einbürgerung|rundfunkbeitrag|krankenkasse\p{L}*|krankenversicherung\p{L}*|zusatzbeitrag|pflegeversicherung|sozialversicherung\p{L}*)(?!\p{L})/iu;
const TOPIC_EN =
  /\b(speeding( tickets?| fines?)?|traffic fines?|penalty points|red lights?|drink[- ]driving|parking tickets?|notice period|landlords?|tenants?|tenancy|rent (increase|rise|reduction)|security deposit|minimum (annual )?(leave|holiday|vacation)|holiday entitlement|probation(ary)? period|statutory warranty|right of withdrawal|tax returns?|tax allowance|tax-free allowance|income tax|tax class|child benefit|parental (allowance|benefit|leave)|citizen'?s income|unemployment benefits?|pensions?|registration office|register (my )?address|deregister|ID card|identity card|passports?|driving licen[cs]e|driver'?s license|vehicle registration|licen[cs]e plates?|TV licen[cs]e|broadcasting fee|health insurance|residence permit|minimum wage|winter (tyres|tires)|retention period)\b/i;
// Statute names are case-sensitive: "AO" or "GG" would match ordinary words.
const STATUTE =
  /§|\b(BGB|StVO|StVG|UStG|EStG|HGB|SGB|BUrlG|KSchG|StGB|ZPO|BetrVG|ArbZG|MuSchG|BEEG|BKGG|FeV|PAuswG|BMG|AufenthG)\b|gesetze-im-internet/;
// "In Germany" plus a rule or fee word.
const GERMANY =
  /\b(in|under|within|across) germany\b|\bgerman (law|rules?|authorities|courts?)\b|(?<!\p{L})((in|innerhalb) deutschlands?|deutsche\p{L}* recht\p{L}*|deutschem recht|hierzulande)(?!\p{L})/iu;
const RULE =
  /\b(laws?|legal|illegal|allowed|permitted|forbidden|required|mandatory|obliged|must (i|you|we)|do (i|you|we) have to|deadline|fees?|fines?|penalt(y|ies)|entitled|rules?|regulations?)\b|(?<!\p{L})(gesetz\p{L}*|erlaubt|verboten|pflicht\p{L}*|verpflichtet|vorschrift\p{L}*|darf|dürfen|muss (ich|man)|müssen (wir|sie)|gebühr\p{L}*|strafe\p{L}*|anspruch|regel\p{L}*|rechtlich)(?!\p{L})/iu;
// A general explanation counts only with a concrete rule ask (how much, how long, by when...).
const EXPLAIN =
  /\b(explain|define|definition|what is an?\b|what are\b|difference between|how does\b.*\bwork)|(?<!\p{L})(erkläre|erklär|definiere|was ist (ein|eine)|was sind|was bedeutet|wie funktioniert|unterschied)(?!\p{L})/iu;
const ASK =
  /\b(how (much|many|long|often)|by when|until when|deadline|notice period|costs?|fees?|fines?|penalt(y|ies)|must i|do i (have|need) to|am i allowed|entitled)\b|(?<!\p{L})(wie (viel|viele|hoch|lange|oft)|bis wann|ab wann|wann muss|muss ich|darf ich|\p{L}*frist\p{L}*|kostet|kosten|gebühr\p{L}*|beitrag|strafe|anspruch)(?!\p{L})/iu;
// Rewriting, translating, summarising or writing given text: the rule words belong to the text,
// not to a question. shortcut: "Write me what my notice period is" is missed; widen if seen.
const TRANSFORM =
  /^\s*(please\s+|bitte\s+)?(rewrite|rephrase|reword|translate|summari[sz]e|shorten|proofread|write|draft|compose|turn (this|these)|make (this|these)\b)|(?<!\p{L})(formuliere|übersetze|übersetz|fasse\p{L}*|zusammenfass\p{L}*|kürze|korrigiere den text)(?!\p{L})|^\s*(bitte\s+)?(schreib\p{L}*|entwirf|verfasse)(?!\p{L})/iu;

/** True when the text asks about German rules, fees, deadlines or administration. */
export function germanRulesQuestion(text: string): boolean {
  if (TRANSFORM.test(text)) return false;
  const topic =
    TOPIC_DE.test(text) ||
    TOPIC_EN.test(text) ||
    STATUTE.test(text) ||
    (GERMANY.test(text) && RULE.test(text));
  return topic && (!EXPLAIN.test(text) || ASK.test(text));
}

// Figures an answer states as facts: money, periods, deadlines, points, § references.
const NUMBER = String.raw`(\d+([.,]\d+)?|ein|eine|einen|einem|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|vierzehn|dreißig|one|a|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|thirty)`;
const FIGURE = [
  /(€|\bEUR\b|\beuro\b)\s?\d|\d[\d.,]*\s?(€|EUR\b|euro\b)/i,
  new RegExp(
    String.raw`(?<!\p{L})${NUMBER}[\s-]+(werk|arbeits|kalender)?(tage?n?|wochen?|monate?n?|jahre?n?|days?|weeks?|months?|years?|working days?|business days?)(?!\p{L})`,
    "iu",
  ),
  /(?<!\p{L})bis (zum|spätestens)(?!\p{L})/iu,
  /(?<!\p{L})\d{1,2}\.?\s(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|may|june|july|october|december)(?!\p{L})/iu,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}\b/i,
  /\d\s?(punkte?|points?)\b/iu,
  // Written in words (13 November search-first run, P-G4: "einem Punkt und … einem einmonatigen
  // Fahrverbot"). shortcut: also flags prose like "ein Punkt ist wichtig"; that only adds a warning.
  new RegExp(String.raw`(?<!\p{L})${NUMBER}[\s-]+(punkte?n?|points?)(?!\p{L})`, "iu"),
  /(?<!\p{L})(ein|zwei|drei|vier|sechs|zwölf|\d+)[\s-]?(wöchig|monatig|jährig)\p{L}*/iu,
  /§/,
];

/** True when an answer states a money amount, a period or deadline, points or a § reference. */
export function statesUncheckedFigures(answer: string): boolean {
  return FIGURE.some((rule) => rule.test(answer));
}

/**
 * The after-answer check: a German-rules question answered without web results whose answer
 * states figures. Device-only; the flag is never model context and never sent or logged.
 */
export function checkUncheckedFigures(
  messages: { id: string; role: string; text: string }[],
  answerId: string,
  answer: string,
  web: boolean,
): true | undefined {
  if (web) return undefined;
  const question = messages
    .slice(0, messages.findIndex((m) => m.id === answerId))
    .filter((m) => m.role === "user")
    .at(-1)?.text;
  return question &&
    germanRulesQuestion(question) &&
    statesUncheckedFigures(answer)
    ? true
    : undefined;
}

/**
 * Search first (decided 13 November): Send on a German-rules question asks "Search and answer"
 * or "Answer without checking" instead of answering, unless web results are already selected or
 * automatic search is on. Needs a suggestion, so the exact masked text can be shown; nothing is
 * remembered, it asks each time.
 */
export function asksBeforeSending(
  suggestion: { rules: boolean; again?: boolean } | undefined,
  autoSearch: boolean,
  web: boolean,
): boolean {
  return !!suggestion?.rules && !suggestion.again && !autoSearch && !web;
}

/**
 * Official-source preference (13 November, docs/german-rules-20261113.md). Who publishes a page,
 * for searches on German rules, fees and deadlines. These are authorities and public-interest
 * bodies, not facts, so the lists stay stable when the rules change. A host counts when it is the
 * domain or a subdomain of it. Foreign authorities (gv.at, gov) are deliberately not "official"
 * here: for a German rule they are the wrong jurisdiction.
 */
export const RULES_SOURCE_DOMAINS = {
  official: [
    // Federal laws, government, ministries and federal agencies.
    "gesetze-im-internet.de", "bund.de", "bundesregierung.de", "bundestag.de", "bundesrat.de",
    "bmj.de", "bmas.de", "bmfsfj.de", "bundesfinanzministerium.de", "bundesgesundheitsministerium.de",
    "auswaertiges-amt.de", "germany.info", "bzst.de", "zoll.de", "bundesjustizamt.de", "elster.de",
    "arbeitsagentur.de", "familienportal.de", "elterngeld-digital.de", "deutsche-rentenversicherung.de",
    "minijob-zentrale.de", "rundfunkbeitrag.de", "kba.de", "bamf.de", "bundesbank.de", "bafin.de",
    "destatis.de", "bundesnetzagentur.de",
    // Länder and city service portals.
    "berlin.de", "bayern.de", "nrw.de", "hamburg.de", "bremen.de", "niedersachsen.de", "hessen.de",
    "sachsen.de", "sachsen-anhalt.de", "thueringen.de", "brandenburg.de", "regierung-mv.de",
    "schleswig-holstein.de", "rlp.de", "saarland.de", "baden-wuerttemberg.de", "service-bw.de",
    "muenchen.de", "stadt-koeln.de", "frankfurt.de", "stuttgart.de", "duesseldorf.de", "dresden.de",
    "leipzig.de", "hannover.de", "nuernberg.de",
    // EU law.
    "eur-lex.europa.eu", "europa.eu",
  ],
  publicInterest: [
    "verbraucherzentrale.de", "vzbv.de", "evz.de", "test.de",
    "bundesgerichtshof.de", "bundesverfassungsgericht.de", "bundesarbeitsgericht.de",
    "bundessozialgericht.de", "bundesfinanzhof.de", "bverwg.de", "justiz.de",
    "sovd.de", "vdk.de", "sozialverband.de",
  ],
} as const;
export type SourceTier = "official" | "public-interest" | "other";
const under = (host: string, domains: readonly string[]) =>
  domains.some((d) => host === d || host.endsWith("." + d));
/** The tier of a page address for a German-rules search. */
export function sourceTier(url: string): SourceTier {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "other";
  }
  return under(host, RULES_SOURCE_DOMAINS.official)
    ? "official"
    : under(host, RULES_SOURCE_DOMAINS.publicInterest)
      ? "public-interest"
      : "other";
}
const TIER_ORDER: SourceTier[] = ["official", "public-interest", "other"];
/** Official, then public-interest, then the rest, keeping rank order within each; drops nothing. */
export function rankByTier<T extends { url?: string }>(sources: T[]): T[] {
  return TIER_ORDER.flatMap((tier) => sources.filter((s) => sourceTier(s.url ?? "") === tier));
}
/** The label put before each web source's text for the model on a German-rules question. */
export const tierLabel = (url: string) => `[${sourceTier(url)} source]`;

/**
 * The after-answer note: a German-rules question answered from web results of which none is
 * official. Device-only, like uncheckedFigures: never model context, never sent or logged.
 */
export function checkNoOfficialSource(
  messages: { id: string; role: string; text: string }[],
  answerId: string,
  urls: string[],
): true | undefined {
  if (!urls.length || urls.some((u) => sourceTier(u) === "official")) return undefined;
  const question = messages
    .slice(0, messages.findIndex((m) => m.id === answerId))
    .filter((m) => m.role === "user")
    .at(-1)?.text;
  return question && germanRulesQuestion(question) ? true : undefined;
}

export const GERMAN_RULES = {
  // Heading of the pre-send search suggestion when the question is about German rules.
  heading: "Rules, fees and deadlines change. Check the official source first.",
  // After Send: the inline choice (search first by default).
  choiceHeading:
    "This is about rules, fees or deadlines, which change. Search the official source first?",
  // Replaces WHEN_TO_SEARCH.explanation where Send asks first ("Press Send instead…" is not true).
  explanation:
    "One tap sends exactly this text to Brave Search through our server, and our server opens the top result page, preferring an official site. Nothing else from your conversation is sent.",
  without: "Answer without checking",
  // Added to the default product prompt for that turn only, when web results are in context.
  sourcedPolicy:
    " For this question about German rules, fees or deadlines, state figures, deadlines and legal consequences only if they appear in the web results; for anything they do not cover, say so instead of filling it in. Prefer official sources; if they disagree with other sources, follow the official one. If no source is official, say that no official source was found, that the figures may be wrong, and name the authority to check.",
  // Under an answer to a German-rules question whose web results hold no official source.
  noOfficial:
    "No official source was found in the search results. Check the responsible authority before relying on these figures.",
  // Warning under an answer that gives unchecked figures.
  warning:
    "This answer gives figures or deadlines that were not checked against an official source.",
  // Added to the default product prompt for that turn only, when no web result is in context.
  policy:
    " This question is about German rules, fees, deadlines or legal consequences, and no official source is in this conversation. Do not state specific amounts, deadlines, point values or legal consequences as facts. Explain the general rule and what it depends on, name the official place to check (the law on gesetze-im-internet.de or the responsible authority), and offer a web search. If you mention a figure, say that it is unchecked.",
} as const;
