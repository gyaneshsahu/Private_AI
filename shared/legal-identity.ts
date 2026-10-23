// The operator identity behind the imprint (Impressum) and the privacy
// policy. The values live in deployment/legal-identity.json, which the owner
// fills; nothing here is invented, and a placeholder stays visible as "not yet
// named" until the owner replaces it. The production candidate build refuses
// while any placeholder remains (scripts/policy-placeholders.ts).
import { z } from "zod";
import raw from "../deployment/legal-identity.json";

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

/** The imprint (Impressum) as shown in the app and generated into docs/. */
export function imprintSections(
  identity: LegalIdentity = LEGAL_IDENTITY,
): LegalSection[] {
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
      text: "CometRow is the public name of the service; PrivateAI is its working name in the source code and documents. Both refer to the same service and the same operator.",
    },
  ];
}

export function imprintText(identity: LegalIdentity = LEGAL_IDENTITY): string {
  return imprintSections(identity)
    .map((section) => `${section.heading}\n${section.text}`)
    .join("\n\n");
}
