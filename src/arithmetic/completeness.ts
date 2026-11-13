// Completeness check (owner decision, 12 November 2026; docs/routing-and-search-20261112.md):
// every figure the user's question asks for must appear in the answer. It runs on the
// device after the reply ends, with no model call. Arithmetic gate v3 found that all 25
// silent wrong answers left out a requested figure ("Steuer und Brutto?" answered with
// the tax only; "Lohn für 5 Stunden?" answered with the hourly rate).
//
// Conservative by design: a quantity is "missing" only when the answer states figures,
// none of them is labelled as that quantity, and every other new figure is labelled as
// something else. An unlabelled new figure, an unparseable question or an answer
// without figures gives "unclear" or "unknown", never a warning.
import { extractMentions, type Mention, type NumberLocale } from "./numbers";
import { PERCENT_CHANGE_CUES } from "./method-checks";
import { replyLocale } from "./check";
import { textFor, uiLang, type Lang } from "../text/core";
import { arithmeticText } from "../text/arithmetic";

export const QUANTITY_KEYS = [
  "tax", "gross", "net", "total", "discount", "payable", "pay", "perPerson", "percentChange",
  "share", "average", "interest", "repayment", "finalAmount", "price", "refund", "time", "date", "count",
] as const;
export type QuantityKey = (typeof QUANTITY_KEYS)[number];

type Kind = "money" | "percent" | "time" | "date" | "count";
type Rule = {
  key: QuantityKey;
  /** Plain English name used in the warning. */
  name: string;
  kind: Kind;
  /** Cue in the question's request. */
  ask: RegExp;
  /** Words in the answer that name this figure (money kinds only; broad on purpose). */
  say?: RegExp;
};

const L = "\\p{L}";
const TAX_WORD = "(?:mwst|ust|umsatzsteuer|mehrwertsteuer|steuer|vat|tax)";
const TOTALISH = `gesamt|insgesamt|\\btotal\\b|summe|\\bsum\\b|endbetrag|endpreis|endsumme|rechnungsbetrag|zahlbetrag|zu zahlen|amount due|final (?:amount|price|total)|brutto|\\bgross\\b`;
const r = (source: string) => new RegExp(source, "giu");

