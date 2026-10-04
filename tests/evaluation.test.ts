import { describe, it, expect } from "vitest";
import { initialGate, taskPassed, type Result } from "../evaluation/grade";
describe("quality gate cannot pass missing or mocked evidence", () => {
  const result: Result = {
    caseId: "x",
    repetition: 1,
    system: "PrivateAI",
    configuration: "test fixture",
    runAt: new Date().toISOString(),
    transcript: [],
    correctness: 3,
    completeness: 3,
    context: 3,
    assertions: [
      {
        fact: "correct total",
        passed: true,
        evidence: "synthetic grader test",
      },
    ],
    seriousErrors: [],
    reviewer: "test",
    reviewNotes: "grader test only",
    evidenceKind: "mock",
  };
  it("rejects mocked excellence, material errors and missing runs", () => {
    expect(taskPassed(result)).toBe(false);
    expect(
      taskPassed({ ...result, evidenceKind: "live", correctness: 1 }),
    ).toBe(false);
    expect(
      taskPassed({
        ...result,
        evidenceKind: "live",
        seriousErrors: ["wrong payable total"],
      }),
    ).toBe(false);
    expect(
      initialGate(
        Object.fromEntries(
          Array.from({ length: 24 }, (_, i) => [
            `case-${i}`,
            ["correct total"],
          ]),
        ),
        [],
      ).passed,
    ).toBe(false);
    expect(initialGate({}, []).passed).toBe(false);
  });
});
