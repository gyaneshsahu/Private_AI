/**
 * Document layouts for the masking benchmark, grouped by the categories of
 * text people paste or attach: bills, tax letters, contracts, CVs, medical
 * letters, bank statements, emails, chats, forms and tables. Scans reuse
 * these layouts (plus identity-document scans) under the OCR noise model.
 * All people, companies and numbers are invented.
 */
import { Doc, type Item, type Lang } from "./doc";
import {
  type Person,
  type PhoneType,
  amount,
  decoy,
  decoyDate,
  makeDocumentNumber,
  makePerson,
} from "./values";

export const CATEGORIES = [
  "invoice",
  "tax-letter",
  "contract",
  "cv",
  "medical-letter",
  "bank-statement",
  "email",
  "chat",
  "form",
  "table",
  "scan-ocr",
] as const;
export type Category = (typeof CATEGORIES)[number];
export type BaseCategory = Exclude<Category, "scan-ocr">;

export interface Layout {
  name: string;
  category: BaseCategory | "scan-ocr";
  lang: Lang;
  pdf?: boolean;
  html?: boolean;
  chat?: boolean;
  build: (d: Doc) => void;
}

const person = (d: Doc) => makePerson(d.r, d.ctx.lang);
const addressLine = (p: Person) => `${p.street}, ${p.postcode} ${p.city}`;
const deMobileOrLandline = (d: Doc): PhoneType =>
  d.r.chance(0.6) ? "de-mobile" : "de-landline";
const anyPhone = (d: Doc): PhoneType =>
  d.de
    ? deMobileOrLandline(d)
    : d.r.weighted<PhoneType>([
        ["de-mobile", 45],
        ["de-landline", 15],
        ["uk-mobile", 20],
        ["uk-landline", 10],
        ["ch", 5],
        ["at", 5],
      ]);
const COMPANIES = [
  "Nordlicht Energie GmbH",
  "Stadtwerke Musterhausen GmbH",
  "TeleNova Mobilfunk GmbH",
  "Agentur Blauwal GmbH",
  "Muster Logistik GmbH",
  "Hausverwaltung Sonnenhof GmbH",
  "Kanzlei Berger & Partner",
  "Beispiel Versicherung AG",
];
const orgEmail = (d: Doc, local: string) =>
  d.email(local, d.r.pick(["firma.example", "service.example", "example.com"]));

const salutation = (d: Doc, p: Person): Item[] =>
  d.r.chance(0.5)
    ? [d.t("Sehr geehrte Damen und Herren,", "Dear Sir or Madam,")]
    : [d.t("Guten Tag ", "Dear "), d.fullName(p), ","];

/* ------------------------------------------------------------- invoices */

const invoiceLayouts: Layout[] = [
  {
    name: "de-utility-bill",
    category: "invoice",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Stadtwerke Musterhausen GmbH · Postfach 1234 · 12345 Musterhausen");
      d.line(d.fullName(p));
      d.line(d.address(p.street));
      d.line(d.address(`${p.postcode} ${p.city}`));
      d.line(`Kundennummer: ${decoy.customerNumber(r)}    Vertragskonto: ${decoy.contractNumber(r)}`);
      d.line(`Rechnungsdatum: ${decoyDate(r, "de")}`);
      d.line("Jahresverbrauchsabrechnung Strom");
      d.line(`Zählernummer: ${decoy.meter(r)}`);
      d.line(`Abrechnungszeitraum: 01.01.2025 - 31.12.2025`);
      d.line(`Verbrauch: ${r.int(1200, 4800).toLocaleString("de-DE")} kWh, Arbeitspreis ${r.int(25, 40)},${r.int(10, 99)} ct/kWh`);
      d.line(`Gesamtbetrag brutto: ${amount(r, "de")}`);
      d.line(`Bereits gezahlte Abschläge: ${amount(r, "de")}`);
      if (r.chance(0.7))
        d.line("Das Guthaben überweisen wir auf Ihr Konto ", d.iban(), ".");
      else d.line("Der Betrag wird von Ihrem Konto IBAN ", d.iban(), " abgebucht.");
      d.line(`Neuer monatlicher Abschlag ab ${decoyDate(r, "de")}: ${amount(r, "de", 200)}`);
      d.line(`Gläubiger-ID: ${decoy.creditorId(r)}, Mandatsreferenz: ${decoy.mandateReference(r)}`);
      d.line("Fragen? Kundenservice ", d.phone("de-service"), " (Mo-Fr 8-18 Uhr) oder ", orgEmail(d, "kundenservice"));
      if (r.chance(0.5)) d.line("Ihre bei uns hinterlegte Telefonnummer: ", d.phone(deMobileOrLandline(d)));
      d.line(
        "Stadtwerke Musterhausen GmbH | IBAN ",
        d.iban(),
        ` | BIC ${decoy.bic(r)} | USt-IdNr. `,
        d.vatId(),
        ` | HRB ${r.int(1000, 99999)} Amtsgericht Musterhausen`,
      );
    },
  },
  {
    name: "de-freelancer-invoice",
    category: "invoice",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(d.fullName(p));
      d.line(d.address(addressLine(p)));
      d.line("Tel. ", d.phone(deMobileOrLandline(d)), " · ", d.email(p));
      d.line();
      d.line(`An\nAgentur Blauwal GmbH\nHafenstraße 9\n20457 Hamburg`);
      d.line();
      d.line(`Rechnung Nr. ${decoy.invoiceNumber(r)}`);
      d.line(`Rechnungsdatum: ${decoyDate(r, "de")}`);
      d.line(`Leistungszeitraum: ${decoyDate(r, "de")} – ${decoyDate(r, "de")}`);
      d.line("Pos. Beschreibung Menge Einzelpreis Gesamt");
      for (let i = 1; i <= r.int(2, 4); i++)
        d.line(`${i} ${r.pick(["Konzeption", "Text und Lektorat", "Webdesign", "Beratung", "Fotografie"])} ${r.int(2, 40)} Std. ${r.int(50, 120)},00 € ${amount(r, "de")}`);
      d.line(`Nettobetrag: ${amount(r, "de")}`);
      d.line(`zzgl. 19 % USt: ${amount(r, "de", 900)}`);
      d.line(`Rechnungsbetrag: ${amount(r, "de")}`);
      d.line(`Bitte überweisen Sie den Betrag bis zum ${decoyDate(r, "de")} auf folgendes Konto:`);
      d.kv(
        [
          ["Kontoinhaber", d.fullName(p)],
          ["IBAN", d.iban()],
          ["BIC", decoy.bic(r)],
        ],
        ["colon", "tab"],
      );
      const which = r.pick(["st", "vat", "both"]);
      if (which !== "vat") d.line("Steuernummer: ", d.steuernummer());
      if (which !== "st") d.line(r.pick(["USt-IdNr.: ", "USt-ID: ", "Umsatzsteuer-ID "]), d.vatId());
    },
  },
  {
    name: "en-freelancer-invoice",
    category: "invoice",
    lang: "en",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(d.fullName(p), " — Freelance Translator");
      d.line(d.address(addressLine(p)));
      d.line("Phone: ", d.phone(anyPhone(d)), " | Email: ", d.email(p));
      d.line();
      d.line(`INVOICE ${decoy.invoiceNumber(r)}`);
      d.line(`Date: ${decoyDate(r, "en")}   Due: ${decoyDate(r, "en")}`);
      d.line("Bill to: Example Media Ltd, 4 Harbour Road, Dublin");
      d.line("Description | Qty | Rate | Amount");
      for (let i = 0; i < r.int(2, 4); i++)
        d.line(`${r.pick(["Translation DE>EN", "Proofreading", "Subtitling", "Glossary work"])} | ${r.int(1, 30)} | ${amount(r, "en", 120)} | ${amount(r, "en")}`);
      d.line(`Subtotal: ${amount(r, "en")}`);
      d.line(`VAT 19%: ${amount(r, "en", 900)}`);
      d.line(`Total due: ${amount(r, "en")}`);
      d.line("Payment details");
      d.kv(
        [
          ["Account holder", d.fullName(p)],
          ["IBAN", d.iban()],
          ["BIC", decoy.bic(r)],
        ],
        ["colon", "tab"],
      );
      d.line(r.pick(["Tax number: ", "German tax number (Steuernummer): "]), d.steuernummer());
      if (r.chance(0.6)) d.line("VAT ID: ", d.vatId());
    },
  },
  {
    name: "de-phone-bill",
    category: "invoice",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("TeleNova Mobilfunk GmbH");
      d.line(`Ihre Rechnung ${r.pick(["September", "Oktober"])} 2026`);
      d.line(`Kundennummer: ${decoy.customerNumber(r)}  Rechnungsnummer: ${decoy.invoiceNumber(r)}`);
      d.line(d.fullName(p), ", ", d.address(addressLine(p)));
      d.line("Ihre Rufnummer: ", d.phone("de-mobile"));
      d.line(`Grundgebühr Tarif Smart L ${amount(r, "de", 60)}`);
      d.line(`Verbindungen außerhalb Inklusivleistung ${amount(r, "de", 30)}`);
      d.line("Einzelverbindungsnachweis");
      d.line("Datum Uhrzeit Zielrufnummer Dauer Betrag");
      for (let i = 0; i < r.int(3, 6); i++)
        d.line(`${decoyDate(r, "de", true)} ${decoy.time(r)} `, d.phone(deMobileOrLandline(d)), ` 00:${String(r.int(0, 59)).padStart(2, "0")}:${String(r.int(0, 59)).padStart(2, "0")} 0,00 €`);
      d.line(`Summe: ${amount(r, "de", 80)}`);
      d.line("Der Betrag wird am ", decoyDate(r, "de"), " von IBAN ", d.iban(), " abgebucht.");
    },
  },
  {
    name: "en-online-order",
    category: "invoice",
    lang: "en",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(`Order confirmation — Order ${r.digits(3)}-${r.digits(7)}-${r.digits(7)}`);
      d.line(`Order date: ${decoyDate(r, "en")}`);
      d.line("Billing address:");
      d.line(d.fullName(p));
      d.line(d.address(addressLine(p)));
      d.line("Email: ", d.email(p));
      if (r.chance(0.7)) d.line("Phone: ", d.phone(anyPhone(d)));
      d.line("Item | EAN | Qty | Price");
      for (let i = 0; i < r.int(2, 4); i++)
        d.line(`${r.pick(["USB-C cable 2 m", "Desk lamp", "Notebook A5", "Coffee beans 1 kg", "Headphones"])} | ${decoy.ean(r)} | ${r.int(1, 3)} | ${amount(r, "en", 90)}`);
      d.line(`Total: ${amount(r, "en", 300)} (incl. VAT ${amount(r, "en", 50)})`);
      d.line(`Paid with ${r.pick(["Visa", "Mastercard"])} ending in ${r.digits(4)}`);
      d.line(`Tracking number: ${decoy.tracking(r)}`);
    },
  },
];