// Order matters for the question: earlier rules blank their match ("gross pay" is pay, not gross).
const RULES: Rule[] = [
  { key: "payable", name: "amount to pay", kind: "money",
    ask: r(`zahlbetrag|zu zahlen(?:de[rn]? betrag)?|zahle ich|zahlen wir|zahlen muss|amount to pay|to pay\\b|payable|amount due|do i (?:have to )?pay|will i pay|must i pay`),
    say: r(`zahlbetrag|zu zahlen|zahl(?:en sie|st du)|überweis|to pay|payable|you pay|${TOTALISH}|nach (?:abzug|skonto|rabatt)|after (?:the )?discount`) },
  { key: "pay", name: "pay", kind: "money",
    ask: r(`(?<!${L})(?:brutto|netto|nacht|sonntags|feiertags|wochen|monats|tages)?lohn(?!${L})|verdienst|vergütung|gross pay|\\bpay\\b|\\bwages?\\b|\\bearnings\\b|\\bsalary\\b`),
    say: r(`lohn|verdien|vergütung|bezahlung|gehalt|\\bpay\\b|\\bpaid\\b|\\bwages?\\b|earn|salary|insgesamt|in total|total`) },
  { key: "tax", name: "tax", kind: "money",
    ask: r(`(?<!${L})(?:umsatz|mehrwert)?steuer(?:betrag)?(?!${L})|\\bmwst\\b|\\bust\\b|\\bvat\\b|\\btax\\b(?!\\s+rate)`),
    say: r(`steuer|mwst|\\bust\\b|\\bvat\\b|\\btax`) },
  { key: "gross", name: "gross amount", kind: "money",
    ask: r(`brutto(?:betrag|preis)?(?!lohn)|\\bgross\\b(?!\\s+(?:pay|wages?|salary|income))(?:\\s+amount)?`),
    say: r(`${TOTALISH}|(?:inkl\\.?|inklusive|einschließlich|incl\\.?|including|inclusive of|with)\\s+(?:\\d[\\d.,]*\\s*%\\s*)?${TAX_WORD}`) },
  { key: "net", name: "net amount", kind: "money",
    ask: r(`netto(?:betrag|preis)?(?!lohn)|\\bnet\\b(?:\\s+amount)?`),
    say: r(`netto|\\bnet\\b|(?:ohne|excl\\.?|excluding|before|vor)\\s+${TAX_WORD}|vor steuern`) },
  { key: "total", name: "total", kind: "money",
    ask: r(`\\btotal\\b|gesamt(?:betrag|summe|preis|kosten)?(?!${L})|insgesamt|\\bsumme\\b|\\bsum\\b`),
    say: r(`${TOTALISH}|zusammen|altogether|in all`) },
  { key: "discount", name: "discount", kind: "money",
    ask: r(`skonto(?:betrag)?|rabatt(?:betrag)?(?!iert)|nachlass|\\bdiscount\\b(?!ed)(?:\\s+amount)?|ersparnis|\\bsaving`),
    say: r(`skonto|rabatt(?!iert)|nachlass|ersparnis|abzug|ermäßigung|discount(?!ed)|saving|you save|sparen`) },
  { key: "perPerson", name: "amount per person", kind: "money",
    ask: r(`pro (?:person|kopf)|je (?:person|kopf)|per (?:person|head)|each (?:person|of us)`),
    say: r(`pro (?:person|kopf)|je (?:person|kopf)|jede[rns]?\\b|per (?:person|head)|\\beach\\b|apiece`) },
  { key: "average", name: "average", kind: "money",
    ask: r(`durchschnitt|mittelwert|im schnitt|\\baverage\\b|\\bmean\\b`),
    say: r(`durchschnitt|mittelwert|im schnitt|average|\\bmean\\b|\\bavg\\b|\\bje\\b|\\bper\\b|\\beach\\b`) },
  { key: "interest", name: "interest", kind: "money",
    ask: r(`(?<!${L})zinsen(?!${L})|zinsbetrag|\\binterest\\b(?!\\s+rate)`),
    say: r(`zins|interest`) },
  { key: "repayment", name: "repayment amount", kind: "money",
    ask: r(`rückzahlung(?:sbetrag)?|zurückzahlen|repayment|\\brepay\\b|pay back`),
    say: r(`rückzahl|zurück|repay|pay back|${TOTALISH}|zusammen`) },
  { key: "finalAmount", name: "final amount", kind: "money",
    ask: r(`endbetrag|endkapital|endwert|final amount|final balance|how much will (?:i|we) have`),
    say: r(`endbetrag|endkapital|endwert|endsumme|kontostand|guthaben|gesamt|final|total|balance|will have|haben sie|hast du|nach \\d+ jahren|after \\d+ years|betrag|amount`) },
  { key: "price", name: "price", kind: "money",
    ask: r(`(?:end|gesamt|wochenend)?preis(?!${L})|\\bprice\\b|\\bkostet\\b|what does .{1,40} cost|how much does .{1,40} cost`),
    say: r(`preis|kost|gebühr|price|cost|fee|${TOTALISH}|to pay|betrag|amount`) },
  { key: "refund", name: "refund", kind: "money",
    ask: r(`(?:rück)?erstattung|erstattet|zurückbekomme|\\brefund|money back|get back`),
    say: r(`erstatt|gutschrift|zurück|refund|reimburs|credit|back`) },
  { key: "percentChange", name: "percentage change", kind: "percent",
    // The shared cues' \b misses a leading umlaut ("Änderung in Prozent"), hence the extra alternative.
    ask: r([...PERCENT_CHANGE_CUES.map((c) => c.source), `(?:ver)?änderung in prozent`].join("|")) },
  { key: "share", name: "percentage share", kind: "percent",
    ask: r(`anteil (?:an|von|am)\\b|als anteil|what (?:percentage|percent|share|proportion) of|\\bshare of|proportion of|percentage of`) },
  { key: "time", name: "time", kind: "time",
    ask: r(`at what time|um wie viel uhr|uhrzeit|wann (?:\\p{L}+ )?(?:los|ab|an|da sein|fahren|aufbrechen|starten|aufstehen)\\p{L}*|what time|departure|\\bdepart\\b|arrival time|when (?:should|must|do|does|will) (?:i|we|it|the \\w+) (?:leave|depart|set off|arrive|start)`) },
  { key: "date", name: "date", kind: "date",
    ask: r(`on what date|an welchem (?:tag|datum)|welches datum|welchem datum|letzte[rn]? tag|enddatum|what date|which date|end date|last day|due date`) },
  { key: "count", name: "number", kind: "count", ask: r(`wie viele|how many`) },
];
const RULE = Object.fromEntries(RULES.map((rule) => [rule.key, rule])) as Record<QuantityKey, Rule>;

