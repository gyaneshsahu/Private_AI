# PrivateAI delivery roadmap

**Working draft — direction accepted; detailed gates under review.**

Updated 5 October 2026 · Owner: project founder; implementation: Codex.
This is not yet an approved backbone for the entire product.

The product goal is a general-purpose conversational assistant targeting
ChatGPT/Gemini-level quality across most everyday tasks, with strong, verifiable
privacy. That quality is a target to demonstrate, not a current claim. Documents,
drafts and controlled research are initial evaluation workflows, not final scope.

UI direction: clean, familiar and conversation-first, with PrivateAI's own identity.
Integrate documents/research naturally; show clear privacy indicators and reveal
advanced controls when relevant. Keep desktop/mobile workflows free of clutter and
technical jargon.

The next product milestone is a usable, bounded invited-user trial. It is **not
ready for real private-data trials today**. Useful local document and encrypted
workspace workflows are available; full provider qualification and trial quality/operational gates remain blockers. This roadmap tracks outcomes and evidence,
not dates inferred from engineering estimates.

## How to use this plan

Work through the ordered backlog below, one coherent outcome at a time. If an item
is blocked, advance its next independent product item. Update its status, evidence,
remaining limitations and this change log in the same commit as the implementation.
Preserve stable IDs so progress and changed priorities remain traceable.

Codex may change implementation, split tasks or reorder independent work when new
evidence supports a better approach. Record why; do not silently erase failures or
mark tests as live evidence. Changes to supported scope, privacy promises, spending
limits or real-user-data use require the founder's decision. This working roadmap must evolve with evidence; it is not a reason to preserve a disproven design.

Sources of requirements: [PRD](PRD.md), [architecture](ARCHITECTURE.md),
[acceptance contract](acceptance.md). Operational evidence:
[Windows compatibility](windows-compatibility-failure.md),
[provider chain review](provider-chain-review.md),
[restricted deployment](development-deployment.md), [validation](validation.md).
Current user authorization is **USD 2 cumulative account cap**, auto-recharge off;
older USD 10 planning/authorization text does not increase that cap. Routine work
within approval proceeds autonomously. No new subscription, deposit or paid hosting
is authorized. Original consumed claims and local evidence must remain intact.

Status vocabulary: **DONE (local)** means implemented and tested locally;
**IN PROGRESS** has working pieces but incomplete exit evidence;
**BLOCKED** names an unmet dependency; **NEXT** is actionable; **LATER** is deferred.
Local DONE does not imply provider qualification or deployed release.

## What works today

| Capability | Actual implementation/evidence | Limits |
| --- | --- | --- |
| Text/PDF/printed-English screenshot extraction | `src/documents.ts`, extraction worker; real browser PDF and OCR tests | Local processing, editable source/page text; complex-layout fidelity and real-phone performance need evaluation |
| Context, corrections and citations | `src/conversation.ts`, `src/Answer.tsx`; bounded selection, partial-answer exclusion, source snapshots and citation tests | One fresh live two-turn case passed narrow review; broader grounding quality remains unproven |
| Exact decimal calculator | `src/calculator.ts`, browser workflow | Explicit user calculations; no claim that model arithmetic is tool-verified |
| Research approval | `server/research.ts`, session-bound single-use grants, SSRF/redirect/expiry tests and UI disclosure preview | Search needs configured service access; external privacy/fees stay separate; no automatic agent browsing |
| Temporary and encrypted workspaces | `src/vault.ts`, WebCrypto/IndexedDB tests, save/lock/reload/delete browser workflow | Manual local snapshots, no recovery or cloud sync; device backups outside deletion guarantee |
| Saved unsent drafts | `src/App.tsx`, optional `Conversation.draft`; new complete browser workflow | Explicit save only; draft excluded from inference until submitted; reload clears unsaved work |
| Browser verification and encrypted transport | Maintained Tinfoil/EHBP libraries; pinned router verification, encrypted fault fixtures and real synthetic answers | Full chain NOT_PASSED; Chromium no-store abort has a scoped, tested completion assessment |
| Restricted hosting foundation and individual trial access | `server/deployment.ts`, `server/invite-access.ts`, SQLite registry, real HTTP/browser identity tests | Opt-in expiring invitations, sign-in/logout, revocation and account-scoped encrypted vaults; single process, no recovery/sync, current batch not deployed |
| Evaluation infrastructure | 24 development + 24 reserved fixtures, integrity checks, isolated experiment claims and review summaries | Fixture integrity is not model-quality evaluation; reserved/comparator execution remains pending |

