// Deterministic method checks (Design B, owner decision after gate v2).
// They read the user's text and the validated program, never a model. Each
// rule names a general phrase class, the operation that class expects on the
// percentage it names, and the uses that contradict it. A phrase the rules
// cannot classify, or one that matches two classes, does nothing. Every rule
// has unit tests with negative cases in tests/arithmetic-method-checks.test.ts.
import type { Program, Step } from "./evaluator";
import type { Span } from "./spans";
import { D } from "./evaluator";

export type PhraseClass = "rate-multiplier" | "surcharge" | "discount" | "included-tax";

export type PhraseRule = {
  class: PhraseClass;
  language: "de" | "en";
  /** Matches the phrase; group 1 is the percentage as written. */
  cue: RegExp;
  example: string;
};

/**
 * The rule table. General classes, not case rules: each cue describes how a
 * percentage relates to its base in ordinary invoice, pay and shop language.
 *
 * | class            | phrase (de / en)                                                          | expected use of X          | flagged use                                   |
 * | rate-multiplier  | "X % des (normalen) Satzes", "bezahlt mit X %" / "X % of the (normal) rate", "paid at X %" | percent_of(base, X), or multiply by X/100 | add_percent(., X), subtract_percent(., X) |
 * | surcharge        | "Zuschlag/Aufschlag von X %", "X % Zuschlag", "zzgl. X %" / "plus X %", "X % extra/surcharge/markup" | add_percent(base, X), or add(base, percent_of(base, X)) | subtract_percent(., X) |
 * | discount         | "X % Rabatt/Skonto/Nachlass", "abzüglich X %" / "X % off/discount", "less X %" | subtract_percent(base, X), or subtract(base, percent_of(base, X)) | add_percent(., X) |
 * | included-tax     | "inkl./inklusive/enthält X %", "darin X % enthalten" / "including/includes X %", "inclusive of X %" | divide(gross, add_percent(const:1, X)) or percent_of(net, X) | add_percent(amount, X) with an amount span as base |
 */
