// The German legal texts (drafts, binding once approved) against their English sources.
import { expect, it } from "vitest";
import { legalTexts } from "../scripts/record-legal-pairs";
import { HEALTH_CONSENT, HEALTH_CONSENT_DE, healthConsentText } from "../shared/health-consent";
import {
  IMPRINT_DE_STATUS,
  LEGAL_IDENTITY,
  identityDe,
  imprintSections,
} from "../shared/legal-identity";
import {
  PRIVACY_COPY,
  PRIVACY_COPY_DE_STATUS,
  privacyCopy,
  privacyText,
} from "../shared/privacy-copy";
import { POLICY_DE_STATUS, POLICY_SECTIONS, POLICY_SECTIONS_DE, privacyPolicyText } from "../shared/privacy-policy";
import { PROVIDER_DISCLOSURE_DE_STATUS } from "../shared/provider-disclosure";

const GERMAN = "draft-needs-owner-approval; legal read required";

it("marks every German text as a draft that needs owner approval and a legal read", () => {
  for (const status of [
    PRIVACY_COPY_DE_STATUS,
    POLICY_DE_STATUS,
    PROVIDER_DISCLOSURE_DE_STATUS,
    IMPRINT_DE_STATUS,
    HEALTH_CONSENT_DE.status,
  ])
    expect(status).toBe(GERMAN);
});

it("keeps today's English output when no language is given", () => {
  expect(privacyCopy()).toBe(PRIVACY_COPY);
  expect(privacyText("privatemode", "en")).toBe(privacyText("privatemode"));
  expect(privacyPolicyText("tinfoil", "en")).toBe(privacyPolicyText("tinfoil"));
  expect(healthConsentText("en")).toBe(healthConsentText());
  expect(imprintSections(LEGAL_IDENTITY, "en")).toEqual(imprintSections());
});

it("has the same sections in the same order, and Privatemode changes the same sections in both", () => {
  for (const provider of ["tinfoil", "privatemode"] as const) {
    const en = privacyCopy(provider);
    const de = privacyCopy(provider, "de");
    expect(de.map((s) => s.id)).toEqual(en.map((s) => s.id));
    const blocks = (text: string) => text.split("\n\n").length;
    expect(blocks(privacyPolicyText(provider, "de"))).toBe(blocks(privacyPolicyText(provider)));
  }
  expect(POLICY_SECTIONS_DE.map((s) => s.id)).toEqual(POLICY_SECTIONS.map((s) => s.id));
  const changed = privacyCopy("privatemode", "de")
    .filter((s, i) => s.text !== privacyCopy("tinfoil", "de")[i].text)
    .map((s) => s.id);
  expect(changed).toEqual(["sealed", "ours", "provider", "limits", "research"]);
  expect(privacyPolicyText(undefined, "de").split("\n\n")[0]).toBe("CometRow Datenschutzerklärung, 22. Oktober 2026");
  const headings = privacyPolicyText("privatemode", "de").split("\n\n").slice(1, 3).map((b) => b.split("\n")[0]);
  expect(headings).toEqual(["Wer verantwortlich ist", "Wer Ihre Nachrichten verarbeitet"]);
});

it("states the same numbers, addresses and links in both languages", () => {
  const facts = (text: string) => (text.match(/\{\{[^}]+\}\}|https?:\/\/\S+|[\w.]+@[\w.]+\w|\d+/g) ?? []).sort();
  for (const [name, pair] of Object.entries(legalTexts())) expect(facts(pair.de), name).toEqual(facts(pair.en));
});

it("carries the key claims and no absolute promise in German", () => {
  const tinfoil = privacyPolicyText("tinfoil", "de").toLowerCase();
  const privatemode = privacyPolicyText("privatemode", "de").toLowerCase();
  for (const claim of [
    "namen, adressen und andere angaben",
    "wir sehen nie, was sie gefragt haben",
    "von selbst leert",
    "ausgabengrenzen am sicheren server sind weich",
    "es gibt keinen anonymen modus",
    "erst eingeschaltet, nachdem unsere prüfungen",
    "90 tage auf und löschen sie dann",
    "verarbeitet sie in den vereinigten staaten",
  ])
    expect(tinfoil, claim).toContain(claim);
  for (const claim of [
    "mindestens alle 10 minuten",
    "umfasst nicht den grafikprozessor",
    "erreichen unsere systeme verschlossen",
    "der speicher jedes kontos wird",
    "tokenzahlen pro schlüssel dauerhaft",
    "nur in der eu und im europäischen wirtschaftsraum",
    "„bei regeln, gebühren und fristen immer suchen“",
    "diese einstellungen sind ausgeschaltet",
  ])
    expect(privatemode, claim).toContain(claim);
  for (const tinfoilOnly of ["sind weich", "veröffentlichten kosten", "minuten bis zu einigen stunden", "vereinigten staaten"])
    expect(privatemode, tinfoilOnly).not.toContain(tinfoilOnly);
  const all = Object.values(legalTexts()).map((pair) => pair.de).join("\n").toLowerCase();
  for (const forbidden of ["garantie", "garantiert", "100 %", "vollständig anonym", "unknackbar", "militär"])
    expect(all, forbidden).not.toContain(forbidden);
});

it("translates the imprint and the identity's free-text fields", () => {
  expect(imprintSections(LEGAL_IDENTITY, "de").map((s) => s.heading)).toEqual([
    "Diensteanbieter",
    "Kontakt",
    "Verantwortlich für den Inhalt",
    "Streitbeilegung",
    "Namen",
  ]);
  const de = identityDe();
  for (const field of ["legalForm", "country", "dataProtectionOfficer", "supervisoryAuthorityNote"] as const)
    expect(de[field], field).not.toBe(LEGAL_IDENTITY[field]);
  const text = imprintSections(LEGAL_IDENTITY, "de").map((s) => s.text).join("\n");
  expect(text).toContain("48149 Münster, Deutschland");
  expect(text).toContain("Bis zum 25. Oktober 2026 hieß er PrivateAI");
});

it("keeps the German health consent provider-neutral, with the same version and the same facts", () => {
  expect(HEALTH_CONSENT_DE.version).toBe(HEALTH_CONSENT.version);
  expect(HEALTH_CONSENT_DE.paragraphs.length).toBe(HEALTH_CONSENT.paragraphs.length);
  const text = `${healthConsentText("de")}\n${HEALTH_CONSENT_DE.declinedNote}`.toLowerCase();
  for (const forbidden of ["tinfoil", "privatemode", "edgeless", "garant", "100 %", "vollständig"])
    expect(text, forbidden).not.toContain(forbidden);
  expect(text).toContain("gesundheitsangaben nicht");
  expect(text).toContain("sie können nein sagen und cometrow trotzdem nutzen");
  expect(text).toContain("jederzeit unter einstellungen, datenschutz & daten ändern");
});
