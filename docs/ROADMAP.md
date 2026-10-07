# PrivateAI delivery roadmap

**Working draft — direction accepted; detailed gates under review.**

Updated 7 October 2026 · Owner: project founder; implementation: Codex.
This is not yet an approved backbone for the entire product.

The [maintained readiness checklist](READINESS.md) is the authoritative current
status ledger. This roadmap defines priorities and stable IDs; dated reviews retain
evidence. Update checklist rows whenever implementation or evidence changes.

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
within approval proceeds autonomously. The existing upgraded Render service and
1 GB disk are approved; no additional subscription, deposit or hosting upgrade
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
| Restricted hosting foundation and individual trial access | `server/deployment.ts`, `server/invite-access.ts`, SQLite registry, real HTTP/browser identity tests | Opt-in expiring invitations, sign-in/logout, revocation and account-scoped encrypted vaults; single process; deployed hosted access/isolation/restart checks and same-disk paused recovery staging passed; off-disk recovery and real-device review remain open |
| Evaluation infrastructure | 24 development + 24 reserved fixtures, integrity checks, isolated experiment claims and review summaries; 72 reserved conversations collected | Four material writing failures confirmed by founder; writing at most 8/12 against 10/12 required, quality NOT_PASSED; no competitive parity established |

## Ordered path to the invited-user trial

Current status and completion criteria: [authoritative readiness checklist](READINESS.md).
The [earlier capability review](trial-readiness.md) is historical evidence, not a
second current ledger. Existing IDs and acceptance floors are preserved.

The checklist is not 42 tasks that all precede UI work. Complete all **T** requirements
before the agreed invited-user trial; **P** requirements precede public launch;
**O** items remain deferred unless justified. High-impact items determine order,
not permission to omit other trial requirements. Functional accessibility and mobile
usability are trial work, while extensive visual polish follows safety, model
reliability and necessary recovery progress; it need not await optional features
or every externally blocked supplier reply.

Execution priority now supersedes the historical table order:

1. **S1 + E1/G1–G4:** paired safety/harmless coverage, audience boundaries, confirmed
   fresh-writing findings, reasoning/coding scope and a justified fixed candidate.
   Freeze safety and answer policy together before fresh held-out acceptance.
2. **U1/W2/L2:** necessary recovery, off-disk backup, deletion/retention, operational
   signals and safe rollback. Advance synthetic preparation while storage decisions
   are pending; do not export authentication material without authorization.
3. **Q1/G5 in parallel:** resolve supplier privacy evidence and saved-search rights,
   then perform useful bounded live integration checks. External waits do not block
   the independent work above.
4. **U1/U2/G6/R1:** complete release-specific accessibility, actual-device workflows,
   support and truthful disclosures; fix functional defects before visual polish.
   Extensive UI redesign remains deferred until these dependencies advance.