export const PHRASE_RULES: PhraseRule[] = [
  { class: "rate-multiplier", language: "en", cue: /(\d[\d.,]*)\s?%\s+of\s+(?:the\s+|their\s+|my\s+|his\s+|her\s+)?(?:normal|regular|standard|usual|base|basic|hourly|ordinary)?\s*(?:rate|pay|wage|wages|salary|hourly rate)\b/i, example: "paid at 150% of the normal rate" },
  { class: "rate-multiplier", language: "en", cue: /\bpaid\s+at\s+(\d[\d.,]*)\s?%(?!\s+(?:extra|surcharge|markup|more|on top))/i, example: "overtime is paid at 150%" },
  { class: "rate-multiplier", language: "de", cue: /(\d[\d.,]*)\s?%\s+(?:des|vom|der)\s+(?:normalen|regulären|üblichen|gewöhnlichen)?\s*(?:satzes|stundensatzes|stundenlohns|lohns|gehalts|tarifs)\b/i, example: "150 % des normalen Stundensatzes" },
  { class: "rate-multiplier", language: "de", cue: /\b(?:bezahlt|vergütet|abgerechnet|entlohnt)\s+mit\s+(\d[\d.,]*)\s?%(?!\s+(?:zuschlag|aufschlag|extra))|\bmit\s+(\d[\d.,]*)\s?%\s+(?:bezahlt|vergütet|abgerechnet|entlohnt)\b/i, example: "Überstunden werden mit 150 % vergütet" },
  { class: "surcharge", language: "en", cue: /\bplus\s+(?:a\s+)?(\d[\d.,]*)\s?%(?!\s+(?:of|vat|tax|sales|umsatzsteuer|ust|mwst|mehrwertsteuer|steuer))/i, example: "plus 25%" },
  { class: "surcharge", language: "en", cue: /(\d[\d.,]*)\s?%\s+(?:extra|surcharge|markup|premium|on top|more)\b/i, example: "25% extra" },
  { class: "surcharge", language: "en", cue: /\b(?:surcharge|markup|premium|supplement)\s+of\s+(\d[\d.,]*)\s?%/i, example: "a surcharge of 25%" },
  { class: "surcharge", language: "de", cue: /\b(?:zuschlag|aufschlag|zuschlags|aufschlags)\s+von\s+(\d[\d.,]*)\s?%/i, example: "Zuschlag von 25 %" },
  { class: "surcharge", language: "de", cue: /(\d[\d.,]*)\s?%\s+(?:zuschlag|aufschlag|extra|obendrauf|mehr)\b/i, example: "25 % Zuschlag" },
  { class: "surcharge", language: "de", cue: /\b(?:plus|zuzüglich|zzgl\.?)\s+(\d[\d.,]*)\s?%(?!\s+(?:umsatzsteuer|ust|mwst|mehrwertsteuer|steuer|vat|tax|sales|of))/i, example: "zzgl. 25 %" },
  { class: "discount", language: "en", cue: /(\d[\d.,]*)\s?%\s+(?:off|discount|reduction|rebate|early-payment discount)\b/i, example: "30% off" },
  { class: "discount", language: "en", cue: /\b(?:discount|reduction|rebate)\s+of\s+(\d[\d.,]*)\s?%/i, example: "a discount of 30%" },
  { class: "discount", language: "en", cue: /\b(?:less|minus)\s+(\d[\d.,]*)\s?%/i, example: "less 3%" },
  { class: "discount", language: "de", cue: /(\d[\d.,]*)\s?%\s+(?:rabatt|skonto|nachlass|preisnachlass|abzug|ermäßigung)\b/i, example: "3 % Skonto" },
  { class: "discount", language: "de", cue: /\b(?:rabatt|skonto|nachlass|preisnachlass|ermäßigung)\s+von\s+(\d[\d.,]*)\s?%/i, example: "Rabatt von 10 %" },
  { class: "discount", language: "de", cue: /\b(?:abzüglich|abzgl\.?|minus|weniger)\s+(\d[\d.,]*)\s?%/i, example: "abzüglich 2 %" },
  { class: "included-tax", language: "en", cue: /\b(?:including|includes|included|inclusive of|incl\.?)\s+(?:the\s+)?(\d[\d.,]*)\s?%/i, example: "including 19% VAT" },
  { class: "included-tax", language: "en", cue: /(\d[\d.,]*)\s?%\s+(?:vat|tax|sales tax)\s+(?:included|inclusive)\b/i, example: "20% VAT included" },
  { class: "included-tax", language: "de", cue: /\b(?:inkl\.?|inklusive|einschließlich|enthält|enthalten sind|darin sind|darin)\s+(\d[\d.,]*)\s?%/i, example: "inkl. 19 % MwSt" },
  { class: "included-tax", language: "de", cue: /(\d[\d.,]*)\s?%\s+(?:umsatzsteuer|ust|mwst|mehrwertsteuer|steuer)\s+(?:enthalten|inklusive|inkl\.?)\b/i, example: "19 % Umsatzsteuer enthalten" },
];

/** Percentage-change cues: the percent result must be (new - old) / old x 100. */
export const PERCENT_CHANGE_CUES: RegExp[] = [
  /um wie viel prozent\b.*\b(?:gestiegen|steigt|erhöht|gesunken|sinkt|fällt|gefallen|verändert|zugenommen|abgenommen|teurer|billiger|höher|niedriger)/i,
  /\b(?:prozentuale[rns]?|prozentualer|prozentuale)\s+(?:anstieg|steigerung|erhöhung|veränderung|änderung|rückgang|senkung|abnahme|zunahme)\b/i,
  /\b(?:anstieg|steigerung|erhöhung|veränderung|änderung|rückgang|senkung)\s+in\s+prozent\b/i,
  /\bby what percent(?:age)?\b/i,
  /\bpercent(?:age)?\s+(?:increase|decrease|change|rise|fall|drop|growth|reduction)\b/i,
  /\bwhat percent(?:age)?\s+(?:increase|decrease|change|rise|fall|drop|more|less|higher|lower)\b/i,
  /\b(?:increase|decrease|change|rise|fall|drop|growth)\s+(?:in|as a)\s+percent(?:age)?\b/i,
];
/** A share question is not a change question; both cues present means the text cannot be classified. */
export const SHARE_CUES: RegExp[] = [
  /\b(?:anteil|wie viel prozent (?:davon|des|der|aller))\b/i,
  /\b(?:share|proportion|what percentage of|what percent of|percentage of the|percent of the|percentage (?:passed|failed|answered|voted))\b/i,
];

export type MethodFlag = { rule: string; text: string };

