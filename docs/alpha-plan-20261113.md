# Alpha plan: what the alpha must prove before launch (13 November 2026)

**Status: draft for the owner. Nothing here is decided until the owner approves the targets. All gates stay closed.**

The owner decided (13 November) that the invite-only alpha is the only test before public launch. There is no beta. So the alpha must prove everything launch needs, with real people, and the owner must be able to see it **without ever reading a message or an answer**.

Sources checked for this plan: `docs/owner-decisions.md`, `docs/pre-alpha-checklist.md`, `docs/week-one-monitoring.md`, `docs/privatemode-attestation-limit-20261112.md`, `docs/thinking-timeouts-20261113.md`, `docs/german-rules-20261113.md`, `evaluation/german-rules-40-20261113/SUMMARY.md`, the launch-gap audit of 13 November, and the code in `server/`, `src/` and `shared/` on `codex/development-handoff` (`b495c16`). Nothing was run live.

## Scope of this phase: staged rollout behind switches (owner update, 13 November, night)

Recorded from the owner's update. Nothing in this section is built or verified by it. Feature status, row by row: `docs/pre-alpha-checklist.md` rows U1 to U12 and K1 to K6.

- **One phase.** This invite-only alpha is the only real test (alpha = beta). There is no separate beta.
- **First batch.** The first invitees come in as soon as core chat and file upload (U1) are ready, and the cost controls K1 to K6 are in place.
- **Staged rollout.** Every other feature goes live for invitees behind its own switch, as it lands. No per-feature switch exists in the code yet.
- **Order** (owner's priority): files and PDF, then voice-to-text, then text-to-speech and PDF export, then images, then Projects and canvas, then memory, then code execution, then deep research (premium, strict caps), then scheduled tasks and reminders, then live voice.
- **Constraints.** Anything that leaves the device goes only to Privatemode's confidential models (EU). No browser built-in dictation. Browser on-device speech synthesis is fine for text-to-speech. Images are never stored after the answer. Memory is stored on the device; the server stores no profile.
- **Later, not in this phase:** connectors (Gmail, Drive, Calendar), browsing and click agents, custom assistants, image generation, video, podcast-style audio, Word, Excel and PowerPoint creation, daily brief, live camera and screen sharing.
- **Proposed, for the owner to approve:** a feature is switched on for the owner's account first, then for invitees. A feature counts as tested for launch only after real invitees used it (section 8).
- **Budget (owner-reported, not verified):** 1.579M of 5M free Privatemode tokens left. Pay-as-you-go cannot be enabled yet (the billing form needs a VAT ID). The agent tells the owner when the balance drops below 0.5M (K6).

## 1. How the owner sees the alpha without reading content

| Source | What it holds | What it never holds |
| --- | --- | --- |
| Usage ledger in PostgreSQL (queries in `docs/week-one-monitoring.md`) | One row per chat request: account ID, time, state (`transport_complete` or `uncertain`). A Thinking request has 4 extra "unit" rows (it costs 5), so the mode can be counted. (confirmed 14 November, D19) | Messages, answers, search text, model replies |
| `"user"` table | How many invitees signed in at least once | Anything about use |
| Render log | Startup line, purge line, the `Privatemode attestation queue: {...}` counts | Bodies, paths, headers, account data (by design) |
| Privatemode portal | Tokens and spend per key, free-token balance | Content (encrypted end to end) |
| Invitees | Survey answers, interview notes, support messages: categories and yes/no only | Message text (we ask them not to send it; see section 4) |

**Rule for support:** if an invitee pastes a message or a screenshot of a chat anyway, do not keep it. Ask for the kind of task and a made-up example instead (as in `docs/invited-trial-runbook.md`).

## 2. Phases

The allowlist holds at most 10 addresses (`server/deployment-config.ts`). Your own account counts if it is on the list.

| Phase | Who | Length | Entry criteria (all must be true) | Exit criteria (all must be true) |
| --- | --- | --- | --- | --- |
| 0. Ready | Only you | 2 days with chat on | **Paid Privatemode billing enabled and topped up** (owner decision, 14 November: no invite on the free quota alone); File upload (U1) ready and the cost controls K1 to K6 in place (owner update, 13 November night; `docs/pre-alpha-checklist.md`); Owner list steps 1 to 13 done (`docs/owner-decisions.md`); a Privatemode spend budget exists; `inference.allowance` is set in the deployment config; T1 (second account) and T2 (Safari, Firefox, phone) passed; the support contact exists (R6); calendar reminders set for the weekly report renewal and the key expiry; the Privatemode monitoring routine is ready (`docs/week-one-monitoring.md`, 13 November section) | You sent at least 20 messages in each mode on the live site; 0 errors you cannot explain; the morning and evening routine worked twice |
| 1. Two friends | 2 invitees | at least 7 days | Phase 0 exit met; both invitees got the short guide (what is private, the 1-hour sign-out, saved history lives in one browser, how to reach you) | At least 100 messages in total (roadmap bar I2); chat success at least 97 % per mode; 0 privacy incidents; every report answered within 24 hours; one weekly report renewal done with no outage; a 20-minute interview with each friend |
| 2. Up to 10 | Add invitees in groups of 2 to 4, one group a week | at least 4 weeks | Phase 1 exit met; you decided whether to raise our limit of 3 chats at once per server (today still 3, `server/app.ts`); Privatemode answered the attestation question (owner list step 1), or you accept today's limit; free tokens plus budget cover the next 4 weeks | All launch targets in section 3 met over the **last 2 weeks**; every launch-scope path in section 7 used by real invitees; survey done by at least 7 of the invitees; interviews with at least 5 |

Why groups of 2 to 4: Privatemode's attestation limit is per organisation and low (about 6 to 10 checks, then a 60-second pause, measured 13 November). Several people starting at the same moment can trigger the "busy" message. Small groups show the real effect before it hits everyone.

## 3. Launch-readiness metrics

"Partly" means a rough number exists today but it mixes things or has no denominator. "Not measured yet" means a counter must be built (launch-gap audit G4: content-free daily counters, enum fields only).

| # | Metric | Launch target | Where the number comes from today | Status |
| --- | --- | --- | --- | --- |
| M1 | Chat success rate, per mode | at least 98 % of sent messages end with a complete answer, not counting the user's own Stop | Ledger query E: `transport_complete` against `uncertain`, per mode. `uncertain` also counts the user's Stop, upstream refusals and broken streams. Refused requests (M4) never get a row | Partly (proxy) |
| M2 | Time-outs, per mode | Fast at most 1 %, Thinking at most 2 % of messages | The browser shows "Response timed out", but the server logs nothing. In the ledger a time-out is one of the `uncertain` rows | Not measured yet |
| M3 | Attestation "busy" answers (HTTP 503 `attestation_busy`) | under 1 % of chat sessions; no day with a 60-second Privatemode pause caused by our own tests | Render log line `Privatemode attestation queue: {...}`: `busy` and `limited429` totals since the last restart. The per-account cap (2 at once, 10 per 10 minutes) answers busy **without** a log line. No count of sessions to divide by | Partly |
| M4 | Refused requests by class: no allowance, spend cap, 3 per server, 1 per account, paused | spend cap reached 0 times; "already running" (both kinds) under 1 % of messages; allowance refusals only for people who really used it up | Nothing: the relay answers 429 or 503 without logging, by design. Query C shows who is near their allowance | Not measured yet |
| M5 | Masking false alarms reported ("Kept on this device: 1 date of birth" when there was none) | at most 2 reports in the last 2 weeks, each fixed or explained | User reports and survey question 5 | User report only |
| M6 | Confident wrong answers reported | 0 that caused harm; each report reviewed within 48 hours; no topic reported twice without a fix | User reports, survey question 4, interviews. Test result for reference: 1 of 40 unwarned with the answer-side check (`evaluation/german-rules-40-20261113/SUMMARY.md`) | User report only |
| M7 | Sign-in problems | every invitee signs in on the first try or after one support message; 0 lock-outs | `SELECT COUNT(*) FROM "user";` against the number invited (who signed in at least once). Failed sign-ins are not logged | Partly |
| M8 | Cost per weekly active user | at most EUR 2.00 per active user per week (EUR 100 a month for 10 people is about EUR 2.30); whole alpha within the Privatemode budget; the app's spend cap never reached | Privatemode portal (EUR and tokens per key) divided by weekly active accounts (query F). The relay cannot meter Privatemode tokens, so the ledger books every request at worst case | Partly (manual, weekly) |
| M9 | Weekly active users and return rate | at least 70 % of invitees active in 3 of the last 4 weeks | Query F, week by week (counts only) | Measured |
| M10 | Browsers and phones covered | at least one real invitee chat on each: Chrome, Firefox and Safari on a computer; Chrome on Android; Safari on iPhone | Survey question 6 and your T2 checks. The server stores no browser data (user agent set to null in `server/account-auth.ts`) | Not measured yet |
| M11 | Chat ready on a phone (first load, 29 MB Privatemode Wasm) | first visit at most 30 s on mobile data; later visits at most 5 s | Your stopwatch in T2; no counter | Not measured yet |
| M12 | Speed: time to first word, per mode | Fast: 9 of 10 messages under 5 s; Thinking: 9 of 10 under 30 s | Only from benchmark runs (`docs/thinking-timeouts-20261113.md`), not from real use | Not measured yet |
| M13 | Support response time | first reply within 24 hours (48 hours at the weekend) for every message | Your own support log (date in, date of first reply, category); no tool exists and the mailbox (R6) is not set up | Not measured yet |
| M14 | Privacy incidents | 0: nobody sees another person's data, no content in any log | User reports, T1, your weekly Render log read | User report and manual check |
| M15 | Usefulness | average at least 4 of 5 in the survey; at least half would pay or recommend | Survey questions 3 and 8, interviews | Survey only |
| M16 | Operations done on the hosted service | each at least once in the alpha: weekly report renewal with no outage (every week), key rotation, rollback, stop switch, backup restore | Your notes in the docs ledger | Manual |

## 4. Feedback survey (8 questions, about 3 minutes)

Send it at the end of phase 1 and every 2 weeks in phase 2. Send it as a plain email, or use a form tool only after you checked where it stores answers. Keep the answers in your own sheet.

Put this line at the top: **"Please do not copy, paste or describe what you wrote to CometRow or what it answered. We only want categories and yes or no."**

1. On how many days did you use CometRow last week? (0 / 1-2 / 3-4 / 5-7)
2. What kind of tasks did you use it for? Tick all that fit: writing and emails / work questions / German rules, fees or deadlines / health / money / coding / learning / other.
3. How useful were the answers? (1 = not at all, 5 = very)
4. Did an answer look sure of itself but turn out wrong? (no / once / more than once). If yes: which kind of task (same list as question 2), and did CometRow show a warning? (yes / no / not sure)
5. Did you see any of these? Tick all: "busy checking the secure server" / "Response timed out" / "Still thinking" for a long time / "a request is already running" / allowance used up / sign-in trouble / signed out when you did not expect it / lost saved chats or the passphrase / a privacy notice said it removed something that was not there / slow first load / none.
6. Which devices and browsers did you use? Tick all: Windows, Mac, Linux, Android, iPhone or iPad; Chrome, Firefox, Safari, Edge, other.
7. How much do you trust that your messages stay private? (1 to 5) What would make you trust it more? (a short sentence, no message text)
8. How likely are you to recommend CometRow to a friend? (0 to 10) Would you pay for it? (no / maybe / yes, up to EUR ___ a month)

## 5. Interview script (20 minutes)

Before you start, say: "Please don't tell me what you asked or what it answered. Tell me the kind of task, and how it went." If they start to describe a message, stop them kindly and ask for the kind of task instead. Take notes as categories, not quotes about content.

| Minutes | Part | Questions |
| --- | --- | --- |
| 0-2 | Start | Thank them. Explain the rule above. Ask if you may take short notes. |
| 2-5 | Habits | When did you use CometRow last? What did you use before for the same kind of task? Why did you pick CometRow that time? |
| 5-10 | Value | Which kind of task worked best? Which kind did not work? Did you switch to another tool for something? Why? Which mode did you use more, Fast or Thinking, and why? |
| 10-15 | Trouble | Tell me about a moment it got in your way (busy message, waiting, sign-in, sign-out after an hour, the passphrase, a warning). What did you do next? Did any answer look sure but turn out wrong? What kind of task was it, and did you see a warning? Did you ever doubt a privacy notice? |
| 15-18 | Trust | In your own words, what happens to your message after you press Send? What would make you trust it more, or less? Would you use it for health or money questions? |
| 18-20 | Price and close | Would you pay for this? How much would feel fair a month? Would you tell a friend about it? Anything else I should fix first? Thank them. |

## 6. Weekly review (15 minutes, every Monday)

| Minutes | Step |
| --- | --- |
| 0-5 | Run queries C, E and F from `docs/week-one-monitoring.md` and read the Privatemode portal (spend this week, free-token balance). Fill one row of the table below. |
| 5-8 | Search the Render log for the week: `Privatemode attestation queue:`, `Request record purge failed.`, `startup failed`. Note the highest `limited429` and `busy` you saw. |
| 8-11 | Read your support log and survey answers. Count reports by kind (wrong answer, masking false alarm, sign-in, busy, time-out). Check every report got a reply within 24 hours. |
| 11-13 | Compare with the targets in section 3 and the stop rules in section 7. Pick **one** thing to fix or ask this week. |
| 13-15 | Check the calendar: next report renewal (`validUntil`), key expiry, budget left. Decide whether the next group of invitees may join. |

Weekly row to keep (in this file or your own sheet):

| Week | Active accounts | Messages Fast / Thinking | Complete % Fast / Thinking | `busy` / `limited429` (max seen) | Portal EUR | EUR per active user | Free tokens left | Reports by kind | Slowest support reply | Next group? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | | |

## 7. Stop or pause rules

Stop chat with the stop file: from the Render service shell, `touch <stopFile>` (`docs/development-deployment.md`). It refuses new requests at once and shows "Private chat is paused by the operator." A restart clears it, so for a stop that lasts, also set `"enabled": false` and redeploy.

| Trigger | Action | Resume when |
| --- | --- | --- |
| **Privacy incident:** anyone sees another person's data, content appears in a log, or a wrong person got access | Stop chat at once. Remove the address from the allowlist (this blocks only new sign-ins; a session already open keeps working until 1 hour after its last use, so keep chat stopped until then). Follow the breach plan (D16): you have 72 hours to decide whether to report to the authority | Cause found and fixed, a test added, T1 repeated, your written approval |
| **Wrong-answer pattern:** 2 reports of a confident wrong answer **without a warning** on the same kind of task, or 1 that caused real harm (missed deadline, lost money, health) | Tell invitees not to rely on that kind of answer. Pause chat if health or real harm is involved. Review the answer-side check for that topic | A fix tested on fresh questions, or a clear warning that covers the case |
| **Cost overrun:** portal spend above EUR 25 in one week, above 50 % of the monthly budget before the 15th, or free tokens gone with no budget | Pause new invitees. Stop chat if the budget would be passed before the month ends | Budget raised by you, or the cause found (for example a test run on the alpha key) |
| **Free tokens low:** the Privatemode free balance drops below 0.5M (owner's rule, 13 November night; owner-reported balance then: 1.579M) | The agent tells the owner at once. No new invitees while pay-as-you-go cannot be enabled | Paid billing is active, or the owner decides to go on |
| **Provider outage:** a Privatemode incident, or the attestation pause repeats for more than 15 minutes, or fewer than 8 of 10 messages complete over an hour | Stop chat and tell invitees. No automatic switch: a move to Tinfoil is manual and announced (`docs/provider-switch-20261112.md`) | Privatemode recovered and 10 test messages pass at a quiet hour |
| **Report or key expired:** chat stops for everyone by itself | Renew the report or the key, restart | `/api/status` shows `"ready":true` |
| **Serious safety output** (for example self-harm handled badly) | Pause chat, keep only content-free notes, review | Safety case re-graded by you |
| **Support overload:** you cannot answer within 48 hours | No new invitees | Backlog cleared |

## 8. What would delay launch

- Any launch target in section 3 not met in the last 2 weeks of phase 2.
- Fewer than 100 real messages, or fewer than 5 regular users. The numbers would be too small to trust.
- The counters in section 9 are not built. Without them M2, M4 and M12 cannot be shown.
- An open privacy incident, or a wrong-answer pattern without a fix.
- Privatemode's attestation limit too low for launch numbers, with no higher limit offered (owner list step 1).
- Real cost per user unknown, or above what the price or free plan can carry.
- A launch-scope path that real invitees never used in the alpha. With no beta, each one must be used here first:
  - web search in production (possible since 13 November with `inference.searchKeyFile`; on or off is your decision R5);
  - the launch language (German and English are built; German is off by default until the legal read, build setting `VITE_GERMAN_UI=1`);
  - each in-scope feature, switched on for invitees (`docs/pre-alpha-checklist.md` rows U1 to U12);
  - an open or waitlist sign-up (today: allowlist of at most 10);
  - payments, if launch is paid;
  - self-service account closure (today it needs email, which is off);
  - data export and "delete everything".
- Operations not done on the hosted service: backups (O1), alerts (O2), a hosted restore (O3), the account erase and suspend steps.
- Legal texts not approved (L1 to L10, health consent, terms, 18+ rule).

## 9. Counters that would need building

**Update, 13 November night:** a first set is built (not deployed): an hourly log line `CometRow counts (last hour)` with outcomes per mode (completed, interrupted), refusals by class (allowance, 1 per account, 3 per server, spend cap), Privatemode failures by class, attestation checks verified and busy (queue full, or the per-account share), and searches run and failed. It now covers M3 and M4, and M1 and M2 roughly ("interrupted" mixes the user's Stop, time-outs and dropped connections). Still not built: first-word time, failed sign-ins by reason, the thumbs up or down.

From the metrics marked "not measured yet" or "partly". All content-free: daily counts with enum fields only (reason, mode, outcome, time bucket), no account ID, no text.

| Counter | For | Notes |
| --- | --- | --- |
| Refusals by class (allowance, spend cap, 3 per server, 1 per account, paused, busy from the per-account attestation cap) | M3, M4 | Today these answers are not logged at all |
| Outcome per mode: complete, time-out (first word or total), Stop by user, upstream error | M1, M2 | Needs a small signal from the browser, because the browser decides the time-out |
| Time to first word, in buckets, per mode | M12 | Browser-side, buckets only |
| Chat sessions verified (attestation checks started) | M3 | The denominator for busy answers |
| Failed sign-ins by reason | M7 | No email or account data |
| Optional thumbs up or down with a category (wrong figure, masking false alarm, too slow, other) | M5, M6 | Behind a flag, off by default, privacy sentence approved by you |

Both expiry warnings (the weekly report, 48 hours ahead; the Privatemode key, 14 days ahead) were added on 13 November as hourly log lines in `server/app.ts`, which production uses. They are log lines only, so they need the alert (O2) or a daily log look.