## Ordered path to the invited-user trial

| ID / priority | Outcome and status | Dependencies and concrete exit evidence |
| --- | --- | --- |
| T1 — first | **DONE (local): cumulative streaming usage parser** | Accept repeated/nondecreasing output snapshots, never sum them, require final accounting when usage starts. Reject regressions, invalid totals, malformed/truncated streams and incomplete answers. Encrypted fragmented-browser regression passes; live fixed adapter returns `4`. |
| T2 — first | **DONE (scoped compatibility): abort impact assessed** | Closed within one focused batch: actual relay comparison isolates Chromium’s terminal abort to `Cache-Control: no-store` while all bytes arrive. Truncation/cancellation still fail. Keep no-store and raw failure events; accept only validated client completion, gateway finish, matched no-store HTTP response and zero cancellations. Fresh live compatibility returned `4`; full-chain privacy and broad reliability remain separate. See transport impact review. |
| W1 — parallel | **DONE (local): save and resume a document workspace with its draft** | Import, correct source text, compose unsent draft, explicitly encrypt/save, lock, reload, unlock and reopen both. Cancel/confirm replacement of unsaved work; delete clears saved record/current draft. Browser storage inspection finds no plaintext canaries; no inference or research is triggered by this flow. |
| W2 — independent workflow | **DONE: scoped interruption recovery** | Real UI tests cover stop, explicit retry, branching/citations, new conversation during multi-file import and research preparation/execution, lock during real encryption, and cross-tab lock during unlock. Stale callbacks cannot restore cleared context; cancellation stops the next file/request. See [recovery evidence](workspace-recovery-review.md). Current-adapter live document correction passed T3; production provider gate remains separate. |
| T3 | **DONE (narrow live case): document/follow-up workflow** | Fresh current-adapter run `windows_20261005_invoice_2` returned 95/19/114 EUR then 90/18/108 EUR, reduction 6 EUR, with matching citations and explicit distinction between source discount and user correction. Both streams independently validated complete; durations 4.39/4.20 s. Agent review supports this one case only, not broad quality or privacy qualification. |
| Q1 — parallel evidence work | **BLOCKED: qualify the complete provider path** | Current [provider evidence review](provider-evidence-update.md) identifies version-specific browser freshness and worker/build binding gaps; supplier artifact questions are drafted. Existing per-request cache isolation is tested. Router-to-worker/GPU binding, software/build identity, freshness/revocation/rollback, caching/retention/diagnostics/moderation/egress and billing controls still require deployment evidence. Complete live/negative checks in the acceptance contract. Do not invent a passing report or accept a changed pin automatically. |
| E1 | **IN PROGRESS: development harness and reviewed failures** | Freeze implementation/rubric; run development cases, fix failures, then preserve reserved separation. Keep 24 held-out cases × 3 runs as the planned coverage, using the founder-approved [trial thresholds](trial-quality-gate-proposal.md): 65/72 overall and 10/12 per family, with critical/serious blockers and material-failure recurrence rules. Preserve the per-task rubric and every failure; replace any reserved case used for tuning. Plan costs against remaining authorized balance before starting this larger batch. |
| U2 — parallel | **DONE (local): readable conversation answers and everyday starters** | Markdown tables/lists/code/math, retained source citations, local assets, inert external content, and desktop/mobile coverage. Writing/planning starters prepare editable drafts without automatic sending. [Everyday review](everyday-development-review.md). |
| U1 — parallel | **IN PROGRESS: local guide, individual access and trial runbook** | Founder selected PrivateAI-only invitations. Local implementation covers one-use redemption, expiring sessions, per-user revocation/limits and encrypted workspace separation; real browser tests exercise two identities and logout/relogin. [Trial runbook](invited-trial-runbook.md) documents operation and limits. Hosted TLS/proxy/security review, recovery design and real-phone/user observation remain open. No private-content analytics or automatic feedback uploads. |
| R1 | **BLOCKED: open the bounded invited-user trial** | T2/T3/W2/Q1/E1/G6/U1 complete, actual cost reconciled, deployment validation tied to release, the reviewed severity/family quality gate met and no unresolved critical or essential security failures. Founder authorizes audience, hosting/privacy boundary and real-user-data scope. Supported scope and known minor limitations are explicit. |

### T2 disposition at the time-box boundary

