// Design A (arithmetic v2, 23 October 2026): one structured-output call. Our
// code gives every number in the user's text a span id (spans.ts); the model
// returns only a program over those ids and a fixed set of named constants,
// with a fixed enumerated set of operations; every value is computed here
// (evaluator.ts); the answer text is rendered only from computed values; and
// a final check confirms that every number in the rendered text is in the
// ledger. Each shown number carries a state. Pure; the network call lives in
// the harness.
//
// Wording note: the states "recomputed and matches" and "not checked by us"
// are placeholders until the owner's report "Reliable arithmetic private AI"
// is in the repository; the bare word "verified" is never used in UI text.
import {
  D,
  type Dec,
  EvaluationError,
  OPERATIONS,
  OPERATION_HELP,
  ROUNDING_MODES,
  type Program,
  type Step,
  evaluateProgram,
} from "./evaluator";
import { formatLocaleNumber, parseLocaleNumber, roundDecimal, type RoundingMode } from "./locale-number";
import { extractMentions, formatClock, type NumberLocale } from "./numbers";
import { daysToIso, type Span } from "./spans";

/** The only operands that need no span: calendar and unit constants. Referenced as "const:<value>". */
export const DESIGN_A_CONSTANTS = ["1", "2", "7", "12", "24", "30", "52", "60", "100", "365", "366", "1000"] as const;
export const constantRef = (value: (typeof DESIGN_A_CONSTANTS)[number]) => `const:${value}`;

export const RESULT_FORMATS = ["money", "number", "percent", "clock", "date", "minutes", "days"] as const;
export type ResultFormat = (typeof RESULT_FORMATS)[number];

export const MAX_STEPS = 24;
export const MAX_RESULTS = 8;

/** All ids a program may reference: spans, constants and the positional step ids s1..sN. */
export function referenceIds(spans: Span[]): string[] {
  return [
    ...spans.map((s) => s.id),
    ...DESIGN_A_CONSTANTS.map(constantRef),
    ...Array.from({ length: MAX_STEPS }, (_, i) => `s${i + 1}`),
  ];
}

/** JSON Schema for the model's reply, with the reference enum fixed per request. */
export function designASchema(spans: Span[]) {
  const refs = referenceIds(spans);
  return {
    type: "object",
    properties: {
      steps: {
        type: "array",
        maxItems: MAX_STEPS,
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: Array.from({ length: MAX_STEPS }, (_, i) => `s${i + 1}`) },
            op: { type: "string", enum: [...OPERATIONS] },
            args: { type: "array", minItems: 1, maxItems: 12, items: { type: "string", enum: refs } },
            decimals: { type: "integer", minimum: 0, maximum: 8 },
            mode: { type: "string", enum: [...ROUNDING_MODES, "none"] },
          },
          required: ["id", "op", "args", "decimals", "mode"],
          additionalProperties: false,
        },
      },
      results: {
        type: "array",
        maxItems: MAX_RESULTS,
        items: {
          type: "object",
          properties: {
            ref: { type: "string", enum: refs },
            label: { type: "string", maxLength: 60 },
            format: { type: "string", enum: [...RESULT_FORMATS] },
            unit: { type: "string", maxLength: 12 },
            decimals: { type: "integer", minimum: 0, maximum: 8 },
            claimed: { type: "string", minLength: 1, maxLength: 24 },
          },
          required: ["ref", "label", "format", "unit", "decimals", "claimed"],
          additionalProperties: false,
        },
      },
      note: { type: "string", maxLength: 300 },
      limitation: { type: "string", enum: ["none", "cannot_answer"] },
    },
    required: ["steps", "results", "note", "limitation"],
    additionalProperties: false,
  } as const;
}

