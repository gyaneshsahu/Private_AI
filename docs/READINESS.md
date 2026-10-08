# PrivateAI readiness checklist

## Readiness engineering checkpoint — 8 October 2026

The founder approved seven-day expired/revoked-account retention and seven-day
backup expiry as inactive code/documentation only. No activation, live deletion,
backup-setting change or new sensitive transfer is authorized. The module has no
runtime/CLI/scheduler integration. Synthetic tests cover boundaries, incident holds
and unknown legacy revocation age. Physical erasure remains unverified.

186 tests/49 files and19 production-browser workflows pass: bounded session admission,
relay overload recovery, encrypted storage-pressure recovery and keyboard/CSS zoom.
Network-disabled packaged recovery took6.923 seconds; hosted cutover and actual
phone/screen-reader evidence remain open. See [plan](readiness-batch-plan.md).

The founder declined USD4 and authorized useful tests within existing USD3 limits.
Retiring13 audited unclaimed permits releases onlyUSD0.386048 unused reserve;
historical executed bound remainsUSD2.288624. The complete12-case/48-request batch
reservesUSD0.60155520 using enforced exact first-turn input bounds, full8,000-character
second turns and4,096 output tokens per turn. Planned cumulativeUSD2.89017920.
Read-only dashboard:USD0.78 credit,USD0.22 rounded spend,435 requests, key/account
limitsUSD3, auto-reload off. No top-up or account change needed for this reserve.
Reserves are not charges. Earlier failed evaluations and AI-proposed assessments
retain their provenance; the separately designated human review remains human.
Live comparison is pending this checkpoint's freeze. Older checkpoints below are historical.


**Authoritative current readiness ledger — 8 October 2026.** Baseline implementation audit: `3358b8f`, including the deployed `81675c4` application.
Live comparison and archive-bound monitoring updated 8 October; local implementation
`2af184c`, deployed runtime remains `40f2e33`. Owner: founder/operator;
maintainer: developer making each change. The PRD and acceptance contract define
requirements; this ledger records status. The roadmap defines order. Other reviews
are dated evidence, not competing release checklists.

Goal: a general-purpose assistant targeting ChatGPT/Gemini-level everyday usefulness
with verifiable privacy. Documents and research are initial workflows, not the final
scope. Completing these rows does not prove competitive quality or complete security.
Do not add a feature just because another product has it.

## Highest-impact omissions and execution order

Latest founder adjudication: [constraint review](constraint-human-review-20261008.md)
records new human grades for cases 5/6/9/10; case 11 remains technically incomplete
and has no complete-conversation score. Earlier forwarded AI assessments retain
their original provenance. Experimental v2 removes conflicting crisis instructions
and strengthens revision obligations offline; no live validation or promotion.
Third-party account settings are now founder-operated only; agent dashboard/API
inspection is read-only. No new sensitive transfer or privacy-gate change without
asking. Existing scheduled backups and approved bounded tests remain within scope.

Offline repair validation: changed policy/real encrypted-browser checks passed;
180/181 tests passed together, with one existing invitation-browser timeout that
passed in isolation (cause unresolved, failure retained). Typecheck/build, fixture
integrity and 17 production browser workflows passed. Default/v1 context unchanged.
No paid execution or account mutation; v2 still requires fresh behavioral evidence.

1. **S1 safety:** approved adult-trial policy is implemented. Following founder
   review, fresh transfer answers reject prevention guarantees and retain urgent
   follow-up support, but omit unloaded storage and remain verbose initially.
   Four forwarded scores are recorded as AI-proposed per the founder's final
   instruction (see the safety audit); human adjudication remains pending.
   Adjudicate the four-case `safety-priority-20261008` packet before acceptance;
   refusal compliance does not establish safe advice or complete coverage.
2. **E1/G1–G4 model reliability:** reserved writing fails (at most 8/12, required
   10/12). The eight fresh-writing scores are now founder-confirmed; keep Gemma as the
   development candidate. The unchanged-policy comparison at `2af184c` does not
   demonstrate a generally better alternative: Gemma loses prevention qualifiers
   under shortening; GLM overloads crisis advice and invents drafting context
   (AI-proposed findings, human review pending). Earlier fresh arithmetic,
   ambiguity and two simple coding cases have evidence, while invented context
   recurs in a harmless enquiry. Resolve safety/quality review before fresh held-out
   assessment; do not repeatedly tune or reuse exposed cases.
