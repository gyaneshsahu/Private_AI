// Wording rules for Secure and Secure Max (docs/product-modes-20261116.md section 4, owner's red
// line of 16 November): "cannot read" is said only about Secure Max, and Secure texts never use
// the words that would imply nobody else can read the content.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MAX_DIFFERENCES, modesText, SECTION_4_KEYS } from "../src/text/modes";

type Key = keyof typeof modesText.en;
const keys = Object.keys(modesText.en) as Key[];
// The key name carries the rule: every Secure Max text starts with "max".
const isMax = (key: string) => key.startsWith("max");
const CANNOT_READ = /can(no|['’])t read|nicht lesen/i;
const FORBIDDEN_IN_SECURE =
  /private|only you|zero[- ]knowledge|end[- ]to[- ]end|privat|nur sie|nur du|ende[- ]zu[- ]ende|niemand|nobody|no one/i;
const text = (lang: "en" | "de", key: Key) => {
  const value = modesText[lang][key];
  return typeof value === "function" ? value(modesText[lang].maxResetPhrase) : value;
};

it("has the same keys in both languages, none empty", () => {
  expect(Object.keys(modesText.de).sort()).toEqual([...keys].sort());
  for (const lang of ["en", "de"] as const) for (const key of keys) expect(text(lang, key).trim(), `${lang}.${key}`).not.toBe("");
  expect(MAX_DIFFERENCES).toHaveLength(7);
  for (const key of SECTION_4_KEYS) expect(keys).toContain(key);
});

it("says 'cannot read' only about Secure Max, and never the forbidden words about Secure", () => {
  for (const lang of ["en", "de"] as const)
    for (const key of keys.filter((key) => !isMax(key))) {
      expect(text(lang, key), `${lang}.${key}`).not.toMatch(CANNOT_READ);
      expect(text(lang, key), `${lang}.${key}`).not.toMatch(FORBIDDEN_IN_SECURE);
    }
  // The claim is made, in both languages, in the one line and in the dialog.
  for (const lang of ["en", "de"] as const) {
    expect(modesText[lang].maxLine).toMatch(CANNOT_READ);
    expect(modesText[lang].maxDialogParagraph).toMatch(CANNOT_READ);
  }
  // Secure says who holds the key and that our systems can reach the data.
  expect(modesText.en.secureLong).toContain("can technically access it");
  expect(modesText.de.secureLong).toContain("technisch darauf zugreifen können");
});

it("matches the owner's texts in section 4 word for word", () => {
  const doc = readFileSync("docs/product-modes-20261116.md", "utf8");
  for (const lang of ["en", "de"] as const) for (const key of SECTION_4_KEYS) expect(doc, `${lang}.${key}`).toContain(text(lang, key));
});

it("translates every text except the product names", () => {
  for (const key of keys) if (key !== "maxLabel" && key !== "secureLabel") expect(text("de", key), key).not.toBe(text("en", key));
});
