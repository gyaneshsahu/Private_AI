# While you slept: alpha = launch readiness (13 November 2026, early morning)

You asked me to prepare the alpha as if it were the launch, since there will be no beta. I did everything that needed no account, money, legal sign-off or decision from you. Everything is on `codex/development-handoff` and pushed. **Nothing is deployed, `main` is untouched, and no messages were sent.**

## The one thing you must know first

**Before tonight, no invitee could chat at all.** The relay refuses anyone without a chat allowance, and production had no way to give one: the hosted rehearsal inserted one by hand with SQL. This is now built (`inference.allowance` in the deployment config), but **you must set the number** before inviting anyone (recommendation: 150 requests per 7 days; Thinking counts as 3).

## What I built (all tested; none of it switches anything on by itself)

| What | Why it matters | Commit |
| --- | --- | --- |
| **Automatic chat allowance** per invitee, renewed each period, set in the config | Without it, nobody can chat (see above) | `40a2a86` |
| **Web search in production** through an optional Brave key file (`inference.searchKeyFile`); Goggles never in production | Production refused any search key, so the German-rules protection (search first, always search, official sources) could never reach real users | `6f5d468` |
| **Notice to all users** from a text file (`inference.noticeFile`), shown as "Notice from CometRow: …" | You had no way to announce a provider switch or an outage | `6f5d468` |
| **Warnings before the weekly report or the key expires**, an hourly log line (48 hours ahead / 14 days ahead), now also in production | When the report expires, chat stops for everyone without warning | `6f5d468` |
| **The 29 MB Privatemode file is cached and compressed:** the Render bridge forced "no-store" on everything, so every visit downloaded 29 MB again. Now cached for a year under its hash name and sent compressed (about 5 MB) | First load on phones; repeat visits | `9ed8288`, `6f5d468` |
| **Suspend or erase one account:** a script prints one SQL transaction for you to review and run (show, suspend, unsuspend, erase), plus an 8-step erasure procedure in the runbook | Google-only users cannot close their account (closure needs email); GDPR Art. 17 requests | `a413aec`, `aa13102` |
| **Content-free counts:** one log line per hour, `CometRow counts (last hour)`, with outcomes per mode, refusals by class, busy answers, searches. No account, address or text | You can see what users hit without reading content | `cb747dd` |
| **Fixes from an independent code review:** one user could fill the shared attestation queue (now at most 2 at once, 10 per 10 minutes per account); the automatic retry after a time-out could be refused by our own relay; "Answer again with Thinking" lost its mode behind the health-consent prompt | Availability and correctness | `40a2a86` |
| **Masking:** a date in rules text ("Geburten ab 1.7.2015") no longer shows "1 date of birth" | Side finding of the 40-question test; masking evaluation unchanged | `14ef2dd` |
| **Safety case 07 for Thinking (glm-5.3 high)**, 3 repetitions, ready for you to grade | The safety gate needs your grade | `b495c16` |

## What I wrote for you to read

- `docs/alpha-plan-20261113.md`: what the alpha must prove for launch. It has 16 metrics with proposed targets, phases (2 friends, then up to 10), an 8-question survey, a 20-minute interview script, a 15-minute weekly review, and stop rules.
- `docs/week-one-monitoring.md`: rewritten for Privatemode, including a rule of **no live tests during alpha hours** (our tests and real users share one attestation limit).
- `docs/privacy-policy-corrections-draft-20261113.md`: the current policy says an account can be closed in one place and cannot in another. It also lacks a legal basis per purpose, a rights section and the browser-storage list. The draft fixes these for your legal read, with open questions.
- `docs/pre-alpha-checklist.md` (new top section) and `docs/owner-decisions.md` (updated order and new launch decisions).
- `docs/development-deployment.md`: how to set the three new config fields.

## How it was checked

- **Unit tests:** full suite green apart from 2 known slow UI tests that time out only when two suites run at once. Both pass alone.
- **Database suite:** 137 of 137, run locally against the throwaway synthetic database, including the new erase and suspend SQL.
- **Live smoke through the real app on Privatemode:** Fast and Thinking answered, the compressed file loaded and verified in a real browser, and search ran with the official page read. The question that used to show the false "date of birth" notice now shows none.
- **CI (GitHub): green on `2c69e48`** (offline and durable jobs). It now also runs the Render bridge tests, which CI never ran before: 6 of 6 pass, including the new caching test.
- The bridge tests cannot run on this laptop because of a test-certificate problem (Git's openssl with Node 24). It is the same before and after my change, and it is not a bridge fault; CI on Linux runs them.

## Known limits I did not change (you should know before setting the budget)

- **A message retried after a provider refusal counts twice** against the user's allowance.
- **A modified browser could claim Fast while asking for Thinking-level effort.** The message body is encrypted, so our server cannot check it. The Privatemode portal spend limit is the real backstop.
- **Our limit of 3 chats at once per server** is pinned by the deployment review checklist. Raising it to 10 is a one-line change once you say yes.

## Your steps, in order (full list in `docs/owner-decisions.md`)

1. Send the attestation-limit question to Privatemode support (draft ready).
2. Create the alpha key (rate limit, expiry, spend limit). Store it only on Render.
3. **Money:** the Privatemode budget, the app's spend ceiling, and **the chat allowance per invitee** (new).
4. Approve the Privatemode privacy wording, including the new "Always search" sentence.
   - 4b (new) **Search on or off for the alpha.** I recommend on, which needs a Brave production key.
5. Accept the four open report checks and confirm the repository name.
6. File the DPA and the 12 November email.
7. **Grade safety case 07:** both files are in `.local/privatemode-fast-tier-20261112/`.
8. Context size 32,000.
9. Rotate the database password.
10. Legal texts, now including the privacy-policy corrections draft.
11. Safe Browsing.
12. Cohort and support mailbox. The erasure path depends on the support mailbox.
13. Deploy and switch on.
14. Device checks.

**Launch decisions that now fall inside the alpha** (no beta), all in `docs/owner-decisions.md`:
- free or paid at launch;
- a German interface (the app is English only today);
- open sign-up and capacity beyond one server;
- the privacy-policy fixes;
- whether erasure should also delete request records (I made it delete them).

## Spend tonight

- **Privatemode:** about 25,100 tokens: safety case 4,489, live smoke about 20,600.
- **Brave:** 2 searches.
- **Free allowance:** about 0.66M tokens left (app-reported; I did not check the portal).
- **Before tonight:** the 40-question German-rules test used 308,365 tokens and 42 searches.

## Housekeeping

- The throwaway test database container was started for the database tests and stopped again afterwards.
- The helper checkouts `Private_AI-mask` and `Private_AI-ops` were removed. Their work is in the branch.
- Your uncommitted files were not touched: `package.json`, `docs/search-provider-comparison.md`, `docs/media/`, `docs/privatemode-master-notes.md`, `docs/tinfoil-docs.md`, `scripts/ad-*`, `scripts/render-titles.mjs`.
