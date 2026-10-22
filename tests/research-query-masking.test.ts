import { expect, it } from "vitest";
import {
  createMaskingSession,
  findIdentifiers,
  prepareSearchQuery,
} from "../src/identifier-masking";

it("catches identifiers wrapped across lines or split by invisible characters, and never half-masks them as phones", () => {
  const session = createMaskingSession();
  expect(session.mask("IBAN DE89 3704 0044\n0532 0130 00 bitte")).toBe(
    "IBAN {{IBAN-1}} bitte",
  );
  expect(session.mask("Steuer-ID 86 095\n742 719 angeben")).toBe(
    "Steuer-ID {{TAX-ID-1}} angeben",
  );
  expect(session.mask("Karte 4111 1111\n1111 1111 gesperrt")).toBe(
    "Karte {{CARD-1}} gesperrt",
  );
  expect(session.mask("Mail anna​.weber@example.test heute")).toBe(
    "Mail {{EMAIL-1}} heute",
  );
  // A wrapped IBAN with a broken check digit is not re-reported as a phone number.
  expect(findIdentifiers("IBAN DE89 3704 0044\n0532 0130 01 kaputt")).toEqual(
    [],
  );
  expect(session.summary()).toEqual({
    IBAN: 1,
    "TAX-ID": 1,
    CARD: 1,
    EMAIL: 1,
  });
});

it("prepares a search query by removing identifiers and warning about remaining personal text", () => {
  const prepared = prepareSearchQuery(
    "home office tax rules for DE89 3704 0044 0532 0130 00 Anna Weber 2025",
  );
  expect(prepared.value).toBe(
    "home office tax rules for [bank account removed] Anna Weber 2025",
  );
  expect(prepared.removed).toEqual({ IBAN: 1 });
  expect(prepared.note).toBe(
    "Removed from the search text before approval: 1 bank account.",
  );
  expect(prepared.warning).toBe(true);
  const plain = prepareSearchQuery("library opening hours berlin");
  expect(plain).toEqual({
    value: "library opening hours berlin",
    removed: {},
    note: "",
    warning: false,
  });
  expect(prepareSearchQuery("tracking 1234567890").warning).toBe(true);
  expect(prepareSearchQuery("+49 170 1234567").value).toBe(
    "[phone number removed]",
  );
});
