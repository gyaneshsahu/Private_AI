# Arithmetic v3 unseen set, rerun on the mode models and Privatemode (12 November 2026)

**Status:** complete on all four systems (90 conversations each). Tinfoil Thinking was finished after the owner raised the account limit (12 November, about 19:00 UTC; resume folders `*-resume-c`): **78 of 90 correct (86.7 %), 11 flagged, 0 silently wrong, 1 no answer**. Where this page still describes Thinking as 40 of 90, the regenerated table of `report-v3-unseen-20261112.ts` and `verdicts/unseen-v3-20261112/tinfoil-thinking.md` are current. Tinfoil spend by usage: Fast USD 0.45, Thinking USD 3.59 (the harness log books USD 8.66 because refused requests count at the worst case). AI cross-check: pending owner pastes.

Authorised by the owner on 12 November 2026, who knows the set was used before (gate v3, 24 October). This rerun compares systems; it is not a new gate. The set is no longer unseen for this pipeline, and no bar from THRESHOLD-v3.md is claimed. Synthetic data only.

## What was run

- Set: `unseen-v3-20261023.json`, 30 two-turn conversations (15 German, 15 English, 16 critical), three repetitions per system, so 90 conversations per system. The set holds 30 conversations; the 90 counts repetitions.
- Pipeline: `harness-v3.ts`, Design B unchanged (call 1 program, call 2 independent chain reading, code evaluates both, method checks, one feedback retry per call, 1500 ms pacing). Scored by the frozen `scorer.ts`; categories as in `verdict-v3.ts`.
- Systems:

