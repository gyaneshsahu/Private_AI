## 24 October 2026 - Arithmetic v3, Design B: independent second extraction as the cross-check, method checks, gate v3 preparation (sub-agent, worktree branch `worktree-agent-a2a30c2ad9238ac61`)

Status: Design B built and measured on a NEW development set (dev-v3) only; gate v3 case set frozen; gate v3 NOT run; pass bar PROPOSED (the v2 bar unchanged), not approved; nothing wired into the product. Files touched: `src/arithmetic/{design-a,design-b,method-checks}.ts`, `evaluation/arithmetic-gate/{harness-v3,make-dev-v3,make-unseen-v3}.ts`, the two generated sets, `THRESHOLD-v3.md`, tests, this fragment. Not touched: `src/App.tsx`, `src/conversation.ts`, `shared/`, `server/`, `docs/READINESS.md`, every frozen or run set. The owner's report "Reliable arithmetic private AI" is still not in `docs/research/`; the wording placeholders ("recomputed and matches", "calculated", "not cross-checked") stand and the bare word "verified" appears in no UI or prompt text (tested).

Evidence labels: all counts **verified by the sub-agent** from `.local\arithmetic-v3-20261023\<label>\results.json`; spend is usage x live catalog price (no refused requests, so conservative = usage); every batch is one line in the shared cost log (`set: v3-dev-v3`).

### Design B mechanics

Two calls per turn, no shared output. Call 1 is the Design A extraction unchanged (program over span ids and constants, evaluated by our decimal evaluator); its figures are the ones shown. Call 2 reads the same annotated text and span table under a different framing: a "second reader" writes one **chain** per figure (a start value and operations applied in order to a running value, each op combining the running value with one arg), over the same span ids, the same twelve constants, earlier chains (`f1`, `f2`, ...) and the same operation set minus `sum` (repeated `add`); helper chains are marked `helper` and not shown; its own instruction text and JSON schema. Our code converts every chain into evaluator steps, evaluates it and types it (dates and clock times keep their formats). A call-1 figure is **"recomputed and matches"** when call 2 computed the same value at the figure's rounding, either as one of its figures or as a value along the way (an hourly rate beside the pay); otherwise it is shown **"not cross-checked"** with the flag "two independent readings of this question gave different figures for ...; the first reading's figure is shown and is not cross-checked". When call 2 fails validation after its one retry, every figure is "not cross-checked" with the flag that the second reading could not be validated. The model's estimate is no longer used. The ledger check on the rendered text and the ambiguity flag stay. Deterministic shape rules on call 2, each refused with feedback rather than guessed: a chain whose first op applies subtract, divide, ratio_percent, percent_of, add_percent or subtract_percent to its own start; helpers referenced before they are defined. Call 1 change (also a new-gate change): extra args on `round` are now refused instead of dropped (dropping them produced a figure rounded to 0 places in batch 2); identical results listed twice are one figure.

### Method checks (deterministic, text plus call-1 program, no model)

| Class | Phrase cue (German / English), general class | Expected use of the percentage X | Flagged use |
| --- | --- | --- | --- |
| percent change | "um wie viel Prozent gestiegen/gesunken/verändert", "prozentuale Steigerung/Veränderung/Rückgang", "Änderung in Prozent" / "by what percentage", "percent(age) increase/decrease/change/rise/fall", "change in percent" | every percent result's dependency closure contains a subtract and a divide or ratio_percent | a percent result that divides without subtracting (rule: percent change); skipped when a share cue is also present ("Anteil", "wie viel Prozent davon/des/der", "share", "what percentage of", "percentage passed/failed/...") |
| rate multiplier | "X % des (normalen) Satzes/Stundenlohns", "bezahlt/vergütet mit X %", "mit X % bezahlt" / "X % of the (normal) rate/pay/wage", "paid at X %" (not followed by extra/surcharge) | percent_of(base, X), or multiply by divide(X, const:100) | add_percent(., X) or subtract_percent(., X) (rule: rate multiplier) |
| surcharge | "Zuschlag/Aufschlag von X %", "X % Zuschlag/Aufschlag/extra", "plus/zuzüglich/zzgl. X %" (not followed by a tax word) / "plus X %" (not of/VAT/tax), "X % extra/surcharge/markup/premium", "surcharge of X %" | add_percent(base, X), or add(base, percent_of(base, X)) | subtract_percent(., X) (rule: surcharge) |
| discount | "X % Rabatt/Skonto/Nachlass", "Rabatt von X %", "abzüglich/minus X %" / "X % off/discount", "discount of X %", "less X %" | subtract_percent(base, X), or subtract(base, percent_of(base, X)) | add_percent(., X) (rule: discount) |
| included tax | "inkl./inklusive/enthält X %", "X % Umsatzsteuer enthalten" / "including/includes/inclusive of X %", "X % VAT included" | divide(gross, add_percent(const:1, X)), percent_of(net, X) | add_percent(amount span, X) (rule: included tax) |

