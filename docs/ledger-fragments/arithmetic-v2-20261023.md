## 23 October 2026 - Arithmetic v2, Design A: Phase 0 to 2 results and gate v2 preparation (sub-agent, worktree branch `worktree-agent-a2a30c2ad9238ac61`)

Status: Design A built and measured on a NEW development set only; gate v2 case set frozen; gate v2 NOT run; pass bar PROPOSED, not approved. No gate passed. Nothing in `src/App.tsx`, `src/conversation.ts`, `shared/`, `server/` or `docs/READINESS.md` changed. The owner's research report "Reliable arithmetic private AI" was not in `docs/research/` at any point of this work (checked at start and before Phase 1), so the brief of 23 October was the specification. Wording: the states "recomputed and matches" / "calculated" / "not checked by us" are placeholders until the report supplies the claim wording; the bare word "verified" appears in no UI text or proposed UI text (tested).

Evidence labels: every count below is **verified by the sub-agent** from the harness result files under `.local\arithmetic-v2-20261023\<label>\results.json` and the earlier runs under `.local\arithmetic-gate-20261022\`; prices are **supplier-published** (public catalog endpoint, read without sign-in); spend figures are usage x live price (no refused requests occurred, so the conservative and usage-only sums coincide for this effort).

### Phase 0.1 - why the earlier calculator arm failed (offline classification)

GPT-OSS 120B, `gptoss-gate-calculator-final` (frozen gate, 3 repetitions): 66 conversations without an answer, 65 calculator-validation rejections plus one incomplete stream. Classified from the raw tool arguments:

| Cause | Count | Three examples (case, repetition, turn) |
| --- | --- | --- |
| Operand not in quote: percentage written as a fraction (0.05 for "5 %") with `constant` evidence | 10 | arith-18 r1 t1 rate=0.05; arith-20 r1 t1 rate=0.03; arith-21 r1 t1 rateAnnual=0.025 (one case also had a computed 7.58 h) |
| Operand not in quote: literal gross factor (1.19, 1.07, 0.85, 1.02) typed as a step operand or constant | 11 | arith-06 r1 t1 right=1.19; arith-07 r1 t1 right=1.07; arith-22 r2 t1 r2=1.02 |
| Operand not in quote: value the model computed itself (7.5833 hours, 73 days, 205 minutes, "6" months) | 9 | arith-28 r1 t1 six=6; arith-31 r1 t1 p1=205, p2=255; arith-34 r1 t1 hours=7.5833333333 |
| Operand not in quote: expression as a step operand ("rate/119", "(1+rate/100)", "pay/gross") | 7 | arith-08 r1 t1; arith-07 r2 t2; arith-40 r1 t2 |
| Operand not in quote: literal number as step operand that is neither in the text nor a constant (0, 119, 6) | 6 | arith-01 r1 t1 "0"; arith-08 r2 t1 "119"; arith-28 r2 t1 "6" |
| Schema invalid: `inputs` written as one object holding an evidence list | 6 | arith-22 r1 t1; arith-11 r2 t1; arith-35 r2 t1 |
| Quote not a substring (table rows, "Rechnung 1: 2.400,00 EUR") | 4 | arith-24 r1 t2; arith-26 r2 t2; arith-24 r3 t2 |
| Wrong role: a result names an input id instead of a step | 3 | arith-11 r1 t2 (old, new); arith-25 r2 t1 (v1..v4); arith-26 r3 t1 |
| Schema invalid: date or clock written as a decimal value ("03.11.2026", "09:23") | 3 | arith-32 r1 t1; arith-30 r2 t1; arith-30 r3 t1 |
| Schema invalid: empty steps / non-decimal value / expression as value | 5 | arith-23 r2 t1 (steps empty); arith-34 r3 t1 (7.583333333333333, 15 decimals); arith-12 r2 t1 ("new - old") |
| Other: invalid JSON in the tool arguments (prose inside the call) | 2 | arith-04 r1 t2; arith-20 r2 t1 |
| Other: incomplete stream, no answer | 1 | arith-17 r1 t2 |
| **Total** | **66** | |

Wrong method and rounding rule did not appear among the rejections (a rejected call never reached arithmetic). Lesson used in Design A: 43 of 66 failures are the model typing a number that is not in the text (fractions, gross factors, computed quantities, expressions); a schema in which operands can only be span ids or named constants makes that class impossible.

Silent-wrong conversations, Gemma 4 31B. The brief named 13 for `gemma-gate-alone-final`; `report-sets.ts` gives **18 silent-wrong for the alone arm and 13 for the calculator arm** (`gemma-gate-calculator-final`); both classified:

| Arm | Cause | Count | Examples |
| --- | --- | --- | --- |
| calculator (13) | wrong operand: a sum omits one item (binary add chains) | 5 | arith-27 r1-r3 (1,700 instead of 1,775); arith-03 r1, r3 (brutto gesamt 100,03) |
| calculator | wrong role: an intermediate step shown as the final figure | 3 | arith-04 r1-r3 (net total 195.50, VAT and gross right) |
| calculator | wrong method: ratio instead of change (107 %, 118.75 %) | 4 | arith-11 r1-r3; arith-14 r1 |
| calculator | omitted factor (interest for 1 year instead of 2) | 1 | arith-15 r2 |
| alone (18) | model arithmetic error in a product, quotient or sum | 13 | arith-06 r2 (119/1.19 = 99.99); arith-36 r2 (930/30 x 13 = 372); arith-37 r1-r3 (fee 723.37/723.48/723.78 for 724.04) |
| alone | calendar error (31 Jan 2028 + 30 days = 2 March) | 3 | arith-33 r1-r3 |
| alone | clock arithmetic error (10:12 - 23 - 6 = 9:37) | 1 | arith-29 r1 |
| alone | scorer artefact: LaTeX `$10.252,88\text{ EUR}$` read as USD, answer was right | 1 | arith-21 r1 |

The post-check missed all 18 alone-arm cases; one wrote its wrong equation in parentheses, "(930,00 EUR / 30 Tage) * 13 Tage = 372,00 EUR", which `postcheck.ts` does not parse (a parenthesis ends the relation scan). Not fixed here; the frozen post-check stays frozen.

### Phase 0.2 - supplier prices (public, no sign-in)

`https://tinfoil.sh/pricing` lists no per-model figures (it says API access is "per-model pricing based on input and output token usage" and points to the model catalog); `https://tinfoil.sh/models` renders the catalog from a script, empty when fetched. The public, unauthenticated catalog endpoint `GET https://inference.tinfoil.sh/v1/models` (HTTP 200 without a key, read 23 October 2026 16:55 UTC) gives, USD per million tokens (input / output / cached input), chat models only:

| Model id | Input | Output | Cached input | Experimental | Context |
| --- | --- | --- | --- | --- | --- |
| gpt-oss-120b | 0.15 | 0.60 | - | no | 131,072 |
| gemma4-31b | 0.40 | 1.00 | - | no | 262,144 |
| glm-5-3 | 1.80 | 5.75 | 0.45 | no | 1,048,576 |
| kimi-k3 | 4.00 | 20.00 | 0.80 | no | 262,144 |
| llama3-3-70b | 1.75 | 2.75 | - | no | 131,072 |
| deepseek-v4-1-flash | 0.65 | 1.45 | 0.13 | **yes** | 1,048,576 |

Request price 0 for all chat models. Same figures as the catalog saved by the gate runs on 23 October 16:03 UTC. Every model needed (GPT-OSS, Gemma, GLM-5.3, Kimi K3) is listed and not experimental.

### Phase 0.3 - locale parser and decimal evaluator (pure code)

- `src/arithmetic/locale-number.ts`: German (1.234,56), English (1,234.56), Swiss apostrophe and narrow-space grouping (1'234.56, 1’234,56, 1 234,56); "1.234" / "1,234" reported as `ambiguous` with both readings unless a locale is named; malformed tokens refused with a reason; rounding half-up, half-even, half-down, down, up and Swiss 0.05; `formatLocaleNumber` never writes a groupable three-digit fraction or a four-digit grouped integer, so nothing it writes is ambiguous.
- `src/arithmetic/evaluator.ts`: program over named decimal operands with the operations add, subtract, multiply, divide, percent_of, add_percent, subtract_percent, ratio_percent, power (integer exponent 0..600), round (decimals and mode), min, max, sum; decimal.js at 60 digits; errors carry a code and the step id. Regression tests: 29.99 x 1.07 = 32.0893 -> 32.09; 4,100 x 0.9472 = 3883.52 exactly; "1.234" read only by the stated locale.
- Tests: `tests/arithmetic-locale-number.test.ts` (13) and `tests/arithmetic-evaluator.test.ts` (9); all pass.

### Phase 1 - Design A

`src/arithmetic/spans.ts` gives every number, clock time, duration and date in the user's turns an id (`t1n3`), with the canonical value (minutes for times, day numbers for dates) and an ambiguity marker only when the text's own number forms give no locale clue (words of the language are not a clue). `src/arithmetic/design-a.ts` builds a per-request JSON schema whose reference enum is exactly the span ids, the twelve constants (`const:1` ... `const:1000`) and step ids `s1`..`s24`; parses and validates the model's program (explicit step ids, references only to earlier steps, value typing: dates and clock times may only be shifted by plain amounts or subtracted from each other, and a result's format must match its value type); evaluates it with the Phase 0 evaluator; renders the answer only from computed values in the case locale; compares the model's own estimate (`claimed`) with the exact value (exact at the shown precision = "recomputed and matches"; within 1 % = consistent, state "calculated"; further away = flagged; not a number = flagged as not cross-checked); and runs a final ledger check that every number in the rendered text equals a span, constant or computed value (numbers in the model's note outside the ledger are marked "not checked by us" and flagged). Two shape rules from the dev batches (general classes, no invented value): a reused step id is a chain, and extra `const:` args on `round` are redundant with its `decimals` field. Tests: `tests/arithmetic-design-a.test.ts` (23).

