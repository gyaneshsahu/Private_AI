# Default model proposal: a non-experimental model — 22 October 2026

Launch plan 8.5. Supplier statement of 22 October (verbatim in [provider-qualification.md](provider-qualification.md)): every chat model not labelled `experimental` has production status with a minimum deprecation notice of one week; experimental models may change at any time. The development permits since 4 October used `deepseek-v4-1-flash`, which the catalog labels experimental, so it cannot be the hosted default. This document proposes candidates and the switch mechanism. **The pick is the owner's; nothing in code or configuration changes with this document, and no evaluation request has been made.**

## Candidates, from the supplier's public chat model page read on 22 October

Only the experimental label and the capability notes come from the page read today; prices and the quality notes come from the 20 October shortlist in provider-qualification.md ("Model/deployment shortlist", catalog snapshot `evaluation/results/model-catalog-20261020.json`) and are not re-read today. None of this is verified quality.

| Candidate (model ID) | Label today | USD input/output per million (20 October read) | What our code already supports | Evidence we hold | Assessment |
| --- | --- | --- | --- | --- | --- |
| Gemma 4 31B (`gemma4-31b`) | none | 0.40 / 1.00 | `gemmaThinking` flag in the request path and the permit schema; image input per catalog | 20 October screen (`evaluation/results/model-selection-20261020.json`, engineering inspection, human grades blank): 14 of 14 replies delivered, fastest arm (median 1.7 s), cheapest (USD 0.0062 for the arm); **material arithmetic failure** in the reasoning case (09:23 minus 18 minutes given as 08:58), first document summary omitted the open seating question, sparse-array edge checks failed in coding; chat, writing, research and safety constraints met. | **Candidate for default, not yet fit**: production status, lowest tariff after GPT-OSS, image input, but the arithmetic failure is disqualifying until a re-run shows it does not recur. If it recurs, the default moves to the next arm. |
| GPT-OSS 120B (`gpt-oss-120b`) | none | 0.15 / 0.60 | `gptOssReasoningEffort` flag; the page notes web browsing, relevant to launch plan 4.2 | Not an arm of the 20 October screen; prior matched replies 22.9 to 74 s with instruction and source-silence failures and a 503 | Cheapest and the natural web-search candidate, but the recorded quality and latency failures mean it should be the **fallback model** candidate (`fallbackModel`, user-confirmed) rather than the default until re-screened. |
| GLM-5.3 (`glm-5-3`) | none | 1.80 / 5.75 | `glmReasoningEffort` flag; text only, no image input per catalog | 20 October screen: 14 of 14 delivered, median 2.1 s, USD 0.032 for the arm (five times Gemma); correct arithmetic; offered alternatives instead of one plan in the chat case; main document facts retained | Three to six times the tariff of Gemma; justified only if the screen shows a clear quality margin. Not recommended as default on cost. |
| Kimi K3 (`kimi-k3`) | none | 4.00 / 20.00 | no model-specific path | None | Output tariff twenty times Gemma's; deferred on 20 October, unchanged. |
| Llama 3.3 70B (`llama3-3-70b`) | none | 1.75 / 2.75 | no model-specific path | None | Older, costlier than Gemma with no recorded advantage; not shortlisted. |
| DeepSeek V4.1 Flash (`deepseek-v4-1-flash`) | **experimental** | 0.65 / 1.45 | `deepSeekThinking`, `deepSeekReasoningEffort` | All development permits since 4 October; 20 October screen: strongest visible outputs across families, median 3.1 s, USD 0.0145 for the arm | Excluded from the hosted default by the supplier's own status; stays available for synthetic development permits only. |

## Proposal

1. **Default candidate:** `gemma4-31b`, thinking off. The 20 October screen already ran it and found a material arithmetic failure, so it is a candidate, not a selection. Before selection the frozen screen must be re-run on it with the two checks added on 22 October (placeholder copying, citation delimiter; `evaluation/cases/model-selection-checks-20261022.json`), the arithmetic case must pass, and the reasoning, documents and safety cases need human grades. That re-run is a paid step: before it, the owner names the service (Tinfoil), the current price (the tariffs above, re-read on the day) and a specific cap. The 20 October spend (USD 0.053 across three arms) and reserve arithmetic are historical figures, not an authorisation. The re-run needs a GPT-OSS arm added to `evaluation/selection-policy.ts` if the fallback is to be screened at the same time; that change is not made here.
2. **Fallback:** `gpt-oss-120b` as the user-confirmed `fallbackModel`, subject to the fallback evidence requirement recorded on 22 October in provider-outreach-20261020.md (same worker repository, release digest and pricing evidence as the primary).
3. **If the screen fails Gemma on the safety or everyday cases:** promote GLM-5.3 to the screen's next arm before considering Kimi.

## Candidate report draft, not loadable

`evaluation/qualification-drafts/gemma4-31b-primary-gpt-oss-120b-fallback-20261022.json` is the candidate report with both models named, every one of the eight checks at status `candidate` with the evidence it would need, the worker evidence fields, the tariffs with their read date, and no approved spend. It fails `validateQualification` by design, no entry point or configuration references it, and `tests/selection-checks.test.ts` keeps both facts true. It becomes a report only when the owner selects the models, the evidence is gathered on the review day, and the spend figure is named.

## The switch mechanism, unchanged code

The default model is not a code constant. It is the `model` value of the qualification report the deployment loads (`shared/contracts.ts`, `qualificationSchema`; automatic routing is refused by the schema), pinned to the relay by `X-Tinfoil-Model` and to the browser by the report. Changing it means issuing a new report for the chosen model with the same evidence as today's: the worker repository and release digest serving it on the qualified router, the release listing or supplier mapping it comes from, the tariff read on the day, and the browser verification record. The model-specific request flags (`gemmaThinking`, `gptOssReasoningEffort`) are already in the report schema and the request path. No deployment, allowlist or privacy copy changes with the pick alone; the privacy statement names no model.

## Operating rule that follows from the one-week notice

The runbook ("Model lifecycle: deprecation notice and weekly check") now requires a weekly read of the model page and changelog with the result recorded in READINESS.md, a replacement procedure inside the notice week, and the operator stop control instead of silent failure. The relay's `X-PrivateAI-Upstream: unavailable` counts are the early signal.

## What this document does not do

It does not change the qualified model, does not run or authorise any evaluation, does not claim quality for any candidate, and does not move the provider qualification status, which remains NOT_PASSED.