/* ---------------------------------------------------------- tax letters */

const taxLayouts: Layout[] = [
  {
    name: "de-tax-assessment",
    category: "tax-letter",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Finanzamt Musterstadt · Postfach 10 01 23 · 12345 Musterstadt");
      d.line(d.fullName(p));
      d.line(d.address(p.street));
      d.line(d.address(`${p.postcode} ${p.city}`));
      d.kv(
        [
          ["Steuernummer", d.steuernummer()],
          [r.pick(["Identifikationsnummer", "Steuer-ID", "IdNr.", "Steuerliche Identifikationsnummer"]), d.taxId()],
          ["Telefon", d.phone("de-landline")],
          ["Datum", decoyDate(r, "de")],
        ],
        ["colon", "tab"],
      );
      d.line("Bescheid für 2025 über Einkommensteuer");
      d.line(`Festgesetzt werden: Einkommensteuer ${amount(r, "de", 20000)}, Solidaritätszuschlag 0,00 €`);
      d.line(`Bereits gezahlt: ${amount(r, "de", 20000)}`);
      d.line(`Erstattung: ${amount(r, "de", 3000)}`);
      d.line("Der Erstattungsbetrag wird auf das Konto ", d.iban(), " überwiesen.");
      d.line(`Bankverbindung Finanzamt: Bundesbank IBAN `, d.iban(), " BIC MARKDEF1100");
      d.line("Öffnungszeiten: Mo-Fr 8:00-12:00, Do 14:00-17:00");
    },
  },
  {
    name: "de-tax-id-notice",
    category: "tax-letter",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Bundeszentralamt für Steuern · 53221 Bonn");
      d.line(d.fullName(p), ", ", d.address(addressLine(p)));
      d.line("Mitteilung über Ihre steuerliche Identifikationsnummer");
      d.line(...salutation(d, p));
      d.line("Ihre Identifikationsnummer lautet:");
      d.line(d.taxId());
      d.line("Folgende Daten sind zu Ihrer Person gespeichert:");
      d.kv(
        [
          ["Familienname", d.name(p.last)],
          ["Vorname", d.name(p.first)],
          [r.pick(["Geburtsdatum", "Tag der Geburt", "Geburtstag"]), d.birth(p)],
          ["Geburtsort", p.city],
        ],
        ["colon", "tab", "nextline"],
      );
      d.line(`Bonn, ${decoyDate(r, "de")}`);
    },
  },
  {
    name: "de-payroll-tax-certificate",
    category: "tax-letter",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Ausdruck der elektronischen Lohnsteuerbescheinigung für 2025");
      d.line("Arbeitnehmer: ", d.fullName(p), ", ", d.address(addressLine(p)));
      d.kv(
        [
          ["Geburtsdatum", d.birth(p)],
          ["Identifikationsnummer", d.taxId()],
          ["Personalnummer", decoy.employeeNumber(r)],
        ],
        ["colon", "tab", "dots"],
      );
      d.line("Dauer des Dienstverhältnisses 01.01.-31.12.");
      d.line(`3. Bruttoarbeitslohn ${amount(r, "de", 90000).replace(/ (EUR|€)$/, "")}`);
      d.line(`4. Einbehaltene Lohnsteuer ${amount(r, "de", 20000).replace(/ (EUR|€)$/, "")}`);
      d.line(`5. Solidaritätszuschlag 0,00`);
      d.line(`23. Arbeitnehmeranteil Rentenversicherung ${amount(r, "de", 9000).replace(/ (EUR|€)$/, "")}`);
      d.line("Arbeitgeber: Muster Logistik GmbH, Steuernummer der Betriebsstätte ", d.steuernummer());
    },
  },
  {
    name: "en-tax-letter",
    category: "tax-letter",
    lang: "en",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Tax office Musterstadt — Notice of assessment 2025 (courtesy translation)");
      d.kv(
        [
          ["Taxpayer", d.fullName(p)],
          ["Tax number", d.steuernummer()],
          [r.pick(["Tax ID", "Tax identification number", "TIN"]), d.taxId()],
          ["Date of birth", d.birth(p)],
        ],
        ["colon", "tab", "nextline"],
      );
      d.line(`Assessed income tax: ${amount(r, "en", 20000)}. Refund: ${amount(r, "en", 3000)}.`);
      d.line("The refund will be paid to IBAN ", d.iban(), ".");
      d.line("Questions: call ", d.phone("de-landline"), " or write to ", orgEmail(d, "poststelle"), ".");
    },
  },
  {
    name: "de-tax-adviser-letter",
    category: "tax-letter",
    lang: "de",
    build(d) {
      const p = person(d);
      const spouse = person(d);
      const r = d.r;
      d.line("Kanzlei Berger & Partner Steuerberatung");
      d.line(`Unser Zeichen: ${decoy.caseReference(r)}`);
      d.line(...salutation(d, p));
      d.line("für die Einkommensteuererklärung 2025 haben wir folgende Daten erfasst:");
      d.line("Steuernummer ", d.steuernummer(), ", Ihre Steuer-ID ", d.taxId(), ", die Ihrer Ehefrau/Ihres Ehemanns ", d.taxId(), ".");
      d.line("Ehepartner: ", d.fullName(spouse), ", geb. ", d.birth(spouse));
      d.line("Erstattungen bitte auf ", d.iban(), ".");
      d.line(`Bitte senden Sie uns bis ${decoyDate(r, "de")} die Belege. Rückfragen: `, d.phone("de-landline"), " oder ", orgEmail(d, "kanzlei"), ".");
    },
  },
];

