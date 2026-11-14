// German rules, fees and deadlines (docs/german-rules-20261113.md): on-device rules that spot a
// question about German law or administration, and the after-answer check for figures that no
// official source backed. No model call; the text never leaves the device for this.
import type { Lang } from "./i18n";

// People often type without umlauts ("kuendigung", "gebuehr", "strasse"). The text and every cue
// are compared in one folded spelling, so each cue is written once, with its umlauts.
const fold = (s: string) =>
  s.replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss");
const cue = (rule: RegExp) => new RegExp(fold(rule.source), rule.flags);
/** Whole words from a few named families, folded like every cue. */
const words = (...families: string[]) =>
  cue(new RegExp(String.raw`(?<!\p{L})(${families.join("|")})(?!\p{L})`, "iu"));

// A topic word alone is enough. \p{L} boundaries so umlauts count as letters; \p{L}* lets
// German compounds through (Kündigungsfrist, Vergleichsmiete, Grundfreibetrag).
const TOPIC_DE = cue(
  /(?<!\p{L})(\p{L}*bu(ß|ss)geld\p{L}*|flensburg|geblitzt|blitzer\p{L}*|fahrverbot|innerorts|außerorts|winterreifen|hauptuntersuchung|rote\p{L}* ampel|rotlicht\p{L}*|(handy|alkohol) am steuer|promille\p{L}*|falschpark\p{L}*|parkverstoß|\p{L}*frist\p{L}*|(?!an)\p{L}*kündig\p{L}*|\p{L}*miet\p{L}*|vermieter\p{L}*|nebenkosten\p{L}*|\p{L}*kaution|mindesturlaub|urlaubsanspruch|resturlaub|urlaubstage|elternzeit|mutterschutz|probezeit|arbeitsvertrag|krankschreibung|lohnfortzahlung|abmahnung|abfindung|mindestlohn|kurzarbeit\p{L}*|gewährleistung\p{L}*|widerruf\p{L}*|rückgaberecht|umtauschrecht|steuererklärung|steuerklasse|\p{L}*freibetrag|einkommensteuer\p{L}*|finanzamt|kirchensteuer|grundsteuer|hundesteuer|kfz-steuer|kleinunternehmer\p{L}*|werbungskosten|pendlerpauschale|aufbewahr\p{L}*|steuer-id|steuernummer|kindergeld|elterngeld|bürgergeld|wohngeld|bafög|arbeitslosengeld|pflegegeld|\p{L}*rente(n\p{L}*)?|bürgeramt|einwohnermeldeamt|\p{L}*behörde\p{L}*|ausländerbehörde|standesamt|jobcenter|ummeld\p{L}*|wohnsitz\p{L}*|meldebescheinigung|wohnungsgeber\p{L}*|personalausweis|reisepass|\p{L}*ausweis|führerschein\p{L}*|fahrerlaubnis|zulassungsstelle|kfz-zulassung|\p{L}*zulassung|aufenthaltstitel|aufenthaltserlaubnis|einbürgerung|rundfunkbeitrag|krankenkasse\p{L}*|krankenversicherung\p{L}*|zusatzbeitrag|pflegeversicherung|sozialversicherung\p{L}*)(?!\p{L})/iu,
);
const TOPIC_EN =
  /\b(speeding( tickets?| fines?)?|traffic fines?|penalty points|red lights?|drink[- ]driving|parking tickets?|notice period|landlords?|tenants?|tenancy|rent (increase|rise|reduction)|security deposit|minimum (annual )?(leave|holiday|vacation)|holiday entitlement|probation(ary)? period|statutory warranty|right of withdrawal|tax returns?|tax allowance|tax-free allowance|income tax|tax class|child benefit|parental (allowance|benefit|leave)|citizen'?s income|unemployment benefits?|registration office|register (my )?address|deregister|ID card|identity card|passports?|driving licen[cs]e|driver'?s license|vehicle registration|licen[cs]e plates?|TV licen[cs]e|broadcasting fee|health insurance|residence permit|minimum wage|winter (tyres|tires)|retention period)\b/i;
