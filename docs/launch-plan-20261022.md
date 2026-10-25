# CometRow launch plan — 22 October 2026

**Approved spend (owner statement, 22 October 2026):** no new paid spend is approved. Anything already spent, including the 4 October experiment cap and the Brave test on 12 October, is history. Any future paid step, such as the in-enclave research harness or the Phase 5 evaluation runs, needs the owner to name the service, the current price and a specific cap first. Every older figure in this document (USD 2, USD 3, USD 5, USD 10, USD 25, USD 50 to 100) is a historical or proposal figure and no longer an authorisation.


One ordered list. Work goes top to bottom; nothing is skipped to a later phase unless it is blocked. Status words: TODO, DOING, DONE, BLOCKED(by what). "Owner" means the founder does it; everything else is agent work. Decisions and evidence are recorded in READINESS.md as before; this file only tracks order and status.

## Where Codex left off (for orientation)

Done before and during the handover: restricted Render deployment live at app.cometrow.com on `4eb86b1`; owner Google sign-in and sign-out observed; email capability disabled honestly (`9c9be8e`, CI green, not yet deployed); UI product-organisation milestone approved; accessibility repair; photo-to-text implemented locally (21 October); all 36 infrastructure checks executed locally (21 October); supplier public-doc re-check, enclave-search evaluation and relay-mitigation assessment written (21 October). Open from Codex: hosted checks after deploying `9c9be8e`, prepared fidelity cases never run, human review packets, Galaxy A52 workspace checks, supplier decisions.

## Approved changes and additions — 22 October (owner approval of the roadmap and work split)

