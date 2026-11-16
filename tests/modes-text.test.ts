// Wording rules for Secure and Secure Max (docs/product-modes-20261116.md section 4, owner's red
// line of 16 November): "cannot read" is said only about Secure Max, and Secure texts never use
// the words that would imply nobody else can read the content.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MAX_DIFFERENCES, modesText, SECTION_4_KEYS } from "../src/text/modes";
import { canvasText } from "../src/text/canvas";
import { memoryText } from "../src/text/memory";
import { forStorage, modeCopyText, type Storage } from "../src/text/mode-copy";
import { projectText } from "../src/text/projects";
import { savedListText } from "../src/text/saved-list";
import { scheduledText } from "../src/text/scheduled";
import { syncText } from "../src/text/sync";
import { syncFilesText } from "../src/text/sync-files";
import { appText } from "../src/text/app";
import { FILE_LIMIT, SCREENSHOT_LIMIT } from "../src/attachment-limits";
import { MAX_PDF_PAGES } from "../src/document-formats";

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

// Texts per storage mode (src/text/mode-copy.ts, docs/secure-copy-draft-20261116.md): what each
// component shows for "local" (the device vault, production today), "secure" and "max".
type Block = Record<string, unknown>;
const STORAGE_MODULES: Record<string, { en: Block; de: Block }> = {
  memoryText,
  projectText,
  canvasText,
  scheduledText,
  savedListText,
  syncFilesText,
};
const MODE_KEY = /_(secure|max|pictures)$/;
// Shown in Secure must never say the data is only here, unreadable by us, or end-to-end protected.
const BANNED_IN_SECURE =
  /only on this device|this device['’]s|server stores none|cannot read|can['’]t read|never can|we never|(stored|kept|saved) (only )?(on|in) (this device|your encrypted vault)|(deleted|removed) from this device|nicht lesen|nur auf diesem Gerät|dieses Geräts|speichert keine|wir nie|auf diesem Gerät gespeichert|von diesem Gerät (gelöscht|entfernt)|verschlüsselten Tresor|vault|Tresor|\bnobody\b|\bniemand\b|only you|nur Sie|end[- ]to[- ]end|ende[- ]zu[- ]ende/i;
// Keys checked by hand, with the reason they are true or not shown with Secure on.
const EXEMPT_IN_SECURE: Record<string, string> = {
  "projectText.locked": "not rendered anywhere",
  "scheduledText.consentBody": "end to end means the way to the AI; the Secure storage sentence is an owner question in docs/secure-copy-draft-20261116.md",
};
/** Every text a block shows in one mode, functions called with sample arguments. */
function shown(block: Block, storage: Storage) {
  const view = forStorage(block, storage);
  return Object.entries(view)
    .filter(([key]) => !MODE_KEY.test(key))
    .flatMap(([key, value]) => {
      if (typeof value === "string") return [[key, value] as const];
      try {
        const out = (value as (...args: unknown[]) => unknown)("Alpha", 2, 3, "4", "5");
        return typeof out === "string" ? [[key, out] as const] : [];
      } catch {
        return [];
      }
    });
}

it("storage modes: every per-mode key replaces a key of the same kind, in both languages", () => {
  for (const [name, block] of Object.entries(STORAGE_MODULES))
    for (const lang of ["en", "de"] as const) {
      expect(forStorage(block[lang])).toBe(block[lang]);
      for (const [key, value] of Object.entries(block[lang])) {
        if (!MODE_KEY.test(key)) continue;
        const base = key.replace(MODE_KEY, "");
        expect(Object.keys(block[lang]), `${name}.${key}`).toContain(base);
        expect(typeof value, `${name}.${key}`).toBe(typeof block[lang][base]);
      }
    }
  // The texts for files this change did not own are all per mode (or the pictures switch).
  for (const key of Object.keys(modeCopyText.en)) expect(key).toMatch(MODE_KEY);
});

