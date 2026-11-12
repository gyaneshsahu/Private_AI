# Wide model screen: Fast and Thinking per provider — 12 November 2026

**Status: recommendation, not a gate.** Automatic bars only; the safety case (07) is not graded here and waits for the owner. Synthetic data only. Nothing deployed, no app code changed.

**Supplier notice (owner-reported, 12 November).** Tinfoil emailed that **kimi-k3 is deprecated and will be removed soon**; **kimi-k3-1-pro is Experimental** and is the most expensive chat model in the catalog. Both were screened before the notice arrived; no further requests were made to either after it. Both are **excluded** from the recommendations below.

## Method

- **Harness:** `evaluation/wide-screen.ts` (new). Request code and scoring are copied unchanged from the stage-1 screen (`evaluation/privatemode/screen.ts` and `score.ts`, branch `privatemode-eval`): the same frozen nine synthetic two-turn cases (`evaluation/cases/model-selection-20261020.json` + `model-selection-checks-20261022.json`), the same product prompt (`composeContext(..., "constraints-v4")`), the same limits (8,000 input characters, 4,096 output tokens), the same bars (arithmetic case 03, open question 05, coding 04 with the answer's code run under Node's permission model, placeholders 08, citation format 09, first-token median ≤ 4 s and max ≤ 20 s, at most 1 error). A bar passes only at 3/3. Results are comparable with the 11 November screen (`results-20261111.json` on `privatemode-eval`).
- **Additions:** per arm, median and max time to first visible answer token, median whole-reply time, output tokens per reply (reasoning included, as billed), cost per reply, and one **long-answer probe**: a synthetic request for a 600-word guide at 4,096 max output tokens; if it was cut off, it was repeated once at 16,384 to see how much the arm actually needs.
- **Arms:** every Tinfoil chat model in the catalog refreshed today (`evaluation/results/model-catalog-20261112.json`, read-only GET), in the settings the app supports (`src/providers/tinfoil-client.ts` `modelOptions`), plus GLM `max`. Skipped as not chat: embeddings, audio, tts, decision, pii-filter, doc-upload, websearch, gpt-oss-safeguard-120b (type "safety"), voxtral-small-24b (type "audio"). Privatemode: every chat model its API lists (`glm-5.3`, `glm-5.3-flash`, `gpt-oss-120b`); skipped aliases (`glm-latest`, `glm-flash-latest`, `gpt-oss-latest`, `openai/gpt-oss-120b`), `glm-5.2` (deprecated, routes to glm-5.3) and `deepseek-ocr-2` (OCR model). Privatemode GLM reasoning cannot be switched off; `low` is the minimum and `max` is the default.
- **Transport:** Tinfoil over plain TLS to the API (as on 11 November); Privatemode through its SDK in Node (attested, encrypted; SDK 1.63.0 loaded from the `privatemode-parity` worktree). Keys from Windows Credential Manager via `scripts/WindowsSecrets.psm1`; never printed or written.
- **Concurrency (affects speed numbers):** the 11 Tinfoil arms ran at the same time (one request at a time per arm); the six first Privatemode arms ran at the same time through one SDK client. `tinfoil-glm-max`, `privatemode-glm-max` and `privatemode-glmflash-max` were added after GLM `high` turned out to barely reason, and ran alone; `privatemode-glmflash-max` ran one repetition only, to finish on time.
- **Two harness incidents:** (1) Tinfoil refused 32 gemma requests with HTTP 429 (per-key rate limit; only gemma was affected with two gemma arms running). A retry that waits the stated "Retry after" was added and both gemma arms were rerun from scratch; the refused run is kept aside, its spend is counted. (2) Privatemode first-token stalls of 10–76 s appeared in every concurrently run arm, at the same moments across arms. A solo rerun (one repetition, one arm at a time) of glm-5.3-flash low and glm-5.3 high had **no stall** (max first token 1.7 s and 2.4 s). The stalls come from running six streams at once through one client or account, not from a model; the max-first-token bar failures on Privatemode below are that artefact. Whether many real users at once would see the same is **not tested**.

## Spend

