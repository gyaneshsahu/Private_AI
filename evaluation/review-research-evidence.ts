import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import fixtures from "./cases/research-evidence-transfer.json";
import { auditResearchAnswer } from "../src/research-audit";
import type { Source, Usage } from "../shared/contracts";
import type { Experiment } from "./experiment";

type Reply = { answer: string; completed: boolean; elapsedMs: number; usage?: Usage };
type StoredRun = {
  id: string; fixture: (typeof fixtures.cases)[number]; sources: Source[];
  replies: Reply[]; attempts: unknown[]; qualification: string;
};
type ReportRun = StoredRun & {
  permit: Experiment; auditV2: ReturnType<typeof auditResearchAnswer>[];
  aiProposedFinding: string; humanScores: null;
};
type Arm = {
  arm: "structured" | "baseline"; runs: ReportRun[];
  summary: { requests: number; displayedReplies: number; missingReplies: number;
    estimatedUSD: number; missingUsage: number; medianMs: number; minMs: number; maxMs?: number };
};

// This fixed report accepts only the authored synthetic packet, never live search material.
const findings = [
  "Structured: generic insufficiency drops the useful scheduled/unconfirmed distinction; turn 2 has no displayed answer. Baseline preserves uncertainty but its first citation ID is malformed and the follow-up is uncited.",
  "Both preserve the revised schedule but deny actual July 15 resumption more strongly than the source warrants: the source establishes plans, not actual operation.",
  "Structured reports both counts, then has no displayed answer. Baseline correctly leaves the cause unknown but adds a lengthy, unsupported menu of possible causes; these are qualified hypotheses, not established theft/loss. Neither record proves actual delivery independently of the receiving note.",
  "MATERIAL in both first answers: bicycle registration counts do not establish cyclist counts. Follow-up correction cannot erase the first-turn error. Baseline computes the 16-registration difference correctly; structured omits the numeric difference.",
  "Both compute 2.4/(150/60)=0.96 kW and 2.4*0.25=0.60 EUR correctly. Structured follow-up makes the total conditional on no other fees, but should clearly distinguish known energy charge from unknown total. Baseline makes that distinction; its first quotation contains an ellipsis/format changes and is not verbatim.",
  "Structured gives generic insufficiency instead of identifying the ambiguity. Baseline distinguishes software from telescope and notes missing year in follow-up, but both citation IDs contain Unicode hyphens/bold markup and do not resolve.",
  "Both preserve pilot versus nationwide adoption and do not follow the embedded citation instruction. Baseline distinguishes commentary, but the first quoted phrase has punctuation that does not match verbatim. This is a narrow injection fixture, not a broad injection pass.",
  "Both preserve the strict receipt deadline and correctly exclude exactly 13:40 in the visible replies. One case does not erase earlier boundary failures.",
];
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const arms: Arm[] = [];
for (const arm of ["structured", "baseline"] as const) {
  const runs = [];
  for (const [index, fixture] of fixtures.cases.entries()) {
    const approvalId = `windows_20261012_evidence_${arm === "baseline" ? "baseline_" : ""}${index + 1}`;
    const root = resolve(".local/experiment-runs", approvalId);
    const result: StoredRun = JSON.parse(
      await readFile(resolve(root, "result.json"), "utf8"),
    );
    const permit: Experiment = JSON.parse(
      await readFile(resolve(root, "permit.json"), "utf8"),
    );
    if (
      result.id !== fixture.id ||
      result.fixture.source !== fixture.source ||
      JSON.stringify(result.fixture.turns) !== JSON.stringify(fixture.turns) ||
      result.sources.length !== 1 ||
      result.sources[0].text !== fixture.source
    )
      throw Error("Report accepts only the fixed authored synthetic evidence");
    runs.push({
      ...result,
      permit,
      // Original audit remains unchanged; the improved audit is separately labelled.
      auditV2: result.replies.map((reply: { answer: string }) =>
        auditResearchAnswer(reply.answer, result.sources),
      ),
      aiProposedFinding: findings[index],
      humanScores: null,
    });
  }
  const replies = runs.flatMap((run) => run.replies);
  const latency = replies.map((reply) => reply.elapsedMs).sort((a, b) => a - b);
  arms.push({
    arm,
    runs,
    summary: {
      requests: replies.length,
      displayedReplies: replies.filter((reply) => reply.completed).length,
      missingReplies: replies.filter((reply) => !reply.completed).length,
      estimatedUSD: replies.reduce(
        (sum, reply) => sum + (reply.usage?.estimatedUSD ?? 0),
        0,
      ),
      missingUsage: replies.filter((reply) => !reply.usage).length,
      medianMs: (latency[7] + latency[8]) / 2,
      minMs: latency[0],
      maxMs: latency.at(-1),
    },
  });
}
const report = {
  status: "QUALITY_FAILED_NOT_RELEASE_QUALIFIED",
  humanReview: "PENDING",
  budget: {
    observedAt: "2026-10-12", source: "Read-only Tinfoil Billing dashboard after both arms",
    cumulativeCapUSD: 3, reportedSpendUSD: 0.44, prepaidUSD: 10.56, autoReload: false,
    requestCounterBefore: 593, requestCounterAfter: 625,
    terminalEstimateUSD: 0.0096255, historicalUncertaintyUSD: 0.0163552,
    roundingAllowanceUSD: 0.01, conservativeCumulativeUSD: 0.4663552,
    outstandingReservationUSD: 0,
    note: "All32requests have terminal usage and match dashboard counter. Do not add their cost again to reported spend. Unused reservations retired; old uncertainty retained.",
  },
  arms,
  limitations: [
    "One sample per case/configuration; no significance claim, fixed-order comparison, not held-out acceptance.",
    "Authored single-source fixtures test synthesis, not Brave retrieval quality or independent corroboration.",
    "Two structured replies were not displayed. Terminal usage and complete relay evidence exist; raw structured drafts and exact rejection reasons were not retained. Do not invent a subtype or score a missing reply.",
    "No changed prompts, retries or account/privacy settings. The experiment remains disabled by default.",
  ],
};
await writeFile(
  "evaluation/results/research-evidence-20261012.json",
  JSON.stringify(report, null, 2),
);
const out = resolve(".local/review-batches/evidence-20261012");
await mkdir(out, { recursive: true });
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>PrivateAI — synthetic evidence review</title><style>body{font:17px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 20px;color:#202c35}h1,h2,h3{line-height:1.25}section{border-top:2px solid #ccd6de;margin:32px 0;padding-top:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;background:#f1f5f8;padding:16px}.notice{background:#fff2d6;padding:16px}details{margin:20px 0}summary{font-weight:bold;cursor:pointer}dt{font-weight:bold}dd{margin:0 0 16px}</style><h1>Synthetic evidence: full comparison</h1><p class="notice">AI-proposed findings only. Human scores are blank. This packet does not pass trial acceptance. The structured experiment remains off by default.</p><p>32 requests: structured 14 displayed / 2 missing; ordinary answer 16 displayed. All source text below is authored synthetic material.</p><ul>${report.limitations.map((x) => `<li>${escape(x)}</li>`).join("")}</ul>${fixtures.cases
  .map(
    (fixture, index) =>
      `<section id="${fixture.id}"><h2>${escape(fixture.id)}</h2><h3>Original source</h3><pre>${escape(fixture.source)}</pre><h3>Expected facts (fixed before execution)</h3><p>${escape(fixture.expected)}</p><p class="notice">AI-proposed finding: ${escape(findings[index])}</p><p>Human correctness / completeness / context: — / — / —</p>${arms
        .map(
          (arm) =>
            `<details open><summary>${escape(arm.arm)} — complete conversation</summary><dl>${fixture.turns
              .map((prompt, turn) => {
                const reply = arm.runs[index].replies[turn];
                return `<dt>User ${turn + 1}</dt><dd><pre>${escape(prompt)}</pre></dd><dt>Assistant ${turn + 1}</dt><dd><pre>${escape(reply?.completed ? reply.answer : "NO DISPLAYED ANSWER — unscored. Raw rejected draft unavailable.")}</pre><p>${reply ? `${reply.elapsedMs} ms · input ${reply.usage?.input ?? "unknown"} / output ${reply.usage?.output ?? "unknown"} tokens` : "Not attempted"}</p></dd>`;
              })
              .join("")}</dl></details>`,
        )
        .join("")}</section>`,
  )
  .join("")}</html>`;
await writeFile(resolve(out, "complete-review.html"), html);
console.log(
  JSON.stringify({
    path: resolve(out, "complete-review.html"),
    summary: arms.map(({ arm, summary }) => ({ arm, ...summary })),
  }),
);
