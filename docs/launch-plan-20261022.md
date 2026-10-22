# CometRow launch plan — 22 October 2026

One ordered list. Work goes top to bottom; nothing is skipped to a later phase unless it is blocked. Status words: TODO, DOING, DONE, BLOCKED(by what). "Owner" means the founder does it; everything else is agent work. Decisions and evidence are recorded in READINESS.md as before; this file only tracks order and status.

## Where Codex left off (for orientation)

Done before and during the handover: restricted Render deployment live at app.cometrow.com on `4eb86b1`; owner Google sign-in and sign-out observed; email capability disabled honestly (`9c9be8e`, CI green, not yet deployed); UI product-organisation milestone approved; accessibility repair; photo-to-text implemented locally (21 October); all 36 infrastructure checks executed locally (21 October); supplier public-doc re-check, enclave-search evaluation and relay-mitigation assessment written (21 October). Open from Codex: hosted checks after deploying `9c9be8e`, prepared fidelity cases never run, human review packets, Galaxy A52 workspace checks, supplier decisions.

## Approved changes and additions — 22 October (owner approval of the roadmap and work split)

| # | Item | Status |
| --- | --- | --- |
| 2.3 | Research-query masking: run the identifier detector on the approval preview; masked by default with a kept note; warn when unrecognised personal text remains. Launch blocker. Sequential here. | DONE 22 October (identifiers removed before approval; warning for names and long numbers; detector fixes from worktree A folded in) |
| 2.4 | Attachment and adversarial masking tests with a miss-rate report; detector unchanged, proposals only. Launch blocker. Worktree A. | DONE in worktree A (23 cases, 13 known misses at the time; awaiting owner approval to merge) |
| 2.5 | Relay attestation audit, block-only and partial: pinned, checksum-verified supplier CLI in the Render image; can only refuse requests, never supply a key; guards stale or revoked supplier evidence, not a malicious operator. Browser-side freshness and revocation stay BLOCKED on the supplier's V3 JavaScript verifier (source: Sacha, 13 October 02:34 email, "hope to complete in the next two weeks"; not planned on). Worktree B. | DONE 22 October (merged, guard wired; browser-side part still BLOCKED on supplier) |
| 2.6 | Cost-exposure test for cancelled and interrupted requests: ledger shows uncertain with no metering, client shows cost unknown, documented bound = one in-flight request per account × max output tokens × published price. Sequential here. | DONE 22 October |
| 3.4 | Tenant-isolation tests across accounts (vault, history, usage, projects) on the hosted candidate configuration. Launch blocker (PRD). Sequential here after 3.2. | TODO |
| 3.5 | Signup and rate abuse controls: invitation-only admission stays; per-identity and per-address limits on sign-in, code requests and relay admission reviewed and tested. Launch blocker (PRD). Sequential here. | TODO |
| 4.1 | Brave live research, conditional on Brave API access remaining under the public plan (the unanswered ticket concerns storage rights and plan terms, not access). Implements the 22 October owner decision: save the written answer, never store results or links, one-tap re-run for sources. | TODO (conditional) |
| 4.2 | In-enclave search evaluation moved earlier: prepare the bounded three-request harness now so it can run the day the owner approves scope and spend; running it needs an owner permit. | TODO (prepare now) |
| 7.5 | Deployment review checklist for public hosting (PRD requirement): secrets, headers, rate limits, logging, rollback, migrations, monitoring, incident contact. Docs then a code check where possible. | TODO |
| D1 | Docs worktree writes privacy policy text, deletion path and incident-contact placeholder only; the in-app policy page and the delete-everything control are sequential here (touch src/). Owner will name the incident contact. | DOING (docs) / TODO (app) |
| 3.6 | Client-side time-to-first-token measurement in the local experiment runner (never measured since 4 October). | TODO |

Rules in force: subagents commit on their own branches, never edit READINESS.md (they use docs/ledger-fragments/), never merge or push; durable PostgreSQL and browser suites run once here after each merge; migration numbers are checked across all branches before use (0013 taken); no push without the owner's explicit instruction.

## Phase 0 — Owner actions, this week (nothing else waits on each other)

| # | Item | Status |
| --- | --- | --- |
| 0.1 | Reply to Sacha in the Tinfoil thread with the six-point email (chat, 22 October). Email only, no call. | TODO |
| 0.2 | Deploy exact `9c9be8e12440367bc3755385f4190626e5d921b4` on Render: Manual Deploy → specific commit, Auto-Deploy off, Pre-Deploy empty. | TODO |
| 0.3 | Hosted checks on app.cometrow.com: email-disabled controls, Google sign-in, cancellation, sign-out, workspace entry, second identity denied, vault save/reopen, usage display. Report outcomes only. | TODO |
| 0.4 | Approve the narrower privacy claim: "ID numbers, bank and contact details stay on your device; everything else is sealed." This decides Phase 1.2. | TODO |
| 0.5 | Approve downloading the pinned speech model files for the dictation proof of concept (Phase 9). | TODO |
| 0.6 | Approve a spending cap for the quality and safety evaluation runs (Phase 5); current authorisation is USD 3 cumulative. | TODO |
| 0.7 | Grade the open human review packets: two safety cases and the writing-ambiguity case from the 20 October assessment. | TODO |

## Phase 1 — Trust core (agent, no supplier dependency)