3. **U1 recovery/deletion:** same-disk copies are not disaster recovery. Off-disk
   encrypted transfer, paused/revoked restore and archive retention now have evidence.
   Remaining work includes sustained backup coverage, hosted cutover and registry-row retention. Local vault loss/recovery limits must be understandable.
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
| C02 Writing without invented commitments/reasons — G1/E1 | T/P0 | Reserved writing failed; latest founder review confirms v1 qualifier loss (case10=2/1/2) and strong paired baseline (case9=3/3/3). v2 repair is offline only | [Founder review/repair](constraint-human-review-20261008.md), [writing diagnosis](writing-failure-diagnosis.md) | Fresh transfer evidence for repair and remaining drafting/source/correction coverage before held-out writing; preserve earlier reviews | Fresh held-out writing meets unchanged 10/12 floor and severity/recurrence rules; old failure preserved |
| C03 Reasoning, planning, ambiguity and noisy language — G2/E1 | T/P0 | Narrow live development evidence, historical arithmetic/planning failures | [Development review](development-family-review.md), [planning](planning-intervals-review.md), `evaluation/cases` | Assess transfer across multi-step constraints, units/dates and misspellings on one release | Ground-truth tasks and follow-ups meet family thresholds; no unreviewed recurring material errors |
| C04 Ordinary code explanation/debugging/generation scope — G2/G6/E1 | T/P1 | Two fresh Python/TypeScript cases completed on the frozen candidate; reviewed snippets typechecked/executed offline | `src/Answer.tsx`, `src/answer-format.ts`; existing six-family rubric | Broaden representative coding tasks beyond two simple examples; retain explicit unsupported execution/tool scope | Demonstrated correctness for declared languages/task bounds; identify untested code; do not imply execution or broad coding parity |
| C05 Personal discussion and calibrated consequential advice — G3/S1 | T/P0 | Development observations; unsafe assumptions remain a known risk | [Trial review history](trial-readiness.md), `src/conversation.ts` | Health/legal/financial uncertainty, empathy and unsupported assumptions in fresh tasks | Human-reviewed appropriate advice/clarification with no serious unsafe conclusions; disclaimers cannot repair wrong guidance |
| C06 Numbers, dates and source-grounded answers — G4/T3/E1 | T/P0 | Exact manual calculator locally tested; narrow live invoice passed | `src/calculator.ts`, `tests/security.test.ts`, [roadmap T3](ROADMAP.md) | Broader units/date/OCR ambiguity and citation entailment | Correct critical facts/calculations and citations under frozen rubric; no claim model arithmetic is automatically tool-checked |
| C07 One consistent release acceptance — E1/R1 | T/P0 | NOT_PASSED; historical reserved writing failure preserved; three fresh paired development questions completed on 2af184c, human review pending | [Quality gate](trial-quality-gate-proposal.md), [writing diagnosis](writing-failure-diagnosis.md) | Keep Gemma development candidate; no general GLM advantage demonstrated; resolve safety/quality findings before fresh held-out acceptance, never recycle exposed cases | 65/72 overall, 10/12 each family plus critical/recurrence rules; exact configurations and human decisions retained |
| C08 Competitive everyday usefulness — I3/L3 | P/P2 | Target, not demonstrated | [Acceptance comparator protocol](acceptance.md) | Named/configured comparator access, blinded paired human review and prospective-user observation | Meet preregistered comparative analysis with uncertainty; initial trial checklist is not parity evidence |
| C09 Context, corrections and partial-answer exclusion — W2/G1–G5 | T/P1 | Implemented and locally tested; some live follow-ups | `src/conversation.ts`, `tests/security.test.ts`, `tests/chat-recovery.test.ts` | Long multi-turn release assessment, visible limit comprehension | Edits invalidate dependent answers; excluded/partial text stays out; oversize context fails visibly without silent truncation |
| C10 Local documents and screenshot OCR — G4/U1 | T/P1 | Implemented; PDF/OCR browser fixtures pass | `src/documents.ts`, `src/extraction.worker.ts`, `tests/documents.test.ts`, `tests/browser/pdf.spec.ts` | Representative phone performance, corrupt/complex real-format synthetic documents | Limits enforced, unreadable inputs honest, numbers reviewable, no implicit upload; supported extraction fidelity assessed |
| C11 General image understanding, handwriting/scanned PDFs — G6/deferred vision | O/P3 | Outside current implemented promise | [PRD bounds](PRD.md), [roadmap deferred areas](ROADMAP.md) | Reconsider if text extraction cannot serve repeated tasks; separate modality/privacy design | Approved scope and qualified model/path plus visual reasoning evidence before claiming support; OCR never counts as vision |
| C12 Live research and saved citation rights — G5/Q1 | T/P0 | Adapter/approval fixtures implemented; actual service eligibility unresolved | `server/research.ts`, `tests/search-provider.test.ts`, [supplier comparison](search-provider-comparison.md) | Supplier reply/terms, approved account and real retrieval-to-answer/follow-up test | Exact storage permission for titles/URLs/excerpts, acceptable privacy/cost, source fidelity and grounded live synthesis |
| C13 Citation inspection and hostile source content — G4/G5/S1 | T/P0 | Source snapshots/links and untrusted-text policy implemented; local negative tests | `src/Answer.tsx`, `src/research-result.ts`, `tests/citations.test.ts`, `tests/research-result.test.ts` | Live claim-support checks and adversarial source-follow-up safety | Every asserted citation resolves to retained source; no fabricated support or source-triggered unauthorized action |

