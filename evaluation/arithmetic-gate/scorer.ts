// Deterministic scoring of replies against the frozen arithmetic gate
// (evaluation/arithmetic-gate/cases.json) and the threshold arithmetic of
// evaluation/arithmetic-gate/THRESHOLD.md. Mechanical evidence only: a pass
// means every required value is present and no known-wrong value is present;
// it does not grade explanations, which stay with human review.
import {
  D,
  type Currency,
  type Dec,
  type Mention,
  type NumberLocale,
  extractMentions,
  parseClock,
} from "./numbers";

export type ExpectedKind = "money" | "percent" | "number" | "time" | "date" | "duration";
export type ExpectedItem = {
  label: string;
  kind: ExpectedKind;
  /** money/percent/number: decimal string; time: HH:MM; date: YYYY-MM-DD; duration: minutes. */
  value: string;
  currency?: Currency;
  unit?: "days" | "months";
  /** Present only when the case text states the rounding. */
  rounding?: { decimals: number };
  /** Independent derivation, re-evaluated by tests/arithmetic-gate-cases.test.ts. */
  derivation: string;
};
export type ForbiddenItem = Omit<ExpectedItem, "derivation" | "rounding"> & {
  reason: string;
};
export type GateCase = {
  id: string;
  family: "arithmetic";
  category: string;
  locale: NumberLocale;
  critical: boolean;
  secondTurn: "correction" | "follow-up";
  synthetic: true;
  query: string;
  turns: [string, string];
  expected: [ExpectedItem[], ExpectedItem[]];
  forbidden: [ForbiddenItem[], ForbiddenItem[]];
  mandatoryFacts: [string, string];
  forbiddenConclusions: string[];
  sources: [];
  humanScores: null;
};

const unitWords: Record<NonNullable<ExpectedItem["unit"]>, RegExp> = {
  days: /^(day|days|tag|tage|tagen|tages|kalendertage|kalendertagen)$/,
  months: /^(month|months|monat|monate|monaten|monats)$/,
};

function valueMatches(
  item: Pick<ExpectedItem, "value" | "rounding">,
  candidate: Dec,
): boolean {
  const expected = new D(item.value);
  if (item.rounding)
    return candidate.toDecimalPlaces(item.rounding.decimals, D.ROUND_HALF_UP).eq(expected);
  return candidate.eq(expected);
}

export type ItemMatch = {
  label: string;
  matched: boolean;
  matchedText?: string;
  /** Matched only under the other reading of an ambiguous token such as 1.234 — not a pass. */
  ambiguousOnly?: string;
};

function matchItem(
  item: Pick<ExpectedItem, "label" | "kind" | "value" | "currency" | "unit" | "rounding">,
  mentions: Mention[],
): ItemMatch {
  let ambiguousOnly: string | undefined;
  for (const m of mentions) {
    switch (item.kind) {
      case "time":
        if (m.kind === "time" && m.minutes === parseClock(item.value))
          return { label: item.label, matched: true, matchedText: m.text };
        break;
      case "date":
        if (m.kind === "date" && m.candidates.length === 1 && m.candidates[0] === item.value)
          return { label: item.label, matched: true, matchedText: m.text };
        if (m.kind === "date" && m.candidates.length > 1 && m.candidates.includes(item.value))
          ambiguousOnly ??= m.text;
        break;
      case "duration":
        if (m.kind === "duration" && valueMatches(item, m.minutes))
          return { label: item.label, matched: true, matchedText: m.text };
        break;
      default: {
        if (m.kind !== "number") break;
        if ((item.kind === "percent") !== m.percent) break;
        if (item.kind === "money" && m.currency && item.currency && m.currency !== item.currency)
          break;
        if (item.unit && !(m.unitWord && unitWords[item.unit].test(m.unitWord))) break;
        if (valueMatches(item, m.value))
          return { label: item.label, matched: true, matchedText: m.text };
        if (m.alt && valueMatches(item, m.alt)) ambiguousOnly ??= m.text;
      }
    }
  }
  return { label: item.label, matched: false, ambiguousOnly };
}

export type TurnScore = {
  pass: boolean;
  delivered: boolean;
  locale?: NumberLocale;
  required: ItemMatch[];
  forbiddenHits: { label: string; reason: string; matchedText: string }[];
};

export function scoreTurn(
  reply: string | undefined | null,
  expected: ExpectedItem[],
  forbidden: ForbiddenItem[],
  caseLocale: NumberLocale,
): TurnScore {
  if (!reply || !reply.trim())
    return {
      pass: false,
      delivered: false,
      required: expected.map((e) => ({ label: e.label, matched: false })),
      forbiddenHits: [],
    };
  const { mentions, locale } = extractMentions(reply, caseLocale);
  const required = expected.map((e) => matchItem(e, mentions));
  const forbiddenHits = forbidden.flatMap((f) => {
    const hit = matchItem(f, mentions);
    return hit.matched
      ? [{ label: f.label, reason: f.reason, matchedText: hit.matchedText! }]
      : [];
  });
  return {
    pass: required.every((r) => r.matched) && forbiddenHits.length === 0,
    delivered: true,
    locale,
    required,
    forbiddenHits,
  };
}

export type ConversationScore = { caseId: string; pass: boolean; turns: TurnScore[] };

/** A conversation passes only when both turns pass. A missing turn is a failure. */
export function scoreConversation(
  gateCase: GateCase,
  replies: readonly (string | undefined | null)[],
): ConversationScore {
  const turns = gateCase.turns.map((_, i) =>
    scoreTurn(replies[i], gateCase.expected[i], gateCase.forbidden[i], gateCase.locale),
  );
  return { caseId: gateCase.id, pass: turns.every((t) => t.pass), turns };
}

