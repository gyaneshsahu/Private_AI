// What the report card reads from a report's own text (docs/report-card-20261125.md), the saved
// field, and the switch being a build switch that is off unless set.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { readMinutes, reportSections, reportSummary, reportTitle } from "../src/report/report";

const REPORT = [
  "# Notice periods for tenants",
  "",
  "The notice period is **three months** for a tenant [synthetic-0001], whatever the length of the tenancy [synthetic-0002, page 3]. For the landlord it grows with the years.",
  "",
  "## Short answer",
  "- Tenant: three months [synthetic-0001].",
  "",
  "```",
  "## not a heading, this is code",
  "```",
  "",
  "## How the period is *counted*",
  "Text.",
  "### A detail",
  "## What stays open",
].join("\n");

it("the title is the report's first heading, or the question when it has none", () => {
  expect(reportTitle(REPORT, "how long?")).toBe("Notice periods for tenants");
  expect(reportTitle("Just text without a heading.", "How long is the notice period?")).toBe("How long is the notice period?");
  expect(reportTitle("", "x".repeat(200))).toHaveLength(88);
});

it("the summary is the first paragraph without Markdown marks or source codes, cut at a sentence", () => {
  expect(reportSummary(REPORT)).toBe("The notice period is three months for a tenant, whatever the length of the tenancy. For the landlord it grows with the years.");
  const long = `${"A sentence of some length here. ".repeat(20)}`;
  const cut = reportSummary(long);
  expect(cut.length).toBeLessThanOrEqual(320);
  expect(cut.endsWith(".")).toBe(true);
  expect(reportSummary("## Only\n- a list\n| a | table |")).toBe("");
});

it("the sections are the second-level headings outside code, at most eight", () => {
  expect(reportSections(REPORT)).toEqual(["Short answer", "How the period is counted", "What stays open"]);
  expect(reportSections("# One\ntext\n# Two")).toEqual(["One", "Two"]);
  expect(reportSections(Array.from({ length: 12 }, (_, i) => `## S${i}`).join("\n"))).toHaveLength(8);
});

it("reading time is never under a minute", () => {
  expect(readMinutes("short")).toBe(1);
  expect(readMinutes("word ".repeat(660))).toBe(3);
});

it("a saved chat keeps the report mark, and the switch is off unless the build sets it", () => {
  expect(readFileSync("src/saved-conversation.ts", "utf8")).toContain("report: z.literal(true).optional()");
  expect(readFileSync("src/device-features.ts", "utf8")).toContain('reportCardEnabled = () => on("VITE_REPORT_CARD")');
  for (const file of ["Dockerfile", "Dockerfile.render"]) expect(readFileSync(file, "utf8")).toMatch(/^ARG VITE_REPORT_CARD=\s*$/m);
});
