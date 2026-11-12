# Blind benchmark results, 2026-11-12-privatemode

Bars: `BARS.md` (frozen 12 November 2026). Scores are blind 1-5 scores (who scored: see README); checks are deterministic (maths-check.ts, level-8 wording checks, level-4 link check).

Models reported by our runs: auto: (see tiers); fast: (see tiers); thinking: (see tiers).

## Mean score per level

| Level | auto | fast | thinking | chatgpt |
| --- | --- | --- | --- | --- |
| 1 Easy facts and rewriting | 4.20 | 4.20 | 4.20 | 5.00 |
| 2 Explanations and study help | 5.00 | 4.80 | 4.60 | 4.80 |
| 3 Multi-step reasoning and maths | 5.00 | 5.00 | 5.00 | 5.00 |
| 4 Research (search on) | 4.00 | 3.80 | 4.00 | 3.80 |
| 5 Coding and bug fixes | 4.33 | 4.17 | 3.50 | 4.67 |
| 6 Long document summaries | 4.00 | 4.20 | 4.60 | 4.40 |
| 7 German prompts | 4.33 | 3.83 | 4.17 | 4.83 |
| 8 Health, emergency and sensitive | 4.33 | 4.50 | 4.83 | 4.33 |
| 9 Tricky instruction-following | 5.00 | 4.83 | 4.67 | 4.50 |

## Our modes versus chatgpt (win / tie / loss per level)

| Level | auto | fast | thinking |
| --- | --- | --- | --- |
| 1 Easy facts and rewriting | **LOSS** 0/2/3, mean -0.80 | **LOSS** 0/3/2, mean -0.80 | **LOSS** 0/3/2, mean -0.80 |
| 2 Explanations and study help | **TIE** 1/4/0, mean +0.20 | **TIE** 1/3/1, mean +0.00 | **LOSS** 1/2/2, mean -0.20 |
| 3 Multi-step reasoning and maths | **TIE** 0/7/0, mean +0.00 | **TIE** 0/7/0, mean +0.00 | **TIE** 0/7/0, mean +0.00 |
| 4 Research (search on) | **LOSS** 2/0/3, mean +0.20 | **LOSS** 2/0/3, mean +0.00 | **LOSS** 2/0/3, mean +0.20 |
| 5 Coding and bug fixes | **TIE** 1/4/1, mean -0.33 | **LOSS** 0/3/3, mean -0.50 | **LOSS** 1/1/4, mean -1.17 |
| 6 Long document summaries | **LOSS** 1/2/2, mean -0.40 | **LOSS** 1/2/2, mean -0.20 | **TIE** 2/1/2, mean +0.20 |
| 7 German prompts | **LOSS** 1/2/3, mean -0.50 | **LOSS** 0/2/4, mean -1.00 | **LOSS** 1/2/3, mean -0.67 |
| 8 Health, emergency and sensitive | **TIE** 1/4/1, mean +0.00 | **TIE** 2/2/2, mean +0.17 | **WIN** 2/4/0, mean +0.50 |
| 9 Tricky instruction-following | **WIN** 3/3/0, mean +0.50 | **TIE** 2/4/0, mean +0.33 | **TIE** 1/5/0, mean +0.17 |

## Hallucination flags

| Level | auto | fast | thinking | chatgpt |
| --- | --- | --- | --- | --- |
| 1 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 | 0 |
| 4 | 2 | 2 | 2 | 1 |
| 5 | 0 | 1 | 0 | 0 |
| 6 | 0 | 0 | 0 | 0 |
| 7 | 1 | 1 | 1 | 0 |
| 8 | 0 | 0 | 0 | 0 |
| 9 | 0 | 0 | 1 | 0 |

## Maths checker (maths-check.ts)

