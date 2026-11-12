# Privatemode Fast tier: glm-5.3 low or glm-5.3-flash low (12 November 2026)

**Status: recommendation, not a gate.** The owner made Privatemode the primary provider for the alpha. This page picks its **Fast** model. Thinking stays `glm-5.3` at high or max. Exact model ids only, never `*-latest`. Synthetic data only. Nothing deployed, no app code changed. The safety case (07) is **not graded here**; it waits for the owner.

## Recommendation

**Fast = `glm-5.3-flash`, `reasoning_effort: "low"`.**

Why:
- On everyday answers the two are equal. Both pass every automatic check 3/3, with 0 errors in 54 replies each.
- Flash is quicker: first text median 485 ms against 792 ms, and the long answer took 22 s against 40 s.
- Flash is **7.6 times cheaper** per answer once the free allowance is spent.
- glm-5.3 at low does not fix arithmetic. It is somewhat better than Flash (14 silently wrong of 90 against 22, with overlapping bounds), but both fail. Neither is close to glm-5.3 at max (3 of 90). Paying 7.6 times as much for an arithmetic gain that is still a fail is a poor trade.

Conditions on this pick (blunt):
1. **Arithmetic must not be answered in Fast as it stands.** Auto already sends word problems to Thinking (commit 05422f4). When a user forces Fast on an arithmetic question, the answer still needs the completeness check (every requested figure shown). That check would catch every Flash silent wrong seen so far, which were all missing or substituted figures. It would catch 13 of glm-5.3 low's 14; the 14th was a wrong figure that both readings agreed on.
2. The owner grades safety case 07 for both arms (files below). The pick stands only if Flash's replies are acceptable.

**Backup** (a different model, if Flash is withdrawn or degrades): `glm-5.3` at `low`, which has the same checks and output limit.

## Comparison

Arithmetic: arithmetic gate v3, unseen set, Design B harness, 90 conversations (30 cases x 3 repetitions). Screen: the nine stage-1 cases of the wide screen x 3 repetitions = 54 replies, with each arm run **alone** (one request at a time, the two arms one after the other), so there is no concurrency stall. Cost: Privatemode list price, EUR per 1M tokens plus VAT, times the measured mean tokens per screen reply.

| | **glm-5.3-flash, low** | **glm-5.3, low** | for reference: glm-5.3, max (Thinking) |
| --- | --- | --- | --- |
| Arithmetic correct (verified, no flag) | 43/90 (47.8 %; 37.8-58.0) | 50/90 (55.6 %; 45.3-65.4) | 81/90 |
| Arithmetic flagged (exact / wrong) | 25 (13 / 12) | 25 (12 / 13) | 6 (2 / 4) |
| Arithmetic silently wrong | **22/90** (24.4 %; 16.7-34.2) | **14/90** (15.6 %; 9.5-24.4) | 3/90 |
| Arithmetic no answer | 0 | 1 | 0 |
| Arithmetic critical cases silently wrong (of 48) | 16 | 11 | 3 |
| Screen checks: arithmetic, open question, coding, placeholders, citation | 3/3 each | 3/3 each | (not rerun) |
| Screen errors | 0 of 54 | 0 of 54 | |
| First visible token, median / max | **485 ms / 2.0 s** | 792 ms / 3.2 s | |
| Whole reply, median / max | **2.40 s / 14.9 s** | 2.63 s / 24.4 s | |
| Output tokens per reply, median / mean / max (reasoning included) | 84 / 135 / 488 | 75 / 115 / 527 | |
| Input tokens per reply, mean | 850 | 837 | |
| Long answer (600-word guide, limit 4,096) | finished: 777 words, 981 tokens, 22.4 s | finished: 631 words, 802 tokens, 40.0 s | |
| List price, EUR per 1M input / output | 0.20 / 0.65 | 1.55 / 5.74 | |
| **EUR per 1,000 typical answers** (mean tokens, before VAT) | **0.26** | **1.96** | |
| EUR per 1,000 answers including 19 % VAT | 0.31 | 2.33 | |
| Arithmetic, EUR per two-turn conversation (Design B, about 6,000-6,400 tokens) | 0.0016 | 0.014 | 0.030 |

