// Per model, arm and set: exact, silent wrong (wrong and not flagged), flagged
// wrong, false flags (exact but flagged), no-answer, and the constant
// allow-list's record (calculator arm only: conversations whose validated
// arguments used an allowed constant, how many were exact, and how many
// exact ones were flagged).
//   node --import tsx evaluation/arithmetic-gate/report-sets.ts <results.json> [...]
import { readFileSync } from "node:fs";
import { wilson } from "./scorer";
import type { ConversationRecord } from "./harness";

export type SetReport = ReturnType<typeof reportSet>;

export function reportSet(file: {
  label: string;
  set: string;
  cell: string;
  arm: string;
  model: string;
  records: ConversationRecord[];
  totals: { costUSD: number; requests: number };
}) {
  let exact = 0,
    silentWrong = 0,
    flaggedWrong = 0,
    falseFlags = 0,
    noAnswer = 0;
  let constantUsed = 0,
    constantExact = 0,
    constantFalseFlags = 0,
    constantWrongSilent = 0;
  for (const r of file.records) {
    const missing = r.replies.length < 2 || r.replies.some((x) => !x.answer);
    const flagged = r.postcheck.some((p) => p.flagged);
    if (missing) noAnswer++;
    if (r.score.pass) {
      exact++;
      if (flagged) falseFlags++;
    } else if (!missing) flagged ? flaggedWrong++ : silentWrong++;
    const usedConstant = r.replies.some((x) =>
      /"kind":\s*"constant"/.test(x.validatedArguments ?? ""),
    );
    if (usedConstant) {
      constantUsed++;
      if (r.score.pass) {
        constantExact++;
        if (flagged) constantFalseFlags++;
      } else if (!flagged) constantWrongSilent++;
    }
  }
  const n = file.records.length;
  return {
    label: file.label,
    set: file.set,
    model: file.model,
    arm: file.arm,
    conversations: n,
    exact,
    exactRate: n ? wilson(exact, n) : undefined,
    silentWrong,
    flaggedWrong,
    falseFlags,
    noAnswer,
    constantAllowList: {
      conversationsUsingConstant: constantUsed,
      exact: constantExact,
      wrongSilent: constantWrongSilent,
      falseFlags: constantFalseFlags,
      falseFlagRate: constantExact
        ? wilson(constantFalseFlags, constantExact)
        : undefined,
    },
    costUSD: file.totals.costUSD,
    requests: file.totals.requests,
  };
}

if (process.argv[1]?.endsWith("report-sets.ts")) {
  const rows = process.argv
    .slice(2)
    .map((path) => reportSet(JSON.parse(readFileSync(path, "utf8"))));
  console.log(JSON.stringify(rows, null, 2));
}