- **Functional, reliability or security defect:** keep the affected capability blocked; record the reproducer, impact and bounded repair task.
- **Demonstrated instrumentation-only discrepancy:** retain the event and evidence, revise the specific transport criterion in code/tests/docs, and proceed only when application completion, truncation detection, cancellation and resource cleanup are independently supported. A correct answer alone is insufficient evidence.
- **Impact still unknown:** record uncertainty and block only dependent capabilities. Schedule another investigation only with a new hypothesis or evidence, not an unchanged probe. Continue W2, general-assistant fixtures and onboarding in parallel.

The time box does not authorize another paid call, weaken provider qualification or automatically convert an unknown into a pass. Existing runtime gates remain unchanged until a supported disposition is implemented and tested.

## General-assistant delivery track

Documents and drafts are entry workflows, not the product's destination. Track these
capabilities alongside the transport and workspace work, using the same six-family
rubric and privacy boundaries. Fixture preparation and UI work can proceed now;
live evaluation depends on transport readiness and bounded authorization, and real
private-data use depends on Q1.

| ID / sequence | Everyday outcome | Exit evidence |
| --- | --- | --- |
| G1 — parallel now | **IN PROGRESS:** Writing and revision: draft, change tone/length, preserve facts and user corrections | Earlier baseline adds unsupported embellishments. A fresh Gemma development case preserves the thanks/move facts and removes the requested detail without inventions; narrow agent review only. Broader development and human grading remain. See [development review](development-family-review.md) |
| G2 — alongside G1 | **IN PROGRESS:** Explanation and planning: explain at the user's level, compare choices, revise a practical plan | Live planning exposed length-limit failures and a time-budget error. A larger bounded profile completed but did not pass quality. Allocation-first interval guidance repaired observed totals in two fresh development conversations, but review timing and concision still fail. [Planning evidence](planning-intervals-review.md). A gross/net explanation development case preserved its core distinction but added confusing specifics; broader review remains pending. No unchanged paid repeats |
| G3 — alongside G2 | **IN PROGRESS:** Personal discussion: reflect stated preferences, ask useful clarifying questions, avoid unsupported assumptions | GPT-OSS single-incident correction retains the correction but invents workplace details; prompt changes only partly help. One matched Gemma candidate case uses placeholders correctly, with minor overconfident advice; human/broader review remains open. [Development review](development-family-review.md). Not passed |
| G4 — integrated with T3 | **IN PROGRESS:** Calculations and document questions: combine evidence, citations and exact calculations | T3 correction evidence plus a fresh Gemma invoice case returns the correct facts and ignores embedded upload instructions. Page-qualified citations now open retained sources, with model-claimed pages distinguished from source metadata. Broader grounding and human review remain; distinguish model reasoning from actual calculator use |
| G5 — after core follow-ups | **IN PROGRESS:** Research-assisted everyday decisions with explicit disclosure approval | Context now offers direct source inspection including URL/retrieval time before inference. Browser rehearsal covers approval, synthetic retrieval, inspection, encrypted save/lock/reopen and draft isolation. Live service retrieval plus grounded synthesis/follow-up remain open; injected content cannot authorize network actions |
| G6 — before trial scope is frozen | Review coverage across all six task families | Publish supported capabilities and known limitations per family; any narrower trial scope is explicit, not an implicit pivot to a document-only product |

G1–G6 feed E1 and U1. R1 requires G6's scope review; one successful invoice or saved
draft cannot establish general-assistant readiness.

While Q1 is unresolved, operator rehearsal uses synthetic inputs and local workflows.
The production inference gate remains enforced on client and gateway. Do not add a
UI bypass or describe a synthetic harness as private-user trial readiness. A proposed
non-sensitive-only invited trial would be a separate explicit scope/privacy decision,
not an automatic workaround for Q1.

## Trial execution and later public launch

| ID | Work after the readiness gates | Exit evidence |
| --- | --- | --- |
| I1 | Invite a small named cohort; observe complete supported tasks across sessions | Users can understand disclosure/save behavior, complete tasks and recover; preserve consent and manual reviewer decisions. Avoid collecting private transcripts by default. |
| I2 | Reliability, cost and usefulness measurements | Existing acceptance target: ≥100 live short-chat requests across periods and one/three concurrent requests, latency distributions and uncertainty; reconcile failed as well as completed task costs. This is future work, not authorized additional spend. |
| I3 | Comparative and demand evidence | Record exact ChatGPT/Gemini configurations and randomize review. Before broad competitiveness claims: ≥120 fresh distinct tasks (20/family), 8–12 prospective users over multiple sessions, and the pre-registered noninferiority analysis. No aggregate score hides a weak family; usability does not prove willingness to pay. |
| L1 | Public service security and identity | Individual authentication/invite revocation, tenant/session isolation, abuse/rate controls, secure credential rotation and independent security review. Review hosting/CDN/log retention and trusted client delivery. |
| L2 | Sustainable operations | Enforced service spending limits, complete per-task cost accounting, observability without private content, incident response and rollback, dependency/update policy, reviewed backup/deletion guarantees. Use shared atomic state before scaling beyond one instance. |
| L3 | Public release decision | Supported quality/reliability/security evidence, accurate privacy claims and terms, accessibility/device coverage, support process, and explicit commercial/hosting approval. Launch only the evaluated scope. |

