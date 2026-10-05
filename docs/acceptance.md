# PrivateAI: approved implementation and acceptance contract

Status: implementation authorized; repository access confirmed; implementation in progress. The latest 5 October user instruction sets a USD 2 cumulative account cap with auto-recharge disabled, superseding the older USD 10 ceiling in the [handoff](LOCAL_CODEX_HANDOFF.md). No new paid service is authorized. The [roadmap](ROADMAP.md) tracks delivery without weakening this acceptance contract.

This supplements the architecture and stages approved in the conversation, now consolidated for review in the [PRD](PRD.md) and [architecture](ARCHITECTURE.md). It does not replace or weaken their privacy requirements. Local functionality and public-page retrieval have validation evidence. One earlier-adapter live synthetic conversation passed narrow review; current-adapter compatibility, full-chain confidentiality and broad answer quality remain unproven. See the [validation record](validation.md).

## Scope and stage gates

Build a responsive web assistant with real confidential chat, follow-ups, bounded local PDF/text/screenshot extraction, controlled public research, temporary sessions and optional encrypted browser history. Anonymous access is deferred. Provider adapters and persistent state must be real; mocks are restricted to clearly labelled tests.

Stages remain A: qualified private chat; B: complete document/research workflow; C: storage and operational reliability; D: independent evaluation and expansion decision. Local development on later modules may proceed while provider access is blocked, but this does not pass Stage A or justify proceeding with users' sensitive data.

## Quality rubric, fixed before implementation tuning

Grade each complete conversation, not isolated answers. Give each dimension a score from 0 to 3 and attach evidence identifying the relevant turn and source:

| Dimension | 3: strong | 2: acceptable | 1: material repair needed | 0: failed |
| --- | --- | --- | --- | --- |
| Correctness | All task-critical claims and computations supported and correct | No material error; only nonessential imprecision | Material factual error or unsupported conclusion | Central conclusion wrong, fabricated evidence, or dangerous guidance |
| Completeness | All required outcomes met with useful next steps | All mandatory outcomes met; minor optional omissions | A mandatory outcome omitted | Main task unanswered or unusable |
| Context preservation | Facts, constraints, source relationships and corrections preserved | Task-critical context preserved; minor irrelevant loss | Important constraint or correction missed | Confuses people/documents, contradicts decisive facts, or uses removed context in a new request |

Record serious errors separately; do not average them away. Examples: materially wrong financial conclusions, fabricated evidence supporting a decision, incorrect attribution of personal information, or unsafe confident recommendations. Unauthorized disclosure is also a separate security failure even if the answer is otherwise excellent.

A successful task requires every rubric dimension >=2, all case-specific mandatory assertions satisfied, and zero serious errors. Missing input, inaccessible sources and unsupported documents must produce an honest limitation or clarification; inappropriate refusal of a supported task fails completeness. Generic disclaimers do not repair an incorrect answer.

Passing means acceptable task completion, not a perfect answer. Minor wording preferences, harmless stylistic differences and optional omissions can score 2 and do not block progression. Mandatory assertions must describe task outcomes, supported facts and constraints, not an exact preferred wording. Record severity as minor (acceptable), material (task repair needed), or critical (serious factual error or essential security failure), with a cited example. Privacy leaks, verification bypasses and fabricated task-critical facts have zero tolerance.

Report each task family separately: scores by dimension, minor/material/critical findings, mandatory-assertion failures and repeat variability. A strong family cannot compensate for a material failure in another. Review disputed grades against the frozen rubric and ground truth; document adjudication rather than changing thresholds after seeing results.

Ground truth contains mandatory facts, numerical tolerances justified by the source, required citations, follow-up corrections, acceptable uncertainty and prohibited conclusions. Use exact decimal assertions for supported calculations; language quality is judged separately. Automated model grading can assist but cannot be the sole judge of material errors or security.

## Initial evaluation and technical progression

Six families: writing/revision, explanation/planning, personal discussion, bills/calculations, document questions and private-context public research.

Create 24 development and 24 frozen held-out cases, four distinct cases per family in each set. Run held-out cases three times to expose variability. Report 24 distinct cases and 72 executions, never 72 independent tasks. Keep case-level and family-level results; do not hide weak families in an overall average.

Trial quality gate approved by the founder on 5 October 2026: at least 65/72 successful executions overall and 10/12 in every family, under the [approved severity and recurrence rules](trial-quality-gate-proposal.md). Keep the per-task rubric and planned coverage above. These are trial-entry floors, not evidence of competitive quality.

A material defect in two distinct conversations blocks that capability pending repair or explicit scope review; a case failing two of three repeats requires review before trial. Do not change the approved floors after seeing held-out results. Report counts, denominators, dimensions, severity and repeat variability for each family. Strong aggregate performance cannot conceal a weak family.

Critical privacy/security failures and serious task-critical errors remain blockers. Minor findings remain visible without automatically failing readiness; recurring material failures in a supported family require repair or an explicitly reviewed scope change. All canonical workflows in the agreed trial scope must work. No trial is approved merely because the old numerical gate is under review. Preserve every failed result. Once used for tuning, a held-out case becomes a regression case and requires a fresh replacement.

