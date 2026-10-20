import { expect, it } from "vitest";
import {
  assertWorkspaceArm,
  isWorkspaceCase,
} from "../evaluation/workspace-arm";
it("admits the registered everyday workspace family without admitting arbitrary IDs", () => {
  expect(isWorkspaceCase("everyday-01")).toBe(true);
  expect(isWorkspaceCase("reserved-01")).toBe(false);
  expect(isWorkspaceCase("unknown-01")).toBe(false);
});
it("keeps both ordinary comparison arms free of experimental contracts", () => {
  for (const arm of ["baseline", "candidate"]) {
    expect(() =>
      assertWorkspaceArm(
        { developmentCaseId: "x", policy: {} },
        "x",
        arm,
        "normal",
      ),
    ).not.toThrow();
    for (const field of [
      "optionalCalculator",
      "calculatorReplay",
      "calculatorContinuation",
      "assistedResearchContract",
      "scopedResearchContract",
      "checkedResponseContract",
      "researchEvidenceContract",
    ])
      expect(() =>
        assertWorkspaceArm(
          { developmentCaseId: "x", policy: { [field]: true } },
          "x",
          arm,
          "normal",
        ),
      ).toThrow();
  }
});
it("validates optional candidate and baseline before execution", () => {
  expect(() =>
    assertWorkspaceArm(
      { developmentCaseId: "x", policy: { optionalCalculator: true } },
      "x",
      "candidate",
      "optional",
    ),
  ).not.toThrow();
  expect(() =>
    assertWorkspaceArm(
      { developmentCaseId: "x", policy: {} },
      "x",
      "baseline",
      "optional",
    ),
  ).not.toThrow();
  for (const policy of [{}, { assistedResearchContract: true }])
    expect(() =>
      assertWorkspaceArm(
        { developmentCaseId: "x", policy },
        "x",
        "candidate",
        "optional",
      ),
    ).toThrow();
  expect(() =>
    assertWorkspaceArm(
      { developmentCaseId: "wrong", policy: { optionalCalculator: true } },
      "x",
      "candidate",
      "optional",
    ),
  ).toThrow();
});

it("requires explicit continuation mode rather than changing an existing arm", () => {
  const permit = {
    developmentCaseId: "x",
    policy: { optionalCalculator: true, calculatorContinuation: true },
  };
  expect(() =>
    assertWorkspaceArm(permit, "x", "candidate", "optional"),
  ).toThrow();
  expect(() =>
    assertWorkspaceArm(permit, "x", "candidate", "optional", false, true),
  ).not.toThrow();
  expect(() =>
    assertWorkspaceArm(permit, "x", "baseline", "optional", false, true),
  ).toThrow();
});

it("admits the fixed fidelity set without accepting arbitrary new case IDs", async () => {
  const { isWorkspaceCase } = await import("../evaluation/workspace-arm");
  for (const id of ["F01", "F02", "F03", "F04", "F05", "F06", "S01", "S02"])
    expect(isWorkspaceCase(id)).toBe(true);
  for (const id of ["F07", "S03", "F01-custom"])
    expect(isWorkspaceCase(id)).toBe(false);
});