export function designAInstruction(): string {
  const ops = OPERATIONS.map((op) => `${op}: ${OPERATION_HELP[op]}`).join("\n");
  return [
    "You turn a calculation question into a small program. You never compute a number yourself and never write a number as text: every operand is a span id from the user's text (such as t1n3) or one of the constants const:1, const:2, const:7, const:12, const:24, const:30, const:52, const:60, const:100, const:365, const:366, const:1000. Give every step an id: s1 for the first step, s2 for the second, and so on; a step may use the ids of steps written before it as args, never its own id or a later one. A result ref must be the id of a step you wrote (or a span id). Our software evaluates the program with exact decimal arithmetic and shows the user only the results you list.",
    "Operations (args in order):\n" + ops,
    "Rules: percentages are spans as written (19 for \"19 %\"), so use percent_of, add_percent or subtract_percent with the percentage span; a growth factor such as 1.03 or 1.002 is add_percent(const:1, p) where p is the percentage (divide p first for a monthly rate). Clock times and durations are minutes; a date is a day count; add or subtract days or minutes directly. A result that is a date must have format date; a clock time must have format clock; a span of days or minutes has format days or minutes; dates and clock times are never multiplied or divided. Round only where the question asks for it: round has one arg (the value); the places go in decimals and the mode in mode; half-up is commercial rounding and is also rounding to the cent, Rappen or centime (decimals 2); rounding to the nearest 5 centimes (Fünfrappenrundung) is mode swiss-0.05 with decimals 2, never a multiply-round-divide chain. List every figure the question asks for as its own result. When a quantity is stated in the latest user message and contradicts an earlier one, use the latest. When the question needs a number that is not in the text and not a constant, set limitation to cannot_answer and return no results.",
    "results: one entry per figure the user asked for: ref is the step (or span) to show, label a short name in the user's language, format one of money, number, percent, clock, date, minutes, days, unit the currency code or unit word (empty when the format implies it), decimals the places to show, claimed your own independent estimate of that figure for the CURRENT question as a plain decimal (dot decimal mark, no grouping; minutes for clock and minutes formats, the day number for date). claimed is required: work it out yourself; never copy a figure from an earlier answer. Our software compares it with the exact result and warns the user when they differ. Set mode to none and decimals to 0 on every step that is not a round step. note: at most 300 characters on the method in plain words, no numbers, no program listing. Reply with JSON only.",
  ].join("\n\n");
}

function spanLine(span: Span): string {
  const what =
    span.kind === "time"
      ? `clock time, ${span.value} minutes since midnight`
      : span.kind === "duration"
        ? `duration, ${span.value} minutes`
        : span.kind === "date"
          ? `date ${daysToIso(Number(span.value))}, day number ${span.value}`
          : `${span.value}${span.unit ? ` ${span.unit}` : ""}`;
  return `- ${span.id} = ${what} (written "${span.text}")${span.ambiguous ? " [ambiguous reading]" : ""}`;
}

/** The user message for one turn: the annotated text plus the span table of every turn so far. */
export function designAUserMessage(annotatedText: string, turn: number, spans: Span[]): string {
  return [
    `User message ${turn} (span ids in brackets):\n${annotatedText}`,
    `Spans available (all user messages so far):\n${spans.map(spanLine).join("\n") || "- none"}`,
    turn > 1
      ? "This is a follow-up: answer it from the spans above alone (earlier messages' spans stay available; a corrected figure replaces the earlier one). Recompute every figure asked for; never refer to an earlier answer. Return the JSON program for the latest question."
      : "Return the JSON program for the latest question.",
  ].join("\n\n");
}

export type DesignAFailure =
  | "INVALID_JSON"
  | "INVALID_SCHEMA"
  | "UNKNOWN_REFERENCE"
  | "FORWARD_REFERENCE"
  | "EVALUATION"
  | "RESULT_FORMAT"
  | "CANNOT_ANSWER"
  | "EMPTY";

export class DesignAError extends Error {
  constructor(
    readonly code: DesignAFailure,
    readonly detail: string,
  ) {
    super(`${code}: ${detail}`);
  }
}