## Safety and privacy

| Requirement / roadmap | Priority | Current status | Supporting evidence | Missing work | Completion criterion |
| --- | --- | --- | --- | --- | --- |
| S01 Harmful-request handling and supportive responses — S1 | T/P0 | NOT_PASSED; earlier omissions/verbosity preserved; new paired comparison exposes lost prevention qualifiers and overloaded crisis guidance (AI-proposed) | [Safety audit](safety-readiness-audit.md), [fresh paired comparison](reliability-comparison-20261008.md) | Adjudicate older priority cases 1–4 and new cases 2/4/6; broader abuse/source-injection and streamed-prefix assessment remains open | No unresolved critical unsafe output; appropriate self-harm/health support, serious-harm refusal, exploitation distinctions and harmless-task usefulness |
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
| D04 Conversation and account deletion — U1/L2 | T/P0 | Snapshot deletion/tombstones tested; registry purge implemented inactive; synthetic tests pass | `src/vault.ts`, `server/invite-registry.ts`, [retention proposal](backup-retention-policy.md) | Enforce approved account/hash retention, backup expiry and deletion disclosures | Verified deletion at each claimed layer and documented residual metadata/backups; revocation is not labelled deletion |
| D05 Off-disk encrypted backup and restore — U1/L2 | T/P0 | Hosted encrypted backup and independent key recovery verified; local archive-bound monitor now detects missing/changed ciphertext and snapshot age; fresh transfer verified 11:26 UTC | `server/encrypted-registry.ts`, `tests/backup-health.test.ts`, [backup policy](backup-retention-policy.md) | Sustained RPO evidence, hosted cutover and notification visibility; local monitor cannot alert while computer is off | Timed restore meets agreed RPO/RTO; no revived revoked accounts, stale credentials or reset quotas; no secrets copied without authorization |
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
| O04 Minimal monitoring and incident action — L2/U1 | T/P0 | Pause/runbook plus hourly/sign-in backup monitor implemented; archive-bound health and scheduled execution verified at 11:28:19 UTC on 8 October | `scripts/invites.ts`, [trial runbook](invited-trial-runbook.md) | Host uptime/error/quota/disk signals and independent detection while Windows is unavailable; operator response drill | Operator detects meaningful failure and can pause/respond with no transcript, cookie, key or query logging |
| O05 Abuse prevention and fair access — L1/U1/S1 | T/P0 | Invitations, login throttling, session/account request limits and revoke/pause implemented | `server/invite-access.ts`, `server/invite-registry.ts`, `tests/invite-operations.test.ts` | Assess global-throttle denial of service/fairness, auth load and saturation; distinguish quotas from semantic safety | Bounded synthetic abuse cannot break isolation or exhaust service unobserved; documented small-cohort limits and operator response |
| O06 Costs and quotas — I2/L2/R1 | T/P0 | USD3 cumulative cap; historical bound USD2.288624 after retiring13 unclaimed permits; next batch reserved maximumUSD2.89017920. Fixed batch stopped after 22 requests; 13 conversations unrun. Dashboard USD0.78 prepaid, USD0.22 rounded spend, 435 requests; key/account limits USD3, auto-reload off | [Batch accounting](constraint-policy-results-20261008.md), prior reserves and consumed permits | Exact per-run billing remains unknown; retain reserves; transaction page cannot exclude delayed inference metering. No deposit approved; stop if credit insufficient. Hosted quota/failure-cost evidence remains open | Hard supplier limits verified; failed requests included; no automatic recharge/retry; user sees actionable limit errors, request counts not advertised as dollar caps |
| O07 Provider/model change control — Q1/E1/S1/L2 | T/P0 | Approved host/release/model contract and configuration hashes implemented | `shared/contracts.ts`, `src/verified-chat.ts`, `tests/configuration-identity.test.ts` | Operator upgrade/key rotation/expiry procedure and cross-gate revalidation | Unapproved change fails closed; changed model/policy reopens quality/safety; no silent fallback or blended acceptance |
| O08 Human support and incident reporting — U1/L3 | T/P1 | Runbook exists; user-facing staffed support path not verified | [Trial runbook](invited-trial-runbook.md), `src/App.tsx` guide | Name contact/channel, response expectations, safe report template and recovery instructions | Invitee can report harm/failure without submitting private transcripts; operator has triage/pause/escalation process |
| O09 Accurate trial disclosures and permission — G6/R1 | T/P0 | Restricted-evaluation wording and adult safety scope implemented locally; older hosted wording remains | `src/App.tsx`, [architecture](ARCHITECTURE.md) | Align deployed wording with real host/provider retention, safety/language limits, costs, local storage and audience | Reviewed disclosures match deployed reality; founder approves audience and private-data use only after gates pass |
| O10 Public operations and legal/commercial readiness — L1/L2/L3 | P/P2 | Not established by small-trial access system | [Roadmap public gates](ROADMAP.md), [acceptance](acceptance.md) | Appropriate policy/legal review, support ownership, public abuse/capacity, billing if sold, accessible launch evidence | Explicit public launch decision based on actual service/jurisdiction/claims; no automatic expansion from trial pass |
| O11 Scale beyond a single process — L2 | P/P2 | Process-local sessions/grants/concurrency; SQLite single-instance design | `server/app.ts`, `server/invite-access.ts`, `server/invite-registry.ts` | Capacity evidence before scaling; shared atomic state only if multiple instances needed | Published capacity matches architecture; no multi-instance deployment with inconsistent revocation/quotas/consent |
| O12 Deferred tools/modalities and memory — G6/deferred roadmap | O/P3 | Voice, general vision, cloud sync/memory and autonomous execution not implemented | [Roadmap reconsideration criteria](ROADMAP.md) | Evidence of repeated unmet tasks plus scope/privacy/cost decision | Add only justified capabilities with their own acceptance evidence; ordinary coding discussion does not imply code execution |