/** Words that label a figure as something specific; a figure with none of them is "free". */
const RATE = r(`satz|hourly|per hour|pro stunde|je stunde|an hour|\\brate\\b|zuschlag|aufschlag|surcharge|gebühr|\\bfee\\b`);
const SPECIFIC = [RATE, ...["tax", "gross", "net", "discount", "payable", "pay", "average", "interest", "repayment", "refund"].map((k) => RULE[k as QuantityKey].say!)];
/** "Total inkl. MwSt.", "Steuersatz": tax words that do not label a tax figure. */
const TAX_CONTEXT = r(`(?:inkl\\.?|inklusive|einschließlich|incl\\.?|including|inclusive of|with|mit|ohne|excl\\.?|excluding|before|vor)\\s+(?:\\d[\\d.,]*\\s*%\\s*)?${TAX_WORD}|steuersatz|tax rate|vat rate`);
const PER_HOUR = /^\s*(?:EUR|€|CHF|USD|GBP|\$|£|Euro)?\s*(?:pro|je|per|an|\/)\s*(?:Stunde|Std|hour|hr|h)\b/iu;
/** "6.420,00 EUR netto", "19 % Umsatzsteuer", "20% VAT", "15% student discount": a given, not a request. */
const AFTER_NUMBER = /(?:(?:eur|chf|usd|gbp|€|£|\$)\s*\d[\d.,']*|\d[\d.,']*\s*(?:%|prozent|percent|eur|euro|€|chf|usd|gbp|£|\$))\s*(?:\p{L}+\s+)?$/iu;
/** "Rabatt von 10 %", "VAT of 20%", "netto 500 EUR": a given. */
const BEFORE_NUMBER = /^\s*(?:[:=]|von|of|at|bei|in höhe von|is|ist|beträgt)?\s*(?:eur|chf|usd|€|£|\$)?\s*\d/iu;
/** "inklusive 19 % MwSt", "Anteil an der Summe", "on the discounted price": context, not a request. */
const CONTEXT_WORD = /(?:^|\s)(?:inkl\.?|inklusive|einschließlich|incl\.?|including|plus|zzgl\.?|darauf|abzüglich|minus|less|with|mit|ohne|without|excluding|of|on|from|an|auf|von|vom|zum|zur|aus|über)(?:\s+(?:the|a|der|die|das|den|dem|des|einer?|diese[mnrs]?))?\s*$/iu;
const REQUEST_START = /^(?:bitte\s+)?(?:berechne|rechne|ermittle|calculate|compute|work out|find)\b/iu;
const FINAL_LINE = /^\s*(?:final answer|answer|result|ergebnis|endergebnis|antwort|lösung)\s*:/iu;

/** A calculation question names at least one figure; a bare year ("in 2026") does not count. */
const namesFigure = (text: string, locale: NumberLocale) =>
  extractMentions(text, locale).mentions.some(
    (m) => !(m.kind === "number" && !m.percent && !m.currency && m.decimals === 0 && m.value.gte(1900) && m.value.lte(2100)),
  );

