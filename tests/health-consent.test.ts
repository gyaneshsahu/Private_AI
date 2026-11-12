import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { HEALTH_CONSENT, healthConsentText } from "../shared/health-consent";

const doc = readFileSync("docs/health-consent-draft-20261112.md", "utf8").replace(/\r\n/g, "\n");

it("stays a draft that needs owner approval, in the app and in the document", () => {
  expect(HEALTH_CONSENT.status).toBe("draft-needs-owner-approval");
  expect(doc).toContain("DRAFT, needs owner approval");
  for (const paragraph of HEALTH_CONSENT.paragraphs) expect(doc).toContain(paragraph);
  expect(doc).toContain(HEALTH_CONSENT.declinedNote);
});

it("names no provider and makes no absolute promise", () => {
  const text = `${healthConsentText()}\n${HEALTH_CONSENT.declinedNote}`.toLowerCase();
  for (const forbidden of ["tinfoil", "privatemode", "edgeless", "guarantee", "never", "100%", "completely", "cannot be"])
    expect(text, forbidden).not.toContain(forbidden);
  // The facts it must state plainly.
  expect(text).toContain("health details are not");
  expect(text).toContain("you can say no and still use cometrow");
  expect(text).toContain("change your choice at any time");
});