// ---------------------------------------------------------------------------
// Threshold arithmetic (THRESHOLD.md). Constants mirror the proposal; changing
// either side without the other is a test failure.
export const THRESHOLD = {
  baseRepetitions: 3,
  borderlineRepetitions: 5,
  minExactRate: 0.97,
  minWilsonLower: 0.9,
  z: 1.959963984540054,
  /** Proposed addition: a borderline case failing this many of five runs fails the gate. */
  borderlineFailuresThatFail: 2,
} as const;

/** Wilson score interval for x successes in n trials (two-sided, default 95%). */
export function wilson(x: number, n: number, z: number = THRESHOLD.z) {
  if (!Number.isInteger(x) || !Number.isInteger(n) || x < 0 || n < 0 || x > n)
    throw Error("Invalid binomial counts");
  if (n === 0) return { p: NaN, lower: 0, upper: 1 };
  const p = x / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    p,
    lower: Math.max(0, (centre - margin) / denom),
    upper: Math.min(1, (centre + margin) / denom),
  };
}

export type GateRun = { caseId: string; repetition: number; pass: boolean };
export type ArmVerdict = {
  verdict: "PASS" | "FAIL" | "INCOMPLETE";
  reasons: string[];
  n: number;
  passes: number;
  rate: number;
  wilsonLower: number;
  wilsonUpper: number;
  criticalFailures: string[];
  borderline: {
    caseId: string;
    runs: number;
    passes: number;
    lower: number;
    upper: number;
  }[];
  missing: string[];
};

/**
 * Applies the proposed threshold to one arm of one model. Only repetitions 1–3
 * enter the overall rate (fixed denominator, no selective resampling);
 * repetitions 4–5 exist only for borderline cases and are reported per case.
 */
export function gateVerdict(
  cases: Pick<GateCase, "id" | "critical">[],
  runs: GateRun[],
): ArmVerdict {
  const reasons: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const r of runs) {
    const key = `${r.caseId}#${r.repetition}`;
    if (seen.has(key)) throw Error(`Duplicate run ${key}`);
    if (!cases.some((c) => c.id === r.caseId)) throw Error(`Unknown case ${r.caseId}`);
    if (r.repetition < 1 || r.repetition > THRESHOLD.borderlineRepetitions)
      throw Error(`Repetition out of range ${key}`);
    seen.add(key);
  }
  const base = runs.filter((r) => r.repetition <= THRESHOLD.baseRepetitions);
  for (const c of cases)
    for (let rep = 1; rep <= THRESHOLD.baseRepetitions; rep++)
      if (!seen.has(`${c.id}#${rep}`)) missing.push(`${c.id}#${rep}`);
  const passes = base.filter((r) => r.pass).length;
  const interval = wilson(passes, base.length);
  const criticalFailures = [
    ...new Set(
      runs
        .filter((r) => !r.pass && cases.find((c) => c.id === r.caseId)!.critical)
        .map((r) => r.caseId),
    ),
  ];
  const borderline: ArmVerdict["borderline"] = [];
  let borderlineIncomplete = false;
  for (const c of cases) {
    if (c.critical) continue;
    const baseRuns = base.filter((r) => r.caseId === c.id);
    if (!baseRuns.some((r) => !r.pass)) continue;
    const all = runs.filter((r) => r.caseId === c.id);
    const ok = all.filter((r) => r.pass).length;
    const w = wilson(ok, all.length);
    borderline.push({ caseId: c.id, runs: all.length, passes: ok, lower: w.lower, upper: w.upper });
    if (all.length < THRESHOLD.borderlineRepetitions) borderlineIncomplete = true;
    else if (all.length - ok >= THRESHOLD.borderlineFailuresThatFail)
      reasons.push(`${c.id} failed ${all.length - ok} of ${all.length} runs`);
  }
  if (criticalFailures.length) reasons.push(`critical case failed: ${criticalFailures.join(", ")}`);
  const complete = missing.length === 0;
  if (complete && interval.p < THRESHOLD.minExactRate)
    reasons.push(`exact-match rate ${(interval.p * 100).toFixed(2)}% below 97%`);
  if (complete && interval.lower < THRESHOLD.minWilsonLower)
    reasons.push(`Wilson lower bound ${(interval.lower * 100).toFixed(2)}% below 90%`);
  // Failure already decided is final even when runs are missing; otherwise incomplete.
  const verdict = reasons.length
    ? "FAIL"
    : !complete || borderlineIncomplete
      ? "INCOMPLETE"
      : "PASS";
  if (verdict === "INCOMPLETE") {
    if (!complete) reasons.push(`${missing.length} base runs missing`);
    if (borderlineIncomplete) reasons.push("borderline cases need repetitions 4 and 5");
  }
  return {
    verdict,
    reasons,
    n: base.length,
    passes,
    rate: interval.p,
    wilsonLower: interval.lower,
    wilsonUpper: interval.upper,
    criticalFailures,
    borderline,
    missing,
  };
}

/** Offline post-check arm: what the post-check would have caught on the model-alone replies. */
export function postcheckArmSummary(
  rows: { caseId: string; repetition: number; exact: boolean; flagged: boolean }[],
) {
  const wrong = rows.filter((r) => !r.exact);
  const right = rows.filter((r) => r.exact);
  const caught = wrong.filter((r) => r.flagged).length;
  const silent = wrong.length - caught;
  const falseAlarms = right.filter((r) => r.flagged).length;
  return {
    conversations: rows.length,
    wrong: wrong.length,
    caught,
    silentWrong: silent,
    silentWrongInterval: wilson(silent, rows.length),
    falseAlarms,
    falseAlarmInterval: wilson(falseAlarms, right.length),
  };
}