export type NumberState = "calculated" | "recomputed and matches" | "not checked by us";

export type RenderedResult = {
  label: string;
  /** Canonical decimal of the value shown (minutes or day number for clock and date). */
  value: string;
  shown: string;
  format: ResultFormat;
  state: NumberState;
  /** How the model's own estimate compared: matches, close (within tolerance), differs, unusable (not a number) or none. */
  claim: "matches" | "close" | "differs" | "unusable" | "none";
  /** Set when the model's own estimate differed from the computed value. */
  claimDiffered?: boolean;
};

export type DesignAOutcome = {
  answer: string;
  results: RenderedResult[];
  /** Everything a number in the answer may equal: span values, constants, computed values. */
  ledger: string[];
  /** Reasons the answer is shown with a warning; empty means nothing to flag. */
  flags: string[];
  program: Program;
  note: string;
};

type ParsedStep = { id: string; op: Step["op"]; args: string[]; decimals: number; mode: RoundingMode | "none" };
type ParsedResult = { ref: string; label: string; format: ResultFormat; unit: string; decimals: number; claimed: string };
type Parsed = { steps: ParsedStep[]; results: ParsedResult[]; note: string; limitation: "none" | "cannot_answer" };

function parseReply(raw: string): Parsed {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new DesignAError("INVALID_JSON", "the reply is not valid JSON");
  }
  const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isObject(json)) throw new DesignAError("INVALID_SCHEMA", "the reply must be a JSON object");
  const { steps, results, note, limitation } = json;
  if (!Array.isArray(steps) || steps.length > MAX_STEPS) throw new DesignAError("INVALID_SCHEMA", `steps must be an array of at most ${MAX_STEPS}`);
  if (!Array.isArray(results) || results.length > MAX_RESULTS) throw new DesignAError("INVALID_SCHEMA", `results must be an array of at most ${MAX_RESULTS}`);
  if (limitation !== "none" && limitation !== "cannot_answer") throw new DesignAError("INVALID_SCHEMA", "limitation must be none or cannot_answer");
  const ID = /^(?:t\d{1,3}n\d{1,3}|const:\d+|s\d{1,2})$/;
  // Shape rules observed in the dev batches of 23 October (each a general class,
  // no value is invented): a step id written twice is a chain (the later step
  // redefines it and later references mean the latest definition), and extra
  // constant args on a round step are redundant with its decimals field.
  const stepIds = new Set<string>();
  const latest = new Map<string, string>();
  const chained = (ref: string) => latest.get(ref) ?? ref;
  const parsedSteps = steps.map((s, i): ParsedStep => {
    if (!isObject(s)) throw new DesignAError("INVALID_SCHEMA", `step ${i + 1} must be an object`);
    const { id: rawId, op, args: rawArgs, decimals = 0, mode = "none" } = s;
    if (typeof rawId !== "string" || !/^s\d{1,2}$/.test(rawId) || Number(rawId.slice(1)) < 1 || Number(rawId.slice(1)) > MAX_STEPS)
      throw new DesignAError("INVALID_SCHEMA", `step ${i + 1}: id must be s1..s${MAX_STEPS}`);
    let id: string = rawId;
    if (typeof op !== "string" || !(OPERATIONS as readonly string[]).includes(op))
      throw new DesignAError("INVALID_SCHEMA", `step ${i + 1}: op must be one of ${OPERATIONS.join(", ")}`);
    if (!Array.isArray(rawArgs) || !rawArgs.length || rawArgs.length > 12 || rawArgs.some((a) => typeof a !== "string" || !ID.test(a)))
      throw new DesignAError("INVALID_SCHEMA", `step ${i + 1}: args must be 1 to 12 span ids, const:<value> or earlier step ids`);
    let args = (rawArgs as string[]).map(chained);
    if (op === "round" && args.length > 1 && args.slice(1).every((a) => a.startsWith("const:"))) args = [args[0]];
    if (stepIds.has(id)) {
      let n = 2;
      while (stepIds.has(`${id}_${n}`)) n++;
      latest.set(id, `${id}_${n}`);
      id = `${id}_${n}`;
    }
    stepIds.add(id);
    if (!Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 8)
      throw new DesignAError("INVALID_SCHEMA", `step ${i + 1}: decimals must be an integer 0..8`);
    if (typeof mode !== "string" || !([...ROUNDING_MODES, "none"] as string[]).includes(mode))
      throw new DesignAError("INVALID_SCHEMA", `step ${i + 1}: mode must be one of ${[...ROUNDING_MODES, "none"].join(", ")}`);
    return { id, op: op as Step["op"], args: args as string[], decimals: decimals as number, mode: mode as RoundingMode | "none" };
  });
  const parsedResults = results.map((r, i): ParsedResult => {
    if (!isObject(r)) throw new DesignAError("INVALID_SCHEMA", `result ${i + 1} must be an object`);
    const { ref, label, format, unit = "", decimals = 2, claimed = "" } = r;
    if (typeof ref !== "string" || !ID.test(ref)) throw new DesignAError("INVALID_SCHEMA", `result ${i + 1}: ref must be a step or span id`);
    if (typeof label !== "string" || !label.trim() || label.length > 60) throw new DesignAError("INVALID_SCHEMA", `result ${i + 1}: label must be 1 to 60 characters`);
    if (typeof format !== "string" || !(RESULT_FORMATS as readonly string[]).includes(format))
      throw new DesignAError("INVALID_SCHEMA", `result ${i + 1}: format must be one of ${RESULT_FORMATS.join(", ")}`);
    if (typeof unit !== "string" || unit.length > 12 || /\d/.test(unit)) throw new DesignAError("INVALID_SCHEMA", `result ${i + 1}: unit must be a short word without digits`);
    if (format !== "money" && format !== "number" && /^(?:EUR|USD|GBP|CHF|€|\$|£)$/i.test(unit.trim()))
      throw new DesignAError("RESULT_FORMAT", `result ${i + 1}: a ${format} result cannot carry the currency unit ${unit.trim()}`);
    if (!Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 8)
      throw new DesignAError("INVALID_SCHEMA", `result ${i + 1}: decimals must be an integer 0..8`);
    if (typeof claimed !== "string" || claimed.length > 24) throw new DesignAError("INVALID_SCHEMA", `result ${i + 1}: claimed must be a short string`);
    return { ref: chained(ref), label: label.trim(), format: format as ResultFormat, unit: unit.trim(), decimals: decimals as number, claimed: claimed.trim() };
  });
  if (note !== undefined && (typeof note !== "string" || note.length > 300)) throw new DesignAError("INVALID_SCHEMA", "note must be at most 300 characters");
  return { steps: parsedSteps, results: parsedResults, note: typeof note === "string" ? note.trim() : "", limitation };
}