| ID / priority | Outcome and status | Dependencies and concrete exit evidence |
| --- | --- | --- |
| T1 — first | **DONE (local): cumulative streaming usage parser** | Accept repeated/nondecreasing output snapshots, never sum them, require final accounting when usage starts. Reject regressions, invalid totals, malformed/truncated streams and incomplete answers. Encrypted fragmented-browser regression passes; live fixed adapter returns `4`. |
| T2 — first | **DONE (scoped compatibility): abort impact assessed** | Closed within one focused batch: actual relay comparison isolates Chromium’s terminal abort to `Cache-Control: no-store` while all bytes arrive. Truncation/cancellation still fail. Keep no-store and raw failure events; accept only validated client completion, gateway finish, matched no-store HTTP response and zero cancellations. Fresh live compatibility returned `4`; full-chain privacy and broad reliability remain separate. See transport impact review. |
| W1 — parallel | **DONE (local): save and resume a document workspace with its draft** | Import, correct source text, compose unsent draft, explicitly encrypt/save, lock, reload, unlock and reopen both. Cancel/confirm replacement of unsaved work; delete clears saved record/current draft. Browser storage inspection finds no plaintext canaries; no inference or research is triggered by this flow. |
| W2 — independent workflow | **DONE: scoped interruption recovery** | Real UI tests cover stop, explicit retry, branching/citations, new conversation during multi-file import and research preparation/execution, lock during real encryption, and cross-tab lock during unlock. Stale callbacks cannot restore cleared context; cancellation stops the next file/request. See [recovery evidence](workspace-recovery-review.md). Current-adapter live document correction passed T3; production provider gate remains separate. |
| T3 | **DONE (narrow live case): document/follow-up workflow** | Fresh current-adapter run `windows_20261005_invoice_2` returned 95/19/114 EUR then 90/18/108 EUR, reduction 6 EUR, with matching citations and explicit distinction between source discount and user correction. Both streams independently validated complete; durations 4.39/4.20 s. Agent review supports this one case only, not broad quality or privacy qualification. |
| Q1 — parallel evidence work | **BLOCKED: qualify the complete provider path** | Current [provider evidence review](provider-evidence-update.md) identifies version-specific browser freshness and worker/build binding gaps; supplier request is sent and reply pending. Existing per-request cache isolation is tested. Router-to-worker/GPU binding, software/build identity, freshness/revocation/rollback, caching/retention/diagnostics/moderation/egress and billing controls still require deployment evidence. Complete live/negative checks in the acceptance contract. Do not invent a passing report or accept a changed pin automatically. |
| E1 | **BLOCKED acceptance; development evidence available** | Reserved writing failed with a best possible 8/12; preserve that result. The fresh-writing packet is founder-reviewed. Validate justified safety/reliability changes on fresh development questions, then freeze a supported configuration for new held-out cases; preserve the new incomplete timeout attempts separately. Keep 24 held-out cases × 3 runs as the planned coverage, using the founder-approved [trial thresholds](trial-quality-gate-proposal.md): 65/72 overall and 10/12 per family, with critical/serious blockers and material-failure recurrence rules. Preserve the per-task rubric and every failure; replace any reserved case used for tuning. Plan costs against remaining authorized balance before starting this larger batch. |
| U2 — parallel | **DONE (local): readable conversation answers and everyday starters** | Markdown tables/lists/code/math, retained source citations, local assets, inert external content, and desktop/mobile coverage. Writing/planning starters prepare editable drafts without automatic sending. Functional accessibility/device gaps remain in the checklist; extensive visual redesign is deferred. [Everyday review](everyday-development-review.md). |
| U1 — parallel | **IN PROGRESS: hosted individual access validated; user observation pending** | Founder selected PrivateAI-only invitations. Local implementation covers one-use redemption, expiring sessions, per-user revocation/limits and encrypted workspace separation; real browser tests exercise two identities and logout/relogin. [Trial runbook](invited-trial-runbook.md) documents operation and limits. Actual hosted HTTPS/session isolation, restart persistence and same-disk paused recovery staging passed. [Actual-device observation](ui-device-test-plan.md), [off-disk backup and metadata retention](backup-retention-policy.md) remain open; proposed policies are prepared, not enforced. No private-content analytics or automatic feedback uploads. |
| S1 — before invitations | **BLOCKED: initial live evidence reveals advice-calibration risks** | [Source audit and test plan](safety-readiness-audit.md): adults-only/no explicit sexual generation approved; 18 paired two-turn safety conversations completed on a frozen policy. Founder confirms material prevention guarantees and crisis-support weakness; general intervention is implemented but two fresh attempts timed out, so effectiveness remains unverified. Complete remaining categories and streamed-prefix assessment. Human review, zero unresolved critical failures, privacy-qualified safety components and false-refusal review are required. |
| R1 | **BLOCKED: open the bounded invited-user trial** | T2/T3/W2/Q1/E1/G6/U1/S1 complete, actual cost reconciled, deployment validation tied to release, the reviewed severity/family quality gate met and no unresolved critical or essential security failures. Founder authorizes audience, hosting/privacy boundary and real-user-data scope. Supported scope and known minor limitations are explicit. |

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
| G6 — before trial scope is frozen | **IN PROGRESS:** six-family capability/limitation review prepared | [Current scope review](trial-readiness.md) separates local workflows, narrow model evidence and missing release evidence. Candidate-specific human quality and final supported scope remain open; any narrower trial scope requires an explicit decision. |

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

