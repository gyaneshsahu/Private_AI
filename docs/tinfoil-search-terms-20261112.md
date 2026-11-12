# Tinfoil enclave web search: what the published terms say, 12 November 2026

**Method.** Read on 12 November 2026, public pages only, no login, no request to any API, no money spent, no message sent: Tinfoil [Terms of Service](https://tinfoil.sh/terms) (last updated 12 October 2026), [Acceptable use policy](https://tinfoil.sh/terms/aup) (last updated 12 October 2026), [Data Processing Addendum](https://tinfoil.sh/terms/dpa) (published 12 October 2026), [Privacy policy](https://tinfoil.sh/privacy) (effective 12 October 2026), [pricing](https://tinfoil.sh/pricing), [web search guide](https://docs.tinfoil.sh/guides/web-search.md), the subprocessor page [trust.tinfoil.sh/en/subprocessors](https://trust.tinfoil.sh/en/subprocessors), and the owner's local copy of the Tinfoil docs (`docs/tinfoil-docs.md`: web search, MCP web-search server, proxy server, usage limits and EHBP sections). Prior context: [enclave-search-evaluation-20261021.md](enclave-search-evaluation-20261021.md) and [search-provider-comparison.md](search-provider-comparison.md). Exa was not evaluated as a direct supplier and Exa's own terms were not re-read. Quotes are short extracts, each under 15 words. "Confirmed" means the published Tinfoil text says it. It does not mean the deployment serving our account was checked. "Unknown" means no primary source answers it.

The subprocessor page again showed only the heading "Compliance at Tinfoil."; the list is drawn by browser JavaScript and could not be read. So whether Exa is a listed subprocessor is still unknown.

## 1. May we store search results, snippets, titles or links in users' saved conversations?

Short answer: nothing in Tinfoil's published documents forbids it, and nothing grants it. The documents never name search results as a category. The nearest text treats outputs as the customer's content.

| Finding | Source and clause | Quote (under 15 words) | Status |
| --- | --- | --- | --- |
| Outputs belong to the customer to the extent the customer has rights. | Terms §5 | "you retain any right, title, and interest that you have in Your Content" | Confirmed |
| The customer must hold the rights needed for its content. Publisher rights in excerpts are not cleared by Tinfoil. | Terms §5 | "making sure you have the rights needed to use it" | Confirmed |
| Using or sharing outputs is the customer's decision, within the AUP. | Terms §5 | "You are responsible for deciding whether to use or share outputs" | Confirmed |
| Tinfoil's content licence does not reach API outputs. | Terms §5 | "These permissions do not apply to prompts, files, outputs, or workloads" | Confirmed |
| The AUP has no rule on storing, caching or redistributing outputs or search results. The only use of "store" concerns child abuse material. | AUP, prohibited-uses list (12 items) | "Generate, store, or distribute child sexual abuse material" | Confirmed (no such clause) |
| The copying restriction covers "the Services", not outputs. | Terms §10 | "You may not copy, modify, distribute ... create derivative works from the Services" | Confirmed |
| Third-party services keep their own terms. Whether Tinfoil's own Exa-backed tool counts as "you use third-party services" is not stated. | Terms §2 | "those services are governed by their own terms and privacy policies" | Unknown (how it applies) |
| The web search guide says nothing on storing or displaying results, or on any terms of use for them. | Web search guide | None | Confirmed (silent) |
| An affirmative written permission covering saved titles, URLs and snippets. | None found | None | Unknown |

Assessment: as before, there is no identified contractual obstacle and no written permission. Storing them in on-device encrypted saved conversations rests on Terms §5 plus silence. That does not meet the 6 October rule that storage needs an explicit customer permission. The open risks are an Exa restriction flowing down (question 3) and publisher copyright in excerpts.

## 2. What do Tinfoil and Exa retain for a search request, and for how long?

| Finding | Source and clause | Quote (under 15 words) | Status |
| --- | --- | --- | --- |
| Tinfoil does not log or store the query, the page addresses or the returned content. | Privacy §2 (MCP servers and auxiliary services) | "queries, requested page addresses, and returned content are not logged, stored" | Confirmed (supplier statement) |
| Tinfoil collects metadata for billing, authorization and telemetry. | Privacy §2 | "collects the metadata needed for billing, authorization, and telemetry" | Confirmed |
| Exa keeps no logs of queries or page addresses, under a zero-data-retention agreement. | Privacy §2 | "no logs are retained of the queries or requested page addresses" | Confirmed (supplier statement; agreement not public) |
| Under that agreement, queries never reach persistent storage or Exa's own subprocessors. | Web search guide, Overview | "queries are never written to persistent storage or sent to external subprocessors" | Confirmed (supplier statement) |
| The DPA says search content goes only to listed subprocessors under zero-data-retention agreements. | DPA Annex I.C | "shared only with listed Subprocessors under zero-data retention agreements" | Confirmed; the list itself is unreadable, so whether Exa is on it is unknown |
| API prompts and responses are not retained, except volatile prompt caching. | Terms §2; DPA Annex II | "Prompts and responses are not retained after the response is returned" | Confirmed |
| Usage metrics (counts, feature use, timestamps) are kept while the account is active, then aggregated or anonymized. | Privacy §3 and §9 | "while your account is active for billing and operations" | Confirmed |
| Security and operational logs are kept up to 90 days and exclude prompts and completions. | Privacy §9 | "operational logs never include prompts or completions" | Confirmed |
| Router billing records hold token counts, model, timestamp, API key, request IDs, route and enclave, but no text. | Local docs, router outbound channels section | "They do not contain prompt text or generated response text." | Confirmed (supplier statement) |
| Whether the `web_search_calls` count and timestamps form part of those metrics. | Local docs, proxy guide `web_search_calls` field | None | Probable, not stated as retained |
| Exa's retention of search results it returns, and of request metadata (time, enclave IP, shared key). | None | None | Unknown (the ZDR statements cover queries and page addresses only) |
| The page-fetch provider for the API. Chat uses context.dev for fetch; the API docs say fetch goes through "Exa Contents". | Privacy §2; local docs, MCP web-search guide | "to fetch web pages, we send only the page address (URL) to context.dev" | Confirmed for Chat; the API path is per the docs only |
| Where the Responses API `previous_response_id` keeps prior search results, and for how long. | Web search guide | "Prior search results and fetched pages are carried forward" | Unknown (do not use) |

## 3. Do Exa's terms flow down to Tinfoil's customers?

| Finding | Source and clause | Quote (under 15 words) | Status |
| --- | --- | --- | --- |
| The Tinfoil Terms, AUP and DPA do not name Exa. Only the privacy policy and docs do. | Terms; AUP; DPA (full text) | None | Confirmed (no mention) |
| No clause makes Tinfoil customers bound by a supplier's terms. The nearest is the general third-party clause. | Terms §2 | "If you use third-party services with Tinfoil" | Confirmed (no explicit flow-down to customers) |
| The DPA flows down in one direction only: Tinfoil must bind its subprocessors to DPA-equivalent duties. | DPA §5.2 | "impose upon the Subprocessor equivalent obligations as imposed by this Addendum" | Confirmed |
| Tinfoil stays liable for its subprocessors. | DPA §5.2 | "Processor shall remain fully liable to the Company" | Confirmed |
| No subprocessor may train on AI input or output. | DPA §2.1(3) | "nor does the Processor allow any third parties (including its Subprocessors)" | Confirmed |
| Subprocessor changes: 14 days' notice by trust page and email; 7 days to object; termination after 30 days. | DPA §5.3, §5.4 | "at least fourteen (14) days in advance of such updates" | Confirmed |
| The subprocessor list is incorporated into the Terms, the DPA and the privacy policy. | Terms §4; DPA Annex III; Privacy §6 | "which is incorporated into this Addendum by reference" | Confirmed; contents unreadable, so unknown |
| Whether the DPA binds our account. It applies when Tinfoil processes personal data for a "Company". | DPA preamble | "applies to the extent the Processor processes Company personal data" | Unknown for an individual founder account |
| Order of precedence when documents conflict. | Terms §4 | "(1) any signed agreement with Tinfoil, (2) the Data Processing Addendum" | Confirmed |
| Whether Tinfoil's contract with Exa carries restrictions that reach Tinfoil customers, such as Exa's public §4.2(a) rule on copying information obtained through Exa. That rule was recorded in the 21 October review and not re-read today. | Tinfoil–Exa agreement (not public) | None | Unknown |

## 4. Price per search request and other search fees

| Finding | Source and clause | Quote (under 15 words) | Status |
| --- | --- | --- | --- |
| A web search fee exists and is charged once per request, however many searches or fetches the model runs. | Web search guide, usage metrics | "charged once per request regardless of how many calls the model made" | Confirmed |
| No fee is charged if search was enabled but not used. | Web search guide | "the model did not use web search and no fee applies" | Confirmed |
| Web search and the privacy filter are billed as separate per-request fees. | Local docs, usage limits and billing section | "recorded as separate per-request fees" | Confirmed |
| Amount: USD 0.05 per request. This comes from Tinfoil's 22 October email (see the 21 October review, addendum). The pricing page fetched today shows no API price table and does not price web search. | Supplier email, 22 October; pricing page | "Ability to search the web" (Chat plan only) | Unknown as published; supplier statement in email only |
| Docs example consistent with that figure: `web_search_calls=2,cost_usd=0.052` for gpt-oss-120b. | Local docs, proxy guide | None | Illustrative only |
| Privacy filter fee (`pii_check_options`, reported as `other_cost_usd`). | Local docs, proxy guide | None | Unknown amount |
| Prompt-injection filter fee (`prompt_injection_check_options`). | None | None | Unknown |
| Model tokens are billed on top of the fee at per-model rates. Price changes need 30 days' notice. | Pricing page; Terms §6 | "We may change prices with at least 30 days' notice" | Confirmed |
| Cost reporting: send `X-Tinfoil-Request-Usage-Metrics: true` and read `X-Tinfoil-Usage-Metrics`. This is a header when not streaming and a trailer when streaming. It reports `web_search_calls` and `cost_usd`, at published rates. | Local docs, proxy guide | "without decrypting the response body" | Confirmed |

## 5. Rate limits for search

| Finding | Source and clause | Quote (under 15 words) | Status |
| --- | --- | --- | --- |
| Tinfoil may set and change rate limits and quotas. | Terms §9 | "We may apply and change reasonable rate limits, quotas, and usage controls" | Confirmed |
| API limits vary by model and usage tier and are shared across the account's keys. | Pricing FAQ, "How do rate limits work?" | "API limits vary by model and usage tier" | Confirmed |
| A search-specific rate limit (searches per minute or per day). | Web search guide (none stated); pricing | None | Unknown |
| Per-request caps: search `max_results` default 8, cap 30. `max_content_chars` default 700. Fetch takes at most 20 URLs per call. Exa Contents times out after 30 s. Fetched page text is cut at 50,000 code points. | Local docs, MCP web-search guide, "Limits and defaults" | None | Confirmed for the MCP server; not stated for `web_search_options` |
| A cap on searches or fetches per chat request, which bounds tool-loop length. | None | None | Unknown |
| Per-key spend and token caps are soft and return `429 insufficient_quota`. Requests rejected before reaching a model are not charged. | Pricing FAQ; local docs, usage limits | "Spending limits and per-key caps are soft." | Confirmed |
| Getting around rate limits, quotas or billing is prohibited. | AUP item 11 | "bypass authentication, rate limits, quotas, or billing" | Confirmed |

## 6. How search is invoked, what the model sees, and who sees the query

| Finding | Source and clause | Quote (under 15 words) | Status |
| --- | --- | --- | --- |
| Chat Completions: add a top-level `web_search_options` object (an empty `{}` is enough). | Web search guide, quick start and request fields | "Enable web search by adding `web_search_options` to a Chat Completions request" | Confirmed |
| Responses API (recommended): `tools: [{ "type": "web_search", ... }]`, with optional `include: ["web_search_call.action.sources"]`. | Web search guide | "or a `web_search` tool to a Responses request" | Confirmed |
| Optional filters, enabled by their presence: `pii_check_options` and `prompt_injection_check_options`. Both are off unless sent. | Web search guide, request fields | "Safety filters are opt-in per request." | Confirmed |
| Tuning fields: `search_context_size` (low, medium as default, high), `user_location.approximate.country`, `filters.allowed_domains`, `filters.excluded_domains`, `content_mode`, `max_content_chars`, `category`, `start_published_date`, `end_published_date`, `max_age_hours`, `external_web_access` (default true). | Web search guide, search tuning fields | None | Confirmed |
| The router runs the tool loop. Our client sees no tool calls. | Web search guide, Overview | "you do not need to handle any tool calls yourself" | Confirmed |
| The model composes the query from the conversation. It sees ranked results (title, URL, highlight snippets or text, per tier) and fetched page text. | Web search guide; MCP web-search guide | "`low` favors short highlight snippets" | Confirmed |
| On Chat Completions, our client gets the reply prose with inline links and `url_citation` annotations (url, title, start and end index). It gets no snippets. The query is visible only with the `X-Tinfoil-Events: web_search` marker header. | Web search guide, response format | "inline in the assistant text as ASCII markdown links" | Confirmed |
| The marker's `action.query` holds the query before masking. | Local docs, web search guide, markers | "the query the model asked for, before any masking" | Confirmed |
| The query leaves the enclave in plain text inside TLS, and Exa reads it in clear. Only the optional PII filter changes it first. | Web search guide, Overview | "queries go from the enclave to Exa over TLS" | Confirmed |
| Exa sees the enclave's IP and a shared key, not the user. | Web search guide, Overview | "Exa only sees the enclave's IP address" | Confirmed (supplier statement) |
| Our relay sees only EHBP-encrypted bodies, because search rides inside the same chat request. Headers stay in clear. | Local docs, proxy server and EHBP sections | "The proxy can read and modify HTTP headers but cannot decrypt the bodies." | Confirmed (no separate search channel is documented) |
| Tinfoil itself does not see the query. | Web search guide, Overview | "Tinfoil never sees the query contents in plaintext." | Confirmed (supplier statement) |
| Whether the router verifies the attestation of the separate websearch enclave before sending it queries. | None | None | Unknown |
| Which models and router releases serve `web_search_options` for our account. The docs use `<MODEL_NAME>`. | Web search guide | None | Unknown (22 October email said "all chat models") |

## Questions to ask Tinfoil in writing

Add these to the existing Tinfoil thread. Each one is something the published documents do not answer.

1. Does any clause in the Terms or DPA, or in Tinfoil's agreement with Exa, limit an API customer's right to keep search-result titles, URLs and short snippets in end users' encrypted, on-device saved conversations? Does any Exa restriction flow down to API customers?
2. Does Terms §2 ("third-party services ... governed by their own terms") apply to web search run through Tinfoil's own tool?
3. Is Exa on the subprocessor list at trust.tinfoil.sh/en/subprocessors? Is context.dev (or anyone else) used for API page fetch, or only Exa Contents? Please send the list as text, since the page needs JavaScript.
4. Does the Exa zero-data-retention agreement also cover returned results and request metadata (time, enclave IP, key), not only queries and page addresses?
5. Is the USD 0.05 per-request web search fee published anywhere? What are the privacy-filter and prompt-injection-filter fees?
6. Is there a search-specific rate limit, or a cap on searches and fetches per request?
7. Does the router verify the websearch enclave's attestation before sending it queries?
8. Does the DPA apply to an account held by an individual founder building a product for end users?
9. Where is Responses API `previous_response_id` state (prior search results) held, and for how long?
