/**
 * Scoring for the identifier-masking benchmark.
 *
 * Definitions (stated in every result file):
 * - A ground-truth identifier is CAUGHT when every letter and digit inside its
 *   span is covered by some detection, of any kind. Masking under the wrong
 *   label still hides the value, so recall counts it; `kindCorrect` reports
 *   how many were caught only by detections of the right kind.
 * - A PARTIAL miss leaves some of its letters or digits in clear text; it is
 *   a false negative.
 * - A detection is a TRUE POSITIVE when it overlaps a ground-truth identifier
 *   in at least one letter or digit, otherwise a FALSE POSITIVE (including
 *   detections that hit a name or address, which are not promised kinds).
 * - Recall = caught / identifiers; precision = true-positive detections /
 *   detections. Intervals are Wilson score intervals at 95 %.
 */
import {
  IDENTIFIER_KINDS,
  INVISIBLE,
  type IdentifierKind,
  findIdentifiers,
} from "../../src/identifier-masking";
import type { Corpus, Sample } from "./corpus";

export interface Detection {
  kind: IdentifierKind;
  start: number;
  end: number;
}

/** Runs the product detector the way `mask()` does and maps offsets back to the raw text. */
export function detect(raw: string): Detection[] {
  const map: number[] = [];
  let stripped = "";
  for (let i = 0; i < raw.length; i++) {
    if (INVISIBLE_CHAR.test(raw[i])) continue;
    map.push(i);
    stripped += raw[i];
  }
  map.push(raw.length);
  return findIdentifiers(stripped).map((hit) => ({
    kind: hit.kind,
    start: map[hit.start],
    end: map[hit.end - 1] + 1,
  }));
}

const ALNUM = /[\p{L}\p{N}]/u;
const INVISIBLE_CHAR = new RegExp(INVISIBLE.source);

export function wilson(successes: number, total: number): [number, number] | null {
  if (total === 0) return null;
  const z = 1.959964;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const half =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return [round(Math.max(0, centre - half)), round(Math.min(1, centre + half))];
}
const round = (x: number) => Math.round(x * 10000) / 10000;

export interface Counts {
  samples: number;
  identifiers: number;
  caught: number;
  kindCorrect: number;
  missed: number;
  partial: number;
  detections: number;
  truePositives: number;
  falsePositives: number;
  recall: number | null;
  recallCi95: [number, number] | null;
  precision: number | null;
  precisionCi95: [number, number] | null;
}

interface Tally {
  samples: Set<string>;
  identifiers: number;
  caught: number;
  kindCorrect: number;
  partial: number;
  detections: number;
  truePositives: number;
}
const emptyTally = (): Tally => ({
  samples: new Set(),
  identifiers: 0,
  caught: 0,
  kindCorrect: 0,
  partial: 0,
  detections: 0,
  truePositives: 0,
});
function finish(t: Tally): Counts {
  return {
    samples: t.samples.size,
    identifiers: t.identifiers,
    caught: t.caught,
    kindCorrect: t.kindCorrect,
    missed: t.identifiers - t.caught,
    partial: t.partial,
    detections: t.detections,
    truePositives: t.truePositives,
    falsePositives: t.detections - t.truePositives,
    recall: t.identifiers ? round(t.caught / t.identifiers) : null,
    recallCi95: wilson(t.caught, t.identifiers),
    precision: t.detections ? round(t.truePositives / t.detections) : null,
    precisionCi95: wilson(t.truePositives, t.detections),
  };
}

export interface MissRecord {
  sample: string;
  category: string;
  layout: string;
  kind: IdentifierKind;
  variant: string;
  value: string;
  /** "missed" (nothing covered), "partial" (some characters left) */
  reason: "missed" | "partial";
  /** Kinds of any detections that overlapped it (e.g. a PHONE inside an IBAN). */
  overlappedBy: IdentifierKind[];
  leftInClear: number;
  context: string;
}
export interface FalsePositiveRecord {
  sample: string;
  category: string;
  layout: string;
  kind: IdentifierKind;
  value: string;
  hitsNameOrAddress: boolean;
  context: string;
}

