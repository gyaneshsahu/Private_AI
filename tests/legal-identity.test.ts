import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  LEGAL_IDENTITY,
  identityPlaceholders,
  imprintSections,
  imprintText,
  legalIdentitySchema,
} from "../shared/legal-identity";
import { POLICY_SECTIONS, policyPlaceholders } from "../shared/privacy-policy";
import { renderImprintMarkdown } from "../scripts/privacy-copy";

describe("operator identity, imprint and policy wiring", () => {
  it("reads deployment/legal-identity.json and lists every placeholder by field", () => {
    expect(legalIdentitySchema.safeParse(LEGAL_IDENTITY).success).toBe(true);
    const placeholders = identityPlaceholders();
    // Current state: the owner has not published the identity yet.
    expect(placeholders).toEqual([
      "operatorName",
      "addressLines[0]",
      "privacyContactEmail",
      "incidentContactEmail",
      "supportContactEmail",
      "responsibleForContent",
    ]);
    expect(
      identityPlaceholders({
        ...LEGAL_IDENTITY,
        operatorName: "Example Operator",
        addressLines: ["Example Street 1", "12345 Example"],
        privacyContactEmail: "privacy@example.test",
        incidentContactEmail: "security@example.test",
        supportContactEmail: "support@example.test",
        responsibleForContent: "Example Operator",
      }),
    ).toEqual([]);
  });

  it("renders the imprint sections required of a German service provider", () => {
    const headings = imprintSections().map((s) => s.heading);
    expect(headings).toEqual([
      "Service provider",
      "Contact",
      "Responsible for content",
      "Dispute resolution",
      "Names",
    ]);
    const text = imprintText();
    expect(text).toContain("Germany");
    expect(text).toContain("Security incidents:");
    expect(text).toContain("not yet named");
    expect(text).toContain("CometRow is the public name");
  });

  it("feeds the policy's responsibility and contact sections from the same identity, so the placeholder gate sees them", () => {
    const who = POLICY_SECTIONS.find((s) => s.id === "who")!;
    const contact = POLICY_SECTIONS.find((s) => s.id === "contact")!;
    expect(who.text).toContain(LEGAL_IDENTITY.operatorName);
    expect(contact.text).toContain(LEGAL_IDENTITY.incidentContactEmail);
    expect(contact.text).toContain(
      "download the records we hold about your account",
    );
    expect(policyPlaceholders().map((p) => p.id)).toEqual([
      "who",
      "cannot",
      "contact",
    ]);
  });

  it("keeps the generated imprint document identical to the source", async () => {
    const published = await readFile("docs/imprint-20261023.md", "utf8");
    expect(published.replace(/\r\n/g, "\n")).toBe(
      renderImprintMarkdown().replace(/\r\n/g, "\n"),
    );
  });
});