Notes:
- Speed is from one machine in Germany through the Privatemode SDK (attested, encrypted). It is not under real load. Running several streams at once through one client caused stalls of 10-76 s in the first wide screen. This run had none, because each arm ran alone. The earlier concurrent run of the same two arms showed first-token max values of 62 s and 70 s.
- Medians match the first wide screen closely (Flash 85 output tokens and EUR 0.00026 per reply then; glm-5.3 low 72 and EUR 0.00206).
- With the median reply instead of the mean, cost per 1,000 answers is EUR 0.21 (Flash) against EUR 1.62 (glm-5.3 low); the ratio is the same.
- What the silent wrongs are: Flash, 33 failing turns in 22 conversations. All omit a requested figure or show an intermediate in its place, and no figure is miscomputed (hand-checked; `evaluation/arithmetic-gate/results-v3-unseen-20261112.md`). glm-5.3 low: 13 of 14 omit the second figure asked in turn 2. One (unseen3-25 r3) shows a wrong compound-interest amount, EUR 44,129,449.00, on which both Design B readings agreed.

## What it means for the allowance and its cost

- **The free allowance buys the same number of answers with either model.** Privatemode counts GLM-5.3 and GLM-5.3-Flash at multiplier 1.0 (`docs/privatemode-master-notes.md` section 8). A typical Fast answer uses about 950-985 tokens (mostly input: the product prompt and history), so 1M allowance tokens is about 1,000 answers either way.
- **Allowance left (estimate, not checked in the portal):** about 1.33M was used before this work, plus 0.68M by this work, so about 2.0M used and **about 3.0M left**. That is about 3,000 plain Fast answers. An arithmetic turn through Design B costs about three times a plain answer (about 3,000-3,200 tokens).
- **After the allowance**, the choice decides the bill. Per 10,000 Fast answers at list price before VAT: **Flash EUR 2.58, glm-5.3 low EUR 19.57.** For scale, Thinking (`glm-5.3` max) used about EUR 5.12 per 1,000 screen replies on the first wide screen, before the longer 16,384 limit.
- If the organisation instead falls back to the Free tier after the allowance (1M prompt and 1M completion tokens per month), the prompt limit binds first: about 1,200 Fast answers a month in total, whichever model.

## Not done or not verified

- **Safety case 07 is ungraded.** Replies: `.local/privatemode-fast-tier-20261112/privatemode-glmflash-low-safety.md` and `privatemode-glm-low-safety.md` (local, not committed).
- The automatic checks are basic and do not separate good from very good answers. The German-rules and coding gaps found in the fresh benchmark runs were not re-measured here.
- Speed under real concurrent load and through the browser path (relay and app parser) was not measured.
- The arithmetic set has been used before (24 October and today); this compares systems, it is not a gate.
- The allowance left is estimated from token counts; the portal figure was not read.

## Tokens used (Privatemode free allowance; no Tinfoil calls)

| Run | Model | Requests | Input tokens | Output tokens |
| --- | --- | --- | --- | --- |
| Arithmetic gate, 3 repetitions | glm-5.3 low | 410 | 487,701 | 89,186 |
| Screen, 54 replies + 1 long-answer probe | glm-5.3 low | 55 | 45,854 | 7,016 |
| Screen, 54 replies + 1 long-answer probe | glm-5.3-flash low | 55 | 46,548 | 8,269 |
| **Total** | | 520 | **580,103** | **104,471** |

That is 684,574 tokens in all: 629,757 on glm-5.3 and 54,817 on glm-5.3-flash. No quota, budget or payment refusal was returned. List-price equivalent: EUR 1.39 (glm-5.3 arithmetic 1.27, screen 0.11; Flash 0.015).

## How it was run

- Arithmetic: new cell `privatemode-glm-low` in `evaluation/arithmetic-gate/harness-v3.ts`. `--cases unseen-v3 --retry 1 --reps 1 --rep <n> --root .local/arithmetic-v3-unseen-20261112 --cap 2`, three repetitions in parallel. The harness now stops a run at the first quota, budget or payment refusal. Tables: `node --import tsx evaluation/arithmetic-gate/report-v3-unseen-20261112.ts`. Listing: `evaluation/arithmetic-gate/verdicts/unseen-v3-20261112/privatemode-glm-low.md`.
- Screen: the existing arms `privatemode-glm-low` and `privatemode-glmflash-low` of `evaluation/wide-screen.ts`, run with `WIDE_SCREEN_DIR=.local/privatemode-fast-tier-20261112`, so the first screen's files are not overwritten. Scores are in `scores.json` there. The screen also stops an arm on a quota, budget or payment refusal and then skips the long-answer probe.
- Keys came from Windows Credential Manager via `scripts/WindowsSecrets.psm1` and were never printed. The SDK was loaded read-only from the `Private_AI-pm` worktree (privatemode-ai 1.63.0).