| # | Item | Status |
| --- | --- | --- |
| 2.3 | Research-query masking: run the identifier detector on the approval preview; masked by default with a kept note; warn when unrecognised personal text remains. Launch blocker. Sequential here. | DONE 22 October (identifiers removed before approval; warning for names and long numbers; detector fixes from worktree A folded in) |
| 2.4 | Attachment and adversarial masking tests with a miss-rate report; detector unchanged, proposals only. Launch blocker. Worktree A. | DONE in worktree A (23 cases, 13 known misses at the time; awaiting owner approval to merge) |
| 2.5 | Relay attestation audit, block-only and partial: pinned, checksum-verified supplier CLI in the Render image; can only refuse requests, never supply a key; guards stale or revoked supplier evidence, not a malicious operator. Browser-side freshness and revocation stay BLOCKED on the supplier's V3 JavaScript verifier (source: Sacha, 13 October 02:34 email, "hope to complete in the next two weeks"; withdrawn by the supplier on 22 October: "No ETA", Go SDK only; not planned on). Worktree B. | DONE 22 October (merged, guard wired; browser-side part still BLOCKED on supplier) |
| 2.6 | Cost-exposure test for cancelled and interrupted requests: ledger shows uncertain with no metering, client shows cost unknown, documented bound = one in-flight request per account × max output tokens × published price. Sequential here. | DONE 22 October |
| 2.8 | Masking accuracy benchmark (owner direction 22 October): synthetic corpus of twelve categories, locked held-out split, per-category recall and precision with intervals, miss list; detector tuned on the development split only. Held-out headline 98.2 % recall / 99.95 % precision on synthetic documents (READINESS 23 October); scans 90.3 %. Independent hand-written corpus (worktree H, 54 documents from a different author and structure): 90.0 % recall / 96.1 % precision overall, 94.3 % without scans; names and addresses counted as not covered, never detected. Synthetic only; no public claim. | DONE 23 October (merged F and H); a tuning round on H's findings and a real-document check are owner decisions |
| 2.9 | Arithmetic gate and default-model screen (owner direction 22 October): 40 frozen cases, threshold FROZEN 23 October, run once: no model passes (GPT-OSS alone 87.5 %, Gemma alone 83.3 %, calculator arms 45 %). Practice set, unseen set and hand-checked public set kept separate; post-check warning and ambiguity notes wired in the app; calculator tolerances for number formats. Spend USD 0.66 of 5. | RUN (no model eligible); next step is an owner decision; v2 (Design A: structured extraction over span ids, computation in our code, per-number states) merged 23 October evening as `16c0e45`, zero silent-wrong on the dev set for GPT-OSS, GLM-5.3 and Kimi K3 but false flags from the model's own estimate remain; gate v2 run once on 23 October evening under the owner-approved bar: FAIL (silent wrong 0 of 90, verified 40 of 90 against 60, flagged 49 against 27, one critical no-answer); Kimi K3 12-case ceiling probe 12 of 12; results in `evaluation/arithmetic-gate/verdicts/gate-v2-20261023/`; Design A not wired into the product; v3 (Design B: second independent extraction as the cross-check, deterministic method checks) merged 24 October as `75f37a9`, dev set 0 silent wrong in 74 conversations, false flags 5 of 24 in the last batch; gate v3 (30 new cases, frozen SHA-256 96b7932c) approved as written on 24 October; first attempt aborted by the supplier's usage limit (not a measurement); the approved single run after the limit was lifted: FAIL (silent wrong 0 of 90, verified 40 of 90 against 60, flagged 48 against 27). TRACK CLOSED by the owner's process change: ship without a "recomputed and matches" claim; no arithmetic work until Phase 5 |
| 2.7 | Provider-neutral interfaces (owner direction 22 October): inference relay, browser inference client, web search and usage metering behind interfaces; Tinfoil-specific code (routing headers, model pins, metering trailer, attestation audit, verifier and EHBP imports) inside its adapters; configuration selects the adapter; no second adapter. Sequential here (touches `server/app.ts`, `src/verified-chat.ts`). | DONE 22 October (local) |
| 3.4 | Tenant-isolation tests across accounts (vault, history, usage, projects) on the hosted candidate configuration. Launch blocker (PRD). Written in worktree E (`tests/tenant-isolation.test.ts`, 23 cases, no source changes, no failures found); merged `ad39b2a` after owner approval, all 23 cases incl. 8 PostgreSQL cases pass; ledger metering reads scoped to the account afterwards. Hosted second-identity denial stays unverified. | DONE (local) |
| 3.5 | Signup and rate abuse controls: invitation-only admission stays; per-identity and per-address limits on sign-in, code requests and relay admission reviewed and tested. Launch blocker (PRD). Sequential here. Reviewed 22 October; per-recipient sign-in code cap added (migration 0020). | DONE |
| 4.1 | Brave live research, conditional on Brave API access remaining under the public plan (the unanswered ticket concerns storage rights and plan terms, not access). Implements the 22 October owner decision: save the written answer, never store results or links, one-tap re-run for sources. | TODO (conditional) |
| 4.2 | In-enclave search evaluation moved earlier: prepare the bounded three-request harness now so it can run the day the owner approves scope and spend; running it needs an owner permit. Prepared 22 October (`evaluation/enclave-search-harness.ts`, plan mode only, no network client); the live sender is written only against a permit naming service, price and cap. | DONE (preparation); run BLOCKED on owner permit |
| 7.5 | Deployment review checklist for public hosting (PRD requirement): secrets, headers, rate limits, logging, rollback, migrations, monitoring, incident contact. Docs then a code check where possible. `docs/deployment-review-checklist-20261022.md` plus `tests/deployment-review-checklist.test.ts`. | DONE (local) |
| D1 | Docs worktree writes privacy policy text, deletion path and incident-contact placeholder only; the in-app policy page and the delete-everything control are sequential here (touch src/). Owner will name the incident contact. | DONE (app and docs; placeholders for the owner) |
| 3.6 | Client-side time-to-first-token measurement in the local experiment runner (never measured since 4 October). | DONE 22 October (send-point and final-usage timing added; first-chunk timing existed since 16 October) |