/* ------------------------------------------------------------ contracts */

const contractLayouts: Layout[] = [
  {
    name: "de-tenancy",
    category: "contract",
    lang: "de",
    pdf: true,
    build(d) {
      const landlord = person(d);
      const tenant = person(d);
      const r = d.r;
      d.line("Mietvertrag für Wohnraum");
      d.line("zwischen");
      d.line(d.fullName(landlord), ", ", d.address(addressLine(landlord)), ", Tel. ", d.phone(deMobileOrLandline(d)));
      d.line("- nachfolgend Vermieter -");
      d.line("und");
      d.line(d.fullName(tenant), ", ", r.pick(["geboren am ", "geb. ", "geb. am "]), d.birth(tenant), ", wohnhaft ", d.address(addressLine(tenant)));
      d.line(r.pick(["Personalausweis-Nr.: ", "Ausweisnummer: ", "Personalausweisnummer ", "Ausweis Nr. "]), d.docNumber("de-id"));
      d.line("- nachfolgend Mieter -");
      d.line(`§ 1 Mietsache: Wohnung im ${r.int(1, 5)}. OG, ${r.int(1, 5)} Zimmer, ca. ${r.int(35, 120)} m²`);
      d.line(`§ 3 Miete: Grundmiete ${amount(r, "de", 1500)}, Nebenkosten ${amount(r, "de", 300)}`);
      d.line("Die Miete ist monatlich bis zum 3. Werktag auf das Konto des Vermieters zu zahlen: IBAN ", d.iban(), ", Kontoinhaber ", d.fullName(landlord));
      d.line(`§ 5 Kaution: ${amount(r, "de", 4500)} gemäß § 551 BGB`);
      d.line("Kontakt Mieter: ", d.email(tenant), ", ", d.phone("de-mobile"));
      d.line(`${tenant.city}, den ${decoyDate(r, "de")}`);
    },
  },
  {
    name: "de-employment",
    category: "contract",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Arbeitsvertrag");
      d.line("zwischen der Muster Logistik GmbH und");
      d.line(r.pick(["Frau ", "Herrn "]), d.fullName(p), ", geb. ", d.birth(p), ", ", d.address(addressLine(p)));
      d.line(`§ 1 Beginn des Arbeitsverhältnisses: ${decoyDate(r, "de")}`);
      d.line(`§ 4 Vergütung: Bruttomonatsgehalt ${amount(r, "de", 7000)}`);
      d.line("Anlage Personalangaben");
      d.kv(
        [
          [r.pick(["Steuer-ID", "Steuerliche IdNr.", "Steueridentifikationsnummer"]), d.taxId()],
          [r.pick(["Sozialversicherungsnummer", "Rentenversicherungsnummer", "SV-Nummer"]), d.pension(p)],
          ["Krankenkasse", "Musterkasse"],
          ["Bankverbindung", d.iban()],
          ["Telefon", d.phone(deMobileOrLandline(d))],
          ["E-Mail", d.email(p)],
        ],
        ["colon", "tab", "dots", "nextline"],
      );
    },
  },
  {
    name: "en-employment",
    category: "contract",
    lang: "en",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("EMPLOYMENT AGREEMENT");
      d.line("This agreement is made between Example Analytics GmbH (the Employer) and ", d.fullName(p), " (the Employee), born ", d.birth(p), ", residing at ", d.address(addressLine(p)), ".");
      d.line(`1. Start date: ${decoyDate(r, "en")}. 2. Salary: ${amount(r, "en", 90000)} per year.`);
      d.line("Employee details");
      d.kv(
        [
          ["Tax ID", d.taxId()],
          [r.pick(["Social security number", "Pension insurance number"]), d.pension(p)],
          ["Passport number", d.docNumber(r.pick(["uk-passport", "de-passport", "at-passport"]))],
          ["Bank account (IBAN)", d.iban()],
          ["Mobile", d.phone(anyPhone(d))],
          ["Email", d.email(p)],
        ],
        ["colon", "tab", "nextline"],
      );
    },
  },
  {
    name: "de-car-sale",
    category: "contract",
    lang: "de",
    build(d) {
      const seller = person(d);
      const buyer = person(d);
      const r = d.r;
      d.line("Kaufvertrag über ein gebrauchtes Kraftfahrzeug");
      d.line("Verkäufer: ", d.fullName(seller), ", ", d.address(addressLine(seller)), ", Tel.: ", d.phone(deMobileOrLandline(d)), ", Ausweis-Nr.: ", d.docNumber("de-id"));
      d.line("Käufer: ", d.fullName(buyer), ", ", d.address(addressLine(buyer)), ", Tel.: ", d.phone(deMobileOrLandline(d)), ", Personalausweisnummer: ", d.docNumber("de-id"));
      d.line(`Fahrzeug: VW Golf, FIN ${decoy.vin(r)}, amtl. Kennzeichen B-${r.pick(["AB", "XY", "KL"])} ${r.int(10, 9999)}, Erstzulassung 0${r.int(1, 9)}/20${r.int(10, 22)}, km-Stand ${r.int(10, 250)}.${r.digits(3)}`);
      d.line(`Kaufpreis: ${amount(r, "de", 25000)}, zahlbar per Überweisung auf IBAN `, d.iban(), ".");
      d.line(`${seller.city}, ${decoyDate(r, "de")}`);
    },
  },
];

