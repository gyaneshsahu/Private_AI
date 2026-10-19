# Final consolidated supplier drafts — 20 October 2026

Status: DRAFT_FOR_OWNER_REVIEW / NOT_SENT. Owner explicitly confirms the19October Tinfoil draft was not sent. These drafts supersede earlier unsent drafts; preserve prior replies as evidence. No contact, account change, contract acceptance or provider qualification is authorized by preparation.

From: the founder's chosen CometRow mailbox (exact address/readiness not confirmed). PrivateAI is the product; CometRow is the intended email/domain identity, not an asserted incorporated company. Use the existing supplier conversations where possible. A new sender may require account-ownership verification: offer to confirm through the original account email, never include keys/passwords. No invented traffic forecast, incorporation, discovery channel or compliance certification.

## Already answered / do not ask again

| Provider/evidence | Answer already supplied | What remains open |
| --- | --- | --- |
| Tinfoil, Sacha,7October email supplied by owner | Router model/repository mapping is measured; worker releases and GPU boot appraisal described; admitted-worker endpoint and CLI audit route provided | Current supported model/deployment/browser verification, not another generic explanation or CLI audit |
| Tinfoil, same reply | JS verifies SNP/signatures/measurement/key binding but not freshness witnesses, AMD CRL, minimum releases or TDX; Go/Swift/CLI have more checks | Released browser implementation and enforcement evidence |
| Tinfoil, same reply and follow-up received15October (send timestamp unknown) | KV cache is volatile enclave GPU memory, no fixedTTL; per-request cache secret does not delete it; disable/max-retention control not available at reply time | Whether an enforceable control has shipped; otherwise a supported solution/explicit limitation |
| Tinfoil,7October | No API moderation; router logs billing metadata, not content; optional external tools separate; particular Gemma/GPTOSS egress explained | Current selected deployment evidence and applicable production obligations, not a new generic no-training/moderation questionnaire |
| Tinfoil,7October | Account/key limits soft; in-flight requests can overshoot; generated output on disconnected streams billable; pre-response failures/model-rejected4xx/5xx not billed; reasoning included in output; usage metrics header/trailer available | Hard multi-tenant limits, authenticated settlement accessible behind opaque relay, correlation/idempotency and failure finality |
| Tinfoil, follow-up received15October | Most billing-related metadata said to be90days | Field-level mapping to policy categories; policy has different usage/billing/security retention periods |
| Brave, Sherrell Bullock,7October08:46PDT, ticket390102 | Asked discovery channel and tools/frameworks; no substantive rights/privacy/plan approval in supplied reply | Permission, applicable account terms, privacy and production commercial questions. Founder reports replying, but that outgoing text/discovery channel is not supplied |
| Brave public guidance, checked20October | Search includes LLM Context; public pricing lists$5/1000 with$5monthly credits; retention requires contacting supplier; publisher rights separate; query logs up to90days and enterprise ZDR; query data excluded from DPA | Account-specific entitlement and written permissions/privacy coverage; public pages are not a negotiated grant |

## Draft 1 — Tinfoil

To: sacha@tinfoil.sh (verified from the supplied7October reply). Optional CC: privacy@tinfoil.sh for contractual/data-processing questions. Reply in the existing conversation if possible.
Subject: PrivateAI / CometRow — remaining production verification, retention and usage requirements

Hi Sacha,

Thank you for your detailed replies. I am developing PrivateAI, a general-purpose assistant intended for app.cometrow.com. I am its founder, based in Germany, currently operating as an individual; I may incorporate later. I am writing from my CometRow address to consolidate the remaining production questions.

Our browser encrypts prompts and responses to the inference enclave. Our backend handles authentication and relays encrypted traffic, but must never receive plaintext chat. We are testing synthetic/public inputs only and have not approved private-data use or public launch.

We have recorded your explanations of router/worker mapping and GPU admission, browser-verifier limitations, volatile KV caching without a fixedTTL, API logging/moderation, soft spending limits, interrupted-stream billing and usage-metrics headers/trailers. We are not asking you to repeat those answers. The remaining decisions are:

1. **Released browser path.** Our pinned JavaScript SDK/verifier is1.2.2. Has a supported browser release now added freshness, revocation/rollback protection and TDX? Please identify exact versions and a working example, including how the browser verifies or cryptographically trusts the current worker/GPU deployment behind the router, accepted evidence age and fail-closed behavior. If unavailable, please identify the supported alternative that preserves browser-to-enclave encryption; a periodic CLI audit cannot replace these runtime checks.

2. **Enforced cache retention.** Your last answer said cache disablement or a maximum lifetime was not yet available. Has that changed? If not, is there a supported deployment offering either control? We understand cache isolation, eviction estimates and restart loss do not establish an enforced deletion deadline.

3. **Hard usage controls and settlement.** We understand current account/key caps are soft. For a subscription product whose relay cannot inspect encrypted model/output settings, can Tinfoil enforce allowed models, output limits and per-request or per-user monetary ceilings? What authenticated backend-readable usage record can we reconcile, correlated by requestID, including disconnects, cancellations, duplicate submissions and unknown outcomes? Please clarify finality, retrieval after a lost stream, and whether the existing metrics headers/trailers suffice. If an attested control service or different plan is necessary, please describe it.

4. **Metadata and EU contracting.** Please map request IDs, timestamps, model/token counts, key/account linkage and IPs to the retention categories in privacy-policy section9, including backups and exceptions. This would reconcile your90-day statement with the separate usage/accounting categories. Can I contract for commercial API use as an individual founder in Germany, with the applicable DPA/SCCs? Please identify processing locations, relevant subprocessors, incident-notification terms, and how the DPA's incidental-special-category provision applies to a general assistant where users may discuss personal matters. We are not offering a healthcare service.