## Immediate coherent batches

**Latest execution:** the [constraint-policy batch](constraint-policy-results-20261008.md)
stopped after 11 conversations/22 requests/21 complete replies: archive follow-up
hit the fixed 2,048 output-token limit with no visible text. No retry; 13 conversations
remain unrun. Candidate also loses equipment qualifiers under shortening. No policy
promotion or acceptance claim. Full reserve retained: **USD2.674672 bound under
USD3 cumulative cap**, USD0.325328 remaining. Refreshed dashboard USD0.78 prepaid,
USD0.22 rounded spend, 435 requests (413+22), USD3 limit, auto-reload off. No deposit.
Post-batch output-limit diagnostic fix passed 180 tests/46 files, 17 production
browser workflows, typecheck/build and fixtures; original evidence unchanged.
Read-only bound-archive health and last scheduled task results remain healthy.
Priority cases 5/6/9/10/11 and earlier four scores remain AI-proposed, not human-confirmed.
Later-paid work requires a justified plan; unused permits are not automatic retries.

Latest 8 October approval supersedes the older request below: cumulative USD3,
fixed twelve cases and two configurations, maximum 48 requests. Existing API key
and account period limits verified at USD3. No historical reserve released:
USD1.456624 + USD0.505344 = USD1.961968; dashboard 413 requests reconciles to
401 + twelve completed requests. Prepaid USD0.79; transaction view has no entries,
not an assurance against delayed metering. Use USD0.78 credit planning floor;
new USD0.712704 reserve fits. No deposit/auto-reload/private data authorized.
Experimental `constraints-v1` policy is explicitly selected by synthetic permits;
default application policy unchanged. Visible response chunks are retained only in
synthetic evaluation evidence. Frozen preparation passed 178 tests in 46 files,
17 production browser workflows, typecheck/build and fixture integrity; log
`.local/constraint-policy-validation-20261008.log`. Paid execution pending at freeze.
Human review, safety, quality and provider privacy gates remain open.

