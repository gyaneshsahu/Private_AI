# PrivateAI readiness checklist

**Authoritative current readiness ledger — 7 October 2026.** Baseline implementation audit: `3358b8f`, including the deployed `81675c4` application.
Live development safety/reliability evidence and local encrypted recovery updated 7 October; no deployed runtime change. Owner: founder/operator;
maintainer: developer making each change. The PRD and acceptance contract define
requirements; this ledger records status. The roadmap defines order. Other reviews
are dated evidence, not competing release checklists.

Goal: a general-purpose assistant targeting ChatGPT/Gemini-level everyday usefulness
with verifiable privacy. Documents and research are initial workflows, not the final
scope. Completing these rows does not prove competitive quality or complete security.
Do not add a feature just because another product has it.

## Highest-impact omissions and execution order

1. **S1 safety:** approved adult-trial policy is implemented. The frozen development
   batch completed 18 paired safety and four transfer conversations; review found
   dangerous overconfidence in benign safety advice. Founder reviewed cases 1/4/6/20;
   address confirmed prevention guarantees and crisis-support continuity first;
   do not treat refusal compliance as proof of safe advice or complete coverage.
2. **E1/G1–G4 model reliability:** reserved writing fails (at most 8/12, required
   10/12). The eight fresh-writing scores are now founder-confirmed; keep Gemma as the
   development candidate, decide any justified intervention, and freeze safety plus answer policy together before fresh held-out
   assessment. Reasoning transfer and ordinary coding usefulness need explicit coverage.
3. **U1 recovery/deletion:** same-disk copies are not disaster recovery. Off-disk
   encrypted recovery, reconciliation of revoked credentials and enforced retention
   are missing. Local vault loss/recovery limits must be understandable.
4. **Q1 and G5 external dependencies, in parallel:** supplier confidentiality evidence
   and saved-search rights/access remain unresolved. These block release, not offline
   safety fixtures, source review or operational preparation.
5. **U1/L2 operational readiness:** verify host logs, minimal monitoring, quota/cost
   behavior, rollback and bounded load. Existing hosted access tests are useful but
   do not prove all-device workspace isolation or reliable operation under load.
6. **U1/U2/R1 complete experience:** keyboard/screen-reader and actual-phone workflows,
   support and accurate disclosures before inviting people. Fix functional usability
   defects now; defer extensive visual redesign until the preceding gaps advance.

## Reading and maintaining the ledger

T = required before trial; P = required before public launch; O = optional/later.
P0 blocks safe/reliable trial use; P1 is another mandatory trial outcome; P2 is a
public-launch obligation; P3 is deferred. Classification never authorizes spending
or expands approved scope. Trial means the agreed real-user trial, not an automatic
synthetic-only workaround.

Status distinguishes **implemented / local verification / hosted verification /
live-provider evidence / human review**. Partial verification applies only to its
stated boundary. “Missing evidence” is not proof that a defect exists. “Not found”
means absent from inspected sources/tests, not an exhaustive security certification.
All rows below remain open at their full completion criterion unless explicitly
marked complete; passing a component does not pass its containing requirement.

For each batch update affected rows with release/configuration, evidence location,
verification level and remaining work. Preserve prior failures in dated reports;
never overwrite experiment results or pool configurations. A model, policy, provider,
storage or deployment change reopens dependent verification. Add newly discovered
gaps here and map them to existing roadmap IDs rather than creating another ledger.

## Capability and quality

