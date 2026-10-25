import { expect, it } from "vitest";
import {
  createMaskingSession,
  describeKept,
  findIdentifiers,
  isValidCardNumber,
  isValidGermanTaxId,
  isValidIban,
  prepareSearchQuery,
} from "../src/identifier-masking";

it("validates bank, card and tax identifiers by their check digits", () => {
  expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
  expect(isValidIban("DE89 3704 0044 0532 0130 01")).toBe(false);
  expect(isValidIban("GB82WEST12345698765432")).toBe(true);
  expect(isValidCardNumber("4111 1111 1111 1111")).toBe(true);
  expect(isValidCardNumber("4111 1111 1111 1112")).toBe(false);
  expect(isValidGermanTaxId("86095742719")).toBe(true);
  expect(isValidGermanTaxId("86095742718")).toBe(false);
  expect(isValidGermanTaxId("12345678901")).toBe(false);
});

it("finds identifiers and leaves ordinary numbers, money and dates alone", () => {
  const text =
    "Name Anna Weber, Steuer-ID 86 095 742 719, IBAN DE89 3704 0044 0532 0130 00, " +
    "Tel. +49 170 1234567, mail anna.weber@example.test, geboren am 03.05.1988. " +
    "Income 52.400 € in 2025, 180 days at home, invoice 2024-11-30, call 112.";
  const kinds = findIdentifiers(text).map((hit) => [hit.kind, hit.value]);
  expect(kinds).toEqual([
    ["TAX-ID", "86 095 742 719"],
    ["IBAN", "DE89 3704 0044 0532 0130 00"],
    ["PHONE", "+49 170 1234567"],
    ["EMAIL", "anna.weber@example.test"],
    ["BIRTH-DATE", "03.05.1988"],
  ]);
  expect(findIdentifiers("Revenue was 52.400 in 2025 and 180 days.")).toEqual(
    [],
  );
  expect(findIdentifiers("Deadline 2024-11-30, meeting 12.01.2026.")).toEqual(
    [],
  );
  expect(findIdentifiers("Order 4111111111111111 arrived.")).toEqual([
    expect.objectContaining({ kind: "CARD" }),
  ]);
  expect(findIdentifiers("Reisepass Nr. C01X00T47 ausgestellt 2020.")).toEqual([
    expect.objectContaining({ kind: "ID-NUMBER", value: "C01X00T47" }),
  ]);
  expect(findIdentifiers("Code C01X00T47 without a label.")).toEqual([]);
  expect(findIdentifiers("Rentenversicherung 65 170839 J 008")).toEqual([
    expect.objectContaining({ kind: "INSURANCE" }),
  ]);
  expect(findIdentifiers("Steuernummer 12/345/67890 bitte angeben.")).toEqual([
    expect.objectContaining({ kind: "TAX-ID", value: "12/345/67890" }),
  ]);
});

it("masks with stable placeholders, restores them, and reports what was kept", () => {
  const session = createMaskingSession();
  const masked = session.mask(
    "My IBAN is DE89 3704 0044 0532 0130 00 and my phone +49 170 1234567; again DE89370400440532013000.",
  );
  expect(masked).toBe(
    "My IBAN is {{IBAN-1}} and my phone {{PHONE-1}}; again {{IBAN-1}}.",
  );
  expect(session.mask("Phone +49 170 1234567 and tax 86095742719")).toBe(
    "Phone {{PHONE-1}} and tax {{TAX-ID-1}}",
  );
  expect(
    session.restore(
      "Transfer to {{IBAN-1}} from {{PHONE-1}}; unknown {{IBAN-9}} stays.",
    ),
  ).toBe(
    "Transfer to DE89 3704 0044 0532 0130 00 from +49 170 1234567; unknown {{IBAN-9}} stays.",
  );
  expect(session.summary()).toEqual({ IBAN: 1, PHONE: 1, "TAX-ID": 1 });
  expect(describeKept(session.summary())).toBe(
    "Kept on this device: 1 bank account, 1 tax number, 1 phone number.",
  );
  expect(describeKept({ EMAIL: 2, PHONE: 3, "BIRTH-DATE": 1 })).toBe(
    "Kept on this device: 2 email addresses, 3 phone numbers, 1 date of birth.",
  );
  expect(describeKept({})).toBe("");
});

