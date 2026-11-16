// SS-04a: the German page asks for "KONTO LÖSCHEN"; the server takes it as well as the English phrase.
import { describe, expect, it } from "vitest";
import { closureConfirmed } from "../server/account-auth";
import { accountDeletionText } from "../src/text/account";

describe("account deletion phrase", () => {
  it("accepts the English and the German phrase, composed or decomposed, with spaces around", () => {
    expect(closureConfirmed({ confirmation: "DELETE ACCOUNT" }, false)).toBe(true);
    expect(closureConfirmed({ confirmation: "KONTO LÖSCHEN" }, false)).toBe(true);
    expect(closureConfirmed({ confirmation: " KONTO LÖSCHEN " }, false)).toBe(true);
    expect(closureConfirmed({ confirmation: "TESTKONTO LÖSCHEN" }, true)).toBe(true);
    expect(closureConfirmed({ confirmation: "DELETE TEST ACCOUNT" }, true)).toBe(true);
  });
  it("refuses anything else", () => {
    for (const body of [
      { confirmation: "delete account" },
      { confirmation: "KONTO LOESCHEN" },
      { confirmation: "DELETE TEST ACCOUNT" },
      { confirmation: "DELETE ACCOUNT", extra: true },
      { confirmation: 1 },
      {},
      null,
    ])
      expect(closureConfirmed(body, false)).toBe(false);
    expect(closureConfirmed({ confirmation: "DELETE ACCOUNT" }, true)).toBe(false);
  });
  it("the page asks for a phrase the server takes, in each language", () => {
    for (const lang of ["en", "de"] as const) {
      expect(closureConfirmed({ confirmation: accountDeletionText[lang].phrase }, false)).toBe(true);
      expect(closureConfirmed({ confirmation: accountDeletionText[lang].phraseTest }, true)).toBe(true);
    }
  });
});
