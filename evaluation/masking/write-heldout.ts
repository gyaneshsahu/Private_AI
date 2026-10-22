/**
 * Writes the locked held-out split ONCE, before any detector tuning, and
 * prints its SHA-256. It refuses to overwrite an existing file: the split is
 * locked, and regenerating it after the generator changed would silently
 * produce a different set. Nothing else may read the file except
 * `evaluate-heldout.ts`.
 * Usage: npx tsx evaluation/masking/write-heldout.ts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DEV_PER_CATEGORY, generateSplit, serializeCorpus } from "./corpus";

const HELDOUT_SEED = 977310442;
const target = new URL("./heldout/heldout.json", import.meta.url);
if (existsSync(target)) {
  console.error(
    `${fileURLToPath(target)} already exists; the held-out split is locked and is never regenerated.`,
  );
  process.exit(1);
}
const text = serializeCorpus(
  generateSplit("heldout", HELDOUT_SEED, DEV_PER_CATEGORY),
);
await mkdir(new URL("./heldout/", import.meta.url), { recursive: true });
await writeFile(target, text);
console.log(
  `heldout.json written, sha256 ${createHash("sha256").update(text).digest("hex")}`,
);