const monthsDe = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function showValue(value: Dec, result: ParsedResult, locale: NumberLocale): string {
  const units = result.unit ? ` ${result.unit}` : "";
  switch (result.format) {
    case "money":
      return `${formatLocaleNumber(value, result.decimals || 2, locale)}${units}`;
    case "percent":
      return `${formatLocaleNumber(value, result.decimals, locale)}${locale === "de" ? " %" : "%"}`;
    case "number":
      return `${formatLocaleNumber(value, result.decimals, locale)}${units}`;
    case "days": {
      const word = result.unit || (locale === "de" ? "Tage" : "days");
      return `${formatLocaleNumber(value, result.decimals, locale)} ${word}`;
    }
    case "minutes": {
      if (!value.isInteger() || value.isNegative()) throw new DesignAError("RESULT_FORMAT", `${result.label}: minutes must be a whole, non-negative number`);
      const total = value.toNumber();
      const h = Math.floor(total / 60);
      const m = total % 60;
      return h ? `${h} h ${m} min (${total} min)` : `${m} min`;
    }
    case "clock": {
      if (!value.isInteger()) throw new DesignAError("RESULT_FORMAT", `${result.label}: a clock time must be a whole number of minutes`);
      return formatClock(value.toNumber());
    }
    case "date": {
      if (!value.isInteger() || value.abs().gt(100000)) throw new DesignAError("RESULT_FORMAT", `${result.label}: a date must be a whole day number`);
      const iso = daysToIso(value.toNumber());
      const [y, mo, d] = iso.split("-").map(Number);
      return locale === "de" ? `${d}. ${monthsDe[mo - 1]} ${y} (${iso})` : `${d} ${monthsEn[mo - 1]} ${y} (${iso})`;
    }
  }
}

