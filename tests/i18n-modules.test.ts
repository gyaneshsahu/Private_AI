// German text from non-React modules: every block is translated, keeps its numbers, and the
// functions that build notes give German with the interface language set to German.
import { afterEach, expect, it, vi } from "vitest";
import { arithmeticText } from "../src/text/arithmetic";
import { chatErrorText } from "../src/text/chat-errors";
import { documentMessage, documentText } from "../src/text/documents";
import { maskingText } from "../src/identifier-masking";
import { photoText } from "../src/text/photo";
import { researchText } from "../src/text/research";
import { vaultText } from "../src/text/vault";
import { voiceText } from "../src/text/voice";
import { imageText } from "../src/text/images";
import { codeText } from "../src/text/code";
import { completenessWarning } from "../src/arithmetic/completeness";
import { describeKept, prepareSearchQuery } from "../src/identifier-masking";
import { topPageNote } from "../src/research-result";
import { calculate } from "../src/calculator";
import { validatePhotoFile } from "../src/photo-capture";
import { decodeVaultBackupContent } from "../src/vault-backup";

afterEach(() => vi.unstubAllGlobals());

const blocks = { arithmeticText, chatErrorText, documentText, maskingText, photoText, researchText, vaultText, voiceText, imageText, codeText };
// Numbers with their separators removed, so 60,000 (English) and 60.000 (German) compare equal.
const numbers = (text: string) => (text.match(/\d[\d.,]*\d|\d/g) ?? []).map((n) => n.replace(/[.,]/g, "")).sort();

it("translates every fixed string and keeps its numbers", () => {
  for (const [name, block] of Object.entries(blocks))
    for (const [key, en] of Object.entries(block.en)) {
      if (typeof en !== "string") continue;
      const de = (block.de as Record<string, unknown>)[key] as string;
      expect(de, `${name}.${key}`).not.toBe(en);
      expect(de, `${name}.${key}`).not.toMatch(/\b(the|your|please|was|not)\b/i);
      expect(numbers(de), `${name}.${key}`).toEqual(numbers(en));
    }
});

it("keeps numbers in German templates", () => {
  expect(vaultText.de.backupMaximum(100)).toContain("100");
  expect(documentText.de.readingPage(3, 12)).toBe("Seite 3 von 12 wird auf diesem Gerät gelesen…");
  expect(documentText.de.ocrWarning(87)).toContain("87 %");
});

it("builds the arithmetic and kept-on-device notes in German and leaves English as it was", () => {
  expect(completenessWarning(["tax", "gross"], "de")).toBe(
    "Diese Antwort nennt möglicherweise nicht jede Zahl, nach der Sie gefragt haben. Nicht genannt: Steuer und Bruttobetrag. Bitte prüfen Sie das, bevor Sie sich darauf verlassen.",
  );
  expect(completenessWarning(["tax", "gross"], "en")).toBe(
    "This answer may not state every figure you asked for: missing tax and gross amount. Please check before you rely on it.",
  );
  expect(describeKept({ IBAN: 1, PHONE: 2, EMAIL: 3 }, "de")).toBe(
    "Auf diesem Gerät behalten: 1 Bankkonto, 3 E-Mail-Adressen, 2 Telefonnummern.",
  );
  expect(describeKept({ IBAN: 2, EMAIL: 1 }, "en")).toBe("Kept on this device: 2 bank accounts, 1 email address.");
  const prepared = prepareSearchQuery("Kontostand DE89370400440532013000 Gebühren", "de");
  expect(prepared.note).toBe("Vor der Freigabe aus dem Suchtext entfernt: 1 Bankkonto.");
  // The search text itself goes to the provider and keeps its English label.
  expect(prepared.value).toContain("[bank account removed]");
});

it("explains the top result page in German", () => {
  const note = topPageNote({ sources: [], topPage: { url: "https://example.org/a?b=1", outcome: "failed" } }, "de");
  expect(note).toBe(
    "Der oberste Treffer (example.org) konnte nicht geöffnet werden. Die Antwort nutzt nur die Auszüge aus der Suche.",
  );
});

it("turns worker messages into German and passes unknown text through", () => {
  expect(documentMessage(documentText.en.docxMacros, "de")).toBe(documentText.de.docxMacros);
  expect(documentMessage("Reading page 2 of 9 locally…", "de")).toBe("Seite 2 von 9 wird auf diesem Gerät gelesen…");
  expect(documentMessage("Reading screenshot locally: 40%", "de")).toBe("Screenshot wird auf diesem Gerät gelesen: 40 %");
  expect(documentMessage(documentText.en.ocrWarning(91), "de")).toBe(documentText.de.ocrWarning(91));
  expect(documentMessage("Something else.", "de")).toBe("Something else.");
  expect(documentMessage(documentText.en.docxMacros, "en")).toBe(documentText.en.docxMacros);
});

it("throws German errors when the browser language is German", async () => {
  vi.stubGlobal("navigator", { languages: ["de-DE"], language: "de-DE" });
  expect(() => calculate("1", "/", "0")).toThrow("Durch null kann nicht geteilt werden.");
  expect(validatePhotoFile({ type: "image/png", size: 0 }, new Uint8Array())).toBe("Die gewählte Datei ist leer.");
  await expect(decodeVaultBackupContent("{}", "short")).rejects.toThrow("Ungültige Passphrase für die Sicherung.");
  vi.stubGlobal("navigator", { languages: ["en-GB"], language: "en-GB" });
  expect(() => calculate("1", "/", "0")).toThrow("Cannot divide by zero.");
});
