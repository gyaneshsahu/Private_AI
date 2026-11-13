# Bars for the German routing check (frozen 13 November 2026, before any run)

Written together with `prompts.json` and committed before `check.ts` was run on it. Nothing here changes after the first run.

## The set

- 60 new prompts: 40 German (14 German rules, fees or deadlines in everyday words, 26 others: urgent 3, coding 3, maths 3, rewriting 3, reasoning 3, everyday 4, health 3, time-sensitive 4) and 20 English (4 rules, 16 others across the same categories).
- None is taken or paraphrased from `evaluation/german-rules-40-20261113` or the earlier benchmark sets.
- Each prompt carries the mode Auto should choose without web results (by the documented order in `docs/routing-and-search-20261112.md`), whether the German-rules detector should fire, and, outside the rules prompts, whether the when-to-search detector should fire.

## Bars

| Measure | Bar |
| --- | --- |
| German routing agreement (autoDecision mode equals the expected mode, 40 German prompts) | at most 5 points below the English agreement (20 English prompts) |
| German rules recall (germanRulesQuestion fires on the 14 German rules prompts) | at least 70 % (10 of 14) |
| False alarms (germanRulesQuestion fires on the 26 German prompts that are not about rules) | at most 5 % (at most 1 of 26) |
| Answer-side check false alarms on the stored non-rules answers (calibration corpus of 13 November, 501 answers) | at most 0.6 % (3 of 501), as before |

Reported without a bar: the when-to-search detector agreement per language, English rules recall, and every category on its own.

## Rules for any change

- Cue changes must be general (German words and patterns for the mechanism), never a fix for one prompt.
- If German falls short and the cues change, a second fresh hold-out of about 20 German prompts is written after the change and before it is run (`holdout.json`). It is run once, reported as it comes, and nothing is tuned on it.
- The 40-question set (`evaluation/german-rules-40-20261113`) is not used for tuning.
- All existing tests keep passing.
