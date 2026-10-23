/**
 * Independent check of `src/identifier-masking.ts` on hand-written documents
 * that share nothing with the benchmark generator. Reuses only the
 * benchmark's scorer (`../score.ts`): the same matching rules, Wilson
 * intervals and tables, so the numbers are comparable.
 *
 * Writes evaluation/masking/results/independent.json.
 * Usage: npx tsx evaluation/masking/independent/evaluate-independent.ts
 * (the test `tests/masking-independent.test.ts` runs the same evaluation
 * and, with WRITE_INDEPENDENT_RESULTS=1, writes the file).
 *
 * This is a measurement, not a tuning set: misses found here are listed,
 * not fixed against.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  type BenchmarkResult,
  DEFINITIONS,
  evaluate,
  markdownTable,
  missSummary,
} from "../score";
import {
  ALL_DOCUMENTS,
  type IndependentCorpus,
  buildIndependentCorpus,
  corpusSha256,
} from "./build";

type ScorerCorpus = Parameters<typeof evaluate>[0];

export interface NotCoveredRow {
  spans: number;
  /** At least one letter or digit of the span is inside some detection (a false-positive measure). */
  maskedAtLeastPartly: number;
  /** No letter or digit of the span is inside any detection. */
  leftInClear: number;
}

export interface IndependentResult {
  label: string;
  measuredOn: string;
  corpusSha256: string;
  documents: number;
  method: string[];
  definitions: string[];
  overall: BenchmarkResult["overall"];
  /** Every category except the hand-damaged scans. */
  overallExcludingScans: BenchmarkResult["overall"];
  /** Scan identifiers split by whether OCR damage was typed into the value itself (variant contains "ocr"). */
  scanRecallByDamage: Record<"damaged" | "undamaged", { identifiers: number; caught: number; recall: number | null; recallCi95: [number, number] | null }>;
  byCategory: BenchmarkResult["byCategory"];
  byKind: BenchmarkResult["byKind"];
  byLayout: BenchmarkResult["byLayout"];
  /** Names and addresses: not promised, never detection targets, counted only. */
  namesAndAddresses: {
    statement: string;
    overall: Record<"NAME" | "ADDRESS", NotCoveredRow>;
    byCategory: Record<string, Record<"NAME" | "ADDRESS", NotCoveredRow>>;
    falsePositivesOnNamesOrAddresses: number;
  };
  misses: BenchmarkResult["misses"];
  falsePositives: BenchmarkResult["falsePositives"];
}

const asScorerCorpus = (corpus: IndependentCorpus, samples = corpus.samples) =>
  ({ ...corpus, samples }) as unknown as ScorerCorpus;

function notCoveredRows(result: BenchmarkResult): Record<"NAME" | "ADDRESS", NotCoveredRow> {
  const row = (kind: "NAME" | "ADDRESS"): NotCoveredRow => {
    const entry = result.notCovered[kind] ?? { spans: 0, fullyLeftInClear: 0 };
    return {
      spans: entry.spans,
      maskedAtLeastPartly: entry.spans - entry.fullyLeftInClear,
      leftInClear: entry.fullyLeftInClear,
    };
  };
  return { NAME: row("NAME"), ADDRESS: row("ADDRESS") };
}

