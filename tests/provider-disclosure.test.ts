import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  PROVIDER_DISCLOSURE,
  PROVIDER_DISCLOSURE_HEADING,
  PROVIDER_DISCLOSURE_STATUS,
} from "../shared/provider-disclosure";
import { POLICY_SECTIONS, privacyPolicyText } from "../shared/privacy-policy";

const doc = readFileSync("docs/provider-disclosure-draft-20261112.md", "utf8").replace(/\r\n/g, "\n");

it("stays a draft and matches its document, with sources for every entry", () => {
  expect(PROVIDER_DISCLOSURE_STATUS).toBe("draft-needs-owner-approval");
  expect(doc).toContain("DRAFT, needs owner approval");
  for (const entry of Object.values(PROVIDER_DISCLOSURE)) {
    expect(doc).toContain(entry.text);
    expect(entry.sources.length).toBeGreaterThan(0);
    for (const source of entry.sources) expect(doc).toContain(source);
  }
});

it("leaves the approved policy unchanged unless a provider is given", () => {
  const plain = privacyPolicyText();
  expect(plain).not.toContain(PROVIDER_DISCLOSURE_HEADING);
  expect(plain.split("\n\n").length).toBe(POLICY_SECTIONS.length + 1);
});

it("adds the provider section right after who is responsible, naming where messages are processed", () => {
  const tinfoil = privacyPolicyText("tinfoil");
  const headings = tinfoil.split("\n\n").slice(1).map((block) => block.split("\n")[0]);
  expect(headings.slice(0, 2)).toEqual([POLICY_SECTIONS[0].heading, PROVIDER_DISCLOSURE_HEADING]);
  expect(tinfoil).toContain("processes them in the United States");
  expect(tinfoil).toContain("Standard Contractual Clauses");
  const privatemode = privacyPolicyText("privatemode");
  expect(privatemode).toContain("processed only in the EU");
  expect(privatemode).not.toContain("United States");
});

it("makes no absolute promise", () => {
  const text = Object.values(PROVIDER_DISCLOSURE).map((e) => e.text).join("\n").toLowerCase();
  for (const forbidden of ["guarantee", "never", "100%", "completely", "cannot be", "anonymous"])
    expect(text, forbidden).not.toContain(forbidden);
});