| System (cell) | Provider and route | Model id | Settings | Output limit |
| --- | --- | --- | --- | --- |
| Tinfoil Fast (`tinfoil-fast`) | Tinfoil API, plain TLS (as earlier harness runs) | `deepseek-v4-1-flash` | thinking off (`modes.fast` of tinfoil-gpt-oss-120b-20261112.json) | 2,048 |
| Tinfoil Thinking (`tinfoil-thinking`) | Tinfoil API, plain TLS | `glm-5-3` | reasoning effort max (`modes.thinking`) | 16,384 |
| Privatemode Flash (`privatemode-glm-flash`) | Privatemode SDK 1.63.0 (attested, encrypted) | `glm-5.3-flash` (live model list) | reasoning effort low (cannot be switched off; as the spike's glmflash arm) | 4,096 |
| Privatemode GLM (`privatemode-glm`) | Privatemode SDK 1.63.0 | `glm-5.3` (live model list) | reasoning effort max (to match Tinfoil Thinking) | 16,384 |

- The Privatemode effort levels were a choice made for this run; the brief named the models only. The SDK is loaded from the read-only `Private_AI-pm` worktree, because `privatemode-ai` is not installed in this checkout and package.json holds the owner's uncommitted changes.
- Harness change (minimal): the cells above; a Privatemode call path through the SDK; `--root` and `--rep` for per-repetition folders; per-cell output limit and timeout. `--cases unseen-v3` was already admitted (24 October); a comment now cites the owner's 12 November authorisation. `npx tsc --noEmit -p .` clean; `npx vitest run tests/arithmetic` 16 files, 166 tests pass. Before the run, one dev-v3 conversation was smoke-tested on Tinfoil Fast and on Privatemode Flash (`.local/arithmetic-v3-unseen-20261112/smoke-dev/`; Tinfoil USD 0.0039, in the cost log).
- Raw results: `.local/arithmetic-v3-unseen-20261112/<system>-rep<n>/`, plus `-resume` and `-resume-b` folders for Tinfoil (see below); run logs in `logs/`. The per-system listings (every wrong-flagged, silent-wrong and no-answer conversation, the critical-case table, and the old bar for reference only) are in `verdicts/unseen-v3-20261112/<system>.md`. Regenerate the tables with `node --import tsx evaluation/arithmetic-gate/report-v3-unseen-20261112.ts`.

## Tinfoil supplier blocks (owner action needed for Thinking)

1. **Key spend limit, initial run (about 17:40 to 17:50 UTC).** Every Tinfoil request returned HTTP 429 "Spend limit reached for this API key" (`insufficient_quota`). A one-request probe at 17:51 UTC was refused the same way, so Tinfoil was stopped (two failures, same reason). How far each repetition got, and its spend by usage:

| Repetition | Measured before the block | Refused | USD by usage |
| --- | --- | --- | --- |
| Fast rep 1 | unseen3-01 to -10 | -11 to -30 | 0.0534 |
| Fast rep 2 | -01 to -09 | -10 to -30 | 0.0562 |
| Fast rep 3 | -01 to -09 | -10 to -30 | 0.0514 |
| Thinking rep 1 | -01 to -04 | -05 to -30 | 0.1249 |
| Thinking rep 2 | -01 to -03 | -04 to -30 | 0.1232 |
| Thinking rep 3 | -01 to -06 | -07 to -30 | 0.1403 |
| Tinfoil total up to the block | | | 0.5494 |

2. **Resume after the owner raised the limit (18:20 UTC).** Only the refused conversations were rerun (`--ids`, same repetition index); completed conversations were not redone. Fast completed all three repetitions (USD 0.0848, 0.1032, 0.1008). Thinking rep 1 resumed first. Reps 2 and 3 were then started alongside it (`-resume-b`, each at the harness pacing), because glm-5-3 at max effort took about two minutes per conversation. From about 18:38 UTC every Thinking request returned **HTTP 402 "API access is paused because this billing period's usage limit was reached"**. That is an account-level limit, not the key limit. It was the second supplier block, so Tinfoil was stopped again.

| Thinking repetition | Measured in the resume | Still refused | USD by usage (resume) |
| --- | --- | --- | --- |
| rep 1 | unseen3-05 to -23 | -24 to -30 | 0.9436 |
| rep 2 | -04 to -08 | -09 to -30 | 0.1567 |
| rep 3 | -07 to -09 | -10 to -30 | 0.1636 |

Thinking is therefore measured on 40 of 90 conversations (rep 1: 23, rep 2: 8, rep 3: 9), weighted towards the first two thirds of the set. The refused conversations are set aside, not counted as no-answers. A stopped duplicate start of rep 2 left an empty `tinfoil-thinking-rep2-resume/` folder (catalog only; stopped before any chat request). To finish once the owner lifts the account limit, run the commands below with the key loaded through `Invoke-WithPrivateAiSecret`; the report script already merges `-resume-c`:

```
node --import tsx evaluation/arithmetic-gate/harness-v3.ts --cases unseen-v3 --cell tinfoil-thinking --retry 1 --reps 1 --root .local/arithmetic-v3-unseen-20261112 --cap 12 --rep 1 --label tinfoil-thinking-rep1-resume-c --ids unseen3-24,unseen3-25,unseen3-26,unseen3-27,unseen3-28,unseen3-29,unseen3-30
  rep 2: --rep 2 --label tinfoil-thinking-rep2-resume-c --ids unseen3-09 to unseen3-30 (comma-separated)
  rep 3: --rep 3 --label tinfoil-thinking-rep3-resume-c --ids unseen3-10 to unseen3-30 (comma-separated)
```

Estimated cost to finish, at the resume's usage rate: about USD 2.5.

**Cost-log caveat.** The harness logs a refused request at the worst case unless it is a 429. In the three Thinking resume lines, each 402 refusal is logged at about USD 0.10. The log therefore shows USD 6.72 for Thinking, while usage times price is USD 1.65. The spend table gives both. The log lines are left as written (append-only).

## Results

Categories (from `verdict-v3.ts`):
- **correct**: both turns exact and no flag (verified by recomputation)
- **flagged**: at least one flag, split into exact (a false flag) and wrong (an error caught)
- **silently wrong**: no flag, but the scorer fails (a required figure is wrong or missing)
- **no answer**: a turn failed validation after its retry

Brackets give the percentage and the Wilson 95 % bounds.

### Per system (pooled over the repetitions; percentages with Wilson 95 % bounds; conversations refused by the supplier excluded)

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | 90 | 43 (47.8 %; 37.8-58.0) | 40 (44.4 %; 34.6-54.7) (23 exact, 17 wrong) | 0 (0.0 %; 0.0-4.1) | 7 (7.8 %; 3.8-15.2) |
| Tinfoil Thinking: glm-5-3, effort max | 90 | 78 (86.7 %; 78.1-92.2) | 11 (12.2 %; 7.0-20.6) (7 exact, 4 wrong) | 0 (0.0 %; 0.0-4.1) | 1 (1.1 %; 0.2-6.0) |
| Privatemode glm-5.3-flash, effort low | 90 | 43 (47.8 %; 37.8-58.0) | 25 (27.8 %; 19.6-37.8) (13 exact, 12 wrong) | 22 (24.4 %; 16.7-34.2) | 0 (0.0 %; 0.0-4.1) |
| Privatemode glm-5.3, effort max | 90 | 81 (90.0 %; 82.1-94.6) | 6 (6.7 %; 3.1-13.8) (2 exact, 4 wrong) | 3 (3.3 %; 1.1-9.3) | 0 (0.0 %; 0.0-4.1) |

| System | Measured (of 90) | Conversation records refused by a Tinfoil limit (set aside; initial run plus resumes) |
| --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | 90 | 62 |
| Tinfoil Thinking: glm-5-3, effort max | 90 | 127 |
| Privatemode glm-5.3-flash, effort low | 90 | 0 |
| Privatemode glm-5.3, effort max | 90 | 0 |

### Same conversations on all four systems (40 case-repetition pairs measured everywhere)

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | 40 | 17 (42.5 %; 28.5-57.8) | 18 (45.0 %; 30.7-60.2) (11 exact, 7 wrong) | 0 (0.0 %; 0.0-8.8) | 5 (12.5 %; 5.5-26.1) |
| Tinfoil Thinking: glm-5-3, effort max | 40 | 33 (82.5 %; 68.1-91.3) | 7 (17.5 %; 8.7-31.9) (5 exact, 2 wrong) | 0 (0.0 %; 0.0-8.8) | 0 (0.0 %; 0.0-8.8) |
| Privatemode glm-5.3-flash, effort low | 40 | 20 (50.0 %; 35.2-64.8) | 11 (27.5 %; 16.1-42.8) (4 exact, 7 wrong) | 9 (22.5 %; 12.3-37.5) | 0 (0.0 %; 0.0-8.8) |
| Privatemode glm-5.3, effort max | 40 | 36 (90.0 %; 76.9-96.0) | 4 (10.0 %; 4.0-23.1) (2 exact, 2 wrong) | 0 (0.0 %; 0.0-8.8) | 0 (0.0 %; 0.0-8.8) |

### Per repetition

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off, rep1 | 30 | 15 (50.0 %; 33.2-66.8) | 11 (36.7 %; 21.9-54.5) (5 exact, 6 wrong) | 0 (0.0 %; 0.0-11.4) | 4 (13.3 %; 5.3-29.7) |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off, rep2 | 30 | 13 (43.3 %; 27.4-60.8) | 15 (50.0 %; 33.2-66.8) (9 exact, 6 wrong) | 0 (0.0 %; 0.0-11.4) | 2 (6.7 %; 1.8-21.3) |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off, rep3 | 30 | 15 (50.0 %; 33.2-66.8) | 14 (46.7 %; 30.2-63.9) (9 exact, 5 wrong) | 0 (0.0 %; 0.0-11.4) | 1 (3.3 %; 0.6-16.7) |
| Tinfoil Thinking: glm-5-3, effort max, rep1 | 23 | 19 (82.6 %; 62.9-93.0) | 4 (17.4 %; 7.0-37.1) (3 exact, 1 wrong) | 0 (0.0 %; 0.0-14.3) | 0 (0.0 %; 0.0-14.3) |
| Tinfoil Thinking: glm-5-3, effort max, rep2 | 8 | 7 (87.5 %; 52.9-97.8) | 1 (12.5 %; 2.2-47.1) (1 exact, 0 wrong) | 0 (0.0 %; 0.0-32.4) | 0 (0.0 %; 0.0-32.4) |
| Tinfoil Thinking: glm-5-3, effort max, rep3 | 9 | 7 (77.8 %; 45.3-93.7) | 2 (22.2 %; 6.3-54.7) (1 exact, 1 wrong) | 0 (0.0 %; -0.0-29.9) | 0 (0.0 %; -0.0-29.9) |
| Privatemode glm-5.3-flash, effort low, rep1 | 30 | 16 (53.3 %; 36.1-69.8) | 9 (30.0 %; 16.7-47.9) (6 exact, 3 wrong) | 5 (16.7 %; 7.3-33.6) | 0 (0.0 %; 0.0-11.4) |
| Privatemode glm-5.3-flash, effort low, rep2 | 30 | 14 (46.7 %; 30.2-63.9) | 7 (23.3 %; 11.8-40.9) (3 exact, 4 wrong) | 9 (30.0 %; 16.7-47.9) | 0 (0.0 %; 0.0-11.4) |
| Privatemode glm-5.3-flash, effort low, rep3 | 30 | 13 (43.3 %; 27.4-60.8) | 9 (30.0 %; 16.7-47.9) (4 exact, 5 wrong) | 8 (26.7 %; 14.2-44.4) | 0 (0.0 %; 0.0-11.4) |
| Privatemode glm-5.3, effort max, rep1 | 30 | 27 (90.0 %; 74.4-96.5) | 3 (10.0 %; 3.5-25.6) (1 exact, 2 wrong) | 0 (0.0 %; 0.0-11.4) | 0 (0.0 %; 0.0-11.4) |
| Privatemode glm-5.3, effort max, rep2 | 30 | 26 (86.7 %; 70.3-94.7) | 2 (6.7 %; 1.8-21.3) (1 exact, 1 wrong) | 2 (6.7 %; 1.8-21.3) | 0 (0.0 %; 0.0-11.4) |
| Privatemode glm-5.3, effort max, rep3 | 30 | 28 (93.3 %; 78.7-98.2) | 1 (3.3 %; 0.6-16.7) (0 exact, 1 wrong) | 1 (3.3 %; 0.6-16.7) | 0 (0.0 %; 0.0-11.4) |

### Critical cases (16 cases x 3 = 48 per system when complete)

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | 48 | 25 (52.1 %; 38.3-65.5) | 19 (39.6 %; 27.0-53.7) (11 exact, 8 wrong) | 0 (0.0 %; 0.0-7.4) | 4 (8.3 %; 3.3-19.6) |
| Tinfoil Thinking: glm-5-3, effort max | 26 | 21 (80.8 %; 62.1-91.5) | 5 (19.2 %; 8.5-37.9) (4 exact, 1 wrong) | 0 (0.0 %; 0.0-12.9) | 0 (0.0 %; 0.0-12.9) |
| Privatemode glm-5.3-flash, effort low | 48 | 24 (50.0 %; 36.4-63.6) | 8 (16.7 %; 8.7-29.6) (1 exact, 7 wrong) | 16 (33.3 %; 21.7-47.5) | 0 (0.0 %; 0.0-7.4) |
| Privatemode glm-5.3, effort max | 48 | 41 (85.4 %; 72.8-92.8) | 4 (8.3 %; 3.3-19.6) (2 exact, 2 wrong) | 3 (6.3 %; 2.1-16.8) | 0 (0.0 %; 0.0-7.4) |

### Per question kind (pooled over repetitions; n = cases x 3)

**Tinfoil Fast: deepseek-v4-1-flash, thinking off**

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| compound-interest | 6 | 0 (0.0 %; 0.0-39.0) | 6 (100.0 %; 61.0-100.0) (4 exact, 2 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| date-time | 12 | 10 (83.3 %; 55.2-95.3) | 2 (16.7 %; 4.7-44.8) (1 exact, 1 wrong) | 0 (0.0 %; 0.0-24.2) | 0 (0.0 %; 0.0-24.2) |
| instalments-simple-interest | 6 | 3 (50.0 %; 18.8-81.2) | 3 (50.0 %; 18.8-81.2) (1 exact, 2 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| multi-step | 6 | 5 (83.3 %; 43.6-97.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 1 (16.7 %; 3.0-56.4) |
| net-gross | 6 | 1 (16.7 %; 3.0-56.4) | 4 (66.7 %; 30.0-90.3) (4 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 1 (16.7 %; 3.0-56.4) |
| overtime-rate | 9 | 0 (0.0 %; -0.0-29.9) | 7 (77.8 %; 45.3-93.7) (0 exact, 7 wrong) | 0 (0.0 %; -0.0-29.9) | 2 (22.2 %; 6.3-54.7) |
| percent-change | 12 | 4 (33.3 %; 13.8-60.9) | 8 (66.7 %; 39.1-86.2) (6 exact, 2 wrong) | 0 (0.0 %; 0.0-24.2) | 0 (0.0 %; 0.0-24.2) |
| proration | 6 | 1 (16.7 %; 3.0-56.4) | 4 (66.7 %; 30.0-90.3) (4 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 1 (16.7 %; 3.0-56.4) |
| skonto | 3 | 2 (66.7 %; 20.8-93.9) | 1 (33.3 %; 6.1-79.2) (0 exact, 1 wrong) | 0 (0.0 %; 0.0-56.1) | 0 (0.0 %; 0.0-56.1) |
| surcharge | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| swiss-vat | 6 | 0 (0.0 %; 0.0-39.0) | 4 (66.7 %; 30.0-90.3) (2 exact, 2 wrong) | 0 (0.0 %; 0.0-39.0) | 2 (33.3 %; 9.7-70.0) |
| table-sum | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| vat | 6 | 5 (83.3 %; 43.6-97.0) | 1 (16.7 %; 3.0-56.4) (1 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |

**Tinfoil Thinking: glm-5-3, effort max**

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| compound-interest | 2 | 2 (100.0 %; 34.2-100.0) | 0 (0.0 %; 0.0-65.8) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-65.8) | 0 (0.0 %; 0.0-65.8) |
| date-time | 2 | 2 (100.0 %; 34.2-100.0) | 0 (0.0 %; 0.0-65.8) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-65.8) | 0 (0.0 %; 0.0-65.8) |
| instalments-simple-interest | 3 | 3 (100.0 %; 43.9-100.0) | 0 (0.0 %; 0.0-56.1) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-56.1) | 0 (0.0 %; 0.0-56.1) |
| multi-step | 1 | 1 (100.0 %; 20.7-100.0) | 0 (0.0 %; 0.0-79.3) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-79.3) | 0 (0.0 %; 0.0-79.3) |
| net-gross | 4 | 3 (75.0 %; 30.1-95.4) | 1 (25.0 %; 4.6-69.9) (0 exact, 1 wrong) | 0 (0.0 %; 0.0-49.0) | 0 (0.0 %; 0.0-49.0) |
| overtime-rate | 5 | 4 (80.0 %; 37.6-96.4) | 1 (20.0 %; 3.6-62.4) (0 exact, 1 wrong) | 0 (0.0 %; 0.0-43.4) | 0 (0.0 %; 0.0-43.4) |
| percent-change | 8 | 8 (100.0 %; 67.6-100.0) | 0 (0.0 %; 0.0-32.4) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-32.4) | 0 (0.0 %; 0.0-32.4) |
| proration | 1 | 1 (100.0 %; 20.7-100.0) | 0 (0.0 %; 0.0-79.3) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-79.3) | 0 (0.0 %; 0.0-79.3) |
| skonto | 1 | 0 (0.0 %; 0.0-79.3) | 1 (100.0 %; 20.7-100.0) (1 exact, 0 wrong) | 0 (0.0 %; 0.0-79.3) | 0 (0.0 %; 0.0-79.3) |
| surcharge | 4 | 4 (100.0 %; 51.0-100.0) | 0 (0.0 %; 0.0-49.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-49.0) | 0 (0.0 %; 0.0-49.0) |
| swiss-vat | 4 | 1 (25.0 %; 4.6-69.9) | 3 (75.0 %; 30.1-95.4) (3 exact, 0 wrong) | 0 (0.0 %; 0.0-49.0) | 0 (0.0 %; 0.0-49.0) |
| table-sum | 1 | 1 (100.0 %; 20.7-100.0) | 0 (0.0 %; 0.0-79.3) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-79.3) | 0 (0.0 %; 0.0-79.3) |
| vat | 4 | 3 (75.0 %; 30.1-95.4) | 1 (25.0 %; 4.6-69.9) (1 exact, 0 wrong) | 0 (0.0 %; 0.0-49.0) | 0 (0.0 %; 0.0-49.0) |

