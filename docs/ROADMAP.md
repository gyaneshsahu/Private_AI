# PrivateAI delivery roadmap

Working plan · 5 October 2026 · Owner: project founder; implementation: Codex.

The next product milestone is a usable, bounded invited-user trial. It is **not
ready for real private-data trials today**. Useful local document and encrypted
workspace workflows are available; full provider qualification and current live
transport compatibility remain blockers. This roadmap tracks outcomes and evidence,
not dates inferred from engineering estimates.

## How to use this plan

Work through the ordered backlog below, one coherent outcome at a time. If an item
is blocked, advance its next independent product item. Update its status, evidence,
remaining limitations and this change log in the same commit as the implementation.
Preserve stable IDs so progress and changed priorities remain traceable.

Codex may change implementation, split tasks or reorder independent work when new
evidence supports a better approach. Record why; do not silently erase failures or
mark tests as live evidence. Changes to supported scope, privacy promises, spending
limits or real-user-data use require the founder's decision. A roadmap is a working
backbone, not a reason to preserve a disproven design.

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
| Context, corrections and citations | `src/conversation.ts`, `src/Answer.tsx`; bounded selection, partial-answer exclusion, source snapshots and citation tests | Live current-adapter document workflow remains pending; citations still require correctness review |
| Exact decimal calculator | `src/calculator.ts`, browser workflow | Explicit user calculations; no claim that model arithmetic is tool-verified |
| Research approval | `server/research.ts`, session-bound single-use grants, SSRF/redirect/expiry tests and UI disclosure preview | Search needs configured service access; external privacy/fees stay separate; no automatic agent browsing |
| Temporary and encrypted workspaces | `src/vault.ts`, WebCrypto/IndexedDB tests, save/lock/reload/delete browser workflow | Manual local snapshots, no recovery or cloud sync; device backups outside deletion guarantee |
| Saved unsent drafts | `src/App.tsx`, optional `Conversation.draft`; new complete browser workflow | Explicit save only; draft excluded from inference until submitted; reload clears unsaved work |
| Browser verification and encrypted transport | Maintained Tinfoil/EHBP libraries; pinned router verification, encrypted fault fixtures and real synthetic answers | Full chain NOT_PASSED; correlated live relay abort remains unresolved |
| Restricted hosting foundation | `server/deployment.ts`, Docker and historical CI/hosted-smoke evidence | Shared evaluator access key, single process; no individual accounts/revocation/tenant isolation; current batch not deployed |
| Evaluation infrastructure | 24 development + 24 reserved fixtures, integrity checks, isolated experiment claims and review summaries | Fixture integrity is not model-quality evaluation; reserved/comparator execution remains pending |

## Ordered path to the invited-user trial

| ID / priority | Outcome and status | Dependencies and concrete exit evidence |
| --- | --- | --- |
| T1 — first | **DONE (local): cumulative streaming usage parser** | Accept repeated/nondecreasing output snapshots, never sum them, require final accounting when usage starts. Reject regressions, invalid totals, malformed/truncated streams and incomplete answers. Encrypted fragmented-browser regression passes; live fixed adapter returns `4`. |
| T2 — first | **BLOCKED: unambiguous live stream closure** | T1. One fresh check in this batch returned `4` in 1.81 s with 169 input / 38 output tokens; no observed request-signal abort or reader cancellation, but Chromium reported `ERR_ABORTED`. Reproduce using the real relay with a controlled peer; establish terminal HTTP/stream behavior without suppressing the event. A passing review must record correct answer, complete usage and normal relay closure. |
| W1 — parallel | **DONE (local): save and resume a document workspace with its draft** | Import, correct source text, compose unsent draft, explicitly encrypt/save, lock, reload, unlock and reopen both. Cancel/confirm replacement of unsaved work; delete clears saved record/current draft. Browser storage inspection finds no plaintext canaries; no inference or research is triggered by this flow. |
| W2 — next independent workflow | **NEXT: recover from interruption without losing context** | Extend complete UI tests for cancelled/partial chat, explicit retry, branching and retained source evidence using labelled synthetic transport fixtures. Verify new session/lock during pending extraction/research/save cannot restore cleared content. Follow with current-adapter live document correction after T2 and appropriate bounded authorization. |
| T3 | **BLOCKED: live document/follow-up workflow** | T2. Current adapter must return supported invoice arithmetic and citations for both turns: 95/19/114 EUR, then 90/18/108 EUR, reduction 6 EUR. Inspect actual source support, context correction, stream closure and accounting. Historical earlier-adapter success is supporting evidence, not this exit criterion. |
| Q1 — parallel evidence work | **BLOCKED: qualify the complete provider path** | Router-to-worker/GPU binding, software/build identity, freshness/revocation/rollback, caching/retention/diagnostics/moderation/egress and billing controls reviewed from primary evidence. Complete live/negative checks in the acceptance contract. Do not invent a passing report or accept a changed pin automatically. |
| E1 | **NEXT after T3: initial supported-task evaluation** | Freeze implementation/rubric; run development cases, fix failures, then preserve reserved separation. All 24 held-out cases × 3 runs must meet existing acceptable-task criteria (each dimension ≥2, mandatory assertions, no serious error). Report family results; replace any reserved case used for tuning. Plan costs against remaining authorized balance before starting this larger batch. |
| U1 — parallel | **NEXT: trial onboarding and operational readiness** | Explain supported inputs, local-only storage, unsaved/locked state, research disclosure and recovery limits. Observe keyboard and real-phone workflows. Document invitation/revocation, individual access boundary, incident stop procedure and minimal content-free diagnostics. Shared Basic credentials alone are not a multi-user account design. No private-content analytics or automatic feedback uploads. |
| R1 | **BLOCKED: open the bounded invited-user trial** | T2/T3/Q1/E1/U1 complete, actual cost reconciled, deployment validation tied to release, no unresolved material/essential security failures. Founder authorizes audience, hosting/privacy boundary and real-user-data scope. Supported scope and known minor limitations are explicit. |

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
remain deferred per the PRD. Each needs its own value evidence and threat-model review.

## Evidence and change log

- 5 October 2026: roadmap created from requirements and inspected code. T1's fix
  landed in `f48c943`; this batch extends its encrypted browser regression to the
  observed repeated usage pattern. New claim `windows_20261005_trial_compat_1`
  records a complete correct answer but unresolved relay failure; its consumed
  permit and result stay in ignored `.local/experiment-runs/`.
- 5 October 2026: W1 closes the unsent-draft gap discovered during roadmap review.
  Snapshots remain backward compatible (missing `draft` opens as empty). Local
  validation: 96 unit/integration tests, nine browser workflows, typecheck, build
  and fixture integrity. These are local evidence; no new hosted release is claimed.

Next update should address T2's actual relay reproduction and W2's interruption
workflow. Do not spend further calls repeating the unchanged 2+2 symptom.