/* ------------------------------------------------------------------ CVs */

const cvLayouts: Layout[] = [
  {
    name: "de-cv",
    category: "cv",
    lang: "de",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Lebenslauf");
      d.line("Persönliche Daten");
      const birthStyle = r.pick(["label", "geboren", "star"]);
      const rows: [string, ...Item[]][] = [
        ["Name", d.fullName(p)],
        ["Anschrift", d.address(addressLine(p))],
        ["Telefon", d.phone(deMobileOrLandline(d))],
        ["E-Mail", d.email(p)],
      ];
      if (birthStyle === "label") rows.push([r.pick(["Geburtsdatum", "Geburtsdatum und -ort"]), d.birth(p)]);
      d.kv(rows, ["colon", "tab", "nextline"]);
      if (birthStyle === "geboren") d.line("Geboren am ", d.birth(p), ` in ${p.city}`);
      if (birthStyle === "star") d.line("* ", d.birth(p), ` in ${p.city}`);
      d.line("Staatsangehörigkeit: deutsch");
      d.line("Beruflicher Werdegang");
      d.line(`${String(r.int(1, 12)).padStart(2, "0")}/${r.int(2018, 2022)} – heute  ${r.pick(["Projektmanagerin", "Buchhalter", "Pflegefachkraft", "Softwareentwickler"])}, Muster AG, Berlin`);
      d.line(`${String(r.int(1, 12)).padStart(2, "0")}/${r.int(2010, 2017)} – ${String(r.int(1, 12)).padStart(2, "0")}/${r.int(2017, 2018)}  Sachbearbeitung, Beispiel GmbH`);
      d.line("Ausbildung");
      d.line(`${r.int(2004, 2010)} – ${r.int(2010, 2014)}  B.A. Betriebswirtschaft, Hochschule Musterstadt`);
      d.line("Sprachen: Deutsch (Muttersprache), Englisch (C1)");
      d.line(`${p.city}, ${decoyDate(r, "de")}`);
    },
  },
  {
    name: "en-cv",
    category: "cv",
    lang: "en",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(d.name(`${p.first} ${p.last}`.toUpperCase()));
      d.line(d.address(addressLine(p)), " | ", d.phone(anyPhone(d)), " | ", d.email(p));
      d.line(r.pick(["Date of birth: ", "DOB: ", "Born: ", "Date of Birth "]), d.birth(p));
      d.line(`Nationality: ${r.pick(["Irish", "British", "Indian", "German"])}`);
      d.line(`LinkedIn: linkedin.example/in/${p.emailLocal.replace(/[^a-z]/g, "")}-${r.digits(6)}`);
      d.line("PROFESSIONAL EXPERIENCE");
      d.line(`${r.pick(["Jan", "Mar", "Sep"])} ${r.int(2018, 2023)} – present  ${r.pick(["Data Analyst", "Nurse", "Product Manager"])}, Example Ltd, Berlin`);
      d.line(`${r.pick(["Jun", "Oct"])} ${r.int(2012, 2017)} – ${r.pick(["Feb", "Dec"])} ${r.int(2017, 2018)}  Analyst, Sample plc, Dublin`);
      d.line("EDUCATION");
      d.line(`${r.int(2006, 2010)} – ${r.int(2010, 2013)}  BSc Economics, Example University`);
    },
  },
  {
    name: "de-cv-header-line",
    category: "cv",
    lang: "de",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(d.fullName(p), " | ", d.address(addressLine(p)), " | ", d.phone(deMobileOrLandline(d)), " | ", d.email(p), r.chance(0.6) ? " | geb. " : " | Geburtsdatum ", d.birth(p));
      d.line("Profil");
      d.line(`Erfahrene Fachkraft mit ${r.int(3, 20)} Jahren Berufserfahrung in der Logistik.`);
      d.line(`Stationen: ${r.int(2010, 2015)}–${r.int(2016, 2020)} Muster Logistik GmbH; seit ${r.int(2020, 2023)} Beispiel AG.`);
    },
  },
  {
    name: "en-cv-sidebar",
    category: "cv",
    lang: "en",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(d.fullName(p));
      d.line("CONTACT");
      d.line("Phone");
      d.line(d.phone(anyPhone(d)));
      d.line("Email");
      d.line(d.email(p));
      d.line(r.pick(["Date of birth", "Birthday"]));
      d.line(d.birth(p));
      d.line("Address");
      d.line(d.address(addressLine(p)));
      d.line("SKILLS");
      d.line("SQL, Python, Tableau, stakeholder management");
    },
  },
];

/* ------------------------------------------------------ medical letters */

const medicalLayouts: Layout[] = [
  {
    name: "de-doctor-letter",
    category: "medical-letter",
    lang: "de",
    pdf: true,
    build(d) {
      const doctor = person(d);
      const p = person(d);
      const r = d.r;
      d.line("Praxis Dr. med. ", d.fullName(doctor), " · Fachärztin für Innere Medizin");
      d.line("Musterallee 5, 12345 Musterstadt · Tel. ", d.phone("de-landline"), " · Fax ", d.phone("de-landline"), " · ", orgEmail(d, "praxis"));
      d.line(decoyDate(r, "de"));
      d.line("Arztbrief");
      d.line(r.pick(["Patientin: ", "Patient: ", "Pat.: "]), d.fullName(p), r.pick([", geb. ", ", geb. am ", ", Geburtsdatum "]), d.birth(p), ", ", d.address(addressLine(p)));
      d.line(r.pick(["Versichertennummer: ", "Versicherten-Nr.: ", "KV-Nr. ", "Krankenversichertennummer "]), d.health());
      d.line("Krankenkasse: Musterkasse");
      d.line(`Diagnosen: ${decoy.icd(r)} Akute Infektion der oberen Atemwege; ${decoy.icd(r)} Rückenschmerzen`);
      d.line(`Befund: RR ${r.int(110, 150)}/${r.int(70, 95)} mmHg, Puls ${r.int(55, 95)}/min, Hb ${r.int(11, 16)},${r.int(0, 9)} g/dl, CRP ${r.int(0, 30)},${r.int(0, 9)} mg/l`);
      d.line("Therapie: Ibuprofen 400 mg 1-0-1 für 5 Tage");
      d.line(`Wiedervorstellung am ${decoyDate(r, "de")}. Rückfragen gerne unter `, d.phone("de-landline"), ".");
    },
  },
  {
    name: "de-discharge-letter",
    category: "medical-letter",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Klinikum Musterstadt – Klinik für Allgemeinchirurgie");
      d.line("Entlassungsbrief");
      d.line("Patient: ", d.name(`${p.last}, ${p.first}`), r.pick([", * ", ", geb. ", ", geboren "]), d.birth(p));
      d.line(`Fallnummer: ${r.digits(10)}  Aufnahme: ${decoyDate(r, "de")}  Entlassung: ${decoyDate(r, "de")}`);
      d.line("Versichertennummer: ", d.health());
      d.line(`Diagnose: ${decoy.icd(r)} Cholezystolithiasis`);
      d.line("Procedere: Fadenzug am 10. postoperativen Tag beim Hausarzt.");
      d.line("Kontakt Station 4B: ", d.phone("de-landline"));
    },
  },
  {
    name: "en-medical-report",
    category: "medical-letter",
    lang: "en",
    build(d) {
      const p = person(d);
      const doctor = person(d);
      const r = d.r;
      d.line("Medical report");
      d.kv(
        [
          ["Patient name", d.fullName(p)],
          [r.pick(["DOB", "Date of birth", "D.O.B."]), d.birth(p)],
          ["Address", d.address(addressLine(p))],
          [r.pick(["Health insurance number", "Insurance no."]), d.health()],
          ["Phone", d.phone(anyPhone(d))],
        ],
        ["colon", "tab", "nextline"],
      );
      d.line(`Assessment: BP ${r.int(110, 150)}/${r.int(70, 95)}, HbA1c ${r.int(5, 9)}.${r.int(0, 9)}%, diagnosis ${decoy.icd(r)}.`);
      d.line(`Follow-up on ${decoyDate(r, "en")}.`);
      d.line("Dr. ", d.fullName(doctor), ", ", orgEmail(d, "clinic"));
    },
  },
  {
    name: "de-sick-note",
    category: "medical-letter",
    lang: "de",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Arbeitsunfähigkeitsbescheinigung");
      d.line("Krankenkasse bzw. Kostenträger: Musterkasse");
      d.line("Name, Vorname des Versicherten: ", d.name(`${p.last}, ${p.first}`), "  geb. am ", d.birth(p));
      d.line(`Kostenträgerkennung: ${decoy.clinicNumber(r)}  Versicherten-Nr.: `, d.health(), "  Status: 1000000");
      d.line(`Betriebsstätten-Nr.: ${decoy.clinicNumber(r)}  Arzt-Nr.: ${decoy.clinicNumber(r)}  Datum: ${decoyDate(r, "de")}`);
      d.line(`arbeitsunfähig seit ${decoyDate(r, "de")} voraussichtlich bis ${decoyDate(r, "de")}`);
      d.line(`Diagnose: ${decoy.icd(r)} G`);
    },
  },
];

