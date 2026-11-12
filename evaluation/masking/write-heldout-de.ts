/**
 * Writes the German held-out split ONCE (masking slice, 12 November 2026) and prints
 * its SHA-256: German layouts only, every category that has a German layout, the same
 * per-category size as the development split, a new seed. It refuses to overwrite an
 * existing file. Nothing else may read the file except `evaluate-heldout-de.ts`.
 * Usage: npx tsx evaluation/masking/write-heldout-de.ts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DEV_PER_CATEGORY, generateSplit, serializeCorpus } from "./corpus";

const HELDOUT_DE_SEED = 551208093;
const target = new URL("./heldout-de/heldout-de.json", import.meta.url);
if (existsSync(target)) {
  console.error(
    `${fileURLToPath(target)} already exists; the German held-out split is locked and is never regenerated.`,
  );
  process.exit(1);
}
const text = serializeCorpus(
  generateSplit("heldout-de", HELDOUT_DE_SEED, DEV_PER_CATEGORY, ["de"]),
);
await mkdir(new URL("./heldout-de/", import.meta.url), { recursive: true });
await writeFile(target, text);
console.log(
  `heldout-de.json written, sha256 ${createHash("sha256").update(text).digest("hex")}`,
);
