# German rules check: summary (13 November 2026)

## Search first by default: result — 13 November 2026 (later)

Bars frozen before the runs: the addendum at the top of `BARS.md`. The product is at `822a35e`: Send on a German-rules question asks "Search and answer" or "Answer without checking". With web results the prompt carries the sourced-only rule. Two Auto runs on **Privatemode** used the same 12 prompts:

- (a) `--choice search`, output `.local/german-rules-20261113/ours-searchfirst-search`
- (b) `--choice without`, output `.local/german-rules-20261113/ours-searchfirst-without`

A fresh model grader scored 48 answers blind in one shuffled sheet (`scoring-sheet-searchfirst.md`, `.csv`). The sheet held the two new runs plus, for calibration, the first check's Auto unsearched and Auto tapped answers. The grader had the same verified facts as the first check. The key is `.local/german-rules-20261113/key-searchfirst.json`.

| Run (12 prompts, Auto) | Mean | Confident wrong | Hedged wrong | Choice shown on Send | Warning when an unchecked figure appears |
| --- | --- | --- | --- | --- | --- |
| **(a) Search first, "Search and answer"** | **3.83** | **5** (G-04, G-05, G-06, P-G5, L7-04) | 0 | 12 of 12 | not needed (web results) |
| **(b) "Answer without checking"** | 3.33 | 1 (L7-04) | 4 | 12 of 12 | **11 of 12** (P-G4 missed) |
| Before: first-check Auto tapped, re-graded in this sheet | 3.83 | 5 | 0 | | |
| Before: first-check Auto unsearched, re-graded in this sheet | 3.33 | 4 | 2 | | 12 of 12 |
| Before: first-check Auto tapped, first grader | 4.25 | 2 | 1 | | |
| Before: first-check Auto unsearched, first grader | 3.50 | 2 | 2 | | 12 of 12 |
| Bar | (a) at least 4.2 | (a) at most 1 | | 12 of 12 | (b) every time |

**Verdict: both score bars of (a) are missed, and the warning bar of (b) is missed once.**

- **This grader is stricter than the first.** On the same first-check answers it gave tapped 3.83 (not 4.25) and 5 confident wrong (not 2).
- **Search path, same grader:** the new search path equals the old tapped path (3.83 and 5 against 3.83 and 5). The sourced-only prompt rule made no measurable difference to side-claim errors on 12 prompts.
- **Where the remaining errors on the search path come from:**
  - L7-04: "Frist: meist vier Wochen" for the car is now cited to the page the server read (wegenerumzuege.de, a moving company). The model followed the rule; the source was wrong and unofficial.
  - G-06: says the ID card can be applied for online, and that the fee depends on the federal state.
  - P-G5: says the consent period is "about three months under case law" (the statute sets it at the end of the second calendar month).
  - G-05: cites SGB V for the extra leave of severely disabled people (it is SGB IX).
  - G-04: says Saturday counts as a working day for the notice deadline.
- **Flags that rest on the grader's own knowledge, not the given facts:** G-04, G-05, G-06 and L7-04 (b). One of them looks doubtful:
  - G-04: the grader cited BGH VIII ZR 291/09, which is about the rent payment deadline. For the notice deadline, VIII ZR 206/04 counts Saturday as a working day unless it is the last day.
  - Without the G-04 flag, (a) has 4 confident wrong, still above the bar of 1.
- **Without checking (b):** 1 confident wrong. 4 more wrong figures were labelled unchecked.
  - On P-G4 the answer stated "einem Punkt und oft einem einmonatigen Fahrverbot" (the ban is wrong) in words, not digits, so the warning did not appear.
  - Fixed after the run: figures written in words now count (`src/german-rules.ts`, test added). The rerun was not made; the run measured the code before the fix.
- **Speed:** (a) answered on Fast after the search: total 4.5-16 s from the tap. (b) answered on Thinking: 19-109 s.
- **Routing:** Auto picked Fast for all 12 in (a) and Thinking for all 12 in (b), as designed.

**Run notes**

- **Attestation rate limit (HTTP 429 on `/privatemode/v1/attest`, recorded by the runner):**
  - (a) first pass: P-G5 and L7-04 failed about 5 s after the tap. Their searches had already run. Both were rerun alone after 2 minutes and answered.
  - (b) first pass: P-G2 failed. A rerun after 2 minutes failed again with 429. A second rerun after 5 more minutes answered.
  - The failed records are kept in `failed-first-pass/` in each output folder.
- **Privatemode use:** 24 chat requests produced the 24 graded answers. 4 Send attempts were refused at attestation before any chat request. The app reported 45,425 tokens for (a) and 43,608 for (b), about 89,000 in total.
- **Brave:** 14 searches (12, plus the 2 from the failed first pass in (a)).

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
