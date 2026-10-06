import { createHash, randomUUID } from "node:crypto";
import { mkdir, lstat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { boundedRead, inspectEvidence } from "./inventory";
import { developmentCase, experimentSchema } from "./experiment";
import { reviewResult } from "./review-result";

const transcriptSchema = z.object({
  client: z.object({
    conversation: z.object({
      attachments: z
        .array(
          z.object({
            selected: z.boolean(),
            sources: z.array(z.object({ id: z.string(), text: z.string() })),
          }),
        )
        .default([]),
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string(),
          status: z.string(),
        }),
      ),
    }),
  }),
});
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function buildReviewPacket(
  run: string,
  resultText: string,
  permitInput: unknown,
) {
  const permit = experimentSchema.parse(permitInput);
  const entry = inspectEvidence(run, resultText, permit, []);
  if (entry.integrity !== "VALID" || !entry.casePromptsMatch || !entry.caseId)
    throw Error("A matching synthetic case record is required.");
  const raw: unknown = JSON.parse(resultText);
  const summary = reviewResult(raw, permit);
  const recorded = transcriptSchema.parse(raw).client.conversation;
  const transcript = recorded.messages;
  if (
    permit.scenario !== "development_case" &&
    permit.scenario !== "robustness_case"
  )
    throw Error("Reviewable case required");
  const c = developmentCase(entry.caseId, permit.scenario);
  const sources = recorded.attachments
    .filter((a) => a.selected)
    .flatMap((a) => a.sources);
  if (
    JSON.stringify(sources) !==
    JSON.stringify(c.sources.map(({ id, text }) => ({ id, text })))
  )
    throw Error("Recorded references differ from the frozen case.");
  const draft = {
    caseId: c.id,
    repetition: null,
    system: "PrivateAI",
    configuration: entry.configuration,
    runAt: (JSON.parse(resultText) as { observedAt: string }).observedAt,
    transcript: transcript.map(({ role, text }) => ({ role, text })),
    correctness: null,
    completeness: null,
    context: null,
    assertions: c.mandatoryFacts.map((fact) => ({
      fact,
      passed: null,
      evidence: "",
    })),
    seriousErrors: [],
    reviewer: "",
    reviewerKind: "human",
    findings: [],
    reviewNotes: "",
    evidenceKind: "live",
    sourceResultSHA256: createHash("sha256").update(resultText).digest("hex"),
  };
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>PrivateAI synthetic review</title><style>body{overflow-wrap:anywhere;font:16px/1.55 system-ui;max-width:900px;margin:2rem auto;padding:0 1rem;color:#203a30;background:#fafbf8}section{border:1px solid #cbd5cd;padding:1rem;margin:1rem 0;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}code{overflow-wrap:anywhere}h1{font-size:1.6rem}.note{background:#fff0cf;padding:1rem}@media print{section{break-inside:avoid}}</style></head><body>
<h1>PrivateAI · Synthetic development review</h1><p class="note">Unscored review packet. No human grade or provider approval is implied. This is a development case, not reserved acceptance evidence. Keep this packet local; it contains the synthetic transcript.</p>
<p>Run: <code>${escape(run)}</code><br>Case set: ${escape(permit.scenario)}<br>Case: ${escape(c.id)} · ${escape(c.family)}<br>Model: ${escape(permit.policy.model)}<br>Configuration: <code>${escape(entry.configuration!)}</code><br>Source SHA-256: <code>${draft.sourceResultSHA256}</code></p>
<h2>Recorded execution</h2><p>${escape(summary.outcome)} · ${escape(summary.relayAssessment)}<br>Completed replies: ${summary.completedReplies}. Original stream observations remain in the result file.</p>
<h2>Review instructions</h2><p>Read both turns before scoring correctness, completeness and context from 0 to 3. A score of 2 is acceptable. Check every mandatory fact. Classify defects as minor, material or critical; record serious errors separately. A later correction does not erase an earlier failure. Use the repository acceptance rubric for adjudication. The adjacent human-review-draft.json intentionally has blank scores and reviewer identity and cannot pass validation.</p>
<h2>Mandatory facts</h2><ul>${c.mandatoryFacts.map((f) => `<li>${escape(f)}</li>`).join("")}</ul>
<h2>Forbidden conclusions</h2><ul>${c.forbiddenConclusions.map((f) => `<li>${escape(f)}</li>`).join("")}</ul>
<h2>Supplied references</h2>${c.sources.length ? c.sources.map((s) => `<section><strong>${escape(s.id)}</strong><pre>${escape(s.text)}</pre></section>`).join("") : "<p>No reference excerpts in this case.</p>"}
<h2>Original conversation</h2>${transcript.map((m, i) => `<section><h3>${i + 1}. ${escape(m.role)} · ${escape(m.status)}</h3><pre>${escape(m.text)}</pre></section>`).join("")}
</body></html>`;
  return { html, draft };
}

export async function writeReviewPacket(workspace: string, run: string) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(run)) throw Error();
  const input = resolve(workspace, ".local/experiment-runs", run);
  const stat = await lstat(input);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error();
  const packet = buildReviewPacket(
    run,
    await boundedRead(resolve(input, "result.json")),
    JSON.parse(await boundedRead(resolve(input, "permit.json"))),
  );
  const output = resolve(
    workspace,
    ".local/review-packets",
    `${run}-${randomUUID()}`,
  );
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "review.html"), packet.html, {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(
    resolve(output, "human-review-draft.json"),
    JSON.stringify(packet.draft, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  return output;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length !== 3) throw Error();
    const output = await writeReviewPacket(process.cwd(), process.argv[2]);
    console.log(`Local unscored review packet: ${output}`);
  } catch {
    console.error(
      "Could not prepare review packet. Provide one recorded synthetic development run ID; original evidence was not changed.",
    );
    process.exitCode = 1;
  }
}
