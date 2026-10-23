# Arithmetic gate v2 threshold (Design A)

**Status: PROPOSED 23 October 2026, NOT APPROVED.** The case set is frozen now; the pass bar below is a proposal for the owner. Gate v2 has not been run and must not be run until the owner approves this file. Running it before approval would be a new, unapproved gate.

## Frozen case set

- File: `evaluation/arithmetic-gate/unseen-v2-20261023.json`, 30 cases (15 German, 15 English, 12 critical), two turns each, generated once by `make-unseen-v2.ts` with every expected value computed from its written derivation.
- SHA-256 over the file's bytes with CRLF normalised to LF (the convention of `prepare-run.ts`): `2a57ddeb79b332745cd4ccef3a2abafdfc75bcf65ead629baa58e31373af04d2`. `tests/arithmetic-unseen-v2.test.ts` fails if the file or this hash changes.
- The set was never used for development. Design A was tuned on `dev-v2-20261023.json` only (four GPT-OSS batches, one GLM batch, one Kimi probe, all recorded in the cost log). Styles differ from the earlier sets: chat questions, bullet lists, till receipts, UK and US tax, Swiss five-centime rounding, mileage, overtime, overdue interest by days, tips and bill splitting, savings targets, legal deadlines. One case (`unseen2-30`) uses English thousands grouping without a decimal clue on purpose; Design A flags that reading by design.
- Separation: the test proves no turn is shared with `cases.json` (frozen gate), `practice.json`, `unseen-20261023.json`, `public-20261023.json` or `dev-v2-20261023.json`.

## Configurations (at most two)

- **C1: GPT-OSS 120B, reasoning low, Design A with one feedback retry** (`harness-v2.ts --cell gptoss --retry 1`). Three repetitions, n = 90 conversations. This is the gated configuration.
- **C2: Kimi K3, Design A, no retry** (`harness-v2.ts --cell kimi --retry 0`). One repetition, n = 30. A screen only: at n = 30 a perfect score has a Wilson lower bound of 88.6 %, so C2 cannot pass the gate; it is reported beside C1 for the model decision. Cost per repetition about USD 1.30 (the dev probe averaged USD 0.021 per request); the owner must approve that spend separately.

GLM-5.3 is not named: on the dev set it had 8 of 24 wrong (all flagged) at about 10 times GPT-OSS's cost.

## Outcomes per conversation (two turns, scored by the frozen `scorer.ts`)

1. **Verified by recomputation**: both turns delivered, every required value present and exact, no known-wrong value, and no flag in either turn. (Wording placeholder: the owner's report "Reliable arithmetic private AI" supplies the final claim wording; until it is in the repository the UI says "recomputed and matches" and "calculated", never the bare word "verified".)
2. **Flagged**: both turns delivered and at least one turn carries a flag (the model's own estimate differed from the calculated value, the model gave no usable estimate, an ambiguous number reading was used, or the model's note contained a figure we did not calculate). Reported split into *exact-flagged* (a false flag) and *wrong-flagged* (a caught error).
3. **No answer**: a turn without a delivered answer (the program failed validation after the retry, or the model reported `cannot_answer`).
4. **Silent wrong**: both turns delivered, no flag, and the scorer finds a required value missing or a known-wrong value present. The one outcome the product must not produce.

Every conversation is exactly one of the four; failures are never excluded from the denominator.

## Pass bar for C1 (n = 90)

| Measure | Bar | Dev set, C1, 24 conversations (23 October) |
| --- | --- | --- |
| Silent wrong | 0 of 90 (Wilson 95 % upper bound 4.0 %); one silent-wrong conversation fails the gate | 0 of 24 |
| Verified by recomputation | at least 60 of 90 (66.7 %, Wilson lower bound 56.4 %) | 11 of 24 (45.8 %) |
| Flagged (exact-flagged plus wrong-flagged) | at most 27 of 90 (30 %) | 12 of 24 (50 %: 9 exact-flagged, 3 wrong-flagged) |
| No answer | at most 9 of 90 (10 %) | 1 of 24 |
| Critical cases (12 x 3 = 36 conversations) | no silent wrong and no no-answer | not separately measured |

**Read this honestly:** the dev-set run of C1 would fail the verified and flagged bars as proposed. Most dev-set flags were false flags from the model's own estimate ("claimed") being stale or junk, not from wrong programs. The bar states what the product needs, not what the model showed; the owner may (a) approve it as written and accept a likely FAIL on the verified rate while silent-wrong stays the decisive measure, (b) lower the verified bar to 45 of 90 and raise the flagged ceiling to 40 of 90, or (c) change the flag policy first (for example, stop flagging unusable estimates: on the dev batches that would have removed 6 of 12 false flags in one run but turned 2 caught errors into silent wrongs in another). The sub-agent recommends (a): silent-wrong zero is the only bar that protects the user, and a FAIL on the verified rate is information, not harm.

## Procedure after approval

- Run C1 once: `harness-v2.ts --cases unseen-v2 --cell gptoss --retry 1 --reps 3` (the harness must first be extended to accept `unseen-v2`; today it refuses everything but `dev`, deliberately). Then C2 once if its spend is approved. Results under `.local\arithmetic-v2-20261023\<label>\results.json`; one line per batch in the shared cost log.
- Estimated cost: C1 about 216 requests, about USD 0.12; C2 about 60 requests, about USD 1.30. Both within the USD 3.19 remaining after the dev work.
- No tuning on the frozen set. Any change to `src/arithmetic/design-a.ts`, `spans.ts`, `evaluator.ts`, `locale-number.ts`, the schema, the instruction or the harness after the run is a new gate with a new name.
- Verdict: counts per outcome with Wilson intervals, per repetition and pooled; critical cases listed; every wrong-flagged and silent-wrong conversation listed with its program. A pass is mechanical numeric evidence on 30 synthetic cases; it grades neither explanations nor method choice and moves no other gate.
