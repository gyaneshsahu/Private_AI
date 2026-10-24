# Arithmetic gate v3 threshold (Design B)

**Status: PROPOSED 24 October 2026, NOT APPROVED.** The case set is frozen now; the pass bar is the v2 bar unchanged, for the owner's approval. Gate v3 has not been run and must not be run until the owner approves this file; `harness-v3.ts` refuses `--cases unseen-v3` until then.

## What changed from gate v2 (owner decision after the v2 result)

Design A's cross-check was the model's own estimate; 38 of 49 flags on gate v2 were false, mostly junk or stale estimates. Design B replaces it with a **second, independent extraction**: call 1 is the Design A program (the shown figures); call 2 reads the same turn under a different framing (one chain formula per figure: a start value and operations applied in order, over the same span ids, constants and fixed operation set, with its own instruction text and schema); both are evaluated by our code; a figure is "recomputed and matches" only when call 2 computed the same value at the figure's rounding, otherwise it is shown "not cross-checked" with the flag "two independent readings of this question gave different figures" (or the flag that the second reading could not be validated). Deterministic **method checks** on the text and call 1's program flag a percentage change computed without a subtraction and surcharge, rate-multiplier, discount and included-tax phrases whose percentage is applied with the wrong operation (rule table in `src/arithmetic/method-checks.ts`). The ledger check and the ambiguity flag stay. No model estimate is used.

## Frozen case set

- File: `evaluation/arithmetic-gate/unseen-v3-20261023.json`, 30 cases (15 German, 15 English, 16 critical), two turns each, generated once by `make-unseen-v3.ts` with every expected value computed from its derivation and hand-checked.
- SHA-256 over the file's bytes with CRLF normalised to LF: `96b7932c3cf7f3983368554351127642f5fa9ccd3cc84167d0d3e236ff13cdba`. `tests/arithmetic-unseen-v3.test.ts` fails if the file or this hash changes and proves no turn is shared with `cases.json`, `practice.json`, `unseen-20261023.json`, `public-20261023.json`, `dev-v2-20261023.json`, `dev-v3-20261023.json` or `unseen-v2-20261023.json`.
- Never used for development: Design B was tuned on `dev-v3-20261023.json` (and may use `dev-v2`). Styles: emails, taxi and hotel receipts, spreadsheet rows, parking tariffs, subscriptions, payroll, trials and return windows; the four weak kinds of gate v2 (percentage change 4, surcharge and rate phrases 6, Swiss VAT 2, overtime 4) in both languages.

## Configuration (one)

- **C1: GPT-OSS 120B, reasoning low, Design B, one feedback retry per call** (`harness-v3.ts --cases unseen-v3 --cell gptoss --retry 1 --reps 3`). Three repetitions, n = 90 conversations; four requests per conversation before retries. No second configuration: Kimi K3 was a ceiling probe in v2 (12 of 12) at 20 times the price and is not a product option; GLM-5.3 was wrong 8 of 24 on dev-v2.

## Outcomes per conversation (two turns, frozen `scorer.ts`)

1. **Verified by recomputation**: both turns delivered, every required value exact, no known-wrong value, no flag in either turn (every figure "recomputed and matches").
2. **Flagged**: both turns delivered and at least one flag (two readings differ, second reading unavailable, method mismatch, ambiguous number reading, a note figure outside the ledger). Reported split into *exact-flagged* (false flag) and *wrong-flagged* (caught error), with the flag classes.
3. **No answer**: a turn whose call 1 failed validation after its retry or reported `cannot_answer`.
4. **Silent wrong**: both turns delivered, no flag, scorer fails. The outcome the product must not produce.

## Pass bar for C1 (n = 90), the v2 bar unchanged

| Measure | Bar | Dev set dev-v3, Design B, 24 conversations (see result table in the ledger fragment) |
| --- | --- | --- |
| Silent wrong | 0 of 90 (Wilson 95 % upper bound 4.0 %); one fails the gate | see fragment |
| Verified by recomputation | at least 60 of 90 | see fragment |
| Flagged (exact-flagged plus wrong-flagged) | at most 27 of 90 | see fragment |
| No answer | at most 9 of 90 | see fragment |
| Critical cases (16 x 3 = 48 conversations) | no silent wrong and no no-answer | see fragment |

## Outcome policy (copied from v2, to be confirmed by the owner)

- **Pass** (all five measures met, pooled over 90): recorded as PASS for C1 with the full table and Wilson 95 % bounds; mechanical numeric evidence on 30 synthetic cases; moves no other gate; Design B stays unwired until the owner decides the product path.
- **Fail on verified or flagged only** (silent wrong 0 of 90 and the critical cases clean): recorded as FAIL with the counts; no rerun, no tuning; any change is a new gate with a new name and set.
- **Any silent wrong**: FAIL regardless of the other measures; every silent-wrong conversation listed with both programs and the rendered answer.
- **Critical cases**: the 16 critical cases (48 conversations) reported as their own table; any silent wrong or no-answer among them is a fail.
- **No-answer and flagged excesses** reported as fails of their measure, never excluded from the denominator.
- **Spend**: about 240 to 300 requests, about USD 0.15 at the current GPT-OSS price (dev batches cost USD 0.05 per 24 conversations); cap USD 0.50 in the harness; inside USD 5 total.
- **Reporting**: outcome table per repetition and pooled with Wilson bounds, critical-case table, every wrong-flagged and silent-wrong conversation with both programs, false-flag causes by class, cost from the cost log, verdict against this file. A `verdict-v3.ts` is to be committed before the run.

## Procedure after approval

The main session relays approval; the harness is extended by one line to admit `unseen-v3`; C1 runs once; results under `.local\arithmetic-v3-20261023\<label>\results.json`; one line in the shared cost log. No tuning on the frozen set; any change to `src/arithmetic/*`, the schemas, the instructions or the harness after the run is a new gate.
