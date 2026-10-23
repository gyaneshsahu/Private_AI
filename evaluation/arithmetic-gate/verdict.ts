// Applies the frozen threshold (THRESHOLD.md) to the harness results of one
// model and arm on the frozen gate set, and reports the post-check arm.
//   node --import tsx evaluation/arithmetic-gate/verdict.ts <results.json> [more results.json]
// All files must be gate runs of the same model and arm; repetitions may be
// spread over files. Prints JSON: verdict, rate, interval, critical failures,
// borderline cases, post-check catch and false-alarm rates with intervals.
import { readFileSync } from "node:fs";
import gate from "./cases.json";
import { gateVerdict, wilson, type GateCase, type GateRun } from "./scorer";
import type { ConversationRecord } from "./harness";

export type Loaded = {
  label: string;
  set: string;
  cell: string;
  arm: string;
  records: ConversationRecord[];
};

export function summarise(files: Loaded[]) {
  const cells = new Set(files.map((f) => `${f.cell}/${f.arm}`));
  if (cells.size !== 1)
    throw Error(`one model and arm at a time, got ${[...cells].join(", ")}`);
  if (files.some((f) => f.set !== "gate"))
    throw Error("verdicts apply to gate runs only");
  const cases = gate.cases as unknown as GateCase[];
  const runs: GateRun[] = [];
  let wrongFlagged = 0,
    wrongSilent = 0,
    exactFlagged = 0,
    exactSilent = 0;
  for (const file of files)
    for (const record of file.records) {
      runs.push({
        caseId: record.caseId,
        repetition: record.repetition,
        pass: record.score.pass,
      });
      const flagged = record.postcheck.some((p) => p.flagged);
      if (record.score.pass) flagged ? exactFlagged++ : exactSilent++;
      else flagged ? wrongFlagged++ : wrongSilent++;
    }
  const verdict = gateVerdict(cases, runs);
  const wrong = wrongFlagged + wrongSilent;
  const exact = exactFlagged + exactSilent;
  return {
    cell: files[0].cell,
    arm: files[0].arm,
    labels: files.map((f) => f.label),
    conversations: runs.length,
    ...verdict,
    postcheck: {
      wrongCaught: wrongFlagged,
      wrongSilent,
      caughtRate: wrong ? wilson(wrongFlagged, wrong) : undefined,
      falseAlarms: exactFlagged,
      falseAlarmRate: exact ? wilson(exactFlagged, exact) : undefined,
    },
  };
}

if (process.argv[1]?.endsWith("verdict.ts")) {
  const files = process.argv.slice(2).map((path) => {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return {
      label: parsed.label,
      set: parsed.set,
      cell: parsed.cell,
      arm: parsed.arm,
      records: parsed.records,
    } as Loaded;
  });
  if (!files.length) throw Error("give at least one results.json");
  console.log(JSON.stringify(summarise(files), null, 2));
}
