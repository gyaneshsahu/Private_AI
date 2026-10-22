# Final consolidated supplier drafts — 20 October 2026

Status: OWNER_REPORTED_SENT / AWAITING_REPLIES since the 20 October owner report; see "Owner update — 21 October" below. Historical: the 19 October Tinfoil draft was not sent, and these drafts superseded earlier unsent drafts. Preserve prior replies as evidence. Sending does not establish contact permission, account change, contract acceptance or provider qualification.

From: the founder's chosen CometRow mailbox (exact address/readiness not confirmed). PrivateAI is the product; CometRow is the intended email/domain identity, not an asserted incorporated company. Use the existing supplier conversations where possible. A new sender may require account-ownership verification: offer to confirm through the original account email, never include keys/passwords. No invented traffic forecast, incorporation, discovery channel or compliance certification.

## Owner update — 21 October

Owner statements on 21 October, recorded as reported and not independently verified:

- **Tinfoil.** The consolidated email was sent to Sacha. The owner pasted the sent version in chat; it is shorter than Draft 1 below and is preserved verbatim under "Owner-supplied sent Tinfoil text". Send date and recipient address are as reported. No reply has been received. Owner decision: wait until **23 October**; if no reply arrives, select a solution under the decision sequence in [provider-qualification.md](provider-qualification.md).
- **Brave.** The owner replied to ticket 390102 on 8 October and sent follow-ups, including Draft 2. Each Brave response was the automated acknowledgement or a repeat of the 7 October discovery-channel question; no substantive answer has been received. The owner does not expect one. The outgoing texts and whether the two discovery questions were answered inside the thread are not recorded here. See [search-provider-comparison.md](search-provider-comparison.md), 21 October entry, for the resulting recommendation.
- A public-documentation re-check of the five Tinfoil questions is recorded in [provider-qualification.md](provider-qualification.md), 21 October entry: four of the five are answered by the supplier's own publications as not available today; question 4 is contractual and belongs with legal@tinfoil.sh and contact@tinfoil.sh.

### Owner-supplied sent Tinfoil text

Pasted by the owner on 21 October as the email sent to Sacha. Reproduced for the evidence ledger only.

> Hi Sacha,
>
> Thank you for your previous technical answers. We are evaluating Tinfoil as an inference provider for PrivateAI and would like to understand the production and enterprise arrangements available for our architecture. Please involve the appropriate engineering and commercial contacts if needed.
>
> Our browser encrypts prompts and responses for confidential inference; our application backend relays encrypted traffic and must not receive plaintext chat. We have recorded your explanations of worker admission, current JavaScript-verifier limitations, volatile KV caching and soft account limits. The remaining decisions are:
>
> 1. Production verification: Is there a released, supported browser implementation that verifies or securely delegates verification of the admitted router, worker and GPU, including freshness, revocation, rollback protection, minimum security versions and TDX where applicable? Please identify the exact package and deployment versions, a working example, accepted evidence age and fail-closed behavior. If this is unavailable, what supported architecture preserves browser-to-enclave encryption while providing those checks?
> 2. Enforced retention: Is cache disablement or a maximum cache lifetime now enforceable, including under an enterprise or dedicated deployment? Please distinguish enforced deletion from cache isolation and expected eviction. What content and diagnostic handling applies outside the enclave?
> 3. Enforceable usage and accounting: Can Tinfoil enforce allowed models, output limits and per-request or per-user monetary limits for encrypted requests, including concurrent requests? What authenticated, request-linked usage record can our backend retrieve without seeing content after completion, disconnection, cancellation or an uncertain result? Please distinguish hard controls from soft dashboard limits and explain duplicate-request handling.
> 4. Data-processing terms: Which retention periods apply to identifiable request IDs, timestamps, IPs, model and token usage, account/key linkage, security logs and billing records? Your earlier 90-day answer appears to span categories with different periods in the published policy. Please include backup exceptions, processing locations, subprocessors and the applicable DPA and transfer terms.
> 5. Supported production service: DeepSeek V4.1 Flash is a development candidate, but is listed as experimental. Which suitable models have production availability, version/deprecation commitments, rate and concurrency limits, support or SLA options, and enterprise pricing or minimum commitments? For the relevant deployments, which tool-calling, streaming and structured-argument constraints are actually enforced, and are unsupported schema constraints rejected?
>
> Please identify what is available now, what requires a different plan or deployment, and what is still planned. A technical and commercial discussion would be useful if that is the most efficient way to resolve these points. This inquiry does not authorize an account, billing or deployment change.
>
> Best regards,
> Gyanesh Sahu
> PrivateAI · CometRow

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