5. **Production model and API support.** DeepSeek V4.1 Flash low is our provisional development default, but its catalog status is experimental. Is there a production-supported deployment with a version/deprecation policy, published rate/concurrency limits, support/SLA options and startup pricing/minimum commitments? Please also link the supported tools+streaming/structured-argument matrix for the exact deployment, including unsupported-schema behavior. We will evaluate any suggested replacement rather than assume equivalent quality or privacy.

Please separate what is available now from planned work and point to the controlling documentation or contract terms. This is a clarification request, not approval to change our account, limits, billing or plan.

Best,
Gyanesh Sahu
Founder, PrivateAI | CometRow
Germany — operating as an individual
Intended application: https://app.cometrow.com

## Draft 2 — Brave

To: searchapi-support@brave.com. CC: api-sales@brave.com for storage/ZDR/custom-plan terms. Keep ticket390102 in the subject or reply to its existing thread; no need to start parallel requests. privacy@brave.com is the published privacy contact if support needs to involve them.
Subject: Re:390102 — PrivateAI / CometRow: search synthesis, storage rights and production terms

Hello Sherrell and Search API team,

Following your question about our integration, I am developing PrivateAI, a general-purpose assistant intended for app.cometrow.com. I am its founder in Germany, currently operating as an individual; I may incorporate later. I am writing from my CometRow address about the existing ticket390102.

We use our own React/TypeScript frontend and Node.js backend with Brave's REST API, rather than an agent framework. We have tested Web Search and LLM Context. Users approve the displayed query before our backend sends it; we do not automatically send uploaded documents or full chat history to Brave. Selected results are supplied to Tinfoil-hosted inference for an answer with source links. Current tests use synthetic/public queries only.

Our temporary research workflow keeps retrieved content and derived answers in session memory, excludes them from application saved history, logs, caches and exports, and allows explicit user-initiated Copy answer. Saved research remains disabled. We do not train models on Brave results or build a search index.

Your earlier reply asked about discovery/integration; we have not received a substantive rights/privacy determination in the correspondence available to us. We have read the public storage restriction, Search/LLM Context pricing and privacy notice. Please clarify the following for our account and intended commercial product:

1. **Temporary synthesis and copying.** Which terms permit displaying results and short attributed excerpts, passing selected results to our third-party inference provider, and retaining them only in memory during a multi-turn session? Is explicit Copy answer permitted, including short quotations/citations? Please distinguish a generated paraphrase from raw returned content and specify attribution/display obligations and any session-duration limit.

2. **Optional saved history.** What permission/plan is needed to save generated answers, citation URLs/titles and short excerpts in user-controlled encrypted browser history or encrypted backup exports, then reopen them later? Please distinguish those items and state retention/deletion requirements, rights after subscription termination, and whether non-public evaluation records may preserve limited outputs. We are not requesting rights to archive or redistribute entire pages and understand publisher rights remain separate. If storage is unavailable, please confirm the permitted temporary-only workflow independently.

3. **Query privacy.** We understand the standard notice allows up to90days for query logs and excludes Search Query Data from the DPA. Queries could themselves contain personal information even without identifiers added by us. What contractual roles/protection apply then? Please identify query/result and security-log retention, training/service-improvement uses, processing locations/subprocessors and transfer safeguards. Is ZDR available for both Web Search and LLM Context to an early-stage individual founder, with what exceptions and minimum commitment?

4. **Account and production terms.** I understood my existing allowance as1,000 searches/month; the current public offer describes monthly credits. Please confirm our applicable plan, Web Search/LLM Context entitlement and commercial multi-user use, without changing it. For the recommended storage/privacy option, please quote minimum fees, request/token/extraction charges, overages, failed/cancelled-call billing, rate/concurrency limits, hard-cap behavior and production support/SLA terms. No traffic forecast or minimum-volume commitment is agreed yet.

Please provide one recommended low-volume starting arrangement and the applicable written terms, separating today's permissions from options requiring a new agreement. This request does not authorize a subscription, billing change or account migration. If my new sender address needs verification, I can confirm through the original account email; I will not email API credentials.

Best,
Gyanesh Sahu
Founder, PrivateAI | CometRow
Germany — operating as an individual
Intended application: https://app.cometrow.com

## Evidence and review notes (not part of either email)

- Prior Tinfoil original: owner-supplied attachment36e2b56b-21fd-4a70-91f1-609fc25b40c0/Pasted text.txt,7October2026. Follow-up receipt15October preserved in provider-qualification.md; original send date unknown.
- [Tinfoil privacy policy](https://tinfoil.sh/privacy), effective12October; [DPA](https://tinfoil.sh/terms/dpa), published12October. Already contains no-training and incidental-special-category provisions; ask applicability, not whether a DPA exists.
- [Brave contact/retention FAQ](https://api-dashboard.search.brave.com/documentation/resources/help-feedback): support and commercial addresses; storage restriction and publisher-rights boundary.
- [Brave privacy notice](https://api-dashboard.search.brave.com/documentation/resources/privacy-notice), updated25August2026: query retention and DPA exclusion; [pricing](https://api-dashboard.search.brave.com/documentation/pricing): public Search/LLM Context offer, not verification of this account's terms.
- Code checked: server/research.ts Web/LLM Context selection, source metadata and local results disabled for Context; src/verified-chat.ts explicit per-request cache secret; shared/contracts.ts qualification gate. Temporary-memory handling is our current application policy, not a Brave contractual approval or a promise about browser/device internals.
- Provider replies do not automatically authorize private-data admission, saved research, live subscriptions or launch. Owner review/send and subsequent engineering validation remain separate.
