// Provider-neutral arithmetic post-check. Given the final text of a reply, it
// finds arithmetic relations the reply itself states and recomputes them:
//   - written equations: "1.234,56 × 19 % = 234,57", "09:23 − 18 min = 09:05"
//   - percentages of stated bases: "19 % von 1.234,56 EUR sind 234,57 EUR"
//   - percentage changes: "von 850 EUR auf 909,50 EUR ... 7 %"
//   - time spans: "08:45–12:10 (3 h 25 min)"
//   - sums of listed items ending in a total line (tables, bullet lists)
// It never rewrites the reply, never calls a model and never retries. A
// mismatch means "this reply contradicts its own stated arithmetic"; the absence
// of a mismatch proves nothing about operand choice, method or units.
// Not wired into the product: placement is documented in
// docs/ledger-fragments/2026-10-22-arithmetic-gate.md (after the provider-interface refactor).
import {
  D,
  type Dec,
  type Mention,
  type NumberLocale,
  type NumberMention,
  extractMentions,
  formatClock,
} from "./numbers";

export type RelationKind =
  "equation" | "percent-of" | "percent-change" | "time-span" | "sum";
export type Relation = {
  kind: RelationKind;
  text: string;
  stated: string;
  recomputed: string[];
  ok: boolean;
};
export type PostcheckResult = {
  relations: Relation[];
  mismatches: Relation[];
  flagged: boolean;
  /** Numbers whose thousands and decimal marks could be read two ways and the reply gave no locale clue. */
  ambiguous: number;
};

const fillers = new RegExp(
  [
    "€",
    "EUR",
    "Euro",
    "USD",
    "\\$",
    "GBP",
    "£",
    "%",
    "Prozent",
    "percent",
    "per cent",
    "/\\s?(?:h|Std\\.?|Stunde|Monat|Jahr|month|year|hour|Tag|day)\\b",
    "(?:pro|per|je)\\s+(?:Stunde|Std\\.?|hour|Monat|month|Jahr|year|Tag|day)\\b",
    "Uhr",
    "USt\\.?",
    "MwSt\\.?",
    "VAT",
    "Umsatzsteuer",
    "Mehrwertsteuer",
    "Vorsteuer",
    "Rabatt",
    "discount",
    "Skonto",
    "Zinsen",
    "interest",
    "netto",
    "brutto",
    "net",
    "gross",
    "Tage?n?",
    "days?",
    "Monate?n?",
    "months?",
    "Jahre?n?",
    "years?",
    "\\*",
    "~",
    "\\u00A0",
    "\\u202F",
    "\\u2009",
  ]
    .map((f) => `(?<![\p{L}])(?:${f})(?![\p{L}])`)
    .join("|"),
  "giu",
);
const operatorWords: [RegExp, "+" | "-" | "*" | "/"][] = [
  [/^(?:\+|plus|zzgl\.?|zuzüglich)$/i, "+"],
  [/^(?:-|–|minus|abzgl\.?|abzüglich|less)$/i, "-"],
  [/^(?:×|x|\*|·|mal|times)$/i, "*"],
  [/^(?:\/|÷|:|geteilt durch|divided by)$/i, "/"],
];
function gapOperator(gap: string): "+" | "-" | "*" | "/" | "" | undefined {
  if (/[=≈\n()]/.test(gap)) return undefined;
  // "*" is multiplication when it stands alone between operands; Markdown emphasis was removed earlier.
  const lone = gap.trim();
  if (lone === "*") return "*";
  const stripped = gap.replace(fillers, " ").replace(/\s+/g, " ").trim();
  if (stripped === "") return "";
  for (const [re, op] of operatorWords) if (re.test(stripped)) return op;
  return undefined;
}

type Operand = { mention: Mention };
const minutesPerDay = 1440;
const mod = (n: number) =>
  ((n % minutesPerDay) + minutesPerDay) % minutesPerDay;

function numberChoices(m: Mention): Dec[] | undefined {
  if (m.kind === "number") return [m.value];
  if (m.kind === "duration") {
    if (m.unit === "h") return [m.amount];
    if (m.unit === "min") return [m.amount, m.amount.div(60)];
    return [m.minutes.div(60), m.minutes];
  }
  return undefined;
}