/* ------------------------------------------------------ bank statements */

const bankLayouts: Layout[] = [
  {
    name: "de-account-statement",
    category: "bank-statement",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(`Musterbank AG · Kontoauszug ${r.int(1, 12)}/2026 · Blatt 1 von 2`);
      d.line("Kontoinhaber: ", d.fullName(p));
      d.line(d.address(addressLine(p)));
      d.line("IBAN: ", d.iban(), `  BIC: ${decoy.bic(r)}`);
      d.line(`Alter Kontostand vom ${decoyDate(r, "de")}: ${amount(r, "de", 9000)}`);
      d.line("Buchung Valuta Vorgang Betrag");
      for (let i = 0; i < r.int(3, 6); i++) {
        const kind = r.pick(["sepa-dd", "transfer", "card", "salary"]);
        const date = decoyDate(r, "de", true);
        if (kind === "sepa-dd") {
          d.line(`${date} ${date} Lastschrift ${r.pick(COMPANIES)} -${amount(r, "de", 300).replace(/ (EUR|€)$/, "")}`);
          d.line(`  EREF: ${decoy.endToEnd(r)} MREF: ${decoy.mandateReference(r)} CRED: ${decoy.creditorId(r)}`);
          d.line("  IBAN: ", d.iban());
        } else if (kind === "transfer") {
          const other = person(d);
          d.line(`${date} ${date} ${r.pick(["Gutschrift", "Überweisung"])} `, d.fullName(other), ` ${r.pick(["+", "-"])}${amount(r, "de", 900).replace(/ (EUR|€)$/, "")}`);
          d.line(`  Verwendungszweck: ${r.pick(["Miete Oktober", "Geschenk", "Rechnung " + decoy.invoiceNumber(r), "Anteil Urlaub"])}`);
          d.line("  IBAN: ", d.iban(), ` BIC: ${decoy.bic(r)}`);
        } else if (kind === "card")
          d.line(`${date} ${date} Kartenzahlung girocard ${r.pick(["SUPERMARKT", "APOTHEKE", "TANKSTELLE"])} MUSTERSTADT -${amount(r, "de", 120).replace(/ (EUR|€)$/, "")}`);
        else
          d.line(`${date} ${date} Lohn/Gehalt Muster Logistik GmbH +${amount(r, "de", 5000).replace(/ (EUR|€)$/, "")} Pers.-Nr. ${decoy.employeeNumber(r)}`);
      }
      d.line(`Neuer Kontostand: ${amount(r, "de", 9000)}`);
    },
  },
  {
    name: "en-account-statement",
    category: "bank-statement",
    lang: "en",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Example Bank — Account statement");
      d.line("Account holder: ", d.fullName(p));
      d.line("IBAN ", d.iban(), ` BIC ${decoy.bic(r)}`);
      d.line(`Statement period: ${decoyDate(r, "en")} – ${decoyDate(r, "en")}`);
      d.line("Date | Description | Amount | Balance");
      for (let i = 0; i < r.int(3, 6); i++) {
        if (r.chance(0.5)) {
          const other = person(d);
          d.line(`${decoyDate(r, "en")} | Transfer to `, d.fullName(other), " IBAN ", d.iban(), ` Ref ${decoy.endToEnd(r)} | -${amount(r, "en", 900).replace(/^(EUR |€)/, "")} | ${amount(r, "en", 9000).replace(/^(EUR |€)/, "")}`);
        } else
          d.line(`${decoyDate(r, "en")} | Card payment ${r.pick(["GROCER", "PHARMACY", "RAIL"])} | -${amount(r, "en", 90).replace(/^(EUR |€)/, "")} | ${amount(r, "en", 9000).replace(/^(EUR |€)/, "")}`);
      }
    },
  },
  {
    name: "de-credit-card-statement",
    category: "bank-statement",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line(`Kreditkartenabrechnung ${r.int(1, 12)}/2026`);
      d.line("Karteninhaber: ", d.fullName(p));
      d.line(r.pick(["Kartennummer: ", "Karten-Nr. ", "Kreditkarte "]), d.card());
      d.line(`Abrechnungsdatum: ${decoyDate(r, "de")}`);
      for (let i = 0; i < r.int(2, 5); i++)
        d.line(`${decoyDate(r, "de", true)} ${r.pick(["HOTEL EXAMPLE LISBOA", "ONLINE SHOP", "BAHN TICKET", "RESTAURANT MUSTER"])} ${r.chance(0.3) ? `USD ${r.int(5, 400)},00 Kurs 1,0${r.digits(3)} ` : ""}${amount(r, "de", 400)}`);
      d.line(`Der Saldo von ${amount(r, "de", 2000)} wird am ${decoyDate(r, "de")} von Ihrem Konto `, d.iban(), " eingezogen.");
      d.line("Kartensperre und Fragen: ", d.phone("de-service"));
    },
  },
  {
    name: "de-bank-csv",
    category: "bank-statement",
    lang: "de",
    build(d) {
      const r = d.r;
      d.line(`"Buchungstag";"Valutadatum";"Auftraggeber / Begünstigter";"Verwendungszweck";"IBAN";"BIC";"Betrag";"Währung"`);
      for (let i = 0; i < r.int(3, 7); i++) {
        const other = person(d);
        const date = decoyDate(r, "de");
        const compact = d.iban();
        compact.text = compact.text.replace(/\s/g, "").toUpperCase();
        compact.variant = compact.variant!.replace(/:[^:]+$/, ":compact");
        d.line(`"${date}";"${date}";"`, d.fullName(other), `";"${r.pick(["Miete", "Rechnung " + decoy.invoiceNumber(r), "Mitgliedsbeitrag", "EREF " + decoy.endToEnd(r)])}";"`, compact, `";"${decoy.bic(r)}";"${r.pick(["-", ""])}${amount(r, "de", 900).replace(/ (EUR|€)$/, "")}";"EUR"`);
      }
    },
  },
];

