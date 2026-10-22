/**
 * Writes the development split (`evaluation/masking/dev/dev.json`). This is
 * the only split used for tuning `src/identifier-masking.ts`.
 * Usage: npx tsx evaluation/masking/generate-dev.ts
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  DEV_PER_CATEGORY,
  DEV_SEED,
  generateSplit,
  serializeCorpus,
} from "./corpus";

const text = serializeCorpus(generateSplit("dev", DEV_SEED, DEV_PER_CATEGORY));
const dir = new URL("./dev/", import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL("dev.json", dir), text);
console.log(
  `dev.json written, sha256 ${createHash("sha256").update(text).digest("hex")}`,
);