/** The quantities the question asks for, or "unknown" when its request cannot be read. */
export function requestedQuantities(question: string, locale: NumberLocale): QuantityKey[] | "unknown" {
  if (!namesFigure(question, locale)) return "unknown";
  const clauses = question
    .split(/(?<=[.!?])\s+|\n+/u)
    .filter((s) => s.includes("?") || REQUEST_START.test(s.trim()));
  const keys = new Set<QuantityKey>();
  for (let clause of clauses) {
    for (const rule of RULES) {
      for (const m of [...clause.matchAll(rule.ask)]) {
        const before = clause.slice(0, m.index);
        const after = clause.slice(m.index! + m[0].length);
        if (AFTER_NUMBER.test(before) || BEFORE_NUMBER.test(after) || CONTEXT_WORD.test(before)) continue;
        keys.add(rule.key);
      }
      clause = clause.replace(rule.ask, (s) => " ".repeat(s.length));
    }
  }
  // A question that reads as both a change and a share cannot be classified (as in method-checks.ts).
  if (keys.has("percentChange") && keys.has("share")) (keys.delete("percentChange"), keys.delete("share"));
  return keys.size ? [...keys] : "unknown";
}

export type QuantityState = "stated" | "missing" | "unclear";
export type CompletenessResult =
  | { status: "unknown" }
  | { status: "checked"; quantities: { key: QuantityKey; state: QuantityState }[]; missing: QuantityKey[] };

type Figure = { mention: Mention; segment: number; labels: string; perHour: boolean };

const sameValue = (a: Mention, b: Mention) => {
  if (a.kind === "number" && b.kind === "number")
    return a.percent === b.percent && (a.value.eq(b.value) || (!!b.alt && a.value.eq(b.alt)) || (!!a.alt && a.alt.eq(b.value)));
  if (a.kind === "time" && b.kind === "time") return a.minutes === b.minutes;
  if (a.kind === "date" && b.kind === "date") return a.candidates.some((c) => b.candidates.includes(c));
  return false;
};
const fits = (kind: Kind, m: Mention) =>
  kind === "time" ? m.kind === "time"
  : kind === "date" ? m.kind === "date"
  : kind === "percent" ? m.kind === "number" && m.percent
  : m.kind === "number" && !m.percent;
const has = (re: RegExp, text: string) => ((re.lastIndex = 0), re.test(text));

/**
 * For each requested quantity, whether the answer states a value for it. Never throws.
 * `earlier` is the user's previous question: a short follow-up with a new figure and no
 * request of its own ("Mit dem reduzierten Satz von 2.6 %?") asks for the same figures again.
 */
