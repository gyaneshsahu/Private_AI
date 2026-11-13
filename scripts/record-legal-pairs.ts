// Records a SHA-256 of every English and German legal text in shared/legal-text-pairs.json, and
// writes both languages one after the other into docs/legal-texts-side-by-side.md for the owner
// and the lawyer. tests/legal-text-pairs.test.ts fails while any text differs from its record,
// naming the language that changed, so a change to one language gets the other checked. Run:
//   node --import tsx scripts/record-legal-pairs.ts
// Re-record only after checking that both languages still say the same.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Lang } from "../src/i18n";
import { HEALTH_CONSENT, healthConsentCopy, healthConsentText } from "../shared/health-consent";
import { imprintText } from "../shared/legal-identity";
import { privacySummary, privacyText } from "../shared/privacy-copy";
import { privacyPolicyText } from "../shared/privacy-policy";
import { providerDisclosureSection } from "../shared/provider-disclosure";

export const PAIRS_FILE = "shared/legal-text-pairs.json";
export const REVIEW_FILE = "docs/legal-texts-side-by-side.md";
export const RECORD_COMMAND = "node --import tsx scripts/record-legal-pairs.ts";
const DOC_EN = "## English";
const DOC_DE = "## Deutsch (verbindlich)";

export interface Pair {
  en: string;
  de: string;
}
export interface PairsRecord {
  note: string;
  healthConsentVersion: string;
  texts: Record<string, Pair>;
}

/** The text after the heading line `start`, up to the heading line `end` (or the file's end). */
function docSection(path: string, start: string, end?: string): string {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const from = text.indexOf(`\n${start}\n`);
  if (from < 0) throw Error(`${path}: heading "${start}" not found`);
  const body = text.slice(from + start.length + 2);
  if (!end) return body.trim();
  const to = body.indexOf(`\n${end}\n`);
  if (to < 0) throw Error(`${path}: heading "${end}" not found`);
  return body.slice(0, to).trim();
}

/** Every legal text in both languages, by name. */
export function legalTexts(): Record<string, Pair> {
  const both = (text: (lang: Lang) => string): Pair => ({ en: text("en"), de: text("de") });
  const doc = (path: string): Pair => ({
    en: docSection(path, DOC_EN, DOC_DE),
    de: docSection(path, DOC_DE),
  });
  const disclosure = (provider: "tinfoil" | "privatemode") =>
    both((lang) => {
      const section = providerDisclosureSection(provider, lang);
      return `${section.heading}\n${section.text}`;
    });
  return {
    policy: both((lang) => privacyPolicyText(undefined, lang)),
    "policy.tinfoil": both((lang) => privacyPolicyText("tinfoil", lang)),
    "policy.privatemode": both((lang) => privacyPolicyText("privatemode", lang)),
    "privacyCopy.tinfoil": both((lang) => privacyText("tinfoil", lang)),
    "privacyCopy.privatemode": both((lang) => privacyText("privatemode", lang)),
    privacySummary: both(privacySummary),
    healthConsent: both((lang) => {
      const copy = healthConsentCopy(lang);
      return [healthConsentText(lang), copy.accept, copy.decline, copy.declinedNote].join("\n\n");
    }),
    "providerDisclosure.tinfoil": disclosure("tinfoil"),
    "providerDisclosure.privatemode": disclosure("privatemode"),
    imprint: both((lang) => imprintText(undefined, lang)),
    acceptableUse: doc("docs/acceptable-use-de-draft-20261113.md"),
    ageRule: doc("docs/age-rule-de-draft-20261113.md"),
  };
}

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function currentHashes(texts = legalTexts()): Record<string, Pair> {
  return Object.fromEntries(
    Object.entries(texts).map(([name, pair]) => [name, { en: sha256(pair.en), de: sha256(pair.de) }]),
  );
}