export interface BenchmarkResult {
  split: string;
  label: string;
  corpusSha256: string;
  definitions: string[];
  overall: Counts;
  byCategory: Record<string, Counts>;
  /** Recall by ground-truth kind; precision by detected kind. */
  byKind: Record<string, Counts>;
  byLayout: Record<string, Counts>;
  notCovered: Record<string, { spans: number; fullyLeftInClear: number }>;
  misses: MissRecord[];
  falsePositives: FalsePositiveRecord[];
}

export const DEFINITIONS = [
  "caught: every letter and digit of the ground-truth span is inside some detection (any kind)",
  "kindCorrect: caught, and every covering detection has the ground-truth kind",
  "partial: some but not all letters and digits covered; counted as missed",
  "true positive detection: overlaps a ground-truth identifier in at least one letter or digit",
  "false positive detection: overlaps no ground-truth identifier (names and addresses are not promised kinds)",
  "recall = caught / identifiers; precision = true positive detections / detections; 95% Wilson intervals",
  "byKind: recall rows count ground-truth identifiers of that kind; precision rows count detections of that kind",
];

const context = (text: string, start: number, end: number) =>
  (text.slice(Math.max(0, start - 30), start) + "[[" + text.slice(start, end) + "]]" + text.slice(end, end + 20)).replace(/\n/g, "⏎");

export function evaluate(
  corpus: Corpus,
  label: string,
  corpusSha256: string,
): BenchmarkResult {
  const overall = emptyTally();
  const byCategory = new Map<string, Tally>();
  const byKind = new Map<string, Tally>();
  const byLayout = new Map<string, Tally>();
  const notCovered: Record<string, { spans: number; fullyLeftInClear: number }> = {};
  const misses: MissRecord[] = [];
  const falsePositives: FalsePositiveRecord[] = [];
  const tally = (map: Map<string, Tally>, key: string) => {
    if (!map.has(key)) map.set(key, emptyTally());
    return map.get(key)!;
  };
  for (const kind of IDENTIFIER_KINDS) tally(byKind, kind);

  for (const sample of corpus.samples) {
    const detections = detect(sample.text);
    const groups = [overall, tally(byCategory, sample.category), tally(byLayout, sample.layout)];
    for (const g of groups) g.samples.add(sample.id);
    scoreSample(sample, detections, groups, byKind, misses, falsePositives, notCovered);
  }
  const record = (map: Map<string, Tally>) =>
    Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, t]) => [k, finish(t)]));
  return {
    split: corpus.split,
    label,
    corpusSha256,
    definitions: DEFINITIONS,
    overall: finish(overall),
    byCategory: Object.fromEntries([...byCategory.entries()].map(([k, t]) => [k, finish(t)])),
    byKind: Object.fromEntries(IDENTIFIER_KINDS.map((k) => [k, finish(byKind.get(k)!)])),
    byLayout: record(byLayout),
    notCovered,
    misses,
    falsePositives,
  };
}

