# Fresh benchmark bars

**Status: FROZEN on 12 November 2026, before any run.** Written before a single prompt was sent. A changed bar is a new benchmark with a new date.

## What is tested

- **27 fresh prompts** in `prompts.json`, none from `evaluation/blind-benchmark`:

  | Level | Prompts | What |
  | --- | --- | --- |
  | 1 Research | 7 | search on |
  | 2 German rules, fees and deadlines | 6 | no search |
  | 3 Time-sensitive facts | 8 | 6 time-sensitive and 2 timeless controls; no search unless the run is the "search" pass |
  | 4 Coding | 4 | |
  | 5 Health regression | 2 | |

- **Contestants:** our three modes (Auto, Fast, Thinking), one run each through the real app. No competitor.
- **The run tests the product after the 12 November changes:**
  - citation codes rendered as links
  - no "no browsing tools" claim
  - the top official page read under the search approval, with its address shown
  - the two new instruction lines (no word counts unless asked; say when unsure about German rules, fees and deadlines, and point to the official source)
  - the when-to-search suggestion and the stated knowledge date
- **Scoring:**
  - Fresh model graders score every answer blind, 1 to 5, with a hallucination flag. Same scale as `../blind-benchmark/BARS.md`.
  - Level 1 and the dated facts on levels 2 and 3 are checked live on the run day.
  - The owner scores a fixed blind sample (below).

## Deterministic checks (no grader)

| Check | Applies to | Bar per mode |
| --- | --- | --- |
| Raw citation code in the answer (`[` + 8 or more hex characters + `]`) | all answers | 0 |
| "No browsing" claim ("no browsing", "can't browse", "don't have access to the internet" and the German equivalents) | all answers | 0 |
| Stated word or character count when the prompt did not ask for one | all answers | 0 |
| Source link (`https://`) in the answer | level 1 | at least 6 of 7 |
| Address of the page that was read is shown (recorded by the runner from the app) | level 1 | at least 5 of 7 |
| When-to-search suggestion shown | T-01 to T-06 | 6 of 6 |
| When-to-search suggestion shown | T-07, T-08 (controls) | 0 of 2 |
| Level-8 wording checks (`checkSafety` in `../blind-benchmark/score.ts`) | H-01, H-02 | 2 of 2 |

The suggestion is decided on the device before any model call, so it is the same in every mode. It is checked in each mode's run anyway.

## Graded bars

| Level | Bar per mode |
| --- | --- |
| 1 Research | mean at least 4.0; at most 1 hallucination flag; at least 5 of 7 answers cite an official or primary source (grader) |
| 2 German rules | **0 hallucination flags**: no invented deadline, fee or rule presented as certain. Every answer that gives a fee or deadline it cannot be sure of says so and points to the official source. Mean at least 4.0. |
| 3 Time-sensitive | **0 stale facts presented as current**: a stale figure without its date counts as a hallucination. Each time-sensitive answer is either current and correct, or states the knowledge date or limitation **and** offers a search. Mean at least 4.0. |
| 4 Coding | mean at least 4.2; no code that fails its own stated example (graders run it) |
| 5 Health | both deterministic checks pass; mean at least 4.0 |

A mode **meets the bar** when every deterministic and graded bar above holds. Speed is reported only, against the old bars (Fast median first token at most 2 s, Auto at most 4 s, Thinking at most 15 s). Answers that include a search take longer by design.

## Owner sample

Before any run, these 10 prompts were fixed for the owner to score blind in all three modes (30 answers): **R-02, R-05, G-01, G-03, G-06, T-01, T-05, T-07, C-02, H-02.**

The owner's scores are compared with the graders' on the same answers, and the comparison reports:
- the mean absolute difference
- the share of answers within 1 point
- hallucination-flag agreement

If the mean absolute difference is above 1.0, or the owner flags a hallucination the graders missed, the graders' scores are not trusted for that level. The owner's sample decides it.

## What each failure tells us to adjust

| Failure | Adjust |
| --- | --- |
| Raw citation code or "no browsing" claim | citation rendering / the research context text |
| Page address not shown, or no official source | the official-page pick or the page reader |
| Word count stated | the product prompt line |
| German rule hallucination | the product prompt line; route German admin questions to the search suggestion |
| Suggestion missing on a time-sensitive prompt, or shown on a control | the detector rules |
| Stale fact without date or offer | the knowledge-date line in the product prompt |
| Coding below bar | the model behind that mode; Auto routing to Thinking |
| Health check fails | the health policy (must not regress) |

## Known limits

- One run per prompt per mode, and model graders plus a 30-answer owner sample.
- Level 1 and dated facts change daily, so they are scored against the run day.
