# German rules: answer-side check, Brave Goggles, "always search" (frozen bars)

**Status: FROZEN on 13 November 2026, before any run.** Written by the parent session, before the agent saw the 40 questions in `prompts.json`.

## Runs

All runs are on Privatemode in Auto, through the real app, one answer per question:

| Run | What it is |
| --- | --- |
| **U** | Unsearched: the runner chooses "Answer without checking", or the question is not detected and goes straight to the model |
| **S** | Searched with the current search (Brave's own ranking plus our official-source preference); the runner chooses "Search and answer" wherever the choice appears |
| **G** | Searched with Brave Goggles boosting official sites. Run only if our Brave plan supports Goggles |

Every answer is graded blind by fresh graders. U, S and G are shuffled together, so all three are judged the same way, and facts are checked live. A **confident error** is a wrong figure, deadline or rule presented as fact, with no "unchecked" label in the answer.

## Measures, reported with and without each change

1. **Answer-side check.** It needs no extra run: it is applied to the U answers offline.
   - Measure: confident errors in U that carry a warning, with the question-detector warning alone versus with the answer-side check added.
   - False alarms: run the answer-side check over the stored non-rules answers (maths, health, coding, everyday; at least 300 answers in `.local/`).
2. **Brave Goggles:** confident errors in G against S, and official source cited in G against S.
3. **"Always search":** confident errors with the setting on against the current default.
   - Setting on: every question the question detector catches is searched; undetected ones stay as in U.
   - Current default: what a user who picks "Answer without checking" gets (U).
   - Both are computed from U and S (or G) by question; no extra run.

## Decision rule (owner: "if the gain is small, ship the warnings and honest wording and move on")

| Change | Keep if |
| --- | --- |
| Answer-side check | It warns on at least half of U's confident errors that the question detector missed, with false alarms on at most 3 % of non-rules answers |
| Goggles | It cuts confident errors on the searched path by at least 5 of 40 against S, without a fall in mean score |
| "Always search" | Ship it in any case. It is a user choice and costs nothing when off. Report the error reduction it gives |

A change below its bar is removed from the default path, or left off. The warnings and the honest "no official source" and "unchecked" wording stay in either case.
