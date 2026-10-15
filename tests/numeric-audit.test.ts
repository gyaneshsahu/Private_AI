import { expect, it } from "vitest";
import { auditNumericReply } from "../evaluation/numeric-audit";
const spec = {
  unit: "GBP" as const,
  expected: "108.00",
  knownWrong: ["106.40"],
};
it("distinguishes missing delivery from missing numerical content", () => {
  expect(auditNumericReply(false, "£108.00", spec).status).toBe(
    "DELIVERY_FAILURE",
  );
  expect(
    auditNumericReply(true, "The total cannot be calculated.", spec).status,
  ).toBe("EXPECTED_VALUE_NOT_FOUND");
});
it("flags known errors even alongside a correct amount without awarding quality", () => {
  const result = auditNumericReply(
    true,
    "£108.00 is not the total; pay **106.40 GBP**.",
    spec,
  );
  expect(result.status).toBe("KNOWN_WRONG_VALUE_PRESENT");
  expect(result.matchedExpected).toBe(true);
  expect(result.qualityPass).toBe(false);
});
it("detects equivalent numeric formatting, never a semantic pass", () => {
  expect(auditNumericReply(true, "Total: GBP 108", spec).status).toBe(
    "EXPECTED_VALUE_PRESENT",
  );
  expect(
    auditNumericReply(true, "An old quote says £108.00", spec).qualityPass,
  ).toBe(false);
});
it("does not match substrings, different currencies or unrelated bare numbers", () => {
  for (const answer of [
    "£1108.00",
    "EUR108.00",
    "108.00 visits",
    "1,108.00 GBP",
  ])
    expect(auditNumericReply(true, answer, spec).matchedExpected).toBe(false);
});
it("supports percent wording and validates the bounded expectation", () => {
  expect(
    auditNumericReply(true, "25 percent more visits", {
      unit: "%",
      expected: "25",
      knownWrong: [],
    }).matchedExpected,
  ).toBe(true);
  expect(() =>
    auditNumericReply(true, "x", { ...spec, expected: "NaN" }),
  ).toThrow();
});