Cloud sync, automatic long-term memory, anonymous access, family sharing, autonomous
account actions, voice/video, general vision, model routing and custom GPU hosting
remain deferred per the PRD. Reconsider them during trial reviews when repeated user
needs or measured capability gaps justify the work, not merely because a feature is
available. Reconsideration starts a design review; it is not implementation approval.

| Deferred area | Evidence needed to reconsider |
| --- | --- |
| Cloud sync, memory and family sharing | Repeated cross-device/continuity needs; explicit consent, access isolation, deletion/recovery design and affordable operation |
| Anonymous access | Demonstrated demand plus a credible identity/metadata threat model, abuse controls and sustainable entitlement design |
| Voice/video and general vision | Repeated tasks that text/local extraction cannot serve; modality quality/accessibility evidence and reviewed capture, retention and provider boundaries |
| Autonomous account actions | Repeated valuable workflows; scoped permissions, review/confirmation, auditability and recovery from incorrect actions |
| Model routing or custom GPU hosting | Measured quality, reliability, privacy or cost limitations of the current path; benchmarked alternatives and a viable full-chain security/operating model |

Do not expand scope to avoid failing current requirements. Record the need, alternatives,
expected benefit, risks, cost and founder decision before promoting a deferred area.

## Evidence and change log

- 5 October 2026: bounded trial authentication work to two concurrent password
  checks across sign-in and redemption. The existing attempt limit now runs before
  parsing, including oversized bodies. Busy, storage-failure and malformed-form
  paths retain usable cleared forms without reflecting submitted credentials or
  raw errors. Real HTTP regression covers saturation, slot recovery after failure,
  unused invitation preservation, subsequent successful sign-in and oversized-body
  rate limiting. Hosting-edge abuse review and multi-instance controls remain open.
  Added best-effort browser reload/navigation warnings for unsaved work, with
  cancellation preserving the draft and successful encrypted save removing the
  warning. Security-triggered navigation bypasses the warning; no autosave or
  mobile/crash recovery guarantee is introduced.
  Validation: 130 unit/integration tests, 15 production browser workflows,
  typecheck, build and evaluation-fixture integrity passed. The initial reload
  test awaited a cancelled navigation; corrected browser interaction and the full
  browser rerun passed. Provider and human quality gates remain unchanged.

- 5 October 2026, founder review: overall direction accepted; detailed gates remain
  under review. Added a bounded T2 impact assessment, pre-evaluation quality-gate
  review, G1–G6 general-assistant track and explicit deferred-feature reconsideration
  criteria. Privacy boundaries, evidence retention and parallel development remain.


- 5 October 2026: roadmap created from requirements and inspected code. T1's fix
  landed in `f48c943`; this batch extends its encrypted browser regression to the
  observed repeated usage pattern. New claim `windows_20261005_trial_compat_1`
  records a complete correct answer but unresolved relay failure; its consumed
  permit and result stay in ignored `.local/experiment-runs/`.
- 5 October 2026: W1 closes the unsent-draft gap discovered during roadmap review.
  Snapshots remain backward compatible (missing `draft` opens as empty). Local
  validation: 96 unit/integration tests, nine browser workflows, typecheck, build
  and fixture integrity. These are local evidence; no new hosted release is claimed.

- 5 October 2026: T2 closed within its investigation time box using a controlled
  actual-relay header comparison, not removal of the privacy header. T3 passed a
  narrow fresh live review. W2 chat recovery now has real UI fixture coverage.
  See [transport impact review](transport-impact-review.md). No broad competitive
  quality, full provider qualification or invited-user readiness is implied.

Next: address planning constraints and prepare trial onboarding; progress
G1–G6 and U1 independently while Q1 needs supplier evidence.

