# PrivateAI — product requirements

**Review draft v0.1 · 4 October 2026**

This consolidates the agreed direction for the first working evaluation. It does not certify existing code or authorize spending. Read with the [architecture](ARCHITECTURE.md), [detailed acceptance contract](acceptance.md), and [observed validation](validation.md). Requirements below are targets, not claims that tests have passed.

## 1. Purpose and first release

Help a person understand information, complete everyday tasks, and research decisions while controlling disclosure of private context. Start with one capable model and a real responsive web chat. Evaluate usefulness and confidentiality before investing in a broader platform.

The first deliverable is a single-operator evaluation running through a local web gateway. The longer-term product is a web service; public hosting requires authentication, tenant isolation, abuse controls and deployment review that this local foundation does not yet provide.

Supported evaluation language: English. Use synthetic or non-sensitive inputs until the protected processing path is qualified. No canned answers, fake integrations or static demonstrations count as working functionality. Labelled mocks belong only in tests.

## 2. Required workflows

| Workflow | Required behavior |
| --- | --- |
| Everyday assistance | Real streaming answers for writing/revision, explanation/planning and personal discussion; preserve constraints and corrections across follow-ups; allow cancellation and explicit retry. |
| Documents and screenshots | Extract locally from text PDFs, UTF-8 text and printed-English PNG/JPEG screenshots. Show editable extracted text and source/page provenance before use. Clearly reject unsupported or unreadable inputs. |
| Evidence and calculations | Answer from selected sources with inspectable citations; preserve quantities, units, dates and attribution. Provide exact decimal calculations where appropriate; never claim an unperformed calculation or retrieval. |
| Controlled research | Preview the exact public query or URL and obtain explicit approval before disclosure. Treat retrieved text as untrusted evidence. No model-triggered external requests without approval. |
| Conversation control | Show included context, preserve evidence behind earlier answers, and reject oversized requests rather than silently dropping context. Editing a prior question must invalidate dependent later answers. |
| Temporary use and history | Temporary conversations default to application memory. Optional, manually saved browser history is encrypted with a user passphrase; support locking, loading and deletion. Explain recovery and erasure limits. |
| Responsive use | Complete the same core workflows on desktop and basic phone layouts, with keyboard access, readable errors and visible progress. |

Initial supported bounds: 10 MiB per file, 20 PDF pages, five attachment items including at most three screenshots, 12 megapixels per image, and 60,000 extracted characters per file. Provider context/output limits are configured separately. These bounds contain processing cost and device load; they require testing on representative devices and do not guarantee extraction accuracy. Scanned PDFs, handwriting and general visual interpretation are outside the initial promise.

Removing a source prevents its inclusion as a selected attachment in future requests. It does not erase facts already present in messages or saved answer evidence; the interface must explain this distinction and support starting a clean conversation.

## 3. Privacy requirements

- Verify approved confidential software and its encryption key in the browser before sending private inference content. Qualification must cover the complete router-to-model processing chain, not just the first endpoint.
- Fail closed on missing, invalid, expired or unapproved verification. No ordinary inference fallback, automatic disclosure or silent retry after ambiguous failure.
- Keep extraction local. Keep provider credentials on the gateway. Keep private content out of application logs, URLs and telemetry.
- External research approval covers only the displayed query or URL. Attachments, messages and other private context must not accompany that request implicitly.
- Treat documents, websites and model text as untrusted. Prompt instructions are not a security boundary; enforce network permissions in application code.
- Document supplier retention, metadata exposure and trust assumptions before claiming confidential inference. Temporary use is not anonymity.

Conditional privacy promises and party visibility are specified in the architecture. Independent security assurance remains distinct from passing functional tests.

## 4. Acceptance and evidence

The [acceptance contract](acceptance.md) defines grading and blocking gates. Preserve case transcripts, exact configurations, source material, expected assertions, actual results and reviewer decisions. Never mark a capability live based on mock results.