## Short re-routed follow-ups — prepared 21 October, DRAFT / NOT_SENT

Owner decides whether to send any of these, and when relative to the 23 October deadline. They do not repeat questions the public documentation already answers (see provider-qualification.md, 21 October). No account, billing or plan change is authorized by sending them.

### Draft 3 — Tinfoil engineering thread (reply inside Sacha's existing conversation)

Hi Sacha,

Following my last message: I do not need the documented answers repeated. Could we have a 30-minute call with one person from engineering and one who handles commercial terms? I can walk through our relay design and the exact checks we need before admitting private data. Any slot this week or next works for me.

Thanks,
Gyanesh Sahu
Founder, PrivateAI | CometRow
Germany — operating as an individual

### Draft 4 — Tinfoil legal (To: legal@tinfoil.sh, CC: contact@tinfoil.sh)

Subject: PrivateAI / CometRow — DPA applicability and retention mapping for API use from Germany

Hello,

I am the founder of PrivateAI (app.cometrow.com), an individual based in Germany, evaluating the Tinfoil API for a consumer assistant. Three questions on the privacy policy effective 12 October and the published DPA:

1. Please map request IDs, timestamps, IP addresses, model and token counts, and key/account linkage to the retention categories in section 9 of the privacy policy, including backup exceptions. An earlier engineering answer gave 90 days, which seems to span categories with different periods.
2. Can an individual founder in Germany contract commercial API use under the DPA with standard contractual clauses? Please identify the processing locations and subprocessors involved and the incident-notification terms.
3. How does the DPA's incidental special-category provision apply to a general assistant where users may discuss personal matters? We do not offer a healthcare service.

This is a clarification request only and does not authorize any account or billing change.

Best regards,
Gyanesh Sahu
Founder, PrivateAI | CometRow
Germany — operating as an individual

### Draft 5 — Tinfoil commercial (To: contact@tinfoil.sh)

Subject: PrivateAI / CometRow — production model and plan questions

Hello,

We are building a browser-encrypted assistant on the Tinfoil API through our own relay, which never sees plaintext. Before committing to a plan:

1. Which chat models have production status with a version and deprecation commitment? DeepSeek V4.1 Flash is our development default but is listed as experimental, and the changelog shows models removed within weeks of being added.
2. What rate and concurrency limits apply at our tier, and what support or SLA options exist?
3. Does an enterprise plan add enforced spending ceilings, cache lifetime controls or a supported browser verification route? What is the minimum commitment and pricing?

A short call would be welcome if that is faster. This does not authorize any account, billing or plan change.

Best regards,
Gyanesh Sahu
Founder, PrivateAI | CometRow
Germany — operating as an individual

## Evidence and review notes (not part of either email)