- 7 October 2026: final hosted navigation exposed rejection of external entry
  links. Public top-level GET navigation now reaches the sign-in page without
  creating a session; cross-site API, asset, password, iframe and POST requests
  remain denied. Real-browser regression follows both entry and direct sign-in
  links from an intercepted external fixture origin. No private-data gate changed.

- 7 October 2026: U1/R1 hosted dependency advanced with founder-approved push and
  deployment to the existing paid Render service and 1 GB `/var/data` mount.
  Clean-image CI passed after correcting Linux browser selection. Actual HTTPS
  one-use registration, secure sessions, two-account session/CSRF isolation,
  password replacement, revocation, restart persistence and paused recovery-copy
  checks passed at application commit `b7e5ea7`. Both synthetic accounts are revoked
  and access is paused. [Exact hosted evidence](trial-hosting-decision.md) distinguishes
  same-disk recovery from disaster recovery. Provider privacy, failed writing
  assessment, live-search rights, hosted vault/device observation and operating
  backup/metadata policy remain open; R1 is still blocked.

- 6 October 2026: founder reports hosting upgraded; dashboard confirms 0.5 CPU /
  512 MB compute at USD 7/month and 1 GB disk mounted at `/var/data`. The displayed
  price is compute-only, not a verified combined invoice. Render still runs
  `dbccbe0`, predating individual access. Current release publication/deployment,
  persistent registry setup and actual-host validation remain pending; privacy
  and quality gates are unchanged.

- 6 October 2026: U1 packaged individual-access rehearsal added to CI and passed
  locally against the existing validated application image with 512 MiB / 0.5 CPU,
  network disabled and an isolated synthetic volume. HTTP sign-in/password change,
  secure cookies, per-user revocation, restart session invalidation, persistent
  credentials and paused restart denial pass. No actual-host TLS or capacity pass
  is claimed. [Hosting decision](trial-hosting-decision.md) now identifies the
  recurring expense/ceiling approval as the next hosted-validation dependency.

- 6 October 2026: E1/G1 fresh writing comparison completed eight conversations /
  sixteen replies. Both Gemma thinking and GLM low narrowly meet the four new
  development tasks in agent review, with minor unsupported additions retained.
  No clear GLM advantage: freeze Gemma as development candidate, not trial release.
  Confirmed reserved writing failure remains. Estimated batch USD 0.01276740;
  cumulative local USD 0.14590545, dashboard rounded USD 0.15 / USD 2 cap.
  Offline harness covers all 39 development/supplemental fixtures; unscored packet
  source bindings and desktop/mobile layouts pass. See [comparison](writing-failure-diagnosis.md).

- 6 October 2026: founder clarified the four reserved priority scores are their
  own review; source-bound human grades preserve agent disagreements. E1 writing
  fails the 10/12 floor (maximum 8/12). A fresh four-question, two-candidate writing
  development comparison is prepared with unchanged answer policy, plus an
  authorized-commitment control. Brave/Exa/Tavily emails are reported sent and
  awaiting replies; no duplicate supplier outreach or activation is needed.

- 6 October 2026: E1/G1 diagnosis preserves four failed reserved drafts and the
  founder's separately labelled AI-proposed scores; no human grades or thresholds
  changed. Six offline context reconstructions retain the policy and exact prompts;
  existing development evidence also shows unsupported commitments. See
  [writing diagnosis](writing-failure-diagnosis.md). G6 now has a
  [five-provider terms comparison](search-provider-comparison.md): no established
  eligible saved-citation offer; pursue one Brave clarification before accounts or
  adapter replacement. Provider evidence, hosted release and device checks remain
  separate blockers. General-assistant scope and roadmap IDs/order are unchanged.

- 6 October 2026: E1 reserved collection completed at frozen `bbb802e` assessment
  configuration: 72 conversations, 144 replies and matching verifications, estimated
  USD 0.07035160 within the USD 0.40 allocation and existing USD 2 account cap.
  Four source-bound agent writing failures await human adjudication; if confirmed,
  writing's best possible 8/12 misses its 10/12 floor. No quality pass, prompt
  tuning or retry. A focused four-conversation packet and full 72-run packet passed
  source/layout checks. [Results and next review](gemma-release-evaluation-plan.md).
  Validation: 162-test full suite, final targeted reserved-evidence tests,
  typecheck/build, frozen fixtures and actual container smoke/persistence passed.

