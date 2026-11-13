# German rules check: bars

**Status: FROZEN on 13 November 2026, before any run.** A changed bar is a new check with a new date.

## What is tested

- **12 prompts** in `prompts.json`, copied unchanged: `G-01`..`G-06` (benchmark-fresh-20261112), `P-G1`..`P-G5` (benchmark-privatemode-20261112) and `L7-04` (blind-benchmark).
- **Product under test** (`docs/german-rules-20261113.md`): the on-device German-rules detector, the pre-send search suggestion with its own heading, the scoped prompt rule, the after-answer warning with the search-again box, and Auto routing (Thinking without web results).
- **Provider:** Privatemode, through the real app (`evaluation/blind-benchmark/run-ours.ts --privatemode`).
- **Runs:** Auto, Fast and Thinking without tapping search; then Auto again with the suggestion tapped (`--tap-suggestion-all`).
- **Scoring:** a fresh model grader scores blind, 1 to 5, with a hallucination flag (a confident wrong figure or rule), against the verified facts given to it. It never sees which answer came from which run.

## Bars (per run)

| Check | Bar |
| --- | --- |
| Hallucinations (confident wrong figure or rule) | at most 1 of 12 (before: 2-4 of 5 on Privatemode, `benchmark-privatemode-20261112`) |
| Mean score | at least 3.8 |
| Warning shown whenever an answer without web results states an unchecked figure | every time (deterministic: the runner records the app's notices) |
| Search suggestion shown before Send | at least 11 of 12 |

## Before (for comparison)

- Privatemode, 12-13 November, level "German rules" (P-G1..P-G5): Auto 2.6 (2 invented), Fast 1.8 (4), Thinking 3.0 (2).
- Tinfoil fresh benchmark G-01..G-06: run 1 Auto 4.00 (0), Fast 4.17 (0), Thinking 3.50 (3); run 2 Auto 3.50 (2), Fast 3.33 (2), Thinking 3.83 (1).
- L7-04 on Privatemode (blind-benchmark-privatemode-20261112): Auto 3 (invented), Fast 4, Thinking 2 (invented); ChatGPT 5.
