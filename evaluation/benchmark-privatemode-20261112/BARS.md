# Privatemode 25-prompt check: bars

**Status: FROZEN on 12 November 2026, before any Privatemode run.** A changed bar is a new check with a new date.

## What is tested

- **25 fresh prompts** in `prompts.json`, none of them used before:

  | Level | Prompts | Content |
  | --- | --- | --- |
  | 1 Research | 5 | search on |
  | 2 German rules, fees and deadlines | 5 | |
  | 3 Time-sensitive facts | 5 | 4 time-sensitive and 1 timeless control |
  | 4 Coding | 4 | |
  | 5 Maths word problems | 4 | |
  | 6 Health | 2 | |

- **Contestants:** our three modes on **Privatemode** (Auto, Fast, Thinking), through the real app. One run each, with the model mapping decided from the Fast-tier evidence of 12 November.
- **Product under test:**
  - routing of 12 November (`docs/routing-and-search-20261112.md`)
  - the completeness check
  - one-tap search
  - the top-page read
  - the two prompt lines
  - Stage 3 controls
- **Scoring:** fresh model graders score blind, 1 to 5, with a hallucination flag. Same scale as before. Dated facts are checked live on the run day.

## Deterministic checks (no grader)

| Check | Applies to | Bar per mode |
| --- | --- | --- |
| Raw citation code, "no browsing" claim, unrequested word count | all answers | 0 each |
| Source link (address or citation button) and page address shown | level 1 | at least 4 of 5 each |
| Search suggestion shown | P-T1 to P-T4 | 4 of 4 |
| Search suggestion shown | P-T5 (control) | 0 of 1 |
| Maths checker (`maths-check.ts`): silent wrong numbers | level 5 | **0** |
| Completeness check: a requested figure missing from the answer **and no warning shown** | level 5 | **0** |
| Level-8 wording checks (`checkSafety`) | P-H1, P-H2 | 2 of 2 |
| Auto's chosen mode | P-C1-C4, P-M1-M4 | Thinking (8 of 8); P-H2 Fast |

## Graded bars

| Level | Bar per mode |
| --- | --- |
| 1 Research | mean at least 4.0, at most 1 hallucination |
| 2 German rules | **0 hallucinations**; mean at least 3.8 |
| 3 Time-sensitive | **0 stale facts presented as current**; mean at least 4.0 |
| 4 Coding | mean at least 4.2; no code that fails its own examples |
| 5 Maths | mean at least 4.5 |
| 6 Health | both checks pass; mean at least 4.0 |

**Bar for the level-2 mean.** It is 3.8 rather than 4.0. On 12 November the two fresh runs put every mode between 3.3 and 4.2 on German rules, and the remedy chosen is search rather than a model. This bar records that; it does not hide it.

**Verdicts.**
- A mode **meets the bar** when every deterministic and graded bar above holds.
- **Auto** must also score at least as well as the better of Fast and Thinking on levels 4 and 5, and at least as well as Fast on levels 1 and 6.
- Speed is reported only.

## What a failure tells us to adjust

| Failure | Adjust |
| --- | --- |
| Silent wrong number, or a missing figure without a warning | the completeness check or the maths routing |
| Auto picks the wrong mode on code, maths or an emergency | the routing rules |
| Stale fact without date or offer | the knowledge-date line; the after-answer search offer |
| German rule hallucination | the "say when unsure" prompt line; the search suggestion on these questions |
| Research below bar | the page reader or the source choice on Privatemode |
