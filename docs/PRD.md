# PrivateAI — product requirements


**20October fidelity amendment:** DOCX equations and alternate representations are unsupported and explicitly rejected to avoid silent content loss/duplication. Independent python-docx-generated packages and actual browser workflows now supplement authored fixtures; this does not establish Microsoft Word export compatibility or real-device performance. Fixed desktop sidebar overflow now keeps privacy/help controls reachable on short windows and enlarged text.


**20October document scope:** DOCX body-text extraction is implemented locally with editable source review and encrypted save/reopen. This is not layout/page fidelity: headers, footers, notes, comments, images, formatting and automatic list numbers are omitted with a visible warning. Documents with tracked revisions, fields, text boxes, macros or embedded content are rejected; export a reviewed text PDF instead. Existing10MB/file and60000text-character bounds apply, plus512archive entries,20MB declared expansion and4MB per read XML part. No implicit upload, provider qualification or real-device acceptance follows from implementation. Legacy DOC/DOCM and spreadsheet workbooks remain unsupported.

**Owner-confirmed operating plan, 19 October:** operate from Germany as an individual at present; a registered company may be considered later if the business earns revenue. Email is the selected support channel. Exact support address, mailbox readiness, response expectations and legal/payment onboarding details remain unconfirmed. This records product planning, not verification of business registration, tax status or permission to sell. No company formation, mailbox/DNS change, billing activation or public launch is authorized by this statement.

**19October conversation continuity implementation:** editing and explicit retry preserve recoverable local alternatives, including incomplete attempts, rather than overwriting the only visible version. Branches retain their draft and reference selection; only selected active context goes to inference. Up to20branches; save explicitly to retain all versions across reload. Temporary research remains unsaveable across every branch. Completed code blocks support explicit copying and keyboard scrolling, without running code. These are local user-workflow capabilities, not model-quality/privacy release approval.

**19 October saved-history recovery implementation:** user-initiated encrypted file backup and restore-as-copies is now locally implemented/tested. It covers already-saved conversations, requires the original backup passphrase, preserves destination history and supports manual portability without uploads. It does not recover forgotten passphrases, save temporary search, add cloud sync or approve private-data use. Actual-device and security qualification remain in READINESS; automated cross-device history is still a separate product/privacy decision.

**19 October confirmed domain:** owner reports purchasing `cometrow.com` and approves `https://app.cometrow.com` for the assistant and sign-in. DNS control, hosting association and TLS are not yet verified. Preparation is authorized; DNS changes, Google/Apple activation and account migration require a reviewed rollout. This does not rename PrivateAI or approve private-data/public access.

**19 October account design decision:** launch sign-in should offer Google, Apple and email, with passkeys for convenient subsequent sign-in. Build this inactive for review; provider activation and existing-account migration remain separately gated. Disclose account identifiers/email and provider involvement; no silent email-based account merging or promise that sign-in recovery restores a lost vault passphrase. Proposed email experience uses one-time codes. The first local preview is a design walkthrough, not working authentication.

**12 October test-scope update:** Founder accepts temporary web-search answers without saving search sources. Search conversations and their answers cannot be saved in this test version; citations remain inspectable during the session. Persistent search history is deferred, while live retrieval, source fidelity, explicit disclosure and provider/privacy gates remain required. This does not authorize private-data access or certify answer quality.