// Everyday words for the same topics (13 November, evaluation/german-routing-20261113): what
// people say instead of the official term (GEZ, Knöllchen, über Rot), and further legal topics.
// Tax counts as something done (absetzen, zahlen, zurückbekommen), not as an amount: "Netto und
// Steuer" of the user's own invoice is a sum, and so is "Mehrwertsteuer", which stays out.
const EVERYDAY_DE = cue(
  /(?<!\p{L})(gez|rundfunkgebühr\p{L}*|fernsehgebühr\p{L}*|knöllchen|strafzettel\p{L}*|parkknolle|abgeschleppt|radarfalle|(über|bei) rot|parkverbot\p{L}*|tüv|versicherungskennzeichen|steuern? (absetz\p{L}*|zahl\p{L}*|spar\p{L}*|zurück\p{L}*)|steuererstattung|steuerlich\p{L}*|steuerfrei\p{L}*|steuerbescheid\p{L}*|steuerberater\p{L}*|lohnsteuer\p{L}*|erbschaft\p{L}*|schenkungsteuer|grunderwerbsteuer|kapitalertragsteuer|abgeltungsteuer|gewerbesteuer|zweitwohnungsteuer|minijob\p{L}*|midijob\p{L}*|arbeitszeugnis|nachtruhe|mittagsruhe|sonntagsruhe|ruhestörung|mahnung|mahnbescheid|inkasso\p{L}*|schufa|pfändung\p{L}*|erben|unterhalt(s\p{L}*)?|sorgerecht|scheidung|\p{L}+pflicht(en|ig\p{L}*)?|welche rechte|meine rechte|recht auf)(?!\p{L})/iu,
);
// Registering, deregistering or re-registering a car, a dog, a business or a home after a move.
const REGISTER = /(?<!\p{L})(an|ab|um)(zu|ge)?meld\p{L}*/iu;
const REGISTER_WHAT = cue(
  /(?<!\p{L})(auto|wagen|fahrzeug|kfz|pkw|motorrad|roller|anhänger|wohnmobil|gewerbe|hund|wohnung|wohnort|wohnsitz|umzug|umzieh\p{L}*|umgezogen|ziehe|ziehen|zieht)(?!\p{L})/iu,
);
// A German permission, duty, deadline or rights question about someone with legal standing
// ("Darf mein Nachbar …", "Bis wann muss ich … mein Chef", "Brauche ich … eine Versicherung").
const FRAME_DE = cue(
  /(?<!\p{L})(darf|dürfen|kann (mein\p{L}*|mir|mich|man (mir|mich))|können (meine|mir|mich)|muss (ich|man|er|sie|mein\p{L}*)|müssen (wir|sie)|brauche ich|braucht man|bis wann|wie viel zeit|wie lange (habe|hat|haben|muss|darf)|zusteh\p{L}*|was kostet (mich|uns)|was droht|droht mir|was blüht|erlaubt|verboten|zulässig|rechtens|legal|illegal|verpflichtet|anspruch)(?!\p{L})/iu,
);
const PARTY_DE = cue(
  /(?<!\p{L})(arbeitgeber\p{L}*|chef(in)?|vorgesetzte\p{L}*|firma|händler\p{L}*|verkäufer\p{L}*|onlineshop|nachbar\p{L}*|polizei\p{L}*|amt|ordnungsamt|jugendamt|sozialamt|gesundheitsamt|zoll|gericht\p{L}*|anwalt|hausverwaltung|eigentümer\p{L}*|versicherung|bank|\p{L}*anbieter|staat|gemeinde)(?!\p{L})/iu,
);

