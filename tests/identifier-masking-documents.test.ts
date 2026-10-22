/**
 * Miss-rate record for the on-device identifier detector on text as the
 * attachment extractors actually hand it over (pdfjs joins text items with a
 * newline at each end-of-line, DOCX paragraphs become lines, tesseract OCR
 * confuses O/0 and l/1). Every assertion below pins the CURRENT behaviour of
 * `src/identifier-masking.ts`, hit or miss, so the file is a truthful record
 * rather than a wish list. Tests whose name carries `[known miss]` document a
 * gap; when the detector is improved, those assertions are expected to fail
 * and must be rewritten, not deleted. The ledger note that interprets these
 * results lives in docs/ledger-fragments/2026-10-22-masking-miss-rate.md.
 */
import { describe, expect, it } from "vitest";
import {
  createMaskingSession,
  findIdentifiers,
} from "../src/identifier-masking";

const hits = (text: string) =>
  findIdentifiers(text).map((hit) => [hit.kind, hit.value]);
const mask = (text: string) => createMaskingSession().mask(text);

describe("German tax receipt (PDF text layer)", () => {
  // pdfjs emits "\n" after a text item with hasEOL, so a tax ID that the
  // layout engine wrapped lands on two lines; the groups keep their spaces.
  const receipt =
    "Finanzamt Berlin-Mitte\n" +
    "Bescheinigung über gezahlte Steuern\n" +
    "Steuerpflichtige: Anna Weber\n" +
    "Steuer-ID: 86 095\n742 719\n" +
    "Steuernummer: 12/345/67890\n" +
    "Veranlagungszeitraum 2025\n" +
    "Festgesetzte Einkommensteuer 4.812,00 EUR\n";

  it("masks the formatted Steuernummer on its own line", () => {
    expect(hits(receipt)).toContainEqual(["TAX-ID", "12/345/67890"]);
    expect(mask(receipt)).toContain("Steuernummer: {{TAX-ID-1}}\n");
  });

  it("[known miss] leaves the tax ID split across a line break in clear text", () => {
    expect(hits(receipt)).toEqual([["TAX-ID", "12/345/67890"]]);
    expect(mask(receipt)).toContain("Steuer-ID: 86 095\n742 719\n");
  });

  it("masks the same tax ID when its groups stay on one line", () => {
    const line = "Identifikationsnummer 86 095 742 719 (Steuer-ID)";
    expect(hits(line)).toEqual([["TAX-ID", "86 095 742 719"]]);
    expect(mask(line)).toBe("Identifikationsnummer {{TAX-ID-1}} (Steuer-ID)");
  });
});

describe("IBAN in a wrapped bank-details block", () => {
  it("[known miss] IBAN wrapped mid-number at a line end: no IBAN hit, a partial PHONE mislabel leaks the rest", () => {
    const text =
      "Bankverbindung\nIBAN: DE89 3704 0044 0532\n0130 00\nBIC: COBADEFFXXX\n";
    // The IBAN pattern stops at the newline and the truncated candidate fails
    // mod-97; the phone detector then grabs the "0044 0532" fragment.
    expect(hits(text)).toEqual([["PHONE", "0044 0532"]]);
    expect(mask(text)).toBe(
      "Bankverbindung\nIBAN: DE89 3704 {{PHONE-1}}\n0130 00\nBIC: COBADEFFXXX\n",
    );
  });

  it("[known miss] IBAN with the country code separated by a newline: no IBAN hit, PHONE mislabel leaks the prefix", () => {
    const text = "Konto DE\n89 3704 0044 0532 0130 00 bei der Commerzbank\n";
    expect(hits(text)).toEqual([["PHONE", "0044 0532 0130 00"]]);
    expect(mask(text)).toBe(
      "Konto DE\n89 3704 {{PHONE-1}} bei der Commerzbank\n",
    );
  });
});

describe("card numbers", () => {
  it("masks a Luhn-valid card number written with dashes", () => {
    const text = "Kartennummer 4111-1111-1111-1111 gültig bis 12/27";
    expect(hits(text)).toEqual([["CARD", "4111-1111-1111-1111"]]);
    expect(mask(text)).toBe("Kartennummer {{CARD-1}} gültig bis 12/27");
  });

  it("[known miss] fullwidth digits (U+FF10-FF19) are not digits to the detector", () => {
    const text = "Kartennummer ４１１１ １１１１ １１１１ １１１１ gültig bis 12/27";
    expect(hits(text)).toEqual([]);
    expect(mask(text)).toBe(text);
  });

  it("[known miss] Arabic-Indic digits (U+0660-0669) are not digits to the detector", () => {
    const text = "Kartennummer ٤١١١ ١١١١ ١١١١ ١١١١ gültig bis 12/27";
    expect(hits(text)).toEqual([]);
    expect(mask(text)).toBe(text);
  });
});

describe("phone number layouts common in German documents", () => {
  it("masks 0170/1234567", () => {
    expect(hits("Mobil: 0170/1234567")).toEqual([["PHONE", "0170/1234567"]]);
    expect(mask("Mobil: 0170/1234567")).toBe("Mobil: {{PHONE-1}}");
  });

  it("masks (030) 123 45 67, leaving the opening parenthesis outside the placeholder", () => {
    // All digits are hidden; only the cosmetic "(" stays in the clear text.
    expect(hits("Telefon: (030) 123 45 67")).toEqual([
      ["PHONE", "030) 123 45 67"],
    ]);
    expect(mask("Telefon: (030) 123 45 67")).toBe("Telefon: ({{PHONE-1}}");
  });

  it("masks +49 (0) 30 1234567", () => {
    expect(hits("Tel. +49 (0) 30 1234567")).toEqual([
      ["PHONE", "+49 (0) 30 1234567"],
    ]);
    expect(mask("Tel. +49 (0) 30 1234567")).toBe("Tel. {{PHONE-1}}");
  });

  it("masks 0049 30 1234567", () => {
    expect(hits("Fax 0049 30 1234567")).toEqual([
      ["PHONE", "0049 30 1234567"],
    ]);
    expect(mask("Fax 0049 30 1234567")).toBe("Fax {{PHONE-1}}");
  });
});

