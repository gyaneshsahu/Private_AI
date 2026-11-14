// A missing or extra brace in a stylesheet silently switches off every rule after it. Two merges
// of 14 November did exactly that (an unclosed .drop-target rule, then an unclosed media query).
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it.each(["src/chat-design.css", "src/styles.css", "src/print.css"])("%s has balanced braces and never closes more than it opened", (file) => {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  for (const [i, line] of css.split("\n").entries()) {
    depth += (line.match(/{/g)?.length ?? 0) - (line.match(/}/g)?.length ?? 0);
    expect(depth, `line ${i + 1}`).toBeGreaterThanOrEqual(0);
    // No top-level selector may start while a rule is still open (nesting is not used here).
    if (/^\.[a-z]/.test(line)) expect(depth - (line.match(/{/g)?.length ?? 0), `rule opened inside another at line ${i + 1}`).toBe(0);
  }
  expect(depth).toBe(0);
});