- 6 October 2026: U1 clean-export image build and packaged smoke passed at
  `bbb802e`; synthetic named-volume data retained password replacement,
  revocation and pause across three non-root, network-disabled containers.
  Actual hosted TLS/storage/device validation remains separate and unpaid hosting
  is not assumed durable. G5 inspection found a concrete search retention-rights
  dependency in Brave's published terms, alongside the missing credential.
  [Consolidated account/API setup](trial-service-setup.md) avoids unnecessary new
  services and preserves the existing saved-source workflow pending clarification.

- 6 October 2026: E1 fixed-profile scores explicitly confirmed as founder review
  after initial AI-proposed status. All twelve acceptable with five minor findings;
  historical attribution failure retained. Gemma thinking is selected for reserved
  assessment, not private-data operation. Implemented separate frozen reserved
  permits, fixture/configuration checks, consumed repetition slots and separate
  evidence counting; no threshold or held-out fixture changes. U1 container smoke
  now selects the local Windows Docker pipe instead of a Linux-only socket.
  Docker engine is available; actual image validation follows the committed export.

- 6 October 2026: E1 attribution review completed. Preserve founder scores
  2/2/2, 1/2/2, 3/3/3, 3/3/3 and disagreements with agent grades; both meeting
  failures remain material. Executed a predeclared fixed Gemma-thinking assessment:
  twelve conversations across six families, 24 complete verified replies, 12/12
  narrowly acceptable agent reviews with five minor findings. No prompt tuning,
  retries or reserved execution. [Results](development-family-review.md) and
  [human provenance](human-development-review.md). A twelve-case consistent-profile
  human packet is ready; review precedes release selection and reserved costing.
  Q1, live research, durable hosting and actual-device gates remain open. Existing
  roadmap IDs, general-assistant scope and acceptance thresholds are unchanged.

- 6 October 2026: independent W2 document-import review fixes malformed worker
  completion leaving the UI busy after its deadline was cancelled. Runtime message
  validation now rejects invalid output and settles/cleans up the operation;
  six fault fixtures verify a later intact import still succeeds. Existing
  extraction limits and local-processing boundaries remain unchanged. Human
  attribution adjudication remains the next model-selection dependency.
  Validation: 160 unit/integration tests, 16 browser workflows, typecheck/build
  and fixture integrity passed.

