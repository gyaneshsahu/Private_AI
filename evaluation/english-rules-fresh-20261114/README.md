# English rules questions: fresh blind hold-out set

Date: 14 November 2026

## Purpose

A blind hold-out set of 60 English chat messages for the on-device detector that decides whether a message asks about official rules, fees, amounts, rates or deadlines in Germany (also Austria and Switzerland) whose answer changes over time and should be checked against an official source.

The set was written without reading the detector, its tests, its documentation or any earlier evaluation set. No repo file was opened to write it. All content is synthetic; there is no real personal data.

File: `prompts.json`, an array of 60 objects with `id`, `lang`, `text`, `rules`, `topic`, `country`, `style`.

## Class definition used

Positive (`rules: true`): an English-speaking resident asks about an official German, Austrian or Swiss rule, fee, amount, rate or deadline that can change over time (tax, work, tenancy, benefits, health insurance, residence, traffic, consumer rights, pensions, registration, students, self-employment, inheritance, pets, broadcasting fee).

- **No country named counts as positive.** The product assumes its users live in Germany, so "can my boss make me work Sundays" is a question about German rules.

Negative (`rules: false`): everything else. General knowledge, coding, maths with numbers supplied by the user, writing help, translation and language questions, company-internal rules, rules of games and sports, historical questions, personal advice with no rule asked, product and market prices.

- **Another country clearly named counts as negative** (`country: "other-country"`), because the official-source handling is for Germany, Austria and Switzerland only.

The `country` field describes the text, not the label: `named-de` is also used on five negatives that mention Germany, a German city or a German term (E-17, E-21, E-25, E-31, E-44). "Translate into German" and "learn German articles" name the language, not the country, and are `none`.

## Counts

| | Count |
|---|---|
| Total | 60 |
| Positive | 30 |
| Negative | 30 |

Country, positives: named-de 12, unnamed 12, named-at 3, named-ch 3.

Country, negatives: none 19, other-country 6, named-de 5.

| Style | All | Positive | Negative |
|---|---|---|---|
| formal | 16 | 9 | 7 |
| casual | 15 | 5 | 10 |
| mixed (German terms mid-sentence) | 9 | 7 | 2 |
| short | 9 | 2 | 7 |
| long | 4 | 2 | 2 |
| typo | 4 | 3 | 1 |
| voice | 3 | 2 | 1 |

## Near-miss negatives (25 of 30)

E-02, E-04, E-06, E-08, E-11, E-12, E-15, E-17, E-19, E-21, E-23, E-25, E-27, E-30, E-31, E-34, E-36, E-38, E-40, E-42, E-44, E-46, E-48, E-50, E-52.

The five easy negatives are E-55, E-57, E-58, E-59, E-60.

## Labels a reviewer might dispute

- **E-06** (US tax deadline for Americans abroad): negative as other-country, although the asker plausibly lives in Germany.
- **E-12** (company handbook, leave booked by end of March): negative because the ask is how to phrase a request. German law has its own carry-over rule with a March date, so a detector firing here is defensible.
- **E-17** (gym membership prices in Berlin): negative as a market price, although a German city is named.
- **E-19** (should I quit, boss asks for weekend work): negative as personal advice; a rules question about weekend work is implied but not asked.
- **E-21** (when was the minimum wage introduced in Germany): negative as historical. The answer does not change over time.
- **E-25** (meaning of the word Kündigungsfrist): negative as a language question, although the term is a rules term.
- **E-42** (startup office-day policy, "am I allowed to"): negative as company-internal.
- **E-07** (gym contract auto-renewed, cancel monthly): positive as a consumer-law rule; it asks for no amount or date explicitly.
- **E-13** (landlord raising rent by 20 %): positive; it has a user-supplied percentage like the maths near-misses, but asks for the legal limit.
- **E-28** (Austrian Vignette): positive; a reviewer might treat the toll sticker price as a product price rather than an official fee.

## Frozen

This set is frozen once it has been used for a measurement. It must not be used for tuning the detector, and no item may be edited or relabelled after first use. Disputed labels are recorded here and in the result note, not fixed in the file.
