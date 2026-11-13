# Official-source preference: before and after (13 November 2026)

Bars: `BARS.md`, frozen with `prompts.json` (13 fresh prompts) in `1c1b549`, before any run. Neither file was changed.

## Setup

- **Runs:** Auto, search path (`run-ours.ts --privatemode --modes auto --choice search`), on Privatemode, through the real app.
  - **Before:** product code at `1c1b549`. Output: `.local/german-rules-official-20261113/before`.
  - **After:** with the official-source preference (`docs/german-rules-20261113.md`, section "Official-source preference"). Output: `.local/german-rules-official-20261113/after`.
  - Runner-only change before the "before" run: it now also records the search result addresses and the top-page record (no text), so "official source in the results" can be computed. After the build, it also recognises the new page-note wording.
- **Grading:** one fresh model grader scored all 26 answers blind on one shuffled sheet (`scoring-sheet.md`, `scoring-sheet.csv`). It checked every fact live on 13 November.
  - For each answer it recorded a score (1-5), confident wrong (yes/no) and official source cited (yes/no).
  - Key: `.local/german-rules-official-20261113/key.json`. The sheet tool has fixed slot names: `auto` is **before** and `fast` is **after**. Both runs were Auto.
- **"Official":** the tiers of the new design, used for both runs. Before, the app called `bmi.gv.at` (Austria) official. Under the new tiers it is "other": the wrong jurisdiction for a German rule.

## Result against the bars

| Measure | Bar (after) | Before | After | Met |
| --- | --- | --- | --- | --- |
| Confident wrong figure, deadline or rule | at most 1 of 13 | 2 (F-07, F-13) | **5** (F-05, F-07, F-09, F-11, F-13) | no |
| Mean score | at least 4.2 | 3.92 | **3.69** | no |
| Official or primary source cited for the key fact | at least 10 of 13 | 4 | **4** | no |
| Page read is official | at least 9 of 13 | 3 | **4** | no |
| No official source in the results, and the answer says so | every time | 0 of 5 | **4 of 5** in the answer text (F-02 does not say it); the app's note 5 of 5 | no |
| Not worse than before | required | | worse on confident wrong and on the mean | no |

**Verdict: every bar is missed.** The preference works as built: it reads the official page whenever one is in the results, labels the sources and shows the note. But it did not measurably improve the answers.

### Why: two causes outside the page choice

1. **4 of 13 questions were never searched:** F-03 (Führungszeugnis), F-09 (Sachgeschenke steuerfrei), F-11 (Arbeitsunfähigkeitsbescheinigung) and F-13 (cash into Germany).
   - The on-device detector `germanRulesQuestion` does not recognise them. Send therefore did not offer "Search and answer", and they were answered without web results in both runs.
   - The change cannot touch them, and their code path is identical in both runs. Yet they account for 3 of the 5 confident wrong answers after (F-09, F-11, F-13), against 1 before (F-13). That difference is run-to-run variation, not the change.
   - **The detector was not widened.** Widening it on these frozen prompts would tune on the test set.
2. **For 5 of the 9 searched questions, no official source is in the 10 results at all:** F-02, F-06, F-07, F-08, F-10 (F-10 has only evz.de, which is public-interest).
   - Asking for 10 results instead of 5 added no official result for any of them.
   - The search text is the user's whole question, and for these questions Brave ranks law portals, guides and commercial sites first.

### On the 9 searched questions only (the part the change can affect)

| Measure | Before | After |
| --- | --- | --- |
| Mean | 4.22 | 4.22 |
| Confident wrong | 1 (F-07) | 2 (F-05, F-07) |
| Official source cited | 4 | 4 |
| Page read official | 3 | 4 |
| Official result exists, and the official page is read | 3 of 4 | **4 of 4** |
| No official result, and the answer says so | 0 of 5 | **4 of 5** |

