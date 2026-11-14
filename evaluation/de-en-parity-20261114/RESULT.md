# German versus English: result (14 November 2026)

Run: 40 question pairs (14 general, 13 maths, 13 rules), each once in German and once in English, through the real app in Auto mode on Privatemode, English interface, "Answer without checking" where the app asked first. One answer per question, so a single differing pair is not evidence of a gap.

## Result: no quality difference between the languages

| | German | English |
| --- | --- | --- |
| Answered | 40 of 40 | 40 of 40 |
| Correct by the automatic check (38 pairs) | 36 | 37 |
| Answer in the language of the question (where the check applies) | 35 of 35 | 33 of 33 |
| Auto picked Fast / Thinking | 14 / 26 | 20 / 20 |
| First word, median | 2.3 s | 2.0 s |
| Whole reply, median | 5.5 s | 3.9 s |
| Tokens per message, median | 1,032 | 931 |

The three pairs with different verdicts, read by hand:

- **P-G05 (three sentences, each starting with B):** the German answer began its second sentence with "Außerdem". A real miss of the constraint. English kept it.
- **P-M06 (recipe for 10):** the German answer is right (750 g, 5 eggs, 625 ml). The check wanted the closing line to hold only the figure. A scoring artefact, not an error.
- **P-R11 (notice period in probation):** the English answer declined to state the figure and pointed to § 622 BGB; the German one gave two weeks and marked it unchecked. Both are acceptable; the check only counts the figure.

Counting those, German is 37 of 38 and English 37 or 38 of 38.

## The real difference is our routing, not the model

The app treated 9 pairs differently by language:

- **Five rules questions** (P-R01, R03, R08, R09, R13: rental deposit, tax-free amount, alcohol limit, and others) went to Thinking with the search-first question in German, and to **Fast with no search-first question in English**. The on-device rules detector fires on 13 German versions and 7 English ones. The answers happened to be right in both languages here, but the English user gets less protection on the questions where figures go stale.
- **P-M12** (splitting the cost of a holiday flat) trips the rules detector in German because of "mieten" and gets the unchecked-figures warning on a pure sum.
- **P-M02** goes to Thinking in German and Fast in English because of the question word.
- Three pairs differ only in whether a search suggestion is shown.

German costs a little more (more Thinking, longer replies) for the same quality.

## What to do with it

1. English questions about German rules need the same detection as German ones. This matches the blind detector test (English 4 of 8). Next detector pass, on a new blind set.
2. The "mieten" false alarm on a sum is covered by the detector's new rule for sums on the user's own figures only when two amounts are present; this one has several, so it should now be quiet. Not re-run.
3. No change to the model or prompt is needed for language parity.

## A finding about the test runner, not the app

The first run lost 25 of 80 answers ("Protected response unavailable"). Cause: the runner opens a fresh page for every question, so every question verifies Privatemode again, and since 13 November the relay allows one session 10 verifications per 10 minutes. Questions 11 to 15 of each browser session failed. The relay counts confirmed it (3 questions, 3 verifications). The runner now uses 9 questions per session and prints the relay's counts; the 25 were re-run and all answered.

**For the product this means:** a user who stays on the page verifies once per 10 minutes. A user who reloads the page more than 10 times in 10 minutes is blocked for a while with an unclear message. And every page load plus first message costs one verification against Privatemode's organisation-wide limit, which is the capacity question still open with their support.

One more observation, not chased: the relay counted 9 of 15 Thinking replies in the re-run as "interrupted" although the answers arrived complete. The runner closes the page right after the answer, which may be all it is. If real users show the same, "interrupted" in the hourly counts overstates failures.

## Not covered

- The German interface (off by default; both languages ran under the English interface).
- Search (every answer was given without a search).
- More than one answer per question.
- The translations were written by one agent and not reviewed by a second reader.

Spend: about 95,000 Privatemode tokens as reported by the app (80 answers, 25 re-runs after a failure that used none, and two probes of 12 and 3 questions). No searches.
