# Pre-alpha checklist — 12 November 2026

Everything left before the first invited friend uses CometRow chat. Sources: the repository, `docs/owner-decisions.md` (branch `alpha-provider-neutral`), `docs/provider-qualification-20261026.md`, `docs/provider-model-decision-20261026.md`, `docs/READINESS.md`. The "concerns doc" the owner named does not exist in the repository or `docs/private/`, so nothing was taken from it.

Who: **Owner** (Gyanesh), **Agent** (Claude), **Waiting on a reply** (a supplier). Items with IDs such as A15 or B17 come from the owner's concerns log; that log is not in the repository, so their descriptions come from the owner's message of 12 November. Status: done, open, unknown (cannot be verified from here; never counted as done). Effort is working time, not waiting time.

## Provider

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Edgeless reply: P4 (an app may serve its own users with our key held server-side) | Knockout: a "no" ends Privatemode | Waiting on a reply | yes, if Privatemode is chosen | 0 | open (sent 12 Nov) |
| P2 | Edgeless reply: P8 (deprecation notice, exact-version pinning) | Tie-break between providers | Waiting on a reply | no | 0 | open |
| P3 | GPU attestation scope (former P3) | Trust row of the scorecard | Agent | no | 0 | done (answered by Privatemode docs) |
| P4 | Tinfoil replies: T1 (EU option), T4 (written agreement for health) | Legal fit; health is in scope | Waiting on a reply | yes, if Tinfoil is chosen (T4) | 0 | open (sent 12 Nov) |
| P5 | Safety grades for case 07, five arms | No model may go live with an ungraded safety case | Owner | yes | 30 min | open |
| P6 | Default and fallback model pick | The report names one model | Owner (Agent prepares) | yes | 30 min | Tinfoil modes picked from the 12 Nov wide screen (`docs/wide-screen-20261112.md`): Fast deepseek-v4-1-flash / glm-5-3 high, Thinking glm-5-3 max / deepseek thinking low; owner grades safety case 07 for these arms, blind benchmark running; earlier: 12 Nov parity run agrees with the 11 Nov screen (Tinfoil gpt-oss-120b misses only the open question in this run and citation format 2/3 in the screen; Privatemode GLM-5.3-Flash meets every automatic bar), `docs/parity-matrix-20261112.md` |
| P7 | Provider decision (scorecard final) | Everything downstream depends on it | Owner | yes | 1 h | open (interim scorecard written) |
| P8 | Stage 3: full Privatemode integration, if Privatemode wins | Spike code is on an unpushed branch, not in the app | Agent | yes, if Privatemode | 1.5–2 weeks | plan written 12 Nov (`docs/privatemode-stage3-plan-20261112.md`: 22–33 agent-hours, 6–9 days after P7; the spike's root routes would bypass session, spend and stop controls; a fifth privacy sentence; under the 26 Oct rule only GLM-5.3-Flash qualifies); spike relay crash on disconnect fixed on local `privatemode-parity` |
| P9 | Qualification report for the chosen provider and model, with owner-accepted checks (D1) | Chat cannot switch on without a valid report | Agent drafts, Owner signs | yes | 2 h | draft written 12 Nov (`docs/qualification-report-draft-tinfoil-20261112.md`: 4 checks pass, 4 need owner acceptance; not loadable until signed) |
| A2 | (concerns log) Tinfoil-specific item | Applies only if Tinfoil is chosen | Agent | Tinfoil only | unknown | unknown (description not in the repository) |
| A16 | (concerns log) Tinfoil-specific item | Applies only if Tinfoil is chosen | Agent | Tinfoil only | unknown | unknown (description not in the repository) |
| A17 | (concerns log) Tinfoil-specific item | Applies only if Tinfoil is chosen | Agent | Tinfoil only | unknown | unknown (description not in the repository) |
| B19, B20 | No promise beyond the provider's terms; weekly check of the provider's terms | A changed provider term can make our copy untrue | Agent drafts the check, Owner runs it weekly | yes | 2 h | done 12 November: claims mapped to sources (accurate for Tinfoil; D17 for Privatemode), weekly check script with baseline, runbook step |

## Privacy and legal

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Approve the health-consent text (D2) | Art. 9 consent must be shown in words you stand behind | Owner | yes | 30 min | open (draft behind a flag) |
| L2 | Consent record: device only or server proof (D3) | GDPR Art. 7(1): you must be able to show consent | Owner | yes | 15 min decide; 1–2 days if server | open (default: device only) |
| L3 | Approve the provider privacy text (D8) | Users must know who processes messages and where | Owner | yes | 30 min | open (draft behind a flag) |
| L4 | D10: the live policy names no provider and no transfer | The policy is untrue the moment chat sends a message | Agent, then Owner | yes | 2 h | done in the app (policy names the report's provider whenever chat is ready, branch); published policy file and website still to regenerate at switch-on (O4); texts await D8 |
| L5 | Accept the chosen provider's DPA as a business customer; note the transfer assessment in the DPIA | Processor contract (Art. 28) | Owner | yes | 1 h | open |
| L6 | Health legal basis (Art. 9(2)(a) explicit consent) settled with the provider's terms | Both providers put the basis on us; Tinfoil limits health to incidental without a written agreement | Owner | yes | depends on T4 | open |
| L7 | Retention rule: 90-day request purge | The policy promises it | Agent | yes | 0 | done (live on Render, function installed 25 Oct) |
| L8 | Resale / end-user clause: Tinfoil §10, Privatemode §2.4 | Using the API for our users must be allowed | Waiting on a reply | yes | 0 | Tinfoil: answered by its docs; Privatemode: open (P4) |
| L9 | Router release pinning policy (A14) for the block-only attestation audit | Without it the audit stays off; the DPIA draft wanted it on | Owner | no (alpha runs on owner acceptance) | 1 h decide | open |
| L10 | Review the DPIA and terms drafts | Required documents for a real user | Owner | yes | half a day | open |
| L11 | Imprint: second fast contact channel (phone or form) | German imprint rules are often read as needing it | Owner | no | 30 min | open |
| L12 | Google sign-in screen shows "CometRow" (Google console, Branding) | Users see the app name when signing in | Owner | no | 15 min | unknown |
| A3, A7, C1 | No overclaiming in the app copy and on the website | Promises must match what is built | Agent (app), Owner (website) | yes | 2 h | app: 12 Nov copy audit (`docs/copy-audit-20261112.md`) found 33 overclaims; 9 non-owner ones fixed with a guard test; **open, needs the owner:** 4 high rows in the approved privacy statement ("we never see", "we never can", "checks pass", protected graphics processor) and 2 in the live policy (cache "few hours", 90 days); website: unknown (separate repository `PrivateAI-website`) |
| B15, C6 | Own acceptable-use terms and the 18+ age rule | Users need the rules they agree to | Owner | yes | 1 h | drafts written 12 Nov (`docs/acceptable-use-draft-20261112.md`, `docs/age-rule-draft-20261112.md`), need approval and legal review; not publishable until the support mailbox (R6) exists |
| D12 | Inactivity retention rule | Data of inactive accounts is kept without a rule | Owner decides, Agent wires | no (the policy promises no inactivity deletion) | 1 day if wired | proposal written 12 Nov (`docs/inactivity-retention-proposal-20261112.md`): wiring the existing file would delete nothing on the hosted service; recommended for the alpha: option A, no code, delete accounts a set time after the alpha ends (owner decision) |
| F1 | Imprint, controller identity, Art. 30 record of processing, breach plan with a named contact, AI-transparency note | Legal duties of a controller; users must know they talk to an AI | Agent drafts, Owner approves | yes | 1 day | imprint, identity and AI note in the app: done; Art. 30 record and breach plan drafted 12 November, need approval (D14 to D16) |
| C2, C3 | Website fixes, privacy policy page, deletion path | The public site and the promised deletion must work | Owner (website), Agent (app) | yes | 1 day | in-app policy page and "delete everything": done; account closure needs email (R2); website: unknown |
| B13 | (concerns log) | Not needed for the alpha | Owner | no (public launch only) | — | deferred |
| F2 | (concerns log) | Not needed for the alpha | Owner | no (not for the alpha) | — | deferred |

## Security

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Expired sessions rejected server-side | A copied old cookie must not work | Agent | yes | 2 h (test, fix if needed) | done (test on branch `alpha-provider-neutral`: expired session refused with the old cookie; cookie cache off) |
| S2 | Rotate the exposed database password | You named it exposed; I have no record of where | Owner | yes | 1 h | unknown |
| S3 | Rotate the Privatemode key | You asked for it; the key was never printed in this work | Owner | no (spend budget is zero) | 15 min | unknown |
| S4 | Restricted database roles in use | Limits damage if the service is breached | Agent | yes | 0 | done (owner-reported 25 Oct: `cometrow_runtime`, restricted, pending 0) |
| S5 | Stop switch tested on Render | Must work under pressure, not only in tests | Owner (Agent guides) | yes | 30 min | open (unit-tested on the branch) |
| S6 | Spend cap value (`approvedSpendUSD`, D5) | The ceiling is only as good as its number | Owner | yes | 15 min | open |
| S7 | Live header check after the next deploy | Security headers on every response | Agent | no | 10 min | done for `ae439fa`; redo per deploy |
| S8 | Render bridge forwards the CSRF and chat headers | Without it every chat request through app.cometrow.com fails with 403 | Agent (fix), Owner (deploy) | yes | 10 min | fixed 12 Nov in `09dcf74` with a header test; **needs deploy** and a browser check on the live site |
| A15 | No automatic loading of remote images, links or embeds from model output; strict CSP; canary test | A model answer must not make the browser contact a third party | Agent | yes | 2 h | mostly done: images become "[Image omitted]", links are shown as text, CSP `img-src 'self' blob: data:`; canary test added 12 November (`tests/remote-content-canary-ui.test.ts`): done |
| A1 | The browser stays the authority; a tampered relay or fingerprint is rejected | The relay must not be able to swap the destination | Agent | yes | 0 | done for the Tinfoil path (browser transport test: tampered, wrong host, wrong release); the Privatemode path exists only in the spike (Stage 3) |
| A9 | Threat-model table | Shows what is defended and what is not | Agent | no | 2 h | done 12 November: 12-row update in `docs/threat-model-20261022.md` (22 October table already covered 13 threats); secret scan added to CI the same day; open: breach deputy (D15) |
| A18 | Lockfile, exact versions, provenance and dependency review in CI | Supply-chain attacks through dependencies | Agent | yes | half a day | done 12 November: 3 high production vulnerabilities fixed (undici, zod, body-parser), signatures and audit checked in CI, pin test |
| A14 | Router release pinning (same as L9) | Applies to the Tinfoil audit only | Owner | Tinfoil only | 1 h | open |
| B17 | Rate limits and cohort size | Bounds abuse and cost | Owner sets the cohort; limits verified by Agent | yes | 15 min | limits: done (60/min per path, 1 request per account, 3 per instance); cohort: allowlist up to 10, plan 8.4 says at most 2 (Owner decides) |
| D14 | Hashed sign-in identifiers; client address derived behind Render; cap-exhaustion attack | Private sign-in logs; correct rate limits; no lock-out of a victim | Agent | no while email is off | 0 | hashed identifiers and edge client address: done; cap exhaustion matters only with email sign-in (open if R2 adds email) |
| D16 | Metrics read scoped to the account; uniform answer on cancel | One account cannot read another's usage; cancel leaks nothing | Agent | yes | 0 | done (22 October tests) |

## Product

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | /account loading fix checked on a real device | First screen a friend sees | Owner | no | 10 min | unknown (deployed in `ae439fa`, not looked at) |
| R2 | Email delivery, or Google-only for the alpha | Without email: no recovery, no self-service closure | Owner | yes (decision) | 15 min decide; 1–2 days if email | open |
| R3 | Invitee list (at most 10 allowlisted emails) | Who gets in | Owner | yes | 15 min | open |
| R4 | Safe Browsing "Dangerous site" warning explained (Search Console) | Could scare a friend away at sign-in | Owner | yes | 30 min plus Google's wait | cause narrowed 12 Nov (`docs/safe-browsing-20261112.md`): `cometrow.com` flagged for deceptive pages; nothing is live at the root domain (404) while `app.` asks for Google sign-in; Search Console steps written; owner: verify the domain, read the sample URLs, put the website live, request review |
| R5 | Web search on or off for the alpha | Brave unresponsive; no search key in production | Owner | no | 15 min | open (off today); 12 Nov live comparison (`docs/search-comparison-20261112.md`): Brave stays default; Tinfoil enclave search about 10x the price, skipped search once silently, 12 written questions; owner decides on/off for the alpha |
| R6 | Support contact and pause or revoke rule (plan 8.4) | Friends need someone to write to | Owner | yes | 30 min | open |

## Testing

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Isolation test with a second Google account on the live site | One user must never see another's data | Owner + Agent | yes | 1 h | open |
| T2 | Safari, Firefox and phone checks of a real chat | Friends use different browsers | Owner | yes | 2 h | open |
| T3 | Masking gaps known and stated: scans 87.3 %, ID numbers 94.1 %, page-fetch URLs unchecked (D11, D12) | Copy must not promise more than the detector does | Agent | no (stated as known limits) | 1 h | done in the app (note under answers, page-fetch approval, branch); privacy-statement sentence is owner decision D13 |
| T4 | Rollback test with chat on | Rollback was drilled without chat | Owner (Agent guides) | yes | 1 h | local rehearsal done 12 Nov (`docs/rehearsals-t4-o3-20261112.md`): rollback, roll-forward, stop switch and spend cap pass on one database; found the bridge header blocker (fixed, S8); hosted run open; rolling back past `8a26a30` needs the `inference` key removed from the config first |
| T5 | Full suites green on the merged branch, CI green | Deploy only tested code | Agent | yes | 1 h | done 12 Nov: `alpha-provider-neutral` merged (`8a26a30`), Validate green on the merged line and on later pushes; UI sweep 54/54 clean in Chromium, Firefox and WebKit |
| T6 | Cancelled request, truncated reply and attestation failure on the live provider | Cost and error behaviour with real money | Agent + Owner | yes | 2 h | agent part done 12 November: 6 of 6 pass live (stop before send, stop mid-stream, long reply, output limit, wrong digest); found and fixed report settings being dropped; owner part on Render after chat is on |
| T7 | TalkBack / phone accessibility session (plan 6.1) | Screen-reader users | Owner | no | 1 h | open |

## Ops

| # | Item | Why it matters | Who | Blocks alpha? | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| O1 | Backup destination (7.2) | A lost database means lost accounts | Owner | yes | 1 h | open |
| O2 | Alert provider for downtime (7.3) | You need to know when the service is down | Owner | yes | 1 h | open |
| O3 | Recovery rehearsal (7.1) | A backup is only real once restored | Owner + Agent | no | 2 h | local rehearsal passed 12 Nov (restore 0.5 s); run sheet corrected 12 Nov (CASCADE, new step 5a ends sessions on the restore, service switched only after reopening, reconciliation and roles); hosted run open |
| O4 | Add the provider key and report on Render; switch chat on (runbook step) | The switch is dormant until then | Owner (Agent guides) | yes | 30 min | open (runbook section on the branch) |
| O5 | Week-one monitoring list: readyz, spend vs cap, purge log line, refused requests, error rate | Spot problems before friends do | Agent writes, Owner watches | no | 1 h | done (`docs/week-one-monitoring.md` on the branch) |
| O6 | Branch merge plan: merge `alpha-provider-neutral` into `codex/development-handoff`, CI, deploy; bring `main` (391 commits behind, last 4 Oct) up to date | Release one tested line, not three | Agent | yes | 2 h | steps 1 and 2 done: merged in `8a26a30`, pushed, Validate green; open: deploy (owner), `main` fast-forward and branch policy (owner, rank 15) |
| O7 | `privatemode-eval` stays unmerged unless Privatemode wins; then it feeds Stage 3 | Keeps the spike out of production | Agent | no | 0 | open |

## Fastest order to alpha (recomputed 12 November, after the overnight run)

**The agent's pre-decision list is done** (S1, O6, T3, O5, L4, A15, A18, F1, B19/B20, A9, T5, T6 agent part, P9 draft, parity, UI sweep, copy audit, drafts, rehearsals, Stage 3 plan, search comparison). The critical path is now the owner's decisions and the supplier replies, in the order of `docs/owner-decisions.md`.

**Next, owner (any order, all in parallel):** deploy the bridge fix (S8); P5 safety grades; one text review (copy audit high rows, D8/D10/D14, health consent D2–D4); L5, L6, L10, B15/C6; D15/D16; S2; cohort R2, R3, R6, B17; O1, O2.

**When the provider is chosen (P7 with P6):** Tinfoil: the agent finalises the report on the day (digest, dates), you sign the four acceptances and set D5, then O4 chat on for you only, the hosted checks (browser chat through Render, T6, S5, T4), T1, T2, then the first friend. Privatemode: Stage 3 first (6–9 days, `docs/privatemode-stage3-plan-20261112.md`), and D17 plus the fifth sentence in the privacy text.

**Critical path.** Tinfoil: about 3 to 4 working days after your decisions and text approvals (deploy, report, DPA, switch-on, hosted checks). Privatemode: about 2 to 3 weeks after P7 (Edgeless replies plus Stage 3). Earliest alpha: about 1 week from the day the owner items in ranks 1 to 9 are done, with Tinfoil.
