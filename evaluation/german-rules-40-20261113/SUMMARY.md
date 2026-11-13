# German rules: 40 fresh questions, with and without each change (13 November 2026)

**Setup:**
- 40 fresh questions, written before any run and not used to tune anything (`prompts.json`, bars in `BARS.md`).
- Privatemode, Auto, through the real app. Three runs:
  - **U:** "Answer without checking"
  - **S:** search where the choice appears, Goggles off
  - **G:** search where the choice appears, Goggles on
- 120 answers, graded blind in four batches by fresh graders who checked facts live (`scoring-sheet.csv`, grades joined by `analyse.py`).
- A **confident error** is a wrong figure, deadline or rule stated as fact. A wrong figure labelled unchecked is counted as hedged, not as a confident error.

## Results

| | Confident errors (of 40) | Mean | Official source cited |
| --- | --- | --- | --- |
| U: answered without checking | 15 | 3.12 | 24 |
| S: searched where detected (20), Goggles off | 6 | 3.83 | 18 |
| G: searched where detected (20), Goggles on | 13 | 3.67 | 23 |

**The question detector caught only 20 of the 40 fresh questions.** The other 20 went unsearched in S and G as well, so the differences between U, S and G on those 20 are run-to-run variation, which is about ±3 errors.

### Each change, with and without

| Change | Without | With | Bar (frozen) | Decision |
| --- | --- | --- | --- | --- |
| **Answer-side check** | U's confident errors the app warned on: 7 of 15. Unwarned: **8** | warned on 14 of 15. Unwarned: **1** (Q28). It caught 7 of the 8 errors the question detector missed. False alarms on 501 older non-rules answers: 0.6 % | warns on at least half of the missed errors; false alarms at most 3 % | **Keep (met)** |
| **Brave Goggles** (only on the 20 searched questions) | S: **0** confident errors, mean 4.35, page read official 5 of 20 | G: **4** confident errors (Q04, Q05, Q14, Q39), mean 4.25, page read official 18 of 20 | cut errors by at least 5 of 40 without a lower mean | **Off (missed; worse)** |
| **"Always search"** (detected questions searched; undetected unchanged) | default "Answer without checking": **15** | **8** with the current search (12 with Goggles) | ship regardless (a user choice) | **Ship, off by default** |

### What a user sees with no warning
- **Today's default,** when the user picks "Answer without checking" and only the question detector warns: **8 of 40** confident errors without a warning.
- **Always search, current search, answer-side check:** **1 of 40**.
- **The same with Goggles:** 5 of 40.

## Why Goggles did not help
Goggles did what they promise: the page read was official on 18 of 20 questions instead of 5. Yet the answers got four side claims wrong while reading those pages:
- Q04, Q05: parts of the parental-leave rules
- Q14: an outdated yearly BAföG figure
- Q39: rent-increase procedure from the wrong paragraph

**Hypothesis (not tested):** official FAQ pages are long and general. With the page cut at 6,000 characters, the specific rule the question needs is often not in the part that was read, so the model fills the gap. Search snippets from several pages happened to carry the specific figure more often.

Twenty questions is a small sample, so 0 against 4 is not proof that Goggles are harmful. It is clear evidence that they are not the large improvement the bar asked for.

## What ships
- **Answer-side check:** shipped. It is now the real safety net: the question detector catches only half of fresh questions, and the answer-side check warns on almost every confident error it misses.
- **"Always search for rules, fees and deadlines":** shipped, off by default.
- **Goggles:** stay in the code behind `PRIVATEAI_SEARCH_GOGGLES`, **off**. Revisit only with a page reader that finds the relevant section of a long official page.
- **Kept:** the honest wording ("unchecked", "no official source was found") and the search-first choice.

## Side finding
A masking notice said "Kept on this device: 1 date of birth" on S/Q05, a parental-leave question with no date of birth. A date in the web results was most likely taken for a birth date. This is the next masking false positive to fix.

## Spend
- Privatemode: 308,365 tokens (app-reported) for 120 answers.
- Brave: 42 searches.
- The free allowance went from about 1.0M to about 0.69M tokens.
