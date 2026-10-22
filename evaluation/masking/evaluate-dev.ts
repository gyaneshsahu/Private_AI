/**
 * Benchmarks the current detector on the development split.
 * Usage: npx tsx evaluation/masking/evaluate-dev.ts [label]
 * Writes evaluation/masking/results/dev-<label>.json (default label "current")
 * and prints the per-category table, the per-kind table, grouped misses and
 * every false positive. Reads only the development split.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Corpus } from "./corpus";
import { evaluate, markdownTable, missSummary } from "./score";

const label = process.argv[2] ?? "current";
const bytes = await readFile(new URL("./dev/dev.json", import.meta.url));
const corpus = JSON.parse(bytes.toString("utf8")) as Corpus;
const sha = createHash("sha256").update(bytes).digest("hex");
const result = evaluate(corpus, label, sha);
const dir = new URL("./results/", import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(
  new URL(`dev-${label}.json`, dir),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(markdownTable(result.byCategory, result.overall));
console.log();
console.log(markdownTable(result.byKind, undefined, "Kind"));
console.log();
if (process.argv.includes("--quiet")) process.exit(0);
for (const group of missSummary(result.misses))
  console.log(`${group.count}\t${group.key}\t${group.example}`);
console.log(`\nfalse positives: ${result.falsePositives.length}`);
for (const fp of result.falsePositives)
  console.log(`  ${fp.kind}\t${fp.layout}\t${fp.context}`);