it("storage modes: Secure never claims device-only storage or that we cannot read; only Secure Max says 'cannot read'", () => {
  for (const [name, block] of Object.entries(STORAGE_MODULES))
    for (const lang of ["en", "de"] as const) {
      const hits = shown(block[lang], "secure").filter(([key, text]) => !EXEMPT_IN_SECURE[`${name}.${key}`] && BANNED_IN_SECURE.test(text));
      expect(hits, `secure ${lang} ${name}`).toEqual([]);
      for (const [key, text] of shown(block[lang], "local")) expect(text, `local ${lang} ${name}.${key}`).not.toMatch(CANNOT_READ);
      for (const [key, value] of Object.entries(block[lang]))
        if (typeof value === "string" && CANNOT_READ.test(value)) expect(key, `${lang} ${name}`).toMatch(/_max$/);
    }
  // Settings with Secure on: the sync intro is the account's; the screens after it set up Secure Max.
  for (const lang of ["en", "de"] as const) {
    expect(forStorage(syncText[lang], "secure").offIntro).not.toMatch(BANNED_IN_SECURE);
    expect(forStorage(syncText[lang], "max").explainWhat).toContain("Secure");
    for (const [key, value] of Object.entries(modeCopyText[lang]))
      if (key.endsWith("_secure")) expect(value, `${lang} modeCopyText.${key}`).not.toMatch(BANNED_IN_SECURE);
      else if (CANNOT_READ.test(value)) expect(key).toMatch(/_max$/);
    // The claim is made where it is true.
    expect(forStorage(memoryText[lang], "max").intro).toMatch(CANNOT_READ);
    expect(forStorage(memoryText[lang], "secure").intro).toMatch(/CometRow (holds the key|verwahrt den Schlüssel)/);
  }
  // Secure has no encrypted backup file: the project screen leaves that line out.
  expect(forStorage(projectText.en, "secure").notInBackup).toBe("");
  expect(forStorage(projectText.en, "max").notInBackup).toBe(projectText.en.notInBackup);
});

// Help guides (src/text/app.ts), resolved as App.tsx does: tm("settings") is
// forStorage({ ...appText, ...modeCopyText }, secureOn ? "secure" : "local").
// "read on your device" / "auf Ihrem Gerät gelesen" (files are extracted in the browser) is true in
// every mode and is not on the list, so no exception is needed.
const GUIDE_KEYS = ["guideText", "safetyText", "localOnly"] as const;
const BANNED_IN_SECURE_GUIDE = /this browser|this device|no cloud sync|evaluation|Tresor|diesem Gerät|diesem Browser/i;
const BANNED_IN_LOCAL_GUIDE = /evaluation|synthetic|Erprobung|ausgedacht|synthetisch/i;

it("help guides: true in Secure, and no evaluation wording in the device vault's texts", () => {
  for (const lang of ["en", "de"] as const) {
    const all = { ...appText[lang], ...modeCopyText[lang] };
    const secure = forStorage(all, "secure");
    const local = forStorage(all, "local");
    for (const key of GUIDE_KEYS) {
      expect(secure[key], `secure ${lang}.${key}`).not.toMatch(BANNED_IN_SECURE_GUIDE);
      expect(secure[key], `secure ${lang}.${key}`).not.toMatch(BANNED_IN_SECURE);
      expect(secure[key], `secure ${lang}.${key}`).not.toMatch(CANNOT_READ);
      expect(local[key], `local ${lang}.${key}`).not.toMatch(BANNED_IN_LOCAL_GUIDE);
      expect(local[key], `local ${lang}.${key}`).not.toMatch(/remains (unavailable|gated)|bleibt (gesperrt|nicht verfügbar)/i);
      expect(local[key], `local ${lang}.${key}`).not.toMatch(/—/);
    }
    // Secure gets its own guide; the vault's stays for "local".
    expect(secure.guideText).not.toBe(local.guideText);
    expect(local.guideText).toMatch(/passphrase|Passphrase/);
    // Every `_secure` key in appText replaces a key of the same kind.
    for (const key of Object.keys(appText[lang]).filter((k) => k.endsWith("_secure")))
      expect(typeof appText[lang][key.replace(/_secure$/, "") as keyof (typeof appText)["en"]], `${lang}.${key}`).toBe("string");
  }
  // The limits stated are the code's.
  for (const text of [appText.en.guideText, appText.en.guideText_secure])
    expect(text).toContain(`${FILE_LIMIT} files per chat, up to ${SCREENSHOT_LIMIT} of them pictures`);
  expect(appText.en.guideText).toContain(`up to ${MAX_PDF_PAGES} pages`);
});

it("help guides: the draft for the legal read has every paragraph word for word", () => {
  const doc = readFileSync("docs/secure-copy-draft-20261116.md", "utf8");
  for (const lang of ["en", "de"] as const)
    for (const key of [...GUIDE_KEYS, "guideText_secure"] as const)
      for (const paragraph of appText[lang][key].split("\n\n")) expect(doc, `${lang}.${key}`).toContain(paragraph);
});