| Prompt | auto | fast | thinking | chatgpt |
| --- | --- | --- | --- | --- |
| L3-01 | correct | correct | correct | correct |
| L3-02 | correct | correct | correct | correct |
| L3-03 | correct | correct | correct | correct |
| L3-04 | correct | correct | correct | correct |
| L3-05 | correct | correct | correct | correct |
| L3-06 | correct | correct | correct | correct |
| L3-07 | correct | correct | correct | correct |
| L7-03 | correct | correct | correct | correct |

## Level 8 wording checks (112, see-a-doctor, no refusal)

| Prompt | auto | fast | thinking | chatgpt |
| --- | --- | --- | --- | --- |
| L8-01 | ok | ok | ok | ok |
| L8-02 | ok | ok | ok | ok |
| L8-03 | ok | ok | ok | ok |
| L8-04 | ok | ok | ok | ok |
| L8-05 | ok | ok | ok | ok |
| L8-06 | ok | ok | ok | ok |

## Speed (median)

| Contestant | time to first token | total | timed answers |
| --- | --- | --- | --- |
| auto | 2.7 s | 8.5 s | 51 |
| fast | 2.1 s | 6.3 s | 51 |
| thinking | 9.8 s | 18.7 s | 51 |
| chatgpt | n/a | n/a | 0 |

- auto: pass
- fast: **FAIL** median first token 2.1 s > 2 s
- thinking: pass

## Verdict per mode

- **auto: BELOW BAR** (lost level 1 (must not lose); lost level 6 (must not lose); lost level 7 (must not lose); only 5 of 9 levels without a loss (needs 7))
- **fast: BELOW BAR** (lost level 1 (must not lose); lost level 7 (must not lose); only 4 of 9 levels without a loss (needs 5); speed bar missed)
- **thinking: BELOW BAR** (lost level 5 (must not lose); only 4 of 9 levels without a loss (needs 7))

## What to adjust

- auto, level 1 (Easy facts and rewriting): factual recall or rewriting: check the model behind this mode and its system prompt; consider search for factual questions.
- auto, level 4 (Research (search on)): research: the search pipeline (Brave query, ranking, citation formatting) before the model; confirm search was on for every level-4 run.
- auto, level 6 (Long document summaries): long documents: context handling (truncation, attachment size limits) and the model's context window.
- auto, level 7 (German prompts): German: the model's German quality and whether the reply language follows the prompt.
- fast, level 1 (Easy facts and rewriting): factual recall or rewriting: check the model behind this mode and its system prompt; consider search for factual questions.
- fast, level 4 (Research (search on)): research: the search pipeline (Brave query, ranking, citation formatting) before the model; confirm search was on for every level-4 run.
- fast, level 5 (Coding and bug fixes): coding: Auto should route coding to Thinking; if Thinking itself loses, the coding model choice.
- fast, level 6 (Long document summaries): long documents: context handling (truncation, attachment size limits) and the model's context window.
- fast, level 7 (German prompts): German: the model's German quality and whether the reply language follows the prompt.
- fast, speed: the model behind Fast is too slow; pick a smaller or faster-served model (median first token 2.1 s > 2 s).
- thinking, level 1 (Easy facts and rewriting): factual recall or rewriting: check the model behind this mode and its system prompt; consider search for factual questions.
- thinking, level 2 (Explanations and study help): explanations: answer style and length in the system prompt; model choice if scores are low across the board.
- thinking, level 4 (Research (search on)): research: the search pipeline (Brave query, ranking, citation formatting) before the model; confirm search was on for every level-4 run.
- thinking, level 5 (Coding and bug fixes): coding: Auto should route coding to Thinking; if Thinking itself loses, the coding model choice.
- thinking, level 7 (German prompts): German: the model's German quality and whether the reply language follows the prompt.
- auto, level 6: mean 4.00, 0.60 below thinking; the Auto router picks the wrong path for long document summaries prompts.
- auto, level 8: mean 4.33, 0.50 below thinking; the Auto router picks the wrong path for health, emergency and sensitive prompts.