Dev set: `evaluation/arithmetic-gate/dev-v2-20261023.json`, 24 cases (12 German, 12 English, 10 critical), generated by `make-dev-v2.ts`, every expected value from a derivation, shared with no other set (tested); `tests/arithmetic-dev-v2.test.ts` (7) also proves every operand of every derivation is a span or a constant. Live harness `evaluation/arithmetic-gate/harness-v2.ts`: non-streaming `response_format: json_schema (strict)`, 1500 ms pacing, one 429 retry, cap check before every conversation, results under `.local\arithmetic-v2-20261023\`, one line per batch appended to the shared `cost-log.jsonl`; refuses every set but `dev`.

GPT-OSS 120B (reasoning low), dev set, 24 conversations per batch, no retry. The code changed between batches (tuning on the dev set, allowed); r0-4 is the committed Phase 1 state:

| Batch | Exact, no flag (verified by recomputation) | Exact, flagged (false flag) | Wrong, flagged | Silent wrong | No answer | Cost USD |
| --- | --- | --- | --- | --- | --- | --- |
| r0-1 (positional step ids, estimate optional) | 6 | 6 | 6 | 1 | 5 | 0.0214 |
| r0-2 (explicit ids, typing, estimate required) | 7 | 5 | 0 | 1 | 11 | 0.0199 |
| r0-3 (shape rules, tolerance, junk estimate not flagged) | 17 | 3 | 0 | 2 | 2 | 0.0266 |
| **r0-4 (committed: junk estimate flagged, currency-on-minutes refused)** | **7** | **12** | **2** | **0** | **3** | 0.0242 |

What the flags were in r0-4: 6 conversations flagged only because the model's estimate was junk ("ref", "refId?"), 5 because the estimate differed (one of them a stale copy of the previous turn's figure), 1 the designed ambiguity flag on "1,840". Counterfactual on the same batch, junk estimates not flagged: 13 / 6 / 2 / 0 / 3. The two caught errors (dev2-04: gross x 1.19 then divided, dev2-05: ratio instead of change) were caught by differing estimates. The three no-answers were `cannot_answer` on the follow-up turn. The silent wrongs of r0-1 and r0-2 were a date rendered with the format `days` (now refused by typing) and a sign-convention case in the dev set itself (dev2-05 rewritten to state the sign). Run-to-run variance at reasoning low is large; the same code gave 17 and 7 clean conversations in consecutive batches.

### Phase 2 - one structured retry; GLM-5.3; Kimi K3

| Configuration (dev set) | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer | Requests | Cost USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GPT-OSS 120B low, retry 1 (`gptoss-dev-a-r1-1`) | 24 | 11 | 9 | 3 | **0** | 1 | 57 | 0.031 |
| GLM-5.3 low, retry 1 (`glm-dev-a-r1-1`) | 24 | 7 | 9 | 8 | **0** | 0 | 56 | 0.240 |
| Kimi K3, no retry, 10-case probe (`kimi-dev-a-r0-probe`) | 10 | 9 | 1 | 0 | **0** | 0 | 20 | 0.424 |

- Retry rescued 6 of 24 GPT-OSS conversations and 7 of 24 GLM conversations (cannot_answer, unknown reference, arity, truncation). GPT-OSS false flags: 4 junk estimates, 4 differing estimates, 1 ambiguity. GLM's 8 wrong conversations were wrong result references (an intermediate step shown as the final figure) and `add_percent` applied to the amount instead of `const:1`; all flagged. Kimi: 32 of 32 shown figures had a matching estimate; its one flag is the designed "2,250"-style ambiguity case; cost 20 times GPT-OSS per request.
- One limit the estimate cannot cover: in `gptoss-dev-a-r1-1` dev2-02 turn 2 the model ignored the correction consistently in both program and estimate; it was flagged only because turn 1 had a junk estimate. The estimate is a consistency check, not a correctness check.
- Estimate states over all shown figures: GPT-OSS retry 1: 54 matches, 11 close, 9 differ, 7 unusable; GLM: 47 / 1 / 15 / 18; Kimi: 32 matches.

### Phase 3 preparation - gate v2 (NOT RUN)

- `evaluation/arithmetic-gate/unseen-v2-20261023.json`: 30 cases (15 German, 15 English, 12 critical) generated once by `make-unseen-v2.ts` in styles the earlier sets do not use; every expected value from a derivation, hand-checked by the sub-agent against the printed values; shares no turn with any earlier set (tested). **Frozen: SHA-256 (LF-normalised) `2a57ddeb79b332745cd4ccef3a2abafdfc75bcf65ead629baa58e31373af04d2`**, enforced by `tests/arithmetic-unseen-v2.test.ts` (8).
- `evaluation/arithmetic-gate/THRESHOLD-v2.md` (PROPOSED): configurations C1 = GPT-OSS 120B low with one retry (3 repetitions, n = 90, gated) and C2 = Kimi K3 no retry (1 repetition, screen only, about USD 1.30); outcomes verified-by-recomputation / flagged / no-answer / silent-wrong defined per conversation; bar for C1: silent wrong 0 of 90, verified at least 60 of 90, flagged at most 27, no answer at most 9, critical cases never silent-wrong or no-answer. The dev-set run of C1 would fail the verified and flagged bars as proposed; the file says so and offers the owner three options. The harness refuses `unseen-v2` until the main session relays approval.

### Spend

| Batch | Requests | Cost USD |
| --- | --- | --- |
| gptoss-dev-a-probe, -probe2 | 7 | 0.0033 |
| gptoss-dev-a-r0-1 .. r0-4 | 182 | 0.0921 |
| gptoss-dev-a-r1-1 | 57 | 0.0313 |
| glm-dev-a-r1-1 | 56 | 0.2401 |
| kimi-dev-a-r0-probe | 20 | 0.4243 |
| **Arithmetic v2 total (usage x live price; no refused requests)** | **322** | **0.791** |

Against the brief's USD 3.98 remaining: **USD 3.19 remain** (USD 5.00 cap; prior usage-only USD 0.66, prior conservative log USD 1.02 as stated by the brief). Every batch is one line in `.local\arithmetic-gate-20261022\cost-log.jsonl` (`set` prefixed `v2-`). Owner's billing dashboard remains the reconciliation.

### Contradictions found

1. The brief says "Gemma alone 13 silent-wrong cases"; `report-sets.ts` on `gemma-gate-alone-final` gives 18 silent wrong (and 13 for the Gemma calculator arm). Both are classified above.
2. The brief says the conservative log is USD 1.02; the lines in `cost-log.jsonl` before this work sum to USD 0.8705. Either earlier batches were logged elsewhere or the 1.02 includes the 20 October screen; not resolved here. The remaining-budget figure above uses the brief's 3.98.
3. The brief says the worktree is cut from `codex/development-handoff`; it was created on `main` (87d4acb) without the arithmetic files. The sub-agent reset its own branch to `codex/development-handoff` (a0275ee) before starting; nothing else was touched.
4. `tinfoil.sh/pricing` carries no prices; the prices come from the public catalog endpoint, which `docs/provider-qualification.md` ("20 October public price list") does not name as its source.
5. THRESHOLD.md (frozen) freezes `numbers.ts` and `postcheck.ts`; the scorer artefact (LaTeX dollar read as USD) and the parenthesised-equation miss were left in place for that reason.

### Verification counts (sub-agent, this branch)

`npx tsc --noEmit` clean. `npx vitest run` on the whole suite: see the final report (baseline before the last two commits passed, exit 0, 136 s). New tests: 60 (locale 13, evaluator 9, design A 23, dev set 7, unseen v2 8). No browser or Docker runs.
