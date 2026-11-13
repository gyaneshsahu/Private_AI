// The operator identity behind the imprint (Impressum) and the privacy
// policy. The values live in deployment/legal-identity.json, which the owner
// fills; nothing here is invented, and a placeholder stays visible as "not yet
// named" until the owner replaces it. The production candidate build refuses
// while any placeholder remains (scripts/policy-placeholders.ts).
import { z } from "zod";
import raw from "../deployment/legal-identity.json";
import type { Lang } from "../src/i18n";

export const PLACEHOLDER = "not yet named";

export const legalIdentitySchema = z
  .object({
    note: z.string().optional(),
    operatorName: z.string().min(1).max(200),
    legalForm: z.string().min(1).max(200),
    addressLines: z.array(z.string().min(1).max(200)).min(1).max(6),
    country: z.string().min(1).max(100),
    privacyContactEmail: z.string().min(1).max(254),
    incidentContactEmail: z.string().min(1).max(254),
    supportContactEmail: z.string().min(1).max(254),
    vatId: z.string().max(40),
    responsibleForContent: z.string().min(1).max(200),
    dataProtectionOfficer: z.string().min(1).max(200),
    supervisoryAuthorityNote: z.string().max(500),
  })
  .strict();
export type LegalIdentity = z.infer<typeof legalIdentitySchema>;

export const LEGAL_IDENTITY: LegalIdentity = legalIdentitySchema.parse(raw);

/** Every field still carrying the placeholder, by name. */
export function identityPlaceholders(
  identity: LegalIdentity = LEGAL_IDENTITY,
): string[] {
  const out: string[] = [];
  const check = (name: string, value: string) => {
    if (value.trim().toLowerCase() === PLACEHOLDER) out.push(name);
  };
  check("operatorName", identity.operatorName);
  identity.addressLines.forEach((line, i) => check(`addressLines[${i}]`, line));
  check("privacyContactEmail", identity.privacyContactEmail);
  check("incidentContactEmail", identity.incidentContactEmail);
  check("supportContactEmail", identity.supportContactEmail);
  check("responsibleForContent", identity.responsibleForContent);
  return out;
}

export interface LegalSection {
  id: string;
  heading: string;
  text: string;
}

/**
 * German for the identity's free-text fields, looked up by their exact English value.
 * shortcut: a value with no entry here stays English in the German texts; the legal-text pair
 * check flags the English change, so add the German entry then.
 */
const IDENTITY_DE: Readonly<Record<string, string>> = {
  "individual (natural person), Germany": "Einzelperson (natürliche Person), Deutschland",
  Germany: "Deutschland",
  "none appointed": "nicht benannt",
  "The competent data protection authority is the Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Düsseldorf.":
    "Zuständige Datenschutzaufsichtsbehörde ist die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Düsseldorf.",
};

/** The identity with its free-text fields in German (names, addresses and emails unchanged). */
export function identityDe(identity: LegalIdentity = LEGAL_IDENTITY): LegalIdentity {
  const de = (value: string) => IDENTITY_DE[value] ?? value;
  return {
    ...identity,
    legalForm: de(identity.legalForm),
    country: de(identity.country),
    dataProtectionOfficer: de(identity.dataProtectionOfficer),
    supervisoryAuthorityNote: de(identity.supervisoryAuthorityNote),
  };
}

/** DRAFT, NEEDS OWNER APPROVAL, LEGAL READ REQUIRED (13 November 2026): the German imprint. */
export const IMPRINT_DE_STATUS = "draft-needs-owner-approval; legal read required";
function imprintSectionsDe(identity: LegalIdentity): LegalSection[] {
  const id = identityDe(identity);
  return [
    {
      id: "operator",
      heading: "Diensteanbieter",
      text: `${id.operatorName}, ${id.legalForm}. ${id.addressLines.join(", ")}, ${id.country}.`,
    },
    {
      id: "contact",
      heading: "Kontakt",
      text: `Support: ${id.supportContactEmail}. Datenschutzanfragen: ${id.privacyContactEmail}. Sicherheitsvorfälle: ${id.incidentContactEmail}.${
        id.vatId
          ? ` Umsatzsteuer-Identifikationsnummer: ${id.vatId}.`
          : " Es besteht keine Umsatzsteuer-Identifikationsnummer; der Betreiber ist zum Zeitpunkt der Erstellung nicht für die Umsatzsteuer registriert."
      }`,
    },
    {
      id: "responsible",
      heading: "Verantwortlich für den Inhalt",
      text: `${id.responsibleForContent}, Anschrift wie oben.`,
    },
    {
      id: "dispute",
      heading: "Streitbeilegung",
      text: "Der Betreiber ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Die Plattform der Europäischen Kommission zur Online-Streitbeilegung ist nicht mehr in Betrieb.",
    },
    {
      id: "names",
      heading: "Namen",
      text: "CometRow ist der Name des Dienstes. Bis zum 25. Oktober 2026 hieß er PrivateAI, und einige technische Bezeichner im Quellcode verwenden noch diesen Namen. Beide Namen bezeichnen denselben Dienst und denselben Betreiber.",
    },
  ];
}

/** The imprint (Impressum) as shown in the app and generated into docs/. */
export function imprintSections(
  identity: LegalIdentity = LEGAL_IDENTITY,
  lang: Lang = "en",
): LegalSection[] {
  if (lang === "de") return imprintSectionsDe(identity);
  return [
    {
      id: "operator",
      heading: "Service provider",
      text: `${identity.operatorName}, ${identity.legalForm}. ${identity.addressLines.join(", ")}, ${identity.country}.`,
    },
    {
      id: "contact",
      heading: "Contact",
      text: `Support: ${identity.supportContactEmail}. Privacy requests: ${identity.privacyContactEmail}. Security incidents: ${identity.incidentContactEmail}.${
        identity.vatId
          ? ` VAT identification number: ${identity.vatId}.`
          : " No VAT identification number is held; the operator is not registered for VAT at the time of writing."
      }`,
    },
    {
      id: "responsible",
      heading: "Responsible for content",
      text: `${identity.responsibleForContent}, at the address above.`,
    },
    {
      id: "dispute",
      heading: "Dispute resolution",
      text: "The operator is neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board. The European Commission's platform for online dispute resolution is no longer in operation.",
    },
    {
      id: "names",
      heading: "Names",
      text: "CometRow is the name of the service. Until 25 October 2026 it was called PrivateAI, and some technical identifiers in the source code still use that name. Both names refer to the same service and the same operator.",
    },
  ];
}

export function imprintText(identity: LegalIdentity = LEGAL_IDENTITY, lang: Lang = "en"): string {
  return imprintSections(identity, lang)
    .map((section) => `${section.heading}\n${section.text}`)
    .join("\n\n");
}
