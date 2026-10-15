import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import fixtures from "./cases/checked-transfer.json";
import { auditResearchAnswer } from "../src/research-audit";
import type { Source, Usage } from "../shared/contracts";

type Reply = {
  completed: boolean;
  answer: string;
  diagnosticDraft?: string;
  checkedFailure?: string;
  usage?: Usage;
  elapsedMs: number;
  firstVisibleTextMs: number | null;
};
type Result = {
  id: string;
  fixture: (typeof fixtures.cases)[number];
  sources: Source[];
  replies: Reply[];
};
const root = ".local/experiment-runs/windows_20261015_checked_batch";
const plan = JSON.parse(await readFile(`${root}/plan.json`, "utf8"));
const billing = JSON.parse(await readFile(`${root}/billing.json`, "utf8"));
const executionBatches = await Promise.all(
  ["checked", "checked-rest", "checked-wire", "checked-sources"].map(
    async (name) => ({
      name,
      plan: JSON.parse(await readFile(`${root}/${name}-plan.json`, "utf8")),
    }),
  ),
);
const hash = createHash("sha256")
  .update(
    (await readFile("evaluation/cases/checked-transfer.json", "utf8")).replace(
      /\r\n/g,
      "\n",
    ),
  )
  .digest("hex");
if (hash !== plan.fixtureLF_SHA256) throw Error("Frozen fixture changed");
const runs: Result[] = [];
for (let i = 1; i <= fixtures.cases.length; i++) {
  const path =
    i === 1
      ? `.local/experiment-runs/windows_20261015_checked_1/result.json`
      : i <= 3
        ? `.local/experiment-runs/windows_20261015_checked_rest_${i}/result.json`
        : i === 4
          ? `.local/experiment-runs/windows_20261015_checked_wire_${i}/result.json`
          : `.local/experiment-runs/windows_20261015_checked_sources_${i}/result.json`;
  let run: Result;
  try {
    run = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
    throw error;
  }
  const expected = fixtures.cases[i - 1];
  if (
    run.id !== expected.id ||
    JSON.stringify(run.fixture.turns) !== JSON.stringify(expected.turns) ||
    run.sources.length !== 1 ||
    run.sources[0].text !== expected.source
  )
    throw Error("Case binding mismatch");
  runs.push(run);
}
let assessment: unknown = null;
try {
  assessment = JSON.parse(
    await readFile(
      "evaluation/results/checked-20261015-assessment.json",
      "utf8",
    ),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const replies = runs.flatMap((r) => r.replies);
const report = {
  status: "DEVELOPMENT_NOT_ACCEPTANCE",
  plan,
  executionBatches,
  billing,
  humanScores: null,
  assessment,
  attempted: replies.length,
  complete: replies.filter((r) => r.completed).length,
  notAttempted: 16 - replies.length,
  observedEstimatedUSD: replies.reduce(
    (n, r) => n + (r.usage?.estimatedUSD ?? 0),
    0,
  ),
  runs: runs.map((r) => ({
    ...r,
    auditAfterEscapeFix: r.replies.map((reply) =>
      auditResearchAnswer(reply.answer, r.sources),
    ),
  })),
  limits:
    "Deterministic arithmetic validates execution of the model-selected operations, not the appropriateness of those operations, units or chosen inputs. Extracted quotations preserve wording, not semantic completeness. No production promotion; rejected drafts remain unscored, not quality zero.",
};
await writeFile(
  "evaluation/results/checked-20261015.json",
  JSON.stringify(report, null, 2),
);
const e = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Checked calculation and source evidence</title><style>body{font:16px/1.5 system-ui;max-width:1000px;margin:auto;padding:20px;background:#f7f8fa;color:#17232d}section,article,aside{padding:18px;background:white;border:1px solid #ccd4dd;margin:14px 0;border-radius:10px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Checked calculation and source evidence</h1><p>${e(report.limits)}</p><p>Attempted ${report.attempted}; complete ${report.complete}; not attempted ${report.notAttempted}. Human grades blank.</p>${fixtures.cases
  .map((c) => {
    const run = runs.find((r) => r.id === c.id);
    return `<section><h2>${e(c.id)} — ${e(c.title)}</h2><h3>Authored source</h3><pre>${e(c.source)}</pre><h3>Expected facts</h3><pre>${e(c.expected)}</pre>${c.turns
      .map((p, i) => {
        const r = run?.replies[i];
        return `<article><h3>Turn ${i + 1}</h3><h4>User</h4><pre>${e(p)}</pre><h4>${r ? (r.completed ? "Displayed answer" : "WITHHELD / UNSCORED") : "NOT ATTEMPTED"}</h4><pre>${e(r?.answer || "No answer.")}</pre><p>${r ? `Time ${r.elapsedMs}ms; diagnostic ${e(r.checkedFailure ?? "none")}` : ""}</p>${r?.diagnosticDraft ? `<details><summary>Raw synthetic diagnostic draft — not a displayed answer</summary><pre>${e(r.diagnosticDraft)}</pre></details>` : ""}<p>Human reply score: — / — / —</p></article>`;
      })
      .join("")}</section>`;
  })
  .join(
    "",
  )}<aside><h2>AI-proposed observations</h2><pre>${e(JSON.stringify(assessment, null, 2))}</pre></aside></html>`;
const output = ".local/review-batches/checked-20261015";
await mkdir(output, { recursive: true });
await writeFile(`${output}/complete-review.html`, html);
console.log(
  JSON.stringify({
    output,
    attempted: report.attempted,
    complete: report.complete,
    observedEstimatedUSD: report.observedEstimatedUSD,
  }),
);