/** How far a model estimate may sit from the exact value and still count as consistent (method cross-check, not a precision check). */
export const CLAIM_TOLERANCE = 0.01;

/**
 * Compares the model's own estimate with the computed value. An exact match at
 * the shown precision gives "recomputed and matches"; a figure within
 * CLAIM_TOLERANCE is consistent (state "calculated", nothing flagged); a figure
 * further away is flagged. An estimate that is not a number ("ref", "20679 +
 * 30") is unusable: the figure is simply not cross-checked, nothing is flagged.
 * Clock claims may be written HH:MM and date claims as YYYY-MM-DD.
 */
function claimState(value: Dec, result: ParsedResult): { state: NumberState; claim: "matches" | "close" | "differs" | "unusable" | "none" } {
  if (!result.claimed) return { state: "calculated", claim: "none" };
  let claimed: string | undefined;
  const clock = /^(\d{1,2}):(\d{2})$/.exec(result.claimed);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(result.claimed);
  if (result.format === "clock" && clock) claimed = String(+clock[1] * 60 + +clock[2]);
  else if (result.format === "date" && iso) claimed = String(Math.round(Date.parse(`${result.claimed}T00:00:00Z`) / 86400000));
  else {
    const parsed = parseLocaleNumber(result.claimed);
    if (parsed.kind === "value") claimed = parsed.value;
    else if (parsed.kind === "ambiguous") return { state: "calculated", claim: "none" };
  }
  if (claimed === undefined || !/^-?\d+(?:\.\d+)?$/.test(claimed)) return { state: "calculated", claim: "unusable" };
  const places = result.format === "clock" || result.format === "date" || result.format === "minutes" ? 0 : result.decimals;
  if (new D(roundDecimal(value, places)).eq(roundDecimal(claimed, places))) return { state: "recomputed and matches", claim: "matches" };
  const gap = new D(claimed).minus(value).abs();
  const allowed = value.abs().times(CLAIM_TOLERANCE);
  return gap.lte(allowed) ? { state: "calculated", claim: "close" } : { state: "calculated", claim: "differs" };
}

type ValueType = "plain" | "date" | "clock";
/**
 * Types every value: a span's kind, then per step. Dates and clock times may be
 * shifted by plain amounts or subtracted from each other; nothing else.
 */
function typeProgram(steps: Step[], spanById: Map<string, Span>): Map<string, ValueType> {
  const types = new Map<string, ValueType>();
  const typeOf = (ref: string): ValueType => {
    const known = types.get(ref);
    if (known) return known;
    const span = spanById.get(ref);
    return span?.kind === "date" ? "date" : span?.kind === "time" ? "clock" : "plain";
  };
  for (const step of steps) {
    const t = step.args.map(typeOf);
    const plainOnly = t.every((x) => x === "plain");
    let out: ValueType = "plain";
    if (step.op === "add" || step.op === "subtract") {
      const [a, b] = t;
      if (a === "plain" && b === "plain") out = "plain";
      else if (a !== "plain" && b === "plain") out = a;
      else if (step.op === "add" && a === "plain" && b !== "plain") out = b;
      else if (step.op === "subtract" && a === b) out = "plain";
      else throw new DesignAError("EVALUATION", `step ${step.id}: cannot ${step.op} a ${a === "plain" ? b : a} and a ${b === "plain" || a === b ? a : b} this way`);
    } else if (step.op === "round" || step.op === "min" || step.op === "max") {
      if (new Set(t).size > 1) throw new DesignAError("EVALUATION", `step ${step.id}: mixed dates, clock times and plain numbers`);
      out = t[0];
    } else if (!plainOnly) throw new DesignAError("EVALUATION", `step ${step.id}: a date or clock time cannot be used in ${step.op}`);
    types.set(step.id, out);
  }
  return types;
}

