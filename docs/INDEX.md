# Docs index (13 November 2026)

This is a map of `docs/` for new sessions and for Graphify. Files dated 11 to 13 November are current. Files from October are history, kept for evidence. They often describe the Tinfoil-only design, or the product's earlier name, PrivateAI. When an older file disagrees with a current one, the current one wins.

## Start here

| File | What it is |
| --- | --- |
| `handoff-20261113.md` | The state at the end of 13 November, decisions, open items, known issues and what to read |
| `owner-decisions.md` | Every owner decision and the owner's next steps, using the alpha-scope labels |
| `pre-alpha-checklist.md` | Every item before launch, with who does it and when (before the first invitee, or during the alpha) |
| `ARCHITECTURE.md` | The top section, "Current system, 13 November 2026"; the dated history follows below it |
| `READINESS.md` | The evidence ledger, newest first |

## Alpha and launch

- `read-aloud-and-pdf-export-20261114.md`: read aloud with on-device voices only (the local-voice rule and its limits per browser) and PDF export through the print dialog; both off by default, switches `VITE_READ_ALOUD` and `VITE_PDF_EXPORT`.
- `large-documents-20261114.md`: questions about a long PDF or Word file. Passages are chosen on the device and only those are sent; the limits, the cost, what is not built and the owner's decisions.
- `voice-to-text-20261114.md`: voice input (dictation) in the composer. Built and tested offline, switched off by default, nothing verified live. The design, the caps with their arithmetic, the cost, and the list of live checks for the lead. `voice-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `alpha-plan-20261113.md`: what the alpha must prove, its metrics, survey and stop rules.
- `overnight-report-20261113.md`: what was built on the night of 13 November.
- `render-deploy-and-live-checks-20261113.md`: exact Render deploy steps and the live-check list. Section 3.5 is the one-time SQL step.
- `development-deployment.md`: the deployment config fields (`inference.allowance`, `searchKeyFile`, `noticeFile` and others).
- `week-one-monitoring.md`: what to watch in week one, and the hourly counts.
- `invited-trial-runbook.md`: running the trial, including the 8-step erasure procedure.
- `breach-plan-onepage-20261112.md`, `breach-plan-draft-20261112.md`: what to do in a breach.
- `rehearsals-t4-o3-20261112.md`, `recovery-rehearsal-20261024.md`: rollback and restore rehearsals.
- `safe-browsing-20261112.md`: the Search Console steps for the domain warning.
- `branch-merge-plan-20261112.md`: branch policy and `main`.

## Provider (Privatemode primary, Tinfoil backup)

- `provider-switch-20261112.md`, `provider-model-decision-20261026.md`, `provider-qualification-20261026.md`: the provider decision and qualification.
- `supplier-privatemode-20261112.md`, `dpa-record-privatemode-20261112.md`: what Privatemode confirmed (with the 13 November update on deprecation notice and pinning), and the DPA record.
- `model-deprecation-runbook.md`: what to do on a deprecation notice or a `CometRow model alert:` log line. The daily model list check is `server/model-watch.ts` with its baseline `server/privatemode-models-baseline.json`; the manual check is `scripts/privatemode-models-check.ts`.
- `qualification-report-draft-privatemode-20261112.md`: the report to sign at switch-on (Thinking costs 5). `qualification-report-draft-tinfoil-20261112.md` is the backup.
- `privatemode-attestation-limit-20261112.md`: the attestation limit, and the draft question for support.
- `privatemode-fast-tier-20261112.md`, `privatemode-stage3-plan-20261112.md`, `parity-matrix-20261112.md`, `wide-screen-20261112.md`: model choice and integration.
- `thinking-timeouts-20261113.md`: Thinking time limits and effort (known issue 1).
- `thinking-slow-20261113.md`: why the live runs were slow (test setting at max effort, not load); known issue 1 closed.
- `provider-promises-20261112.md`, `provider-terms-baseline.json`: our claims mapped to the provider's terms, and the weekly terms check.

## Answer quality, routing and search

- `routing-and-search-20261112.md`, `routing-research-20261112.md`: Auto routing and the search design.
- `when-to-search-20261112.md`, `search-first-usability-20261113.md`: search suggestions and the search-first choice.
- `german-rules-20261113.md`, `german-routing-20261113.md`: German rules, fees and deadlines, and German routing (known issue 2).
- `search-comparison-20261112.md`, `tinfoil-search-terms-20261112.md`: Brave compared with Tinfoil's enclave search.
- Evaluation summaries live outside `docs/`: `evaluation/german-rules-40-20261113/SUMMARY.md`, `evaluation/benchmark-privatemode-20261112/SUMMARY.md`, `evaluation/arithmetic-gate/results-v3-unseen-20261112.md`.

## Languages (German and English)

- `i18n-20261113.md`: what was built and checked, and the conditions before German goes live.
- `i18n-glossary-20261113.md`: fixed German terms; formal "Sie".
- `legal-texts-de-20261113.md`, `legal-texts-side-by-side.md`: the German legal drafts and their open questions, with the side-by-side file for the lawyer.
- `third-party-ocr-data-20261114.md`: the OCR engine and the German and English OCR data: versions, licences, sources, sizes and how they are loaded.

## Privacy and legal (drafts need the owner and a legal read)

- `privacy-policy-20261022.md`, `privacy-copy-20261022.md`: the approved texts.
- `privacy-policy-corrections-draft-20261113.md`, `privacy-policy-corrections-de-draft-20261113.md`: corrections to the policy.
- `privacy-wording-privatemode-20261112.md`, `privacy-copy-privatemode-20261112.md`: the Privatemode wording.
- `provider-disclosure-draft-20261112.md`, `health-consent-draft-20261112.md`: the provider section and the health consent.
- `acceptable-use-draft-20261112.md`, `acceptable-use-de-draft-20261113.md`: acceptable use.
- `age-rule-draft-20261112.md`, `age-rule-de-draft-20261113.md`: the 18+ rule.
- `art30-record-draft-20261112.md`: the record of processing.
- `inactivity-retention-proposal-20261112.md`: the inactivity rule.
- `copy-audit-20261112.md`: overclaims in the app copy.
- `threat-model-20261022.md`: the threat model, updated 12 November.
- `name-change-20261025.md`: the PrivateAI to CometRow rename, and the identifiers that keep the old name.

## History (October and earlier)

The rest of `docs/` is October work: `PRD.md`, `ROADMAP.md`, `LOCAL_CODEX_HANDOFF.md` (the Codex era, up to 21 October), evaluation plans and review packets, billing and account design, and `ledger-fragments/` and `research/`. Use these files for evidence and background, not for current status.

`docs/private/` is git-ignored and holds private material (supplier replies, the hardening record). Never point external tools at it.