8 October budget preference: do not reduce necessary evaluation coverage to fit
USD2. [Next proposed batch](next-reliability-batch.md) contains twelve fresh cases,
two Gemma policy configurations, at most 48 requests and USD0.712704 reserve;
prospective cumulative bound USD2.674672. **USD3 cumulative cap requested, not yet
approved**. No new permits or paid calls. Prior bound remains USD1.961968. Continue
offline recovery/operations while the decision is pending. Registry startup and
recovery validation now reject malformed credential/counter rows without modifying
the source; synthetic actual-process startup rejection and ten focused tests pass.
Full offline validation: 177 tests in 45 files, 17 production browser workflows,
typecheck/build and fixture checks pass. Logs are retained in
`.local/constraint-preparation-check-20261008.log` and
`.local/constraint-preparation-browser-20261008.log`. No hosted deployment or new
inference was performed; the proposed 48 requests remain unrun and unpermitted.
Full completion criteria, human adjudication and hosted verification remain open.

8 October continuation: [fresh reliability comparison](reliability-comparison-20261008.md)
completed three matched questions, six conversations/twelve replies, Gemma thinking
versus GLM low, unchanged answer policy at `2af184c`. No general alternative advantage
or semantic pass; review new priority cases 2/4/6 and the older four proposed scores.
Conservative cumulative bound **USD1.961968**, remaining approval **USD0.038032**;
refreshed dashboard **USD0.79**, USD0.21 rounded period spend, 413 requests, USD2
limit and auto-reload off. Full reserves retained; token estimate is not billing.
D05/O04 archive-bound health checks now detect missing/changed ciphertext and
snapshot age. A newly authorized hosted backup authenticated; Status and scheduled
monitor pass (11:28:19 UTC, exit 0). Earlier automatic-review transfer block resolved
by explicit user approval. Sustained RPO/hosted cutover remain open. Local validation:
176 unit/integration checks, 17 production browser workflows, typecheck/build and
fixture integrity; initial sandbox and age-path setup failures preserved in the
comparison report. Private-data, safety, quality and provider gates remain open.

- **A — safety and reliability:** adjudicate the existing four-score packet and
  fresh comparison priority cases, then select one justified general intervention
  for action selection, qualifier preservation and unsupported personal facts.
  Adults-only scope is already approved. Keep exposed cases as regressions and
  preserve the failed reserved evaluation. No unchanged paid repeats; remaining
  cumulative authorization is too small for another comparable six-run batch.
- **B — recovery and operational controls:** accumulate sustained backup evidence,
  prepare isolated hosted cutover/rollback and quota reconciliation, validate the
  proposed registry purge with synthetic registries, and inspect minimal logging.
  Off-disk backup and independent key custody are active and verified; full cutover,
  registry deletion policy and independent failure detection remain incomplete.
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