const typeOfFormat: Record<ResultFormat, ValueType> = { money: "plain", number: "plain", percent: "plain", minutes: "plain", days: "plain", clock: "clock", date: "date" };

/** Every number, time, duration or date in `text` that equals no ledger value. */
export function ledgerCheck(text: string, ledger: string[], locale: NumberLocale): string[] {
  const values = ledger.map((v) => new D(v));
  const inLedger = (x: Dec) => values.some((v) => v.eq(x));
  const unchecked: string[] = [];
  for (const m of extractMentions(text, locale).mentions) {
    const ok =
      m.kind === "number"
        ? inLedger(m.value) || (m.alt !== undefined && inLedger(m.alt))
        : m.kind === "time"
          ? inLedger(new D(m.minutes))
          : m.kind === "duration"
            ? inLedger(m.minutes) || inLedger(m.amount)
            : m.candidates.some((c) => inLedger(new D(String(Math.round(Date.parse(`${c}T00:00:00Z`) / 86400000)))));
    if (!ok) unchecked.push(m.text);
  }
  return unchecked;
}

export const STATE_SUFFIX: Record<NumberState, string> = {
  calculated: "calculated",
  "recomputed and matches": "recomputed and matches",
  "not checked by us": "not checked by us",
};

/**
 * Validates the model's JSON against the spans, evaluates the program and
 * renders the answer. Throws DesignAError when no answer can be shown.
 */