A percentage claimed by two classes is not classified; a percentage the program does not use is not checked; a phrase no cue matches does nothing. 16 unit tests in `tests/arithmetic-method-checks.test.ts` cover positive, negative and unclassifiable cases in both languages, and every rule's own example.

### Dev results (GPT-OSS 120B, reasoning low, one retry per call, dev-v3, 24 conversations per batch)

| Batch | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer | Requests | Cost USD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gptoss-dev-b-probe (2 cases) | 0 | 0 | 2 | 0 | 0 | 10 | 0.0054 |
| gptoss-dev-b-1 | 8 | 7 | 9 | **0** | 0 | 110 | 0.0507 |
| gptoss-dev-b-2 (self-op refusal, helpers-first, dedupe) | 9 | 6 | 8 | **0** | 1 | 118 | 0.0583 |
| gptoss-dev-b-3 (round args refused, intermediate matching) | 11 | 5 | 8 | **0** | 0 | 116 | 0.0572 |

- **Wrong-flagged** (call 1 wrong, caught): 8 to 9 per batch; dev-v3 was built to be hard on the weak kinds (percentage change, rate phrases, Swiss VAT, overtime). The method rules fired on 5 of 9, 3 of 8 and 5 of 8 of them (percent change: ratio of new over old; rate multiplier: add_percent with 125 % or 150 %); the differing readings caught the rest (a dropped multiplication, a missing figure, wrong constants, both VAT rates added). No silent wrong in 74 conversations.
- **False-flag causes** (all batches): every false flag is the second reader's own mistake or failure: sums started from `const:1` despite the instruction, reversed subtraction, a wrong arg, a percentage divided by 100 twice, `add_percent` applied to the principal before `power`, and call 2 unavailable after two truncated or non-JSON replies (3 in batch 2). Batch 3: 5 false flags, all "two readings differ"; 0 "second reading unavailable".
- **Comparison with Design A on dev-v2** (easier set, 23 October, retry 1): 11 verified / 9 false flag / 3 wrong-flagged / 0 silent / 1 no answer. Design B on the harder dev-v3: 11 / 5 / 8 / 0 / 0 in the last batch. The false-flag count fell from 9 to 5 and its cause moved from the model's estimate (junk, stale) to the second reader's chains; wrong-flagged rose because the set targets the known weaknesses, and every wrong answer was flagged.
- Second-reader failure codes (batch 3): CANNOT_ANSWER 6, INVALID_SCHEMA 7 (mostly the self-op refusal doing its job on the first attempt), FORWARD_REFERENCE 1, TRUNCATED 2; call 1: INVALID_SCHEMA 1 (round args), CANNOT_ANSWER 1, UNKNOWN_REFERENCE 1, all rescued by the retry except none.

### Gate v3 preparation (NOT run)

- `evaluation/arithmetic-gate/unseen-v3-20261023.json`: 30 cases, 15 German, 15 English, 16 critical, generated once by `make-unseen-v3.ts`, hand-checked, no turn shared with any set including dev-v3 and the run set unseen-v2 (tested). **Frozen: SHA-256 (LF-normalised) `96b7932c3cf7f3983368554351127642f5fa9ccd3cc84167d0d3e236ff13cdba`**, enforced by `tests/arithmetic-unseen-v3.test.ts`.
- `THRESHOLD-v3.md` (PROPOSED): one configuration C1 = GPT-OSS 120B low, Design B, one retry per call, 3 repetitions (n = 90); outcomes as in v2; bar as in v2 (silent wrong 0 of 90, verified at least 60, flagged at most 27, no answer at most 9, critical cases 16 x 3 clean); outcome policy copied from v2; harness refuses `unseen-v3` until approval is relayed. On the dev-v3 numbers (11 of 24 verified, 13 flagged) C1 would fail the verified and flagged bars, as Design A did on gate v2; the bar is kept unchanged on the owner's instruction.

### Spend

Phase total **USD 0.172** (354 requests), within the USD 0.80 allowance; remaining of the 5.00 cap on the conservative basis at least USD 2.51 (2.68 stated by the coordinator minus 0.172).

### Contradictions found

1. The coordinator's message named the probe results under `.local\arithmetic-v2-20261023\`; Design B results live under `.local\arithmetic-v3-20261023\` (as the brief's own item 3 implies).
2. `make-dev-v3.ts` exports its helpers to `make-unseen-v3.ts`; the earlier generators each carried a private copy. Harmless, noted for the main session's tidy-up.
3. Design A behaviour changed in two places that gate v2 measured (round args refused, duplicate results merged); under the frozen-gate rule this makes any rerun of Design A a new gate, which is already the case.

### Verification counts (sub-agent, this branch)

`npx tsc --noEmit` clean. `npx vitest run`: 152 files passed, 2 failed (the pre-existing environmental `registry-backup` and `reserved-assessment` failures seen on the baseline), 16 skipped; 837 tests passed, 5 failed, 162 skipped. New tests this phase: 42 (design B 10, method checks 16, dev-v3 7, unseen-v3 8, plus one Design A test rewritten).