**Current product direction — 19 October 2026:** build one public-launchable general-purpose assistant now. Invited users perform a limited release check on the same production architecture. Trial completion is not a development stopping point or a separate product. This supersedes the earlier trial-first investment sequence and modality exclusions; historical quality evidence and thresholds remain intact. See the active [production roadmap](ROADMAP.md#active-production-roadmap--19-october-2026).

Launch planning includes chat, usable conversation history/context, documents and images, research/citations, reasoning/coding, safety, mobile accessibility, consumer accounts, subscriptions/usage limits, recovery, support and operations. Assess voice and image generation/editing explicitly; proposed initial-launch deferrals require evidence and founder scope review, not silent removal. Public competitiveness and verifiable privacy remain targets to prove. English and adults-only remain the current evaluated audience pending explicit audience review.

Required commercial/account journeys: signup, sign-in/out and revocation, account recovery distinct from decryption recovery, account deletion, plan/allowance display, checkout, renewal/cancellation/payment failure and support. A payment success redirect alone cannot grant access. Entitlements and usage admission must survive restart and concurrent requests without trusting browser claims. No paid-service/account changes or private-data admission are authorized by development scope.

**Working requirements v0.2 · 4 October 2026**

This consolidates the agreed direction for the first working evaluation. It does not certify existing code or authorize spending. Read with the [architecture](ARCHITECTURE.md), [detailed acceptance contract](acceptance.md), and [observed validation](validation.md). Requirements below are targets, not claims that tests have passed.

Current implementation and verification status are maintained only in the
[readiness checklist](READINESS.md). Requirements below remain targets until their
completion evidence exists. Local, live synthetic and hosted access evidence are
separate from model acceptance, full provider qualification and release approval.

## 1. Purpose and first release

Help a person understand information, complete everyday tasks, and research decisions while controlling disclosure of private context. Start with a small evidence-qualified model/configuration set and a real responsive web chat; one qualified path is sufficient if it meets trial requirements. An explicit Thorough option may expose a separately evaluated configuration, without promising correctness. Evaluate usefulness and confidentiality before investing in a broader platform.

The initial single-operator gateway and restricted hosted access are reusable foundations. Production development now proceeds through the roadmap milestones; limited-user testing precedes public opening on that same architecture. Public security, commercial, quality and operational obligations are active requirements in the checklist.

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
| Initial coverage | 24 development cases plus 24 reserved cases, four per family. Execute reserved cases three times (72 executions). Keep per-task scoring. Founder-approved trial floors are 65/72 overall and 10/12 per family, with the severity/recurrence rules in the acceptance contract. Cases used to tune become regression tests and require fresh replacements. | Critical privacy/security and serious task-critical failures block. Recurring material failures require repair or explicit scope review; isolated ordinary misses follow the pre-registered family/severity policy. Minor style differences do not block. Repetitions do not increase distinct coverage. |
| Documents and numbers | Ground-truth varied layouts, tables, dates, units and decimal results. Inspect extraction, source selection, follow-up corrections and whether each citation actually supports its claim. Test corrupt, oversized, misleading and unreadable inputs. | Wrong task-critical values or attribution, fabricated citations, silent truncation, unsupported input treated as reliable. |
| Confidential path | Live synthetic browser-to-provider sessions; inspect gateway traffic and real streaming, usage and cancellation. Test wrong keys/releases, tampering, stale evidence, outages and rotation; distinguish injected faults from real provider observations. Review supplier processing and retention evidence. | Unqualified live path, plaintext escape, invalid verification accepted, unprotected fallback or unexplained downstream processing. |
| External disclosure | Inject instructions into documents, pages and model output. Test absent, expired, replayed and cross-session grants, redirects and private-network destinations. Inspect outbound requests. | Any unauthorized disclosure or network action. |
| Storage and logs | Inspect browser storage and gateway logs after temporary use, save, lock, reload and delete. Test wrong passphrases, corrupted records and concurrent stale-tab saves. | Plaintext durable content, logged secrets, cross-session exposure or deleted records recreated by stale state. |
| Responsiveness and reliability | Target UI acknowledgment ≤200 ms; cancellation feedback ≤1 second. Measure at least 100 live short-chat requests across periods and at one/three concurrent requests: p95 first useful content ≤5 seconds warm and ≤10 seconds with fresh verification. Target routine tasks ≤30 seconds and bounded research ≤90 seconds; report distributions and uncertainty. | Frozen UI, misleading completion, unrecoverable lost state, recurring failure; missed targets require diagnosis or explicit scope/target review. |
| Complete cost | Record input/output and other billed units, retries, failures and research fees per completed task; reconcile with provider billing. Record uncaptured costs explicitly. | Unknown or uncontrolled spend, fabricated estimates, hidden paid dependencies. |
| Usability | Observe desktop and real phone workflows, keyboard operation, source inspection, consent, recovery and deletion. Responsive viewport tests supplement actual device testing. | Users cannot complete core workflows or understand what is disclosed/saved. |

Latency targets are proposed usability budgets: feedback should feel immediate, while verification and longer research have explicit additional time. They are not measured capabilities or contractual guarantees. No arbitrary cost-per-task target is set before real prices and workload measurements exist.

Quality grading distinguishes minor (acceptable), material (task repair required) and critical failures. Mandatory assertions concern outcomes and facts, not exact wording. Privacy leaks, verification bypasses and fabricated critical facts have zero tolerance. Averages cannot hide a weak task family; disputed grades require documented review against the frozen rubric.

### Required conversational safety before invitations

The assistant must handle sensitive situations appropriately: supportive self-harm
responses, useful health information with uncertainty, refusal of serious-harm
assistance, and distinctions between ordinary adult questions and exploitation.
Evaluate other abuse categories and harmless false positives explicitly. Existing
privacy/access controls do not establish these behaviors. The [S1 audit](safety-readiness-audit.md)
defines missing evidence; the [acceptance contract](acceptance.md) makes it a trial
gate. No moderation service may read private messages outside the approved privacy
boundary. Audience and adult-content scope must be settled before release freeze.

## 5. Expansion gate

The 24 reserved cases are an early defect check, not a complete public-release assurance package. Fuller-platform implementation is now authorized alongside evaluation. Before broad competitiveness claims, evaluate at least 120 fresh distinct conversations (20 per family), varied documents and prospective user-authored tasks. Observe 8–12 prospective users over multiple sessions; this is exploratory evidence, not proof of market demand.

For review: pre-register a five-percentage-point task-success noninferiority margin against each named comparator, representing at most one extra failure per 20 tasks. Require a one-sided 95% lower confidence bound no worse than −5 points for an aggregate noninferiority claim. The sample may need enlargement; aggregate results do not establish every family's performance. Do not relax the margin after seeing results.

Technical readiness, security assurance and customer demand are separate decisions. Strong scores do not certify security; secure processing does not establish usefulness; neither proves willingness to pay. Unresolved essential security failures block expansion regardless of quality scores.

## 6. Delivery and spending

Active delivery follows production milestones M1–M7 in ROADMAP. The A–D table below describes the original implementation/evidence sequence; it no longer postpones production platform work until after trial investment approval.

| Stage | Working outcome and dependencies | Exit evidence |
| --- | --- | --- |
| A — qualified private chat | One real model, verified browser encryption, streaming follow-ups and honest failure handling. Requires qualified supplier, access, current pricing and approved spending if needed. | Full live provider qualification; local mocks cannot pass this stage. |
| B — complete information tasks | Local extraction, editable/selectable sources, citations, calculations and consent-bound research integrated with chat. | End-to-end live tasks and negative disclosure/extraction tests. |
| C — reliable personal workspace | Temporary sessions, optional encrypted snapshots, deletion, recovery from interrupted work and responsive layouts. | Storage/log inspection, concurrency/failure tests and actual device usability. |
| D — evaluation and investment decision | Frozen initial evaluation, named comparators, then fresh broader cases and user observation before expansion. | Reproducible results separating quality, privacy, performance, cost and demand. |

Local work on B/C may proceed while A is blocked, but does not imply A has passed. Existing local implementation is reusable work, not proof of completion. The previous 6–10 engineering-week estimate is provisional, not a minimum duration; progress follows evidence.

Current development authorization: **USD5 cumulative Tinfoil**, subject also to actual provider controls (last observed key5/account3); auto-recharge off. The handoff and READINESS contain reconciled usage/uncertainty. Routine bounded synthetic work proceeds autonomously; preserve consumed permits and attempts. The founder handles billing, limits, credentials and material privacy/account settings. No new subscription, deposit or hosting upgrade is authorized by the production target.

## 7. Deferred scope and review decisions

The general-assistant goal remains central: writing/revision, explanation/planning,
personal discussion, calculations, document questions and consent-bound research.
The [roadmap](ROADMAP.md#general-assistant-delivery-track) gives each an explicit
route to integrated workflows and family-level evaluation. Documents and drafts
are initial entry points, not a narrowing of the product to document management.


Anonymous access, autonomous purchases/account actions, family sharing, arbitrary remote code execution, indefinite memory and custom GPU infrastructure remain outside the first launch proposal. General vision, voice and image creation/editing are now assessed launch scope, with explicit decisions/dependencies in ROADMAP. Cloud ciphertext sync and recovery need a material privacy decision before activation; existing local encrypted history remains functional meanwhile. A small qualified model set and an explicit Thorough option are preferred over broad automatic routing until matched evidence earns each route.

Production implementation is authorized by the19October direction. Necessary later inputs are supplier access through secure settings, concrete new spending, material privacy choices and human evaluation. Routine reversible engineering batches do not need repeated approval. Public access, weaker privacy promises and paid-service/account changes remain founder decisions.

## Context limits evidenced on 8 October

The integration sends all selected complete messages plus selected source serialization, system policy and device date. It neither summarizes nor silently truncates history. Its configured input bound counts JavaScript UTF-16 string units, not model tokens; request framing adds token overhead. The contract permits at most100000 such characters and4096 output tokens; experimental permits may be lower (8000/16000). No operational provider is qualified, so the production composer displays the selected count but reports sending-limit availability honestly. The provider catalog advertises262144 context tokens for Gemma4-31b; this is supplier metadata, not a verified end-to-end limit. No indefinite memory or full-window quality claim is supported. Oversize input must fail visibly before inference, leaving history intact.

Measured follow-up: one12-turn live synthetic conversation reached98574selectedcharacters/23758inputtokens and recalled corrected facts plus a document citation; final answer32.3442s. Three other10-turn conversations reached14520characters. Offline100000/100001boundary tests pass. This is scoped evidence, not full supplier-window or arbitrary long-history assurance. See the existing general-transfer results and READINESS.
