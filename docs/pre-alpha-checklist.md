# Pre-alpha checklist — 12 November 2026

Everything left before the first invited friend uses CometRow chat. Sources: the repository, `docs/owner-decisions.md` (branch `alpha-provider-neutral`), `docs/provider-qualification-20261026.md`, `docs/provider-model-decision-20261026.md`, `docs/READINESS.md`. The "concerns doc" the owner named does not exist in the repository or `docs/private/`, so nothing was taken from it.

Who: **me** = owner, **you** = agent, **reply** = waiting on a supplier. Status: done, open, unknown (cannot be verified from here; never counted as done). Effort is working time, not waiting time.

## Provider

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Edgeless reply: P4 (an app may serve its own users with our key held server-side) | Knockout: a "no" ends Privatemode | reply | yes, if Privatemode is chosen | 0 | open (sent 12 Nov) |
| P2 | Edgeless reply: P8 (deprecation notice, exact-version pinning) | Tie-break between providers | reply | no | 0 | open |
| P3 | GPU attestation scope (former P3) | Trust row of the scorecard | you | no | 0 | done (answered by Privatemode docs) |
| P4 | Tinfoil replies: T1 (EU option), T4 (written agreement for health) | Legal fit; health is in scope | reply | yes, if Tinfoil is chosen (T4) | 0 | open (sent 12 Nov) |
| P5 | Safety grades for case 07, five arms | No model may go live with an ungraded safety case | me | yes | 30 min | open |
| P6 | Default and fallback model pick | The report names one model | me (you prepare) | yes | 30 min | open (Privatemode GLM-5.3-Flash passed every automatic bar; no Tinfoil arm did) |
| P7 | Provider decision (scorecard final) | Everything downstream depends on it | me | yes | 1 h | open (interim scorecard written) |
| P8 | Stage 3: full Privatemode integration, if Privatemode wins | Spike code is on an unpushed branch, not in the app | you | yes, if Privatemode | 1.5–2 weeks | open (stages 1–2 passed) |
| P9 | Qualification report for the chosen provider and model, with owner-accepted checks (D1) | Chat cannot switch on without a valid report | you draft, me sign | yes | 2 h | open (status `accepted-by-owner` built on the branch) |

## Privacy and legal

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Approve the health-consent text (D2) | Art. 9 consent must be shown in words you stand behind | me | yes | 30 min | open (draft behind a flag) |
| L2 | Consent record: device only or server proof (D3) | GDPR Art. 7(1): you must be able to show consent | me | yes | 15 min decide; 1–2 days if server | open (default: device only) |
| L3 | Approve the provider privacy text (D8) | Users must know who processes messages and where | me | yes | 30 min | open (draft behind a flag) |
| L4 | D10: the live policy names no provider and no transfer | The policy is untrue the moment chat sends a message | you then me | yes | 2 h | open |
| L5 | Accept the chosen provider's DPA as a business customer; note the transfer assessment in the DPIA | Processor contract (Art. 28) | me | yes | 1 h | open |
| L6 | Health legal basis (Art. 9(2)(a) explicit consent) settled with the provider's terms | Both providers put the basis on us; Tinfoil limits health to incidental without a written agreement | me | yes | depends on T4 | open |
| L7 | Retention rule: 90-day request purge | The policy promises it | you | yes | 0 | done (live on Render, function installed 25 Oct) |
| L8 | Resale / end-user clause: Tinfoil §10, Privatemode §2.4 | Using the API for our users must be allowed | reply | yes | 0 | Tinfoil: answered by its docs; Privatemode: open (P4) |
| L9 | Router release pinning policy (A14) for the block-only attestation audit | Without it the audit stays off; the DPIA draft wanted it on | me | no (alpha runs on owner acceptance) | 1 h decide | open |
| L10 | Review the DPIA and terms drafts | Required documents for a real user | me | yes | half a day | open |
| L11 | Imprint: second fast contact channel (phone or form) | German imprint rules are often read as needing it | me | no | 30 min | open |
| L12 | Google sign-in screen shows "CometRow" (Google console, Branding) | Users see the app name when signing in | me | no | 15 min | unknown |

