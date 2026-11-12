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
    // Static imports at line start, and dynamic import("...") anywhere in a line.
    for (const m of text.matchAll(/(?:(?:^|\n)\s*(?:import(?!\s+type\b)[^'"]*?from\s*|export\s+[^'"]*?from\s*)|\bimport\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const raw = resolve(dirname(file), m[1]);
      const target = /\.(json|mjs|js)$/.test(raw) ? raw : raw.replace(/(\.ts)?$/, ".ts");
      const rel = relative(ROOT, target).replace(/\\/g, "/");
      // server/ and shared/ are copied whole; anything else (src/, tests/, scripts/ ...) must be
      // named in the runtime stage (13 Nov: server/index.ts imported tests/fixtures/local-tls).
      if (rel.startsWith("server/") || rel.startsWith("shared/") || rel.startsWith("node_modules/")) continue;
      found.add(rel);
      if (target.endsWith(".ts") && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return found;
}

it("the runtime image contains every file outside server/ and shared/ that the server imports", () => {
  const dockerfile = readFileSync(join(ROOT, "Dockerfile"), "utf8");
  const runtime = dockerfile.slice(dockerfile.lastIndexOf("\nFROM "));
  const copied = (rel: string) =>
    runtime.includes(`/app/${rel} `) || runtime.includes(`/app/src ./src`) || runtime.includes(` ${rel} `);
  const missing = [...serverImportsOfSrc()].filter((rel) => !copied(rel));
  expect(missing).toEqual([]);
  expect(serverImportsOfSrc()).toContain("src/identifier-masking.ts");
});