- **Tinfoil: USD 3.04** (list price × reported usage, full input price; cached input not discounted, so this is an upper bound). Of that, kimi-k3 USD 0.94 and kimi-k3-1-pro USD 1.11; GLM-5.3 three arms USD 0.64; everything else USD 0.35 (includes the smoke test USD 0.005 and the rate-limited gemma run USD 0.029). Owner can cross-check on the Tinfoil dashboard.
- **Privatemode: EUR 0 (free quota).** About 576,000 tokens (about 735,000 against the quota, where gpt-oss counts double), including the smoke test and the solo reruns; a stopped 3-repetition start of the flash-max arm (3 replies) is not in the count.

## Results — Tinfoil (3 repetitions × 9 cases = 54 replies per arm)

| Arm (settings) | Arith. | Open Q | Coding | Placeh. | Citation | Errors | First token median / max | Reply median | Output tokens median / max | USD per reply | Long answer at 4,096 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| deepseek-v4-1-flash, thinking off | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 551 ms / 5.4 s | 0.76 s | 63 / 628 | 0.00070 | completes (835 tokens) |
| deepseek-v4-1-flash, thinking low | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 1.0 s / 7.3 s | 1.16 s | 196 / 1,064 | 0.00090 | completes (2,401) |
| glm-5-3, effort low | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 526 ms / **52.5 s** | 1.10 s | 79 / 572 | 0.00226 | completes (969) |
| glm-5-3, effort high | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 706 ms / 2.0 s | 1.15 s | 99 / 689 | 0.00245 | completes (942) |
| glm-5-3, effort max (alone) | 3/3 | 3/3 | **2/3** (1 cut off at 4,096) | 3/3 | 3/3 | 1 | 2.0 s / **90.7 s** | 2.36 s | 284 / 4,096 | 0.00523 | **cut off**; needs 12,417 |
| gpt-oss-120b, effort low | 3/3 | **2/3** | 3/3 | 3/3 | **2/3** | 0 | 543 ms / 963 ms | 0.93 s | 97 / 641 | 0.00024 | completes (1,682) |
| gpt-oss-120b, effort high | 3/3 | **1/3** | **2/3** | 3/3 | 3/3 | 0 | 3.5 s / 10.3 s | 4.28 s | 668 / 1,954 | 0.00058 | **cut off**; needs 10,252 |
| gemma4-31b, thinking off | 3/3 | **0/3** | **0/3** | 3/3 | 3/3 | 0 | 415 ms / 789 ms | 0.67 s | 32 / 437 | 0.00042 | completes (561) |
| gemma4-31b, thinking on | 3/3 | 3/3 | **2/3** | 3/3 | 3/3 | 0 | 2.8 s / 8.0 s | 3.00 s | 393 / 1,102 | 0.00077 | completes (1,208) |
| llama3-3-70b | 3/3 | 3/3 | **1/3** | 3/3 | 3/3 | 0 | 442 ms / 864 ms | 1.88 s | 61 / 381 | 0.00177 | completes (867) |
| kimi-k3 (excluded: deprecated) | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 3.4 s / 15.5 s | 3.91 s | 410 / 2,033 | 0.01442 | **cut off**; needs 3,732 |
| kimi-k3-1-pro (excluded: experimental, costly) | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 3.8 s / **42.1 s** | 4.07 s | 448 / 2,715 | 0.01699 | **cut off**; needs 5,305 |

Reasoning volume matters for the tier: GLM-5.3 at `high` barely reasons on Tinfoil (median 100 reasoning characters per reply, against 24 at `low` and 1,002 at `max`); only `max` is a thinking setting. DeepSeek thinking low reasons for real (median 691 characters) and stays fast. gpt-oss high exhausted the 4,096 budget on hidden reasoning in the probe (0 visible words), the effect seen on 12 November.

## Results — Privatemode (3 repetitions × 9 cases = 54 replies per arm)

Costs are EUR at list price for comparison only (the screen ran on the free quota). First-token max values above 20 s are the concurrency artefact described in Method.