describe("partial and spelled-out identifiers", () => {
  it("[known miss] last four digits of a card or account are left in clear text (by design: too short to recognise)", () => {
    const card = "Zahlung mit der Karte, die auf 1111 endet (**** **** **** 1111)";
    const account = "Konto endet auf 3000; Telefon endet auf 4567";
    expect(hits(card)).toEqual([]);
    expect(hits(account)).toEqual([]);
    expect(mask(card)).toBe(card);
    expect(mask(account)).toBe(account);
  });

  it("[known miss] numbers written as words are not recognised (by design)", () => {
    const phone =
      "Rufnummer: null eins sieben null eins zwei drei vier fünf sechs sieben";
    const iban =
      "IBAN: D E acht neun drei sieben null vier null null vier vier null fünf drei zwei null eins drei null null null";
    expect(hits(phone)).toEqual([]);
    expect(hits(iban)).toEqual([]);
    expect(mask(phone)).toBe(phone);
    expect(mask(iban)).toBe(iban);
  });
});

describe("email with a zero-width space (copied from HTML or a PDF text layer)", () => {
  it("[known miss] ZWSP inside the local part: only the tail after the ZWSP is masked, the first name leaks", () => {
    const text = "E-Mail: anna​.weber@example.test";
    expect(hits(text)).toEqual([["EMAIL", ".weber@example.test"]]);
    expect(mask(text)).toBe("E-Mail: anna​{{EMAIL-1}}");
  });

  it("[known miss] ZWSP directly before the @: nothing is masked", () => {
    const text = "E-Mail: anna.weber​@example.test";
    expect(hits(text)).toEqual([]);
    expect(mask(text)).toBe(text);
  });
});

describe("labelled document numbers and birth dates across lines", () => {
  it("masks a passport number whose label is on the same line", () => {
    expect(hits("Reisepass-Nr.: C01X00T47")).toEqual([
      ["ID-NUMBER", "C01X00T47"],
    ]);
    expect(mask("Reisepass-Nr.: C01X00T47")).toBe("Reisepass-Nr.: {{ID-NUMBER-1}}");
  });

  it("[known miss] passport number with the label on the previous line is left in clear text", () => {
    const text = "Reisepass\nNr.: C01X00T47\nGültig bis 04.03.2030";
    expect(hits(text)).toEqual([]);
    expect(mask(text)).toBe(text);
  });

  it("masks a birth date whose label is on the same line", () => {
    expect(hits("Geburtsdatum: 03.05.1988")).toEqual([
      ["BIRTH-DATE", "03.05.1988"],
    ]);
    expect(mask("Geburtsdatum: 03.05.1988")).toBe("Geburtsdatum: {{BIRTH-DATE-1}}");
  });

  it("[known miss] birth date with the label two lines above is left in clear text", () => {
    const text = "Geburtsdatum\n\n03.05.1988\nGeburtsort Berlin";
    expect(hits(text)).toEqual([]);
    expect(mask(text)).toBe(text);
  });
});

describe("OCR noise inside an IBAN (tesseract on a scanned letter)", () => {
  it("[known miss] 'O' read for '0': mod-97 fails, PHONE mislabel masks only the tail", () => {
    const text = "IBAN DE89 37O4 0044 0532 0130 00";
    expect(hits(text)).toEqual([["PHONE", "0044 0532 0130 00"]]);
    expect(mask(text)).toBe("IBAN DE89 37O4 {{PHONE-1}}");
  });

  it("[known miss] 'O' for '0' and 'l' for '1': PHONE mislabel masks a fragment, most digits leak", () => {
    const text = "IBAN DE89 37O4 0044 0532 0l30 00";
    expect(hits(text)).toEqual([["PHONE", "0044 0532 0"]]);
    expect(mask(text)).toBe("IBAN DE89 37O4 {{PHONE-1}}l30 00");
  });
});

describe("control block of ordinary numbers", () => {
  it("masks nothing in amounts, dates, invoice numbers, percentages, years and 112", () => {
    const invoice =
      "Rechnung Nr. RE-2026-004711 vom 22.10.2026\n" +
      "Rechnungsnummer 2026004711\n" +
      "Kundennummer 0012345\n" +
      "Leistungszeitraum 01.09.2026 - 30.09.2026\n" +
      "Netto 1.234,56 EUR\n" +
      "USt 19 % 234,57 EUR\n" +
      "Brutto 1.469,13 EUR\n" +
      "Zahlbar bis 2026-11-21, Skonto 2 % innerhalb 10 Tagen\n" +
      "Geschäftsjahr 2025, Gründung 1998, Seite 1 von 2\n" +
      "Im Notfall 112 anrufen; Rentenbeitrag 18,6 %; Hausnummer 14a\n" +
      "Artikel 4711, Menge 1.000 Stück, Preis 0,85 EUR\n";
    expect(hits(invoice)).toEqual([]);
    expect(mask(invoice)).toBe(invoice);
  });
});