## Security

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Expired sessions rejected server-side | A copied old cookie must not work | you | yes | 2 h (test, fix if needed) | unknown (no test in the repo proves it) |
| S2 | Rotate the exposed database password | You named it exposed; I have no record of where | me | yes | 1 h | unknown |
| S3 | Rotate the Privatemode key | You asked for it; the key was never printed in this work | me | no (spend budget is zero) | 15 min | unknown |
| S4 | Restricted database roles in use | Limits damage if the service is breached | you | yes | 0 | done (owner-reported 25 Oct: `cometrow_runtime`, restricted, pending 0) |
| S5 | Stop switch tested on Render | Must work under pressure, not only in tests | me (you guide) | yes | 30 min | open (unit-tested on the branch) |
| S6 | Spend cap value (`approvedSpendUSD`, D5) | The ceiling is only as good as its number | me | yes | 15 min | open |
| S7 | Live header check after the next deploy | Security headers on every response | you | no | 10 min | done for `ae439fa`; redo per deploy |

## Product

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | /account loading fix checked on a real device | First screen a friend sees | me | no | 10 min | unknown (deployed in `ae439fa`, not looked at) |
| R2 | Email delivery, or Google-only for the alpha | Without email: no recovery, no self-service closure | me | yes (decision) | 15 min decide; 1–2 days if email | open |
| R3 | Invitee list (at most 10 allowlisted emails) | Who gets in | me | yes | 15 min | open |
| R4 | Safe Browsing "Dangerous site" warning explained (Search Console) | Could scare a friend away at sign-in | me | yes | 30 min plus Google's wait | open |
| R5 | Web search on or off for the alpha | Brave unresponsive; no search key in production | me | no | 15 min | open (off today) |
| R6 | Support contact and pause or revoke rule (plan 8.4) | Friends need someone to write to | me | yes | 30 min | open |

## Testing

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Isolation test with a second Google account on the live site | One user must never see another's data | me + you | yes | 1 h | open |
| T2 | Safari, Firefox and phone checks of a real chat | Friends use different browsers | me | yes | 2 h | open |
| T3 | Masking gaps known and stated: scans 87.3 %, ID numbers 94.1 %, page-fetch URLs unchecked (D11, D12) | Copy must not promise more than the detector does | you | no (stated as known limits) | 1 h | open |
| T4 | Rollback test with chat on | Rollback was drilled without chat | me (you guide) | yes | 1 h | open (drilled 25 Oct, chat off) |
| T5 | Full suites green on the merged branch, CI green | Deploy only tested code | you | yes | 1 h | open (green on each branch separately) |
| T6 | Cancelled request, truncated reply and attestation failure on the live provider | Cost and error behaviour with real money | you + me | yes | 2 h | open |
| T7 | TalkBack / phone accessibility session (plan 6.1) | Screen-reader users | me | no | 1 h | open |

## Ops

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| O1 | Backup destination (7.2) | A lost database means lost accounts | me | yes | 1 h | open |
| O2 | Alert provider for downtime (7.3) | You need to know when the service is down | me | yes | 1 h | open |
| O3 | Recovery rehearsal (7.1) | A backup is only real once restored | me + you | no | 2 h | open |
| O4 | Add the provider key and report on Render; switch chat on (runbook step) | The switch is dormant until then | me (you guide) | yes | 30 min | open (runbook section on the branch) |
| O5 | Week-one monitoring list: readyz, spend vs cap, purge log line, refused requests, error rate | Spot problems before friends do | you write, me watch | no | 1 h | open |
| O6 | Branch merge plan: merge `alpha-provider-neutral` into `codex/development-handoff`, CI, deploy; bring `main` (391 commits behind, last 4 Oct) up to date | Release one tested line, not three | you | yes | 2 h | open |
| O7 | `privatemode-eval` stays unmerged unless Privatemode wins; then it feeds Stage 3 | Keeps the spike out of production | you | no | 0 | open |

## Fastest order to alpha

**Now, in parallel while the provider replies are pending** (none depends on the choice):
1. **You (owner):** P5 safety grades · L1 and L3 text approval · L2, R2, R3, R5, R6, S6 decisions · S2 and S3 rotations · R4 Search Console · R1 device look · O1 and O2 providers · L10 DPIA and terms review · L11, L12.
2. **Me (agent):** S1 expired-session test · O6 merge `alpha-provider-neutral` and update `main` · T3 limits in the copy · O5 monitoring list · L4 policy fix prepared for both providers.

**When the replies arrive:** P7 decision (with P6 model) → if Privatemode: P8 Stage 3 (1.5–2 weeks); if Tinfoil: no integration work.

**Then, in sequence:** P9 report signed → L5 DPA accepted → O4 key and report on Render, chat on for the owner only → T1 isolation, T2 browsers, T6 live failures, S5 stop switch, T4 rollback → invite the first friend.

Estimated critical path: Tinfoil, about 3–4 working days after the decision; Privatemode, about 2–3 weeks (Stage 3 dominates).
