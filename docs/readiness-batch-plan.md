# Readiness batch — 8 October 2026

## Fixed live comparison within the existing USD3 cap

Twelve fresh synthetic two-turn cases in `evaluation/cases/readiness-transfer.json`,
baseline versus `constraints-v2`, alternating pair order: maximum48 requests through
24 separate single-use permits. Cases cover crisis contact and unavailable contact,
benign control, workshop precautions, archive instructions, impossible shortening,
warm enquiry, decline, authorized commitment, ownership correction and two references.
Gemma4-31b thinking, 4,096 output tokens per turn, 90-second deadline. Second-turn
input remains capped at8,000 characters; each first turn has an enforced exact
composed-input character bound. No question, output allowance or sample is reduced.
Freeze code, fixture and configuration before issuing permits. Stop on first
incomplete response, missing accounting, pin mismatch or unresolved transport;
retain partial evidence without scoring it as a completed conversation. No retries.

The founder declined a USD4 increase and authorized useful tests within existing
limits. Original USD0.811008 estimate reserved8,000 input characters for every
turn and retained13 provably unused old permits. Those13 were audited as unclaimed,
preserved under `.local/retired-permits/constraint-20261008`, and removed from the
runner's accepted permit location. Releasing only their USD0.386048 unspent reserve
reduces the historical conservative bound fromUSD2.674672 to **USD2.288624**.
All executed historical request reserves remain counted.

At USD0.40/1.00 per million input/output tokens, zero request fee, the enforced
first-turn bounds plus full second-turn allowances reserve **USD0.60155520**.
Maximum cumulative bound: **USD2.89017920**, leavingUSD0.10982080 underUSD3.
Evidence: `.local/readiness-budget-reconciliation-20261008.json` records every
retired permit hash and every new conversation bound. Fixture checker recomputes
this reserve; fresh catalog verification is required before permits are issued.

Read-only preflight: key limitUSD3, account period limitUSD3, creditUSD0.78,
rounded charged spendUSD0.22,435 requests, auto-reload off. AnalyticsUSD0.2219 is
an estimate before adjustments, not an exact receipt. Available credit exceeds
this batch reserve byUSD0.17844480. Pending metering is not separately certified;
stop at any credit failure, never retry or deposit automatically. No account change
or top-up is presently required. Screenshot: `.local/tinfoil-readiness-preflight-20261008.png`.
Actual charges, prepaid credit and conservative request reserves are distinct;
rounded dashboard spend alone does not reconcile historical per-run costs.

## Validated engineering and remaining human evidence

186 tests across49 files and19 production-browser workflows passed, including
100-session admission/expiry, three-slot relay overload/recovery, encrypted save
under storage pressure and keyboard/CSS magnification. Evidence:
`.local/readiness-final-validation-20261008.log`. Earlier failed runs remain saved.
An isolated network-disabled container recovery completed in6.923 seconds; restored
access stayed paused, old credentials failed after resume, fresh synthetic access
worked and restart invalidated sessions. `.local/readiness-container-recovery-20261008.json`.
This is not a hosted recovery time or actual-device accessibility result.

The founder approved implementing seven-day expired/revoked credential retention
and seven-day backup expiry **as inactive code only**. `server/inactive-retention.ts`
has no runtime/CLI/scheduler integration. Synthetic tests cover expiry boundaries,
holds and unknown legacy revocation age. No live data or retention setting changed.

Before trial: human review of new answers, supplier confidentiality/search-rights
evidence, actual-phone and screen-reader workflows, hosted recovery/rollback and
log inspection, sustained backup evidence, and separately approved retention
activation remain. UI polish can proceed as independent work, but cannot close
those release gates. See READINESS for authoritative individual outcomes.