Rules in force: subagents commit on their own branches, never edit READINESS.md (they use docs/ledger-fragments/), never merge or push; durable PostgreSQL and browser suites run once here after each merge; migration numbers are checked across all branches before use (0013 taken); no push without the owner's explicit instruction.

## Phase 0 — Owner actions, this week (nothing else waits on each other)

| # | Item | Status |
| --- | --- | --- |
| 0.1 | Reply to the supplier contact in the Tinfoil thread with the six-point email (chat, 22 October). Email only, no call. | TODO |
| 0.2 | Deploy the current candidate on Render: Manual Deploy → specific commit, Auto-Deploy off, Pre-Deploy empty. | DONE 24 October: `f0cc0ba` live after a one-time Pre-Deploy apply-pending (0013, 0020); readyz 200 |
| 0.3 | Hosted checks on app.cometrow.com: email-disabled controls, Google sign-in, cancellation, sign-out, workspace entry, second identity denied, vault save/reopen, usage display. Report outcomes only. | TODO |
| 0.4 | Approve the narrower privacy claim: "ID numbers, bank and contact details stay on your device; everything else is sealed." This decides Phase 1.2. | TODO |
| 0.5 | Approve downloading the pinned speech model files for the dictation proof of concept (Phase 9). | TODO |
| 0.6 | Spending: owner stated on 22 October that no new paid spend is approved; before any paid step (research harness, Phase 5 runs) the owner names the service, the current price and a specific cap. Older USD figures are historical. | DONE 22 October (statement); each future paid step still needs its own cap |
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
| 2.3 | Decide and record: no anonymous mode at launch; wording "we only ever know that your account asked, never what". | DONE 23 October (recorded in the privacy copy "What we can see": no anonymous mode, every request from a signed-in account, incognito included, "we only ever know that your account asked, never what"; policy documents regenerated) |

## Phase 3 — Account, plan and usage

| # | Item | Status |
| --- | --- | --- |
| 3.1 | Plan and usage display: account page shows the real allowance, usage and plan state instead of "no active plan", using the usage ledger. | DONE 22 October (merged from worktree D) |
| 3.2 | Entitlement reconciliation from the existing test-mode billing receipts to account allowances (roadmap M5 next slice). No live billing activation. | DONE 22 October (test mode only; merged from worktree D) |
| 3.3 | Inactive-account retention: review migration, holds and backup cleanup; prepare the activation proposal for the owner. | DONE 22 October (proposal written; code covers closed accounts only; owner decision) |

## Phase 4 — Research (search)

| # | Item | Status |
| --- | --- | --- |
| 4.1 | Brave stays for live research under the public plan. Owner decision 22 October: the AI's written answer is saved in encrypted history; Brave results and source links are never stored; reopened chats show "from a live search, search again to see current sources" with one-tap re-run; a source page the user opened through the page workflow may keep its address and the passage read, as the user's own action. Verify the live consent → retrieval → cited answer → reopen → re-run path once hosted. App part DONE 23 October (saved answer, stripped results, Search again); hosted live verification still open. | DOING (app DONE; live path BLOCKED on hosting and Brave) |
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
| 7.1 | Hosted recovery rehearsal: paused recovery and rollback under the approved data-transfer scope; measured recovery time. | PREPARED 24 October (`docs/recovery-rehearsal-20261024.md`, `scripts/recovery-rehearsal.ts` read-only helper and test; the rehearsal is a joint owner-and-agent session, not run) |
| 7.2 | Off-host encrypted backup destination and separately held recovery key: proposal for owner approval. | PROPOSED 23 October: `docs/offhost-backup-proposal-20261023.md` (age-encrypted nightly dump to a non-Render EU host, key held only by the owner; five owner decisions) |
| 7.3 | Independent liveness and certificate-expiry alerts that work when the service is down; content-free. | PROPOSED 23 October: `docs/liveness-alerts-proposal-20261023.md` (external content-free probes of /healthz, /readyz, TLS, DNS and a backup heartbeat; four owner decisions); `scripts/certificate-expiry.ts` added as a read-only manual check |
| 7.4 | Reorder security headers before the access gates so refused responses also carry them (observation from 21 October). Done 22 October with gated-shape tests. | DONE (local) |

