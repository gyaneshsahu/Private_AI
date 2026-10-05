# Evaluation evidence

`cases/development.json` contains 24 synthetic, two-turn development cases across six task families. `cases/heldout.json` contains 24 different reserved cases frozen before any model tuning. These were developer-authored, not independently contributed or blinded; do not describe them as independent customer validation. Eleven distinct development cases have live observations in [the development review](../docs/development-family-review.md); the reserved set remains unrun. Gemma has sparse coverage of all six families, with preserved historical failures and unresolved planning/OCR findings; this is not a quality-gate pass.

`frozen-manifest.json` records SHA-256 file hashes. `npm run eval:check` validates counts, shapes, coverage and hashes; success is fixture integrity only. If a reserved case informs a fix, retain it as a regression case and prepare a new, separately versioned hold-out set. Never silently regenerate the manifest to hide a changed acceptance baseline.

Use `grade.ts` to validate human-scored results. Each result needs the exact system/configuration, date, actual multi-turn transcript, correctness/completeness/context scores, case-specific assertion evidence, serious-error findings and reviewer identity. A mock result cannot pass. `initialGate` accepts the frozen case IDs, families and mandatory facts plus human-reviewed results. It applies the approved 65/72 overall and 10/12 family floors, rejects missing/duplicate evidence and mixed configurations, and blocks critical/serious findings, recurring material defects and cases failing two repeats. Every failed task needs a classified finding with a stable defect ID so recurrence remains visible. Agent-only grades cannot pass. Preserve failed executions even when the ordinary-quality floors pass. This gate alone does not establish comparative quality or security.

Apply the [severity rubric](../docs/acceptance.md): scores of 2 are acceptable; minor wording/style differences and optional omissions do not fail a run. Mandatory assertions test task outcomes, not preferred phrasing. Record minor/material/critical findings in reviewer evidence and report results separately for each task family. Privacy leaks, verification bypasses and fabricated critical facts remain unconditional blockers. Resolve disputed grading with documented adjudication, not post-hoc threshold changes.

Record real comparator configurations before use: current named ChatGPT and Gemini model/mode, tier, date and browsing/file settings. Compare the same task and available sources. Preserve disclosures required by PrivateAI rather than skipping them to improve speed. The full rubric and progression gates are in `docs/acceptance.md`.

Before broader investment: at least 120 fresh distinct conversations, varied documents and prospective-user tasks, then human evaluation across repeated sessions. Repetitions measure variability, not new coverage. Paired uncertainty and family-specific failure patterns must accompany any competitiveness claim. The proposed noninferiority margin is a product decision, not an industry standard. If evidence is insufficient, say so; do not equate failure to detect a difference with proof of equality.

Security tests, live-provider qualification, task quality and customer demand are separate records. No result currently establishes broad ChatGPT/Gemini parity or production readiness.

The bounded runner accepts scenario `development_case` with `developmentCaseId` from the frozen development set only. Prompts and references cannot be supplied in a permit. Each case requires a fresh claim; see the development review for evidence and limitations.

New results include `modelConfiguration` and `configurationSHA256` alongside code identity. Use the configuration identity for grading; code hashes alone cannot distinguish model or limit changes. Profile-aware agent-review sidecars preserve this distinction for earlier results.

`npm run eval:inventory` produces a local, read-only JSON inventory of
`.local/experiment-runs`. It prints metadata/counts, not transcripts, rubric prose,
credentials, raw server errors or full file paths. No network calls or new runs are
made. Files are bounded to 10 MiB and symbolic-link files/directories are excluded.
Only original `result.json` / `permit.json` pairs and active
`agent-review[-profile]-<numeric-date>.json` or
`human-review[-profile]-<numeric-date>.json` sidecars are read. A deliberately
superseded review can be preserved with `.superseded.json`; it is not active input.

Review binding checks source SHA-256, configuration/model policy, run date, exact
transcript, original frozen development prompts and mandatory assertion membership.
Incomplete transport cannot receive an accepted bound review. Conflicting active
reviews remain conflicts; the command does not choose the newest file. Historical
records without embedded model identity derive it from their recorded code hash
and original permit and are labelled accordingly; original files are not rewritten.
Missing or malformed evidence remains visible, with unbound review counts.

`VALID` means record consistency, not cryptographic proof of a live observation.
`acceptableUnderRubric` is the bound reviewer's conclusion, and agent/human review
statuses remain separate. The inventory never runs or passes the human quality or
provider gate and never merges different model configurations into a quality score.
`validatedRecordEstimateUSD` covers only readable, internally consistent local
records; it is neither actual billing nor an authoritative remaining account budget.
The frozen-case count excludes custom scenarios and repetitions. Keep historical
failures and superseded review corrections; do not remove records to improve counts.

`npm run eval:packet -- <run-id>` prepares one recorded synthetic development run
for later human review. It requires matching frozen prompts, recorded references
and internally consistent configuration. It creates a fresh directory under
ignored `.local/review-packets/` containing `review.html` and
`human-review-draft.json`, without changing source results or active review files.
Repeated packet generation creates a new directory; it does not rerun inference.

The HTML uses escaped original text, a network-blocking CSP and no scripts or
active model links. It shows the supplied references, mandatory facts, forbidden
conclusions and execution status, not an agent's preselected score. The JSON draft
has blank/null scores, assertion decisions, repetition and reviewer identity; it
deliberately fails the grading schema and is ignored by the inventory. Only actual
human grading can fill those fields. Do not relabel agent judgments as human work.
Completed human review records must retain their exact transcript/configuration/
source hash, identify the reviewer, and be validated before becoming an active
sidecar. Development reviews remain separate from the reserved trial gate.

Keep packets local/non-public: they duplicate synthetic transcript evidence, not
credentials, and are not a new upload or public feedback channel. File permissions
inherit Windows directory ACLs; `mode: 0600` is not a Windows access-control claim.