export function renderDesignA(raw: string, spans: Span[], locale: NumberLocale): DesignAOutcome {
  const parsed = parseReply(raw);
  if (parsed.limitation === "cannot_answer") throw new DesignAError("CANNOT_ANSWER", "the model reported that the question cannot be answered from the numbers in the text");
  if (!parsed.results.length) throw new DesignAError("EMPTY", "no results listed");
  const spanById = new Map(spans.map((s) => [s.id, s]));
  const operands: Program["operands"] = {};
  const usedSpans = new Set<string>();
  const resolve = (ref: string, stepIndex: number, where: string) => {
    if (ref.startsWith("const:")) {
      const value = ref.slice(6);
      if (!(DESIGN_A_CONSTANTS as readonly string[]).includes(value)) throw new DesignAError("UNKNOWN_REFERENCE", `${where}: ${ref} is not an allowed constant`);
      operands[ref] = value;
      return;
    }
    if (ref.startsWith("s")) {
      const at = parsed.steps.findIndex((s) => s.id === ref);
      if (at < 0) throw new DesignAError("UNKNOWN_REFERENCE", `${where}: ${ref} is not a step of this program`);
      if (at >= stepIndex) throw new DesignAError("FORWARD_REFERENCE", `${where}: ${ref} is not a step written before it`);
      return;
    }
    const span = spanById.get(ref);
    if (!span) throw new DesignAError("UNKNOWN_REFERENCE", `${where}: ${ref} is not a span of the user's text`);
    operands[ref] = span.value;
    usedSpans.add(ref);
  };
  const steps: Step[] = parsed.steps.map((s, i) => {
    s.args.forEach((a) => resolve(a, i, `step ${s.id}`));
    return {
      id: s.id,
      op: s.op,
      args: s.args,
      ...(s.op === "round" ? { decimals: s.decimals, mode: s.mode === "none" ? "half-up" : s.mode } : {}),
    };
  });
  parsed.results.forEach((r, i) => resolve(r.ref, parsed.steps.length, `result ${i + 1}`));
  const program: Program = { operands, steps };
  let values: Map<string, Dec>;
  try {
    values = evaluateProgram(program);
  } catch (error) {
    if (error instanceof EvaluationError) throw new DesignAError("EVALUATION", error.message);
    throw error;
  }
  const types = typeProgram(steps, spanById);
  const flags: string[] = [];
  const results: RenderedResult[] = parsed.results.map((r) => {
    const value = values.get(r.ref)!;
    const type = types.get(r.ref) ?? (spanById.get(r.ref)?.kind === "date" ? "date" : spanById.get(r.ref)?.kind === "time" ? "clock" : "plain");
    if (type !== typeOfFormat[r.format])
      throw new DesignAError("RESULT_FORMAT", `${r.label}: the value is a ${type === "plain" ? "plain number" : type} but the format is ${r.format}`);
    const shown = showValue(value, r, locale);
    const { state, claim } = claimState(value, r);
    if (claim === "differs") flags.push(`${r.label}: the model's own figure differed from the calculated value; the calculated value is shown`);
    // Dev batches of 23 October: figures whose estimate was junk were wrong 2 times in 8; the user is told that no cross-check happened.
    if (claim === "unusable") flags.push(`${r.label}: the model gave no usable estimate of its own, so this figure was not cross-checked`);
    return { label: r.label, value: value.toString(), shown, format: r.format, state, claim, ...(claim === "differs" ? { claimDiffered: true } : {}) };
  });
  for (const id of usedSpans) {
    const span = spanById.get(id)!;
    if (span.ambiguous && span.ambiguity) flags.push(span.ambiguity);
  }
  // The ledger: every operand and every computed value, plus each shown value at its rounding.
  const ledger = [
    ...new Set([
      ...[...values.values()].map((v) => v.toString()),
      ...spans.map((s) => s.value),
      ...spans.flatMap((s) => (s.alt ? [s.alt] : [])),
      ...DESIGN_A_CONSTANTS,
      ...results.flatMap((r) => {
        const parsedResult = parsed.results[results.indexOf(r)];
        const value = new D(r.value);
        const places = r.format === "money" ? parsedResult.decimals || 2 : parsedResult.decimals;
        const extra = [roundDecimal(value, places)];
        if (r.format === "minutes" && value.isInteger()) extra.push(String(Math.floor(value.toNumber() / 60)), String(value.toNumber() % 60));
        if (r.format === "date") extra.push(...daysToIso(value.toNumber()).split("-").map((p) => String(Number(p))));
        return extra;
      }),
    ]),
  ];
  const lines = results.map((r) => `**${r.label}: ${r.shown}** (${STATE_SUFFIX[r.state]})`);
  let note = parsed.note;
  if (note) {
    const unchecked = ledgerCheck(note, ledger, locale);
    if (unchecked.length) {
      flags.push(`the explanation contains figures we did not calculate: ${unchecked.join(", ")}`);
      for (const token of unchecked) note = note.split(token).join(`${token} [${STATE_SUFFIX["not checked by us"]}]`);
    }
  }
  const answer = [
    lines.join("\n\n"),
    note ? `Method (from the model): ${note}` : "",
    flags.length ? `**Please check:** ${flags.join(" ")}` : "",
    "Figures marked \"calculated\" or \"recomputed and matches\" were computed by this software from the numbers in your message; the choice of numbers and method is the model's and is not independently checked.",
  ]
    .filter(Boolean)
    .join("\n\n");
  // Final check: every number in the rendered text is in the ledger (by construction, but verified).
  const unchecked = ledgerCheck(answer.replace(/\*\*Please check:\*\*[^\n]*/g, ""), ledger, locale);
  if (unchecked.length) flags.push(`figures outside the ledger: ${unchecked.join(", ")}`);
  return { answer, results, ledger, flags, program, note };
}