function evaluateNumeric(
  operands: Mention[],
  ops: ("+" | "-" | "*" | "/")[],
): Dec[] {
  let combos: { v: Dec; pct: boolean }[][] = [[]];
  for (const m of operands) {
    const choices = numberChoices(m);
    if (!choices) return [];
    const pct = m.kind === "number" && m.percent;
    combos = combos.flatMap((c) => choices.map((v) => [...c, { v, pct }]));
    if (combos.length > 27) return [];
  }
  const out: Dec[] = [];
  for (const values of combos) {
    // multiplicative pass
    const terms: { v: Dec; pct: boolean }[] = [values[0]];
    const addOps: ("+" | "-")[] = [];
    let failed = false;
    ops.forEach((op, i) => {
      const next = values[i + 1];
      if (op === "*" || op === "/") {
        const last = terms[terms.length - 1];
        const a = last.pct ? last.v.div(100) : last.v;
        const b = next.pct ? next.v.div(100) : next.v;
        if (op === "/" && (b.isZero() || next.pct)) failed = true;
        else
          terms[terms.length - 1] = {
            v: op === "*" ? a.times(b) : a.div(b),
            pct: false,
          };
      } else {
        terms.push(next);
        addOps.push(op);
      }
    });
    if (failed || terms[0].pct) continue;
    let acc = terms[0].v;
    addOps.forEach((op, i) => {
      const t = terms[i + 1];
      const delta = t.pct ? acc.times(t.v).div(100) : t.v;
      acc = op === "+" ? acc.plus(delta) : acc.minus(delta);
    });
    out.push(acc);
  }
  return out;
}

function agrees(
  stated: NumberMention,
  computed: Dec[],
  approx: boolean,
): boolean {
  const k = stated.decimals;
  const unit = new D(10).pow(-k);
  return computed.some((c) => {
    const candidates = stated.percent ? [c, c.times(100)] : [c];
    return candidates.some((x) =>
      approx
        ? x.minus(stated.value).abs().lte(unit)
        : x.toDecimalPlaces(k, D.ROUND_HALF_UP).eq(stated.value),
    );
  });
}

const show = (d: Dec) => d.toDecimalPlaces(6).toString();

