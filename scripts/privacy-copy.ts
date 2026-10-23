// Regenerates docs/privacy-copy-20261022.md from shared/privacy-copy.ts so the
// website and the app always carry the same words. Run with:
//   node --import tsx scripts/privacy-copy.ts
import { writeFileSync } from "node:fs";
import { PRIVACY_COPY } from "../shared/privacy-copy";
import { POLICY_DATE, POLICY_SECTIONS } from "../shared/privacy-policy";
import { imprintSections } from "../shared/legal-identity";

export function renderPrivacyMarkdown(): string {
  return (
    "# CometRow privacy statement — 22 October 2026\r\n\r\n" +
    "Generated from `shared/privacy-copy.ts`; the app shows exactly this text and a test keeps this file identical to it. Change the source file together with the behaviour it describes, then regenerate with `node --import tsx scripts/privacy-copy.ts`.\r\n\r\n" +
    PRIVACY_COPY.map(
      (section) => `## ${section.heading}\r\n\r\n${section.text}\r\n`,
    ).join("\r\n")
  );
}

export function renderPolicyMarkdown(): string {
  return (
    `# CometRow privacy policy — ${POLICY_DATE}\r\n\r\n` +
    "Generated from `shared/privacy-policy.ts`, which the app renders as its Privacy policy page; a test keeps this file identical to it. Owner placeholders are stated as not yet named, never invented.\r\n\r\n" +
    POLICY_SECTIONS.map(
      (section) => `## ${section.heading}\r\n\r\n${section.text}\r\n`,
    ).join("\r\n")
  );
}

export function renderImprintMarkdown(): string {
  return (
    "# CometRow imprint (Impressum)\r\n\r\n" +
    'Generated from `deployment/legal-identity.json` through `shared/legal-identity.ts`; the app shows the same text under Settings, Privacy & data. Values reading "not yet named" are owner placeholders; the production candidate build refuses while any remains.\r\n\r\n' +
    imprintSections()
      .map((section) => `## ${section.heading}\r\n\r\n${section.text}\r\n`)
      .join("\r\n")
  );
}

if (process.argv[1]?.endsWith("privacy-copy.ts")) {
  writeFileSync("docs/privacy-copy-20261022.md", renderPrivacyMarkdown());
  writeFileSync("docs/privacy-policy-20261022.md", renderPolicyMarkdown());
  writeFileSync("docs/imprint-20261023.md", renderImprintMarkdown());
}