| Arm (settings) | Arith. | Open Q | Coding | Placeh. | Citation | Errors | First token median / max | Reply median | Output tokens median / max | EUR per reply (list) | Long answer at 4,096 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| glm-5.3-flash, effort low | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 672 ms / 70.3 s (alone, 1 rep: 637 ms / 1.7 s) | 3.21 s (alone 3.50 s) | 85 / 584 | 0.00026 | completes (936 tokens) |
| glm-5.3-flash, effort high | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 1.3 s / 71.9 s | 3.99 s | 106 / 545 | 0.00028 | completes (906) |
| glm-5.3-flash, effort max (alone, **1 repetition only**) | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 0 of 18 | **13.0 s / 101.5 s** | 14.9 s | 440 / 3,191 | 0.00065 | **cut off** (0 words); needs 6,973 tokens and took 4.5 minutes |
| glm-5.3, effort low | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 0 | 788 ms / 62.4 s | 3.02 s | 72 / 588 | 0.00206 | completes (836) |
| glm-5.3, effort high | 3/3 | 3/3 | **2/3** (code failed its own test) | 3/3 | 3/3 | 0 | 1.2 s / 72.2 s (alone, 1 rep: 1.0 s / 2.4 s) | 3.60 s (alone 2.90 s) | 94 / 766 | 0.00222 | completes (830) |
| glm-5.3, effort max (alone) | 3/3 | 3/3 | **0/3** (all cut off at 4,096) | 3/3 | 3/3 | 3 | **5.5 s / 41.1 s** | 7.85 s | 271 / 4,096 | 0.00512 | **cut off** after 632 words; needs 13,989 tokens and took **6.6 minutes** |
| gpt-oss-120b, effort low | 3/3 | **0/3** | 3/3 | 3/3 | **0/3** | 0 | 459 ms / 60.6 s | 0.97 s | 88 / 658 | 0.00030 | completes (1,771) |
| gpt-oss-120b, effort high | 3/3 | **0/3** | 3/3 | 3/3 | 3/3 | 0 | 6.7 s / 76.4 s | 7.25 s | 632 / 1,678 | 0.00067 | **cut off**; needs 2,084 |

Privatemode generates far more slowly than Tinfoil on GLM-5.3 at max effort: the 13,989-token long answer took 397 s (about 35 tokens per second), against 56 s for 12,417 tokens on Tinfoil.

GLM at `high` barely reasons on Privatemode too (median 74 reasoning characters for glm-5.3, 119 for flash). gpt-oss-120b misses the open question in every repetition at both efforts and, at low effort, the citation format every time (it writes `【memo-20a】` or `[ note-… ]` instead of the square form), as on 11 November.

## Recommendation

Never mixing providers: each provider has its own four picks. Output limits are per mode: Fast 2,048 (every Fast pick's long answer finished under 1,000 tokens and no screen reply passed 700), Thinking 16,384 (the smallest limit at which every thinking arm's long answer finished; 4,096 cut every one of them off at least once).

### Tinfoil

| Mode | Pick | Model and app setting | Max output tokens | Why |
| --- | --- | --- | --- | --- |
| Fast | Primary | `deepseek-v4-1-flash`, `deepSeekThinking: false` | 2,048 | Every automatic bar 3/3, fastest whole reply (0.76 s median), USD 0.0007 per reply, long answer in 835 tokens. |
| Fast | Backup | `glm-5-3`, `glmReasoningEffort: "high"` | 2,048 | Every bar 3/3 including first-token max (2.0 s); reasons very little at this setting, so it behaves like a fast model; about 3.5× the cost per reply. `low` is equivalent except for one 52 s first-token outlier. |
| Thinking | Primary | `glm-5-3`, `glmReasoningEffort: "max"` | 16,384 | The strongest non-deprecated model, and the only GLM setting that reasons at length. Its one miss was a coding answer cut off at 4,096, which the 16,384 limit removes (long answer finished at 12,417). First visible text can take long (median 2.0 s, 8 of 53 replies over 10 s, max 91 s): the app must show that it is thinking. USD 0.005 per reply observed, about USD 0.10 worst case at 16,384. |
| Thinking | Backup | `deepseek-v4-1-flash`, `deepSeekThinking: true`, `deepSeekReasoningEffort: "low"` | 16,384 | Every bar 3/3, reasons for real (median 691 characters), fast (first token 1.0 s median, 7.3 s max) and cheap (USD 0.0009 per reply). Weaker than GLM max on Tinfoil's own score (31 against 45). |

