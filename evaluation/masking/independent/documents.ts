/**
 * Independent masking corpus: hand-written documents, part 1 of 2 (bills,
 * invoices, tax letters, contracts, CVs, medical letters).
 *
 * Every document below was written by hand as literal text for this check.
 * Nothing is generated: no seeded values, no layout templates, no noise
 * model, and nothing is imported from the benchmark generator
 * (`values.ts`, `doc.ts`, `layouts.ts`, `corpus.ts`). All people, companies,
 * addresses and numbers are invented. Check digits of IBANs, card numbers,
 * German tax IDs, VAT IDs and insurance numbers were computed with
 * `check-digits.ts` and pasted in; `tests/masking-independent.test.ts`
 * re-checks every clean value.
 *
 * Markup, removed by `build.ts` in this folder before scoring:
 *   ⟦KIND|value⟧ or ⟦KIND~variant|value⟧
 * Promised kinds: IBAN CARD TAX INS IDN MAIL TEL DOB
 * (TAX-ID, INSURANCE, ID-NUMBER, EMAIL, PHONE, BIRTH-DATE).
 * Not covered, recorded only to count them: NAME ADDR.
 * Ground-truth rules follow the benchmark README so the numbers compare:
 * every value of a promised kind counts whoever it belongs to; a birth date
 * counts wherever a reader would take it as one; machine-readable zones
 * contribute the document number (without its check digit) and the birth
 * date (YYMMDD); card numbers shown only by their last four digits do not
 * count. Variants containing "ocr" or "invalid" are deliberately damaged or
 * incomplete and are exempt from the check-digit test.
 */

export type IndependentCategory =
  | "bill"
  | "invoice"
  | "tax-letter"
  | "contract"
  | "cv"
  | "medical-letter"
  | "bank-statement"
  | "email"
  | "chat"
  | "form"
  | "table"
  | "scan-ocr";

export interface HandDocument {
  id: string;
  category: IndependentCategory;
  /** Short name of the layout; most do not exist in the generator. */
  layout: string;
  language: "de" | "en" | "mixed";
  ocr: boolean;
  /** What is unusual about the document, for the reader of the results. */
  note: string;
  /** Marked-up text; see the header for the markup. */
  marked: string;
}

