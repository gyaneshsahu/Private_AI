import { readFile, writeFile } from "node:fs/promises";
import { auditNumericReply } from "./numeric-audit";
const report = JSON.parse(
  await readFile(
    "evaluation/results/research-assisted-expanded-20261015.json",
    "utf8",
  ),
);
const expectations = [
  {
    id: "assisted-01",
    unit: "GBP" as const,
    expected: ["108.00", "103.68"],
    wrong: ["106.40", "102.60"],
  },
  {
    id: "assisted-02",
    unit: "EUR" as const,
    expected: ["133.40", "137.40"],
    wrong: [],
  },
  { id: "assisted-03", unit: "%" as const, expected: ["25", "15"], wrong: [] },
];
const rows = report.runs.flatMap((run: any) =>
  run.report.results.flatMap((c: any) => {
    const e = expectations.find((e) => e.id === c.id);
    if (!e) return [];
    return c.replies.map((reply: any, index: number) => ({
      id: c.id,
      arm: c.arm,
      turn: index + 1,
      ...auditNumericReply(reply.completed, reply.answer, {
        unit: e.unit,
        expected: e.expected[index],
        knownWrong: e.wrong,
      }),
    }));
  }),
);
const result = {
  status: "AUTOMATED_MECHANICAL_CHECK_NOT_HUMAN_REVIEW",
  scope:
    "Known authored numerical regression cases only. Presence can match quotations or rejected alternatives; absence can miss unfamiliar formatting. No semantic or quality pass.",
  rows,
};
await writeFile(
  "evaluation/results/research-assisted-numeric-audit-20261015.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
