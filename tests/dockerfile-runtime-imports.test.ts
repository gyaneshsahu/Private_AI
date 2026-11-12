// The runtime image copies server/ and shared/ plus named files only. A server import of a
// src/ file that the runtime stage does not copy crashes the container at start (CI container
// smoke failures of 12 November: server/research.ts -> src/identifier-masking.ts).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });

/** src/ files reachable from server/ and shared/ code through static and dynamic imports. */
function serverImportsOfSrc(): Set<string> {
  const found = new Set<string>();
  const queue = [...files(join(ROOT, "server")), ...files(join(ROOT, "shared"))];
  const seen = new Set(queue);
  while (queue.length) {
    const file = queue.pop()!;
    const text = readFileSync(file, "utf8");
    // Only runtime imports: `import type` is erased.
    for (const m of text.matchAll(/(?:^|\n)\s*(?:import(?!\s+type\b)[^'"]*?from\s*|import\s*\(\s*|export\s+[^'"]*?from\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const target = resolve(dirname(file), m[1]).replace(/(\.ts)?$/, ".ts");
      const rel = relative(ROOT, target).replace(/\\/g, "/");
      if (!rel.startsWith("src/")) continue;
      found.add(rel);
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return found;
}

it("the runtime image contains every src/ file the server imports", () => {
  const dockerfile = readFileSync(join(ROOT, "Dockerfile"), "utf8");
  const runtime = dockerfile.slice(dockerfile.lastIndexOf("\nFROM "));
  const copied = (rel: string) =>
    runtime.includes(`/app/${rel} `) || runtime.includes(`/app/src ./src`) || runtime.includes(` ${rel} `);
  const missing = [...serverImportsOfSrc()].filter((rel) => !copied(rel));
  expect(missing).toEqual([]);
  expect(serverImportsOfSrc()).toContain("src/identifier-masking.ts");
});
