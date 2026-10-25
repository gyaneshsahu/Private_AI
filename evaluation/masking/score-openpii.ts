/**
 * One-off third-party check (launch plan M1.3): scores the product detector on
 * the EMAIL, TELEPHONENUM and CREDITCARDNUMBER spans of German and English rows
 * of OpenPII 1M (ai4privacy/pii-masking-openpii-1m, validation split).
 *
 * Dataset: "OpenPII 1M", Ai4Privacy / Ai Suisse SA, CC-BY-4.0,
 * https://huggingface.co/datasets/ai4privacy/pii-masking-openpii-1m
 * (DOI 10.57967/hf/8202). Synthetic data only.
 *
 * The file is streamed on stdin and never stored; only counts are written:
 *   curl -sSL https://huggingface.co/datasets/ai4privacy/pii-masking-openpii-1m/resolve/ecfdc547f4a0955600cfe6ab98ba2a162207fcc0/data/validation.jsonl \
 *     | npx tsx evaluation/masking/score-openpii.ts
 *
 * Matching is the benchmark's (score.ts): a span is caught when every letter and
 * digit is under some detection; a detection is a false positive when it touches
 * no letter or digit of any annotated span, whatever its label.
 */
import { createInterface } from "node:readline";
import { writeFile } from "node:fs/promises";
import type { IdentifierKind } from "../../src/identifier-masking";
import { detect, wilson } from "./score";

const REVISION = "ecfdc547f4a0955600cfe6ab98ba2a162207fcc0";
const TARGET: Record<string, IdentifierKind> = {
  EMAIL: "EMAIL",
  TELEPHONENUM: "PHONE",
  CREDITCARDNUMBER: "CARD",
};
const LANGUAGES = new Set(["de", "en"]);
const ALNUM = /[\p{L}\p{N}]/u;

interface Row {
  source_text: string;
  language: string;
  privacy_mask: { value: string; start: number; end: number; label: string }[];
}
type Tally = { spans: number; caught: number; kindCorrect: number; partial: number };
const tallies = new Map<string, Tally>();
const tally = (key: string) => {
  if (!tallies.has(key)) tallies.set(key, { spans: 0, caught: 0, kindCorrect: 0, partial: 0 });
  return tallies.get(key)!;
};
const falsePositives = new Map<string, number>();
let rows = 0;
let scoredRows = 0;
let skippedOffsets = 0;
let detections = 0;
const examples: string[] = [];

for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  rows++;
  const row = JSON.parse(line) as Row;
  if (!LANGUAGES.has(row.language)) continue;
  if (!row.privacy_mask.some((span) => span.label in TARGET)) continue;
  const text = row.source_text;
  // Offsets must index the JavaScript string; rows where they do not are skipped and counted.
  if (row.privacy_mask.some((span) => text.slice(span.start, span.end) !== span.value)) {
    skippedOffsets++;
    continue;
  }
  scoredRows++;
  const found = detect(text);
  detections += found.length;
  const coverKind: (IdentifierKind | undefined)[] = new Array(text.length);
  for (const det of found) for (let i = det.start; i < det.end; i++) coverKind[i] = det.kind;
  const annotated: boolean[] = new Array(text.length).fill(false);
  for (const span of row.privacy_mask)
    for (let i = span.start; i < span.end; i++) annotated[i] = true;

  for (const span of row.privacy_mask) {
    const kind = TARGET[span.label];
    if (!kind) continue;
    let total = 0;
    let hit = 0;
    let right = true;
    for (let i = span.start; i < span.end; i++) {
      if (!ALNUM.test(text[i])) continue;
      total++;
      if (coverKind[i]) {
        hit++;
        if (coverKind[i] !== kind) right = false;
      }
    }
    const caught = total > 0 && hit === total;
    for (const key of [span.label, `${span.label}/${row.language}`]) {
      const t = tally(key);
      t.spans++;
      if (caught) t.caught++;
      if (caught && right) t.kindCorrect++;
      if (!caught && hit > 0) t.partial++;
    }
    if (!caught && examples.length < 60)
      examples.push(`${span.label}/${row.language}\t${JSON.stringify(span.value)}`);
  }
  for (const det of found) {
    let touches = false;
    for (let i = det.start; i < det.end && !touches; i++)
      touches = annotated[i] && ALNUM.test(text[i]);
    if (!touches) falsePositives.set(det.kind, (falsePositives.get(det.kind) ?? 0) + 1);
  }
}

const table = Object.fromEntries(
  [...tallies.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, t]) => [
      key,
      { ...t, recall: t.spans ? t.caught / t.spans : null, recall95: wilson(t.caught, t.spans) },
    ]),
);
const fpTotal = [...falsePositives.values()].reduce((a, b) => a + b, 0);
const result = {
  dataset: "ai4privacy/pii-masking-openpii-1m",
  revision: REVISION,
  split: "validation",
  licence: "CC-BY-4.0, Ai4Privacy / Ai Suisse SA",
  languages: [...LANGUAGES],
  rowsRead: rows,
  rowsScored: scoredRows,
  rowsSkippedForOffsets: skippedOffsets,
  detections,
  falsePositives: { total: fpTotal, byKind: Object.fromEntries(falsePositives), precision95: wilson(detections - fpTotal, detections) },
  byLabel: table,
};
if (rows === 0) throw Error("No input rows; pipe the validation file on stdin.");
await writeFile(
  new URL("./results/openpii-validation.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
// Miss examples go to the console only; nothing from the dataset is written to the repository.
console.log("\nfirst misses (console only):\n" + examples.join("\n"));