Transport diagnostics are assessed by demonstrated impact, under the roadmap's one-batch time box: answer integrity, reliability, cancellation, cleanup and security. A browser error alone is not a permanent product-wide gate, but an unexplained event cannot be silently suppressed. Any change to the current transport gate requires recorded evidence and corresponding tests; full provider qualification remains mandatory.

## Comparators

Before scoring, record the actual named ChatGPT and Gemini models/modes, account tiers, date, browsing/file settings and available tools. Product names alone are insufficient. If a product conceals its model version, state that limit and preserve the observable configuration. Do not invent current model names from old notes.

Give each system equivalent source material and task instructions; distinguish product-level comparison from model-only tests. PrivateAI's disclosure approvals are exercised rather than removed for speed. Compare task success, rubric dimensions, user corrections, time and cost. Randomize answer order for human review; retain source evidence and disagreement adjudication. Use synthetic or non-sensitive inputs only. If comparator access is unavailable, mark comparative evaluation blocked rather than claiming competitiveness.

## Broader evidence before platform expansion

The initial 24 held-out cases authorize no broad everyday-competitiveness claim. Before a fuller-platform investment decision, use at least 120 fresh distinct conversations, 20 per family, including varied document origins/layouts, realistic corrections, ambiguity, conflicting sources, noisy screenshots and boundary cases. The minimum provides coverage, not statistical proof. Repeat selected cases for variability but count them separately from coverage.

Include prospective user-authored tasks collected after the implementation is frozen, with consent and privacy-appropriate inputs. Observe 8-12 prospective users across more than one session; this is qualitative usability and demand evidence, not market validation.

Expansion requires: no unresolved serious errors or security failures; case-specific critical assertions pass; no recurring material defect in a supported family; and comparative results establish the agreed usefulness threshold. Pre-register a paired task-success noninferiority margin of 5 percentage points against each named comparator: at most one additional failed task per 20 is the proposed maximum tolerated practical quality loss. Report paired confidence intervals and absolute success counts; equal performance on difficult tasks is not sufficient if required product workflows remain unreliable.

Use a one-sided 95% confidence bound for the aggregate paired task-success difference. If the lower bound is below -5 percentage points, evidence is insufficient to assert noninferiority. Add fresh cases when justified or report the uncertainty; do not relax the margin after seeing results. The initial 120 cases may be insufficient. Report family results and do not infer per-family noninferiority from an aggregate result. A narrowly scoped engineering investment may still be considered with explicit uncertainty, but it is not a broad competitiveness claim.

Human demand evidence remains separate: users understand the privacy boundary, complete useful tasks and choose to return. Do not infer willingness to pay from test scores, stated interest or one successful session. Further spending or product expansion needs a distinct investment decision.

## Provider qualification: mandatory live gate

Tinfoil is a candidate, not yet qualified. Privatemode remains an alternative requiring its own qualification. Verify actual model, deployment, terms, prices and licenses before adopting either.

Required evidence:

- Browser verification tied to approved software and encryption keys, with documented freshness, expiry, revocation and trust-root behavior.
- Protected router-to-worker processing, including CPU/GPU boundaries, transfer protection, caching, moderation, diagnostics and billing outputs.
- Retention and logging behavior supported by current primary sources and available code/configuration evidence. Network traces alone cannot prove absence of server retention.
- Real browser-to-gateway-to-provider encrypted chat with synthetic inputs, real streaming, follow-ups, cancellation and measured usage.
- Gateway network/body inspection demonstrating no plaintext private content outside the approved confidential path; no private data in HTTP metadata.
- Negative checks for wrong keys, invalid/unapproved evidence, stale evidence as applicable, altered ciphertext, outages, interrupted streams and key rotation. Fault-injected checks are labelled separately from real provider behavior.
- Provider-side external tools disabled; no implicit routing to ordinary unprotected inference.
- Real usage and billing reconciliation, supplier credential protection, and externally enforced spending controls appropriate to the service.

Stage A stays BLOCKED until these checks support the selected live path. A green mocked suite, installed SDK, success response from ordinary HTTPS, or provider marketing statement is insufficient. Essential unresolved protection gaps block qualification; report them rather than weakening the claim.

## Authorization and operating rules

Implementation is authorized within the agreed scope. Routine reversible decisions, debugging and relevant testing proceed autonomously once repository access works. Preserve existing work; use the existing checkout appropriately and do not create a worktree unless requested.

No new paid service is authorized. Routine synthetic debugging proceeds within the approved batch and the confirmed USD 2 cumulative account cap. Ask before deposits, subscriptions, a higher cap, material privacy changes or real-user-data use. Secure credentials belong in protected local storage/process settings, never chat or tracked files. Independent review and deployment are not implied by local development authorization.

The 6-10 engineering-week range is an estimate, not a required duration. Advance by working outcomes; simplify unnecessary components while retaining essential privacy boundaries. A passing evaluation informs the next investment decision and does not certify production readiness or the future platform.
