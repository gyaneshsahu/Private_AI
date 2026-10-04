import { z } from "zod";
export const resultSchema = z.object({
  caseId: z.string(),
  repetition: z.number().int().min(1).max(3),
  system: z.string().min(1),
  configuration: z.string().min(3),
  runAt: z.string().datetime(),
  transcript: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
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
    result.seriousErrors.length === 0
  );
}
export function initialGate(
  caseFacts: Record<string, string[]>,
  raw: unknown[],
) {
  const results = raw.map((r) => resultSchema.parse(r));
  const failures: string[] = [];
  for (const [id, mandatory] of Object.entries(caseFacts))
    for (let repetition = 1; repetition <= 3; repetition++) {
      const matches = results.filter(
        (r) =>
          r.caseId === id &&
          r.repetition === repetition &&
          r.system === "PrivateAI",
      );
      if (matches.length !== 1) {
        failures.push(`${id}/${repetition}: missing or duplicate result`);
        continue;
      }
      const result = matches[0];
      if (
        !mandatory.every((fact) =>
          result.assertions.some((a) => a.fact === fact && a.passed),
        ) ||
        !taskPassed(result)
      )
        failures.push(`${id}/${repetition}: failed or unsupported evidence`);
    }
  return {
    passed: Object.keys(caseFacts).length === 24 && failures.length === 0,
    failures,
  };
}
