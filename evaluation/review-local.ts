import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { reviewResult } from "./review-result";
try {
  if (process.argv.length !== 3) throw new Error();
  const file = resolve(process.argv[2]);
  const result = JSON.parse(await readFile(file, "utf8"));
  const permit = JSON.parse(
    await readFile(resolve(dirname(file), "permit.json"), "utf8"),
  );
  console.log(JSON.stringify(reviewResult(result, permit), null, 2));
} catch {
  console.error(
    "Cannot review this result. Provide a result.json path with its original permit.json alongside it. No network request was made.",
  );
  process.exitCode = 1;
}
