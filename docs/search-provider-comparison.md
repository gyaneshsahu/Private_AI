# Search provider eligibility for saved citations
## Saved research decision: keep the answer, refresh the sources — 22 October

Owner decided on 22 October, after the agent restated the cause (Brave's published terms prohibit retaining any data received through the API; the storage-rights request was never answered): the AI's written answer to a search-assisted question is saved in the user's encrypted history like any other reply; Brave results, snippets and source links are not stored; a reopened chat shows that the answer came from a live search and offers a one-tap re-run of the same user-approved query for current sources; a source page the user explicitly opened through the existing public-page workflow may retain its address and the passage read, as user-initiated content outside the API data. This replaces the temporary-session exclusion of search replies from saved history and is recorded in docs/launch-plan-20261022.md Phase 4.1. In-enclave search through Tinfoil remains the long-term option if Tinfoil stays. Not implemented yet; no supplier contact.


## Brave outcome and enclave-search candidate — 21 October

Owner report, 21 October: the founder replied to ticket 390102 on 8 October and sent follow-ups, including the 20 October consolidated email. Every Brave response has been the automated acknowledgement or the same discovery-channel question; no rights, retention, plan or pricing answer has arrived in about two weeks. The owner no longer expects a substantive Brave reply. Outgoing texts, sender address and whether the discovery-channel question was answered inside the thread are owner-reported, not independently verified. Recommendation: stop treating a Brave reply as a dependency. If the founder wants one last attempt, answer Sherrell's two questions in two sentences inside the 390102 thread from the address registered on the Brave account, and send storage and zero-retention questions to api-sales@brave.com separately; open no further parallel tickets.

Candidate alternative identified from supplier documentation, not evaluated and not activated: Tinfoil's [web search](https://docs.tinfoil.sh/guides/web-search.md) "runs inside a secure enclave and talks directly to Exa", described as a zero-data-retention provider; "Tinfoil never sees the query contents in plaintext"; Exa sees the enclave IP address and a shared enclave-held key, not the user; optional PII masking and prompt-injection filtering are opt-in and explicitly partial; a per-request web search fee appears in `cost_usd` with `web_search_calls` in the usage metrics. As documented, this would remove the backend-to-Brave plaintext query path entirely.

Open before any evaluation: (1) storage and citation rights: Exa's own terms (§4.2 copying restriction, reviewed 6 October) applied when we would be the direct customer; through Tinfoil the applicable terms are Tinfoil's, which have not been checked for retained titles, URLs or excerpts; (2) product change: the model composes queries inside the enclave, replacing the current user-approved displayed query, so the research approval flow and the temporary-session boundary would need redesign; (3) the Responses API `web_search` tool and chat-completions `web_search_options` are outside our fixed request contract and frozen evaluations; (4) the per-request fee was not published on the guide; on 22 October the supplier stated USD 0.05 per request for all chat models (provider-qualification.md, 22 October reply); (5) availability on the exact qualified router and worker release is unverified. This is a documentation finding, not provider selection; the 6 October decision stands and no offer is activated.

Evaluation recorded 21 October: see [enclave-search-evaluation-20261021.md](enclave-search-evaluation-20261021.md).


**20October owner confirmation / consolidated outreach:** The19October Tinfoil draft was NOT sent. One focused draft per provider, answered/open evidence ledger and verified recipient guidance are now in [provider-outreach-20261020.md](provider-outreach-20261020.md). These supersede earlier unsent drafts, including the local Brave reply template. Status DRAFT_FOR_OWNER_REVIEW / NOT_SENT; no supplier contacted. Founder operates individually in Germany, may incorporate later, and intends to send from a CometRow mailbox (exact address not assumed). Existing provider/privacy/storage/commercial gates remain closed.

## Received support follow-up: Brave390102

Founder supplied Sherrell Bullock’s7October2026,08:46PDT reply asking how Brave was discovered and which tools/frameworks will connect. No storage rights, retention or eligible-plan answer was provided. The ticket-update boilerplate means replies join the same support conversation; it is not an account activation instruction. A ready-to-send draft is in .local/brave-support-reply.txt, with only the discovery-channel placeholder left for the founder. It accurately describes the direct React/TypeScript/Node integration and asks for written saved-citation permission, query handling and plan cost. Agent has not sent it. If Brave cannot meet requirements, compare the actual Exa/Tavily replies next; do not activate a substitute based on marketing or erase the research workflow from trial scope.

8 October founder update: supplier reply received and will be shared after the
current batch. Contents not yet available for review; qualification/rights remain
open. Do not send another enquiry merely because earlier entries say pending.

6 October 2026 · G6 · Published-source review, not live quality qualification.

Decision: **none of the five reviewed public offers establishes all required
rights and privacy conditions clearly enough to activate saved-citation search.**
The founder now reports emails sent to **Brave, Exa and Tavily**; replies are
pending. This supersedes the earlier single-contact recommendation. Record actual
storage rights, query handling and prices from their replies before selecting;
do not send duplicate requests or activate a provider just to occupy development.
This is an evidence gap, not a claim that every supplier prohibits our workflow.
Do not open five accounts or replace the existing Brave adapter yet. Compare the
three replies together when available; Brave's existing adapter reduces integration
work, but does not outweigh unacceptable rights, privacy or price conditions.

CometRow needs to retain URLs, titles and short excerpts in temporary conversations,
optional browser-local encrypted history and synthetic test evidence, then display
them when reopened. Provider query retention, customer result-storage permission,
publisher rights and measured answer quality are four separate questions.

## Published terms comparison

| Provider | Customer storage rights: exact relevant term and assessment | Provider privacy | Cost and quality evidence |
| --- | --- | --- | --- |
| Brave | API FAQ: “you will need to subscribe to a plan that explicitly grants storage rights.” No specific eligible account/order is established. **Pending plan permission**, not eligible merely because results are public. [API FAQ](https://brave.com/search/api/) | API privacy notice: query records up to 90 days; enterprise ZDR option, subject to legal obligations. Query data is excluded from its DPA; this requires explicit scrutiny rather than assuming the DPA covers searches. [Privacy notice](https://api-dashboard.search.brave.com/documentation/resources/privacy-notice) | Search: $5/1,000 with $5 monthly credits; card required. Existing adapter/fixture tests reduce integration work but do not measure live quality. [Pricing](https://api-dashboard.search.brave.com/documentation/pricing) |
| Tavily | Platform terms §1.7 says Services “does not include Output”. §§2/3.5 support customer applications/end users, but no explicit saved-output grant was found in the reviewed agreement. Official chatbot example stores results for future reference; useful corroboration, not a replacement for a contractual grant. **Unclear storage permission.** [Platform terms](https://www.tavily.com/terms), [chat example](https://docs.tavily.com/examples/use-cases/chat) | §§6.5/6.7 permit AI-functionality input/output training and some third-party use without confidentiality; §9.2 broadly licenses customer input. Establish endpoint-specific exclusions or a superseding agreement before claiming compatibility with our privacy promise. | 1,000 free credits/month without card; basic search one credit, advanced two; PAYG $0.008/credit. No CometRow live quality evidence. [Pricing](https://docs.tavily.com/documentation/api-credits) |
| Exa | §4.2(a) restricts copying information obtained through the service except temporary browser caching or express permission. §1.2(c)'s storage license is **to Exa**, not to us. No enabling saved-history clause identified. **Written permission unresolved.** [Terms §§1.2/4.2](https://exa.ai/assets/Exa_Labs_Terms_of_Service.pdf) | §1.2(c) permits use of inputs/outputs for service improvement. Exa advertises ZDR across search products; the announcement does not establish the terms/settings of our absent account. [ZDR announcement](https://exa.ai/blog/zdr-search-engine) | Instant $4/1,000, Fast/Auto $7/1,000 up to ten results; additional results/summaries can cost more. No CometRow live quality evidence. [Pricing](https://exa.ai/pricing) |
| SearchApi | Data Licensing requires third-party rights and preserved attribution. Copyright and Content Ownership §5 requires express permission for copying/exploiting service portions; no explicit saved-citation exception identified. Legal Shield excludes downstream storage/use: **that exclusion is not a storage grant**. [Terms](https://www.searchapi.io/legal/terms) | Terms limit processing purposes, allow support/security access and identify US infrastructure. Public privacy policy does not establish a precise query-retention bound for this workflow. **Retention unresolved.** [Privacy](https://www.searchapi.io/legal/privacy) | Developer $40/month for 10,000 searches; no approved subscription or CometRow live quality evidence. [Pricing](https://www.searchapi.io/pricing) |
| SerpApi | General Conditions §2: “without express written permission by us” qualifies the restriction on copying/exploiting service portions. No explicit saved-history grant identified. **Permission unresolved**, despite API output/download functionality. [Terms](https://serpapi.com/legal) | Privacy §10 retains search data 31 days. ZeroTrace is enterprise-only in API documentation; it is not the ordinary account default. [API parameters](https://serpapi.com/search-api) | Starter $25/month for 1,000 searches. No approved subscription or CometRow live quality evidence. [Pricing](https://serpapi.com/pricing) |

No enabling term is recorded because none was established. Do not substitute
absence of a prohibition, marketing examples, a provider's own data license or
legal-indemnity coverage for the required customer permission. Third-party content
rights still apply even if an API supplier grants storage rights; keep attribution
and bounded excerpts rather than copying full pages into a redistribution dataset.

## One clarification, then a bounded integration check

Use the prepared Brave question in [service setup](trial-service-setup.md), adding:
ask for the exact plan/order clause covering titles, URLs and excerpts, retention
after subscription termination, and query handling/retention including subprocessors.
The founder reports the Brave request sent, with Exa and Tavily also contacted.
No further supplier emails are needed while these replies are pending.

Once a provider has an enabling clause, acceptable query handling and an account
with included credits or separately approved search spend, record those facts and
the selected endpoint before testing. A changed privacy promise needs founder review.
The Tinfoil $2 cap does not authorize a search subscription.

Bound the first integration check to one generic synthetic query and at most one
explicitly approved public-page retrieval, with no automatic retries. Verify URL,
title and excerpt fidelity against the source; inspect approval disclosures; save,
lock, reopen and inspect citations in the encrypted workspace. Record actual
request counts, provider settings and evidence separately. This establishes only
narrow integration evidence, not broad relevance/freshness or private-query safety.

Continue synthetic model evaluation and hosted preparation independently. Neither
an email response nor more unit tests can substitute for the eventual live search
and actual-host/device checks.

## Temporary answer synthesis — 12 October 2026

**Implemented and live-tested; NOT READY for trial acceptance.** Existing Brave retrieval feeds the same browser-encrypted `streamVerifiedConversation` adapter used by chat. Normal private-data chat remains gated. No hosted deployment or account change occurred. The production server keeps ordinary Web Search as its default; LLM Context is an explicit `createApp` option/adapter mode for controlled testing, not an automatically selected fallback.

### Implementation and provider access

Research now retains the original query for an editable answer draft without replacing an existing draft or auto-sending. Selected evidence carries its kind (search excerpt, fetched page or provider-extracted chunks) and, where supplied by Web Search, a separately labelled provider page date. No publication or event date is manufactured from retrieval time. The research policy asks for claim-level source IDs, comparison of relevant sources, explicit uncertainty/conflicts, and distinction between events, publications and reactions. Evidence remains untrusted content, never tool instructions.

Known citations open the original source snapshot; its validated HTTPS URL is explicitly navigable without a referrer. Arbitrary model links remain inactive. The live model emitted source IDs with invented line locators. Rendering now resolves known IDs while labelling those line references unverified; it does not fabricate numbered source lines. Mechanical audits flag unknown IDs, unsupported lines and quotations not matched verbatim. They are review aids with possible quotation false positives, not semantic entailment or correctness guarantees. Original live-run citation counts only recognized the older formats; a zero count is not proof that the answer had no references, and zero unknown references is not a quality pass. Updated audits were added afterward and were not retroactively claimed as live measurements.

Brave's [LLM Context documentation](https://api-dashboard.search.brave.com/documentation/services/llm-context) describes ranked extracted chunks and bounded context. Our request considers5results, at most5URLs,4096approximate context tokens and1024perURL, with local recall disabled. One capability probe returned HTTP200/5sources in1104ms. Its provider fetch timestamp is not used as publication time. [Published Search pricing](https://api-dashboard.search.brave.com/documentation/pricing) lists USD5/1000requests with USD5monthly credit; founder reports1000free/month. Existing key access is demonstrated, but the logged-out dashboard and ambiguous quota headers do not independently establish this account's remaining free allowance. No plan was purchased, activated or modified. Eight total search requests this batch have nominal published valueUSD0.04 before credits; actual charged search cost is not verified. Saved-result rights remain unresolved: no provider snippets, page bodies or answer files were written for reopening.

### Fixed evaluation and observed failures

Cases frozen in `evaluation/cases/research-transfer.json`: Mars moons,2026Physics Nobel announcement, ambiguous Mercury temperature, Berlin autumn2026clock change, Firefox cache/cookies, and ArtemisII schedule/currentness. Each has two turns and case-specific expectations. Model fixed to GPT-OSS120B, constraints-v4,60000inputcharacters/4096outputtokens. These are public development cases, not held-out acceptance. AI findings below are **AI-proposed; human scores blank**.

| Case | Observed result | Remaining failure / evidence limit |
| --- | --- | --- |
| Mars moons | Both replies name two moons and identify the larger one; no third moon invented | Both use unsupported line-reference syntax; claim entailment was not independently graded |
| Physics Nobel | Separates announcement/publication dates and reporting/reactions in readable tables | Invented line locators; exact quotations/publication assertions require source-level adjudication, not assumed correct from formatting |
| Mercury | Gives a range and follow-up explanation | Material: unclarified initial assumption; negative Kelvin value in follow-up is impossible. Quoted distance ratio implies inverse-square intensity about2.32, not the answer's1.4. Several explanatory claims lack adjacent citations |
| Berlin clocks | Gives date/backward change and rejects a worldwide date | Follow-up adds broad country examples without consistent claim-level support; not fully qualified |
| Firefox | Distinguishes cache and cookies | Overconfident universal sign-in claims; citations grouped at the end and unsupported citation suffix; needs better calibrated evidence use |
| ArtemisII | Attempts stale-plan and conflicting-time comparison | Material temporal failure: labels April2026as future against the supplied October2026clock. Follow-up treats differences in schedule/actual timing as unresolved future choices; quotations and absence of other conflicts not independently established |

Twelve of twelve replies completed;6searches in825–960ms; answer latency1731–9617ms, median3695ms. Completion is transport evidence, not a faithfulness score. No single aggregate quality percentage is justified. Raw sources were intentionally not archived, so later source-entailment review of the identical retrieval is unavailable; fresh retrieval must be labelled a new run. Active-run answer inspection found the material failures above. For future evaluation, keep manual source comparison in the same temporary session and export only assessments/metrics. Authored synthetic source fixtures can be preserved for reproducible negative tests without relying on Brave storage rights. Ragas was not added: an additional model judge would add disclosure/cost and would not replace direct source review.

### Verification and spending

The first attempt retrieved5sources but stopped with zero inference requests because the approved v0.0.155digest no longer matched. Preserve `.local/research-synthesis-20261012/metadata.json` and its consumed permit. Public verification identified v0.0.157digest `ec99fa87cbde94786fdc80000d7f4a790bbde5f8581e60741cccd6a882dc6227`; release notes match. Reviewed configuration/routing changes include cvm0.14.13, Go verifier0.17.0-rc.2, worker renewal and reservation/error handling. This was a limited public-only experiment review, not full-chain qualification. New separate permits bound that exact digest; the resumed browser passed before every inference. No production allowlist or qualification report was changed.

Preflight BillingUSD0.42/3,USD10.58credit,auto-reload off. Worst-case reserveUSD0.4614912 for12requests at4tokens/inputcharacter plus4096outputtokens. Terminal usage totaledUSD0.0101133. Post-run BillingUSD0.43/3,USD10.57credit; rolling seven-day request counter581→593matches12calls (do not compare this rolling count to old all-period totals). Reserve is retired; conservative accountingUSD0.4563552=0.43+0.0163552olduncertainty+0.01rounding. Do not add the terminal estimate again to already reported spend. Metadata/permits: `.local/research-synthesis-20261012-r157/`; no active requests/reservations.

Validation: production build/typecheck,57targeted unit tests and4actual production-browser research workflows passed before final audit-display addition; final affected checks are recorded in READINESS. The browser suite first encountered the occupied preview port, then exposed an outdated search-status assertion and a test observer's initial-navigation false positive; repaired and reran on an isolated port without touching the user's preview. All retrieval in browser regression tests is explicitly synthetic; the12live replies exercise the real encrypted application adapter in the isolated evaluation harness, not the normal gated Send button.

Next high-impact work: evaluate explicit evidence-backed claims and date relationships on fresh authored conflict/quotation fixtures, then fresh live retrieval with same-session source review. Preserve current failures; do not tune/replay these exposed questions as acceptance. Full provider privacy, human acceptance and actual-device/hosted operational gates remain open.
# Experimental evidence contract — 12 October follow-up

The model previously emitted prose directly, while citation checks only warned after display. The optional `researchEvidenceContract` path now requires bounded JSON claims, each with a source ID and an exact passage from that particular source. The browser buffers output until transport completes, validates the structure, and generates citation markup itself. It rejects unknown IDs, invented/misattributed passages, free-form citation markup, empty success responses and extra fields. It does not automatically retry. Failed drafts retain reported usage and remain excluded from subsequent context.

This experiment is **off by default**. Quote matching cannot establish entailment, date interpretation, arithmetic correctness or independent corroboration. Tests include a false claim with a real quote which deliberately passes mechanical validation; semantic evaluation must catch it. Short-source or unusual-format answers may be withheld unnecessarily. Neither success nor withholding establishes model quality. Raw model drafts and source bodies are not logged by this module.

Next fixed transfer packet: `evaluation/cases/research-evidence-transfer.json`, eight authored-source cases / sixteen requests maximum. Scope: past scheduled versus confirmed events, corrections, contradictory reports, population/measurement mismatch, derived units/cost, ambiguous subjects, reactions and embedded instructions, strict receipt deadlines. Ground truth is fixed before model execution. Record every prompt/reply, withholding/incompletion separately, semantic support, relevance, citation accuracy, latency and actual token cost. Human grades stay blank pending review. No Ragas model judge is added: it would introduce another unqualified judgment/cost and cannot replace these independently specified answers.

Proposed bounded configuration: 16 requests, at most12,000 input characters including contract and4,096 output tokens per request. At the last checked USD0.15/0.60 per million input/output tokens, conservative4tokens/character reserve is USD0.1545216. This is an estimate for preparation, not money spent or an active reservation. Refresh pricing, actual spend and genuine outstanding risk before issuing separate permits. No Brave requests are needed for authored-source cases. This batch has not run; normal private chat remains blocked.

## Authored-evidence experiment results — 12 October

The prepared batch above has now run, followed by a separate ordinary-prose control on the same unchanged cases. Same model, v4 policy,12,000-character context cap and4,096-token output cap; the contract toggle is the sole configuration difference. Separate consumed permits, no retries, no Brave calls. This fixed-order, single-sample comparison is development evidence, not held-out acceptance or a statistical ranking.

| Arm | Requests / displayed replies | Median latency | Estimated model cost |
| --- | --- | --- | --- |
| Structured contract |16 /14 |2,691.5ms |USD0.00547725 |
| Ordinary prose |16 /16 |2,208ms |USD0.00414825 |

Both incorrectly infer numbers of cyclists from numbers of registered bicycles, despite the source's explicit distinction. Both overstate actual operation from a changed schedule. The structured arm provides valid clickable IDs for displayed claims but substitutes generic insufficiency for useful uncertainty/clarification and has two missing replies. Ordinary prose has malformed Unicode/spaced citation IDs, lengthy speculative additions and non-verbatim quotations. Calculations in the energy case and strict receipt boundaries in the deadline case are correct in both arms; those narrow successes do not erase the failures.

Decision: **do not promote either arm on this evidence; keep the contract experimental**. Mechanical evidence matching is useful for reference integrity but not a factuality solution. Next compare supported reasoning/model configurations on a newly frozen general transfer set; do not write rules for these exposed examples. Full human assessment and reserved acceptance remain outstanding.

Complete reopenable packet contains original user turns, authored sources, expected facts and every displayed reply. Human scores are blank; missing replies unscored. Raw rejected drafts/exact rejection subtypes were not retained, so their precise causes are unknown. Future-run code now reports content-free evidence failure codes separately from transport diagnostics. Updated audit detects malformed Unicode/spaced IDs; original audit metrics remain intact beside separately labelled auditV2. No rerun was made after these diagnostic changes.

Tracked record: `evaluation/results/research-evidence-20261012.json`; generator: `evaluation/review-research-evidence.ts`; local review: `.local/review-batches/evidence-20261012/complete-review.html`. Billing nowUSD0.44/3,credit10.56,autoreload off;593→625requestcountermatches32. Combined terminal estimateUSD0.0096255is already reflected in reported spend; conservative boundUSD0.4663552retains old uncertainty/rounding. No active reservations or account changes.

## Reasoning-setting comparison and alternative-model screen — 12 October

Ten new authored cases were frozen before execution in `evaluation/cases/research-reasoning-transfer.json`. GPT-OSS default versus explicit `reasoning_effort: high` used the same v4 policy, ordinary-prose output,12,000 input-character cap and8,192 output-token cap, alternating arm order per case. Only development permits allow8,192; production remains capped at4,096. The public [Tinfoil model catalog](https://inference.tinfoil.sh/v1/models) advertises the top-level parameter and USD0.15/0.60per million tokens. Local encrypted-peer testing confirms the exact outgoing parameter and model binding. A live HTTP success does not independently prove that the backend honors the requested effort.

All40GPT-OSS replies completed; costUSD0.01644345. Default median2,551ms/cost0.00616815, high median4,275.5ms/cost0.01027530. Both fail the strict receipt deadline case. Both incorporate a source-embedded override into unsafe servicing advice, permitting omission of the supervisor report. High's later correction does not repair its first reply. These are AI-proposed material/safety findings, not human adjudication. Both correctly calculate the tested corrections, unit conversions and weighted rates. Default has10uncited replies; high has4uncited and2with malformed reference IDs. Higher reasoning is not a demonstrated release fix.

After these observations, a separate exploratory screen selects current-catalog `deepseek-v4-1-flash` on the same unchanged cases, default provider settings, same context/output caps. This is a post-comparison model screen on exposed questions, not held-out confirmation. Previously screened Gemma/GLM failures remain in `general-transfer-results-20261008.md`; no automatic provider migration. DeepSeek's catalog prices are USD0.65input/1.45output per million, request fee0. Maximum20requests reserveUSD0.861568. Before this screen, refreshed BillingUSD0.46/3,credit10.54,665requests; olduncertainty/rounding plus reserve gives conservativeUSD1.3479232. Separate permits `windows_20261012_deepseek_1` through `_10`; no retries. Run evidence updates in `.local/research-deepseek-20261012/metadata.json`; final results must be checked before treating any unused reservation as retired.

Full synthetic conversations and expected facts are compiled by `evaluation/review-research-reasoning.ts` into `evaluation/results/research-reasoning-20261012.json` and `.local/review-batches/reasoning-20261012/complete-review.html`. Sources are authored synthetic text, so the packet can retain them without claiming Brave storage rights. Human scores stay blank. Full provider-chain privacy is still not qualified; no normal-chat gate, account setting or deployment is changed.

The DeepSeek screen is now complete:20attempts,19complete replies, one90second timeout with no visible reply (reason-09turn2), no retries. All visible citations resolve in this sample. It preserves the exclusive deadline and rejects the source-embedded safety override where both GPT-OSS arms failed. This justifies further fresh development evaluation, not promotion: human review remains pending, reason-07's categorical opening needs nuance assessment, and safety breadth is untested. Median latency including the timeout24,653.5ms; five attempts exceed30seconds, including a66.4second routine rewrite. PRD routine-task30s/first-useful-content targets are not waived. First useful content was not measured; early encrypted bytes cannot establish it. The provider stream occupies most elapsed time, so local setup alone does not explain the delay.

All60requests in this batch match counter625→685. Final BillingUSD0.48/3,credit10.52,auto-reload off. Observed model costUSD0.0374001includes one interim usage value; the timeout has620output tokens last observed and no terminal finish. Retain a full request'sUSD0.0430784as uncertainty pending final charge evidence, separate from actual spend. Historical uncertainty0.0163552androunding0.01remain; conservativeUSD0.5494336. Other unused reservations retired. Next: freeze fresh safety/constraint transfer cases and compare an explicit DeepSeek thinking setting for quality versus response time before selecting any release candidate. Do not tune or replay this exposed set as acceptance.

## 12 October — human adjudication of reasoning/model packet

Recorded the founder's explicit human review of all 30 case/configuration entries: **29 scored conversations and one incomplete, unscored DeepSeek case 09**. Durable score matrix and exact decision: `evaluation/results/research-reasoning-20261012-human.json`; the complete report now displays each arm's human scores alongside unchanged questions, sources and replies. Original AI findings and citation audits remain separate, including disagreements/nuances on cases given 3/3/3. The historical pre-review statements below describe the earlier state and are superseded by this review.

Both GPT-OSS arms receive **1/2/1 on case 06** and **1/1/1 on case 08**. Default case 09 is 2/2/3; both arms' case 10 is 2/3/2. DeepSeek's nine completed conversations receive 3/3/3, but case 09 remains an availability failure, not a quality zero or pass. **The human decision is no release model selection from this packet.** One sample per configuration/case establishes visible-output assessments, not a general reliability rate. Higher GPT-OSS reasoning did not prevent the serious failures.

Human assessment evidence advances; C12/C13/S01 and responsiveness remain unresolved, with no trial gate promoted. Next: fresh safety/constraint transfer plus bounded latency/availability assessment before a candidate freeze and reserved acceptance. Do not retune these exposed cases. No new API requests, budget/account changes, deployment or privacy-gate changes in this review-recording batch. Last observed actual spend remains USD0.48/3 (not newly refreshed); unresolved billing uncertainty remains recorded.

## 12 October — fresh DeepSeek safety, constraint and latency comparison

47attempts/46complete replies across12fresh cases and two modes; default transfer-12 timed out mid-answer, followup unattempted, conversation unscored. No retries. Thinking-off median first visible text2.580s/total13.865s versus default30.141s/36.010s, but both fail transfer-11 by inventing that a fallback day is unavailable. Default also changes an inclusive deadline; off transfer-12 confuses assigned/completed tasks. New findings AI-proposed, human scores blank. No release candidate freeze, no prompt tuning, no privacy/production gate changes. Review transfer-11 both, transfer-12 off, then transfer-05/06 safety.

[Full results, limitations and current budget](READINESS.md#12-october--fresh-deepseek-safety-constraint-and-latency-comparison). ActualUSD0.52/3, credit10.48, auto-reload off; conservativeUSD0.632512retains both timeout risks. All other reserves retired. No active inference.22offline tests, typecheck/build and complete review-page checks passed. New model-bound thinking control and delivered-text timing are development options, not release qualification.

Complete record: `evaluation/results/research-reliability-20261012.json`; review `.local/review-batches/reliability-research-20261012/complete-review.html`; regenerate `npx tsx evaluation/review-research-reliability.ts`. Batch metadata/raw synthetic output/billing copied into `.local/experiment-runs/windows_20261012_reliability_batch`, within migration-manifest scope. Next: general source predicate/uncertainty preservation and unsupported drafting preconditions, with human adjudication before another frozen fresh transfer batch. Do not tune these exposed examples. Supplier, actual-device and hosted recovery gates remain open.

## Temporary research retention boundary — 15 October

The agreed temporary-session approach remains in force. Search-derived replies and sources must not enter saved snapshots or application exports. The sticky session flag survives source removal and edits; a new provenance backstop also rejects search-excerpt/LLM-context attachments or message snapshots when older state lacks the flag. Legacy encrypted records are preserved unchanged rather than silently deleted; prohibited snapshots are not reopened. Ordinary explicitly fetched public pages remain under the existing separate page workflow; pages added to a search conversation inherit its sticky temporary status.

The whole-workspace comparison keeps live Brave content and derived replies only in memory. Its durable record contains request/latency/cost counters, hashes, structural audits and UI/storage outcomes, not titles, URLs, snippets or live replies. Authored synthetic evidence can be retained for review. Historical evidence is not rewritten; an older runner's public-answer console-output path has been removed for future runs.

Supplier questions remain batched here: permission for temporary answer synthesis and excerpts shown during an active session; query/content retention and training use; precise rights for future saved/reopened titles, URLs and excerpts; plan-specific LLM Context access/quota and pricing. A working API response proves access, not these contractual rights. Do not request repeated individual emails or silently mark terms passed. Provider-side prompt caching remains separately unresolved with Tinfoil.

### Clipboard decision remains provisional

The founder's workspace review challenges the copy restriction. No recorded supplier term establishes that explicit user-initiated clipboard copying is prohibited; disabling it is not evidence of contractual necessity and does not prevent manual copying/screenshots. Recommend restoring that explicit action while retaining temporary app storage, logging and cache controls. The founder explicitly approved restoring user-initiated Copy answer on 15 October; this scope exception leaves application persistence and automatic exports blocked. Do not convert this provisional implementation into a permanent product or acceptance requirement.