function stepsUsing(program: Program, ref: string): Step[] {
  return program.steps.filter((s) => s.args.includes(ref));
}
/** Every step the value of `ref` depends on, including itself when it is a step. */
function closure(program: Program, ref: string): Step[] {
  const byId = new Map(program.steps.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const out: Step[] = [];
  const walk = (id: string) => {
    const step = byId.get(id);
    if (!step || seen.has(id)) return;
    seen.add(id);
    out.push(step);
    step.args.forEach(walk);
  };
  walk(ref);
  return out;
}

/** Spans of a turn whose written percentage equals the cue's number. */
function percentSpans(spans: Span[], turn: number, written: string): Span[] {
  const value = new D(written.replace(/\.(?=\d{3}(?!\d))/g, "").replace(",", "."));
  return spans.filter((s) => s.turn === turn && s.unit === "%" && new D(s.value).eq(value));
}

/**
 * Phrase-class checks on one validated program. `turns` are the user's
 * messages so far; `spans` their spans; `program` the call-1 program.
 */
export function phraseChecks(turns: string[], spans: Span[], program: Program): MethodFlag[] {
  const flags: MethodFlag[] = [];
  // Class per span id; a span claimed by two classes is unclassifiable.
  const classes = new Map<string, Set<PhraseClass>>();
  turns.forEach((text, i) => {
    for (const rule of PHRASE_RULES)
      for (const m of text.matchAll(new RegExp(rule.cue.source, rule.cue.flags.includes("g") ? rule.cue.flags : rule.cue.flags + "g")))
        for (const span of percentSpans(spans, i + 1, m.slice(1).find(Boolean) ?? "")) {
          if (!classes.has(span.id)) classes.set(span.id, new Set());
          classes.get(span.id)!.add(rule.class);
        }
  });
  for (const [id, set] of classes) {
    if (set.size !== 1) continue;
    const cls = [...set][0];
    const uses = stepsUsing(program, id);
    if (!uses.length) continue;
    const span = spans.find((s) => s.id === id)!;
    const x = `${span.text} %`.replace(/\s%\s%$/, " %");
    const ops = uses.map((s) => s.op);
    if (cls === "rate-multiplier" && (ops.includes("add_percent") || ops.includes("subtract_percent")))
      flags.push({ rule: "rate-multiplier", text: `method mismatch: "${x} of the rate" means the rate multiplied by ${x} (percent_of); this program adds or deducts ${x} instead (rule: rate multiplier)` });
    if (cls === "surcharge" && ops.includes("subtract_percent"))
      flags.push({ rule: "surcharge", text: `method mismatch: a surcharge of ${x} is added to the base (add_percent); this program deducts it (rule: surcharge)` });
    if (cls === "discount" && ops.includes("add_percent"))
      flags.push({ rule: "discount", text: `method mismatch: a discount of ${x} is deducted from the base (subtract_percent); this program adds it (rule: discount)` });
    if (cls === "included-tax")
      for (const step of uses)
        if (step.op === "add_percent" && step.args[0] !== "const:1" && spans.some((s) => s.id === step.args[0] && s.kind === "number" && s.unit !== "%"))
          flags.push({ rule: "included-tax", text: `method mismatch: an amount that includes ${x} tax is divided by (1 + ${x}); this program adds ${x} to the amount instead (rule: included tax)` });
  }
  return flags;
}

/**
 * Percentage-change check: when the text asks for a change in percent and not
 * for a share, every percent result must subtract before it divides.
 */
export function percentChangeCheck(turns: string[], program: Program, results: { ref: string; label: string; format: string }[]): MethodFlag[] {
  const text = turns.join("\n");
  if (!PERCENT_CHANGE_CUES.some((c) => c.test(text))) return [];
  if (SHARE_CUES.some((c) => c.test(text))) return [];
  const flags: MethodFlag[] = [];
  for (const r of results) {
    if (r.format !== "percent") continue;
    const deps = closure(program, r.ref);
    if (!deps.length) continue;
    const divides = deps.some((s) => s.op === "ratio_percent" || s.op === "divide");
    const subtracts = deps.some((s) => s.op === "subtract");
    if (divides && !subtracts)
      flags.push({ rule: "percent-change", text: `method mismatch for "${r.label}": a percentage change is (new - old) / old x 100; this program divides without subtracting (rule: percent change)` });
  }
  return flags;
}

export function methodChecks(turns: string[], spans: Span[], program: Program, results: { ref: string; label: string; format: string }[]): MethodFlag[] {
  return [...phraseChecks(turns, spans, program), ...percentChangeCheck(turns, program, results)];
}
