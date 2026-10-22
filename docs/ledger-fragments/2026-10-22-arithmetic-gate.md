## 22 October 2026 - Arithmetic gate and default-model screen (prepared, not run)

Status: **preparation only.** No request was made, nothing was spent, no credential or credential store was read, and no network call was made. Gates stay closed; provider qualification remains NOT_PASSED; no model is selected. The threshold is a **proposal** the owner freezes before the first paid batch. Nothing in `src/`, `server/`, `shared/` or the runner changed; the post-check is not wired in (owner order: wiring waits for the provider-interface refactor merge).

Evidence (verified locally by the sub-agent): `npx tsc --noEmit` clean; `npx vitest run` on the four new test files gives 56 passed; the existing `tests/selection-checks.test.ts` and `tests/experiment.test.ts` still pass (82 in the six files together). Billing figures below are the recorded 20 and 22 October values (owner-reported dashboard reads in READINESS.md and provider-qualification.md), not re-read today.

Files: `evaluation/arithmetic-gate/cases.json`, `THRESHOLD.md`, `numbers.ts`, `scorer.ts`, `postcheck.ts`, `derivation.ts`, `prepare-run.ts`; tests `tests/arithmetic-gate-{cases,scorer,postcheck,plan}.test.ts`; `evaluation/experiment.ts` registers the 40 cases as frozen synthetic `robustness_case` IDs so permits validate; `.gitattributes` pins the gate JSON to LF like `evaluation/cases/*.json`.

### Design

| Part | What it does |
|---|---|
| Cases | 40 synthetic two-turn tax and finance cases: VAT 19 % and 7 % (5), net/gross reverse (5), percentage change (4), instalments and simple interest (5), compound interest (4), currency sums over tables and lists (5), date and time (6, including the 20 October shape 09:23 minus 18 minutes), proration by days (3), multi-step totals (3). 20 German (1.234,56 EUR, 19 %, 03.11.2026, German wording) and 20 English (1,234.56 EUR, 19%, 3 November 2026). 34 second turns correct a number from the first; 6 are follow-ups. 10 critical (5 German, 5 English). Every expected value carries a written derivation that the tests re-evaluate with decimal arithmetic; known-wrong values (for example 08:58, VAT taken of gross) are listed per turn. No real company, person or account data. |
| Scorer | Extracts numbers, money, percentages, clock times, durations and dates in both locales; reads 1.234 and 1,234 by the reply's own locale evidence and never counts a match under the other reading; exact match unless the case states a rounding. Wilson interval and `gateVerdict()` implement the threshold. Tests include ambiguity, negative, kind-confusion and round-trip cases (every case passes on its own expected facts and fails on an echo of the user's message). |
| Post-check | Recomputes arithmetic the reply writes out: equations (including clock time plus or minus minutes and date plus days), percentages of a stated base, percentage changes, time spans, and sums of listed items closed by a total line; flags self-contradiction, never rewrites. It flags "09:23 − 18 Minuten = 08:58 Uhr" and raises no alarm on the 40 cases' expected facts. A sum is only checked when the gap is a near miss (25 %) or equals one item, so lists that were not meant to add up stay silent. |
| Run preparation | `prepare-run.ts` builds one batch at a time from a frozen schedule: wave 1 Gemma 4 31B (thinking off) then GPT-OSS 120B (reasoning low), each the nine-case selection screen (7 cases of 20 October plus the 2 checks of 22 October, 8000 characters) and gate repetitions 1 to 3 with the `alone` and `calculator` arms interleaved per case (12000 characters, 4096 output tokens); wave 2 GLM-5.3 (low) the same way, then Kimi K3 on the 10 critical cases, one repetition, `alone` only. The `postcheck` arm is computed offline from the `alone` replies by `--report`. Before writing permits it checks a live catalog file saved by the main session within six hours and refuses a missing, duplicated, unpriced or experimental-labelled model; prices come from that file; each batch's worst-case reserve stays at or below USD 1.00; it refuses a batch above the owner cap, account limit, key limit, permit caps or the model cap; `--report` computes cost from recorded usage and appends `.local/arithmetic-gate-20261022/cost-log.jsonl`. It never calls the network (a test checks the source). |

