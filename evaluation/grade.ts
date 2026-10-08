import { z } from "zod";
export const resultSchema = z.object({
  caseId: z.string(),
  repetition: z.number().int().min(1).max(3),
  system: z.string().min(1),
  configuration: z.string().min(3),
  runAt: z.string().datetime(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1),
      }),
    )
    .min(4),
  correctness: z.number().int().min(0).max(3),
  completeness: z.number().int().min(0).max(3),
  context: z.number().int().min(0).max(3),
  assertions: z
    .array(
      z.object({
        fact: z.string(),
        passed: z.boolean(),
        evidence: z.string().min(1),
      }),
    )
    .min(1),
  seriousErrors: z.array(z.string()),
  reviewer: z.string().min(1),
  reviewerKind: z.enum(["human", "agent"]),
  findings: z.array(
    z.object({
      defectId: z.string().min(1),
      severity: z.enum(["minor", "material", "critical"]),
      evidence: z.string().min(1),
    }),
  ),
  reviewNotes: z.string().min(1),
  evidenceKind: z.enum(["live", "mock"]),
});
export type Result = z.infer<typeof resultSchema>;
export function taskPassed(result: Result) {
  return (
    result.evidenceKind === "live" &&
    result.correctness >= 2 &&
    result.completeness >= 2 &&
    result.context >= 2 &&
    result.assertions.every((a) => a.passed) &&
    result.seriousErrors.length === 0 &&
    !result.findings.some((f) => f.severity !== "minor")
  );
}
export const families = [
  "writing",
  "planning",
  "personal",
  "bills",
  "documents",
  "research",
] as const;
export type Family = (typeof families)[number];
export type EvaluationCase = {
  id: string;
  family: Family;
  mandatoryFacts: string[];
};

// Ordinary quality only: provider, privacy, canonical workflows and trial release
// have separate gates. Inputs are reviewer evidence, not automatic model grades.
export function initialGate(cases: EvaluationCase[], raw: unknown[]) {
  const results = raw.map((r) => resultSchema.parse(r));
  const blockers: string[] = [];
  const failures: string[] = [];
  const counts = Object.fromEntries(
    families.map((f) => [f, { passed: 0, total: 0 }]),
  ) as Record<Family, { passed: number; total: number }>;
  if (
    cases.length !== 24 ||
    new Set(cases.map((c) => c.id)).size !== 24 ||
    families.some((f) => cases.filter((c) => c.family === f).length !== 4) ||
    cases.some((c) => !c.mandatoryFacts.length || !families.includes(c.family))
  )
    blockers.push("Invalid 24-case, six-family coverage");
  if (
    results.some(
      (r) => r.system !== "PrivateAI" || !cases.some((c) => c.id === r.caseId),
    )
  )
    blockers.push("Unexpected system or case in trial evidence");
  if (new Set(results.map((r) => r.configuration)).size !== 1)
    blockers.push("Missing or mixed implementation configurations");
  const defects = new Map<string, Set<string>>();
  for (const c of cases) {
    let failedRepeats = 0;
    for (let repetition = 1; repetition <= 3; repetition++) {
      const key = c.id + "/" + repetition;
      const matches = results.filter(
        (r) =>
          r.caseId === c.id &&
          r.repetition === repetition &&
          r.system === "PrivateAI",
      );
      if (matches.length !== 1) {
        blockers.push(key + ": missing or duplicate result");
        continue;
      }
      const r = matches[0];
      if (
        c.mandatoryFacts.some(
          (fact) => r.assertions.filter((a) => a.fact === fact).length !== 1,
        )
      )
        blockers.push(
          key + ": missing or duplicate mandatory assertion evidence",
        );
      if (r.evidenceKind !== "live" || r.reviewerKind !== "human")
        blockers.push(key + ": live evidence and human review required");
      if (
        r.seriousErrors.length ||
        r.findings.some((f) => f.severity === "critical")
      )
        blockers.push(key + ": serious or critical failure");
      for (const finding of r.findings.filter(
        (f) => f.severity === "material",
      )) {
        const casesWithDefect =
          defects.get(finding.defectId) ?? new Set<string>();
        casesWithDefect.add(c.id);
        defects.set(finding.defectId, casesWithDefect);
      }
      const passed =
        taskPassed(r) &&
        c.mandatoryFacts.every((fact) =>
          r.assertions.some((a) => a.fact === fact && a.passed),
        );
      if (!passed) {
        failedRepeats++;
        failures.push(key);
        if (
          !r.seriousErrors.length &&
          !r.findings.some((f) => f.severity !== "minor")
        )
          blockers.push(
            key + ": failed task needs a classified defect finding",
          );
      }
      if (counts[c.family]) {
        counts[c.family].total++;
        if (passed) counts[c.family].passed++;
      }
    }
    if (failedRepeats >= 2)
      blockers.push(c.id + ": fails at least two repeats; review required");
  }
  for (const [defect, ids] of defects)
    if (ids.size >= 2)
      blockers.push(defect + ": material defect recurs across conversations");
  const passed = Object.values(counts).reduce((n, c) => n + c.passed, 0);
  if (passed < 65) blockers.push("Overall success below 65/72");
  for (const family of families)
    if (counts[family].total !== 12 || counts[family].passed < 10)
      blockers.push(family + ": requires at least 10/12 successes");
  return {
    passed: blockers.length === 0,
    successes: passed,
    executions: results.length,
    families: counts,
    failures,
    blockers,
  };
}
