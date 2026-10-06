# Search provider eligibility for saved citations

6 October 2026 · G6 · Published-source review, not live quality qualification.

Decision: **none of the five reviewed public offers establishes all required
rights and privacy conditions clearly enough to activate saved-citation search.**
The founder now reports emails sent to **Brave, Exa and Tavily**; replies are
pending. This supersedes the earlier single-contact recommendation. Record actual
storage rights, query handling and prices from their replies before selecting;
do not send duplicate requests or activate a provider just to occupy development.
This is an evidence gap, not a claim that every supplier prohibits our workflow.
Do not open five accounts or replace the existing Brave adapter yet. Seek one
targeted clarification from Brave first, because its storage-plan requirement is
explicit and our integration already exists. Reconsider Exa if Brave cannot offer
acceptable storage rights and query handling at an approved price.

PrivateAI needs to retain URLs, titles and short excerpts in temporary conversations,
optional browser-local encrypted history and synthetic test evidence, then display
them when reopened. Provider query retention, customer result-storage permission,
publisher rights and measured answer quality are four separate questions.

## Published terms comparison

| Provider | Customer storage rights: exact relevant term and assessment | Provider privacy | Cost and quality evidence |
| --- | --- | --- | --- |
| Brave | API FAQ: “you will need to subscribe to a plan that explicitly grants storage rights.” No specific eligible account/order is established. **Pending plan permission**, not eligible merely because results are public. [API FAQ](https://brave.com/search/api/) | API privacy notice: query records up to 90 days; enterprise ZDR option, subject to legal obligations. Query data is excluded from its DPA; this requires explicit scrutiny rather than assuming the DPA covers searches. [Privacy notice](https://api-dashboard.search.brave.com/documentation/resources/privacy-notice) | Search: $5/1,000 with $5 monthly credits; card required. Existing adapter/fixture tests reduce integration work but do not measure live quality. [Pricing](https://api-dashboard.search.brave.com/documentation/pricing) |
| Tavily | Platform terms §1.7 says Services “does not include Output”. §§2/3.5 support customer applications/end users, but no explicit saved-output grant was found in the reviewed agreement. Official chatbot example stores results for future reference; useful corroboration, not a replacement for a contractual grant. **Unclear storage permission.** [Platform terms](https://www.tavily.com/terms), [chat example](https://docs.tavily.com/examples/use-cases/chat) | §§6.5/6.7 permit AI-functionality input/output training and some third-party use without confidentiality; §9.2 broadly licenses customer input. Establish endpoint-specific exclusions or a superseding agreement before claiming compatibility with our privacy promise. | 1,000 free credits/month without card; basic search one credit, advanced two; PAYG $0.008/credit. No PrivateAI live quality evidence. [Pricing](https://docs.tavily.com/documentation/api-credits) |
| Exa | §4.2(a) restricts copying information obtained through the service except temporary browser caching or express permission. §1.2(c)'s storage license is **to Exa**, not to us. No enabling saved-history clause identified. **Written permission unresolved.** [Terms §§1.2/4.2](https://exa.ai/assets/Exa_Labs_Terms_of_Service.pdf) | §1.2(c) permits use of inputs/outputs for service improvement. Exa advertises ZDR across search products; the announcement does not establish the terms/settings of our absent account. [ZDR announcement](https://exa.ai/blog/zdr-search-engine) | Instant $4/1,000, Fast/Auto $7/1,000 up to ten results; additional results/summaries can cost more. No PrivateAI live quality evidence. [Pricing](https://exa.ai/pricing) |
| SearchApi | Data Licensing requires third-party rights and preserved attribution. Copyright and Content Ownership §5 requires express permission for copying/exploiting service portions; no explicit saved-citation exception identified. Legal Shield excludes downstream storage/use: **that exclusion is not a storage grant**. [Terms](https://www.searchapi.io/legal/terms) | Terms limit processing purposes, allow support/security access and identify US infrastructure. Public privacy policy does not establish a precise query-retention bound for this workflow. **Retention unresolved.** [Privacy](https://www.searchapi.io/legal/privacy) | Developer $40/month for 10,000 searches; no approved subscription or PrivateAI live quality evidence. [Pricing](https://www.searchapi.io/pricing) |
| SerpApi | General Conditions §2: “without express written permission by us” qualifies the restriction on copying/exploiting service portions. No explicit saved-history grant identified. **Permission unresolved**, despite API output/download functionality. [Terms](https://serpapi.com/legal) | Privacy §10 retains search data 31 days. ZeroTrace is enterprise-only in API documentation; it is not the ordinary account default. [API parameters](https://serpapi.com/search-api) | Starter $25/month for 1,000 searches. No approved subscription or PrivateAI live quality evidence. [Pricing](https://serpapi.com/pricing) |

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
