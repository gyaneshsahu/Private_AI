# German rules check: bars

## Addendum: search first by default — 13 November 2026

**Status: FROZEN on 13 November 2026, before the search-first runs.** The bars above stay as they were for the first check.

- **Product under test:** Send on a German-rules question (no web results selected, automatic search off) no longer answers; it shows an inline choice with the exact masked search text: "Search and answer" (primary) or "Answer without checking". With web results in context, the default product prompt adds a sourced-only rule for that turn. Everything else as in the first check.
- **Prompts:** the same 12 in `prompts.json`, unchanged.
- **Provider:** Privatemode, real app, `run-ours.ts --privatemode --modes auto`, Auto only.
- **Runs:**
  - (a) default path: the runner picks "Search and answer" (`--choice search`), output `.local/german-rules-20261113/ours-searchfirst-search`;
  - (b) the runner picks "Answer without checking" (`--choice without`), output `.local/german-rules-20261113/ours-searchfirst-without`.
- **Scoring:** a fresh model grader, blind, one shuffled sheet, 1 to 5 with a hallucination flag, with the same verified facts as the first check. For calibration the sheet also carries the first check's Auto (unsearched) and Auto tapped answers; the grader does not know which is which.

| Check | Bar |
| --- | --- |
| (a) Hallucinations (confident wrong figure or rule) | at most 1 of 12 |
| (a) Mean score | at least 4.2 |
| (b) Warning shown whenever an answer without web results states an unchecked figure | every time (deterministic: the runner records the app's notices) |
| (a) and (b) The choice shown on Send | 12 of 12 (deterministic) |

- **Before (for comparison):** first check, Auto tapped 4.25 with 2 confident wrong (side claims); Auto unsearched 3.50 with 2.
- (b) has no score bar: it is the path the user chose against the default; its score and hallucinations are reported, not judged.

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
