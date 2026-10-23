# Arithmetic gate threshold

**Status: FROZEN 23 October 2026**, on the owner's instruction of 23 October ("freeze the threshold on the calculator-plus-post-check configuration, keeping model-alone as a baseline"), after the practice iterations recorded in `docs/READINESS.md`. From this commit on, this file, `cases.json`, `numbers.ts`, `scorer.ts`, `postcheck.ts`, `derivation.ts` and `prepare-run.ts` do not change for this gate; any change is a new gate with a new name. The frozen cases in `cases.json` were never used for practice: practice ran on `practice.json`, a separate generated set.

## Frozen configurations (23 October)

Both request arms run on the frozen cases, three repetitions each, and both are scored against sections "The threshold" below:

- **Arm A, model alone plus post-check** (the shipped configuration today): the ordinary answer, with `postcheck.ts` applied to the delivered text and reported as the flag rate on wrong and on exact conversations.
- **Arm B, calculator plus post-check**: the optional calculator tool with the argument normalisation of 23 October (`src/calculator-normalize.ts`), the post-check applied to the rendered answer.

**Which arm decides eligibility.** The owner's instruction names arm B. The practice iterations (16 generated cases, one repetition, 23 October) measured arm B at 13 of 16 for Gemma 4 31B and 10 of 16 for GPT-OSS 120B against arm A at 14 of 16 and 15 of 16, and showed arm B presenting a wrong method (a 106 % "increase" for 850 to 901) under the "calculated locally" label. The main session therefore records arm B as **measured, not yet trusted**, and freezes eligibility on the configuration actually shipped: a model is eligible as default when it passes the threshold in arm A; arm B's verdict is reported beside it and becomes the gated arm only when the owner switches the shipped configuration to the calculator. The owner may overrule this reading before relying on any result; the data for both arms is produced either way.

Nothing on the frozen cases has been run before this commit. No model has passed or failed this gate.

## What is measured

- **Conversation**: one case, one model configuration, one arm, one repetition. The two turns are sent in order; the second turn sees the model's own first reply. Every conversation has its own permit; there are no retries.
- **Exact conversation**: both turns pass `scorer.ts`. A turn passes when every required value is present after normalisation, no known-wrong (`forbidden`) value is present, and the reply was delivered. An undelivered, incomplete, context-rejected or calculator-validation-stopped turn is a failed turn; failures are never excluded from the denominator.
- **Normalisation**: German and English number formats (1.234,56 and 1,234.56; 19 % and 19%; thin-space and apostrophe grouping), currency symbols and codes, Markdown and LaTeX decoration, clock times (09:05, 9.05 Uhr, 9:05 am), durations (7 h 40 min, 7 Stunden und 40 Minuten, 460 Minuten) and dates (03.11.2026, 3 November 2026, November 3, 2026, 2026-11-03). An ambiguous token such as 1.234 or 1,234 is read in the reply's own locale (its unambiguous numbers first, then its language, then the case locale); a match under the other reading does not count. A slash date that could be day-first or month-first does not count.
- **Exactness**: a required value must equal the expected value exactly (1190, 1190.0 and 1.190,00 are equal). Only where the case text states a rounding (for example "kaufmännisch auf Cent gerundet") does a reply value pass when it rounds half-up to the expected value at that number of places.
- **Arms**: `alone` (ordinary answer), `calculator` (the existing optional calculator path: `optionalCalculator` only, no replay, no continuation), and `postcheck` (`postcheck.ts` applied offline to the `alone` replies; no requests).

## The threshold, per model and per request arm

1. **Critical cases**: every one of the 10 critical cases is exact in every run (10 cases x three repetitions = 30 conversations). One failed critical conversation fails the gate for that arm.
2. **Overall rate**: over repetitions 1 to 3 of all 40 cases (n = 120 conversations), the exact-match rate is at least 97% (at most three failed conversations) and the Wilson 95% lower bound is at least 90%.
3. **Borderline cases**: any non-critical case that fails in one of its three repetitions is borderline. It is repeated to five runs (repetitions 4 and 5) and its five-run Wilson interval is reported. _Proposed addition, strike before freezing if not wanted:_ a borderline case that fails two of five runs fails the gate.
4. **Eligibility**: a model that fails the gate in any arm is not eligible as default. The arms that make requests are `alone` and `calculator`; the `postcheck` arm is reported (section below) and is not gated in this proposal.

