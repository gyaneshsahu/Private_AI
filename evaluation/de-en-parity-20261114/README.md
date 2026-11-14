# German-versus-English parity check

Date: 14 November 2026. Status: prepared, **not run**. No model or network call was made to build this set.

## Purpose

Does CometRow answer a question as well in German as in English? 40 existing benchmark questions, each in both languages with the same meaning (80 prompts), to be run through the real app in Auto mode. `score.ts` then reports quality, answer language, the mode Auto picked, speed and search behaviour per language, and lists every pair where the two versions came out differently.

## Files

| File | What it is |
| --- | --- |
| `prompts.json` | The 80 prompts in the format `evaluation/blind-benchmark/run-ours.ts` reads from `BENCH_DIR` (`{ prompts: [{ id, level, prompt }] }`). Ids are `P-G01-de` / `P-G01-en` (general), `P-M..` (maths), `P-R..` (rules). `level` is 1 general, 2 maths, 3 rules; the runner does not use it. `pair` joins the two versions, `translated` marks the one written for this set. |
| `expected.json` | Per pair: source set and source id, category, scoring rule. |
| `score.ts` | The scorer. Run it without results to see how the app's on-device rules treat each version. |

The runner needs no other file in the folder (no attachments, no `searchQuery`).

## Selection rules