| 7.6 (D13) | Restricted database roles on the hosted database: apply `accountPrivilegePlan` (runtime and notice roles, no schema or allowance rights) to the Render PostgreSQL, switch the service to the runtime role, verify with `inspectProductionDatabase`; rollback = the owner role connection string. Owner runs the SQL; agent prepares the exact script and the check. | DONE 25 October (owner-reported: roles created, 14 grants applied, secret swapped, service restarted and live; export works); `privileges-check` output still to be reported |
| 7.7 (D4) | Apply-pending migration runbook for 0013 (usage metrics) and 0020 (sign-in delivery log) on the hosted database: exact command, expected `pending: 2` before and `pending: 0` after, verification query, rollback note; single-instance constraint stated. | DONE 24 October (runbook section; the hosted run is the owner's step) |
| 7.8 (D16) | Hardening of the hosted candidate: the open items of `docs/deployment-review-checklist-20261022.md` that need no supplier decision (secrets inventory, header check on the live host, rate-limit bounds on the live host, logging exclusion check, rollback drill note). Scope fixed from the owner's label; no new features. | PREPARED 24 October (`docs/hardening-20261024.md`, `scripts/check-headers.mjs`, checklist test; the live-host header run and the rollback drill are the owner's steps); live header check run 25 October: `/healthz` and `/readyz` lack the fixed security headers (answered before the header middleware), fix proposed, owner decision; rollback drill still the owner's; drill run sheet prepared 25 October (`docs/rollback-drill-20261025.md`), drill run 25 October (owner-reported, `dac6cd5` to `7e30333` and back: rollback Live in 51 s, forward in 16 to 75 s, every check as expected); live header check PASSED on `dac6cd5` |
| 7.9 (D14) | Confirmations on the hosted candidate recorded as verified evidence: the 0.3 checks (email-disabled controls, Google sign-in, cancellation, sign-out, workspace entry, second identity denied, vault save and reopen, usage display) plus account export and imprint, each with date and outcome. Owner performs on the phone and laptop; agent records. | NOT STARTED (needs 0.2 deployed) |

## Side tracks (owner process change, 24 October)

