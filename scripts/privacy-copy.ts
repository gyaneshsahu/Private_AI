// Regenerates docs/privacy-copy-20261022.md from shared/privacy-copy.ts so the
// website and the app always carry the same words. Run with:
//   node --import tsx scripts/privacy-copy.ts
import { writeFileSync } from "node:fs";
import { PRIVACY_COPY } from "../shared/privacy-copy";

export function renderPrivacyMarkdown(): string {
  return (
    "# CometRow privacy statement — 22 October 2026\r\n\r\n" +
    "Generated from `shared/privacy-copy.ts`; the app shows exactly this text and a test keeps this file identical to it. Change the source file together with the behaviour it describes, then regenerate with `node --import tsx scripts/privacy-copy.ts`.\r\n\r\n" +
    PRIVACY_COPY.map(
      (section) => `## ${section.heading}\r\n\r\n${section.text}\r\n`,
    ).join("\r\n")
  );
}

if (process.argv[1]?.endsWith("privacy-copy.ts"))
  writeFileSync("docs/privacy-copy-20261022.md", renderPrivacyMarkdown());
