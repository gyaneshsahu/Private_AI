/**
 * The ONLY reader of the locked held-out split. Run once, after tuning on
 * the development split is finished. It verifies the split's SHA-256 against
 * the value recorded when the split was written (before any tuning), refuses
 * to run if a held-out result already exists, and writes
 * evaluation/masking/results/heldout.json.
 *
 * If this script is ever run again after a detector change, the held-out set
 * is burnt for that change: say so in the ledger, do not report the new
 * numbers as held-out numbers.
 * Usage: npx tsx evaluation/masking/evaluate-heldout.ts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Corpus } from "./corpus";
import { evaluate, markdownTable, missSummary } from "./score";

/** Recorded when write-heldout.ts ran on 23 October 2026, before any detector tuning. */
const HELDOUT_SHA256 =
  "8848cf4ed9578a6f6e8e8604bcbb68a411c85c98114fd33da3c300044b3c3f17";

const output = new URL("./results/heldout.json", import.meta.url);
if (existsSync(output)) {
  console.error(
    "results/heldout.json exists: the held-out evaluation has already been run. Re-running it after a change burns the held-out set; record that decision before deleting the result.",
  );
  process.exit(1);
}
const bytes = await readFile(new URL("./heldout/heldout.json", import.meta.url));
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== HELDOUT_SHA256) {
  console.error(`held-out split changed: sha256 ${sha}, expected ${HELDOUT_SHA256}`);
  process.exit(1);
}
const corpus = JSON.parse(bytes.toString("utf8")) as Corpus;
const result = evaluate(corpus, "heldout-final", sha);
await mkdir(new URL("./results/", import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(markdownTable(result.byCategory, result.overall));
console.log();
console.log(markdownTable(result.byKind, undefined, "Kind"));
console.log();
for (const group of missSummary(result.misses))
  console.log(`${group.count}\t${group.key}\t${group.example}`);
console.log(`\nfalse positives: ${result.falsePositives.length}`);
for (const fp of result.falsePositives)
  console.log(`  ${fp.kind}\t${fp.layout}\t${fp.context}`);
