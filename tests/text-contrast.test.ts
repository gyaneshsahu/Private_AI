// UI sweep of 12 November: fixed text colours in the main stylesheet must reach WCAG AA
// (4.5:1) on white; themed colours come from var(--muted) and friends.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const LARGE_OR_DECORATIVE = new Set([".welcome-mark", "h2 em"]); // large headings, 3:1 applies

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

it("keeps fixed text colours in src/styles.css at 4.5:1 or more on white", () => {
  const low: string[] = [];
  let selector = "";
  for (const line of readFileSync("src/styles.css", "utf8").split(/\r?\n/)) {
    if (line.includes("{")) selector = line.replace("{", "").trim();
    const match = /^\s*color:\s*(#[0-9a-fA-F]{6})\s*;/.exec(line);
    if (!match || LARGE_OR_DECORATIVE.has(selector)) continue;
    const ratio = 1.05 / (luminance(match[1]) + 0.05);
    if (ratio < 4.5) low.push(`${selector} ${match[1]} ${ratio.toFixed(2)}`);
  }
  expect(low).toEqual([]);
});