A single model outage is covered: if DeepSeek goes, Fast falls back to GLM and Thinking keeps GLM; if GLM goes, Fast keeps DeepSeek and Thinking falls back to DeepSeek. If speed matters more than depth in Thinking, swap the two Thinking picks. Screened and excluded: **kimi-k3 (deprecated)** and **kimi-k3-1-pro (experimental and costly)**, although both met every bar. Not picked: gpt-oss-120b (misses the open question and citation format at low, open question and coding at high), gemma4-31b (misses coding off and on, and the open question with thinking off), llama3-3-70b (coding 1/3, slower and pricier than DeepSeek).

### Privatemode

| Mode | Pick | Model and setting (top-level `reasoning_effort`) | Max output tokens | Why |
| --- | --- | --- | --- | --- |
| Fast | Primary | `glm-5.3-flash`, `low` | 2,048 | Every automatic bar 3/3 (first-token max met when run alone), EUR 0.00026 per reply at list price, long answer in 936 tokens. Whole replies are slower than Tinfoil (median 3.2 s against 0.76 s). |
| Fast | Backup | `glm-5.3`, `low` | 2,048 | Every bar 3/3, a different model from the primary, about 8× the list price per reply. gpt-oss-120b low is not usable: it misses the open question and the citation format in every repetition. |
| Thinking | Primary | `glm-5.3`, `max` | 16,384 | The only Privatemode setting that reasons at length with all bars met apart from coding, which was cut off at 4,096 every time (the 16,384 limit fixes that; long answer finished at 13,989 tokens). **Slow:** median first text 5.5 s, 16 of 51 replies over 10 s, and the long answer took 6.6 minutes. |
| Thinking | Backup | `glm-5.3-flash`, `max` | 16,384 | Met every case in its single repetition, a different model from the primary; **slower still** (median first text 13 s, max 102 s; long answer 4.5 minutes). Evidence is one repetition only. |

Blunt read: on Privatemode, Fast is fine, but Thinking is slow enough that users will wait minutes for long answers. If Privatemode is the provider, either accept that and show progress clearly, or make Thinking `glm-5.3` at `high` (fast, but it barely reasons, so it adds little over Fast). Not picked: gpt-oss-120b at either effort (misses the open question every time). On Tinfoil the same GLM-5.3 at max finishes the long answer about 7× faster.

### Code changes needed (not made; app code is with another agent)

1. **Privatemode reasoning setting goes top-level.** Privatemode takes `reasoning_effort` at the top level for both GLM and gpt-oss; the Tinfoil client sends GLM effort inside `chat_template_kwargs`. The Privatemode adapter needs its own mapping, and it must always send an effort for GLM: with none, Privatemode uses `max`, which is slow and can exhaust a small output budget.
2. **Per-mode output limit.** Fast and Thinking need different max output tokens (above). Every thinking arm here was cut off at 4,096 on the long answer at least once, with no visible text, so a Thinking limit of 4,096 would show users empty, cut-off replies.
3. **Rate-limit retry.** Tinfoil answers HTTP 429 with "Retry after N seconds" (seen on gemma with two streams). Check that the app or relay waits and retries once rather than failing the reply.
4. No new model setting is needed for the recommended arms: `deepSeekThinking`, `deepSeekReasoningEffort: "low"` and `glmReasoningEffort: "high" | "max"` already exist.

## Not done or not verified

- Safety case 07 is **ungraded**: the replies for each arm are in `.local/wide-screen-20261112/<arm>-safety.md` (local only, not committed) for the owner's grade. The recommendation stands only if the recommended arms' safety replies are acceptable.
- The bars are basic; they do not separate strong from very strong reasoning. Tier placement also uses the reasoning volume measured here and Tinfoil's catalog intelligence score (glm-5-3 high 45, deepseek flash low 31 and off 22, gpt-oss high 12).
- glm-5-3 max was not rerun on the screen cases at the recommended 16,384 limit; its one coding failure was a cut-off at 4,096, and the probe completed at 16,384.
- Speeds under real load, the Privatemode stall under concurrency, and the browser path (relay and app parser) were not measured here; the 12 November parity run covered the browser path for gpt-oss and glm-5.3-flash.
- One long-answer probe per arm; probe token counts vary a lot between attempts (kimi-k3 used 4,096+ then 3,732; Privatemode gpt-oss high 4,096+ then 2,084).

Results: `evaluation/results/wide-screen-20261112.json` (scores only). Raw replies and logs: `.local/wide-screen-20261112/` (local).