/* --------------------------------------------------------------- emails */

const emailLayouts: Layout[] = [
  {
    name: "de-email-thread",
    category: "email",
    lang: "de",
    build(d) {
      const a = person(d);
      const b = person(d);
      const r = d.r;
      d.line("Von: ", d.fullName(a), " <", d.email(a), ">");
      d.line(`Gesendet: Mittwoch, ${r.int(1, 28)}. Oktober 2026 ${decoy.time(r)}`);
      d.line("An: ", d.fullName(b), " <", d.email(b), ">");
      d.line("Betreff: AW: Unterlagen für die Wohnungsbewerbung");
      d.line();
      d.line("Hallo ", d.name(b.first), ",");
      d.line("anbei wie besprochen meine Daten:");
      d.line(r.pick(["Geburtsdatum: ", "geb. ", "Mein Geburtsdatum ist der "]), d.birth(a));
      d.line(r.pick(["Telefon: ", "Handy: ", "Ihr erreicht mich unter "]), d.phone(deMobileOrLandline(d)));
      if (r.chance(0.6)) d.line("Die Kaution überweise ich von meinem Konto ", d.iban(), ".");
      d.line("Viele Grüße");
      d.line(d.fullName(a));
      d.line("--");
      d.line(d.address(addressLine(a)));
      d.line("Mobil: ", d.phone("de-mobile"));
      d.line();
      d.line(`> Am ${decoyDate(r, "de")} um ${decoy.time(r)} schrieb `, d.fullName(b), " <", d.email(b), ">:");
      d.line("> bitte senden Sie mir noch Ihre Telefonnummer und Ihr Geburtsdatum.");
    },
  },
  {
    name: "en-email",
    category: "email",
    lang: "en",
    build(d) {
      const a = person(d);
      const b = person(d);
      const r = d.r;
      d.line("From: ", d.fullName(a), " <", d.email(a), ">");
      d.line(`Sent: ${r.int(1, 28)} October 2026 ${decoy.time(r)}`);
      d.line("To: ", d.email(b));
      d.line("Subject: Re: visa appointment documents");
      d.line();
      d.line("Hi ", d.name(b.first), ",");
      d.line("My passport number is ", d.docNumber(r.pick(["uk-passport", "de-passport", "at-passport"])), " and my date of birth is ", d.birth(a), ".");
      d.line("You can reach me on ", d.phone(anyPhone(d)), " any time after 5pm.");
      d.line("Thanks,");
      d.line(d.name(a.first));
      d.line();
      d.line(`On ${decoyDate(r, "en")} at ${decoy.time(r)}, `, d.fullName(b), " <", d.email(b), "> wrote:");
      d.line("> Could you send your passport details before the appointment?");
    },
  },
  {
    name: "de-email-html-copy",
    category: "email",
    lang: "de",
    html: true,
    build(d) {
      const a = person(d);
      const r = d.r;
      d.line("Sehr geehrte Damen und Herren,");
      d.line(`bitte buchen Sie den offenen Betrag von ${amount(r, "de", 500)} von meinem Konto `, d.iban(), " ab.");
      d.line(`Meine Kundennummer lautet ${decoy.customerNumber(r)}.`);
      d.line("Mit freundlichen Grüßen");
      d.line(d.fullName(a));
      d.line("Tel.: ", d.phone("de-landline"), " | Mobil: ", d.phone("de-mobile"), " | E-Mail: ", d.email(a));
      d.line(d.address(addressLine(a)));
    },
  },
  {
    name: "de-email-obfuscated",
    category: "email",
    lang: "de",
    build(d) {
      const a = person(d);
      const b = person(d);
      const r = d.r;
      const obfuscated = (p: Person) => {
        const style = r.pick(["(at)", " (at) ", "[at]", " [at] ", "(ät)"]);
        const domain = r.pick(["example.org", "verein.example", "example.net"]);
        const dot = r.chance(0.3);
        return {
          text: `${p.emailLocal}${style}${dot ? domain.replace(/\./g, "(dot)") : domain}`,
          kind: "EMAIL" as const,
          variant: `email:obfuscated${dot ? "-dot" : ""}`,
        };
      };
      d.line("Newsletter Sportverein Musterstadt e.V. – Oktober 2026");
      d.line(`Das Training am ${decoyDate(r, "de")} fällt aus.`);
      d.line("Ansprechpartnerin Jugend: ", d.fullName(a), ", ", obfuscated(a), ", Tel. ", d.phone(deMobileOrLandline(d)));
      d.line("Kassenwart: ", d.fullName(b), ", ", obfuscated(b));
      d.line("Abmeldung vom Newsletter: ", d.email("newsletter", "verein.example"));
    },
  },
];

/* ---------------------------------------------------------------- chats */

const chatLayouts: Layout[] = [
  {
    name: "de-whatsapp-export",
    category: "chat",
    lang: "de",
    chat: true,
    build(d) {
      const a = person(d);
      const b = person(d);
      const r = d.r;
      const stamp = () =>
        `[${decoyDate(r, "de", true)}${r.pick(["25", "26"])}, ${decoy.time(r)}:${String(r.int(0, 59)).padStart(2, "0")}] `;
      d.line(stamp(), d.fullName(a), ": Kannst du mir deine IBAN schicken? Dann überweise ich dir das Geld fürs Konzert");
      d.line(stamp(), d.fullName(b), ": ", r.pick(["klar: ", "", "hier: "]), d.iban());
      d.line(stamp(), d.fullName(a), ": danke! 👍");
      d.line(stamp(), d.fullName(b), ": meine neue nummer ist übrigens ", d.phone("de-mobile"));
      if (r.chance(0.5)) d.line(stamp(), d.fullName(a), ": und schick mir mal deine mail");
      d.line(stamp(), d.fullName(b), ": ", d.email(b));
      if (r.chance(0.5)) d.line(stamp(), d.fullName(a), ": wann hast du nochmal geburtstag? ", d.name(b.first), " meinte ", d.birth(b));
    },
  },
  {
    name: "en-chat-export",
    category: "chat",
    lang: "en",
    chat: true,
    build(d) {
      const a = person(d);
      const b = person(d);
      const r = d.r;
      const stamp = () => `${decoyDate(r, "en")}, ${decoy.time(r)} - `;
      d.line(stamp(), d.name(a.first), ": can you book the flat for us? you need my details");
      d.line(stamp(), d.name(b.first), ": sure send them");
      d.line(stamp(), d.name(a.first), ": dob ", d.birth(a), ", phone ", d.phone(anyPhone(d)));
      d.line(stamp(), d.name(a.first), ": email is ", d.email(a));
      if (r.chance(0.6)) d.line(stamp(), d.name(a.first), ": use my card ", d.card(), " exp 0", String(r.int(1, 9)), "/2", String(r.int(7, 9)));
    },
  },
  {
    name: "de-chat-plain",
    category: "chat",
    lang: "de",
    chat: true,
    build(d) {
      const dad = person(d);
      const r = d.r;
      d.line("Ich: Kannst du mir die Steuer-ID von Papa geben? Brauche sie für die Erklärung");
      d.line("Mama: ", d.taxId());
      d.line("Ich: Und seine Rentenversicherungsnummer?");
      d.line("Mama: ", d.pension(dad));
      d.line("Ich: Krankenkassenkarte?");
      d.line("Mama: ", d.health());
      if (r.chance(0.5)) d.line("Mama: ruf sonst Papa an ", d.phone("de-mobile"));
    },
  },
  {
    name: "en-support-chat",
    category: "chat",
    lang: "en",
    chat: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Customer: Hi, my card ", d.card(), " was charged twice for order ", `${r.digits(3)}-${r.digits(7)}`);
      d.line("Agent: Sorry about that. Can you confirm your date of birth?");
      d.line("Customer: ", d.birth(p));
      d.line("Agent: And the phone number on the account?");
      const withEmail = r.chance(0.5);
      d.line("Customer: ", d.phone(anyPhone(d)), ...(withEmail ? [" or email ", d.email(p)] : []));
      d.line("Agent: Thanks, the refund will arrive in 3-5 business days.");
    },
  },
];