export function checkCompleteness(question: string, answer: string, locale: NumberLocale, earlier?: string): CompletenessResult {
  try {
    let keys = requestedQuantities(question, locale);
    const followUp = keys === "unknown" && !!earlier && question.length <= 160 && namesFigure(question, locale);
    if (followUp) keys = requestedQuantities(earlier, locale);
    if (keys === "unknown") return { status: "unknown" };
    const inputs = extractMentions(followUp ? `${earlier}\n${question}` : question, locale).mentions;
    const { text, mentions } = extractMentions(answer, locale);

    // Segments: lines, then sentences within a line.
    const segments: { start: number; end: number }[] = [];
    for (const line of text.matchAll(/[^\n]+/g))
      for (const part of line[0].matchAll(/.+?(?:(?<!\b(?:inkl|zzgl|exkl|incl|excl|ca|bzw|ggf|approx|Nr|vs|z\.B|d\.h|u\.a))[.;!?](?=\s+\p{Lu})|$)/gu))
        segments.push({ start: line.index! + part.index!, end: line.index! + part.index! + part[0].length });
    const segmentOf = (i: number) => segments.findIndex((s) => i >= s.start && i < s.end);

    const figures: Figure[] = mentions.map((mention, i) => {
      const segment = segmentOf(mention.index);
      const s = segments[segment] ?? { start: 0, end: text.length };
      // A percentage or a figure from the question inside the working does not end the label
      // ("VAT (7 %): 269.50", "Die Steuer beträgt 6.420,00 EUR × 19 % = 1.219,80 EUR").
      const prev = mentions
        .slice(0, i)
        .filter((m) => !(m.kind === "number" && m.percent) && !inputs.some((q) => sameValue(q, m)))
        .at(-1);
      const next = mentions[i + 1];
      let from = prev && segmentOf(prev.index) === segment ? prev.end : s.start;
      // "Label: value": the label runs back to the clause start ("Total ohne 31.00-EUR-Beleg: 48.00").
      if (/:\s*(?:CHF|EUR|USD|GBP|€|£|\$)?\s*$/u.test(text.slice(s.start, mention.index)))
        from = Math.max(s.start, ...[";", "|", ", "].map((c) => text.lastIndexOf(c, mention.index) + 1));
      const to = next && segmentOf(next.index) === segment ? next.index : s.end;
      return {
        mention,
        segment,
        labels: text.slice(from, mention.index) + " " + text.slice(mention.end, to),
        perHour: PER_HOUR.test(text.slice(mention.end, mention.end + 20)),
      };
    });
    const labelled = (f: Figure) => SPECIFIC.some((re) => has(re, f.labels));
    const usable = (rule: Rule, f: Figure) => fits(rule.kind, f.mention) && !(rule.key === "pay" && f.perHour);
    const isNew = (f: Figure) =>
      !inputs.some((m) => sameValue(m, f.mention)) &&
      !figures.some((g) => g !== f && labelled(g) && sameValue(g.mention, f.mention));
    const finalLine = text.split("\n").find((line) => FINAL_LINE.test(line));

    const quantities = keys.map((key) => {
      const rule = RULE[key];
      const candidates = figures.filter((f) => usable(rule, f));
      let state: QuantityState;
      if (rule.kind !== "money") {
        // Percent, clock, date and count answers are recognised by the figure's form.
        state = candidates.some(isNew) ? "stated" : figures.length ? "missing" : "unclear";
      } else {
        // A figure copied from the question ("auf 5 Rappen") does not state a result.
        const stated = candidates.some((f) => {
          if (inputs.some((m) => sameValue(m, f.mention))) return false;
          const seg = segments[f.segment];
          // Rate words do not count as pay ("Sonntagsstundensatz"); "inkl. MwSt" does not count as tax.
          const words = seg ? text.slice(seg.start, seg.end) : "";
          return has(rule.say!, key === "pay" ? words.replace(RATE, " ") : key === "tax" ? words.replace(TAX_CONTEXT, " ") : words);
        });
        const onFinalLine =
          keys.length === 1 && !!finalLine &&
          candidates.some((f) => finalLine.includes(f.mention.text) && !labelled(f));
        const free = candidates.some((f) => isNew(f) && !labelled(f));
        state = stated || onFinalLine ? "stated" : free || !figures.length ? "unclear" : "missing";
      }
      return { key, state };
    });
    return { status: "checked", quantities, missing: quantities.filter((q) => q.state === "missing").map((q) => q.key) };
  } catch {
    // The check never breaks an answer; an unreadable reply is simply unchecked.
    return { status: "unknown" };
  }
}

/**
 * What the app stores on a finished answer: counts and fixed keys only, never text. It reads
 * the user's last question before the answer (and the one before that, for a follow-up).
 */
export function checkAnswerCompleteness(
  messages: { id: string; role: string; text: string }[],
  answerId: string,
  answer: string,
): { requested: number; missing: QuantityKey[] } | undefined {
  const asked = messages.slice(0, messages.findIndex((m) => m.id === answerId)).filter((m) => m.role === "user");
  const question = asked.at(-1)?.text;
  if (!question) return undefined;
  const result = checkCompleteness(question, answer, replyLocale(question), asked.at(-2)?.text);
  return result.status === "checked" ? { requested: result.quantities.length, missing: result.missing } : undefined;
}

/** Owner-accepted wording pattern (12 November 2026), in the interface language. */
export function completenessWarning(missing: readonly string[], lang: Lang = uiLang()): string {
  const t = textFor(arithmeticText, lang);
  const names = missing.flatMap((key) => {
    const rule = RULE[key as QuantityKey];
    return rule ? t.quantity(key, rule.name) : [];
  });
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t.and} ${names.at(-1)}` : (names[0] ?? t.aFigure);
  return t.missing(list);
}