| # | Item | Status |
| --- | --- | --- |
| 1.1 | Relay guards: pin the qualified model with `X-Tinfoil-Model` on every forwarded request; per-account in-flight bound; request `X-Tinfoil-Request-Usage-Metrics` and persist tokens, model and cost per request ID for completed requests. Tests in production-relay and relay-browser. | DONE 22 October (READINESS entry "Relay guards"); needs the one-time `apply-pending` migration on the hosted database before the next deployment |
| 1.2 | On-device identifier masking: detect tax IDs, bank accounts, passport and ID numbers, phone numbers, emails and dates of birth before encryption; replace with placeholders; reinsert in the answer on the device. Show the user what was kept back. Needs 0.4. | DONE 22 October (owner approved the narrower claim; READINESS entry "On-device identifier masking") |
| 1.3 | Model configuration: qualified model stays a report value; add a tested non-experimental fallback and a clear in-app notice when the model changes. | DONE 22 October (optional `fallbackModel` in the report, confirmed by the user per request; no fallback named yet, owner decision; READINESS entry "Qualified fallback model") |
| 1.4 | Plain-language privacy text, one source used by the app's privacy panel and handed to the website: what stays on the device, what is sealed, what our server sees, cache behaviour, soft spending caps. | DONE 22 October (`shared/privacy-copy.ts`, website copy in `docs/privacy-copy-20261022.md`) |

## Phase 2 — Privacy features that are purely on-device

| # | Item | Status |
| --- | --- | --- |
| 2.1 | Incognito conversation: nothing written to the vault or storage; cleared on close; visible indicator. | DONE 22 October (adds a mode banner, save refusal and no discard warning over the existing memory-only default; device-only copy in banner and privacy statement) |
| 2.2 | Disappearing messages: per-conversation auto-delete after an hour, a day or a week; enforced on the device at unlock and on a timer. | DONE 22 October (pruned on open, on a timer and written back to the vault; device-only copy) |
| 2.3 | Decide and record: no anonymous mode at launch; wording "we only ever know that your account asked, never what". | TODO |

## Phase 3 — Account, plan and usage

| # | Item | Status |
| --- | --- | --- |
| 3.1 | Plan and usage display: account page shows the real allowance, usage and plan state instead of "no active plan", using the usage ledger. | TODO |
| 3.2 | Entitlement reconciliation from the existing test-mode billing receipts to account allowances (roadmap M5 next slice). No live billing activation. | TODO |
| 3.3 | Inactive-account retention: review migration, holds and backup cleanup; prepare the activation proposal for the owner. | TODO |

## Phase 4 — Research (search)

| # | Item | Status |
| --- | --- | --- |
| 4.1 | Brave stays for live research under the public plan. Owner decision 22 October: the AI's written answer is saved in encrypted history; Brave results and source links are never stored; reopened chats show "from a live search, search again to see current sources" with one-tap re-run; a source page the user opened through the page workflow may keep its address and the passage read, as the user's own action. Verify the live consent → retrieval → cited answer → reopen → re-run path once hosted. | TODO |
| 4.2 | In-enclave search (Tinfoil + Exa): bounded three-request synthetic test, only if Tinfoil remains the direction after Phase 8.1. | BLOCKED(8.1) |

## Phase 5 — Quality and safety (needs 0.6 and 0.7)

| # | Item | Status |
| --- | --- | --- |
| 5.1 | Run the prepared fidelity and safety cases (`evaluation/cases/fidelity-transfer-20261020.json`) within the approved cap, no retries. | BLOCKED(0.6) |
| 5.2 | Human adjudication of results; retain failures; no relabelling. | BLOCKED(5.1) |
| 5.3 | Held-out acceptance on one frozen configuration. | BLOCKED(5.2) |

## Phase 6 — Devices and accessibility (owner on a real phone)

| # | Item | Status |
| --- | --- | --- |
| 6.1 | Galaxy A52 / TalkBack workspace session from ui-device-test-plan.md on the deployed candidate, synthetic content only. | BLOCKED(0.2) |
| 6.2 | Photo-to-text on a real camera: prompt only after Use camera, preview, capture, indicator off afterwards. | BLOCKED(0.2) |

## Phase 7 — Hosting operations

| # | Item | Status |
| --- | --- | --- |
| 7.1 | Hosted recovery rehearsal: paused recovery and rollback under the approved data-transfer scope; measured recovery time. | TODO |
| 7.2 | Off-host encrypted backup destination and separately held recovery key: proposal for owner approval. | TODO |
| 7.3 | Independent liveness and certificate-expiry alerts that work when the service is down; content-free. | TODO |
| 7.4 | Reorder security headers before the access gates so refused responses also carry them (observation from 21 October). | TODO |

## Phase 8 — Tinfoil-dependent (cannot start before their answers or release)

| # | Item | Status |
| --- | --- | --- |
| 8.1 | Provider direction decision: 23 October for cache, limits, terms and models; 31 October for the V3 browser verifier. | BLOCKED(Tinfoil) |
| 8.2 | Integrate the V3 JavaScript verifier if released: pin, negative tests, releaseDigest comparison; otherwise delegated relay verification per the 21 October assessment. | BLOCKED(8.1) |
| 8.3 | Provider qualification report with linked evidence; enable private chat for the owner account only. | BLOCKED(8.2, 5.3) |
| 8.4 | Limited release: at most two invitees, seven days, pause and revoke criteria, support contact named. | BLOCKED(8.3, 6.1, 7.1) |

## Phase 9 — Later capabilities (not before 8.4)

Dictation proof of concept (needs 0.5), live voice, image creation, public sharing, anonymous accounts. All stay as disabled "Coming later" controls until then.