/** What differs from the record, one plain sentence per text; empty when everything matches. */
export function pairProblems(recorded: PairsRecord, current = currentHashes()): string[] {
  const problems: string[] = [];
  const then = `then re-record with \`${RECORD_COMMAND}\`.`;
  for (const name of new Set([...Object.keys(recorded.texts), ...Object.keys(current)])) {
    const was = recorded.texts[name];
    const now = current[name];
    if (!was || !now) {
      problems.push(`${name}: ${was ? "is recorded but no longer exists" : "is not recorded yet"}; ${then}`);
      continue;
    }
    const en = was.en !== now.en;
    const de = was.de !== now.de;
    if (en && de)
      problems.push(`${name}: both the English and the German text changed. Check that they still say exactly the same, ${then}`);
    else if (en)
      problems.push(`${name}: the English text changed. The German text must be checked and changed to say the same, ${then}`);
    else if (de)
      problems.push(`${name}: the German text changed. The English text must be checked and changed to say the same, ${then}`);
  }
  if (recorded.healthConsentVersion !== HEALTH_CONSENT.version)
    problems.push(`healthConsent: the version changed from "${recorded.healthConsentVersion}" to "${HEALTH_CONSENT.version}"; ${then}`);
  return problems;
}

/** The new record. Refuses a changed consent text under an unchanged version (it must be asked again). */
export function recordPairs(previous?: PairsRecord, current = currentHashes()): PairsRecord {
  const before = previous?.texts.healthConsent;
  const now = current.healthConsent;
  if (
    previous &&
    before &&
    (before.en !== now.en || before.de !== now.de) &&
    previous.healthConsentVersion === HEALTH_CONSENT.version
  )
    throw Error(
      `The health consent text changed but HEALTH_CONSENT.version is still "${HEALTH_CONSENT.version}". Change the version in shared/health-consent.ts, so consent is asked again, then record.`,
    );
  return {
    note: `SHA-256 of each English and German legal text. tests/legal-text-pairs.test.ts fails when a text no longer matches; check the other language, then re-record with ${RECORD_COMMAND}.`,
    healthConsentVersion: HEALTH_CONSENT.version,
    texts: current,
  };
}

/** Both languages of every in-app text, for reading; the acceptable-use and age drafts are already side by side. */
export function renderReview(texts = legalTexts()): string {
  const markdown = (text: string) =>
    text
      .split("\n\n")
      .map((block) => {
        const [first, ...rest] = block.split("\n");
        return rest.length ? `**${first}**\r\n\r\n${rest.join("\r\n\r\n")}` : first;
      })
      .join("\r\n\r\n");
  const inApp = Object.entries(texts).filter(([name]) => name !== "acceptableUse" && name !== "ageRule");
  return (
    "# CometRow legal texts in English and German (DRAFT German, needs owner approval and a legal read)\r\n\r\n" +
    `Generated by \`${RECORD_COMMAND}\` from the app's source; a test keeps it current. The German text is binding once approved; it must say exactly what the English says. The acceptable-use and age-rule drafts are in \`docs/acceptable-use-de-draft-20261113.md\` and \`docs/age-rule-de-draft-20261113.md\`.\r\n\r\n` +
    inApp
      .map(
        ([name, pair]) =>
          `## ${name}\r\n\r\n### English\r\n\r\n${markdown(pair.en)}\r\n\r\n### Deutsch\r\n\r\n${markdown(pair.de)}\r\n`,
      )
      .join("\r\n")
  );
}

if (process.argv[1]?.endsWith("record-legal-pairs.ts")) {
  const previous: PairsRecord | undefined = existsSync(PAIRS_FILE)
    ? JSON.parse(readFileSync(PAIRS_FILE, "utf8"))
    : undefined;
  const texts = legalTexts();
  writeFileSync(PAIRS_FILE, `${JSON.stringify(recordPairs(previous, currentHashes(texts)), null, 2)}\n`);
  writeFileSync(REVIEW_FILE, renderReview(texts));
  console.log(`Recorded ${Object.keys(texts).length} legal text pairs in ${PAIRS_FILE} and wrote ${REVIEW_FILE}.`);
}