export const DOCUMENTS_PART_1: HandDocument[] = [
  // ───────────────────────────── bills ─────────────────────────────
  {
    id: "bill-01",
    category: "bill",
    layout: "two-column-utility-bill",
    language: "de",
    ocr: false,
    note: "PDF text extracted with layout preserved: address block on the left, account box on the right, merged line by line.",
    marked: `Stadtwerke Auental GmbH · Postfach 11 20 · 79501 Auental
                                                   Ihre Kundennummer     4410228766
Frau                                               Vertragskonto         200 318 447
⟦NAME|Ruth Abendroth⟧                                     Zählernummer          1ESY 1160 4471 29
⟦ADDR|Kastanienhof 7⟧                                     Rechnungsdatum        14.09.2026
⟦ADDR|79504 Auental⟧                                      Service-Telefon       ⟦TEL|0800 7745 112⟧
                                                   E-Mail ⟦MAIL|kundenservice@stadtwerke-auental.example⟧

Jahresverbrauchsabrechnung Strom 01.08.2025 – 31.07.2026

Zählerstand alt 18.204 kWh   neu 21.377 kWh   Verbrauch 3.173 kWh
Arbeitspreis 3.173 kWh × 31,42 ct = 996,96 €
Grundpreis 365 Tage × 0,4110 € = 150,02 €
Summe netto 1.146,98 €   USt. 19 % 217,93 €   Summe brutto 1.364,91 €
abzüglich Abschläge 11 × 108,00 € = 1.188,00 €
Nachzahlung 176,91 €

Den Betrag buchen wir am 30.09.2026 von Ihrem Konto ⟦IBAN|DE54 7012 0430 8819 3746 50⟧ ab
(Gläubiger-ID DE71ZZZ00000318845, Mandatsreferenz 4410228766-01).
Neuer Abschlag ab Oktober: 118,00 € monatlich.`,
  },
  {
    id: "bill-02",
    category: "bill",
    layout: "itemised-phone-bill",
    language: "en",
    ocr: false,
    note: "Itemised call list: called numbers in four national formats beside times, durations and a premium-rate number.",
    marked: `LOOPLINE MOBILE — Monthly bill
Bill date 03 Sep 2026 · Bill number 7731-0092-4418 · Account 88301744
Hi ⟦NAME|Jonah Feldkamp⟧, here's what you owe for 03 Aug – 02 Sep 2026.

Your number ⟦TEL|+49 1523 7781904⟧        Plan: Loop 20 GB (€19.99)

Itemised calls outside your plan
Date        Time   Number called           Duration  Cost
06/08/2026  18:22  ⟦TEL|+44 20 7946 0731⟧        00:14:09  €2.12
11/08/2026  09:05  ⟦TEL|0221 4710 263⟧             00:03:51  €0.00
19/08/2026  20:47  ⟦TEL|+1 415 555 0147⟧          00:22:30  €3.38
27/08/2026  07:58  ⟦TEL|0900 5 101 202⟧           00:01:12  €2.39 (premium)
Data roaming (CH) 1.2 GB                            €6.00

Total due €33.88 — taken from your card on 10 Sep 2026 (Visa ending 6648).
Questions? Text HELP to 22333 or write to ⟦MAIL|hello@loopline.example⟧.`,
  },
  {
    id: "bill-03",
    category: "bill",
    layout: "municipal-fee-notice-footnotes",
    language: "de",
    ocr: false,
    note: "Footnote markers glued to an IBAN and an amount; contact details and the city's tax number live in the footnotes.",
    marked: `Stadt Auental · Der Oberbürgermeister · Fachbereich 66 – Tiefbau
Gebührenbescheid Abwasser 2026¹

Herrn Dr.
⟦NAME|Bertram Ehlich⟧
⟦ADDR|Am Galgenberg 22
79504 Auental⟧

Kassenzeichen 5.0204.118377.6          Grundstück Flur 3, Flurstück 118/4
Bescheiddatum 02.10.2026

Schmutzwasser 142 m³ × 2,61 € = 370,62 €
Niederschlagswasser 186 m² × 0,74 € = 137,64 €²
Festgesetzt: 508,26 €
Fälligkeit 15.11.2026 und 15.02.2027 je 254,13 €

Bitte überweisen Sie unter Angabe des Kassenzeichens an die Stadtkasse Auental,
⟦IBAN|DE44 1203 0000 9876 1234 05⟧³, oder erteilen Sie uns ein Lastschriftmandat.

__________
¹ Rechtsgrundlage: Abwassersatzung vom 14.12.2021 in der Fassung vom 09.12.2025, § 12 Abs. 3.
² Versiegelte Fläche laut Selbstauskunft vom 21.03.2024; Rückfragen Frau ⟦NAME|Oyelaran⟧, ⟦TEL|07641 910-2234⟧, ⟦MAIL|abwasser@auental.example⟧.
³ Bei Zahlung aus dem Ausland BIC SOLADEST600 angeben. Steuernummer der Stadt ⟦TAX~steuernummer|06/118/00419⟧ (nur für Umsatzsteuerzwecke).`,
  },
  {
    id: "bill-04",
    category: "bill",
    layout: "screenshot-described-as-text",
    language: "en",
    ocr: false,
    note: "A user's description of an app screenshot: values under card headings, a 'Birthday' label, status-bar numbers.",
    marked: `[Screenshot from the Kabelnetz Ost app, sent by ⟦NAME|Priya Raman⟧]
Top bar: 09:14 • 4G • 62 %
Header: My contract — customer no. 300-1187-552 in grey underneath
Card 1 — "Internet 250 + TV Basic"   €44.90 / month, minimum term until 31.03.2027
Card 2 — Payment method
   Direct debit
   ⟦IBAN|DE91 2509 0608 4471 2099 33⟧
   Account holder ⟦NAME|P. Raman⟧
Card 3 — Contact details (tap to edit)
   Mobile   ⟦TEL|+49 176 2290 4418⟧
   Email    ⟦MAIL|priya.raman@inbox.example⟧
   Birthday ⟦DOB|14 Feb 1990⟧
Footer button: "Download bill (PDF, 212 KB)"`,
  },

  // ───────────────────────────── invoices ─────────────────────────────
  {
    id: "invoice-01",
    category: "invoice",
    layout: "craftsman-invoice-three-column-footer",
    language: "de",
    ocr: false,
    note: "Three-column letterhead footer flattened into lines: bank, tax and contact data interleaved.",
    marked: `Malerbetrieb Kranich · ⟦ADDR|Am Mühlbach 3 · 79504 Auental⟧

Familie ⟦NAME|Doğan⟧
⟦ADDR|Weinbergstraße 41
79508 Auental-Oberau⟧

RECHNUNG Nr. 2026-0187                              Datum: 22.09.2026
Ihr Auftrag vom 28.08.2026 / Angebot A-2026-0144    Leistungszeitraum: 08.09.–12.09.2026

Pos  Menge  Einheit  Bezeichnung                                     EP       GP
1    64,5   m²       Wandflächen grundieren, zweimal streichen       8,90     574,05
2    18     lfm      Sockelleisten lackieren                         6,20     111,60
3    1      psch     Abdeckarbeiten, Entsorgung                     85,00      85,00
                                                  Nettobetrag              770,65 €
                                                  19 % MwSt.               146,42 €
                                                  Rechnungsbetrag          917,07 €

Zahlbar innerhalb von 14 Tagen ohne Abzug. Vielen Dank für Ihren Auftrag!

Malerbetrieb Kranich        Volksbank Auental eG                     Inhaber: ⟦NAME|Jonas Kranich⟧
⟦ADDR|Am Mühlbach 3⟧               IBAN ⟦IBAN|DE14 3506 0190 7702 9381 45⟧       Steuernr. ⟦TAX~steuernummer|46/118/30254⟧
⟦ADDR|79504 Auental⟧               BIC GENODE61AUE                          USt-IdNr. ⟦TAX~vat|DE218947360⟧
Tel. ⟦TEL|07641 93 22 18⟧          ⟦MAIL|info@maler-kranich.example⟧              HWK Freiburg, Betriebsnr. 0418823`,
  },
  {
    id: "invoice-02",
    category: "invoice",
    layout: "markdown-invoice-from-notes-app",
    language: "en",
    ocr: false,
    note: "Invoice written in a notes app (Markdown): bold labels, bullets, a spaced VAT ID and a UK sort code and account number (not a promised kind).",
    marked: `# Invoice INV-0042 — ⟦NAME|Saoirse Whelan⟧ Design

**Billed to:** Kettle & Crane GmbH, attn. ⟦NAME|Malte Hinrichsen⟧, ⟦ADDR|Kehrwieder 9, 20457 Hamburg⟧
**Issued:** 1 October 2026 · **Due:** 31 October 2026
**Your VAT ID:** ⟦TAX~vat-spaced|DE 305 172 495⟧ (reverse charge, Art. 196 VAT Directive)

- Brand workshop (2 days) — €2,400.00
- Logo system & guidelines — €3,150.00
- Revisions round 3 (4 h × €95) — €380.00

**Total: €5,930.00** — no VAT charged, reverse charge applies.

### How to pay
- Bank transfer to ⟦IBAN|GB82 MIDL 4005 1572 8391 04⟧ (sort code 40-05-15, account 72839104)
- Or by card via the payment link in the email (ref. INV-0042)

Questions: ⟦TEL|+44 7700 900318⟧ / ⟦MAIL|saoirse@whelan-design.example⟧`,
  },
  {
    id: "invoice-03",
    category: "invoice",
    layout: "marketplace-invoice-bilingual",
    language: "mixed",
    ocr: false,
    note: "Bilingual marketplace invoice: order, invoice, EAN, tracking and parcel-locker numbers as decoys; billing and delivery address side by side.",
    marked: `Rechnung / Invoice
Verkauft von / Sold by: Nordlicht Elektro Handels GmbH, ⟦ADDR|Hafenstraße 12, 26789 Leer⟧
USt-IdNr. / VAT No.: ⟦TAX~vat|DE146729038⟧
Rechnungsnummer: DE-NLE-2026-0418877    Bestellnummer: 302-5518230-7716642
Rechnungsdatum / Lieferdatum: 17.09.2026

Rechnungsadresse / Billing address        Lieferadresse / Delivery address
⟦NAME|Adaeze Okafor⟧                             ⟦NAME|Adaeze Okafor⟧
⟦ADDR|Lindenallee 4⟧                             ⟦ADDR|Packstation 118⟧
⟦ADDR|04109 Leipzig⟧                             ⟦ADDR|04109 Leipzig⟧
                                          Postnummer 41188273
Tel. für Zustellung: ⟦TEL|0341 2290 7713⟧

Artikel                        EAN              Menge  Stückpreis  USt.  Gesamt
USB-C Ladegerät 65 W           4260712839105    1      34,99 €     19 %  34,99 €
Verlängerungskabel 3 m         4250366812744    2       9,49 €     19 %  18,98 €
Versand                                         1       0,00 €            0,00 €
Gesamtbetrag                                                            53,97 €
enthaltene USt. 19 %: 8,62 €

Bezahlt mit Mastercard •••• 9024 am 17.09.2026.
Sendungsnummer: 00340434161094042557`,
  },
  {
    id: "invoice-04",
    category: "invoice",
    layout: "private-medical-invoice",
    language: "de",
    ocr: false,
    note: "Private doctor's invoice (GOÄ): fee-schedule numbers, ICD code and factors as decoys; birth date after 'geb.'; tax number with spaces.",
    marked: `Praxis für Dermatologie · Dr. med. ⟦NAME|Hilke Brodersen⟧ · ⟦ADDR|Rathausmarkt 2, 24937 Flensburg⟧
Privatliquidation

Rechnungsempfänger: ⟦NAME|Henrik Solberg⟧, ⟦ADDR|Norderstraße 61, 24939 Flensburg⟧
Patient: ⟦NAME|Henrik Solberg⟧, geb. ⟦DOB|02.11.1979⟧
Rechnungs-Nr. 26-03318 · Datum 05.10.2026 · Diagnose: L40.0 Psoriasis vulgaris

Datum       GOÄ   Leistung                                Faktor   Betrag
09.09.2026  1     Beratung                                2,3      10,72 €
09.09.2026  5     Symptombezogene Untersuchung            2,3      10,72 €
09.09.2026  750   Auflichtmikroskopie                     2,3      18,77 €
23.09.2026  567   Phototherapie                           1,8      12,59 €
                                                    Summe          52,80 €

Bitte überweisen Sie den Betrag bis zum 04.11.2026 auf ⟦IBAN|DE53 8105 3272 0004 4183 96⟧.
Steuernummer der Praxis: ⟦TAX~steuernummer-spaced|15 294 47021⟧ — ärztliche Heilbehandlung umsatzsteuerfrei nach § 4 Nr. 14 UStG.
Telefon ⟦TEL|0461 31 70 92⟧ · ⟦MAIL|abrechnung@derma-brodersen.example⟧`,
  },

  // ───────────────────────────── tax letters ─────────────────────────────
  {
    id: "tax-01",
    category: "tax-letter",
    layout: "tax-assessment-right-info-box",
    language: "de",
    ocr: false,
    note: "Assessment notice: tax number in a right-hand box, two tax IDs grouped 2-3-3-3, a refund IBAN and a switchboard number ending in -0.",
    marked: `Finanzamt Leipzig II · Postfach 10 01 48 · 04001 Leipzig
⟦NAME|Kofi Mensah⟧ und ⟦NAME|Adaeze Okafor⟧
⟦ADDR|Lindenallee 4
04109 Leipzig⟧
                                        Steuernummer  ⟦TAX~steuernummer|231/250/61834⟧
                                        Datum         18.09.2026
                                        Bei Rückfragen bitte angeben

Bescheid für 2025 über Einkommensteuer, Solidaritätszuschlag und Kirchensteuer

Ehemann/Person A: Identifikationsnummer ⟦TAX~taxid-grouped|26 947 158 321⟧
Ehefrau/Person B: Identifikationsnummer ⟦TAX~taxid-grouped|58 103 794 658⟧

Festsetzung                        Einkommensteuer   Solidaritätszuschlag   Kirchensteuer
festgesetzt werden                 14.872,00 €        0,00 €                 0,00 €
abzüglich Steuerabzug vom Lohn     16.204,00 €        0,00 €                 0,00 €
verbleibende Beträge              -1.332,00 €        0,00 €                 0,00 €

Der Erstattungsbetrag von 1.332,00 € wird auf das Konto ⟦IBAN|DE85 3705 0198 1932 8475 60⟧ überwiesen.

Erläuterungen
Die Aufwendungen für das häusliche Arbeitszimmer (Zeile 44) wurden nur in Höhe der Tagespauschale (210 Tage × 6 €) berücksichtigt.

Rechtsbehelfsbelehrung
Der Bescheid kann mit dem Einspruch angefochten werden. Der Einspruch ist innerhalb eines Monats nach Bekanntgabe schriftlich oder elektronisch einzulegen.
Servicezeiten Mo–Do 8–15 Uhr, Telefon ⟦TEL|0341 559-0⟧`,
  },
  {
    id: "tax-02",
    category: "tax-letter",
    layout: "adviser-letter-english-bullets",
    language: "en",
    ocr: false,
    note: "English letter from a German tax adviser: German terms in brackets, bullet list, an eTIN and contract number as decoys.",
    marked: `Subject: Your 2025 German tax return – what I still need

Dear Mr ⟦NAME|Lindqvist⟧,

thank you for the documents. I have prepared the return under your tax number (Steuernummer) ⟦TAX~steuernummer|21/815/08153⟧ at the Finanzamt Charlottenburg. For the joint assessment I used:

  • your tax identification number (Steuer-ID): ⟦TAX~taxid|31709528671⟧
  • your wife's Steuer-ID: ⟦TAX~taxid|44286019734⟧ (please double-check, the letter you sent is partly cut off)

Three things are still missing:
  1. the Lohnsteuerbescheinigung from your second employer (eTIN LNDQST91K22A7 on the form),
  2. confirmation of the Riester contract no. 0071-554-3920, and
  3. the receipt for the craftsman invoice of 22 September (labour share €612.40).

Refunds go to the account ending 5920 unless you tell me otherwise.

You can reach me on ⟦TEL|030 23125 488⟧ (office) or ⟦TEL|0170 9921 344⟧ (Tuesdays and Thursdays).

Kind regards
⟦NAME|Ingeborg Wachtel⟧
Steuerberaterin · ⟦ADDR|Kantstraße 118, 10627 Berlin⟧
⟦MAIL|i.wachtel@stb-wachtel.example⟧`,
  },
  {
    id: "tax-03",
    category: "tax-letter",
    layout: "e-filing-receipt-pasted",
    language: "de",
    ocr: false,
    note: "Pasted e-filing receipt: 13-digit unified tax number, a French IBAN written without spaces, transfer ticket and timestamps as decoys.",
    marked: `Übermittlungsprotokoll
Einkommensteuererklärung 2025
Transferticket: et3k9m27q1x8p4z
Eingangsdatum: 22.07.2026 14:31:07
Datenübermittler: Mein ELSTER

Steuernummer: ⟦TAX~steuernummer-13|2893081508152⟧
Finanzamt: 2893 Bonn-Außenstadt

Person A
Identifikationsnummer: ⟦TAX~taxid|60139582763⟧
Name: ⟦NAME|Moreau⟧, Vorname: ⟦NAME|Céline⟧
Geburtsdatum: ⟦DOB|12.03.1984⟧
Religion: VD
Anschrift: ⟦ADDR|Königstraße 88, 53115 Bonn⟧

Bankverbindung für Erstattungen
IBAN: ⟦IBAN~compact-foreign|FR9710278060410002038490172⟧
Kontoinhaber: Person A

Angaben zur Kontaktperson
Telefonnummer: ⟦TEL|0228 9128 4470⟧

Hinweis: Bitte bewahren Sie dieses Protokoll auf. Belege nur auf Anforderung einreichen.`,
  },
  {
    id: "tax-04",
    category: "tax-letter",
    layout: "child-benefit-letter-bilingual-table",
    language: "mixed",
    ocr: false,
    note: "Child benefit letter with a bilingual child table (birth dates by column header) and a Polish IBAN; benefit number as decoy.",
    marked: `Familienkasse Sachsen · 09089 Chemnitz
Kindergeld-Nr. 245FK118742
Datum: 03.08.2026

Sehr geehrte Frau ⟦NAME|Nowak-Hessel⟧,

wir haben Ihren Antrag vom 12.07.2026 geprüft. Kindergeld wird für folgende Kinder festgesetzt / Child benefit is granted for:

Kind / Child              geboren am / born   Steuer-ID          ab / from
⟦NAME|Lena Nowak-Hessel⟧         ⟦DOB~table|09.01.2015⟧          ⟦TAX~taxid|18572064313⟧        01/2026
⟦NAME|Jan Nowak-Hessel⟧          ⟦DOB~table|24.06.2018⟧          ⟦TAX~taxid|93651472091⟧        01/2026
⟦NAME|Mila Nowak-Hessel⟧         ⟦DOB~table|30.04.2026⟧          ⟦TAX~taxid|80416293781⟧        04/2026

Die Zahlung erfolgt monatlich auf das Konto ⟦IBAN|PL94 1160 2202 0000 0002 8374 6519⟧ (Kontoinhaberin: ⟦NAME|Agnieszka Nowak-Hessel⟧).
Bitte teilen Sie uns Änderungen sofort mit. Please tell us about changes immediately.

Ihre Steuer-ID: ⟦TAX~taxid|52740936154⟧
Service: ⟦TEL|0800 4 5577 19⟧ (gebührenfrei, Mo–Fr 8–18 Uhr)`,
  },

  // ───────────────────────────── contracts ─────────────────────────────
  {
    id: "contract-01",
    category: "contract",
    layout: "tenancy-agreement-sections",
    language: "de",
    ocr: false,
    note: "Tenancy agreement: parties in running prose, 'geboren am ... in Halle', identity card number, section numbers and amounts as decoys.",
    marked: `Wohnraummietvertrag
zwischen
⟦NAME|Gerd Hollmann⟧, ⟦ADDR|Uferweg 3, 39108 Magdeburg⟧, Tel. ⟦TEL|0391 7340 518⟧, E-Mail ⟦MAIL|gerd.hollmann@posteingang.example⟧
– Vermieter –
und
⟦NAME|Svenja Albers⟧, geboren am ⟦DOB|27.06.1985⟧ in Halle (Saale), Personalausweis-Nr. ⟦IDN|T22L4K0R8⟧,
bisher wohnhaft ⟦ADDR|Merseburger Str. 140, 06110 Halle⟧
– Mieterin –

§ 1 Mietsache
Vermietet wird die Wohnung im 2. OG links des Hauses ⟦ADDR|Hegelstraße 17, 39104 Magdeburg⟧, bestehend aus 3 Zimmern, Küche, Bad, Flur und Balkon, ca. 74,5 m², sowie Kellerabteil Nr. 7.

§ 3 Miete
(1) Die Grundmiete beträgt monatlich 612,00 €, die Vorauszahlung auf Betriebskosten 185,00 €, zusammen 797,00 €.
(2) Die Miete ist bis zum dritten Werktag eines jeden Monats auf das Konto des Vermieters ⟦IBAN|DE24 2905 0000 3318 4759 20⟧ zu zahlen.

§ 5 Mietsicherheit
Die Mieterin leistet eine Kaution von 1.836,00 € (drei Grundmieten) in drei Raten; die erste Rate ist zu Beginn des Mietverhältnisses am 01.11.2026 fällig.

§ 12 Sonstiges
Ansprechpartnerin der Hausverwaltung für Schäden: Frau ⟦NAME|Ilić⟧, Notdienst ⟦TEL|0391 7340 519⟧.

Magdeburg, den 06.10.2026
_______________________          _______________________
Vermieter                         Mieterin`,
  },
  {
    id: "contract-02",
    category: "contract",
    layout: "employment-contract-dotted-annex",
    language: "en",
    ocr: false,
    note: "English employment contract with a dotted-leader master-data annex: pension and health insurance numbers, written-out birth date.",
    marked: `EMPLOYMENT AGREEMENT
between Fernwerk Robotics GmbH, ⟦ADDR|Lohmühlenstraße 65, 12435 Berlin⟧ ("Company")
and
⟦NAME|Ayşe Wenzel⟧ ("Employee")

Annex 1 – Employee master data (for payroll; confidential)
Full name ............ ⟦NAME|Ayşe Wenzel⟧
Date of birth ........ ⟦DOB|7 March 1984⟧
Place of birth ....... Izmir
Home address ......... ⟦ADDR|Sonnenallee 212, 12059 Berlin⟧
Tax ID (Steuer-ID) ... ⟦TAX~taxid|79230185428⟧    Tax class: I
Pension ins. no. ..... ⟦INS~rvnr|12 070384 W 014⟧
Health insurer ....... Techniker Krankenkasse, member no. ⟦INS~kvnr|K206183591⟧
Bank account ......... ⟦IBAN|DE10 6005 0101 0409 1827 36⟧
Private phone ........ ⟦TEL|+49 (0)151 2084 7713⟧
Private email ........ ⟦MAIL|ayse.wenzel@mailbox.example⟧

§ 1 Start of employment and probation
The employment begins on 1 November 2026. The first six months are a probationary period.

§ 4 Remuneration
The Employee receives an annual gross salary of EUR 68,500.00, payable in twelve monthly instalments at the end of each month.

Personnel number assigned: 100-4471 (internal only).`,
  },
  {
    id: "contract-03",
    category: "contract",
    layout: "private-car-sale-two-party-columns",
    language: "de",
    ocr: false,
    note: "Car sale between private persons: seller and buyer side by side in two columns, VIN, registration and certificate numbers as decoys.",
    marked: `Kaufvertrag über ein gebrauchtes Kraftfahrzeug (privat an privat)

Verkäufer                                    Käufer
Name: ⟦NAME|Detlef Brückner⟧                       Name: ⟦NAME|Oksana Melnyk⟧
Anschrift: ⟦ADDR|Am Anger 5, 99084 Erfurt⟧         Anschrift: ⟦ADDR|Gothaer Platz 9, 99094 Erfurt⟧
Tel.: ⟦TEL|0361 6635 210⟧                          Tel.: ⟦TEL|0157 3390 2216⟧
Ausweis-Nr.: ⟦IDN|M9X0RF2T4⟧                        Ausweis-Nr.: ⟦IDN|R3HN7W0K5⟧
geb.: ⟦DOB|21.10.1958⟧                              geb.: ⟦DOB|05.05.1996⟧

Fahrzeug: VW Golf VII Variant, Erstzulassung 03/2017
Fahrzeug-Ident.-Nr.: WVWZZZAUZHP518832
amtl. Kennzeichen: EF-DB 418   Kilometerstand: 128.440 km (abgelesen)
HU fällig: 08/2027   Zahl der Vorbesitzer: 1

Kaufpreis: 9.800,00 € (in Worten: neuntausendachthundert Euro), Zahlung per Echtzeitüberweisung auf ⟦IBAN|DE59 3306 0592 0001 2764 53⟧ vor Übergabe.
Das Fahrzeug wird unter Ausschluss der Sachmängelhaftung verkauft, soweit nicht unten anders vereinbart.

Übergabe am 11.10.2026, 16:30 Uhr, mit 2 Schlüsseln und Zulassungsbescheinigung Teil I und II (Nr. AK 4471830).`,
  },
  {
    id: "contract-04",
    category: "contract",
    layout: "bilingual-parallel-columns",
    language: "mixed",
    ocr: false,
    note: "German and English contract text in parallel columns, flattened: every identifier appears twice on the same line.",
    marked: `DIENSTLEISTUNGSVERTRAG                         SERVICE AGREEMENT
Zwischen                                       Between
Hallo Pixel UG (haftungsbeschränkt),           Hallo Pixel UG (haftungsbeschränkt),
⟦ADDR|Rosenthaler Str. 40, 10178 Berlin⟧,             ⟦ADDR|Rosenthaler Str. 40, 10178 Berlin⟧,
– Auftraggeberin –                             – Client –
und                                            and
⟦NAME|Mira Castellanos⟧, ⟦ADDR|Weserstr. 9, 12047 Berlin⟧,  ⟦NAME|Mira Castellanos⟧, ⟦ADDR|Weserstr. 9, 12047 Berlin⟧,
USt-IdNr. ⟦TAX~vat|DE277395188⟧                      VAT ID ⟦TAX~vat|DE277395188⟧
– Auftragnehmerin –                            – Contractor –

§ 1 Gegenstand                                 § 1 Subject
Die Auftragnehmerin entwickelt die App         The Contractor develops the app
„Kiezkarte“ nach Anlage 1.                     "Kiezkarte" as set out in Annex 1.

§ 4 Vergütung                                  § 4 Fees
Stundensatz 85,00 € netto, Abrechnung          Hourly rate EUR 85.00 net, invoiced
monatlich, zahlbar binnen 14 Tagen an          monthly, payable within 14 days to
⟦IBAN|ES46 0049 1500 0527 1834 5619⟧                   ⟦IBAN|ES46 0049 1500 0527 1834 5619⟧

§ 9 Kontakt                                    § 9 Contact
⟦TEL|030 23125 902⟧ / ⟦MAIL|mira@castellanos-dev.example⟧    ⟦TEL|030 23125 902⟧ / ⟦MAIL|mira@castellanos-dev.example⟧`,
  },

  // ───────────────────────────── CVs ─────────────────────────────
  {
    id: "cv-01",
    category: "cv",
    layout: "german-cv-label-column",
    language: "de",
    ocr: false,
    note: "Classic German CV: label column, 'Geburtsdatum/-ort' with place after the date, landline and mobile.",
    marked: `LEBENSLAUF

Persönliche Daten
Name                ⟦NAME|Friederike Lamprecht⟧
Anschrift           ⟦ADDR|Paulinenstraße 12a, 32756 Detmold⟧
Telefon             ⟦TEL|05231 39 84 06⟧
Mobil               ⟦TEL|0176 3318 2290⟧
E-Mail              ⟦MAIL|f.lamprecht@posteingang.example⟧
Geburtsdatum/-ort   ⟦DOB|03.08.1990⟧ in Lemgo
Familienstand       ledig

Berufserfahrung
seit 04/2021        Sachbearbeiterin Kreditorenbuchhaltung, Möbelwerke Lippe GmbH, Detmold
                    – Prüfung und Kontierung von ca. 900 Eingangsrechnungen pro Monat
                    – Zahlungsläufe, Mahnwesen, Abstimmung von 14 Bankkonten
08/2013 – 03/2021   Kauffrau für Büromanagement, Steuerkanzlei ⟦NAME|Pöppelmann⟧, Lemgo

Ausbildung
08/2010 – 07/2013   Ausbildung zur Kauffrau für Büromanagement (IHK-Note 1,8)
2010                Fachoberschulreife, Realschule Lemgo

Kenntnisse          DATEV Unternehmen online, SAP FI (S/4HANA), MS Excel (SVERWEIS, Pivot)
Sprachen            Englisch B2, Spanisch A2

Detmold, 12.10.2026`,
  },
  {
    id: "cv-02",
    category: "cv",
    layout: "one-line-header-cv",
    language: "en",
    ocr: false,
    note: "Contact details on one dot-separated header line with an ISO birth date after 'born'; references with foreign phone numbers.",
    marked: `⟦NAME|TOMASZ WIERZBICKI⟧
Backend engineer · Hamburg · ⟦TEL|+49 159 0441 2786⟧ · ⟦MAIL|tomasz.w@mailbox.example⟧ · born ⟦DOB|1991-11-14⟧ · github.com/tw-builds

EXPERIENCE
2022–now   Senior Backend Engineer, Kontorflow (Hamburg). Go, PostgreSQL, Kafka; cut p99 latency from 840 ms to 210 ms; on-call lead for 11 services.
2018–2022  Software Engineer, Billbridge (Gdańsk/remote). Payment integrations (SEPA, card acquiring), PCI-DSS scope reduction.
2016–2018  Junior Developer, Portowa Software House, Gdańsk.

EDUCATION
2011–2016  MSc Computer Science, Gdańsk University of Technology (thesis on lock-free queues, grade 5.0)

REFERENCES
⟦NAME|Henrike Saalfeld⟧, CTO Kontorflow — ⟦MAIL|h.saalfeld@kontorflow.example⟧, ⟦TEL|040 66969 271⟧
⟦NAME|Paweł Zieliński⟧, former team lead — ⟦TEL|+48 601 220 914⟧`,
  },
  {
    id: "cv-03",
    category: "cv",
    layout: "europass-style-pipes",
    language: "en",
    ocr: false,
    note: "Europass-like CV: birth date in a pipe-separated line with DD/MM/YYYY, Italian mobile number, job reference as decoy.",
    marked: `Curriculum vitae

PERSONAL INFORMATION   ⟦NAME|Giulia Ferraresi⟧
                       ⟦ADDR|Via dei Mille 18, 40121 Bologna (Italy)⟧
                       ⟦TEL|+39 347 118 2290⟧
                       ⟦MAIL|giulia.ferraresi@posta.example⟧
Sex Female | Date of birth ⟦DOB|22/04/1988⟧ | Nationality Italian

JOB APPLIED FOR        Clinical Data Manager (ref. CDM-2026-17)

WORK EXPERIENCE
03/2019–present        Data Manager, Centro Ricerche Emilia, Bologna
                       ▪ Set up eCRFs for 7 phase II/III trials (REDCap, Medidata Rave)
                       ▪ Query management for about 2,300 patients across 41 sites
09/2015–02/2019        Study Coordinator, Policlinico Est, Ferrara

EDUCATION AND TRAINING
2013–2015              MSc Biostatistics, Università di Padova (110/110)

PERSONAL SKILLS
Mother tongue Italian · English C1 (IELTS 7.5, 2017) · German B1
Driving licence B`,
  },
  {
    id: "cv-04",
    category: "cv",
    layout: "two-column-cv-sidebar-flattened",
    language: "de",
    ocr: false,
    note: "Designer CV with a left sidebar flattened into the main column: contact data and 'geb.' interleaved with job history.",
    marked: `⟦NAME|KONSTANTIN ROTHE⟧                          PROFIL
Elektroniker für Betriebstechnik         Instandhalter mit 9 Jahren Erfahrung in der
                                         Lebensmittelindustrie, SPS (S7, TIA Portal).
KONTAKT
⟦ADDR|Lerchenweg 3⟧                              BERUFSERFAHRUNG
⟦ADDR|49076 Osnabrück⟧                           2019 – heute  Schichtelektriker, Brotwerk Nord
⟦TEL|0541 6008 913⟧                              GmbH, Osnabrück; Störungsbehebung an
⟦MAIL|k.rothe@funkpost.example⟧                  12 Linien, Rufbereitschaft 1 Woche/Monat
                                         2015 – 2019  Elektroniker, Agrartechnik
PERSÖNLICHES                             Hasetal KG, Quakenbrück
geb. ⟦DOB|19.12.1987⟧ in Bramsche
verheiratet, 2 Kinder                    AUSBILDUNG
Führerschein B, CE                       2012 – 2015  Ausbildung Elektroniker für
                                         Betriebstechnik, IHK Osnabrück (Note 2)
SPRACHEN
Deutsch, Englisch (gut)                  WEITERBILDUNG
                                         2023  Elektrofachkraft für festgelegte
                                         Tätigkeiten; 2021 Staplerschein`,
  },

  // ───────────────────────────── medical letters ─────────────────────────────
  {
    id: "medical-01",
    category: "medical-letter",
    layout: "hospital-discharge-letter",
    language: "de",
    ocr: false,
    note: "Discharge letter: ICD codes, case number, lab values, dosing schemes (1-0-1) and dates as decoys; patient line with birth date, address and insurance number.",
    marked: `Klinikum am Weinberg · Klinik für Innere Medizin II – Kardiologie
Chefarzt Prof. Dr. med. ⟦NAME|Arnulf Siebenkees⟧
⟦ADDR|Weinbergweg 20, 06120 Halle (Saale)⟧ · Sekretariat ⟦TEL|0345 2210 4430⟧ · Fax ⟦TEL|0345 2210 4439⟧

Frau Dr. med. ⟦NAME|Elske Tammen⟧
Fachärztin für Allgemeinmedizin
⟦ADDR|Marktplatz 6, 06108 Halle⟧

Halle, 29.09.2026

Entlassungsbericht
Patient: ⟦NAME|Horst Wienhold⟧, geb. ⟦DOB|14.05.1956⟧, ⟦ADDR|Robert-Franz-Ring 27, 06108 Halle⟧
Versicherung: AOK Sachsen-Anhalt, Vers.-Nr. ⟦INS~kvnr|M839201741⟧
Fallnummer 2026-118-04471 · stationär vom 21.09.2026 bis 29.09.2026

Diagnosen
– NSTEMI (I21.4), Eingefäßerkrankung RIVA, PCI mit DES (2 Stents) am 22.09.2026
– Arterielle Hypertonie (I10.90)
– Diabetes mellitus Typ 2, nicht insulinpflichtig (E11.9), HbA1c 7,4 %

Medikation bei Entlassung
ASS 100 mg 1-0-0 dauerhaft; Ticagrelor 90 mg 1-0-1 für 12 Monate (bis 09/2027); Bisoprolol 2,5 mg 1-0-0; Ramipril 5 mg 1-0-0; Atorvastatin 40 mg 0-0-1; Metformin 1000 mg 1-0-1

Verlauf
Aufnahme mit thorakalem Druckgefühl seit 6 h, Troponin T hs 412 ng/l (Referenz < 14). Koronarangiographie am Folgetag, LVEF 52 %.

Wir bitten um Kontrolle der Nierenwerte in 1 Woche (Kreatinin bei Entlassung 1,1 mg/dl). Rückfragen gern unter ⟦TEL|0345 2210 4431⟧.

Mit freundlichen Grüßen
Dr. med. ⟦NAME|L. Ostendorf⟧, Oberarzt`,
  },
  {
    id: "medical-02",
    category: "medical-letter",
    layout: "travel-medication-letter-english",
    language: "en",
    ocr: false,
    note: "English letter from a German practice for travel: abbreviated month in the birth date, a German health insurance number, doses as decoys.",
    marked: `Hausarztpraxis Elbufer · Dr. ⟦NAME|Marten Quast⟧ & Dr. ⟦NAME|Yasemin Aydın⟧
⟦ADDR|Elbchaussee 410, 22609 Hamburg⟧ · ⟦TEL|040 66969 118⟧ · ⟦MAIL|praxis@elbufer-hausarzt.example⟧

To whom it may concern / for the attention of the treating physician abroad

Re: ⟦NAME|Siobhán Doherty⟧, date of birth ⟦DOB|30 Sept 1971⟧
Health insurance: Barmer, insurance no. ⟦INS~kvnr|T471950285⟧ (EHIC on the reverse of the card)

Ms ⟦NAME|Doherty⟧ has been our patient since 2019. She is travelling to Ireland from 14 to 28 October 2026 and carries the following medicines for personal use:
  • Levothyroxine 100 µg, 1 tablet daily (30 tablets)
  • Sumatriptan 50 mg as needed, max. 2 per day (6 tablets)
  • Enoxaparin 40 mg/0.4 ml, prefilled syringes, 1 daily for 14 days after her flight (14 syringes)

Known allergies: penicillin (urticaria, 2004). Last TSH 1.8 mU/l on 02/10/2026.
If anything is unclear, please call the practice on ⟦TEL|+49 40 66969 118⟧ during opening hours.

Hamburg, 8 October 2026
Dr. ⟦NAME|Yasemin Aydın⟧`,
  },
  {
    id: "medical-03",
    category: "medical-letter",
    layout: "lab-report-table",
    language: "de",
    ocr: false,
    note: "Lab report: 'Geb.-Dat.', practice and doctor numbers, order number, barcode text between asterisks, reference ranges.",
    marked: `LABOR DR. ⟦NAME|VOLKMANN⟧ & KOLLEGEN · Medizinisches Versorgungszentrum
⟦ADDR|Industriestraße 4, 01129 Dresden⟧ · Tel. ⟦TEL|0351 8550 7700⟧

Einsender: Praxis Dr. ⟦NAME|Benedikt Rauschenbach⟧, ⟦ADDR|Bautzner Str. 77, 01099 Dresden⟧ · BSNR 721234500 · LANR 123456601
Patient:   ⟦NAME|Weißgerber, Renate⟧        Geb.-Dat. ⟦DOB|08.08.1949⟧     w
Auftragsnr. 26-1007-4413   Eingang 07.10.2026 08:12   Befund 07.10.2026 15:46   *1180734*

Untersuchung        Ergebnis   Einheit    Referenzbereich
Leukozyten           11,8 H    /nl        3,9 – 10,2
Hämoglobin           11,9 L    g/dl       12,0 – 15,4
Thrombozyten         312       /nl        150 – 370
CRP                  48,2 H    mg/l       < 5,0
Kreatinin            1,32 H    mg/dl      0,51 – 0,95
eGFR (CKD-EPI)       39        ml/min     > 60
TSH                  2,61      mU/l       0,27 – 4,20

Kommentar: Bitte Verlaufskontrolle in 3–5 Tagen. Befund telefonisch vorab mitgeteilt am 07.10.2026 um 15:20 an Frau ⟦NAME|Krebs⟧ (MFA).
Versichertennummer: ⟦INS~kvnr|R582047138⟧`,
  },
  {
    id: "medical-04",
    category: "medical-letter",
    layout: "prescription-form-fields",
    language: "de",
    ocr: false,
    note: "Prescription form as extracted text: field labels on one line, values on the next; birth date under 'geb. am' beside the address; payer, practice and doctor numbers as decoys.",
    marked: `Krankenkasse bzw. Kostenträger
DAK-Gesundheit
Name, Vorname des Versicherten
⟦NAME|Grabowski, Helena⟧
⟦ADDR|Am Stadtgraben 9
37073 Göttingen⟧                            geb. am
                                          ⟦DOB~label-above|11.11.1966⟧
Kostenträgerkennung   Versicherten-Nr.        Status
108310400             ⟦INS~kvnr|B661038271⟧            1000000
Betriebsstätten-Nr.   Arzt-Nr.                Datum
207340100             361298401               09.10.26

Rp.
Ibuprofen 600 mg 50 Filmtbl. N2  PZN 11873304
Pantoprazol 20 mg 30 Tbl. N1     PZN 06930275

Praxis Dr. ⟦NAME|Tobias Engelke⟧ · ⟦ADDR|Weender Str. 31, 37073 Göttingen⟧ · ⟦TEL|0551 4718 220⟧`,
  },
];
