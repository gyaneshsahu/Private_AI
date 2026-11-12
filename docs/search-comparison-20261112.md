# Search comparison: Brave against Tinfoil enclave search, 12 November 2026

**Status: SYNTHETIC LIVE EVALUATION ONLY.** Ten synthetic queries were sent to each supplier on 12 November 2026 (12:41–12:42 UTC). No default, gate, allowlist, qualification record, account setting or privacy copy changed. Brave stays the default (owner, 12 November). Direct Exa was not called and no Exa key exists. No search result, snippet, title, link, answer text or model-written query was stored anywhere: not in files, logs or the repo. The script prints derived measurements only, and those are copied below.

Labels: **measured** (observed in this run), **supplier statement** (published or emailed by the supplier, not checked against the deployment), **unknown** (no source answers it), **assessment** (our reading).

## Method

- Script: `evaluation/search-compare.ts`. Keys came from Windows Credential Manager through `scripts/WindowsSecrets.psm1` and were never printed. `--dry` runs the masking self-checks without network.
- Ten synthetic, non-personal queries (5 English, 5 German): eggs in the fridge; Bürgeramt Berlin opening hours; EU VAT on e-books; Grundfreibetrag 2026; boiling point at 2000 m; Winterreifen rule; descaling a kettle; tenant notice period; and two SEPA transfer-time questions (English, German) containing the fake textbook IBAN `DE89 3704 0044 0532 0130 00`.
- Masking ran before any send, in the form each design uses in the product:
  - Brave: `prepareSearchQuery` (the approval-preview path) replaced the IBAN with "[bank account removed]".
  - Tinfoil: `createMaskingSession().mask` (the chat path) replaced it with `{{IBAN-1}}`, with `MASKING_INSTRUCTION` in the system message.
  - The script asserts that the raw IBAN is absent from every outgoing query and request body before the network call.
- Brave: our adapter `searchWeb` from `server/research.ts` (web endpoint, `count=5`), called sequentially.
- Tinfoil: `POST https://inference.tinfoil.sh/v1/chat/completions`, non-streaming, model `gpt-oss-120b`, `reasoning_effort: "low"`, `max_completion_tokens: 2000`, `web_search_options: { search_context_size: "low" }`. Headers: `X-Tinfoil-Request-Usage-Metrics: true`, plus `X-Tinfoil-Events: web_search` so the progress markers reveal, in memory only, what the model searched for.
  - `pii_check_options: {}` (top-level, as the docs show) was sent on the German IBAN request only.
  - Plain TLS from Node, with no EHBP and no attestation check. In the product the browser would encrypt the same body to the verified enclave and our relay would carry only ciphertext. This run therefore says nothing about attestation.
- Relevance is a keyword check, not graded relevance. Each query has a few lower-case keyword stems. A source counts as relevant when its title or URL contains one. Titles and URLs are used for both suppliers because Tinfoil returns no snippets on Chat Completions.
- Content categories, counts only, over Brave titles and snippets and over the Tinfoil answer and citation titles:
  - email-like and phone-like patterns;
  - "name-like" (two capitalised words in a row). This over-counts place and product names, so treat it as an upper bound;
  - longest single text, in characters.
