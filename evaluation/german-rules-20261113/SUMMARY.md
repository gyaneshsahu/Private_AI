# German rules check: summary (13 November 2026)

12 prompts (`prompts.json`) with bars frozen before the run (`BARS.md`). All four runs went through the real app on **Privatemode** (`run-ours.ts --privatemode`). The runs were Auto, Fast and Thinking without tapping search, then Auto with the suggestion tapped (`--tap-suggestion-all`).

A fresh model grader scored all 48 answers blind in one shuffled sheet (`scoring-sheet.md`, `scoring-sheet.csv`). It was given the verified facts. The key is in `.local/german-rules-20261113/key.json`, where `chatgpt` stands for the tapped Auto run, because the sheet tool has only that slot for a fourth contestant.

## Result against the bars

| Run | Mean | Invented (confident wrong) | Hedged wrong (labelled unchecked) | Warning when an unchecked figure appears | Suggestion shown before Send |
| --- | --- | --- | --- | --- | --- |
| Auto | 3.50 | 2 (G-03, G-05) | 2 | 12 of 12 | 12 of 12 |
| Fast | 3.17 | 3 (G-01, P-G5, L7-04) | 1 | 9 of 9 | 12 of 12 |
| Thinking | 3.08 | 2 (G-02, L7-04) | 4 | 11 of 11 | 12 of 12 |
| **Auto, suggestion tapped** | **4.25** | 2 (P-G1, L7-04) | 1 | no unchecked figures (web results used) | 12 of 12 |
| Bar | at least 3.8 | at most 1 of 12 | | every time | at least 11 of 12 |

- **Met in every run:**
  - The suggestion appeared on 12 of 12, always with the heading "Rules, fees and deadlines change. Check the official source first:".
  - The warning appeared every time an answer without web results stated a figure.
  - After every unsearched answer, the "Search and answer again" box was shown (Thinking 11 of 12: G-06 timed out).
- **Mean score:** only the tapped search path met the bar (4.25).
- **Invented details:** no run met the bar of at most 1. Every run had 2 or 3.
- **Tapped run:**
  - The server read a top page for 12 of 12 searches. 4 of them were official: finanzamt.nrw.de, rundfunkbeitrag.de, verwaltung.bund.de and gesetze-im-internet.de. The others were ADAC, guides and law portals.
  - Both invented details in that run are side claims, not the figure that was asked for:
    - P-G1: business statements kept 10 years; 8 years since 2025.
    - L7-04: car re-registration "usually within 4 weeks"; the rule is "unverzüglich".

## Before and after

On the same prompts. "Before" is the earlier blind grading of the same prompt IDs.

| Prompts | Before | After: Auto | After: Fast | After: Thinking | After: Auto tapped |
| --- | --- | --- | --- | --- | --- |
| P-G1..P-G5, Privatemode | Auto 2.6 (2 invented), Fast 1.8 (4), Thinking 3.0 (2) | **3.4 (0)** | **3.2 (1)** | **3.2 (0)** | **4.6 (1)** |
| G-01..G-06, before on Tinfoil (run 2) | Auto 3.50 (2), Fast 3.33 (2), Thinking 3.83 (1) | 3.50 (2) | 3.33 (1) | 3.00 (1) | 4.00 (0) |
| L7-04, Privatemode | Auto 3 (invented), Fast 4, Thinking 2 (invented) | 4 | 2 (invented) | 3 (invented) | 4 (invented) |

**What changed:**
- On the Privatemode prompts, confident wrong answers fell from 8 of 15 to 1 of 15 across the three modes.
  - The speeding fine is now hedged ("ungeprüft, ca. 115 €") or not given as a number.
  - The rent increase no longer says "silence is consent".
- **What did not change:** the models still state some figures. With the new prompt rule they label them unchecked, and the grader counted these as "hedged wrong" when the figure was wrong. There were 7 such answers without search, and every one of them showed the warning.
- **Wrong figures that remain** (with and without the "unchecked" label):
  - Auto P-G4: a one-month driving ban, which does not apply at 21-25 km/h.
  - Thinking G-02: a two-year filing deadline, stated as fact.
  - Fast P-G5: wrong consent and increase periods.
  - L7-04 in three runs: small checklist errors.
- **Routing:** Auto answered all 12 questions on Thinking. Auto (3.50) scored higher than Thinking alone (3.08) on the same model. That is within run-to-run variation on 12 prompts, not evidence that Auto is better.

## Verdict

- **The search path is the fix:**
  - one tap
  - mean 4.25
  - no confident wrong figure for what was asked
- **Without the search:**
  - The hedging rule and the warning clearly reduce the harm: confident wrong answers on the Privatemode prompts fell from 8 to 1 of 15.
  - The answers still miss the hallucination bar in every mode.
- **The warning and the suggestion** work as designed (deterministic bars met).

## Run notes

- **Fast, first pass:** P-G4, P-G5 and L7-04 failed with "Protected response unavailable" about 3.7 s after Send, before any answer text. The runner did not record HTTP statuses then, so the cause is unknown. HTTP 429 on attestation is possible but not shown.
  - The runner now records failed request statuses.
  - The same three prompts were rerun straight away, on their own, and answered normally. The rerun answers are the ones graded.
- **Backup model:** Auto P-G5 and Auto L7-04 were answered by the backup model after one automatic retry, as labelled.
- **Thinking G-06** timed out after 90 s. The partial answer was graded as it was (2).
- **Privatemode use:** 50 chat requests in total:
  - 35 in the main run, including 2 backup retries and 1 time-out
  - 3 in the rerun
  - 12 in the tapped run
  
  The runner did not meter tokens. There were also 12 Brave searches.
