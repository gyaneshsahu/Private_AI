// Copy audit of 12 November (docs/copy-audit-20261112.md): phrases that promised more than the
// code or the supplier supports must not come back in user-visible text.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const BANNED = [
  "Nothing leaves this device", // photo text is sent when included
  "never holds them", // approved search text passes through our server
  "nothing was run or billed", // no supplier source for the billing claim
  "nothing was billed",
  "destination is verified", // the browser check is partial
  "cannot save the conversation", // saving is allowed since 22 October
  "Temporary research cannot be saved",
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|html)$/.test(name) ? [path] : [];
  });
}

it("keeps the audited overclaims out of the app, shared copy and server pages", () => {
  const hits: string[] = [];
  for (const file of [...files("src"), ...files("shared"), ...files("server"), "index.html"])
    for (const phrase of BANNED)
      if (readFileSync(file, "utf8").replace(/\s+/g, " ").includes(phrase)) hits.push(`${file}: ${phrase}`);
  expect(hits).toEqual([]);
});
