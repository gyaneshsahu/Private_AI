import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  PAIRS_FILE,
  REVIEW_FILE,
  currentHashes,
  legalTexts,
  pairProblems,
  recordPairs,
  renderReview,
  type PairsRecord,
} from "../scripts/record-legal-pairs";
import { HEALTH_CONSENT } from "../shared/health-consent";

const recorded: PairsRecord = JSON.parse(readFileSync(PAIRS_FILE, "utf8"));
const lf = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

it("every English and German legal text still matches its recorded pair", () => {
  const problems = pairProblems(recorded);
  expect(problems, `\n${problems.join("\n")}\n`).toEqual([]);
});

it("names the language that changed and says the other must be checked and re-recorded", () => {
  const current = currentHashes();
  const changed = (name: string, lang: "en" | "de") => ({
    ...current,
    [name]: { ...current[name], [lang]: "0".repeat(64) },
  });
  const [english] = pairProblems(recorded, changed("imprint", "en"));
  expect(english).toContain("imprint: the English text changed. The German text must be checked");
  expect(english).toContain("node --import tsx scripts/record-legal-pairs.ts");
  const [german] = pairProblems(recorded, changed("policy.privatemode", "de"));
  expect(german).toContain("policy.privatemode: the German text changed. The English text must be checked");
  const both = pairProblems(recorded, { ...current, ageRule: { en: "1", de: "2" } });
  expect(both).toEqual([expect.stringContaining("ageRule: both the English and the German text changed")]);
  const { acceptableUse: _dropped, ...withoutOne } = current;
  expect(pairProblems(recorded, withoutOne)).toEqual([
    expect.stringContaining("acceptableUse: is recorded but no longer exists"),
  ]);
});

it("refuses to record a changed health consent text under the same version", () => {
  const current = currentHashes();
  const older = (version: string): PairsRecord => ({
    ...recorded,
    healthConsentVersion: version,
    texts: { ...recorded.texts, healthConsent: { ...current.healthConsent, de: "0".repeat(64) } },
  });
  expect(() => recordPairs(older(HEALTH_CONSENT.version), current)).toThrow(/HEALTH_CONSENT\.version/);
  expect(recordPairs(older("draft-older"), current).healthConsentVersion).toBe(HEALTH_CONSENT.version);
  // An unchanged consent text records under any version.
  expect(() => recordPairs(recorded, current)).not.toThrow();
});

it("keeps the side-by-side review document current", () => {
  expect(lf(REVIEW_FILE)).toBe(renderReview().replace(/\r\n/g, "\n"));
});

it("keeps the English in the acceptable-use and age drafts identical to their English sources", () => {
  const texts = legalTexts();
  const sourceLines = (path: string, start: string, end: string) => {
    const text = lf(path);
    return text
      .slice(text.indexOf(start), text.indexOf(end))
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));
  };
  for (const line of sourceLines("docs/acceptable-use-draft-20261112.md", "## Text for users", "## Notes for the owner"))
    expect(texts.acceptableUse.en).toContain(line);
  for (const line of sourceLines("docs/age-rule-draft-20261112.md", "## The rule", "## How it is checked"))
    expect(texts.ageRule.en).toContain(line);
});