| Requirement / roadmap | Priority | Current status | Supporting evidence | Missing work | Completion criterion |
| --- | --- | --- | --- | --- | --- |
| C01 General-assistant scope and honest limits — G6/R1 | T/P1 | Goal documented; release claims not finalized | [PRD](PRD.md), [acceptance](acceptance.md) | Tie supported tasks/languages and limitations to the selected release; English is the evaluated language | Reviewed trial scope preserves all six families; no silent narrowing or parity claim |
| C02 Writing without invented commitments/reasons — G1/E1 | T/P0 | Implemented chat; live reserved assessment failed, human-confirmed | [Writing diagnosis](writing-failure-diagnosis.md) | Fresh packet scores 1–8 founder-confirmed, all dimensions at least 2; retain Gemma development candidate; fresh release acceptance still needed | Fresh held-out writing meets unchanged 10/12 floor and severity/recurrence rules; old failure preserved |
| C03 Reasoning, planning, ambiguity and noisy language — G2/E1 | T/P0 | Narrow live development evidence, historical arithmetic/planning failures | [Development review](development-family-review.md), [planning](planning-intervals-review.md), `evaluation/cases` | Assess transfer across multi-step constraints, units/dates and misspellings on one release | Ground-truth tasks and follow-ups meet family thresholds; no unreviewed recurring material errors |
| C04 Ordinary code explanation/debugging/generation scope — G2/G6/E1 | T/P1 | Text/code rendering exists; dedicated coding-quality coverage not established | `src/Answer.tsx`, `src/answer-format.ts`; existing six-family rubric | Define representative conversational coding tasks within explanation/planning; verify code in an isolated offline test harness, not a user execution tool | Demonstrated correctness for declared languages/task bounds; identify untested code; do not imply execution or broad coding parity |
| C05 Personal discussion and calibrated consequential advice — G3/S1 | T/P0 | Development observations; unsafe assumptions remain a known risk | [Trial review history](trial-readiness.md), `src/conversation.ts` | Health/legal/financial uncertainty, empathy and unsupported assumptions in fresh tasks | Human-reviewed appropriate advice/clarification with no serious unsafe conclusions; disclaimers cannot repair wrong guidance |
| C06 Numbers, dates and source-grounded answers — G4/T3/E1 | T/P0 | Exact manual calculator locally tested; narrow live invoice passed | `src/calculator.ts`, `tests/security.test.ts`, [roadmap T3](ROADMAP.md) | Broader units/date/OCR ambiguity and citation entailment | Correct critical facts/calculations and citations under frozen rubric; no claim model arithmetic is automatically tool-checked |
| C07 One consistent release acceptance — E1/R1 | T/P0 | 72 reserved runs collected; writing failed; remaining human reviews incomplete | [Quality gate](trial-quality-gate-proposal.md), [writing diagnosis](writing-failure-diagnosis.md) | Freeze model, policy, tools, limits and safety; fresh held-out evidence after justified changes | 65/72 overall, 10/12 each family plus critical/recurrence rules; exact configurations and human decisions retained |
| C08 Competitive everyday usefulness — I3/L3 | P/P2 | Target, not demonstrated | [Acceptance comparator protocol](acceptance.md) | Named/configured comparator access, blinded paired human review and prospective-user observation | Meet preregistered comparative analysis with uncertainty; initial trial checklist is not parity evidence |
| C09 Context, corrections and partial-answer exclusion — W2/G1–G5 | T/P1 | Implemented and locally tested; some live follow-ups | `src/conversation.ts`, `tests/security.test.ts`, `tests/chat-recovery.test.ts` | Long multi-turn release assessment, visible limit comprehension | Edits invalidate dependent answers; excluded/partial text stays out; oversize context fails visibly without silent truncation |
| C10 Local documents and screenshot OCR — G4/U1 | T/P1 | Implemented; PDF/OCR browser fixtures pass | `src/documents.ts`, `src/extraction.worker.ts`, `tests/documents.test.ts`, `tests/browser/pdf.spec.ts` | Representative phone performance, corrupt/complex real-format synthetic documents | Limits enforced, unreadable inputs honest, numbers reviewable, no implicit upload; supported extraction fidelity assessed |
| C11 General image understanding, handwriting/scanned PDFs — G6/deferred vision | O/P3 | Outside current implemented promise | [PRD bounds](PRD.md), [roadmap deferred areas](ROADMAP.md) | Reconsider if text extraction cannot serve repeated tasks; separate modality/privacy design | Approved scope and qualified model/path plus visual reasoning evidence before claiming support; OCR never counts as vision |
| C12 Live research and saved citation rights — G5/Q1 | T/P0 | Adapter/approval fixtures implemented; actual service eligibility unresolved | `server/research.ts`, `tests/search-provider.test.ts`, [supplier comparison](search-provider-comparison.md) | Supplier reply/terms, approved account and real retrieval-to-answer/follow-up test | Exact storage permission for titles/URLs/excerpts, acceptable privacy/cost, source fidelity and grounded live synthesis |
| C13 Citation inspection and hostile source content — G4/G5/S1 | T/P0 | Source snapshots/links and untrusted-text policy implemented; local negative tests | `src/Answer.tsx`, `src/research-result.ts`, `tests/citations.test.ts`, `tests/research-result.test.ts` | Live claim-support checks and adversarial source-follow-up safety | Every asserted citation resolves to retained source; no fabricated support or source-triggered unauthorized action |

## Safety and privacy