- Prior Tinfoil original: owner-supplied attachment36e2b56b-21fd-4a70-91f1-609fc25b40c0/Pasted text.txt,7October2026. Follow-up receipt15October preserved in provider-qualification.md; original send date unknown.
- [Tinfoil privacy policy](https://tinfoil.sh/privacy), effective12October; [DPA](https://tinfoil.sh/terms/dpa), published12October. Already contains no-training and incidental-special-category provisions; ask applicability, not whether a DPA exists.
- [Brave contact/retention FAQ](https://api-dashboard.search.brave.com/documentation/resources/help-feedback): support and commercial addresses; storage restriction and publisher-rights boundary.
- [Brave privacy notice](https://api-dashboard.search.brave.com/documentation/resources/privacy-notice), updated25August2026: query retention and DPA exclusion; [pricing](https://api-dashboard.search.brave.com/documentation/pricing): public Search/LLM Context offer, not verification of this account's terms.
- Code checked: server/research.ts Web/LLM Context selection, source metadata and local results disabled for Context; src/verified-chat.ts explicit per-request cache secret; shared/contracts.ts qualification gate. Temporary-memory handling is our current application policy, not a Brave contractual approval or a promise about browser/device internals.
- Provider replies do not automatically authorize private-data admission, saved research, live subscriptions or launch. Owner review/send and subsequent engineering validation remain separate.

## Owner-reported send and receipt dates — recorded 22 October 2026

All dates and times in this subsection are **owner-reported** on 22 October and not independently verified by the agent; no mailbox, header or supplier system was inspected. Where the qualification ledger recorded a different date, both are kept: the ledger dates are the days the agent was shown the text, not send or receipt times.

| Thread | Owner-reported event | Ledger note |
| --- | --- | --- |
| Brave, ticket 390102 | Owner replied to Sherrell Bullock's 7 October message on **8 October**, with later follow-ups including the 20 October consolidated text (Draft 2). Every Brave response was the automated acknowledgement or the repeated discovery-channel question; no substantive reply. | Matches the 21 October owner update above. Outgoing texts are not recorded. Brave is treated as unresponsive (search-provider-comparison, 21 October). |
| Tinfoil, Sacha | Follow-up sent **12 October**; reply received **13 October 02:34** (owner's clock). | provider-qualification.md recorded the reply under "Supplier reply received — 15 October 2026" because the owner supplied it on 15 October with "original email timestamp/headers not supplied". The 13 October 02:34 time is the owner's later statement; the 15 October ledger heading is unchanged. |
| Tinfoil, Sacha | Consolidated email (the "Owner-supplied sent Tinfoil text" above) sent **20 October 01:29**; **unanswered** as of 22 October. | The 21 October update says "sent" without a time; the time is added here as owner-reported. Owner waits until 23 October (launch plan 8.1). |
| Tinfoil, mailing list | A Tinfoil mailing received on **22 October** stating that catalog models can be swapped or deprecated at any time. **Not a reply** to any question above; a bulk mailing to customers. | Recorded in READINESS "Qualified fallback model" 22 October as the background for plan item 1.3. It answers no part of questions 1–5 and does not move the 23 October deadline. |

### Fallback-model evidence requirement — recorded 22 October

Plan item 1.3 added an optional `fallbackModel` to the qualification report (READINESS, 22 October). Before any second model may be named in the report, it needs the **same** evidence as the primary, not a subset:

1. The worker repository and release digest(s) serving that model on the qualified router, obtained the same way as for the primary (admitted-worker inspection or supplier-stated mapping, recorded with its source and date).
2. Release evidence for that worker: the exact release identifiers and measurements, with the GitHub release listing or supplier reply they come from.
3. GPU admission evidence for that worker's deployment, to the same standard applied to the primary (router appraisal of GPU boot and attestation predicate type; see provider-chain-review.md).
4. The same negative checks (wrong digest refused, rejection classified, no plaintext on the wire) run against the fallback name.
5. Its own catalog status, price and deprecation exposure recorded; an "experimental" label disqualifies it as a fallback for the same reason it disqualifies the primary from release default.

A model name copied from the catalog, a price page or the 22 October mailing is not evidence. Until these five items exist for a candidate, `fallbackModel` stays absent from every report; naming one is an owner decision recorded in READINESS with the evidence linked. No supplier question is added by this requirement; the existing consolidated queue stands.
