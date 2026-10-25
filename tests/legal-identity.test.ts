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
    // Filled by the owner on 24 October 2026: no placeholder remains.
    expect(identityPlaceholders()).toEqual([]);
    expect(
      identityPlaceholders({
        ...LEGAL_IDENTITY,
        operatorName: "not yet named",
        addressLines: ["not yet named"],
        privacyContactEmail: "not yet named",
        incidentContactEmail: "not yet named",
        supportContactEmail: "not yet named",
        responsibleForContent: "not yet named",
      }),
    ).toEqual([
      "operatorName",
      "addressLines[0]",
      "privacyContactEmail",
      "incidentContactEmail",
      "supportContactEmail",
      "responsibleForContent",
    ]);
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
    expect(text).not.toContain("not yet named");
    expect(text).toContain("48149 Münster");
    expect(text).toContain("Until 25 October 2026 it was called PrivateAI");
  });

  it("feeds the policy's responsibility and contact sections from the same identity, so the placeholder gate sees them", () => {
    const who = POLICY_SECTIONS.find((s) => s.id === "who")!;
    const contact = POLICY_SECTIONS.find((s) => s.id === "contact")!;
    expect(who.text).toContain(LEGAL_IDENTITY.operatorName);
    expect(contact.text).toContain(LEGAL_IDENTITY.incidentContactEmail);
    expect(contact.text).toContain(
      "download the records we hold about your account",
    );
    expect(policyPlaceholders()).toEqual([]);
  });

  it("keeps the generated imprint document identical to the source", async () => {
    const published = await readFile("docs/imprint-20261023.md", "utf8");
    expect(published.replace(/\r\n/g, "\n")).toBe(
      renderImprintMarkdown().replace(/\r\n/g, "\n"),
    );
  });
});
