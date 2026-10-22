# Default model proposal: a non-experimental model — 22 October 2026

Launch plan 8.5. Supplier statement of 22 October (verbatim in [provider-qualification.md](provider-qualification.md)): every chat model not labelled `experimental` has production status with a minimum deprecation notice of one week; experimental models may change at any time. The development permits since 4 October used `deepseek-v4-1-flash`, which the catalog labels experimental, so it cannot be the hosted default. This document proposes candidates and the switch mechanism. **The pick is the owner's; nothing in code or configuration changes with this document, and no evaluation request has been made.**

## Candidates, from the supplier's public chat model page read on 22 October

Only the experimental label and the capability notes come from the page read today; prices and the quality notes come from the 20 October shortlist in provider-qualification.md ("Model/deployment shortlist", catalog snapshot `evaluation/results/model-catalog-20261020.json`) and are not re-read today. None of this is verified quality.

| Candidate (model ID) | Label today | USD input/output per million (20 October read) | What our code already supports | Evidence we hold | Assessment |
| --- | --- | --- | --- | --- | --- |
| Gemma 4 31B (`gemma4-31b`) | none | 0.40 / 1.00 | `gemmaThinking` flag in the request path and the permit schema; image input per catalog | Shortlisted 20 October as the cheaper default challenger; no matched quality run yet | **Recommended first candidate**: production status, lowest tariff after GPT-OSS, image input, code path exercised in synthetic development. Needs the frozen seven-case screen before it becomes the hosted default. |
| GPT-OSS 120B (`gpt-oss-120b`) | none | 0.15 / 0.60 | `gptOssReasoningEffort` flag; the page notes web browsing, relevant to launch plan 4.2 | Prior matched replies 22.9 to 74 s with instruction and source-silence failures and a 503 (20 October note) | Cheapest and the natural web-search candidate, but the recorded quality and latency failures mean it should be the **fallback model** candidate (`fallbackModel`, user-confirmed) rather than the default until re-screened. |
| GLM-5.3 (`glm-5-3`) | none | 1.80 / 5.75 | `glmReasoningEffort` flag; text only, no image input per catalog | Shortlisted 20 October as a possible specialist | Three to six times the tariff of Gemma; justified only if the screen shows a clear quality margin. Not recommended as default on cost. |
| Kimi K3 (`kimi-k3`) | none | 4.00 / 20.00 | no model-specific path | None | Output tariff twenty times Gemma's; deferred on 20 October, unchanged. |
| Llama 3.3 70B (`llama3-3-70b`) | none | 1.75 / 2.75 | no model-specific path | None | Older, costlier than Gemma with no recorded advantage; not shortlisted. |
| DeepSeek V4.1 Flash (`deepseek-v4-1-flash`) | **experimental** | 0.65 / 1.45 | `deepSeekThinking`, `deepSeekReasoningEffort` | All development permits since 4 October | Excluded from the hosted default by the supplier's own status; stays available for synthetic development permits only. |

## Proposal

1. **Default:** `gemma4-31b`, thinking off, after the frozen seven-case two-turn screen designed on 20 October is run against it (42 requests at most, no tools, no retries). That run is a paid step: before it, the owner names the service (Tinfoil), the current price (the two tariffs above, re-read on the day) and a specific cap. The 20 October reserve arithmetic (about USD 2.80 for three arms) is a historical figure, not an authorisation.
2. **Fallback:** `gpt-oss-120b` as the user-confirmed `fallbackModel`, subject to the fallback evidence requirement recorded on 22 October in provider-outreach-20261020.md (same worker repository, release digest and pricing evidence as the primary).
3. **If the screen fails Gemma on the safety or everyday cases:** promote GLM-5.3 to the screen's next arm before considering Kimi.

## The switch mechanism, unchanged code

The default model is not a code constant. It is the `model` value of the qualification report the deployment loads (`shared/contracts.ts`, `qualificationSchema`; automatic routing is refused by the schema), pinned to the relay by `X-Tinfoil-Model` and to the browser by the report. Changing it means issuing a new report for the chosen model with the same evidence as today's: the worker repository and release digest serving it on the qualified router, the release listing or supplier mapping it comes from, the tariff read on the day, and the browser verification record. The model-specific request flags (`gemmaThinking`, `gptOssReasoningEffort`) are already in the report schema and the request path. No deployment, allowlist or privacy copy changes with the pick alone; the privacy statement names no model.

## Operating rule that follows from the one-week notice

The runbook ("Model lifecycle: deprecation notice and weekly check") now requires a weekly read of the model page and changelog with the result recorded in READINESS.md, a replacement procedure inside the notice week, and the operator stop control instead of silent failure. The relay's `X-PrivateAI-Upstream: unavailable` counts are the early signal.

## What this document does not do

It does not change the qualified model, does not run or authorise any evaluation, does not claim quality for any candidate, and does not move the provider qualification status, which remains NOT_PASSED.
