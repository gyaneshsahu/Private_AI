import { it, expect } from "vitest";
import {
  families,
  initialGate,
  type EvaluationCase,
  type Result,
} from "../evaluation/grade";
const cases: EvaluationCase[] = families.flatMap((family) =>
  Array.from({ length: 4 }, (_, i) => ({
    id: family + i,
    family,
    mandatoryFacts: ["required fact"],
  })),
);
function evidence(): Result[] {
  return cases.flatMap((c) =>
    [1, 2, 3].map((repetition) => ({
      caseId: c.id,
      repetition,
      system: "PrivateAI",
      configuration: "frozen-config-TEST",
      runAt: "2026-10-05T00:00:00.000Z",
      transcript: [
        { role: "user" as const, text: "synthetic question" },
        { role: "assistant" as const, text: "synthetic answer" },
        { role: "user" as const, text: "synthetic correction" },
        { role: "assistant" as const, text: "synthetic revised answer" },
      ],
      correctness: 3,
      completeness: 3,
      context: 3,
      assertions: [
        { fact: "required fact", passed: true, evidence: "TEST ONLY" },
      ],
      seriousErrors: [],
      reviewer: "TEST REVIEWER",
      reviewerKind: "human" as const,
      reviewNotes: "Fabricated unit test input; not evaluation evidence",
      findings: [],
      evidenceKind: "live" as const,
    })),
  );
}
function miss(r: Result, defect = r.caseId) {
  r.completeness = 1;
  r.findings = [
    {
      defectId: defect,
      severity: "material",
      evidence: "Synthetic unit test finding",
    },
  ];
}
it("applies inclusive 65/72 and 10/12 floors without requiring perfection", () => {
  const runs = evidence();
  for (const i of [0, 3, 12, 24, 36, 48, 60]) miss(runs[i]);
  const report = initialGate(cases, runs);
  expect(report.passed).toBe(true);
  expect(report.successes).toBe(65);
  expect(report.families.writing).toEqual({ passed: 10, total: 12 });
  expect(report.failures).toHaveLength(7);
  miss(runs[15]);
  expect(initialGate(cases, runs).passed).toBe(false);
});
it("does not hide a weak family behind a high aggregate", () => {
  const runs = evidence();
  for (const i of [0, 3, 6]) miss(runs[i]);
  const report = initialGate(cases, runs);
  expect(report.successes).toBe(69);
  expect(report.passed).toBe(false);
});
it("blocks serious, critical and recurring material defects despite high scores", () => {
  for (const kind of ["serious", "critical", "recurring", "repeat"] as const) {
    const runs = evidence();
    if (kind === "serious") runs[0].seriousErrors = ["TEST serious error"];
    if (kind === "critical")
      runs[0].findings = [
        {
          defectId: "privacy",
          severity: "critical",
          evidence: "TEST critical error",
        },
      ];
    if (kind === "recurring") {
      miss(runs[0], "shared-defect");
      miss(runs[3], "shared-defect");
    }
    if (kind === "repeat") {
      miss(runs[0]);
      miss(runs[1]);
    }
    expect(initialGate(cases, runs).passed, kind).toBe(false);
  }
});
it("rejects missing, duplicate, mocked, unreviewed, mixed and misclassified evidence", () => {
  for (const kind of [
    "missing",
    "duplicate",
    "mock",
    "agent",
    "mixed",
    "unknown",
    "unclassified",
    "assertion",
  ] as const) {
    const runs = evidence();
    if (kind === "missing") runs.pop();
    if (kind === "duplicate") runs.push({ ...runs[0] });
    if (kind === "mock") runs[0].evidenceKind = "mock";
    if (kind === "agent") runs[0].reviewerKind = "agent";
    if (kind === "mixed") runs[0].configuration = "different configuration";
    if (kind === "unknown") runs[0].caseId = "unrecognized";
    if (kind === "unclassified") runs[0].context = 1;
    if (kind === "assertion")
      runs[0].assertions[0].fact = "substituted assertion";
    expect(initialGate(cases, runs).passed, kind).toBe(false);
  }
  expect(initialGate(cases.slice(1), evidence()).passed).toBe(false);
  expect(
    initialGate(
      cases.map((c) => ({ ...c, family: "bills" })),
      evidence(),
    ).passed,
  ).toBe(false);
});