function scoreSample(
  sample: Sample,
  detections: Detection[],
  groups: Tally[],
  byKind: Map<string, Tally>,
  misses: MissRecord[],
  falsePositives: FalsePositiveRecord[],
  notCovered: Record<string, { spans: number; fullyLeftInClear: number }>,
) {
  const text = sample.text;
  const coverKind: (IdentifierKind | undefined)[] = new Array(text.length);
  const covered: boolean[] = new Array(text.length).fill(false);
  for (const det of detections)
    for (let i = det.start; i < det.end; i++) {
      covered[i] = true;
      coverKind[i] = det.kind;
    }
  const kindTally = (kind: IdentifierKind) => byKind.get(kind)!;
  for (const span of sample.spans) {
    let total = 0;
    let hit = 0;
    let right = true;
    for (let i = span.start; i < span.end; i++) {
      if (!ALNUM.test(text[i])) continue;
      total++;
      if (covered[i]) {
        hit++;
        if (coverKind[i] !== span.kind) right = false;
      }
    }
    const caught = total > 0 && hit === total;
    const kt = kindTally(span.kind);
    kt.samples.add(sample.id);
    for (const g of [...groups, kt]) {
      g.identifiers++;
      if (caught) g.caught++;
      if (caught && right) g.kindCorrect++;
      if (!caught && hit > 0) g.partial++;
    }
    if (!caught) {
      const overlappedBy = [
        ...new Set(
          detections
            .filter((d) => d.start < span.end && d.end > span.start)
            .map((d) => d.kind),
        ),
      ];
      misses.push({
        sample: sample.id,
        category: sample.category,
        layout: sample.layout,
        kind: span.kind,
        variant: span.variant,
        value: text.slice(span.start, span.end),
        reason: hit > 0 ? "partial" : "missed",
        overlappedBy,
        leftInClear: total - hit,
        context: context(text, span.start, span.end),
      });
    }
  }
  for (const det of detections) {
    let tp = false;
    for (const span of sample.spans) {
      if (det.start >= span.end || det.end <= span.start) continue;
      for (let i = Math.max(det.start, span.start); i < Math.min(det.end, span.end); i++)
        if (ALNUM.test(text[i])) {
          tp = true;
          break;
        }
      if (tp) break;
    }
    const kt = kindTally(det.kind);
    kt.samples.add(sample.id);
    for (const g of [...groups, kt]) {
      g.detections++;
      if (tp) g.truePositives++;
    }
    if (!tp)
      falsePositives.push({
        sample: sample.id,
        category: sample.category,
        layout: sample.layout,
        kind: det.kind,
        value: text.slice(det.start, det.end),
        hitsNameOrAddress: sample.notCovered.some((s) => det.start < s.end && det.end > s.start),
        context: context(text, det.start, det.end),
      });
  }
  for (const span of sample.notCovered) {
    const entry = (notCovered[span.kind] ??= { spans: 0, fullyLeftInClear: 0 });
    entry.spans++;
    let any = false;
    for (let i = span.start; i < span.end; i++) if (covered[i] && ALNUM.test(text[i])) any = true;
    if (!any) entry.fullyLeftInClear++;
  }
}

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const ci = (c: [number, number] | null) =>
  c === null ? "n/a" : `${(c[0] * 100).toFixed(1)}–${(c[1] * 100).toFixed(1)}`;

export function markdownTable(
  rows: Record<string, Counts>,
  overall?: Counts,
  heading = "Category",
): string {
  const lines = [
    `| ${heading} | Samples | Identifiers | Caught (TP) | Missed (FN) | of which partial | Detections | FP | Recall | Recall 95% CI | Precision | Precision 95% CI |`,
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  const row = (name: string, c: Counts) =>
    `| ${name} | ${c.samples} | ${c.identifiers} | ${c.caught} | ${c.missed} | ${c.partial} | ${c.detections} | ${c.falsePositives} | ${pct(c.recall)} | ${ci(c.recallCi95)} | ${pct(c.precision)} | ${ci(c.precisionCi95)} |`;
  for (const [name, c] of Object.entries(rows)) lines.push(row(name, c));
  if (overall) lines.push(row("**overall**", overall));
  return lines.join("\n");
}

/** Groups misses by kind and format variant for the fragment. */
export function missSummary(misses: MissRecord[]): { key: string; count: number; example: string }[] {
  const groups = new Map<string, { count: number; example: string }>();
  for (const miss of misses) {
    const key = `${miss.kind} | ${miss.variant} | ${miss.category}${miss.overlappedBy.length ? ` | partly under ${miss.overlappedBy.join("+")}` : ""}`;
    const entry = groups.get(key) ?? { count: 0, example: miss.context };
    entry.count++;
    groups.set(key, entry);
  }
  return [...groups.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