| Requirement / roadmap | Priority | Current status | Supporting evidence | Missing work | Completion criterion |
| --- | --- | --- | --- | --- | --- |
| S01 Harmful-request handling and supportive responses — S1 | T/P0 | NOT_PASSED; 18 two-turn live development conversations completed; founder confirms material prevention concern and crisis-support weakness; two fresh attempts timed out without answers | [Safety source audit](safety-readiness-audit.md), `evaluation/cases/safety-development.json`, local `policy-20261007` review packet | Verify general intervention on fresh completed answers; remaining abuse categories/source injection, streamed-prefix assessment and human review | No unresolved critical unsafe output; appropriate self-harm/health support, serious-harm refusal, exploitation distinctions and harmless-task usefulness |
| S02 Audience and content boundaries — S1/G6 | T/P0 | Founder approved adults-only/no explicit sexual generation; application policy and disclosure implemented | [Safety audit](safety-readiness-audit.md), `src/conversation.ts`, `src/App.tsx` | Validate behavior and operator invitation process; no identity-document collection | Recorded audience/policy, understandable onboarding, tests for boundaries; do not quietly implement age verification or collect identity documents |
| S03 Privacy-compatible safety mechanisms — S1/Q1 | T/P0 | No app semantic moderation service found on inference path | `src/verified-chat.ts`, `src/reply-stream.ts` | Evaluate baseline; select controls only for evidenced gaps; account for text already streamed | Any content-reading component inside approved boundary; no hidden plaintext moderation or post-stream check presented as prevention |
| S04 Full confidential provider chain — Q1/R1 | T/P0 | BLOCKED, narrow encrypted compatibility only | [Provider evidence](provider-evidence-update.md), `src/verified-chat.ts`, `shared/contracts.ts` | Worker/build/GPU binding, freshness/revocation/rollback, caching/logging/moderation evidence | Qualified concrete deployment and negative/live evidence under acceptance contract; no gate bypass or marketing-based pass |
| S05 Explicit external disclosure — G5/Q1 | T/P0 | Implemented; local grant/SSRF/session tests | `server/research.ts`, `server/network.ts`, `tests/security.test.ts`, `tests/research.test.ts` | Actual-service trace and human understanding | Exact query/URL only, fresh single-use consent, no implicit chat/file upload, source instructions cannot authorize network access |
| S06 Logs, metadata and retention truth — Q1/U1/L2 | T/P0 | App avoids content logging by design; host/provider retention unverified | `server/app.ts`, `server/index.ts`, [retention proposal](backup-retention-policy.md) | Inspect deployed edge/app/error logs, supplier terms and access; test synthetic canaries | Document actual fields/retention/access; no content/secrets in logs; disclosed metadata boundaries match settings |
| S07 Trusted browser delivery and secret handling — Q1/L1 | T/P0 | CSP/local assets, gateway credentials, Windows credential store implemented | `server/app.ts`, `scripts/WindowsSecrets.psm1`, `tests/security.test.ts` | Release-specific asset/secret review and documented operator trust; rotate rehearsal with synthetic credentials | No keys in bundles/evidence; no unapproved scripts; explain malicious client updates/extensions remain outside guarantee |
| S08 Independent security review and update practice — L1/L2 | P/P2 | Automated negative tests exist; independent review not evidenced | Security/invite/transport test files; lockfile and CI | External review, dependency triage, responsible reporting and re-review triggers | Findings resolved or explicitly risk-reviewed without waiving critical gates; supported update/rotation process rehearsed |

## Identity, persistence and recovery

