import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  PRIVACY_COPY,
  PRIVACY_SUMMARY,
  privacyText,
} from "../shared/privacy-copy";
import { renderPrivacyMarkdown } from "../scripts/privacy-copy";

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