**Interpretation the owner must confirm before freezing (item 4).** Read literally, a model failing the `calculator` arm is ineligible even if it passes `alone`. Offline tests in `tests/arithmetic-gate-plan.test.ts` show the existing calculator rejects any operand written with a German decimal comma or a thousands separator (1.234,56 or 1,234.56), cannot use a constant the user did not write (100, 1.19, 12, 60, 365) and has no minute or date unit. Half of the gate is written in German formats, and about two fifths of the cases need such a constant, a clock or date calculation, or a rounding-down step the calculator does not offer, so the existing calculator arm is expected to fail for every model whenever the model chooses to call it. If item 4 stays literal, the likely outcome is "no model eligible" until the calculator is reworked. Options: (a) gate on `alone` only and report `calculator` as a measurement; (b) keep item 4 literal and skip the `calculator` arm until it is reworked; (c) keep item 4 literal and accept that outcome.

## Repetitions

- Three repetitions of every case, run repetition-major (all cases of repetition 1, then repetition 2, then 3), so a cap stop still leaves complete repetitions. Within a batch the order is case-major and the two request arms alternate their order from case to case.
- Repetitions 4 and 5 run only for borderline non-critical cases, and only while the arm has no critical failure and at most three failed conversations in repetitions 1 to 3. Otherwise the verdict is already FAIL and further runs buy no decision.
- Repetitions 4 and 5 never enter the overall rate (fixed denominator of 120; no selective resampling). They are reported per case.
- A critical failure decides the gate for that model and arm; the remaining batches for that model run only if the owner asks for them.

## Confidence intervals

Wilson score interval for x exact conversations out of n, z = 1.959964 (two-sided 95%):

    centre = (p + z^2 / 2n) / (1 + z^2 / n),  p = x / n
    margin = z * sqrt(p (1 - p) / n + z^2 / 4n^2) / (1 + z^2 / n)
    interval = [centre - margin, centre + margin], clipped to [0, 1]

Implemented as `wilson()` in `scorer.ts`; `gateVerdict()` applies items 1 to 3 and returns PASS, FAIL or INCOMPLETE with reasons. Reported for each model and arm: n, exact count, rate, lower and upper bound; for each borderline case its runs, passes and interval. Consequences of the arithmetic: at n = 120, 117 exact gives a lower bound of 92.9%, so the 90% condition binds only when base runs are missing; a perfect score needs n of at least 35 to reach a 90% lower bound, so a 10-conversation probe (the Kimi K3 critical-case probe) can never pass the gate and is a screen only.

## Post-check arm (reported, not gated)

`postcheck.ts` runs offline on every `alone` reply. Reported per model: wrong conversations caught (wrong and flagged), silent wrong conversations (wrong and not flagged) with a Wilson interval over all conversations, and false alarms (exact and flagged) with a Wilson interval over exact conversations. The post-check only sees arithmetic the reply writes out; a wrong number with no stated relation stays silent.

## Per-batch cost log

- **Before a batch**, `prepare-run.ts --batch` reads a live catalog file the main session saved from `https://inference.tinfoil.sh/v1/models` within the previous six hours, refuses a model that is missing or labelled experimental, takes prices from that file, and computes the reserve as requests x [(input-character limit x 4 x input price + 4096 x output price) / 10^6 + request price], the repository's reserve convention. It refuses the batch if actual + uncertainty + reserve exceeds the smallest of the owner cap, the provider account limit, the key limit and the permit caps, or if the model's logged spend plus the reserve exceeds the model cap.
- **After a batch**, `prepare-run.ts --report <batch dir>` computes cost = sum of (prompt tokens x input price + completion tokens x output price) / 10^6 + requests x request price from the usage the runner recorded, ignoring any cached-input discount (an over-estimate), writes `report.json` with the mechanical scores, and appends one line `{batchId, at, requests, inputTokens, outputTokens, costUSD, basis}` to `.local/arithmetic-gate-20261022/cost-log.jsonl`. The main session tells the owner the batch cost and the running total before preparing the next batch. The next batch's `modelSpentUSD` is the sum of that model's lines. The supplier offers no client request IDs and only soft ceilings, so the owner's billing dashboard reading is the reconciliation; the computed figure is not a billing record.

## What a pass does not establish

A pass is mechanical numeric evidence on 40 synthetic cases. It does not grade explanations, method choice, safety or usefulness (human grades stay blank), and it does not move provider qualification, which remains NOT_PASSED.