- **Arithmetic: parked after gate v3.** Pass: wire Design B as one separate, reviewed slice. Fail: ship without a "recomputed and matches" claim and close the track. No further arithmetic work until the main flow reaches Phase 5.
- **Masking side track, slice M1 (owner direction 25 October, from the DFKI study of 24 October). Runs after the hosting slice (7.9 and the owner's hosted steps), not before. Our own implementation only; no DFKI code copied. Out of scope: any name or address model, new recognisers, anything not listed.**
  - M1.1 Tolerant restoration in `src/identifier-masking.ts`: match placeholders ignoring case and inner spacing, tolerate a missing brace, restore only when the normalised token equals a placeholder on the kept list; never restore inside link targets, image URLs or anything the browser fetches (A15). Tests: case and spacing variants, unknown placeholders untouched, URL contexts untouched, and the same URL test for the current exact restore.
  - M1.2 Unicode word boundaries in the detector regexes; re-run the dev split before and after and report the change in hits and false positives.
  - M1.3 Third-party benchmark: check the OpenPII-1M licence first and report it; then score the detector on its email, phone, card and IBAN subset as a one-off evaluation. Synthetic and public data only, no spend.
  - M1.4 Per-item review check: confirm whether the user can accept or reject each masked item before sending; if not, report the gap and do not build it yet.
  - Report: test counts and the before-and-after numbers.
- **Masking, later slice (unchanged):** A4 (mask search queries), A5 (attachment tests), a held-out German set with per-category recall. No new masking heuristics outside these slices.

## Phase 8 — Tinfoil-dependent (cannot start before their answers or release)

| # | Item | Status |
| --- | --- | --- |
| 8.1 | Provider direction decision: 23 October for cache, limits, terms and models; the 31 October date for the V3 browser verifier is void since the supplier gave no ETA on 22 October. Inputs: the verbatim 22 October reply in provider-qualification.md. | READY for the owner's 23 October decision |
| 8.2 | Integrate the V3 JavaScript verifier if released: pin, negative tests, releaseDigest comparison; otherwise delegated relay verification per the 21 October assessment. Supplier, 22 October: no ETA, only the Go SDK supports V3, so the delegated route is the only documented path. | BLOCKED(8.1) |
| 8.5 | Default model must be non-experimental (supplier, 22 October: only non-experimental models have production status, one-week minimum deprecation notice). Candidates and the switch mechanism in `docs/model-selection-proposal-20261022.md`; candidate report draft (Gemma 4 31B primary, GPT-OSS 120B fallback, not loadable) in `evaluation/qualification-drafts/`; two checks added to the selection screen on 22 October (placeholder copying, citation delimiter). The owner picks; the switch is a qualification-report value with the same evidence as today's model, plus the weekly catalog check in the runbook. | TODO (owner pick; re-run of the screen is a paid step) |
| 8.3 | Provider qualification report with linked evidence; enable private chat for the owner account only. | BLOCKED(8.2, 5.3) |
| 8.4 | Limited release: at most two invitees, seven days, pause and revoke criteria, support contact named. | BLOCKED(8.3, 6.1, 7.1) |

## Phase C — Consumer-launch gaps (owner direction 23 October: imprint, controller identity, incident contact, deletion and export, DPIA, terms, EU hosting, billing items)

| # | Item | Status |
| --- | --- | --- |
| C1 | Controller identity and imprint: one identity file (`deployment/legal-identity.json`, schema in `shared/legal-identity.ts`) feeds the imprint (Settings → Privacy & data → Imprint, generated `docs/imprint-20261023.md`) and the policy's responsibility and contact sections; every unfilled field shows "not yet named" and the production build gate refuses while any remains. | DONE 24 October (file filled by the owner; retention stated as 90 days; placeholder gate passes); open: a 90-day purge job for request records so the policy statement is true |
| C2 | Incident contact: `incidentContactEmail` in the identity file, shown in the imprint and the policy contact section, named in the deployment review checklist. | DONE 23 October (placeholder until C1 is filled) |
| C3 | Deletion and export: account closure and delete-everything existed; `GET /api/account/export` returns every record held about the account (identity, sign-in methods, passkeys, sessions, notices, credential changes, email proofs, closure, allowances and requests with metrics, billing binding and operations, research approvals) without tokens or secrets; Download button on the account page; durable tests under the owner and the restricted runtime role. | DONE 23 October |
| C4 | DPIA draft along Article 35 from the system as built: `docs/dpia-draft-20261023.md`. | DRAFT 23 October (owner and lawyer review; transfer row needs the supplier's location) |
| C5 | Terms of use draft for consumers: `docs/terms-draft-20261023.md`. | DRAFT 23 October (not published; legal review) |
| C6 | EU hosting: relay and database are in Frankfurt by the recorded provisioning; inference location is a supplier question; `docs/eu-hosting-20261023.md` lists each component and the owner's four decisions. | DONE 23 October (note); decisions open |
| C7 | Billing items for a consumer launch: `docs/billing-items-20261023.md`, ten gaps (price with VAT, tax identity, invoices, withdrawal consent, terms acceptance, cancellation button, failed-payment grace, refunds, live-mode activation, retention). | REVIEWED 23 October; all ten wait on owner or legal decisions before code |

## Phase 9 — Later capabilities (not before 8.4)

Dictation proof of concept (needs 0.5), live voice, image creation, public sharing, anonymous accounts. All stay as disabled "Coming later" controls until then.
