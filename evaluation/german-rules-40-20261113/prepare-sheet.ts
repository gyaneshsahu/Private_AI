// Puts runs U, S and G into the three mode slots that make-sheets.ts reads, so all three are graded
// blind on one sheet. Run from the repository root, then make the sheet and record the mapping:
//   npx tsx evaluation/german-rules-40-20261113/prepare-sheet.ts copy
//   $env:BENCH_DIR="evaluation/german-rules-40-20261113"; npx tsx evaluation/blind-benchmark/make-sheets.ts scoring
//   npx tsx evaluation/german-rules-40-20261113/prepare-sheet.ts key
// The answers are copied unchanged except `mode`, which make-sheets checks against the folder.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const LOCAL = ".local/german-rules-40-20261113";
// Slot -> run. The slot names are fixed by make-sheets.ts; every run is Auto.
const SLOTS = { auto: "U", fast: "S", thinking: "G" } as const;

if (process.argv[2] === "copy") {
  for (const [slot, run] of Object.entries(SLOTS)) {
    const from = `${LOCAL}/run-${run}/auto`;
    if (!existsSync(from)) {
      console.log(`run ${run}: none (slot ${slot} stays empty)`);
      continue;
    }
    mkdirSync(`${LOCAL}/ours/${slot}`, { recursive: true });
    const files = readdirSync(from).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const answer = JSON.parse(readFileSync(`${from}/${f}`, "utf8"));
      writeFileSync(`${LOCAL}/ours/${slot}/${f}`, JSON.stringify({ ...answer, mode: slot, run }, null, 2));
    }
    console.log(`run ${run} -> slot ${slot}: ${files.length} answers`);
  }
} else if (process.argv[2] === "key") {
  const key = JSON.parse(readFileSync(`${LOCAL}/key.json`, "utf8"));
  key.slots = Object.fromEntries(
    Object.entries(SLOTS).map(([slot, run]) => [
      slot,
      { U: "U: Answer without checking", S: "S: Search and answer, Goggles off", G: "G: Search and answer, Goggles on" }[run],
    ]),
  );
  writeFileSync(`${LOCAL}/key.json`, JSON.stringify(key, null, 2));
  console.log("key.json: slots recorded", key.slots);
} else throw Error("usage: prepare-sheet.ts copy | key");
