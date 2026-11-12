/**
 * The ONLY reader of the German held-out split. Run once, after the detector changes of
 * this phase (M1.2 Unicode word edges). Verifies the split's SHA-256 against the value
 * printed when it was written, refuses to run if a result already exists, and writes
 * evaluation/masking/results/heldout-de.json with per-category and per-kind recall.
 * If it is ever run again after a detector change, the set is burnt for that change.
 * Usage: npx tsx evaluation/masking/evaluate-heldout-de.ts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Corpus } from "./corpus";
import { evaluate, markdownTable, missSummary } from "./score";

/** Printed by write-heldout-de.ts on 12 November 2026. */
const HELDOUT_DE_SHA256 =
  "0258709ac23656fd4cfb524b7ebc6eaf37d8a15df858121cdea2161696877909";

const output = new URL("./results/heldout-de.json", import.meta.url);
if (existsSync(output)) {
  console.error(
    "results/heldout-de.json exists: the German held-out evaluation has already been run. Re-running it after a change burns the set; record that decision before deleting the result.",
  );
  process.exit(1);
}
const bytes = await readFile(new URL("./heldout-de/heldout-de.json", import.meta.url));
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== HELDOUT_DE_SHA256) {
  console.error(`German held-out split changed: sha256 ${sha}, expected ${HELDOUT_DE_SHA256}`);
  process.exit(1);
}
const corpus = JSON.parse(bytes.toString("utf8")) as Corpus;
const result = evaluate(corpus, "heldout-de-final", sha);
await mkdir(new URL("./results/", import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(markdownTable(result.byCategory, result.overall));
console.log();
console.log(markdownTable(result.byKind, undefined, "Kind"));
console.log();
for (const group of missSummary(result.misses))
  console.log(`${group.count}\t${group.key}\t${group.example}`);
console.log(`\nfalse positives: ${result.falsePositives.length}`);
