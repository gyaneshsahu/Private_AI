# Docs index (14 November 2026)

This is a map of `docs/` for new sessions and for Graphify. Files dated 11 to 14 November are current; where they disagree, the newest wins (14 November first). Files from October are history, kept for evidence. They often describe the Tinfoil-only design, or the product's earlier name, PrivateAI. When an older file disagrees with a current one, the current one wins.

## Start here

| File | What it is |
| --- | --- |
| `wake-up-report-20261114.md` | Read first: what was built, verified and spent on 14 November, what is half-done, and the risks |
| `owner-test-list.md` | Everything the owner must test, do or decide, as a short checklist with ids (T-01 to T-110), kept up to date as features land |
| `cost-weights-20261114.md` | What each feature really uses in tokens and euros, against its allowance weight; recommendations |
| `owner-decisions.md` | Every owner decision; the block "Decisions waiting for you, 14 November" at the top is the current list |
| `handoff-20261113.md` | The state at the end of 13 November; its banner lists what has been superseded since |
| `pre-alpha-checklist.md` | Every item before launch, with who does it and when; rows U1 to U12 and K1 to K6 end with their 14 November status |
| `ARCHITECTURE.md` | The top section, "Current system, 13 November 2026"; the dated history follows below it |
| `READINESS.md` | The evidence ledger, newest first |

## Alpha and launch

