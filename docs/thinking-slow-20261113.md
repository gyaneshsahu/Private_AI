# Why Thinking was slow in the live runs (13 November 2026, night)

**Cause: the test setting, not Privatemode load and not our path.** The live runs in this checkout ran Thinking at reasoning effort **max**. The time-out work of the same day chose **high** (`docs/thinking-timeouts-20261113.md`), but it changed `.local/qualification-privatemode.json` in another checkout (`Private_AI-pm`). That file is git-ignored, so the change never reached this checkout, and the other checkout was removed in the evening. The committed draft report (`evaluation/qualification-drafts/privatemode-20261112.json`) says high, so a report made from it for production is not affected.

## Evidence

1. **Every slow run recorded max.** `run.json` of the smoke run (Q01 97.8 s, Q21 57.9 s), the 40-question German-rules runs (U, S, G), the official-source run and the answer-language run all show `glmReasoningEffort: "max"` for Thinking.
2. **The wait is the model reasoning, not a queue.** In all 116 recorded Thinking replies with token counts, the longest silence on the reply stream is 1.0 s. A queue at Privatemode, the attestation queue or the relay would show as silence. Time follows tokens (about 60 to 70 tokens per second, r = 0.81): the slow replies used a median of 3,900 tokens for answers of about 1,400 characters, the quick ones 2,000.
3. **Same two prompts, effort high, same path, tonight:**

| Prompt | max (morning) first word / total / tokens | high (23:55) first word / total / tokens |
| --- | --- | --- |
| Q01 | 97.8 s / 102.3 s / 6,122 | 6.2 s / 9.3 s / 1,179 |
| Q21 | 57.9 s / 66.2 s / 4,320 | 6.6 s / 15.7 s / 4,689 (searched this time, so most tokens are the page text) |

Two prompts are a confirmation, not a statistic. The 16-reply comparison in the time-outs note is the measurement (median first word 4.2 s at high, 10.4 s at max).

## What changed

- `.local/qualification-privatemode.json` in this checkout: Thinking effort max to high (the old file is kept beside it as `.max-effort-bak-20261113`).
- `evaluation/blind-benchmark/run-ours.ts` refuses a Privatemode run when the local file's Thinking model or effort differs from the committed draft, unless `--tiers` is passed on purpose.

## What this means for earlier results

- **Results measured at max, not at the setting we will ship:** the 40-question German-rules test, the official-source run, the search-first runs and the answer-language check. Their Thinking answers may differ a little at high (the time-outs note found one wrong test line in one of two coding runs, and no other difference). Their token spend was also about three times what high would have used.
- **Not re-run.** A re-run of the Thinking part of the 40-question set at high costs about 60,000 tokens. Recommended once, together with the detector work, not on its own.
- **Not checked:** speed at alpha hours with several users at once, and anything on Render. Privatemode's free and standard tiers allow 20,000 completion tokens per minute per organisation (owner's notes, not verified by the agent). One Thinking reply streams about 3,500 a minute, so about five simultaneous Thinking replies reach that limit. The limit of 3 chats at once stays below it.

Spend: 2 Privatemode requests, 5,868 tokens as reported by the app; 1 Brave search at most.