- Placeholder survival: the progress markers show each query the model sent to Exa (before Tinfoil's own masking). The script checked them, the answer and the citations for the raw IBAN and for the placeholder, and kept only the booleans.
- Budget guard: at most 20 Tinfoil requests and USD 1 worst case. Before each request the script checks a worst-case bound: fee, an assumed unknown filter fee, 100k prompt tokens and full output. After each request it adds the larger of the metered `cost_usd` and its own computation.

## Spend (exact)

| Item | Requests | USD |
| --- | --- | --- |
| Tinfoil, metered `cost_usd` summed over all responses | 10 (9 searched, 1 answered without searching) | **0.461014** |
| Tinfoil, script's worst-case tally | 10 | 0.4610 |
| Brave, at the published USD 5 per 1,000 | 10 | 0.05 nominal (covered by the USD 5 monthly credit if unused; not checked on the dashboard) |
| **Total** | 20 | **≤ 0.511** (cap USD 1) |

Billing dashboards were not read before or after. The Tinfoil figure is the sum of the `X-Tinfoil-Usage-Metrics` values, which Tinfoil says are "at published rates, before account-specific exemptions".

## Results (measured)

| Measure | Brave (our adapter) | Tinfoil enclave search |
| --- | --- | --- |
| Completed | 10/10 returned results | 10/10 produced an answer; **9/10 searched**; the kettle query was answered from model memory with no search and no sources |
| Sources returned to us | 5 per query (50 total; adapter cap 5) | 0–4 citations per answer (21 total, mean 2.1); the model saw 5–10 results per search (70 total) |
| Keyword-relevant sources | 50/50 | 19/21. Grundfreibetrag 1/2; tenant notice 0/1, likely a statute URL the keyword list misses (not inspected) |
| Latency | 716–1,177 ms, mean 1,080 ms (search only, before any model call) | 3,679–9,035 ms, mean 5,301 ms (search plus a complete answer) |
| Tokens | n/a (the model call is separate) | prompt 41,496, completion 4,982 in total; per searched request 3,607–5,999 prompt tokens |
| Cost per request | USD 0.005 (published price) | USD 0.05095–0.05148 per searched request (mean 0.05116); USD 0.000607 for the request that did not search |
| Fee breakdown | — | `cost_usd` − tokens = **0.05 search fee + 0.0002 `other_cost_usd`** on every searched request. This confirms the USD 0.05 fee by metering. |
| Email-like / phone-like in returned content | 0 / 0 | 0 / 0 |
| Name-like (upper bound) | 81 across 50 titles and snippets | 93 across 10 answers and their citation titles |
| Longest returned text | snippet ≤ 522 characters | answer 478–4,037 characters, with inline links; no snippets |
| Raw IBAN in what left our machine | No (asserted) | No (asserted) |
| Masking marker in the query the supplier received | Yes: Brave received "[bank account removed]" in both IBAN queries | No: in both IBAN requests the model wrote its search query without the placeholder or the IBAN |
| Placeholder in the answer | n/a | 1 of 2 IBAN answers echoed `{{IBAN-1}}`; the product restores it on the device. Not in citations |
| Tinfoil PII filter | n/a | A `pii` report was present on **all 9 searched requests**, including the 8 sent without `pii_check_options`. It masked nothing (there was nothing left to mask). `other_cost_usd=0.0002` appeared on all 9. So in practice the filter is not opt-in as documented, or `other_cost_usd` is something else: **unknown**. Sending `pii_check_options` made no measurable difference to cost or output. |
| Rate-limit headers | not read (the adapter does not expose headers); no error in 10 sequential calls | none returned (no `ratelimit` or `retry-after` header) |

## Comparison

| Dimension | Brave (default) | Tinfoil enclave search (Exa behind Tinfoil) |
| --- | --- | --- |
| Quality on these 10 easy queries | 5 on-topic results every time. Our own model must still read the snippets and answer, in a second request. | Grounded answer in one request with 2–4 citations. It **skipped search once without saying so**. We cannot see what it read: no snippets, so our quote and citation audits cannot run. Same order of quality here; neither was graded for faithfulness. |
| What OUR server sees | The approved query in plain text. The server holds it in the approvals map for up to five minutes and sends it to Brave from our IP with our key. | Ciphertext only: the query is written by the model inside the enclave, and the relay forwards EHBP-encrypted bodies (supplier statement plus the 21 October design reading; not tested here, since this run used plain TLS). Headers, including the usage metrics, are in clear. |
| What the supplier sees | Brave sees the approved query, our IP and our key. It keeps query records up to 90 days; zero retention is enterprise-only (6 October review). | Tinfoil says it does not see the query in plain text and logs metadata only (supplier statement). **Exa sees the model-written query in clear**, with the enclave IP and a shared key. Exa says no query logs under a zero-data-retention agreement that we cannot read (supplier statement). |
| User control of the query | The user reads, edits and approves the exact query before it leaves the browser. | The model writes the query. The user can approve only "this reply may search", not what is searched. |
| Storage rights for titles, links and excerpts | Brave requires "a plan that explicitly grants storage rights". No such plan is identified, and Brave has not answered since 7 October. **Not granted.** | Tinfoil terms: outputs are "Your Content", with no prohibition and no explicit grant. Exa flow-down **unknown**. **Not granted in writing.** |
| Cost per request | USD 0.005, plus a separate model call (about USD 0.001 at these sizes) | USD 0.0512 measured (0.05 fee + 0.0002 + tokens): **about 9 times Brave plus model** |
| Rate limits | Plan-dependent; not measured; **unknown** for our plan | Account and tier limits apply; no search-specific limit is published; no headers returned: **unknown** |
| Integration | Done: adapter, tests, live use since 12 October | Not built: request field, annotation parsing, a new evidence kind, a per-turn capability disclosure, relay trailer reading, qualification re-description (2–4 days for a harness, more for the product: assessment, 21 October) |
| Main risks | Plain-text query at our server and at Brave, 90-day retention at Brave, no storage rights, an unresponsive supplier | Fees about 10 times Brave's search price. Silent no-search answers. No snippets to audit. Autonomous queries (the user loses pre-send approval). Exa sees queries. The undocumented always-on filter fee. The attestation chain to the websearch enclave is **unknown**. A supplier change of terms at 1 week's deprecation notice (22 October email). |

## Recommendation

**Brave stays the default.** Nothing measured here argues for switching.

- Tinfoil enclave search works: 10 of 10 answers, a sensible query each time it searched, and no leak of the masked IBAN into the query Exa received. Its privacy design is better for one specific defect: our server never holds the plain query.
- But it costs about ten times more per request.
- It returns fewer sources (mean 2.1 against 5), and no excerpts we can audit.
- It decided once not to search at all, and nothing in the answer showed that.
- It takes query approval away from the user.
- It answers none of the storage-rights questions better than Brave does. Both are unresolved in writing.

The PII filter also behaved differently from its documentation: it ran and was charged, at USD 0.0002, without being requested.

Keep Tinfoil search as a recorded candidate for a later, opt-in "private search" mode. Reconsider it only after Tinfoil answers the written questions below, at minimum 1, 4, 5, 7 and 10. Do not spend more on it until then.

One finding for the existing harness: `evaluation/enclave-search-harness.ts` nests `pii_check_options` and `prompt_injection_check_options` inside `web_search_options`. The Tinfoil docs and examples put both at the top level. It was not changed here (preparation-only file, outside this task).

## Questions to ask Tinfoil in writing

Add these to the existing Tinfoil thread. Do not start a new email. They refine the list in [tinfoil-search-terms-20261112.md](tinfoil-search-terms-20261112.md).

1. Storage rights. Does any clause in the Terms or DPA, or in Tinfoil's agreement with Exa, limit an API customer's right to keep search-derived answers, citation titles and URLs in end users' encrypted, on-device saved conversations? Does any Exa restriction (for example Exa's public §4.2(a)) flow down to API customers? Please answer in writing so we can rely on it.
2. Does Terms §2 ("third-party services ... governed by their own terms") apply to web search run through Tinfoil's own tool?
3. Is Exa on the subprocessor list? Is anyone other than Exa Contents (for example context.dev) used for API page fetch? Please send the list as text, since trust.tinfoil.sh/en/subprocessors needs JavaScript.
4. Does the Exa zero-data-retention agreement cover the returned results and the request metadata (time, enclave IP, key), not only queries and page addresses?
5. Price. We metered USD 0.05 per searched request plus `other_cost_usd=0.0002`. Is the USD 0.05 fee published, and will price changes follow the 30-day notice in Terms §6?
6. Is there a search-specific rate limit, or a cap on searches and fetches per request? No rate-limit headers were returned.
7. Does the router verify the websearch enclave's attestation before sending it queries? Which release digests should we pin?
8. Does the DPA apply to an account held by an individual founder who is building a product for end users?
9. Where is Responses API `previous_response_id` state (prior search results) held, and for how long?
10. New, from this run. A `pii` report and `other_cost_usd=0.0002` appeared on every searched Chat Completions request, including requests without `pii_check_options`. Is the privacy filter now on by default for web search? Is `other_cost_usd` its fee? Can it be turned off, and is that behaviour documented?
11. New, from this run. The model sometimes answers without searching even when `web_search_options` is present. Is there a supported way to require at least one search, or to tell from the response, without progress markers, that no search ran? Today we read the absence of `web_search_calls` in the usage header.
12. New. For clients that do not use EHBP, is TLS on inference.tinfoil.sh terminated inside the attested router enclave? Our product will use EHBP, but this evaluation used plain TLS.

## Unknown after this run

- Brave's rate limit on our plan.
- Brave's storage-rights plan.
- Whether Exa is a listed Tinfoil subprocessor.
- What `other_cost_usd` is.
- Whether the filter can be turned off.
- Tinfoil's search rate limits.
- The websearch-enclave attestation chain.
- Answer faithfulness for either path: not graded, and sources were deliberately not kept.
