import { expect, it } from "vitest";
import {
  supportReport,
  supportAreas,
  supportSymptoms,
  supportGuidance,
} from "../src/support-report";

it("only emits fixed category labels, ignoring arbitrary metadata and hostile selector values", () => {
  const input = {
    area: "privacy",
    symptom: "incomplete",
    prompt: "PRIVATE_PROMPT",
    url: "https://private.test/SECRET",
    token: "SECRET_TOKEN",
    error: Error("PRIVATE_STACK"),
  };
  const report = supportReport(input);
  expect(report).toContain("Privacy or security concern");
  expect(report).toContain("did not finish");
  expect(report).not.toMatch(/PRIVATE_|SECRET|https:/);
  for (const area of [
    "__proto__",
    "constructor",
    "PRIVATE_URL",
    {},
    undefined,
  ]) {
    const invalid = supportReport({ area, symptom: "PRIVATE_ERROR" });
    expect(invalid).toContain("Area: Not selected");
    expect(invalid).toContain("Problem: Not selected");
    expect(invalid).not.toMatch(/PRIVATE_|__proto__|constructor/);
  }
});
it("provides bounded actionable guidance and honest local-only reporting for every category", () => {
  for (const area of Object.keys(
    supportAreas,
  ) as (keyof typeof supportAreas)[]) {
    expect(supportGuidance[area].length).toBeGreaterThanOrEqual(2);
    for (const symptom of Object.keys(supportSymptoms)) {
      const report = supportReport({ area, symptom });
      expect(report).toContain("It has not been submitted");
      expect(report.length).toBeLessThan(1000);
    }
  }
});
