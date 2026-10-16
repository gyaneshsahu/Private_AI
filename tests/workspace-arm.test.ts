import { expect, it } from "vitest";
import { assertWorkspaceArm } from "../evaluation/workspace-arm";
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