// Question frames and domains (14 November, docs/german-routing-20261113.md). The lists above name
// topics; these catch a rules question by its shape, whatever the topic is called.
// What is allowed or punished, what follows from not doing something, and what someone else owes
// ("Muss der Laden …", "Müssen Überstunden …"): a rules question about any of the everyday
// things below. "Darf ich dich etwas fragen" is addressed to the assistant and stays out.
const ALLOWED = cue(
  /(?<!\p{L})(darf(?! ich [^.?!]*(?<!\p{L})(dich|dir|euch)(?!\p{L}))|dürfen|dürfte|erlaubt|verboten|zulässig|was droht|droht mir|was passiert,? wenn (ich|man|wir)(?!\p{L})[^.?!]*(?<!\p{L})(nicht|kein\p{L}*|ohne|zu spät)|muss (er|sie|es|der|die|das|mein\p{L}*|unser\p{L}*)|müssen (sie|die|meine|unsere))(?!\p{L})|(?<=^\s*|[.?!,:]\s*)(muss|müssen) (?!(ich|man|wir)(?!\p{L}))/iu,
);
// The user's own duty. "Muss ich" is as often practical as legal ("Wann muss ich die Tomaten im
// Garten gießen"), so it counts only where there is a counterparty: DEALINGS or OFFICIAL.
const OWN_DUTY = words(String.raw`muss (ich|man)|müssen wir|verpflichtet|pflicht`);
// An amount, a date, a need, a possibility or a payment to the user. Counts only with OFFICIAL.
const ASKING = words(
  String.raw`wie ?(viel|viele|hoch|lange?|oft|teuer)|was koste[tn]|bis wann|ab wann|ab (welche[mnr]|wie ?viel)|wann muss`,
  String.raw`brauche? ich|braucht man|(bekomme|kriege?) ich|(bekommt|kriegt) man|kann (ich|man)`,
);
// Entitlement and legality wording is a rules question on its own ("Habe ich Anspruch auf …",
// "Steht mir … zu", "Ist das rechtens").
const ENTITLED = words(
  String.raw`anspruch auf|steh(t|en) (mir|uns|dir|ihm|ihr|einem)(?!\p{L})[^.?!]*(?<!\p{L})zu|zusteh\p{L}*`,
  String.raw`gesetzlich\p{L}*|rechtlich\p{L}*|rechtens|rechtswidrig|strafbar|ordnungswidrig\p{L}*|verjähr\p{L}*`,
);
// Official vocabulary is built on a few heads, so any compound on one counts, named above or not
// (Grundsicherung, Familienbeihilfe, Spitzensteuersatz, Aufenthaltsbewilligung, a misspelt
// "Mindeslohn"). Everyday compounds on the same heads are kept out (Trinkgeld, insgesamt).
const OFFICIAL = words(
  // Taxes, benefits, contributions, fees and pay set by law. Not steering (Steuerung, gesteuert,
  // "per App steuern"): plain "steuern" is the tax only after a quantity word.
  String.raw`\p{L}*steuer(?!ung|bar|[nte](?!\p{L}))\p{L}*|(wie ?viele?|welche|keine|ohne|mehr|weniger|höhere) steuern|\p{L}{3,}(?<!trink|taschen|klein|bar|wechsel|spiel|preis|löse)geld(er|es)?`,
  String.raw`\p{L}*(beitrag|beiträge|gebühr(en)?|pauschale|zuschlag|zulage|zuschuss|beihilfe|sozialhilfe|lohn|maut|vignette)`,
  String.raw`\p{L}{3,}(sicherung|grenze)`,
  // Offices, applications, permits and decisions.
  String.raw`\p{L}{3,}(?<!ges|mits|alles)amt|\p{L}{3,}bescheid|\p{L}*(antrag|veranlagung|bescheinigung|genehmigung|bewilligung|erlaubnis)|beantrag\p{L}*`,
  // Bans and penalties.
  String.raw`\p{L}{3,}verbot|\p{L}*strafe|erwischt|schwarzfahr\p{L}*`,
  // Claims against a seller or carrier.
  String.raw`geld zurück|\p{L}*erstatt\p{L}*|entschädig\p{L}*|schadensersatz|garantie\p{L}*|reklamier\p{L}*|reklamation\p{L}*|umtausch\p{L}*|zurückgeben`,
);
// Everyday places and roles the law attaches to. They count only with an ALLOWED frame: "Darf ich
// auf dem Balkon grillen" is a rules question, "Was kostet ein Fahrrad" is not.
const PLACES = words(
  // Home and neighbours.
  String.raw`\p{L}*wohnung\p{L}*|balkon\p{L}*|\p{L}*garten\p{L}*|\p{L}*haus|hausflur|keller|grundstück\p{L}*|nachbar\p{L}*`,
  // School, childcare and age limits for the young.
  String.raw`\p{L}*schule|schul\p{L}*|kita\p{L}*|wie alt muss|ab welchem alter|ab wie ?viel jahren|mit 1\d( jahren)?|minderjährig\p{L}*|volljährig\p{L}*|jugendliche\p{L}*`,
  // Road and travel.
  String.raw`\p{L}*straße\p{L}*|gehweg|radweg|bürgersteig|autobahn|auto|fahrrad|rad|e-?scooter|roller|moped|mofa|motorrad|park(e|en|t|platz)|bahn|bus|zug|flug\p{L}*|ticket|fahrschein`,
  // Work and training.
  String.raw`arbeit\p{L}*|chef(in)?|job|nebenjob\p{L}*|überstunden|\p{L}*urlaub\p{L}*|teilzeit|vollzeit|krankgeschrieben|krankmeld\p{L}*|azubi\p{L}*|ausbildung|praktik\p{L}*|student\p{L}*|schüler\p{L}*|rentner\p{L}*|gehalt|verdien\p{L}*|dazuverdien\p{L}*`,
);
// Buying, contracts and records: dealings with a counterparty.
const DEALINGS = words(
  String.raw`\p{L}*vertrag\p{L}*|abo\p{L}*|mitgliedschaft|fitnessstudio|geschäft|shop|händler\p{L}*|verkäufer\p{L}*|käufer\p{L}*|bestell\p{L}*|paket\p{L}*|liefer\p{L}*`,
  String.raw`reparier\p{L}*|reparatur|kaputt\p{L}*|defekt\p{L}*|rechnung\p{L}*|quittung\p{L}*|kontoauszüge?|unterlagen|belege?`,
);
// The user's own figures: with two or more money or percent amounts the question is a sum, so an
// amount question alone is not enough ("500 € inklusive 19 % Mehrwertsteuer. Wie viel Steuer …").
const OWN_FIGURE = /\d[\d.,]*\s?(€|eur\b|euros?\b|%|prozent\b|percent\b)|(€|\bEUR)\s?\d/gi;
// Working out a total, a share or a split of those figures ("Wie viel zahlt jede Person?").
const SUM_OF_THEM = cue(
  /(?<!\p{L})(wie ?viel (ist|sind|macht|wäre|wären) das|was macht das|how much is that|what percentage|aufteil\p{L}*|aufgeteilt|geteilt durch|pro (person|kopf)|jede person|jeder von (uns|ihnen)|split|each (person|of (us|them))|per (person|head))(?!\p{L})/iu,
);
// An organisation's own rule (a company, a club) is not an official one.
const INTERNAL = cue(
  /(?<!\p{L})(intranet|bei uns (in der|im) (firma|abteilung|schule|betrieb|büro|unternehmen|verein|team)|(company|office|team|club|house) (policy|rules?|guidelines?|handbook)|(at|in) (our|my) (company|office|firm|club|team|department)|(my|our) team)(?!\p{L})/iu,
);
// The rules of a game or a sport are not official ones either.
const GAME =
  /\b(chess|monopoly|poker|board game|card game|video game|the game|football|soccer|rugby|basketball|tennis|hockey|referee|offside)\b/i;