/* ---------------------------------------------------------------- forms */

const formLayouts: Layout[] = [
  {
    name: "de-registration-form",
    category: "form",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Anmeldung bei der Meldebehörde");
      d.kv(
        [
          ["Familienname", d.name(p.last)],
          ["Vornamen", d.name(p.first)],
          ["Geburtsdatum", d.birth(p)],
          ["Geburtsort", p.city],
          ["Staatsangehörigkeit", "deutsch"],
          ["Neue Wohnung", d.address(addressLine(p))],
          [r.pick(["Personalausweis / Reisepass Nr.", "Ausweisnummer", "Pass- oder Ausweisnummer"]), d.docNumber(r.pick(["de-id", "de-passport"]))],
          ["Telefon (freiwillig)", d.phone(deMobileOrLandline(d))],
          ["E-Mail (freiwillig)", d.email(p)],
        ],
        ["colon", "tab", "dots", "nextline"],
      );
      d.line(`Einzugsdatum: ${decoyDate(r, "de")}`);
    },
  },
  {
    name: "de-account-opening",
    category: "form",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Antrag auf Eröffnung eines Girokontos");
      d.line("Angaben zur Person");
      d.kv(
        [
          ["Name, Vorname", d.name(`${p.last}, ${p.first}`)],
          ["Geburtsdatum", d.birth(p)],
          [r.pick(["Steuerliche Identifikationsnummer", "Steuer-ID"]), d.taxId()],
          ["Telefon", d.phone(deMobileOrLandline(d))],
          ["E-Mail", d.email(p)],
          ["Referenzkonto (IBAN)", d.iban()],
        ],
        ["colon", "tab", "dots", "nextline"],
      );
      d.line("Legitimation: Personalausweis, Nr. ", d.docNumber("de-id"), `, ausgestellt am ${decoyDate(r, "de")}, gültig bis ${decoyDate(r, "de")}, Behörde: Stadt Musterstadt`);
    },
  },
  {
    name: "en-application-form",
    category: "form",
    lang: "en",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Application form – residence registration support");
      d.kv(
        [
          ["Surname", d.name(p.last)],
          ["Given names", d.name(p.first)],
          ["Date of birth", d.birth(p)],
          [r.pick(["Passport number", "Passport no.", "Travel document number"]), d.docNumber(r.pick(["uk-passport", "de-passport", "at-passport"]))],
          ["Phone number", d.phone(anyPhone(d))],
          ["Email address", d.email(p)],
          ["Bank account (IBAN)", d.iban()],
        ],
        ["colon", "tab", "nextline"],
      );
      d.line(`Signed: ${decoyDate(r, "en")}`);
    },
  },
  {
    name: "de-sepa-mandate",
    category: "form",
    lang: "de",
    pdf: true,
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("SEPA-Lastschriftmandat");
      d.line("Zahlungsempfänger: Sportverein Musterstadt e.V., Vereinsweg 1, 12345 Musterstadt");
      d.line(`Gläubiger-Identifikationsnummer: ${decoy.creditorId(r)}`);
      d.line(`Mandatsreferenz: ${decoy.mandateReference(r)}`);
      d.kv(
        [
          ["Kontoinhaber", d.fullName(p)],
          ["Anschrift", d.address(addressLine(p))],
          ["IBAN", d.iban()],
          ["BIC", decoy.bic(r)],
          ["Ort, Datum", `${p.city}, ${decoyDate(r, "de")}`],
        ],
        ["colon", "tab", "nextline"],
      );
      d.line("Unterschrift: ______________________");
    },
  },
  {
    name: "de-insurance-claim",
    category: "form",
    lang: "de",
    build(d) {
      const p = person(d);
      const r = d.r;
      d.line("Schadenmeldung Hausratversicherung");
      d.line(`Versicherungsscheinnummer: ${decoy.contractNumber(r)}   Schadennummer: ${r.digits(2)}-${r.digits(6)}`);
      d.kv(
        [
          ["Versicherungsnehmer", d.fullName(p)],
          ["Geburtsdatum", d.birth(p)],
          ["Telefon tagsüber", d.phone(deMobileOrLandline(d))],
          ["E-Mail", d.email(p)],
          ["IBAN für die Auszahlung", d.iban()],
        ],
        ["colon", "dots", "nextline"],
      );
      d.line(`Schadentag: ${decoyDate(r, "de")}, geschätzte Schadenhöhe ${amount(r, "de", 5000)}`);
    },
  },
];

/* --------------------------------------------------------------- tables */

type Column = { header: [string, string]; cell: (d: Doc, p: Person) => Item };
const COLUMNS: Record<string, Column> = {
  name: { header: ["Name", "Name"], cell: (d, p) => d.fullName(p) },
  birth: { header: ["Geburtsdatum", "Date of birth"], cell: (d, p) => d.birth(p) },
  phone: { header: ["Telefon", "Phone"], cell: (d) => d.phone(anyPhone(d)) },
  email: { header: ["E-Mail", "Email"], cell: (d, p) => d.email(p) },
  iban: { header: ["IBAN", "IBAN"], cell: (d) => d.iban() },
  taxid: { header: ["Steuer-ID", "Tax ID"], cell: (d) => d.taxId() },
  pension: { header: ["SV-Nummer", "Social security no."], cell: (d, p) => d.pension(p) },
  health: { header: ["Versichertennr.", "Insurance no."], cell: (d) => d.health() },
  passport: { header: ["Ausweis-Nr.", "Passport no."], cell: (d) => d.docNumber(d.de ? "de-id" : d.r.pick(["uk-passport", "de-passport"])) },
  staff: { header: ["Personalnr.", "Staff no."], cell: (d) => decoy.employeeNumber(d.r) },
  start: { header: ["Eintritt", "Start date"], cell: (d) => decoyDate(d.r, d.ctx.lang) },
  salary: { header: ["Gehalt", "Salary"], cell: (d) => amount(d.r, d.ctx.lang, 8000) },
};