- 5 October 2026: U2 implemented with maintained local rendering integrations;
  G1/G2 gained fresh synthetic live development evidence, including preserved
  material planning failures. The general-assistant goal and conversation-first UI
  direction are now explicit. Quality proposal sent for founder review; not yet approved.

- 5 October 2026: founder approved the 65/72 overall and 10/12 family trial floors. Updated the executable human-review gate with severity, recurrence and evidence checks. Completed W2 cancellation/locking race coverage; see [validation](workspace-recovery-review.md). Planning accuracy and full provider qualification remain open.

- 5 October 2026: tested allocation-first planning on the original presentation task and a fresh sketching transfer case (four bounded live attempts). Totals improved; semantic review-time and verbosity failures remain, so G2 is not passed. Added local onboarding, corrected dialog focus return and documented individual-access/incident prerequisites.

- 5 October 2026: reviewed newly accessible supplier documentation against pinned browser verifier 1.2.2; kept freshness/worker gates open with concrete artifact questions. Verified existing cache-secret isolation. Brought production relay completion cleanup in line with the experiment relay and added completion/cancellation/expiry HTTP tests.

- 5 October 2026: enabled bounded execution of all 24 frozen development cases and exercised their state/source wiring offline. Ran explanation and personal-discussion cases, then a separately permitted targeted personal regression. All streams completed, but material answer-quality failures remain. Agent-review sidecars are explicit non-human evidence; reserved evaluation remains unrun.

- 5 October 2026: public model pricing became accessible from Windows. A matched Gemma workplace case and separate scheduling transfer showed promising narrow outcomes, with remaining minor findings. Added model/profile-aware evidence identities; no operational model switch or privacy qualification.

- 5 October 2026: two fresh candidate writing/document cases completed with acceptable narrow agent reviews. Added explicit copying of completed answers and fixed page-qualified source inspection from the observed response. Clipboard behavior is disclosed in the guide; partial replies stay disabled. Validation: 113 unit/integration tests, eleven production browser workflows, typecheck, build and fixture integrity. Five distinct frozen development cases have live evidence; broad quality, human review and Q1 remain open.

- 5 October 2026: made retained sources directly inspectable from Context, including research provenance. Added a browser workflow spanning explicit URL approval, synthetic retrieval, source inspection and encrypted persistence while preserving an unsent draft. Real approval endpoint is exercised; retrieval is intercepted, so this is not live research-service or model-quality evidence. Typecheck/build and 113 unit/integration tests pass. Eleven existing browser workflows passed; the new twelfth workflow passed after correcting an ambiguous status locator. Private-data qualification and individual trial access remain blocked as before.

- 5 October 2026: replaced unchecked research-response casting with runtime validation before inserting context. Reject malformed/missing provenance, non-HTTPS or credential-bearing URLs, oversized source text/results and duplicate IDs within results or existing attachments. Preserve accepted text exactly and mark new attachments as research. Browser negative coverage proves malformed results leave the draft/context unchanged with no retry. Full suite: 116 unit/integration tests and 13 browser workflows; final source-fidelity regression and typecheck/build also pass. This validates the response boundary, not supplier truthfulness, live research availability or full provider qualification.

- 5 October 2026: validated the search-provider response before constructing excerpts. Malformed fields, error envelopes, missing web-result envelopes, invalid URLs and empty/oversized rendered excerpts fail the request without partial context or automatic retries. Explicit empty result arrays remain valid; at most five sources are returned. Adapter tests verify exact query-only requests, excerpt labelling and compatibility with client validation using synthetic upstream responses. Full suite: 119 unit/integration tests plus typecheck/build; the final missing-envelope refinement passed targeted tests and typecheck. Live search credentials/service validation and grounded synthesis remain open. No privacy or model-quality gate is marked passed by these tests.

- 5 October 2026: connected retained web sources to page retrieval. The Context action prepares the exact URL in Research, clears prior disclosure proposals and requires review plus a fresh approval before retrieval. Search excerpts remain separate from full-page evidence. A complete browser fixture checks search approval, transition without requests, cancellation, separate page approval, both retained sources and draft isolation. All 14 browser workflows pass; typecheck/build pass. The unit/integration run passed 118/119 with one Chromium diagnostic timeout; its six-test file passed in isolation without code changes. The intermittent diagnostic is recorded rather than hidden or used to weaken transport criteria. Search availability and live synthesis are still unqualified.