| Requirement / roadmap | Priority | Current status | Supporting evidence | Missing work | Completion criterion |
| --- | --- | --- | --- | --- | --- |
| D01 Individual invitations and session lifecycle — U1 | T/P0 | Implemented; local and hosted HTTPS lifecycle verified | `server/invite-access.ts`, `server/invite-registry.ts`, [host evidence](trial-hosting-decision.md) | Release regression after auth changes; operator expiry/revocation guidance | One-use/expiring invitations, secure cookies, password-change/logout/revocation isolation remain verified for deployed release |
| D02 Workspace/account isolation — W2/U1 | T/P0 | Local browser/vault tests; hosted HTTP identity checks passed | `tests/vault.test.ts`, `tests/invite-browser.test.ts`, `tests/workspace-races.test.ts` | Hosted browser-vault separation on actual devices, old tabs/background behavior | Two identities cannot expose or overwrite each other's snapshots/drafts; timing limits accurately disclosed |
| D03 Save, lock and recover a workspace — W1/W2/U1 | T/P1 | Implemented; local encrypted save/lock/reload/corruption tests | `src/vault.ts`, `tests/vault.test.ts`, `tests/browser/vault-recovery.spec.ts` | Actual-device storage failure/quota/private-browsing behavior; task comprehension | Intact saved data survives failure; corrupt data not overwritten; unsaved-loss warnings understood; no promise of forgotten-passphrase recovery |
| D04 Conversation and account deletion — U1/L2 | T/P0 | Snapshot deletion/tombstones tested; registry purge absent | `src/vault.ts`, `server/invite-registry.ts`, [retention proposal](backup-retention-policy.md) | Enforce approved account/hash retention, backup expiry and deletion disclosures | Verified deletion at each claimed layer and documented residual metadata/backups; revocation is not labelled deletion |
| D05 Off-disk encrypted backup and restore — U1/L2 | T/P0 | In-memory encryption and revoked paused restore verified on Windows/Linux; container-to-Windows synthetic recovery passed; hosted transfer absent | `server/encrypted-registry.ts`, `tests/encrypted-registry.test.ts`, [backup policy](backup-retention-policy.md) | Local SSH passphrase unlock/agent setup (registered key accepted by Render), independent recovery-key custody, real hosted transfer, retention/alerts and timed off-host rehearsal | Timed restore meets agreed RPO/RTO; no revived revoked accounts, stale credentials or reset quotas; no secrets copied without authorization |
| D06 Lost credentials and user recovery/support — U1/L3 | T/P1 | Signed-in password change works; lost-password/vault recovery unsupported | `server/access-page.ts`, [trial runbook](invited-trial-runbook.md) | Document operator identity-verification/reissue route and consequences; test explanatory flow | User knows difference between account and vault recovery; no silent account substitution or false data-recovery promise |

## Usability, operation and launch