it("restores placeholders split across streamed chunks without delaying ordinary text", () => {
  const session = createMaskingSession();
  session.mask("DE89 3704 0044 0532 0130 00");
  const out: string[] = [];
  const stream = session.streamRestore((text) => out.push(text));
  stream.push("Send it to {{IB");
  expect(out.join("")).toBe("Send it to ");
  stream.push("AN-1}} tod");
  expect(out.join("")).toBe("Send it to DE89 3704 0044 0532 0130 00 tod");
  stream.push("ay {");
  expect(out.join("")).toBe("Send it to DE89 3704 0044 0532 0130 00 today ");
  stream.push("x} done");
  stream.flush();
  expect(out.join("")).toBe(
    "Send it to DE89 3704 0044 0532 0130 00 today {x} done",
  );
  const long = session.streamRestore((text) => out.push(text));
  out.length = 0;
  long.push("{{not a placeholder at all, just braces that keep going on");
  expect(out.join("")).toBe(
    "{{not a placeholder at all, just braces that keep going on",
  );
});

it("covers the layouts added by the 23 October masking benchmark (synthetic values)", () => {
  const kinds = (text: string) =>
    findIdentifiers(text).map((hit) => [hit.kind, hit.value]);
  // Bank details typed in a chat, padded in a table, and after a sentence
  // whose words once swallowed the IBAN candidate.
  expect(kinds("hier: at350799452832870572 danke")).toEqual([
    ["IBAN", "at350799452832870572"],
  ]);
  expect(kinds("IBAN  DE89  3704  0044  0532  0130  00")).toEqual([
    ["IBAN", "DE89  3704  0044  0532  0130  00"],
  ]);
  expect(
    kinds("The refund will be paid to IBAN DE89 3704 0044 0532 0130 00."),
  ).toEqual([["IBAN", "DE89 3704 0044 0532 0130 00"]]);
  // Two capital letters before digits that are not a country code no longer hide a phone.
  expect(kinds("Steuer-ID\n48933726019\nTelefon\n0179/0450221")).toEqual([
    ["TAX-ID", "48933726019"],
    ["PHONE", "0179/0450221"],
  ]);
  // Insurance and tax numbers with check digits, and labelled Steuernummer forms.
  expect(kinds("Versichertennummer: D337858940")).toEqual([
    ["INSURANCE", "D337858940"],
  ]);
  expect(kinds("Versicherten-Nr. D33785894O")).toEqual([
    ["INSURANCE", "D33785894O"],
  ]);
  expect(kinds("SV-Nummer 19 100966 N 438")).toEqual([
    ["INSURANCE", "19 100966 N 438"],
  ]);
  expect(kinds("USt-IdNr. DE408491162")).toEqual([["TAX-ID", "DE408491162"]]);
  expect(kinds("Steuernummer 13616/24073")).toEqual([
    ["TAX-ID", "13616/24073"],
  ]);
  expect(kinds("Tax number: 5960679280272")).toEqual([
    ["TAX-ID", "5960679280272"],
  ]);
  // Birth dates: month names, CV star, question on the line above, table header.
  expect(kinds("DOB: 4 March 1975")).toEqual([["BIRTH-DATE", "4 March 1975"]]);
  expect(kinds("* 14. April 2003 in Konstanz")).toEqual([
    ["BIRTH-DATE", "14. April 2003"],
  ]);
  expect(
    kinds("Agent: Can you confirm your date of birth?\nCustomer: 02/03/1989"),
  ).toEqual([["BIRTH-DATE", "02/03/1989"]]);
  expect(
    kinds(
      "Name\tStart date\tDate of birth\nSophie Hughes\t16/03/2025\tJuly 10, 1988",
    ),
  ).toEqual([["BIRTH-DATE", "July 10, 1988"]]);
  // Document numbers: digits-only passport under its label, machine-readable zone.
  expect(kinds("Passport number\n339465800")).toEqual([
    ["ID-NUMBER", "339465800"],
  ]);
  expect(kinds("IDD<<T22000129<<<<<<<<<<<<<<<<")).toEqual([
    ["ID-NUMBER", "IDD<<T22000129<<<<<<<<<<<<<<<<"],
  ]);
  expect(kinds("Kontakt: laura.hartmann(at)example.net")).toEqual([
    ["EMAIL", "laura.hartmann(at)example.net"],
  ]);
  expect(kinds("Customer: 0172 0430643")).toEqual([["PHONE", "0172 0430643"]]);
  // Precision: order numbers, EAN codes, customer and staff numbers, version
  // strings and package scopes are not identifiers.
  expect(
    kinds(
      "Order 148-4851390-0967810, EAN 4085613353322 and card 4681863961825519",
    ),
  ).toEqual([["CARD", "4681863961825519"]]);
  expect(kinds("Kundennummer: 0397200432  Personalnummer: 00086762")).toEqual(
    [],
  );
  expect(
    kinds("rounding +0.0163552 uncertainty; pinned @zip.js/zip.js 2.24.0"),
  ).toEqual([]);
});