- 5 October 2026: reprioritized toward trial blockers at the founder's request. Prepared the supplier evidence request for both actual candidates (GPT-OSS-120b and Gemma4-31b), without sending it. Four fresh matched development conversations expand bills/research coverage: both models pass the narrow percentage case; both have preserved material research findings. Seven distinct development cases now have evidence, with Gemma represented in all six families but no broad pass. Implemented PrivateAI-only invitations with maintained session middleware, one-use registration, expiry/revocation, request limits and account-scoped encrypted storage. No real invitations, deployment or private-data gate change. Search refinements now require a demonstrated defect or live-integration finding.

  Validation for this trial-blocker batch: 125 unit/integration tests (including
  the real two-identity browser flow), 14 production browser workflows, typecheck,
  build and fixture integrity passed. Hosted cookie flags and active-response
  revocation have local HTTP evidence; actual hosted operation and security review
  remain open. The next quality work targets observed temporal/purchase-assumption
  defects. Q1 still needs supplier artifacts; the prepared request is ready for
  the founder to send through the provider's support channel.

- 5 October 2026: addressed the observed research failures with request-date context,
  explicit retrieval/publication distinction and guidance against invented purchase
  assumptions. Offline tests cover saved-conversation date rollover, untrusted
  source dates and the unchanged compatibility input cap. Two separately permitted
  targeted live regressions show partial repair: Gemma removes stale “latest” years;
  GPT-OSS retains its unsupported replacement-battery assumption. Preserve that
  material finding and continue toward fresh transfer/human evaluation, not repeated
  unchanged prompts. Q1 and hosted trial validation remain open.
  Validation: 127 unit/integration tests, typecheck and production build passed.

- 5 October 2026: improved the individual invitation workflow after finding that
  rejected sign-in attempts left users on a plain error page. Errors now retain
  usable forms with cleared secrets and generic recovery guidance. Added responsive
  PrivateAI styling under hash-based CSP, without scripts or external assets.
  Browser coverage includes rejected-code recovery into successful registration,
  no reflected credentials, desktop/mobile overflow and applied styles. Hosted
  access validation and later real-user usability review remain open.
  Validation: 127 unit/integration tests, typecheck and build passed; invitation
  browser tests include the complete two-user workspace-isolation workflow.

- 5 October 2026: found and repaired an active-response sign-out gap in trial
  access. Existing revocation closed streams, but logout previously only denied
  new requests. Active responses now check their login session still exists;
  sign-out terminates that session's response within approximately one second
  while other logins remain usable. Store/registry check failures close the
  response, and failed session deletion no longer reports successful logout.
  Real HTTP tests cover active logout, independent sessions and active revocation;
  invitation browser and hosted-cookie regressions also pass.
  Validation: all 127 unit/integration tests and typecheck passed. Provider
  qualification, human quality review and actual hosted validation remain open.

- 5 October 2026: completed a larger trial-operations batch. Added persistent
  operator pause/resume, credential-free invitation status and honest unknown-ID
  revocation errors. Reopen tests retain pause, revocation and per-user counters;
  HTTP tests verify separate user quotas, resume without reset and response closure
  on pause/expiry. Added `npm run trial:check`; browser rehearsal explicitly clears
  ambient credentials, qualification and invitation-database configuration.
  Full rehearsal passed: 129 unit/integration tests, 14 production browser flows,
  typecheck/build and fixture integrity. Two fresh Gemma development transfer cases
  extend coverage to nine distinct cases: research comparison is narrowly acceptable;
  accessible planning retains a material agent finding about assumed infrastructure
  and showed 13–16-second turns. No family-quality or private-data gate is passed.
  Pending invitation recovery is documented as revoke/reissue; registered-account
  and vault recovery remain unimplemented. Q1 still needs supplier artifacts and
  release readiness still needs human quality and actual hosted validation.

- 5 October 2026: repaired cross-tab login transitions. A new login marker lets
  older tabs detect replacement sessions even for the same account, clear their
  in-memory workspace and reload. Access probes are serialized, cancelled on
  cleanup and refreshed on visibility/focus; same-session status refreshes current
  request credentials. Account-scoped vault lock notifications prevent unrelated
  accounts from invalidating each other, and obsolete-tab cleanup preserves the
  newer login's unsaved draft. Browser coverage reopens the previous encrypted
  snapshot after the transition. Background browser timer throttling still limits
  how quickly an inactive screen can clear; server access checks remain enforced.
  Provider qualification, human quality review and actual hosted validation remain
  open; this change does not promote any privacy or quality gate.
  Validation: `npm run trial:check` passed all 129 unit/integration tests,
  14 production browser workflows, typecheck/build and fixture integrity.