| Requirement / roadmap | Priority | Current status | Supporting evidence | Missing work | Completion criterion |
| --- | --- | --- | --- | --- | --- |
| U01 Functional accessibility — U2/U1 | T/P1 | Labels/status regions/dialog focus handling implemented; partial browser checks | `src/App.tsx`, `tests/invite-browser.test.ts`, [device plan](ui-device-test-plan.md) | Keyboard-only and screen-reader tasks, zoom/contrast, focus/error/stream announcement review | Core sign-in/chat/context/save/research flows usable without pointer, readable at zoom, no focus traps or disruptive announcements |
| U02 Actual phone and desktop experience — U1/U2 | T/P1 | Responsive fixture layouts; actual-device validation absent | [Device plan](ui-device-test-plan.md), production browser tests | Actual mobile browser keyboard, upload, save/unlock, citations and interruptions | Complete synthetic tasks on named desktop/phone release matrix with no blocking usability/data-loss defects |
| U03 Visual redesign — U2 | O/P3 | Existing conversation UI usable for engineering; founder references pending | `src/App.tsx`, `src/styles.css` | Design brief after safety/reliability/recovery advance | Design improves observed usability without replacing functional gates or adding unapproved capabilities |
| O01 Streaming, stop, retry and outage integrity — T1/T2/W2 | T/P0 | Local faults and narrow live compatibility verified | `src/completion-events.ts`, `src/reply-stream.ts`, `tests/production-relay.test.ts`, [recovery review](workspace-recovery-review.md) | Qualified release/device interrupted-network coverage | No incomplete answer treated as complete/context; explicit retry only; scoped abort evidence preserved; cleanup/cancellation enforced |
| O02 Deployment, persistence and rollback — U1/L2 | T/P0 | Container and hosted restart/access checks passed; recovery staging only | [Hosting decision](trial-hosting-decision.md), deployment/container scripts | Rehearse compatible rollback and schema migration failure without live-data replacement | Exact release/config identity, durable registry and fail-closed restart; rollback preserves auth/revocation state |
| O03 Capacity, latency and resource failure — I2/U1 | T/P1 | Timeouts/body limits/three concurrent inference slots implemented; constrained container smoke passed | `server/app.ts`, `src/documents.ts`, [hosting evidence](trial-hosting-decision.md) | Bounded synthetic concurrency/memory/disk-full diagnostics; live latency under approved budget | Trial cohort fits observed capacity; overload fails predictably without lost state; planned ≥100 live-request reliability study remains separately budgeted |
| O04 Minimal monitoring and incident action — L2/U1 | T/P0 | Operator pause and content-free incident runbook exist; continuous detection not demonstrated | `scripts/invites.ts`, [trial runbook](invited-trial-runbook.md) | Uptime/error/quota/disk/backup-age signals, alert destination and pause/recovery drill | Operator detects meaningful failure and can pause/respond with no transcript, cookie, key or query logging |
| O05 Abuse prevention and fair access — L1/U1/S1 | T/P0 | Invitations, login throttling, session/account request limits and revoke/pause implemented | `server/invite-access.ts`, `server/invite-registry.ts`, `tests/invite-operations.test.ts` | Assess global-throttle denial of service/fairness, auth load and saturation; distinguish quotas from semantic safety | Bounded synthetic abuse cannot break isolation or exhaust service unobserved; documented small-cohort limits and operator response |
| O06 Costs and quotas — I2/L2/R1 | T/P0 | Cumulative $2 approval, consumed permits and request counters; usage estimates exist | [Writing cost record](writing-failure-diagnosis.md), experiment claims, registry | Reconcile current dashboard actuals before next paid batch; hosted account/search budget and failure-cost visibility | Hard supplier limits verified; failed requests included; no automatic recharge/retry; user sees actionable limit errors, request counts not advertised as dollar caps |
| O07 Provider/model change control — Q1/E1/S1/L2 | T/P0 | Approved host/release/model contract and configuration hashes implemented | `shared/contracts.ts`, `src/verified-chat.ts`, `tests/configuration-identity.test.ts` | Operator upgrade/key rotation/expiry procedure and cross-gate revalidation | Unapproved change fails closed; changed model/policy reopens quality/safety; no silent fallback or blended acceptance |
| O08 Human support and incident reporting — U1/L3 | T/P1 | Runbook exists; user-facing staffed support path not verified | [Trial runbook](invited-trial-runbook.md), `src/App.tsx` guide | Name contact/channel, response expectations, safe report template and recovery instructions | Invitee can report harm/failure without submitting private transcripts; operator has triage/pause/escalation process |
| O09 Accurate trial disclosures and permission — G6/R1 | T/P0 | Restricted-evaluation wording and adult safety scope implemented locally; older hosted wording remains | `src/App.tsx`, [architecture](ARCHITECTURE.md) | Align deployed wording with real host/provider retention, safety/language limits, costs, local storage and audience | Reviewed disclosures match deployed reality; founder approves audience and private-data use only after gates pass |
| O10 Public operations and legal/commercial readiness — L1/L2/L3 | P/P2 | Not established by small-trial access system | [Roadmap public gates](ROADMAP.md), [acceptance](acceptance.md) | Appropriate policy/legal review, support ownership, public abuse/capacity, billing if sold, accessible launch evidence | Explicit public launch decision based on actual service/jurisdiction/claims; no automatic expansion from trial pass |
| O11 Scale beyond a single process — L2 | P/P2 | Process-local sessions/grants/concurrency; SQLite single-instance design | `server/app.ts`, `server/invite-access.ts`, `server/invite-registry.ts` | Capacity evidence before scaling; shared atomic state only if multiple instances needed | Published capacity matches architecture; no multi-instance deployment with inconsistent revocation/quotas/consent |
| O12 Deferred tools/modalities and memory — G6/deferred roadmap | O/P3 | Voice, general vision, cloud sync/memory and autonomous execution not implemented | [Roadmap reconsideration criteria](ROADMAP.md) | Evidence of repeated unmet tasks plus scope/privacy/cost decision | Add only justified capabilities with their own acceptance evidence; ordinary coding discussion does not imply code execution |

## Immediate coherent batches

- **A — safety and reliability foundations:** offline paired safety fixtures and
  expected outcomes; obtain audience decision; apply the confirmed fresh-writing review without
  repeating that packet. Define a small coding/reasoning development set without modifying
  the already exposed held-out set. No new inference merely to keep work moving.
- **B — recovery and operational controls:** validate proposed retention against
  actual lifecycle, prepare safe purge/recovery tests with synthetic registries,
  inspect logging and design minimal alerts. Activate off-disk storage only after
  destination, key custody and any cost/privacy decisions; do not copy credentials
  while those are pending.
- **C — release evidence:** assess supplier replies and search eligibility; run
  separately permitted bounded live tests when they resolve a concrete hypothesis.
  Freeze one release and run fresh quality/safety acceptance when prerequisites
  hold; complete hosted/device/accessibility workflows and support/disclosure review.

**Evidence limits:** This audit inspected source, tests and dated evidence reports;
it did not rerun live inference, independently certify security, or re-execute the
historical hosted checks. Missing coverage is recorded rather than converted into
an implementation defect. Future checks must record their actual outcomes here.


### Review update — 7 October

The eight fresh-writing scores are founder-confirmed; see [recorded scores and
candidate decision](writing-failure-diagnosis.md#founder-confirmed-fresh-writing-scores--7-october).
This closes that human-review action, not C02/C07 acceptance. Original agent
assessments and the failed reserved evaluation remain preserved.