export function postcheck(
  reply: string,
  fallback: NumberLocale,
): PostcheckResult {
  const { text, mentions } = extractMentions(reply, fallback);
  const relations: Relation[] = [];
  // Placeholder text: each mention becomes ⟦i⟧ so patterns can be written over it.
  let p = "";
  let cursor = 0;
  const at: number[] = []; // placeholder start offsets in p
  mentions.forEach((m, i) => {
    p += text.slice(cursor, m.index);
    at.push(p.length);
    p += `⟦${i}⟧`;
    cursor = m.end;
  });
  p += text.slice(cursor);
  const ph = /⟦(\d+)⟧/g;
  const snippet = (from: number, to: number) =>
    text.slice(from, to).replace(/\s+/g, " ").trim();

  // 1. Written equations.
  for (const eq of p.matchAll(/[=≈]/g)) {
    const q = eq.index!;
    const approx = eq[0] === "≈";
    const rhs = /^\s*(?:€|EUR|USD|GBP|\$|£)?\s*⟦(\d+)⟧/.exec(p.slice(q + 1));
    if (!rhs) continue;
    const result = mentions[+rhs[1]];
    const before = [...p.slice(0, q).matchAll(ph)];
    if (!before.length) continue;
    let k = before.length - 1;
    const lastEnd = before[k].index! + before[k][0].length;
    if (gapOperator(p.slice(lastEnd, q)) !== "") continue;
    const operands: Mention[] = [mentions[+before[k][1]]];
    const ops: ("+" | "-" | "*" | "/")[] = [];
    while (k > 0) {
      const prevEnd = before[k - 1].index! + before[k - 1][0].length;
      const op = gapOperator(p.slice(prevEnd, before[k].index!));
      if (!op) break;
      operands.unshift(mentions[+before[k - 1][1]]);
      ops.unshift(op);
      k--;
    }
    if (!ops.length) continue;
    const first = operands[0];
    const from = first.index;
    const to = result.end;
    const kinds = operands.map((o) => o.kind);
    if (kinds.includes("date") || result.kind === "date") {
      // date ± N days = date
      if (
        operands.length === 2 &&
        first.kind === "date" &&
        first.candidates.length === 1 &&
        operands[1].kind === "number" &&
        /^(tag|tage|tagen|day|days)$/.test(operands[1].unitWord ?? "") &&
        (ops[0] === "+" || ops[0] === "-") &&
        result.kind === "date"
      ) {
        const t = new Date(`${first.candidates[0]}T00:00:00Z`);
        const n = operands[1].value.toNumber() * (ops[0] === "+" ? 1 : -1);
        t.setUTCDate(t.getUTCDate() + n);
        const iso = t.toISOString().slice(0, 10);
        relations.push({
          kind: "equation",
          text: snippet(from, to),
          stated: result.candidates.join("|"),
          recomputed: [iso],
          ok: result.candidates.includes(iso),
        });
      }
      continue;
    }
    if (kinds.includes("time") || result.kind === "time") {
      if (ops.some((o) => o === "*" || o === "/")) continue;
      if (
        operands.some(
          (o) =>
            o.kind === "number" &&
            !/^(min|minuten|minutes|minute)$/.test(o.unitWord ?? ""),
        )
      )
        continue;
      const minutesOf = (o: Mention) =>
        o.kind === "time"
          ? o.minutes
          : o.kind === "duration"
            ? o.minutes.toNumber()
            : (o as NumberMention).value.toNumber();
      let acc = minutesOf(first);
      ops.forEach(
        (op, i) => (acc += (op === "+" ? 1 : -1) * minutesOf(operands[i + 1])),
      );
      if (result.kind === "time") {
        if (first.kind !== "time") continue;
        relations.push({
          kind: "equation",
          text: snippet(from, to),
          stated: formatClock(result.minutes),
          recomputed: [formatClock(acc)],
          ok: mod(acc) === result.minutes,
        });
      } else if (
        result.kind === "duration" &&
        operands.length === 2 &&
        kinds.every((x) => x === "time")
      ) {
        const a = (operands[0] as { minutes: number }).minutes;
        const b = (operands[1] as { minutes: number }).minutes;
        const candidates = [mod(a - b), mod(b - a)];
        relations.push({
          kind: "equation",
          text: snippet(from, to),
          stated: `${result.minutes.toString()} min`,
          recomputed: candidates.map((c) => `${c} min`),
          ok: candidates.some((c) => result.minutes.eq(c)),
        });
      }
      continue;
    }
    if (result.kind !== "number" && result.kind !== "duration") continue;
    const computed = evaluateNumeric(operands, ops);
    if (!computed.length) continue;
    const stated: NumberMention =
      result.kind === "number"
        ? result
        : {
            kind: "number",
            text: result.text,
            index: result.index,
            end: result.end,
            value: result.amount,
            percent: false,
            ambiguous: false,
            decimals: result.amount.decimalPlaces(),
          };
    const durationAlternatives =
      result.kind === "duration"
        ? [...computed, ...computed.map((c) => c.times(60))]
        : computed;
    relations.push({
      kind: "equation",
      text: snippet(from, to),
      stated: stated.value.toString() + (stated.percent ? "%" : ""),
      recomputed: computed.map(show),
      ok:
        agrees(stated, durationAlternatives, approx) ||
        (result.kind === "duration" &&
          durationAlternatives.some((c) =>
            c.toDecimalPlaces(0).eq(result.minutes),
          )),
    });
  }

  const num = (i: string) => mentions[+i];
  const isAmount = (m: Mention): m is NumberMention =>
    m.kind === "number" && !m.percent;
  const isPercent = (m: Mention): m is NumberMention =>
    m.kind === "number" && m.percent;
  const connector =
    "(?:=|≈|ergibt|ergeben|sind|is|are|beträgt|betragen|macht|makes|gives|→|:)";
  const currency = "(?:€|EUR|USD|GBP|\\$|£)?";

  // 2. Percentages of stated bases (only where no equation already covered the span).
  const covered = (from: number, to: number) =>
    relations.some((r) => r.text && snippet(from, to).includes(r.text));
  const percentPatterns: RegExp[] = [
    new RegExp(
      `⟦(\\d+)⟧\\s*(?:%|Prozent|percent)\\s+(?:von|of|aus|auf|on)\\s+(?:(?:dem|der|den|des|the)\\s+)?(?:[\\p{L}-]+\\s+){0,3}?${currency}\\s*⟦(\\d+)⟧[^⟦\\n=]{0,25}?${connector}\\s*${currency}\\s*⟦(\\d+)⟧`,
      "giu",
    ),
    new RegExp(
      `⟦(\\d+)⟧[^⟦\\n]{0,15}?(?:sind|is|are|entspricht|equals|\\()\\s*⟦(\\d+)⟧\\s*(?:%|Prozent|percent)\\s+(?:von|of)\\s+(?:(?:dem|der|den|des|the)\\s+)?(?:[\\p{L}-]+\\s+){0,3}?${currency}\\s*⟦(\\d+)⟧`,
      "giu",
    ),
  ];
  percentPatterns.forEach((re, n) => {
    for (const m of p.matchAll(re)) {
      const [pi, bi, ri] = n === 0 ? [m[1], m[2], m[3]] : [m[2], m[3], m[1]];
      const pct = num(pi);
      const base = num(bi);
      const res = num(ri);
      if (!isPercent(pct) || !isAmount(base) || !isAmount(res)) continue;
      const from = Math.min(pct.index, base.index, res.index);
      const to = Math.max(pct.end, base.end, res.end);
      if (covered(from, to)) continue;
      const c = base.value.times(pct.value).div(100);
      relations.push({
        kind: "percent-of",
        text: snippet(from, to),
        stated: res.value.toString(),
        recomputed: [show(c)],
        ok: agrees(res, [c], false),
      });
    }
  });

  // 3. Percentage change "from a to b ... p %", same sentence, first percent after b.
  for (const m of p.matchAll(
    /(?:von|from)\s+(?:€|EUR|USD|GBP|\$|£)?\s*⟦(\d+)⟧[^⟦\n]{0,12}?\s(?:auf|to)\s+(?:€|EUR|USD|GBP|\$|£)?\s*⟦(\d+)⟧/giu,
  )) {
    const a = num(m[1]);
    const b = num(m[2]);
    if (!isAmount(a) || !isAmount(b) || a.value.isZero()) continue;
    const rest = p.slice(m.index! + m[0].length);
    const sentence = rest.split(/[.!?](?:\s|$)|\n/)[0];
    const later = [...sentence.matchAll(ph)].map((x) => num(x[1]));
    const pi = later.findIndex(isPercent);
    if (pi < 0 || later.slice(0, pi).filter(isAmount).length > 1) continue;
    const pct = later[pi] as NumberMention;
    const change = b.value.minus(a.value).div(a.value).times(100);
    relations.push({
      kind: "percent-change",
      text: snippet(a.index, pct.end),
      stated: `${pct.value.toString()}%`,
      recomputed: [`${show(change)}%`],
      ok: agrees({ ...pct, value: pct.value.abs() }, [change.abs()], false),
    });
  }

  // 4. Time spans "08:45–12:10 (3 h 25 min)".
  for (const m of p.matchAll(
    /⟦(\d+)⟧\s*(?:-|–|—|bis|to|until)\s*⟦(\d+)⟧\s*(?:\(|→|:)\s*⟦(\d+)⟧/giu,
  )) {
    const a = num(m[1]);
    const b = num(m[2]);
    const d = num(m[3]);
    if (a.kind !== "time" || b.kind !== "time" || d.kind !== "duration")
      continue;
    const span = mod(b.minutes - a.minutes);
    relations.push({
      kind: "time-span",
      text: snippet(a.index, d.end),
      stated: `${d.minutes.toString()} min`,
      recomputed: [`${span} min`],
      ok: d.minutes.eq(span),
    });
  }

  // 5. Sums of listed items closed by a total line.
  const totalWord =
    /\b(summe|gesamtsumme|gesamtbetrag|gesamt|insgesamt|zwischensumme|endbetrag|rechnungsbetrag|brutto|bruttobetrag|total|sum|subtotal|gross|grand total)\b/i;
  const minusWord =
    /(abzgl|abzüglich|minus|rabatt|skonto|nachlass|discount|less|deduct|abzug|erstattung|refund|gutschrift|credit|bereits gezahlt|already paid)/i;
  let lineStart = 0;
  type Item = {
    value: Dec;
    label: string;
    mention: NumberMention;
    total: boolean;
  };
  let items: Item[] = [];
  for (const line of text.split("\n")) {
    const start = lineStart;
    const lineEnd = start + line.length;
    const inLine = mentions.filter((m) => m.index >= start && m.end <= lineEnd);
    lineStart = lineEnd + 1;
    const isListLine = /^\s*(?:\||[-*•–]\s|\d+[.)]\s|[^|:]{1,60}:\s)/.test(
      line,
    );
    if (!line.trim() || !isListLine) {
      items = [];
      continue;
    }
    if (/^\s*\|?\s*:?-{2,}/.test(line)) continue; // table rule
    const amounts = inLine.filter(isAmount);
    if (!amounts.length) continue;
    const amount =
      [...amounts].reverse().find((a) => a.currency) ??
      amounts[amounts.length - 1];
    const label = text.slice(start, amount.index);
    const isTotal = totalWord.test(label);
    if (isTotal && items.length >= 2) {
      const sum = items.reduce((acc, it) => acc.plus(it.value), new D(0));
      const diff = sum.minus(amount.value).abs();
      const ok = agrees(amount, [sum], false);
      // Only a near miss, or a difference equal to one item (omitted or doubled), counts as
      // a stated sum; a large unrelated gap means the lines were not meant to add up.
      const plausible =
        diff.lte(amount.value.abs().times(0.25)) ||
        items.some((it) => it.value.abs().eq(diff));
      if (ok || plausible)
        relations.push({
          kind: "sum",
          text: snippet(items[0].mention.index, amount.end),
          stated: amount.value.toString(),
          recomputed: [show(sum)],
          ok,
        });
      items = [{ value: amount.value, label, mention: amount, total: true }];
      continue;
    }
    const signed =
      minusWord.test(label) && amount.value.isPositive()
        ? amount.value.neg()
        : amount.value;
    items.push({ value: signed, label, mention: amount, total: false });
  }

  const mismatches = relations.filter((r) => !r.ok);
  return {
    relations,
    mismatches,
    flagged: mismatches.length > 0,
    ambiguous: mentions.filter((m) => m.kind === "number" && m.ambiguous)
      .length,
  };
}