- Only questions that already exist in a benchmark set, single turn, answerable without a web search, with a short good answer. No code generation, no documents, no essays.
- Preferred: questions whose source set records a machine-checkable expectation.
- The source text is used unchanged in its own language. The other version is a natural translation with the same numbers, names, currencies and units; number formats follow the language (1.234,56 in German, 1,234.56 in English).
- One systematic addition: the English version of a German-source rules question says "in Germany" (the source set's own English questions do the same). Without it the English question would not name the jurisdiction, which German implies. R07 needs none (Flensburg).
- German terms with no plain English word stay in the English version with a gloss (R04 Kündigungsschutzklage, R06 Hauptuntersuchung), as Q36 of the rules set does.
- The translations were written before the detector comparison below was computed and were not changed to fit it.

## Counts

| Category | Pairs | Source sets | Source language | Automatic | Manual |
| --- | --- | --- | --- | --- | --- |
| General | 14 | blind-benchmark 12 (L1-01, L1-02, L1-03, L1-05, L7-02, L8-01, L8-02, L9-01 to L9-05), benchmark-fresh 2 (T-07, T-08) | 12 English, 2 German | 12 | 2 (G10, G14) |
| Maths | 13 | blind-benchmark 8 (L3-01 to L3-07, L7-03), benchmark-privatemode 4 (P-M1 to P-M4), arithmetic gate unseen v3 1 (unseen3-14, first turn) | 9 English, 4 German | 13 | 0 |
| Rules | 13 | german-rules-40 (Q03, Q05, Q10, Q11, Q21, Q23, Q24, Q26, Q30, Q32, Q33, Q37, Q38) | 9 German, 4 English | 13 | 0 |
| Total | 40 pairs, 80 prompts | | 25 English, 15 German | 38 | 2 |

What "automatic" means, by category:

- **Maths:** the source set's expected values, checked with `evaluation/blind-benchmark/maths-check.ts`, which reads both number formats. Reliable.
- **General:** must-contain facts or a format check (four lowercase names, JSON only, three sentences starting with B, at most 120 words). G03, G04 and G11 check only part of what the source expects (see the notes in `expected.json`).
- **Rules:** the answer states the figure the source set records (for example "3 Wochen" / "three weeks"). The source set calls its facts the graders' starting points, to be checked live; **none is verified here**. An answer that correctly declines to state a figure without a source counts as "incorrect", so rules verdicts that differ between the languages go on the manual sheet and need a person.

## How to run

Run from the repository root, in PowerShell. Privatemode needs `.local/qualification-privatemode.json` and `.local/privatemode-manifest.json`; the runner refuses to start if the local Thinking setting differs from the committed draft.

Both languages in one run (recommended: the versions of a pair run back to back, and German goes first on odd pairs, English on even pairs):

```powershell
Import-Module .\scripts\WindowsSecrets.psm1
$env:BENCH_DIR = "evaluation/de-en-parity-20261114"
Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { Invoke-WithPrivateAiSecret -Name BRAVE_SEARCH_API_KEY -Action {
  npx tsx evaluation/blind-benchmark/run-ours.ts --privatemode --modes auto } }
npx tsx evaluation/de-en-parity-20261114/score.ts
```

One language at a time (same output folder; the second run overwrites `run.json` only):

```powershell
# German
npx tsx evaluation/blind-benchmark/run-ours.ts --privatemode --modes auto --only P-G01-de,P-G02-de,P-G03-de,P-G04-de,P-G05-de,P-G06-de,P-G07-de,P-G08-de,P-G09-de,P-G10-de,P-G11-de,P-G12-de,P-G13-de,P-G14-de,P-M01-de,P-M02-de,P-M03-de,P-M04-de,P-M05-de,P-M06-de,P-M07-de,P-M08-de,P-M09-de,P-M10-de,P-M11-de,P-M12-de,P-M13-de,P-R01-de,P-R02-de,P-R03-de,P-R04-de,P-R05-de,P-R06-de,P-R07-de,P-R08-de,P-R09-de,P-R10-de,P-R11-de,P-R12-de,P-R13-de
# English
npx tsx evaluation/blind-benchmark/run-ours.ts --privatemode --modes auto --only P-G01-en,P-G02-en,P-G03-en,P-G04-en,P-G05-en,P-G06-en,P-G07-en,P-G08-en,P-G09-en,P-G10-en,P-G11-en,P-G12-en,P-G13-en,P-G14-en,P-M01-en,P-M02-en,P-M03-en,P-M04-en,P-M05-en,P-M06-en,P-M07-en,P-M08-en,P-M09-en,P-M10-en,P-M11-en,P-M12-en,P-M13-en,P-R01-en,P-R02-en,P-R03-en,P-R04-en,P-R05-en,P-R06-en,P-R07-en,P-R08-en,P-R09-en,P-R10-en,P-R11-en,P-R12-en,P-R13-en
```

(each inside the same `Invoke-WithPrivateAiSecret` wrapper and with `BENCH_DIR` set as above).

Do **not** pass `--locale de-DE`, `--choice search` or `--tap-suggestion-all`:

- The interface stays English for both languages, so only the question language differs. German interface text needs a build with `VITE_GERMAN_UI=1`; with it the runner's notice filter and token reader (English wording only) would leave app notices in the German answers and read no tokens.
- With the default `--choice without`, a rules question that asks first is answered without a search, so no search is sent.

Answers go to `.local/de-en-parity-20261114/ours-privatemode/auto/<id>.json`; `score.ts` reads that folder by default (or pass another folder as the first argument) and writes `manual-sheet.md` into it.

## Expected requests

- 80 messages in Auto, one chat request each (a failed first attempt may add one retry on the backup model). On Privatemode each message is three POSTs, about 240 in all, in 6 browser sessions; messages are spaced 6.5 seconds apart, so at least 9 minutes plus answer time.
- Predicted mode from the app's own rules: German 24 Thinking and 16 Fast, English 19 Thinking and 21 Fast (43 Thinking, 37 Fast). At allowance cost 3 and 1 that is 166 credits.
- Web searches: 0. The Brave key is loaded only so the app shows its search suggestion and the search-first choice as in the product (17 prompts are predicted to ask first); the runner then picks "Answer without checking". Leaving the Brave key out is fine; `searched`, `choiceShown` and `suggestionShown` are then false everywhere.

## Known before the run: the two versions are not treated alike

`score.ts` computes this from the prompts with the app's own code. On 14 November:

- The German-rules detector fires on 11 German and 6 English versions. Where it fires, three things change at once: Send asks first, Auto picks Thinking, and without web results the model is told not to state figures as facts. Fires in German only: R01, R05, R08, R13 and the maths question M12 (it contains "mieten"). In English those five get Fast (M12: Thinking for maths) and no such instruction. Never the other way round.
- M02 (train arrival): Auto picks Thinking in German ("Um wie viel Uhr") and Fast in English ("At what time").
- Smaller differences in the "needs current information" rule (M03, M08, M11, R10) change only whether a search suggestion appears; several maths pairs get Thinking for a different reason (maths in German, current in English).

So a quality difference on those pairs may come from the detector and the mode, not from the model's German. Read the per-pair table with that in mind.

## Not covered

- Fast and Thinking as fixed modes; only Auto is run.
- The German interface (`VITE_GERMAN_UI=1`, `--locale de-DE`).
- Answers with web search (search-first with "Search and answer", automatic search).
- Multi-turn conversations, documents, code, long writing.
- Whether a rules fact is right today (not verified), and anything beyond the one figure checked per rules question.
- Style, tone and the quality of the German itself, except on the 2 manual pairs and the pairs whose verdicts differ.
- Run-to-run variation: one answer per prompt. A single differing pair is not evidence of a language gap.
- Translation effects: 25 pairs have a translated German version and 15 a translated English version, written by one author and not reviewed by a second person.
- The answer-language check is a function-word count (the rule of `evaluation/answer-language-20261113/check.py`); very short answers count as unclear and are left out, as are G04, G06 and G07 (a list, JSON, French).
- M13 reuses the first turn of one case from the frozen arithmetic unseen v3 set, which is marked "never pooled with any other set". It is used here for the language comparison only; swap it out if that mark is to be kept strictly.
