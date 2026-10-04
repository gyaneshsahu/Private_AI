# Evaluation evidence

`cases/development.json` contains 24 synthetic, two-turn development cases across six task families. `cases/heldout.json` contains 24 different reserved cases frozen before any model tuning. These were developer-authored, not independently contributed or blinded; do not describe them as independent customer validation. Neither set has been run against a model.

`frozen-manifest.json` records SHA-256 file hashes. `npm run eval:check` validates counts, shapes, coverage and hashes; success is fixture integrity only. If a reserved case informs a fix, retain it as a regression case and prepare a new, separately versioned hold-out set. Never silently regenerate the manifest to hide a changed acceptance baseline.

Use `grade.ts` to validate human-scored results. Each result needs the exact system/configuration, date, actual multi-turn transcript, correctness/completeness/context scores, case-specific assertion evidence, serious-error findings and reviewer identity. A mock result cannot pass. `initialGate` rejects missing or duplicate repetitions, missing mandatory assertions and empty sets. This gate alone does not establish comparative quality or security.

Apply the [severity rubric](../docs/acceptance.md): scores of 2 are acceptable; minor wording/style differences and optional omissions do not fail a run. Mandatory assertions test task outcomes, not preferred phrasing. Record minor/material/critical findings in reviewer evidence and report results separately for each task family. Privacy leaks, verification bypasses and fabricated critical facts remain unconditional blockers. Resolve disputed grading with documented adjudication, not post-hoc threshold changes.

Record real comparator configurations before use: current named ChatGPT and Gemini model/mode, tier, date and browsing/file settings. Compare the same task and available sources. Preserve disclosures required by PrivateAI rather than skipping them to improve speed. The full rubric and progression gates are in `docs/acceptance.md`.

Before broader investment: at least 120 fresh distinct conversations, varied documents and prospective-user tasks, then human evaluation across repeated sessions. Repetitions measure variability, not new coverage. Paired uncertainty and family-specific failure patterns must accompany any competitiveness claim. The proposed noninferiority margin is a product decision, not an industry standard. If evidence is insufficient, say so; do not equate failure to detect a difference with proof of equality.

Security tests, live-provider qualification, task quality and customer demand are separate records. No result currently establishes broad ChatGPT/Gemini parity or production readiness.