// English (14 November, "English coverage" in docs/german-routing-20261113.md): the same design as
// German. Users live in Germany, Austria or Switzerland, so no country has to be named. A frame
// (permission, duty, amount or deadline, entitlement) counts with a domain, never a word alone.
const en = (...families: string[]) => new RegExp(String.raw`\b(${families.join("|")})\b`, "i");
// Whoever has legal duties towards the user.
const PARTY_WORDS = String.raw`landlord|landlady|tenants?|employers?|boss|manager|company|insurer|insurance|bank|seller|shop|store|retailer|airline|neighbou?rs?|police|authorit(y|ies)|court|school|kindergarten|daycare|council|government|provider|agency|gym`;
// "Can my boss …", "Can the landlord …", "Must the shop …": a rules question as it stands.
const PARTY_EN = en(PARTY_WORDS);
const THEIR_EN = en(String.raw`(can|could|may|must|shall) (my|our|your|the|a|an) (\w+ )?(${PARTY_WORDS})`);
const ALLOWED_EN = en(
  String.raw`allowed|permitted|legal|illegal|lawful|forbidden|prohibited|banned`,
  String.raw`what happens if (i|we|you|my)|what if (i|we) (do not|don't|miss)`,
);
const OWN_DUTY_EN = en(String.raw`(have|has|need|needs|required|obliged|obligated|supposed) to|must (i|we|you)|mandatory|compulsory|obligatory`);
const ASKING_EN = en(
  String.raw`how (much|many|long|often|high|old|soon)|by when|until when|from when|when (is|are|do|does|must|should|can|will)`,
  String.raw`what(['’]s| is| are) (the|my)|what does|do (i|we|you) (need|get|qualify)|(can|could|may|will|would) (i|we|you)|is there an?|are there|eligible`,
);
const ENTITLED_EN = en(
  String.raw`entitled|entitlement|by law|legally|statutory|unlawful|against the law|my (legal )?rights|(have|has) (a|the|any) right to|sue|time-barred|statute of limitations|limitation period`,
);
// Official vocabulary: what the state, a law or an authority sets, grants, charges or decides.
const OFFICIAL_EN = en(
  String.raw`tax(es|ed|able)?|tax-free|vat|deduct\w*|customs|duty-free|tolls?|vignette`,
  String.raw`benefits?(?! of)|allowances?|pensions?|subsid(y|ies)|welfare|social security|child support|alimony`,
  String.raw`fees?|fines?|fined|penalt(y|ies)|surcharges?|contributions?|deposits?`,
  String.raw`permits?|visas?|licen[cs]es?|citizenship|naturali[sz]\w*|passports?|residence|residency|blue card|authorit(y|ies)|job ?cent(er|re)`,
  String.raw`(tax|immigration|registration|foreigners['’]?|citizens['’]?|employment|welfare) office`,
  String.raw`deadlines?|limits?(?! (of|as))|minimum (wage|age)|fired|dismiss\w*|evict\w*|deport\w*|laid off|severance`,
  String.raw`sick (leave|pay|notes?|days?)|(maternity|paternity|parental|annual|paid|unpaid) leave|(vacation|holiday|leave) (days|entitlement|pay)|overtime|probation\w*`,
  String.raw`refunds?|compensation|warranty|anmeldung|ummeldung|abmeldung`,
);
// Everyday places and roles the law attaches to; they count only with a permission frame.
const PLACES_EN = en(
  PARTY_WORDS,
  String.raw`flat|apartment|house|balcony|garden|yard|basement|stairwell|hallway|rent(ed|ing|al)?|sublet\w*|lease|noise|quiet hours`,
  String.raw`school|children|child|kids?|minors?|under ?1[0-8]|at 1[0-8]|teenagers?`,
  String.raw`roads?|streets?|pavement|sidewalk|cycle path|bike lane|motorway|autobahn|highway|cars?|driv(e|ing)|park(ed|ing)?|bikes?|bicycle|cycl(e|ing)|e-?scooter|moped|motor(bike|cycle)|trains?|bus|tram|flights?|tickets?`,
  String.raw`work(s|ed|ing|place)?|jobs?|employ\w+|shifts?|part-time|full-time|freelanc\w+|self-employed|intern(ship)?|apprentice\w*|students?|salary|wages?|holidays?|vacation|sundays?`,
);
// Buying, contracts and records: dealings with a counterparty.
const DEALINGS_EN = en(
  String.raw`contracts?|subscriptions?|membership|bought|purchase[ds]?|ordered|cancel\w*|invoices?|receipts?|records|return (it|them|something|an?|the|my)|send (it|them) back`,
);
// Registering an address, a car, a dog or a business.
const REGISTER_EN = en(String.raw`(de-?)?regist(er|ers|ered|ering|ration)`);
const REGISTER_WHAT_EN = en(String.raw`address|residence|car|vehicle|dog|business|trade|moved?|moving|birth|marriage|authorit(y|ies)`);
// Another country's rule is out of scope: the official-source handling is for Germany, Austria and
// Switzerland. Only a place ("in France") or the rule itself ("US tax", "UK visa") counts, so "I am
// from India" or "my Turkish passport" changes nothing.
const ELSEWHERE = String.raw`usa|u\.s\.a?\.?|united states|america|uk|u\.k\.|united kingdom|britain|england|scotland|ireland|france|spain|italy|portugal|netherlands|belgium|poland|denmark|sweden|norway|greece|turkey|india|china|japan|canada|australia|brazil|mexico|california|texas|florida|new york|london|paris|dubai`;
const ABROAD = [
  en(String.raw`(in|under|within|across) (the )?(us|${ELSEWHERE})`),
  en(
    String.raw`(us|${ELSEWHERE}|american|british|english|irish|french|spanish|italian|dutch|polish|turkish|indian|chinese|japanese|canadian|australian) (law|laws|tax|taxes|visa|rules|regulations|minimum wage|citizenship|courts?)`,
  ),
  /\b(IRS|HMRC|NHS)\b/,
];
const AT_HOME = cue(/\b(germany|german|austrian?|swiss|switzerland|here)\b|deutsch|österreich|schweiz/iu);
// A question about software is not a rules question, whatever the software computes.
const SOFTWARE =
  /(?<!\p{L})(python|javascript|typescript|java|sql|excel|regex|html|css|json|csv|datetime)(?!\p{L})/iu;