- `chat-feature-gaps-20261114.md`: what ChatGPT, Gemini and Claude offer in the chat screen, what CometRow has (audited in the code), the ranked gap list, six work packages for parallel building, and how to run the UI sweep. Section 0 is the build status of the packages (A to F built on 14 November).
- `read-aloud-and-pdf-export-20261114.md`: read aloud with on-device voices only (the local-voice rule and its limits per browser) and PDF export through the print dialog; both off by default, switches `VITE_READ_ALOUD` and `VITE_PDF_EXPORT`.
- `large-documents-20261114.md`: questions about a long PDF or Word file. Passages are chosen on the device and only those are sent; the limits, the cost, what is not built and the owner's decisions.
- `images-20261114.md`: a question about a picture (image upload and understanding). Built and tested offline, switched off by default; one live picture question on 14 November. Each privacy layer with its limit, the caps with their arithmetic, the cost, and the list of live checks for the lead. `images-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `code-execution-20261114.md`: code execution on the device for exact calculation (the model calls a `python` tool, Pyodide runs the code in a Web Worker). Built and tested offline and in headless Chromium, switched off by default; checked live through the app (Fast 30 of 30, Thinking 16 of 16). The design, the sandbox and its limits, the cost rule and its abuse bound, sizes and timings, and the live checks for the lead. `third-party-pyodide-20261114.md` records the Pyodide version, licence and files.
- `deep-research-20261114.md`: deep research (plan, approved searches, page reads, one answer with numbered sources), run in the browser. Built and tested offline, switched off by default; 3 questions run live, citations fixed. The caps, how a run's 15 allowance units are charged and what a modified browser gets, "premium only" as a switch plus an account list, the cost per run and for 30 invitees, and the live checks for the lead. `deep-research-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `manifest-rotation-20261114.md`: Privatemode's manifest rotation of 14 November explained field by field, and the routine for the next one: the 6-hourly check and its `CometRow manifest alert:` line, the paused status, the one command `scripts/privatemode-rotation.ts`, and the `inference.liveManifest` switch (off by default) with why there is still downtime until the owner approves.
- `voice-to-text-20261114.md`: voice input (dictation) in the composer. Built and tested offline, switched off by default; transcription checked live with synthetic samples. The design, the caps with their arithmetic, the cost, and the list of live checks for the lead. `voice-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `images-20261114.md`: a question about a picture (image upload and understanding). Built and tested offline, switched off by default, nothing verified live. Each privacy layer with its limit, the caps with their arithmetic, the cost, and the list of live checks for the lead. `images-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `prompt-size-20261114.md`: what each chat request carries, per part and per case (measured offline from the real request body), what was cut on 14 November and why it is safe, why 30 % is not reachable without touching safety text, and the live before-and-after check.
- `code-execution-20261114.md`: code execution on the device for exact calculation (the model calls a `python` tool, Pyodide runs the code in a Web Worker). Built and tested offline and in headless Chromium, switched off by default, nothing verified live. The design, the sandbox and its limits, the cost rule and its abuse bound, sizes and timings, and the live checks for the lead. `third-party-pyodide-20261114.md` records the Pyodide version, licence and files.
- `deep-research-20261114.md`: deep research (plan, approved searches, page reads, one answer with numbered sources), run in the browser. Built and tested offline, switched off by default, nothing verified live. The caps, how a run's 15 allowance units are charged and what a modified browser gets, "premium only" as a switch plus an account list, the cost per run and for 30 invitees, and the live checks for the lead. `deep-research-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `voice-to-text-20261114.md`: voice input (dictation) in the composer. Built and tested offline, switched off by default, nothing verified live. The design, the caps with their arithmetic, the cost, and the list of live checks for the lead. `voice-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `live-voice-20261114.md`: live voice conversation, turn by turn (listen, silence detection or tap, short review, send, read aloud on the device, listen again). Not a real-time voice model. Built and tested offline, switched off by default (`VITE_LIVE_VOICE`, also needs voice input and read aloud), nothing verified live. States, interruptions, cost per turn, caps, the Android decision, the live checks and the open decisions.
- `background-tasks-20261115.md`: background tasks, the Auto mode of Scheduled (the server stores the task sealed and runs it on schedule through its own attested Privatemode client). Built and tested offline, switched off by default (`inference.backgroundTasks`), nothing verified live. The trade-off against the promise, SDK versus proxy, storage and retention, encryption at rest, the CV case, limits, API, cost per run and for 30 invitees, the live checks. `background-tasks-consent-draft-20261115.md` (consent texts) and `background-tasks-privacy-wording-draft-20261115.md` (policy, disclosure, threat model, record of processing, DPIA note) are drafts for the owner (English and German).
- `scheduled-tasks-design-20261114.md`: scheduled tasks and reminders (U11), design only, nothing built. Four designs compared on what the server stores; recommended: entries in the device vault plus a calendar file, with an empty Web Push as an optional second phase; owner decisions, privacy sentence drafts (English and German) and acceptance tests.
- `canvas-20261114.md`: canvas, one editable document per conversation beside the chat (Markdown editor, preview, table grid with spreadsheet paste and CSV, "ask for changes" through the one send path with apply, discard and undo, PDF and Markdown export, saved in the vault). Built and tested offline, switched off by default (`VITE_CANVAS`), nothing verified live. HTML mini pages were analysed and left out as not airtight.
- `memory-20261114.md`: memory across chats, stored in the encrypted vault on the device; the server stores no profile. Built and tested offline, switched off by default (`VITE_MEMORY`); live probe passed. The decisions (created only when the user asks, what is sent, limits, sensitive data), the vault rules, the cost, the honest limits and the live checks for the lead. `memory-privacy-wording-draft-20261114.md` is the privacy wording draft for the owner (English and German).
- `projects-20261114.md`: projects with their own instructions and files, kept in the encrypted vault on the device; the server learns nothing about projects. Built and tested offline, switched off by default (`VITE_PROJECTS`), nothing verified live. What is sent and in which order with memory, the limits, the vault paths, why project files are not in the backup, cost measured in Node, the live checks. `projects-privacy-wording-draft-20261114.md` is the privacy wording draft (English and German).
- `alpha-plan-20261113.md`: what the alpha must prove, its metrics, survey and stop rules.
- `overnight-report-20261113.md`: what was built on the night of 13 November.
- `render-deploy-and-live-checks-20261113.md`: exact Render deploy steps and the live-check list. Section 2.4 lists the feature switches (all off), 2.5 the manifest rotation steps, 3.5 the one-time SQL step.
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
