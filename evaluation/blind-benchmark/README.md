# Blind benchmark: CometRow against ChatGPT and Gemini

51 synthetic prompts in 9 levels, answered by our app in each of its three modes (Auto, Fast, Thinking) and by ChatGPT and Gemini, scored blind by the owner. The bars were frozen on 12 November 2026, before any run: read `BARS.md` first. Nothing here calls a model or the network.

Mode mapping: the brief's "Balanced" is **Auto** and "Deep" is **Thinking**; Fast is Fast.

## Change of 12 November 2026 (owner)

- **Gemini dropped.** The owner compares against ChatGPT only (`OTHERS = ["chatgpt"]`); the bars are otherwise unchanged, and "either competitor" in `BARS.md` now means ChatGPT.
- **ChatGPT answers** came as one Markdown file without timings; `answers/chatgpt/<id>.md` was split from it and converted to plain text (pandoc, no Markdown markers) so markup does not reveal the contestant next to our captured plain text. Multi-turn prompts (L2-05, L9-06) keep the final turn only, because our runner stored only the final turn. No ChatGPT timings, so the relative speed bars do not apply.
- **Scoring:** the 1-5 scores and hallucination flags in `scoring-sheet.csv` are by blind model graders (fresh agents that saw only the shuffled sheet, never the key; level 4 verified live on the web), not by the owner. The owner may overwrite any row and rerun `score.ts`.
- **Checker fix before scoring:** `maths-check.ts` read the pack count in ChatGPT's correct L3-07 line ("Buy 3 packs ... for €42.60") as the result; it now prefers amounts with a currency sign (test added). Our verdicts are unchanged.

## Files

| File | What it is |
| --- | --- |
| `BARS.md` | The frozen pass bars and what each outcome tells us to adjust |
| `prompts.json` | The prompts: id, level, exact text (an array for multi-turn), language, expected values, search flag, attachments, notes |
| `documents/*.md` | Four synthetic long documents (1,691 to 2,024 words) for level 6 |
| `prompt-sheet.md` | Generated: every prompt ready to paste, documents inline, with a checklist for timings |
| `make-sheets.ts` | Writes `prompt-sheet.md`, and later the blind `scoring-sheet.md` / `scoring-sheet.csv` plus the label key |
| `maths-check.ts` | Deterministic final-number checker for prompts with an expected value (level 3 and L7-03) |
| `score.ts` | Reads the filled CSV and the key, applies the bars, writes `results-<date>.md` |
| `../../tests/blind-benchmark.test.ts` | Checks the prompt set, the shuffle, the blinding, the maths checker and one level verdict |

## Steps

1. **Prompt sheet** (already generated; regenerate only if `prompts.json` changes, which after the freeze means a new benchmark):
   `npx tsx evaluation/blind-benchmark/make-sheets.ts prompts`
2. **ChatGPT and Gemini, by hand (owner).** For every prompt in `prompt-sheet.md`: new chat, default model, paste the block exactly, time the first word and the end with a stopwatch, copy the answer with the app's copy button. Multi-turn prompts (L2-05, L9-06): paste the turns in order in the same chat; copy every reply, separated by `--- turn 2 ---`, `--- turn 3 ---`. Save as `answers/chatgpt/<id>.md` and `answers/gemini/<id>.md`:
   ```
   ttft: 1.8
   total: 12.4
   ---
   <pasted answer>
   ```
   Seconds; a comma decimal works; leave a line out if not timed. Note which model each app used in `answers/models.md` (not in the answer files, which go onto the blind sheet). Do the level-4 research prompts on one day and score them against the live sources of that day.
3. **Our app, all three modes.** Same text, same order, a new chat per prompt, search on for level 4 (and as usual elsewhere), documents pasted inline like for the others (not uploaded). Save one file per answer at `.local/blind-benchmark/ours/<mode>/<id>.json` (mode = `auto`, `fast` or `thinking`):
   ```json
   { "text": "<the reply; multi-turn replies joined with --- turn N --- lines>", "ttftMs": 850, "totalMs": 6400, "model": "<model id the app reports>", "mode": "fast" }
   ```
   `ttftMs` is the time to the first visible answer text, `totalMs` to the end of the reply. No tool in this folder produces these files; whoever runs our side records them.
4. **Blind sheet:** `npx tsx evaluation/blind-benchmark/make-sheets.ts scoring`
   Writes `scoring-sheet.md` (prompts, scorer reference, answers labelled A to E), `scoring-sheet.csv` (one row per answer: `promptId,label,score1to5,hallucination,speedNote,comment`) and the key to `.local/blind-benchmark/key.json`. It lists missing answers and how many names it removed. It refuses to overwrite an existing key or a CSV that already has scores; `--force` overrides, `--seed <text>` fixes the shuffle.
5. **Score (owner):** read `scoring-sheet.md`, fill `score1to5` (1 to 5) and `hallucination` (yes/no) for every row of `scoring-sheet.csv`. Excel with a German locale saving with `;` is fine. Do not open `key.json` until every row is filled.
6. **Results:** `npx tsx evaluation/blind-benchmark/score.ts` (options `--csv <path>`, `--date YYYY-MM-DD`). It stops with a list of rows if any score is missing or invalid. It prints and writes `results-<date>.md`: mean scores per level and contestant; win/tie/loss per level and mode against ChatGPT and against Gemini; hallucination counts; the maths checker per prompt; the level-8 wording checks; median speed against the bars; a verdict per mode; and "What to adjust".

## How blinding works

- Each prompt's answers get labels A to E from a seeded Fisher-Yates shuffle that is separate for every prompt (seed plus prompt id), so the position says nothing about the contestant and adding a prompt never reshuffles another. Without `--seed`, the seed is random and is stored only in the key.
- The key lives in `.local/` (git-ignored), never in the repository, so the sheet can be shared and committed blind.
- The sheet shows no timings, no model, mode or product names. Self-identifying names in answers (ChatGPT, OpenAI, Gemini, CometRow, GPT-OSS, DeepSeek, Gemma, GLM, Claude and others, plus every model id our runs report) are replaced with `[name removed]`.
- Not removable: style, length, formatting and citation layout. One scorer and one run per prompt; see "Known limits" in `BARS.md`.

## Checks

`npx vitest run tests/blind-benchmark.test.ts` and `npx tsc --noEmit -p .`