- **F-07 (both runs):** Munich and Stuttgart said to charge 10 EUR for re-registration. Both are free. No official source was in the results; the after answer says so and tells the user to check the Bürgeramt.
- **F-05 (after):** says an opt-out gives no pension rights at all from the minijob. The page read was the official Deutsche Rentenversicherung page in both runs; this is a side claim.

## Per prompt

Tier of the page read: **O** official, **P** public-interest, **X** other. "Official in results" means an official address among the results the app kept: before, the top 5; after, the top 6 of 10.

| Prompt | Searched | Page read, before | Page read, after | Official in results (before / after) | Score before → after | Confident wrong (before / after) | Official cited (before / after) | Says "no official source" (after) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 dog tax Berlin | yes | O berlin.de | O berlin.de | yes / yes | 4 → 5 | no / no | yes / yes | |
| F-02 Bußgeld objection | yes | X adac.de | X adac.de | no / no | 4 → 4 | no / no | no / no | no (app note shown) |
| F-03 Führungszeugnis | **no** | | | | 4 → 2 | no / no | no / no | |
| F-04 passport validity | yes | X bmi.gv.at (Austria) | O auswaertiges-amt.de | yes / yes | 5 → 5 | no / no | yes / yes | |
| F-05 Minijob 2026 | yes | O deutsche-rentenversicherung.de | O deutsche-rentenversicherung.de | yes / yes | 4 → 4 | no / **yes** | yes / yes | |
| F-06 notice period | yes | X jusora.de | X jusora.de | no / no | 5 → 4 | no / no | no / no | yes |
| F-07 re-registration fee | yes | X studenten-umzug.berlin | X studenten-umzug.berlin | no / no | 2 → 2 | yes / yes | no / no | yes |
| F-08 Pfändungsfreibetrag | yes | X schuldnerberatung.de | X schuldnerberatung.de | no / no | 4 → 4 | no / no | no / no | yes |
| F-09 gifts tax-free | **no** | | | | 2 → 3 | no / **yes** | no / no | |
| F-10 right of withdrawal | yes | X recordinglaw.com | P evz.de | no / no | 5 → 5 | no / no | no / no | yes |
| F-11 sick note | **no** | | | | 4 → 1 | no / **yes** | no / no | |
| F-12 maternity protection | yes | O familienportal.de | O familienportal.de | yes / yes | 5 → 5 | no / no | yes / yes | |
| F-13 cash at the border | **no** | | | | 3 → 4 | yes / yes | no / no | |

- **The page choice changed on 2 prompts:**
  - F-04 now reads the German Foreign Office instead of the Austrian ministry.
  - F-10 now reads the publicly funded European Consumer Centre instead of a law-firm site.
- **The source labels** ("[official source]" and so on) never appeared in an answer.

## What a failure tells us (from `BARS.md`)

- **"Official pages are not in the results at all":** this is the main finding, 5 of 9 searches. The next step is on the search side, for example a second query the user sees or an official-site hint in the shown text. Either one changes what is sent to Brave, so it needs the owner's approval.
- **"Official pages are found but not read":** fixed. 4 of 4 after, against 3 of 4 before.
- **"Official page read, still wrong":** F-05, a side claim.
- **Detector coverage** is a separate gap: 4 of 13 fresh questions were not searched at all.

## Run notes

- **Privatemode:** 26 chat requests (13 per run), no failures, no attestation "busy", no reruns. The app reported 38,550 tokens before and 44,221 after: 82,771 in total.
- **Brave:** 18 searches (9 per run). The 4 undetected prompts made no search.
- **Grader judgement calls:**
  - evz.de and a statute named without a link do not count as an official citation.
  - A blanket "unchecked" label at the top cancels confident wrong (F-09 before); a short closing hedge does not (F-11 after).
- **Not checked by the grader:** Bremen's 6 EUR fee (F-07). A claim about families splitting cash at the border (F-13) was treated as unsupported, not false.