**Privatemode glm-5.3-flash, effort low**

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| compound-interest | 6 | 2 (33.3 %; 9.7-70.0) | 4 (66.7 %; 30.0-90.3) (4 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| date-time | 12 | 12 (100.0 %; 75.8-100.0) | 0 (0.0 %; 0.0-24.2) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-24.2) | 0 (0.0 %; 0.0-24.2) |
| instalments-simple-interest | 6 | 3 (50.0 %; 18.8-81.2) | 2 (33.3 %; 9.7-70.0) (0 exact, 2 wrong) | 1 (16.7 %; 3.0-56.4) | 0 (0.0 %; 0.0-39.0) |
| multi-step | 6 | 4 (66.7 %; 30.0-90.3) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 2 (33.3 %; 9.7-70.0) | 0 (0.0 %; 0.0-39.0) |
| net-gross | 6 | 0 (0.0 %; 0.0-39.0) | 6 (100.0 %; 61.0-100.0) (0 exact, 6 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| overtime-rate | 9 | 3 (33.3 %; 12.1-64.6) | 4 (44.4 %; 18.9-73.3) (2 exact, 2 wrong) | 2 (22.2 %; 6.3-54.7) | 0 (0.0 %; -0.0-29.9) |
| percent-change | 12 | 10 (83.3 %; 55.2-95.3) | 2 (16.7 %; 4.7-44.8) (1 exact, 1 wrong) | 0 (0.0 %; 0.0-24.2) | 0 (0.0 %; 0.0-24.2) |
| proration | 6 | 0 (0.0 %; 0.0-39.0) | 6 (100.0 %; 61.0-100.0) (6 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| skonto | 3 | 0 (0.0 %; 0.0-56.1) | 0 (0.0 %; 0.0-56.1) (0 exact, 0 wrong) | 3 (100.0 %; 43.9-100.0) | 0 (0.0 %; 0.0-56.1) |
| surcharge | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| swiss-vat | 6 | 0 (0.0 %; 0.0-39.0) | 1 (16.7 %; 3.0-56.4) (0 exact, 1 wrong) | 5 (83.3 %; 43.6-97.0) | 0 (0.0 %; 0.0-39.0) |
| table-sum | 6 | 2 (33.3 %; 9.7-70.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 4 (66.7 %; 30.0-90.3) | 0 (0.0 %; 0.0-39.0) |
| vat | 6 | 1 (16.7 %; 3.0-56.4) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 5 (83.3 %; 43.6-97.0) | 0 (0.0 %; 0.0-39.0) |

**Privatemode glm-5.3, effort max**

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| compound-interest | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| date-time | 12 | 12 (100.0 %; 75.8-100.0) | 0 (0.0 %; 0.0-24.2) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-24.2) | 0 (0.0 %; 0.0-24.2) |
| instalments-simple-interest | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| multi-step | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| net-gross | 6 | 5 (83.3 %; 43.6-97.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 1 (16.7 %; 3.0-56.4) | 0 (0.0 %; 0.0-39.0) |
| overtime-rate | 9 | 5 (55.6 %; 26.7-81.1) | 4 (44.4 %; 18.9-73.3) (0 exact, 4 wrong) | 0 (0.0 %; -0.0-29.9) | 0 (0.0 %; -0.0-29.9) |
| percent-change | 12 | 12 (100.0 %; 75.8-100.0) | 0 (0.0 %; 0.0-24.2) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-24.2) | 0 (0.0 %; 0.0-24.2) |
| proration | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| skonto | 3 | 3 (100.0 %; 43.9-100.0) | 0 (0.0 %; 0.0-56.1) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-56.1) | 0 (0.0 %; 0.0-56.1) |
| surcharge | 6 | 6 (100.0 %; 61.0-100.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| swiss-vat | 6 | 4 (66.7 %; 30.0-90.3) | 2 (33.3 %; 9.7-70.0) (2 exact, 0 wrong) | 0 (0.0 %; 0.0-39.0) | 0 (0.0 %; 0.0-39.0) |
| table-sum | 6 | 5 (83.3 %; 43.6-97.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 1 (16.7 %; 3.0-56.4) | 0 (0.0 %; 0.0-39.0) |
| vat | 6 | 5 (83.3 %; 43.6-97.0) | 0 (0.0 %; 0.0-39.0) (0 exact, 0 wrong) | 1 (16.7 %; 3.0-56.4) | 0 (0.0 %; 0.0-39.0) |

**All four systems together, per kind**

| Group | n | Correct (verified, no flag) | Flagged | Silently wrong | No answer |
| --- | --- | --- | --- | --- | --- |
| compound-interest | 20 | 10 (50.0 %; 29.9-70.1) | 10 (50.0 %; 29.9-70.1) (8 exact, 2 wrong) | 0 (0.0 %; 0.0-16.1) | 0 (0.0 %; 0.0-16.1) |
| date-time | 38 | 36 (94.7 %; 82.7-98.5) | 2 (5.3 %; 1.5-17.3) (1 exact, 1 wrong) | 0 (0.0 %; 0.0-9.2) | 0 (0.0 %; 0.0-9.2) |
| instalments-simple-interest | 21 | 15 (71.4 %; 50.0-86.2) | 5 (23.8 %; 10.6-45.1) (1 exact, 4 wrong) | 1 (4.8 %; 0.8-22.7) | 0 (0.0 %; 0.0-15.5) |
| multi-step | 19 | 16 (84.2 %; 62.4-94.5) | 0 (0.0 %; 0.0-16.8) (0 exact, 0 wrong) | 2 (10.5 %; 2.9-31.4) | 1 (5.3 %; 0.9-24.6) |
| net-gross | 22 | 9 (40.9 %; 23.3-61.3) | 11 (50.0 %; 30.7-69.3) (4 exact, 7 wrong) | 1 (4.5 %; 0.8-21.8) | 1 (4.5 %; 0.8-21.8) |
| overtime-rate | 32 | 12 (37.5 %; 22.9-54.7) | 16 (50.0 %; 33.6-66.4) (2 exact, 14 wrong) | 2 (6.3 %; 1.7-20.1) | 2 (6.3 %; 1.7-20.1) |
| percent-change | 44 | 34 (77.3 %; 63.0-87.2) | 10 (22.7 %; 12.8-37.0) (7 exact, 3 wrong) | 0 (0.0 %; 0.0-8.0) | 0 (0.0 %; 0.0-8.0) |
| proration | 19 | 8 (42.1 %; 23.1-63.7) | 10 (52.6 %; 31.7-72.7) (10 exact, 0 wrong) | 0 (0.0 %; 0.0-16.8) | 1 (5.3 %; 0.9-24.6) |
| skonto | 10 | 5 (50.0 %; 23.7-76.3) | 2 (20.0 %; 5.7-51.0) (1 exact, 1 wrong) | 3 (30.0 %; 10.8-60.3) | 0 (0.0 %; 0.0-27.8) |
| surcharge | 22 | 22 (100.0 %; 85.1-100.0) | 0 (0.0 %; 0.0-14.9) (0 exact, 0 wrong) | 0 (0.0 %; 0.0-14.9) | 0 (0.0 %; 0.0-14.9) |
| swiss-vat | 22 | 5 (22.7 %; 10.1-43.4) | 10 (45.5 %; 26.9-65.3) (7 exact, 3 wrong) | 5 (22.7 %; 10.1-43.4) | 2 (9.1 %; 2.5-27.8) |
| table-sum | 19 | 14 (73.7 %; 51.2-88.2) | 0 (0.0 %; 0.0-16.8) (0 exact, 0 wrong) | 5 (26.3 %; 11.8-48.8) | 0 (0.0 %; 0.0-16.8) |
| vat | 22 | 14 (63.6 %; 43.0-80.3) | 2 (9.1 %; 2.5-27.8) (2 exact, 0 wrong) | 6 (27.3 %; 13.2-48.2) | 0 (0.0 %; 0.0-14.9) |

### Repetition-to-repetition consistency (cases answered in all three repetitions)

| System | Cases in 3 reps | Same outcome in all 3 | Same exact/wrong in all 3 | Same figures shown in all 3 (bold lines; method text ignored) | Correct in all 3 | Silently wrong in at least one |
| --- | --- | --- | --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | 30 | 11 | 17 | 3 | 8 | 0 |
| Tinfoil Thinking: glm-5-3, effort max | 8 | 7 | 7 | 1 | 6 | 0 |
| Privatemode glm-5.3-flash, effort low | 30 | 19 | 20 | 4 | 10 | 11 |
| Privatemode glm-5.3, effort max | 30 | 24 | 25 | 12 | 24 | 3 |

### Spend (from the results files; the same lines are in the cost log)

| System | Requests | Input tokens | Output tokens | USD by usage x price | USD as logged by the harness | Note |
| --- | --- | --- | --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | 494 | 528164 | 91673 | 0.4498 | 0.4498 | live catalog price; the logged figure counts each HTTP 402 refusal at the worst case |
| Tinfoil Thinking: glm-5-3, effort max | 320 | 225764 | 216669 | 1.6522 | 6.7226 | live catalog price; the logged figure counts each HTTP 402 refusal at the worst case |
| Privatemode glm-5.3-flash, effort low | 386 | 456637 | 86809 | 0 (free quota) | 0.0000 | free token quota; list-price equivalent EUR 0.1478 |
| Privatemode glm-5.3, effort max | 370 | 431988 | 353440 | 0 (free quota) | 0.0000 | free token quota; list-price equivalent EUR 2.6983 |

### Flags that fired (conversations per flag class combination)

| System | Flag classes on exact answers (false flags) | Flag classes on wrong answers (caught) | Validation failures (call:code, attempts) |
| --- | --- | --- | --- |
| Tinfoil Fast: deepseek-v4-1-flash, thinking off | cross-check-differs 15, cross-check-unavailable 5, cross-check-differs+cross-check-unavailable 3 | cross-check-differs 11, cross-check-differs+method 5, cross-check-differs+ledger+prose 1 | A:CANNOT_ANSWER 19, A:UNKNOWN_REFERENCE 18, B:CANNOT_ANSWER 16, A:EVALUATION 15, B:FORWARD_REFERENCE 6, B:EVALUATION 6, B:TRUNCATED 5, B:INVALID_SCHEMA 3, A:FORWARD_REFERENCE 2, A:INVALID_SCHEMA 1, B:RESULT_FORMAT 1, A:TRUNCATED 1 |
| Tinfoil Thinking: glm-5-3, effort max | cross-check-differs 5 | cross-check-differs+method 1, cross-check-differs 1 | B:CANNOT_ANSWER 8, B:EMPTY 3, B:TRUNCATED 2, A:FORWARD_REFERENCE 1, A:EMPTY 1, A:EVALUATION 1, B:FORWARD_REFERENCE 1, A:UNKNOWN_REFERENCE 1 |
| Privatemode glm-5.3-flash, effort low | cross-check-differs 12, cross-check-unavailable 1 | cross-check-differs 11, cross-check-differs+method 1 | A:CANNOT_ANSWER 11, B:FORWARD_REFERENCE 6, B:EVALUATION 4, B:CANNOT_ANSWER 3, A:EVALUATION 2, A:FORWARD_REFERENCE 1 |
| Privatemode glm-5.3, effort max | cross-check-differs 2 | cross-check-differs+method 4 | B:EMPTY 8, B:CANNOT_ANSWER 2 |

### What the silent wrongs are

Every silently wrong conversation on both Privatemode systems was checked by hand. None shows a miscomputed number: each figure shown was recomputed and matches. The error is that a figure the question asked for is missing.
- Privatemode Flash: 33 failing turns in 22 conversations. 26 omit one of two requested figures (gross after the VAT amount, the payable amount after the Skonto, the five-centime total after the Swiss VAT, the average after the total, the share after the sum). 7 show an intermediate in place of the asked figure (hourly night or Sunday rate instead of the pay; discounted net instead of the gross; the total at the centime in place of the VAT).
- Privatemode GLM-5.3: all 3 silent wrongs omit the second requested figure (share of row 2, VAT total, VAT amount).
- Design B checks that each figure shown is computed correctly by two readings. It does not check that every figure the question asks for is shown. The weaker model exposes that gap.

Tinfoil Fast and Tinfoil Thinking produced no silent wrong. Tinfoil Fast's cost is a high flag rate (44 %, of which 23 of 40 were false flags) and 7 no-answers. Overtime-rate questions were never verified on Fast (7 of 9 wrong but caught, 2 no answer). The caught errors on Thinking and on Privatemode GLM-5.3 are mostly the overtime and night-rate shape ("125 % of the normal rate" applied to the pay instead of the rate, or overtime threshold handling), caught by the second reading and the method rule.

### Worst question kinds

- Swiss VAT: 5 of 22 correct across all systems. Flash was silently wrong 5 of 6; Fast flagged or gave no answer on all 6; Thinking flagged 3 of 4 (false flags).
- Overtime rate: 12 of 32 correct. 14 caught errors, 2 silent wrongs (Flash).
- Net from gross (net-gross): 9 of 22 correct. Flash was wrong 6 of 6 (all caught).
- Proration: 8 of 19 correct. Mostly false flags.
- VAT, table sum and Skonto (two-figure questions): the silent-wrong cluster, 14 of the 25 silent wrongs across the three kinds, almost all on Privatemode Flash.
- Strongest: surcharge 22 of 22 correct, date-time 36 of 38, multi-step 16 of 19.

## AI cross-check (ChatGPT and Claude, paste batches)

Pending owner pastes: no saved replies found.

Questions: `paste-batches-v3-unseen/batch-01.md` to `batch-06.md` (60 standalone questions: each conversation's turn 1 as `<id>a`, turn 2 restated as `<id>b`). Instructions: `paste-batches-v3-unseen/README.md`. When the replies are saved, run `node --import tsx evaluation/arithmetic-gate/ai-agreement.ts` and replace this section with its output. Truth is the code key; where both AIs agree with each other but not the key, the key item is reviewed by hand.

## Conclusion

- **Privatemode GLM-5.3 at max effort was the strongest system measured:** 81 of 90 correct, 6 flagged, 0 no-answers. It was not clean, though: 3 of 90 were silently wrong, all from one omitted figure.
- **Tinfoil Thinking (glm-5-3, max) looks similar on the 40 conversations it finished:** 33 correct, 0 silently wrong. On the same 40 conversations, Privatemode GLM-5.3 had 36 correct and 0 silently wrong. That is too few, and too skewed to the early cases, to separate the two; finishing Thinking needs the account limit lifted (about USD 2.5).
- **Tinfoil Fast (deepseek, thinking off) never gave a silently wrong answer,** but it verifies only about half (43 of 90) and flags 40. That is safe but noisy.
- **Privatemode GLM-5.3-Flash at low effort is not fit for this pipeline:** 22 of 90 silently wrong.
- Repetitions agree on the outcome for 24 of 30 cases on Privatemode GLM-5.3, 19 of 30 on Flash and 11 of 30 on Tinfoil Fast.
- The finding that matters for the product holds across systems: Design B lets an answer through without a flag when it leaves out a figure the user asked for. A completeness check (every requested figure present) would have turned all 25 silent wrongs seen here into flags.
- Spend: Tinfoil USD 2.10 by usage (Fast 0.45, Thinking 1.65); the cost log says 7.17 because of the 402 accounting. Privatemode charged nothing from the free token quota; the list-price equivalent is EUR 2.85 (GLM-5.3 2.70, Flash 0.15). The free-quota status is taken from the spike's note (organisation spend budget zero) and was not checked in the portal.