export function runIndependentEvaluation(): IndependentResult {
  const corpus = buildIndependentCorpus();
  const sha = corpusSha256(corpus);
  const result = evaluate(asScorerCorpus(corpus), "independent-hand-written", sha);
  const categories = [...new Set(corpus.samples.map((s) => s.category))];
  const byCategory: Record<string, Record<"NAME" | "ADDRESS", NotCoveredRow>> = {};
  for (const category of categories) {
    const subset = corpus.samples.filter((s) => s.category === category);
    byCategory[category] = notCoveredRows(
      evaluate(asScorerCorpus(corpus, subset), `independent-${category}`, sha),
    );
  }
  const withoutScans = evaluate(
    asScorerCorpus(corpus, corpus.samples.filter((s) => !s.ocr)),
    "independent-without-scans",
    sha,
  );
  const scanRecallByDamage = Object.fromEntries(
    (["damaged", "undamaged"] as const).map((bucket) => {
      // Keep only this bucket's spans; recall from the scorer is then exact (precision is not used).
      const scans = corpus.samples
        .filter((s) => s.ocr)
        .map((s) => ({ ...s, spans: s.spans.filter((span) => /ocr/.test(span.variant) === (bucket === "damaged")) }));
      const counts = evaluate(asScorerCorpus(corpus, scans), `independent-scans-${bucket}`, sha).overall;
      return [
        bucket,
        { identifiers: counts.identifiers, caught: counts.caught, recall: counts.recall, recallCi95: counts.recallCi95 },
      ];
    }),
  ) as IndependentResult["scanRecallByDamage"];
  return {
    label: "independent-hand-written",
    measuredOn: "2026-10-23",
    corpusSha256: sha,
    documents: corpus.samples.length,
    method: [
      `${ALL_DOCUMENTS.length} documents written by hand as literal text in evaluation/masking/independent/documents*.ts; no import from the benchmark generator (values.ts, doc.ts, layouts.ts, corpus.ts), no seeded values, no noise model`,
      "every person, company, address and number is invented; check digits computed with independent/check-digits.ts, written for this check",
      "OCR damage in the scan category typed by hand per document",
      "scored with the benchmark scorer evaluation/masking/score.ts unchanged (same matching rules and Wilson intervals)",
      "the detector src/identifier-masking.ts was not changed for or after this measurement",
    ],
    definitions: DEFINITIONS,
    overall: result.overall,
    overallExcludingScans: withoutScans.overall,
    scanRecallByDamage,
    byCategory: result.byCategory,
    byKind: result.byKind,
    byLayout: result.byLayout,
    namesAndAddresses: {
      statement:
        "Names and addresses are not promised kinds and are never detection targets: they are recorded only so that the result can say how many were left in clear text and how many a detection of a promised kind touched (a false-positive measure).",
      overall: notCoveredRows(result),
      byCategory,
      falsePositivesOnNamesOrAddresses: result.falsePositives.filter((fp) => fp.hitsNameOrAddress).length,
    },
    misses: result.misses,
    falsePositives: result.falsePositives,
  };
}

export function summaryMarkdown(result: IndependentResult): string {
  const lines: string[] = [];
  lines.push(markdownTable(result.byCategory, result.overall));
  lines.push("");
  lines.push(markdownTable({ "all except scans": result.overallExcludingScans }));
  lines.push("");
  for (const [bucket, r] of Object.entries(result.scanRecallByDamage))
    lines.push(`scan identifiers, ${bucket}: ${r.caught}/${r.identifiers} caught, recall ${r.recall}, 95% CI ${JSON.stringify(r.recallCi95)}`);
  lines.push("");
  lines.push(markdownTable(result.byKind, undefined, "Kind"));
  lines.push("");
  lines.push("| Category | Names | names touched by a detection | names left in clear | Addresses | addresses touched | addresses left in clear |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  const row = (name: string, r: Record<"NAME" | "ADDRESS", NotCoveredRow>) =>
    `| ${name} | ${r.NAME.spans} | ${r.NAME.maskedAtLeastPartly} | ${r.NAME.leftInClear} | ${r.ADDRESS.spans} | ${r.ADDRESS.maskedAtLeastPartly} | ${r.ADDRESS.leftInClear} |`;
  for (const [category, r] of Object.entries(result.namesAndAddresses.byCategory)) lines.push(row(category, r));
  lines.push(row("**overall**", result.namesAndAddresses.overall));
  lines.push("");
  lines.push("Misses (grouped):");
  for (const group of missSummary(result.misses)) lines.push(`${group.count}\t${group.key}\t${group.example}`);
  lines.push("");
  lines.push("Misses (each):");
  for (const m of result.misses)
    lines.push(`${m.sample}\t${m.layout}\t${m.kind}\t${m.variant}\t${m.reason}\t${m.overlappedBy.join("+")}\t${m.context}`);
  lines.push("");
  lines.push(`False positives: ${result.falsePositives.length}`);
  for (const fp of result.falsePositives)
    lines.push(`${fp.sample}\t${fp.layout}\t${fp.kind}\t${fp.hitsNameOrAddress ? "name/address" : ""}\t${fp.context}`);
  return lines.join("\n");
}

export const RESULT_URL = new URL("../results/independent.json", import.meta.url);

export async function writeIndependentResults(result = runIndependentEvaluation()) {
  await mkdir(new URL("../results/", import.meta.url), { recursive: true });
  await writeFile(RESULT_URL, JSON.stringify(result, null, 2) + "\n");
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await writeIndependentResults();
  console.log(summaryMarkdown(result));
}
