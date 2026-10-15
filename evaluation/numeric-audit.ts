import { z } from "zod";

/** Mechanical evidence only: matching a number does not establish a correct answer. */
export const numericExpectationSchema = z.object({
  unit: z.enum(["GBP", "EUR", "USD", "%"]),
  expected: z.string().regex(/^\d+(?:\.\d+)?$/),
  knownWrong: z.array(z.string().regex(/^\d+(?:\.\d+)?$/)).default([]),
});
export function auditNumericReply(
  completed: boolean,
  answer: string | undefined,
  expectation: z.infer<typeof numericExpectationSchema>,
) {
  const spec = numericExpectationSchema.parse(expectation);
  if (!completed || !answer?.trim())
    return {
      status: "DELIVERY_FAILURE" as const,
      matchedExpected: false,
      matchedKnownWrong: [] as string[],
      qualityPass: false,
    };
  const symbols = { GBP: "£", EUR: "€", USD: "$", "%": "%" };
  const symbol = symbols[spec.unit].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const amount = "(\\d+(?:\\.\\d+)?)";
  const unit =
    spec.unit === "%" ? "(?:%|percent)" : `(?:${spec.unit}|${symbol})`;
  // Deliberately bounded syntax: no inference from unrelated bare numbers,
  // grouped/localized numbers, quotations or a conclusion's semantic role.
  const normalized = answer.replace(/\*\*/g, "");
  const pattern = new RegExp(
    `(?:${unit}\\s*${amount}(?![\\d.,])|(?<![\\d.,])${amount}\\s*${unit})`,
    "gi",
  );
  const values = [...normalized.matchAll(pattern)].map((m) =>
    Number(m[1] ?? m[2]),
  );
  const matchedExpected = values.includes(Number(spec.expected));
  const matchedKnownWrong = spec.knownWrong.filter((v) =>
    values.includes(Number(v)),
  );
  return {
    status: matchedKnownWrong.length
      ? ("KNOWN_WRONG_VALUE_PRESENT" as const)
      : matchedExpected
        ? ("EXPECTED_VALUE_PRESENT" as const)
        : ("EXPECTED_VALUE_NOT_FOUND" as const),
    matchedExpected,
    matchedKnownWrong,
    qualityPass: false,
  };
}