### Proposed threshold (THRESHOLD.md, not frozen)

- Every critical case exact in all three repetitions; one critical failure fails the arm.
- Over repetitions 1 to 3 (n = 120 per arm): exact-match rate at least 97% and Wilson 95% lower bound at least 90%; a case failing once in three is borderline and runs to five, interval reported (proposed addition: two failures in five fails).
- A model failing the gate in any request arm is not eligible as default; the post-check arm is reported, not gated.

### Cost estimate (20 October price list; not an authorisation)

Worst case uses the repository reserve convention: every request at the full input-character limit x 4 tokens per character plus 4096 output tokens. Expected case: 1,000 input tokens (plus 1,000 for the calculator schema) and 600 output tokens per request (Kimi 1,500), about twice the 20 October observed average (Gemma's arm averaged USD 0.00044 per request).

| Batch group | Batches | Conversations | Requests | Worst case USD | Expected USD |
|---|---|---|---|---|---|
| Gemma screen (9 cases) | 1 | 9 | 18 | 0.30 | 0.02 |
| Gemma gate, alone, reps 1-3 | 12 (shared) | 120 | 240 | 5.59 | 0.24 |
| Gemma gate, calculator, reps 1-3 | (same 12) | 120 | 240 | 5.59 | 0.34 |
| GPT-OSS screen | 1 | 9 | 18 | 0.13 | 0.01 |
| GPT-OSS gate, alone, reps 1-3 | 6 (shared) | 120 | 240 | 2.32 | 0.12 |
| GPT-OSS gate, calculator, reps 1-3 | (same 6) | 120 | 240 | 2.32 | 0.16 |
| **Wave 1 total** | **20** | **498** | **996** | **16.25** | **0.88** |
| GLM-5.3 screen | 2 | 9 | 18 | 1.46 | 0.09 |
| GLM-5.3 gate, alone, reps 1-3 | 60 (shared) | 120 | 240 | 26.39 | 1.26 |
| GLM-5.3 gate, calculator, reps 1-3 | (same 60) | 120 | 240 | 26.39 | 1.69 |
| Kimi K3 critical probe | 10 | 10 | 20 | 5.48 | 0.68 |
| **Wave 2 total** | **72** | **259** | **518** | **59.72** | **3.73** |
| Borderline reps 4-5, per model and arm (at most 3 cases) | 1 | 6 | 12 | 0.28 Gemma / 1.32 GLM | 0.01 Gemma / 0.06 GLM |

The worst-case column is never at risk at once: no batch may reserve more than USD 1.00, and the proposed model caps (Gemma 1.50, GPT-OSS 1.00, GLM 6.00, Kimi 1.00) stop a model's batches. Kimi at a USD 1.00 cap is expected to complete about 7 of the 10 critical cases (a full batch reserves 0.55); about USD 1.20 covers all 10. Recorded headroom: actual about USD 0.81 after the 20 October screen against a USD 3 provider account limit and a USD 5 owner cap, so wave 1 (0.88 expected) fits; wave 2 does not fit after wave 1 (0.81 + 0.88 + 3.73 = 5.42) without an owner decision.

### Fix options, recommended order

1. **Model choice by this gate.** Needed in any case for a non-experimental default; costs under USD 1 for wave 1 at expected usage; changes no product code. Not sufficient alone: even a 97% model leaves wrong numbers.
2. **Post-check, shown as a warning.** Deterministic, provider-neutral, no extra request or cost, runs on the already decrypted reply in the browser so the privacy boundary does not move; catches the 20 October failure class (a stated subtraction that does not add up). Limits: it cannot see a wrong operand, wrong method or a number with no written working.
3. **Visible working.** Ask the model to write each step as "a × b = c". It makes the post-check effective and lets the user check; it costs output tokens and is a prompt change, so it is a new frozen configuration that needs its own gate run.
4. **Calculator tool, reworked.** Highest ceiling (exact arithmetic) but the existing path is not fit for these users: offline tests show it rejects 1.234,56 and 1,234.56 as operands, has no constant the user did not write and no minute or date unit; tool-call and continuation support per model is unproven (19 October finding). It needs locale-aware operand matching, named constants, time and date operations and a qualified continuation before it can carry the gate. Running its arm in wave 1 is cheap (about USD 0.50 expected for both models) and measures the gap.

### Where the post-check sits after the provider-interface refactor (not wired)

After the refactor, the provider adapter returns a completed assistant reply (text plus usage) through the provider-neutral interface. The post-check runs once, in the browser, on that final text: after the stream completes and the calculator rendering (if any) has produced the delivered answer, and before the message is marked complete and stored in the vault. It is a pure function call `postcheck(text, locale)` with the conversation's UI locale. Its result is attached to the message as local metadata, like the sanitised failure enums: never model context, never sent to the server or the provider, never logged remotely. The UI shows a plain-language warning ("A calculation in this answer does not add up: 09:23 minus 18 minutes is 09:05, not 08:58. Check before relying on it.") without changing the model's text. No automatic retry, because a retry is a separately charged request. It never runs on streaming partials. Wiring needs its own tests on the post-refactor interface and CometRow copy review.

### Contradictions and gaps found

- `evaluation/run-workspace.ts --selection-study` loads only the 7 cases of 20 October and hashes only `model-selection-20261020.json`, while `prepare-selection.ts` (22 October) freezes 9 case IDs and a two-file hash: as prepared, the 9-case screen would be refused by the runner ("Selection cases differ from frozen plan" or "Frozen cases changed"). Fail-closed, no spend risk.
- `selection-policy.ts` has no GPT-OSS arm and asserts the 20 October prices; the runner's selection mode refuses any other price or model. No runner mode exists for the arithmetic gate, nor for `optionalCalculator` on non-research fixtures (`--optional-tools` requires the assisted research fixtures; the selection study forbids it). **The main session needs a runner change (for example an `--arithmetic-gate` mode reading `plan.conversations`) before any paid batch.** The sub-agent did not write it: the runner is browser-driven and could not be tested without Playwright.
- `model-selection-proposal-20261022.md` says "the arithmetic case must pass" (one case, one run); this gate replaces that with 40 cases x three repetitions once THRESHOLD.md is frozen.
- The 20 October shortlist ran GPT-OSS at reasoning high; this gate freezes low (latency class of the other arms).
- THRESHOLD item 4 ("fails in any arm") combined with the existing calculator is expected to make every model ineligible; see the interpretation note in THRESHOLD.md.

### Owner decisions

1. Freeze THRESHOLD.md: keep or strike the two-of-five addition; choose the reading of "any arm" (gate on `alone` only, skip the calculator arm, or keep it literal).
2. Run the calculator arm in wave 1 as a measurement (about USD 0.50 expected) or skip it until reworked.
3. Model configurations: GPT-OSS reasoning low (frozen here) or high; whether to add a Gemma thinking-on arm.
4. Caps: service Tinfoil, prices re-read on the day, batch reserve ceiling USD 1.00, model caps (proposed Gemma 1.50, GPT-OSS 1.00, Kimi 1.00 or 1.20), and whether wave 2 goes ahead, which needs a higher account limit or owner cap, or GLM `alone` only (about USD 1.35 expected).
5. Authorise the runner change for the gate and the 9-case screen.
6. After the refactor: wire the post-check as a warning, and the user-facing wording.
7. The approval text quoted into each permit (`approvalEvidence`) must be the owner's own words.