it("restores loosely echoed placeholders only when they normalise to a kept one", () => {
  const session = createMaskingSession();
  expect(
    session.mask("IBAN DE89 3704 0044 0532 0130 00, tax 86095742719"),
  ).toBe("IBAN {{IBAN-1}}, tax {{TAX-ID-1}}");
  const iban = "DE89 3704 0044 0532 0130 00";
  for (const variant of [
    "{{iban-1}}",
    "{{ IBAN - 1 }}",
    "{{IBAN-01}}",
    "{{IBAN-1}",
    "{IBAN-1}}",
  ])
    expect(session.restore(`to ${variant}.`), variant).toBe(`to ${iban}.`);
  expect(session.restore("{{Tax - Id-1}}")).toBe("86095742719");
  for (const untouched of [
    "{IBAN-1}",
    "IBAN-1",
    "{{iban-9}}",
    "{{CARD-1}}",
    "{{IBAN 1}}",
  ])
    expect(session.restore(untouched), untouched).toBe(untouched);
});

it("never restores inside link targets, image sources, autolinks, bare URLs or reference definitions", () => {
  const session = createMaskingSession();
  session.mask("DE89 3704 0044 0532 0130 00 anna@example.test");
  const iban = "DE89 3704 0044 0532 0130 00";
  for (const placeholder of ["{{IBAN-1}}", "{{ iban-1 }"]) {
    for (const text of [
      `[pay](https://bank.example/?iban=${placeholder})`,
      `![chart](https://img.example/${placeholder}.png)`,
      `<https://bank.example/${placeholder}>`,
      `see https://bank.example/a?b=${placeholder} now`,
      `www.bank.example/${placeholder}`,
      `[1]: https://bank.example/${placeholder}`,
    ])
      expect(session.restore(text), text).toBe(text);
  }
  expect(session.restore("<{{EMAIL-1}}>")).toBe("<{{EMAIL-1}}>");
  // Link text is shown, not followed, so it is restored; the target is not.
  expect(
    session.restore(
      "[{{IBAN-1}}](https://bank.example/{{IBAN-1}}) and {{IBAN-1}}",
    ),
  ).toBe(`[${iban}](https://bank.example/{{IBAN-1}}) and ${iban}`);
});

it("keeps URL context across streamed chunks and holds single-brace forms until they close", () => {
  const session = createMaskingSession();
  session.mask("DE89 3704 0044 0532 0130 00");
  const iban = "DE89 3704 0044 0532 0130 00";
  const out: string[] = [];
  const stream = session.streamRestore((text) => out.push(text));
  stream.push("Open htt");
  stream.push("ps://bank.example/?q={{IB");
  stream.push("AN-1}} and {IBAN-1");
  expect(out.join("")).toBe("Open https://bank.example/?q={{IBAN-1}} and ");
  stream.push("}} done ![x](");
  stream.push("https://img.example/{{IBAN-1}}.png)");
  stream.flush();
  expect(out.join("")).toBe(
    `Open https://bank.example/?q={{IBAN-1}} and ${iban} done ![x](https://img.example/{{IBAN-1}}.png)`,
  );
});

it("treats letters with umlauts and ß as word characters at identifier edges", () => {
  // ASCII  saw "Ö" as a non-letter, so names starting with an umlaut raised no warning.
  expect(prepareSearchQuery("Öztürk Ünal Steuer").warning).toBe(true);
  // Digits glued to a word are part of that word, whether the letter is ASCII or not.
  for (const glued of ["gross86095742719", "groß86095742719"])
    expect(findIdentifiers(glued), glued).toEqual([]);
  expect(findIdentifiers("groß 86095742719").map((hit) => hit.kind)).toEqual([
    "TAX-ID",
  ]);
});