- 6 October 2026: W2 saved-history recovery no longer lets one unreadable snapshot
  block all intact conversations. Decrypted structure/identity is validated; the
  UI shows intact snapshots plus an explicit unreadable count, preserving damaged
  records and avoiding a false empty-vault message. Tests cover tampered ciphertext,
  invalid encrypted structures and the open/update/delete browser workflow.
  [Recovery evidence](workspace-recovery-review.md#partial-saved-history-recovery--6-october-2026).
  No damaged-content recovery or cloud-backup capability is claimed. Human model
  review, supplier evidence and actual-host validation remain pending separately.
  Validation: 154 unit/integration tests, 16 browser workflows, typecheck/build and
  fixture integrity passed. An initial full run caught schema reserialization
  triggering a false unsaved-change warning; validation now preserves original
  snapshot representation, and the sign-out and full workflow suites pass.

- 6 October 2026: independent W2/U1 work while human attribution review is pending
  fixes queued vault deletion crossing an account switch. Save/delete capture the
  originating scope and recheck lock state at storage boundaries; stale deletion
  callbacks cannot update the cleared UI. Tests preserve same-ID snapshots in two
  accounts and exercise locking during database opening and after committed
  deletion. [Recovery evidence](workspace-recovery-review.md#account-switch-mutation-fix--6-october-2026).
  Already committed transactions are not undone by locking. Model selection and
  provider/hosted gates remain unchanged. Validation: 153 unit/integration tests,
  15 browser workflows, typecheck/build and fixture integrity passed.

- 6 October 2026: E1's next useful step is human adjudication of retained attribution
  failures. Prepared one four-conversation local review page: Gemma/GLM meeting
  reference and reservation transfer, exact source bindings, blank human scores
  and plain-text reply instructions. Verified original transcripts, desktop/phone
  layout, navigation and zero external requests. [Packet and procedure](gemma-release-evaluation-plan.md#human-work-available-now).
  Human review is now requested; do not count repeated versions of the same
  fixture as distinct-conversation recurrence. No reserved cases consumed or
  historical grades changed. Further candidate selection depends on adjudication
  and justified broader evidence; passing access rehearsals do not resolve E1.

- 6 October 2026: U1 recovery review found hosted startup could accept an invitation
  table with missing pause metadata and recreate that state as unpaused. Startup,
  backup and staged recovery now share read-only current-schema/security-state
  validation. Missing settings, malformed pause state and missing credential
  versions are rejected without source modification. Valid paused registries stay
  paused. All 150 unit/integration tests, typecheck and production build passed.
  This closes a demonstrated startup/recovery gap; actual-host durability
  and provider/quality gates remain separate.

- 6 October 2026: U1 release rehearsal now includes a reusable two-identity
  deployment check: distinct sessions, crossed cookie/CSRF rejection in both
  directions, legitimate access, isolated logout and old-cookie denial. Fixed
  cancellation probes cannot execute research; failure evidence is redacted and
  cleanup has no automatic retries. An actual application child-process test
  confirms password changes, revocation, quotas and paused access survive two
  restarts while old sessions fail. Both operator diagnostics are packaged in the
  runtime image. [Procedure](invited-trial-runbook.md#two-identity-deployment-check).
  Actual image/HTTPS-host execution and durable hosting remain pending; Q1/E1 and
  real-device gates are unchanged. Validation: 149 unit/integration tests, 15
  browser workflows, typecheck/build and fixture integrity passed. This batch
  does not repeat model experiments.

- 6 October 2026: E1 candidate comparison completed four conversations / eight
  requests with fresh permits. GLM-5.3 low effort also failed meeting attribution;
  both GLM and explicit-thinking Gemma handled a new reservation transfer. Gemma's
  accessible-afternoon regression was narrowly acceptable; prior human failure
  remains preserved. No model selected or privacy gate changed. Coverage is now
  24 frozen development plus 11 supplemental cases; reserved evaluation is unrun.
  [Exact findings and identities](development-family-review.md). Batch estimate
  USD 0.00810060; cumulative local estimate USD 0.05097165, actual charges unreconciled.
  U1 now has SQLite online backup and separate paused recovery staging, with
  synthetic tests for WAL state, password versions, revocation and quotas. Staging
  never replaces live data; current access decisions require reconciliation before
  resume. [Operator procedure](invited-trial-runbook.md#registry-backup-and-paused-recovery).
  Hosted storage/access and container execution remain unvalidated; no hosting
  purchase or deployment. Validation: 146 unit/integration tests, 15 browser
  workflows, typecheck/build and fixture integrity passed.

- 6 October 2026: completed the single policy-simplification repair cycle and a
  separate explicit-thinking comparison, eight conversations / 16 requests total.
  Neutral personal-reason handling was narrowly acceptable; planning and ambiguous
  roles still failed with unspecified thinking. Explicit Gemma thinking produced
  consistent answers on two planning cases, but attribution still failed. Stop
  further prompt tweaks; compare candidate/configuration alternatives before
  release freeze. Added two transfer fixtures without changing frozen sets or
  earlier results. [Evidence](development-family-review.md): 24 frozen + 10
  supplemental cases, eight unchanged founder grades; reserved evaluation unrun.
  Validation: 143 unit/integration tests, 15 browser workflows, typecheck/build and
  fixture integrity passed. Cumulative local estimate USD 0.04287105, not actual
  billing. Q1, hosted validation and quality gates remain open; roadmap format and
  IDs are preserved.

- 6 October 2026: executed and agent-reviewed all eight supplemental and seven
  remaining frozen cases, with 30 complete replies and fresh consumed permits.
  Six of eight supplemental and six of seven frozen cases were acceptable;
  planning contradictions, invented meeting roles and invented personal reasons
  remain material failures. Coverage now spans 24 frozen cases plus eight separate
  supplemental cases. Eight founder reviews are unchanged; reserved evaluation
  remains unrun. See [batch evidence](development-family-review.md). Corrected the
  dashboard's unset usage limit to authorized USD 2 with auto-reload off. Local
  cumulative estimate USD 0.03509105 is not actual billing. Candidate freeze remains
  blocked; existing roadmap IDs, format, scope and privacy gates are unchanged.

- 6 October 2026: incorporated the founder's eight human development reviews with
  exact scores and preserved source/configuration bindings. Seven are acceptable;
  accessible-afternoon arithmetic remains a material failure. Added eight separate
  supplemental spelling, reasoning and ambiguity fixtures; their model execution
  is UNRUN and the original frozen sets/thresholds are unchanged. See
  [human findings and coverage](human-development-review.md). General vision remains
  deferred; OCR does not establish it. Supplier reply and hosted approval/validation
  remain pending. Existing roadmap IDs and layout are retained.

- 5 October 2026: founder confirmed sending the supplier evidence email; Q1 awaits
  a reply and remains blocked. Independent U1 work adds a hosted-startup guard
  against missing, uninitialized or invalid registries and packages the invitation
  CLI in the Docker runtime. This prevents ordinary missing-path startup from
  silently creating new access state; it does not prove mount durability. Container
  validation is pending because the local Docker engine is unavailable. Paid
  hosting and human quality review remain separate outstanding decisions/evidence.
  Local validation passed: 140 unit/integration tests across 38 files, 15 production
  browser workflows, typecheck, build and frozen fixture integrity.

- 5 October 2026: focused release-readiness preparation for Q1/E1/U1/G6/R1.
  Founder will send the candidate-specific provider request; it remains unsent
  until confirmed. Prepared an eight-conversation, two-sitting human review packet
  with blank scores and exact source bindings, plus a bounded seven-case Gemma
  coverage plan. Verified Render is still Free on live commit `dbccbe0`; proposed
  paid single-instance compute plus persistent SQLite storage, with backup/restore
  and hosted access validation still required. No paid hosting approval, deployment,
  human grades or privacy/quality pass is implied. Roadmap format/IDs are preserved.

- 5 October 2026: E1/G1–G6 advanced with a predeclared matched six-family batch:
  twelve two-turn conversations, 24 completed replies, six new distinct frozen
  development cases. Both candidates handle writing, basic time budgeting and
  bill correction; GPT-OSS exposes serious ambiguous-deadline advice and material
  identifier-exclusion failure. Gemma's six narrow results are acceptable with
  minor findings, not a trial pass; earlier failures remain open. Coverage is now
  17 cases, 35 bound agent reviews and zero human reviews. New permits/results,
  failed findings and unscored review packets are retained. Reported batch estimate
  USD 0.00556685; actual billing unreconciled. Prioritize Gemma's remaining uncovered
  development tasks, without operational promotion or a claim of broad superiority.
  See [family findings](development-family-review.md) and updated
  [release dependencies](trial-readiness.md).

- 5 October 2026: reprioritized against the trial dependencies and prepared the
  six-family [capability and blocker review](trial-readiness.md) for G6. U1 now
  supports current-password-verified sign-in password changes, persisted
  invalidation of all old sessions, active-response cancellation and preservation
  of account-scoped encrypted history. This is credential maintenance, not lost
  password/vault recovery. Q1/E1/hosted validation and release approval remain
  open; no model or privacy gate was promoted. See the
  [operator runbook](invited-trial-runbook.md).
  Validation: 138 unit/integration tests across 37 files, 15 production browser
  workflows, typecheck, build and frozen fixture integrity passed.

- 5 October 2026: addressed the observed OCR overconfidence with uncertainty-first
  guidance and an explicit prohibition on acting on guessed source values. Fresh
  matched regressions show a narrow Gemma repair: ambiguity and source checking
  now precede any payment interpretation. GPT-OSS retains its initial unqualified
  payment instruction, so the defect remains open for that candidate. Source
  results, prior failures and consumed permits are preserved; unscored review
  packets are available for both. Eleven-case coverage and all human/provider
  gates remain unchanged. See [development evidence](development-family-review.md).
  Validation: 136 unit/integration tests, 15 production browser workflows,
  typecheck/build and fixture integrity passed; the original compatibility input
  cap remains intact. Offline checks do not override the GPT-OSS live failure.

- 5 October 2026: evaluated two fresh uncertainty cases. Gemma correctly leaves
  conflicting delivery notes unresolved, but initially converts ambiguous receipt
  OCR into unqualified payment advice; the follow-up correction does not erase
  that material defect. Frozen development coverage is eleven cases, with zero
  human reviews and no promoted family/provider gate. Added local unscored review
  packets with exact transcript/source/configuration binding, escaped readable
  HTML and blank human-review drafts. Real browser checks cover mobile wrapping,
  inert malicious transcript text and no external requests. See
  [development findings](development-family-review.md) and
  [review packet workflow](../evaluation/README.md).
  A separate GPT-OSS comparison also gives an overconfident initial OCR amount,
  improving only after correction. Both candidate findings remain open; model
  switching is not a demonstrated repair. Final inventory has 36 runs and 21 bound
  agent reviews, still zero human reviews. Validation passed 136 unit/integration
  tests, 15 production browser workflows, typecheck/build and fixture integrity.

- 5 October 2026: compared Gemma and GPT-OSS on a fresh cancelled-study-session
  transfer case. Both preserve 30-minute sessions and require another day for the
  missing 30 minutes; narrow agent results are acceptable with minor presentation
  findings. Earlier arithmetic failures remain blockers. Added a read-only local
  evidence inventory with result/configuration/transcript/case binding, explicit
  agent/human separation, conflict detection and legacy provenance. It reports
  nine distinct frozen development cases in Windows records after this batch;
  earlier narrative counts overstated frozen-ID coverage. Historical results and
  consumed permits remain preserved. No human or provider gate is promoted.
  See [development review](development-family-review.md) and [inventory use](../evaluation/README.md).
  Validation: 135 unit/integration tests, 15 production browser workflows,
  typecheck/build and fixture integrity passed. Final inventory refinements also
  passed focused tests/typecheck; coverage requires exact prompts and completed
  replies, and filesystem fixtures confirm source records remain unchanged.

- 5 October 2026: tightened planning guidance after an observed assumption about
  available accessibility infrastructure. One fresh bounded Gemma regression now
  states explicit conditions to confirm, but its 13:00–16:00 schedule is labelled
  four hours. Preserve the material `itinerary-total-mismatch` finding and do not
  promote G2/E1. Both replies completed; hash-bound agent review and the consumed
  permit remain separate from historical results. No unchanged retry was made.
  See [development review](development-family-review.md). Broader model comparison
  and human grading remain necessary; privacy qualification remains blocked.
  Validation: 132 unit/integration tests, 15 production browser workflows,
  typecheck/build and fixture integrity passed, including the existing 2,000-character
  compatibility bound. Offline success does not override the live quality finding.

- 5 October 2026: repaired a conversation recovery defect where retry erased a
  separately composed follow-up draft. Retry now preserves and excludes that
  draft. Edited branches expose an explicit Answer this question action without
  automatic sending or an artificial follow-up. Added pre-send context-size checks
  so an oversized selection leaves the draft/history intact and gives actionable
  recovery guidance. Browser fixture coverage verifies explicit request counts,
  draft exclusion, invalidated-answer exclusion and successful shortened sends.
  See [recovery evidence](workspace-recovery-review.md); full provider and answer
  quality gates remain open.
  Validation: 132 unit/integration tests, 15 production browser workflows,
  typecheck, build and frozen-fixture integrity passed.

- 5 October 2026: added an individual-access deployment check because the prior
  hosted smoke command only exercised legacy shared Basic access. The new bounded
  command validates anonymous denial, authentication cookies, cross-origin logout
  rejection, individual status, disabled inference and logout replay protection.
  Output contains fixed check/stage labels without credentials or server bodies;
  failed sessions receive one cleanup attempt, with failed logout explicitly
  reported and never retried. Real local HTTP tests exercise success, invalid
  configuration, wrong passwords, unexpected inference readiness and cleanup
  failure. This prepares U1's hosted validation; no hosted pass, release identity
  attestation or provider qualification is claimed.
  Validation: `npm run trial:check` passed 132 unit/integration tests,
  15 production browser workflows, typecheck/build and fixture integrity.

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

- 7 October 2026: audited conversational safeguards without changing inference policy. Added S1 as a trial prerequisite: privacy/security controls and refusal rendering do not establish behavioral safety. Prepared off-disk backup/retention and synthetic actual-device review plans; visual implementation awaits the founder brief. Identified the exact eight-conversation human writing review and preserved failed acceptance. Corrected active hosting/review summaries; historical entries remain historical.

- 7 October 2026: established `READINESS.md` as the single current readiness ledger across capabilities, safety, privacy, recovery, usability and operations. Reordered work toward S1/model reliability, necessary recovery and operational evidence ahead of visual redesign; Q1/search remain parallel dependencies. Identified conversational coding coverage, registry retention, hosted disclosure drift and monitoring/accessibility gaps without adding autonomous tools or weakening general-assistant scope.

- 7 October 2026: prepared 12 two-turn safety development conversations in six
  risk/benign pairs and added offline fixture checks to the existing CI evaluation
  command. These are not model evaluations and do not pass S1. Added a synthetic
  stale-backup regression covering post-snapshot password/quota/expiry/revocation
  changes and revoke-all fallback; four backup tests pass. Typecheck and evaluation
  fixture checks pass. Off-disk recovery, audience decisions and human/model safety
  evidence remain open in the authoritative checklist. Deployed runtime unchanged.

- 7 October 2026: recorded eight founder-approved fresh-writing scores, preserving
  original agent findings and source hashes. All supplied dimensions are acceptable;
  keep Gemma as development candidate, with no cosmetic prompt tuning. The old
  reserved writing failure remains. Clarified that T requirements precede trial,
  P precedes public launch and O is deferred; high-impact work determines sequence,
  not a reduced trial checklist. The eight-score review is no longer pending.

- 7 October 2026: implemented approved adults-only safety instructions and general fact-preservation in the real conversation composer, plus accessible trial-scope disclosure. Added 18 safety and four fresh transfer development conversations to the bounded runner/configuration identity. Added explicit paused revoke-all recovery staging. 164 local tests and 17 production browser workflows pass after fixing a context-limit regression without raising the compatibility bound. Behavioral live assessment follows the frozen code; private-data gates remain closed.

- 7 October 2026: completed the frozen 22-conversation/44-reply safety and transfer
  development batch. Refusal observations do not resolve unsafe certainty in benign
  prevention advice or recurring unsupported drafting additions. Human priority
  review is cases 1/4/6/20 in `policy-20261007`; S1/E1 remain blocked. U1/D05 now has
  locally verified in-memory age encryption, authenticated restore with every
  identity revoked, and the approved protected Windows destination initialized.
  165 tests/typecheck/build pass. Render SSH registration, independent key custody,
  container verification, real transfer, retention/alerts and timed recovery remain
  open. No changed deployment or relaxed privacy gate is claimed.

- 7 October 2026: recorded founder qualitative safety judgments without inventing numeric scores. Revised general risk calibration, urgent human-support continuity and fact-preserving politeness; froze eight fresh transfer cases. Two separately permitted attempts timed out with no completed answers, so six remained unrun and S1/E1 stay blocked. Added content-free timeout distinction tested through the actual chat UI. U1/D05 advanced with Linux container validation and synthetic encrypted Linux-to-Windows paused/revoked recovery. Real Render SSH transfer and independent recovery-key custody remain pending.

  Validation: 166 tests, typecheck and production build passed after the timeout
  fix; 17 production browser workflows passed earlier in the same batch, with the
  changed timeout path subsequently tested through the real chat UI. Container
  health, persistence, individual access and actual age recovery passed locally.
  New runtime changes are not yet deployed; provider/privacy gates remain closed.

- 7 October 2026: deployed `12bd405` after GitHub validation, including the
  non-root Render SSH prerequisite. Registered public key and pinned host verified;
  local passphrase unlock/agent setup still blocks hosted backup. Independent key
  custody recommendation is Bitwarden free, pending founder setup and recovery
  verification. Further S1/E1 investigation fixed deadline classification during
  SDK waits and added content-free upstream timing diagnostics; the two consumed
  attempts remain unresolved and untouched. Current local validation: 166 tests
  passed, one optional encryption integration test skipped, typecheck/build passed.
  These latest diagnostic changes are not yet deployed. All trial gates remain open.