function table(d: Doc, style: "csv" | "csv-comma" | "markdown" | "tsv" | "aligned") {
  const r = d.r;
  const identifierColumns = r.shuffle(["birth", "phone", "email", "iban", "taxid", "pension", "health", "passport"]).slice(0, r.int(2, 4));
  const decoyColumns = r.shuffle(["staff", "start", "salary"]).slice(0, r.int(0, 2));
  const columns = ["name", ...r.shuffle([...identifierColumns, ...decoyColumns])];
  const headers = columns.map((c) => COLUMNS[c].header[d.de ? 0 : 1]);
  const sep = style === "csv" ? ";" : style === "csv-comma" ? "," : style === "tsv" ? "\t" : style === "markdown" ? " | " : "   ";
  const quote = (s: string) => (style === "csv-comma" ? `"${s}"` : s);
  const wrap = (items: Item[]) => (style === "markdown" ? ["| ", ...items, " |"] : items);
  d.line(...wrap(headers.map(quote).flatMap((h, i) => (i ? [sep, h] : [h]))));
  if (style === "markdown") d.line(`|${columns.map(() => " --- ").join("|")}|`);
  for (let row = 0; row < r.int(3, 7); row++) {
    const p = person(d);
    const cells: Item[] = [];
    columns.forEach((c, i) => {
      if (i) cells.push(sep);
      const cell = COLUMNS[c].cell(d, p);
      if (style === "csv-comma") cells.push('"', cell, '"');
      else cells.push(cell);
    });
    d.line(...wrap(cells));
  }
}

const tableLayouts: Layout[] = [
  { name: "de-csv-semicolon", category: "table", lang: "de", build: (d) => table(d, "csv") },
  { name: "en-csv-comma", category: "table", lang: "en", build: (d) => table(d, "csv-comma") },
  { name: "de-markdown-table", category: "table", lang: "de", build: (d) => table(d, "markdown") },
  { name: "en-tsv", category: "table", lang: "en", build: (d) => table(d, "tsv") },
  { name: "de-aligned-columns", category: "table", lang: "de", pdf: true, build: (d) => table(d, "aligned") },
];

/* --------------------------------------------- identity documents (scan) */

const MRZ_VALUES: Record<string, number> = { "<": 0 };
for (let i = 0; i < 10; i++) MRZ_VALUES[String(i)] = i;
for (let i = 0; i < 26; i++) MRZ_VALUES[String.fromCharCode(65 + i)] = 10 + i;
const mrzCheck = (s: string) =>
  String([...s].reduce((sum, ch, i) => sum + MRZ_VALUES[ch] * [7, 3, 1][i % 3], 0) % 10);
const mrzName = (p: Person) =>
  p.last.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase() +
  "<<" +
  p.first.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase();
const yymmdd = (p: Person) =>
  `${String(p.birth.year % 100).padStart(2, "0")}${String(p.birth.month).padStart(2, "0")}${String(p.birth.day).padStart(2, "0")}`;

const scanOnlyLayouts: Layout[] = [
  {
    name: "de-id-card-scan",
    category: "scan-ocr",
    lang: "de",
    build(d) {
      const p = person(d);
      const r = d.r;
      const number = makeDocumentNumber(r, "de-id");
      const expiry = `${r.int(27, 35)}${String(r.int(1, 12)).padStart(2, "0")}${String(r.int(1, 28)).padStart(2, "0")}`;
      d.line("BUNDESREPUBLIK DEUTSCHLAND");
      d.line("PERSONALAUSWEIS IDENTITY CARD CARTE D'IDENTITÉ");
      d.line({ text: number, kind: "ID-NUMBER", variant: "doc:de-id-front" });
      d.line("Name/Surname/Nom");
      d.line(d.name(p.last.toUpperCase()));
      d.line("Vornamen/Given names/Prénoms");
      d.line(d.name(p.first.toUpperCase()));
      d.line("Geburtstag/Date of birth/Date de naissance");
      d.line({ text: `${String(p.birth.day).padStart(2, "0")}.${String(p.birth.month).padStart(2, "0")}.${p.birth.year}`, kind: "BIRTH-DATE", variant: "birth:id-card" });
      d.line("Staatsangehörigkeit/Nationality/Nationalité DEUTSCH");
      d.line(`Geburtsort/Place of birth/Lieu de naissance ${p.city.toUpperCase()}`);
      d.line(`Gültig bis/Date of expiry/Date d'expiration ${expiry.slice(4)}.${expiry.slice(2, 4)}.20${expiry.slice(0, 2)}`);
      d.line("IDD<<", { text: number, kind: "ID-NUMBER", variant: "doc:mrz" }, mrzCheck(number) + "<".repeat(15));
      d.line({ text: yymmdd(p), kind: "BIRTH-DATE", variant: "birth:mrz" }, mrzCheck(yymmdd(p)) + "<" + expiry + mrzCheck(expiry) + "D" + "<".repeat(13) + r.digits(1));
      d.line(d.name((mrzName(p) + "<".repeat(30)).slice(0, 30)));
    },
  },
  {
    name: "de-passport-scan",
    category: "scan-ocr",
    lang: "de",
    build(d) {
      const p = person(d);
      const r = d.r;
      const number = makeDocumentNumber(r, "de-passport");
      const expiry = `${r.int(27, 35)}${String(r.int(1, 12)).padStart(2, "0")}${String(r.int(1, 28)).padStart(2, "0")}`;
      d.line("REISEPASS PASSPORT PASSEPORT");
      d.line("Typ/Type P Kode/Code D Pass-Nr./Passport No./Passeport N°");
      d.line({ text: number, kind: "ID-NUMBER", variant: "doc:de-passport-front" });
      d.line("Name/Surname/Nom ", d.name(p.last.toUpperCase()));
      d.line("Vornamen/Given names/Prénoms ", d.name(p.first.toUpperCase()));
      d.line("Geburtstag/Date of birth/Date de naissance");
      d.line({ text: `${String(p.birth.day).padStart(2, "0")}.${String(p.birth.month).padStart(2, "0")}.${p.birth.year}`, kind: "BIRTH-DATE", variant: "birth:passport" });
      d.line(d.name(("P<D<<" + mrzName(p) + "<".repeat(44)).slice(0, 44)));
      d.line({ text: number, kind: "ID-NUMBER", variant: "doc:mrz" }, mrzCheck(number) + "D<<", { text: yymmdd(p), kind: "BIRTH-DATE", variant: "birth:mrz" }, mrzCheck(yymmdd(p)) + "<" + expiry + mrzCheck(expiry) + "<".repeat(14) + "<" + r.digits(1));
    },
  },
];

export const LAYOUTS: Layout[] = [
  ...invoiceLayouts,
  ...taxLayouts,
  ...contractLayouts,
  ...cvLayouts,
  ...medicalLayouts,
  ...bankLayouts,
  ...emailLayouts,
  ...chatLayouts,
  ...formLayouts,
  ...tableLayouts,
];
export const SCAN_ONLY_LAYOUTS = scanOnlyLayouts;
