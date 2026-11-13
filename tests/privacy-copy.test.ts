import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  PRIVACY_COPY,
  PRIVACY_SUMMARY,
  privacyCopy,
  privacyText,
} from "../shared/privacy-copy";
import {
  renderPolicyMarkdown,
  renderPrivacyMarkdown,
  renderPrivatemodePrivacyMarkdown,
} from "../scripts/privacy-copy";
import { POLICY_SECTIONS, privacyPolicyText } from "../shared/privacy-policy";

it("keeps the published privacy statement identical to the app's copy", async () => {
  const published = await readFile("docs/privacy-copy-20261022.md", "utf8");
  expect(published.replace(/\r\n/g, "\n")).toBe(
    renderPrivacyMarkdown().replace(/\r\n/g, "\n"),
  );
  for (const section of PRIVACY_COPY)
    expect(privacyText()).toContain(`${section.heading}\n${section.text}`);
});

it("never overclaims: no absolute promises the product cannot keep", () => {
  const everything = `${privacyText()}\n${PRIVACY_SUMMARY}`.toLowerCase();
  for (const forbidden of [
    "never leave your device",
    "nobody can look inside",
    "cannot be hacked",
    "100%",
    "completely anonymous",
    "guarantee",
    "military",
    "unbreakable",
  ])
    expect(everything, forbidden).not.toContain(forbidden);
  // The claims that must be present, stated honestly.
  expect(everything).toContain("names, addresses and other facts");
  expect(everything).toContain("we never see what you asked");
  expect(everything).toContain("clears on its own");
  expect(everything).toContain("spending limits on the secure server are soft");
  expect(everything).toContain("there is no anonymous mode");
  expect(everything).toContain("switched on only after our checks");
});

it("keeps the published privacy policy identical to the app's page and built on the statement", async () => {
  const published = await readFile("docs/privacy-policy-20261022.md", "utf8");
  expect(published.replace(/\r\n/g, "\n")).toBe(
    renderPolicyMarkdown().replace(/\r\n/g, "\n"),
  );
  for (const section of PRIVACY_COPY)
    expect(POLICY_SECTIONS).toContainEqual(section);
  const text = privacyPolicyText();
  expect(text).toContain("What you can delete, and how");
  expect(text).toContain("What we cannot delete for you");
  expect(text).not.toContain("not yet named");
  expect(text).toContain("90 days and then delete them");
  expect(text.toLowerCase()).not.toContain("guarantee");
});

it("keeps the approved Tinfoil statement as the default and mirrors the Privatemode draft (D17)", async () => {
  expect(privacyCopy("tinfoil")).toBe(PRIVACY_COPY);
  expect(privacyText()).toBe(privacyText("tinfoil"));
  const published = await readFile("docs/privacy-copy-privatemode-20261112.md", "utf8");
  expect(published.replace(/\r\n/g, "\n")).toBe(renderPrivatemodePrivacyMarkdown().replace(/\r\n/g, "\n"));
  const pm = privacyCopy("privatemode");
  // The five provider sentences (four sections) and, since 13 November, the automatic-search
  // sentence change; every other section is shared.
  const changed = pm.filter((s, i) => s.text !== PRIVACY_COPY[i].text).map((s) => s.id);
  expect(changed).toEqual(["sealed", "ours", "provider", "limits", "research"]);
  const text = privacyText("privatemode").toLowerCase();
  expect(text).toContain("a question that looks time-sensitive or is about rules, fees or deadlines is searched");
  expect(privacyText("tinfoil")).toContain("a question that looks time-sensitive is searched");
  for (const tinfoilOnly of [
    "spending limits on the secure server are soft",
    "does not plan to add one",
    "longer for accounting records",
    "what they cost at published rates",
    "no date for a fuller browser check",
    "before each request",
  ])
    expect(text, tinfoilOnly).not.toContain(tinfoilOnly);
  for (const claim of [
    // Owner, 12 November: one verified client per session, re-checked at least every 10 minutes.
    "when you start chatting and again at least every 10 minutes, your browser checks the sealed computer",
    "up to 90 days",
    "token counts per key permanently",
    "does not cover the graphics processor",
    "reach our systems locked",
    "each account's memory is kept apart",
    "we never see what you asked",
    "there is no anonymous mode",
  ])
    expect(text, claim).toContain(claim);
  // The policy page follows the provider in use, and never mixes the two.
  const policy = privacyPolicyText("privatemode").toLowerCase();
  expect(policy).toContain("token counts per key permanently");
  expect(policy).not.toContain("within minutes to a few hours");
  expect(policy).not.toContain("published cost");
  expect(privacyPolicyText("tinfoil")).toContain("within minutes to a few hours");
});
