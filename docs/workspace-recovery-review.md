# Workspace recovery and approved quality gate

5 October 2026. Synthetic offline browser fixtures; no claim of provider qualification.

## Usable recovery

The real conversation UI already covered stop, explicit retry, branching and source
snapshots. `tests/workspace-races.test.ts` now also exercises:

- Start two document imports, clear the conversation while the first is pending,
  then deliver stale progress/content. Neither content nor progress returns, and
  the second file is never started.
- Clear during research preparation: a delayed preparation cannot launch execution.
  Clear during execution: a delayed response cannot add sources or success notices.
- Lock while a real Web Crypto encryption is paused, then complete it. Reopening
  the vault finds no saved snapshot and the discarded draft remains cleared.
- Receive another tab's vault lock while key derivation is pending. Completing
  derivation cannot unlock or repopulate this workspace.

Only document extraction and research transport are controlled test fixtures;
React state, cancellation, IndexedDB and vault encryption use application code.
The research fixture deliberately ignores abort to test stale completion handling.
External requests are blocked and asserted absent. Separate document-worker and
research-service tests cover their own cancellation and disclosure boundaries.

Implementation adds abort/generation checks between imported files and between
research preparation and execution. The multi-file check prevents starting more
work after cancellation, even if a dependency returns late. Existing vault
generation checks passed the new browser races without replacing the vault.

## Quality decision implemented

Founder approval of the trial floors is recorded in
[the quality gate](trial-quality-gate-proposal.md), PRD, acceptance and roadmap.
`evaluation/grade.ts` now evaluates the 65/72 and 10/12 family floors with human
review, mandatory evidence, severity and recurrence rules. It reports individual
failed executions and family denominators. Mixed configurations, missing/duplicate
results, mock evidence, agent-only review and unclassified task failures cannot
pass. Unit fixtures are fabricated test inputs, not evaluated provider answers.

This evaluator is only the ordinary-quality gate. Canonical workflows, full
provider qualification, privacy/security review, deployment and trial-scope
approval remain separate mandatory evidence. Numeric floors do not open access.

## Validation

- Full application suite: 103 tests across 23 files passed after recovery changes.
- Four additional quality-gate tests plus the existing grading test passed after
  the evaluator update: thresholds, family weakness, critical/recurring failures,
  missing/duplicate/mocked/unreviewed evidence and configuration consistency.
- TypeScript, production build and frozen fixture integrity passed.
- Ten production-build browser workflows passed with successful runner exit.
  The first sandboxed run finished assertions but hung during Windows process
  cleanup; it was stopped. A normal-user process-access run passed and exited.
- Existing verifier browser-bundle `zlib` warning remains; it is not a new failure
  or evidence of full provider qualification.

W2's defined recovery scope is complete. Planning's observed time-budget error,
full provider qualification, held-out human grading, comparator evidence and trial
operations are still unresolved. No held-out fixture or historical permit/result
was changed. Next product work is planning constraint reliability and trial
onboarding, with the real-private-data gate retained.

## Draft-preserving retry and edit workflow — 5 October 2026

The previous retry action cleared a follow-up already typed into the composer.
Retry now preserves that draft and sends only the explicitly retried question and
selected context. Editing into a new branch still invalidates later messages and
never sends automatically. The branch now offers **Answer this question** so the
user can request its reply directly without writing an artificial follow-up. This
action also preserves the separate composer draft and includes the edited question
exactly once.

Context size is checked before replacing messages or clearing the composer. An
oversized question/context selection retains the original draft and conversation,
with guidance to shorten the question or reduce included context. The verified
transport retains its own authoritative size and qualification checks.

The real UI synthetic-transport regression covers draft preservation across retry,
draft exclusion from the request, explicit edited-question execution, exclusion of
invalidated answers, rejected oversized context without a transport call, and a
successful explicit send after shortening the draft. These tests are UI evidence,
not live model-quality or provider-qualification evidence.
Full batch validation passed: 132 unit/integration tests, 15 production browser
workflows, typecheck, production build and frozen evaluation-fixture integrity.