// Code identifiers are not words: `checkFrist`, max_miete, getGebuehr().
const IDENTIFIER = /`[^`\n]*`|[\p{L}\d]+_[\p{L}\d_]+|\p{Ll}+\p{Lu}[\p{L}\d]*|[\p{L}\d]+\(\)/gu;
// Statute names are case-sensitive: "AO" or "GG" would match ordinary words.
const STATUTE =
  /§|\b(BGB|StVO|StVG|UStG|EStG|HGB|SGB|BUrlG|KSchG|StGB|ZPO|BetrVG|ArbZG|MuSchG|BEEG|BKGG|FeV|PAuswG|BMG|AufenthG)\b|gesetze-im-internet/;
// "In Germany" (or Austria, Switzerland) plus a rule or fee word.
const GERMANY = cue(
  /\b(in|under|within|across) (germany|austria|switzerland)\b|\b(german|austrian|swiss) (law|rules?|authorities|courts?)\b|(?<!\p{L})((in|innerhalb) deutschlands?|in österreich|in der schweiz|(deutsche|österreichische|schweizer)\p{L}* recht\p{L}*|deutschem recht|hierzulande)(?!\p{L})/iu,
);
// English rule wording: a duty, a permission, a limit on a stay or a job, a permit, tax or insurance.
const RULE = cue(
  /\b(laws?|legal|illegal|allowed|permitted|forbidden|required|mandatory|obliged|must (i|you|we)|do (i|you|we) (have|need) to|do (i|you|we) need an?|can my|how long (can|may|do|must) (i|you|we)|eligible|deadline|fees?|fines?|fined|penalt(y|ies)|entitled|rules?|regulations?|visa|permits?|tax(es)?|insurance|fired?|evict\w*|sick (leave|pay|note))\b|(?<!\p{L})(gesetz\p{L}*|erlaubt|verboten|pflicht\p{L}*|verpflichtet|vorschrift\p{L}*|darf|dürfen|muss (ich|man)|müssen (wir|sie)|gebühr\p{L}*|strafe\p{L}*|anspruch|regel\p{L}*|rechtlich)(?!\p{L})/iu,
);
// A general explanation counts only with a concrete rule ask (how much, how long, by when...).
const EXPLAIN = cue(
  /\b(explain|define|definition|what is an?\b|what are\b|difference between|how does\b.*\bwork)|(?<!\p{L})(erkläre|erklär|definiere|was ist (ein|eine)|was sind|was bedeutet|wie funktioniert|unterschied)(?!\p{L})/iu,
);
const ASK = cue(
  /\b(how (much|many|long|often)|by when|until when|deadline|notice period|costs?|fees?|fines?|penalt(y|ies)|must i|do i (have|need) to|am i allowed|entitled)\b|(?<!\p{L})(wie ?(viel|viele|hoch|lange?|oft)|bis wann|ab wann|wann muss|muss ich|darf ich|\p{L}*frist\p{L}*|kostet|kosten|gebühr\p{L}*|beitrag|strafe|anspruch)(?!\p{L})/iu,
);
// Rewriting, translating, summarising or writing given text: the rule words belong to the text,
// not to a question. shortcut: "Write me what my notice period is" is missed; widen if seen.
const TRANSFORM = cue(
  /^\s*(please\s+|bitte\s+)?((can|could) you\s+)?(please\s+)?(help me\s+(to\s+)?)?(rewrite|rephrase|reword|translate|summari[sz]e|shorten|proofread|write|draft|compose|turn (this|these)|make (this|these)\b)|(?<!\p{L})(formulier\p{L}*|übersetze|übersetz|fasse\p{L}*|zusammenfass\p{L}*|kürze|korrigiere den text|(kürzer|freundlicher|höflicher|förmlicher|lockerer) (machen|formulieren|schreiben|fassen))(?!\p{L})|^\s*(bitte\s+)?(schreib\p{L}*|entwirf|verfasse)(?!\p{L})/iu,
);

/** True when the text asks about German rules, fees, deadlines or administration. */
export function germanRulesQuestion(question: string): boolean {
  const text = fold(question.replace(IDENTIFIER, " "));
  if (TRANSFORM.test(text) || INTERNAL.test(text) || SOFTWARE.test(text) || GAME.test(text)) return false;
  if (ABROAD.some((rule) => rule.test(text)) && !AT_HOME.test(text)) return false;
  const ownFigures = (text.match(OWN_FIGURE)?.length ?? 0) >= 2;
  if (ownFigures && SUM_OF_THEM.test(text)) return false;
  const allowed = ALLOWED.test(text);
  const official = OFFICIAL.test(text);
  const dealings = DEALINGS.test(text);
  // English frames take German official words too ("How much Kirchensteuer do I pay?").
  const officialEn = official || OFFICIAL_EN.test(text);
  const dealingsEn = DEALINGS_EN.test(text);
  const english =
    THEIR_EN.test(text) ||
    ENTITLED_EN.test(text) ||
    (REGISTER_EN.test(text) && REGISTER_WHAT_EN.test(text)) ||
    (ALLOWED_EN.test(text) && (officialEn || dealingsEn || PLACES_EN.test(text))) ||
    (!ownFigures && OWN_DUTY_EN.test(text) && (officialEn || dealingsEn || PARTY_EN.test(text))) ||
    (!ownFigures && ASKING_EN.test(text) && officialEn);
  const topic =
    english ||
    TOPIC_DE.test(text) ||
    EVERYDAY_DE.test(text) ||
    (REGISTER.test(text) && REGISTER_WHAT.test(text)) ||
    (FRAME_DE.test(text) && PARTY_DE.test(text)) ||
    TOPIC_EN.test(text) ||
    STATUTE.test(question) ||
    (GERMANY.test(text) && (RULE.test(text) || OWN_DUTY_EN.test(text))) ||
    ENTITLED.test(text) ||
    (allowed && (official || dealings || PLACES.test(text))) ||
    (!ownFigures && OWN_DUTY.test(text) && (official || dealings)) ||
    (!ownFigures && ASKING.test(text) && official);
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

// Answer-side check (13 November, docs/german-rules-20261113.md): signals that an ANSWER states a
// German rule, fee, deadline or legal consequence, whatever the question looked like. Calibrated
// on the older stored answers only (never on the frozen 40-question set).
// A § counts as a law reference when a number and a word follow ("§ 17 BMG", "§ 5 Abs. 1"), not
// in a document citation like "[d5ef4c4c, §4]".
const LAW =
  /§§?\s?\d+[a-z]?\s+(Abs\.?|Absatz|Satz|Nr\.?|S\.|[A-ZÄÖÜ]\p{L}*)|\b(BGB|StVO|StVG|BKatV|UStG|EStG|AO|HGB|SGB|BUrlG|KSchG|StGB|ZPO|BetrVG|ArbZG|MuSchG|BEEG|BKGG|FeV|FZV|PAuswG|PassG|BMG|AufenthG|EntgFG|EFZG|MiLoG|TzBfG|NachwG|WoGG|BAföG|LStR|GewO|RBStV)\b|gesetze-im-internet/gu;
const PENALTY =
  /(?<!\p{L})(\p{L}*bu(ß|ss)geld\p{L}*|verwarn(ungs)?geld\p{L}*|fahrverbot\p{L}*|punkte?n? in flensburg|flensburg|penalty points?)(?!\p{L})/iu;
// Money next to a fee, fine, tax, allowance or authority word, in the same sentence.
const MONEY = /(€|\bEUR\b|\beuro\b)\s?(\d[\d.,]*)|(\d[\d.,]*)\s?(€|EUR\b|euro\b)/giu;
const MONEY_CONTEXT =
  /(?<!\p{L})(\p{L}*gebühr\p{L}*|\p{L}*steuer\p{L}*|\p{L}*freibetrag\p{L}*|\p{L}*pauschale\p{L}*|\p{L}*beitrag\p{L}*|\p{L}*geld|\p{L}*strafe\p{L}*|\p{L}*zuschlag\p{L}*|bußgeld\p{L}*|\p{L}*grenze|behörde\p{L}*|\p{L}*amt|finanzamt|zoll\p{L}*|anspruch|gesetzlich\p{L}*|fees?|fines?|penalt(y|ies)|tax(es|-free)?|allowance|levy|duty|benefits?|authorit(y|ies)|statutory|legal(ly)?|threshold|exemption)(?!\p{L})/iu;
// A period or deadline next to legal or authority vocabulary, in the same sentence. "Frist" alone
// is vocabulary, not a figure: "fristgerecht zum nächstmöglichen Termin" states nothing to check.
const PERIOD = new RegExp(
  String.raw`(?<!\p{L})(${NUMBER})[\s-]+(werk|arbeits|kalender)?(tage?n?|wochen?|monate?n?|jahre?n?|days?|weeks?|months?|years?|working days?|business days?)(?!\p{L})|(?<!\p{L})(bis zum|bis spätestens)(?!\p{L})`,
  "giu",
);
const LEGAL_CONTEXT =
  /(?<!\p{L})(\p{L}*frist\p{L}*|kündig\p{L}*|widerruf\p{L}*|gewährleistung\p{L}*|gesetz\p{L}*|rechtlich\p{L}*|anspruch\p{L}*|pflicht\p{L}*|verpflichtet|behörde\p{L}*|\p{L}*amt|antrag|beantrag\p{L}*|anmeld\p{L}*|ummeld\p{L}*|vermieter\p{L}*|mieter\p{L}*|arbeitgeber\p{L}*|finanzamt|verjähr\p{L}*|aufbewahr\p{L}*|statutory|legal(ly)?|entitled|notice period|withdrawal|warranty|landlord|tenant|employer|authorit(y|ies)|register|limitation period)(?!\p{L})/iu;
const numbersIn = (text: string) =>
  new Set((text.match(/\d[\d.,]*\d|\d/g) ?? []).map((n) => n.replace(/[.,]/g, "")));

/**
 * True when the answer states a German rule, fee, deadline or legal consequence as fact.
 * Ignored: code, and figures the user gave in the question (so arithmetic on the user's own
 * amounts, e.g. VAT on their invoice, does not count).
 */
export function answerStatesRules(answer: string, question = ""): boolean {
  const text = answer.replace(/```[\s\S]*?(```|$)|~~~[\s\S]*?(~~~|$)|`[^`\n]*`/g, " ");
  const given = numbersIn(question);
  // shortcut: a calculation question with money in it is treated as arithmetic, so its EUR
  // results never count; a rule figure in such an answer is missed. Revisit if seen.
  const arithmetic = /\d\s?(€|EUR\b|euro\b)|(€|\bEUR\b)\s?\d/iu.test(question);
  const fresh = (n: string) => !given.has(n.replace(/[.,]/g, ""));
  // A law the user named in the question (a text to translate, say) is theirs, not the answer's.
  if ([...text.matchAll(LAW)].some((m) => !question.includes(m[0])) || PENALTY.test(text))
    return true;
  return text.split(/(?<=[.!?:;])\s+|\n+/).some((sentence) => {
    const money =
      !arithmetic &&
      [...sentence.matchAll(MONEY)].some((m) => fresh(m[2] ?? m[3])) &&
      MONEY_CONTEXT.test(sentence);
    const period =
      [...sentence.matchAll(PERIOD)].some((m) => !m[1] || !/\d/.test(m[1]) || fresh(m[1])) &&
      LEGAL_CONTEXT.test(sentence);
    return money || period;
  });
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
  if (!question) return undefined;
  // The question detector, or the answer-side check, which does not depend on the question's wording.
  return (germanRulesQuestion(question) && statesUncheckedFigures(answer)) ||
    answerStatesRules(answer, question)
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

// The interface language for texts read outside React. Not imported from ./i18n at run time: the
// server runs this file on its own (Dockerfile copies it alone) and evaluation pages load it
// without React. Same rule as readLang() in src/i18n.tsx: the saved pick, else German when the
// browser's first language is German. src/i18n.tsx can hand over its own state with
// setTextLanguage(uiLang), so a pick kept only in memory (blocked storage) is followed too.
let textLanguage = (): Lang => {
  try {
    const saved = localStorage.getItem("cometrow.language");
    if (saved === "de" || saved === "en") return saved;
  } catch {
    /* storage blocked or absent: browser language */
  }
  const first =
    typeof navigator === "undefined"
      ? undefined
      : navigator.languages?.length
        ? navigator.languages[0]
        : navigator.language;
  return /^de\b/i.test(first ?? "") ? "de" : "en";
};
export function setTextLanguage(get: () => Lang) {
  textLanguage = get;
}
/**
 * The German off-switch (owner, 13 November 2026). German exists only in a build made with
 * VITE_GERMAN_UI=1; any other build is English everywhere, whatever the browser language or a saved
 * pick, and shows no DE/EN switch. Off until the owner approves the German legal texts. A build
 * setting, not /api/status: the sign-in page shows legal text before any status is readable.
 * Node (the server, evaluation scripts) has no import.meta.env, so it is English there too.
 */
export function germanEnabled(): boolean {
  // Read in two steps: Vite and Vitest only fill the plain `import.meta.env` form.
  const env: ImportMetaEnv | undefined = import.meta.env;
  return env?.VITE_GERMAN_UI === "1";
}
/** The current interface language, for callers that pass none. */
export const interfaceLanguage = (): Lang => (germanEnabled() ? textLanguage() : "en");
/** Like defineText in src/i18n.tsx: the German block must have exactly the English keys and shapes. */
export function textBlock<T extends object>(text: { en: T; de: { [K in keyof T]: T[K] } }) {
  return text as { en: T; de: T };
}
/**
 * A text block that follows the interface language each time it is read, so callers that pass no
 * language (`GERMAN_RULES.warning`) keep working and show the current language.
 */
export function liveText<T extends object>(text: { en: T; de: T }): T {
  return new Proxy(text.en, { get: (_, key) => text[interfaceLanguage()][key as keyof T] });
}

// Model instructions stay English in both languages: only the user sees the blocks below.
const sourcedPolicy =
  " For this question about German rules, fees or deadlines, state figures, deadlines and legal consequences only if they appear in the web results; for anything they do not cover, say so instead of filling it in. Prefer official sources; if they disagree with other sources, follow the official one. If no source is official, say that no official source was found, that the figures may be wrong, and name the authority to check.";
const policy =
  " This question is about German rules, fees, deadlines or legal consequences, and no official source is in this conversation. Do not state specific amounts, deadlines, point values or legal consequences as facts. Explain the general rule and what it depends on, name the official place to check (the law on gesetze-im-internet.de or the responsible authority), and offer a web search. If you mention a figure, say that it is unchecked.";

export const GERMAN_RULES_TEXT = textBlock({
  en: {
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
    sourcedPolicy,
    // Under an answer to a German-rules question whose web results hold no official source.
    noOfficial:
      "No official source was found in the search results. Check the responsible authority before relying on these figures.",
    // Warning under an answer that gives unchecked figures.
    warning:
      "This answer gives figures or deadlines that were not checked against an official source.",
    // Added to the default product prompt for that turn only, when no web result is in context.
    policy,
  },
  de: {
    heading: "Regeln, Gebühren und Fristen ändern sich. Prüfen Sie zuerst die offizielle Quelle.",
    choiceHeading:
      "Hier geht es um Regeln, Gebühren oder Fristen, und die ändern sich. Zuerst die offizielle Quelle suchen?",
    explanation:
      "Ein Tippen sendet genau diesen Text über unseren Server an Brave Search, und unser Server öffnet die oberste Ergebnisseite, bevorzugt eine offizielle Website. Sonst wird nichts aus Ihrer Unterhaltung gesendet.",
    without: "Ohne Prüfung antworten",
    sourcedPolicy,
    noOfficial:
      "In den Suchergebnissen wurde keine offizielle Quelle gefunden. Fragen Sie bei der zuständigen Behörde nach, bevor Sie sich auf diese Zahlen verlassen.",
    warning:
      "Diese Antwort nennt Zahlen oder Fristen, die nicht anhand einer offiziellen Quelle geprüft wurden.",
    policy,
  },
});
/** The block in the current interface language, read at each use. */
export const GERMAN_RULES = liveText(GERMAN_RULES_TEXT);