| Area | Required test and evidence | Blocking failures |
| --- | --- | --- |
| Answers and follow-ups | Score complete conversations for correctness, completeness and context preservation, each 0–3. Pass requires every score ≥2, all mandatory assertions, and no serious error. Run six task families against named, recorded ChatGPT/Gemini configurations with randomized human review. | Serious errors, recurring material failures, unreliable mandatory workflows; unavailable comparators block comparative claims. |
| Initial coverage | 24 development cases plus 24 reserved cases, four per family. Execute reserved cases three times; all 72 executions must meet acceptable task completion (each rubric score ≥2, not a perfect 3). Grade and report severity and dimensions separately for each family. Cases used to tune become regression tests and require fresh replacements. | Unresolved material/critical failures block; minor wording differences, harmless style preferences and optional omissions do not. Repetitions do not increase distinct coverage. |
| Documents and numbers | Ground-truth varied layouts, tables, dates, units and decimal results. Inspect extraction, source selection, follow-up corrections and whether each citation actually supports its claim. Test corrupt, oversized, misleading and unreadable inputs. | Wrong task-critical values or attribution, fabricated citations, silent truncation, unsupported input treated as reliable. |
| Confidential path | Live synthetic browser-to-provider sessions; inspect gateway traffic and real streaming, usage and cancellation. Test wrong keys/releases, tampering, stale evidence, outages and rotation; distinguish injected faults from real provider observations. Review supplier processing and retention evidence. | Unqualified live path, plaintext escape, invalid verification accepted, unprotected fallback or unexplained downstream processing. |
| External disclosure | Inject instructions into documents, pages and model output. Test absent, expired, replayed and cross-session grants, redirects and private-network destinations. Inspect outbound requests. | Any unauthorized disclosure or network action. |
| Storage and logs | Inspect browser storage and gateway logs after temporary use, save, lock, reload and delete. Test wrong passphrases, corrupted records and concurrent stale-tab saves. | Plaintext durable content, logged secrets, cross-session exposure or deleted records recreated by stale state. |
| Responsiveness and reliability | Target UI acknowledgment ≤200 ms; cancellation feedback ≤1 second. Measure at least 100 live short-chat requests across periods and at one/three concurrent requests: p95 first useful content ≤5 seconds warm and ≤10 seconds with fresh verification. Target routine tasks ≤30 seconds and bounded research ≤90 seconds; report distributions and uncertainty. | Frozen UI, misleading completion, unrecoverable lost state, recurring failure; missed targets require diagnosis or explicit scope/target review. |
| Complete cost | Record input/output and other billed units, retries, failures and research fees per completed task; reconcile with provider billing. Record uncaptured costs explicitly. | Unknown or uncontrolled spend, fabricated estimates, hidden paid dependencies. |
| Usability | Observe desktop and real phone workflows, keyboard operation, source inspection, consent, recovery and deletion. Responsive viewport tests supplement actual device testing. | Users cannot complete core workflows or understand what is disclosed/saved. |

Latency targets are proposed usability budgets: feedback should feel immediate, while verification and longer research have explicit additional time. They are not measured capabilities or contractual guarantees. No arbitrary cost-per-task target is set before real prices and workload measurements exist.

Quality grading distinguishes minor (acceptable), material (task repair required) and critical failures. Mandatory assertions concern outcomes and facts, not exact wording. Privacy leaks, verification bypasses and fabricated critical facts have zero tolerance. Averages cannot hide a weak task family; disputed grades require documented review against the frozen rubric.

## 5. Expansion gate

The 24 reserved cases are an early defect check. Before broad competitiveness claims or fuller-platform investment, evaluate at least 120 fresh distinct conversations (20 per family), varied documents and prospective user-authored tasks. Observe 8–12 prospective users over multiple sessions; this is exploratory evidence, not proof of market demand.

For review: pre-register a five-percentage-point task-success noninferiority margin against each named comparator, representing at most one extra failure per 20 tasks. Require a one-sided 95% lower confidence bound no worse than −5 points for an aggregate noninferiority claim. The sample may need enlargement; aggregate results do not establish every family's performance. Do not relax the margin after seeing results.

Technical readiness, security assurance and customer demand are separate decisions. Strong scores do not certify security; secure processing does not establish usefulness; neither proves willingness to pay. Unresolved essential security failures block expansion regardless of quality scores.

## 6. Delivery and spending

| Stage | Working outcome and dependencies | Exit evidence |
| --- | --- | --- |
| A — qualified private chat | One real model, verified browser encryption, streaming follow-ups and honest failure handling. Requires qualified supplier, access, current pricing and approved spending if needed. | Full live provider qualification; local mocks cannot pass this stage. |
| B — complete information tasks | Local extraction, editable/selectable sources, citations, calculations and consent-bound research integrated with chat. | End-to-end live tasks and negative disclosure/extraction tests. |
| C — reliable personal workspace | Temporary sessions, optional encrypted snapshots, deletion, recovery from interrupted work and responsive layouts. | Storage/log inspection, concurrency/failure tests and actual device usability. |
| D — evaluation and investment decision | Frozen initial evaluation, named comparators, then fresh broader cases and user observation before expansion. | Reproducible results separating quality, privacy, performance, cost and demand. |

Local work on B/C may proceed while A is blocked, but does not imply A has passed. Existing local implementation is reusable work, not proof of completion. The previous 6–10 engineering-week estimate is provisional, not a minimum duration; progress follows evidence.

Current authorization: **no paid services**. Local tools and synthetic fixtures need no new supplier charge. A possible $25 qualification cap and later $50–100 cumulative evaluation allowance are planning placeholders, not approved spending or verified quotations. Request a specific service, current unit prices and cap before any charge. Recurring hosting is unnecessary for the local evaluation.

## 7. Deferred scope and review decisions

Defer anonymous access, cloud sync, automatic long-term memory, family sharing, purchases/account actions, arbitrary code execution, voice/video, general vision, model routing and custom GPU infrastructure. Preserve anonymity as a future objective requiring separate identity, routing and entitlement design.

Before continuing implementation, review this consolidated scope, privacy limitations and proposed evaluation thresholds. Necessary later inputs are supplier access through secure settings, approval of any concrete spending cap, and participation in human evaluation. Routine reversible engineering choices do not need repeated approval. Public deployment, weaker privacy promises or wider product scope require a material decision.
