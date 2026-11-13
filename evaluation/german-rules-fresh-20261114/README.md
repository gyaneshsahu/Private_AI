# German rules detector: fresh blind hold-out set

Date: 14 November 2026

## Purpose

`prompts.json` is a blind hold-out test set for the on-device detector that decides whether a chat message asks about German official rules, fees or deadlines. It was written without reading the detector, its tests, its docs or any earlier evaluation set, and without searching the repo. All content is synthetic; it contains no real personal data.

## Class definition used

**Positive (`rules: true`)**: the user needs a current official rule, fee, amount, rate, threshold or deadline in Germany (or Austria/Switzerland where the topic says AT/CH), set by law or by an authority, whose answer changes over time and should be checked against an official source. English questions about German rules count as positive. A message with a long background story is positive if the actual question at the end is of this kind.

**Negative (`rules: false`)**: everything else. That includes general knowledge, coding, spreadsheet help, maths with numbers the user supplies, writing and wording help, translation, summarising supplied text, opinions, personal advice, cooking, travel tips, game and sports rules, company-internal rules, and historical questions where no current official figure is needed.

Labelling decisions on borderline items:

- F2-38 (VAT rate in 1995, for a school talk) is negative: a historical figure, no current rule needed.
- F2-09 (Elterngeld with a given net income) is positive: the user supplies a number, but the answer depends on the official rate and cap.
- F2-36 (letter to landlord about broken heating) is negative: the user asks for a letter, not for a rule.
- F2-48 ("should I quit now or hold out") is negative: personal advice, no notice period asked.

## Counts

| | German | English | Total |
|---|---|---|---|
| Positive | 22 | 8 | 30 |
| Negative | 22 | 8 | 30 |
| Total | 44 | 16 | 60 |

| Style | Positive | Negative | Total |
|---|---|---|---|
| formal | 8 | 13 | 21 |
| casual | 8 | 6 | 14 |
| short | 4 | 5 | 9 |
| typo | 3 | 3 | 6 |
| long | 3 | 1 | 4 |
| voice | 2 | 1 | 3 |
| mixed | 2 | 1 | 3 |

`mixed` means mixed language (F2-15) or a statement followed by a question (F2-17, F2-37).

Positives F2-01 to F2-30, negatives F2-31 to F2-60. Austrian: F2-21, F2-22. Swiss: F2-23, F2-24, F2-25.

Hard near-miss negatives (18, share vocabulary with the positive class): F2-31 to F2-48.

## Frozen

Once this set has been run against the detector it is frozen. Do not edit items or labels afterwards, and do not use it to tune the detector, its keyword lists or its thresholds. If a label turns out to be wrong, record that in a note next to the results instead of changing the file. For tuning, write a new set.
