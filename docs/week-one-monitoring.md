# Week-one monitoring after chat goes on (checklist O5)

## Privatemode version: 13 November 2026 (current)

**Status: written from the code on `codex/development-handoff` (`b495c16`); nothing here is live yet, and no step was run on Render. The Tinfoil-era version of 12 November is kept below for the record.**

Same idea as before: a ten-minute routine, morning and evening, for the first seven days after chat is switched on, then the 15-minute weekly review in `docs/alpha-plan-20261113.md`. Nothing here reads or sends content. Until an alert provider exists (O2), this routine is the only alarm.

**Added on 13 November (committed after `b495c16`, not deployed yet):** the app logs a warning at start and every hour when the report ends within 48 hours ("The provider review expires at ... Renew and deploy the report before then, or chat stops for everyone.") or the key within 14 days, in every entry including production. Also new: an operator notice file (`inference.noticeFile`, shown to every user) and a production search key file (`inference.searchKeyFile`), see `docs/development-deployment.md`. Add both warning texts ("provider review expires", "Privatemode API key expires") to the daily log search.

**Count line (added 13 November, not deployed yet):** once an hour, when anything happened, the log shows `CometRow counts (last hour): {...}` with fixed names only (no account, address or text). `chat.<fast|thinking|none>.<outcome>`: `completed`, `interrupted` (the user's Stop, a browser time-out or a dropped connection), `refused_allowance`, `refused_daily` (daily cap), `refused_account_busy`, `refused_instance_busy`, `refused_spend`, `upstream_rejected`, `upstream_unavailable`, `status_<code>` (for example 503 while paused). `attest.verified`, `attest.busy_queue`, `attest.busy_account_share`, `attest.status_<code>`. `search.executed`, `search.failed`. The counts reset at each restart. Search the log for `CometRow counts` in the daily routine.

What changed with Privatemode:
- Privatemode limits **attestation checks per organisation** (about 6 to 10, then a 60-second pause, measured 13 November). Our server queues the checks and logs a count line when something goes wrong.
- The relay **cannot meter** Privatemode tokens. The ledger books every request at its worst case. The Privatemode portal is the only real cost figure.
- The qualification report is valid for **7 days**. When it expires, chat stops for everyone.
- Every invitee gets an **automatic allowance** from the deployment config.

### Rule: no live tests on the shared Privatemode organisation during alpha hours

Development tests and real users share **one** attestation limit, because Privatemode counts it per organisation, not per key. One test run on 13 November caused a 60-second pause for everyone. The free-token balance is also shared by the whole organisation.

- **Alpha hours: 07:00 to 24:00 German time, every day.** No live call to Privatemode in those hours from your PC, the agent or a script, with any key of the organisation. This covers the benchmark runner (`run-ours.ts --privatemode`), `evaluation/privatemode/*` probes, `session-verify-live.ts` and manual chats on a local server.
- Outside alpha hours, a live test needs your go-ahead for that run. Afterwards, check the Render log for a `Privatemode attestation queue:` line with a new `limited429`.
- Chatting yourself on app.cometrow.com is real use, not a test, and is fine.
- If tests must run during the day, the fix is a separate Privatemode organisation for development (ask Privatemode), not a second key.

### Daily routine (morning and evening)

Rows marked "new" are Privatemode checks. The other rows still apply from the Tinfoil-era table below (deploy state, startup line, headers, certificate).

| What | Where | Normal | Act when | What to do |
| --- | --- | --- | --- | --- |
| Service up | `curl -sS -o /dev/null -w "%{http_code}\n" https://app.cometrow.com/readyz` | `200` (body "ready") | anything else | Read the Render log; if the database or role is the cause, stop chat and use the runbook |
| Chat ready (new) | In a signed-in browser tab: `https://app.cometrow.com/api/status` | `"inference":{"ready":true,...}` | `"ready":false` | The `reason` says why: "paused by the operator" (stop file), "spending limit ... is reached" (spend cap), or "unavailable until provider qualification ..." (report expired or invalid, key or manifest missing) |
| Attestation queue (new) | Render, Logs, search `Privatemode attestation queue:` | no line at all | any line | See "Attestation queue line" below |
| Busy answers (new) | Same log line (`busy`), and friends' reports | `busy` not rising | `busy` rising, or a friend saw "CometRow is busy checking the secure server" | Check that nobody ran a live test (rule above). If it happens with real use only, note the time and the count for the Privatemode support question (owner list step 1) |
| Our own 429s (new) | Friends' reports only (not logged) | none | "Three requests are already running" or "A request is already running for this account" | See "Our own limits" below |
| Report renewal (new) | `/api/status` (signed in): `inference.qualification.validUntil`; your calendar | more than 2 days left | 2 days or less | Renew now. See "Weekly report renewal" below |
| Key expiry (new) | Your calendar and the Privatemode portal (key list) | more than 14 days left | 14 days or less | Create the new key and swap it (owner list, "Key swap"). In the committed code there is **no log warning on Render** (see below) |
| Portal spend and free tokens (new) | Privatemode portal: usage per key, spend, free-token balance | spend in line with the number of messages (query E) | spend above EUR 25 in a week, or free tokens close to zero without a budget | Pause new invitees; set or raise the budget; check nothing else uses the alpha key |
| App spend against the cap | query A | committed spend clearly under `approvedSpendUSD` | above 50 % of the cap | All Privatemode requests are booked at worst case (about USD 0.10 per Thinking request). Raise the cap on purpose (D5) or stop chat; the relay refuses on its own at 100 % |
| Allowance (new) | query C | each invitee has a current period and is within it | an invitee with no period, or one near the limit on day one | See "Automatic allowance" below |
| Purge job | Render, Logs | no "Request record purge failed." line | that line appears | Reinstall the purge function per `docs/development-deployment.md`. See "90-day purge" below |
| Supplier status | Privatemode status page and changelog | no incident, no model deprecation | incident or deprecation, or a `CometRow model alert:` log line (daily model list check) | Follow `docs/model-deprecation-runbook.md`; a move to Tinfoil is manual and announced (`docs/provider-switch-20261112.md`) |
| Friends' reports | the support contact (R6) | quiet | someone saw another person's data, a wrong answer that hurt, or a page that would not load | Stop chat first, then investigate (stop rules in `docs/alpha-plan-20261113.md`) |

### Attestation queue line

The relay writes this line to the Render log (`server/providers/privatemode-relay.ts`), only when Privatemode answers 429 and each time the queue refuses a check:

```
Privatemode attestation queue: {"sent":12,"waited":3,"waitedMs":4100,"limited429":1,"busy":4,"perMinute":3,"lastPauseMs":60000}
```

| Field | Meaning | Worry when |
| --- | --- | --- |
| `sent` | checks sent to Privatemode since the last start | (context only) |
| `waited`, `waitedMs` | checks that waited in our queue, and the total wait | `waitedMs` large: people wait up to 20 s before the first word |
| `limited429` | 429 answers from Privatemode | any new one: everyone got "busy" for about 60 s |
| `busy` | checks we refused with HTTP 503 `attestation_busy` | rising during the day |
| `perMinute` | the queue's current rate (start 6, halves on each 429, floor 2, grows back by 1 after 10 good checks) | stuck at 2 |
| `lastPauseMs` | the last pause Privatemode asked for | (60000 is normal) |

- All counts are **totals since the last start**. A deploy, a restart or a report renewal sets them back to 0.
- **No line means no trouble.** Successful checks write nothing.
- **Not in the line:** our per-account cap. One account (or session) may run at most 2 checks at once and 10 per 10 minutes. Above that, the relay answers the same 503 `attestation_busy` **without writing a log line**. Only a friend's report shows it.
- What the user sees: "CometRow is busy checking the secure server. Please try again in a minute. Nothing was sent."
- Normal use needs 1 check per person per 10 minutes, plus 1 after a failure or a release change.

### Our own limits (HTTP 429, not logged)

| Limit | Message | Where | Note |
| --- | --- | --- | --- |
| 3 chats at once per server instance | "Three requests are already running." | `server/app.ts` (`active >= 3`) | Still 3 (decided 13 November: stays 3 unless the busy count shows a problem). Earlier note: raise to 10 for the alpha (owner list, 13 November). Each refusal also throws away the browser's verified session, so the next message needs a new attestation check |
| 1 chat at once per account | "A request is already running for this account." | `server/app.ts` | The slot is freed as soon as the browser hangs up, so the automatic retry after a time-out is not refused |
| Allowance used up | "No request allowance is available. No request was forwarded." or "Not enough request allowance: this mode counts as 5 requests." | `server/app.ts` | See "Automatic allowance" |
| Spend cap | "The approved spending limit for this provider review is reached. No request was forwarded." | `server/app.ts` | Chat stops for everyone; `/api/status` shows it |

The browser shows the first two as "The protected service is limiting requests. No answer was received." None of these four is counted or logged (by design, content-free logs). Counting them is a planned counter (`docs/alpha-plan-20261113.md`, section 9).

### Weekly report renewal (chat stops for everyone when it expires)

- The signed report is valid for 7 days (`validUntil`). Once it passes, the report is invalid and chat is refused for **every** user. `/api/status` then says "Live chat is unavailable until provider qualification and service access are complete."
- **Warning:** from 13 November the log warns every hour from 48 hours before `validUntil` (launch-gap audit G9). There is still no warning inside the app.
- Routine: renew **2 days before** `validUntil`, at a quiet hour (late evening). Steps: the agent prepares the new report, you sign it, replace the report secret file on Render, restart.
- After the restart: `/readyz` gives 200, `/api/status` gives `"ready":true` with the new `validUntil`, and send one message yourself.
- A restart also resets the queue counts, the in-memory limits and the 10-minute attestation cache, and may cut a running answer. Tell invitees if a renewal falls in alpha hours.
- The spend cap counts per report window (`reviewedAt` to `validUntil`), so query A needs the new window after each renewal.

### API key expiry

- The key's expiry date is in the report (`privatemode.portalKeyLimit.expiresAt`).
- The warning (14 days ahead) now runs in `server/app.ts`, so the Render log shows it every hour (13 November; before that it ran only in the local entry).
- Keep a calendar reminder 14 days before the expiry anyway, and look at the key in the portal weekly.
- Key swap: replace the key file on Render, update `portalKeyLimit` in the report, restart (owner list, "Key swap").

### Portal: free tokens and spend

- The relay cannot read Privatemode token use (the reply is encrypted), so query A shows every Privatemode request as unmetered. The portal is the only real cost figure.
- Free tokens: 1.579M of 5M (owner-reported from the portal, 13 November evening; the app had estimated 0.69M). At about 2,500 tokens per answer (that run's average, with search), that is roughly 275 answers. **Set the spend budget before the first invitee** (owner list step 3), or chat stops when the free tokens run out.
- Daily in week one, then weekly: note the portal's spend and tokens for the alpha key, and the message count from query E. EUR per message should stay roughly stable.
- Act when: spend above EUR 25 in one week, or above 50 % of the monthly budget before the 15th.

### Weekly reconciliation with the portal (checklist K5, added 14 November)

The app counts requests, the portal counts tokens. Once a week, on the same weekday and outside alpha hours:

1. Portal: write down the token total used for the alpha key since last week's reading (owner; this is the only exact figure).
2. Query E below: write down the Fast and Thinking message counts for the same 7 days (all states).
3. Tokens per message = portal tokens divided by all messages. Planning figure so far: about 2,500 with search (13 November runs at the old max effort, so expect less at high).
4. Compare with the worst case the allowance is planned on: Fast 13,000 tokens, Thinking 27,000 tokens per message (32,000 characters in, full output). If the real average is above a third of the worst case, lower `dailyLimit` first, then `requestLimit`.
5. Free balance: the portal figure. Tell the agent when it is below 0.5M (K6). Weeks left = balance divided by this week's tokens.
6. If the portal shows clearly more tokens than messages times the worst case, someone is sending requests the app does not count (a modified browser, or the development key in use): check the key's usage in the portal and rotate the alpha key.

Record each week in one line: date, portal tokens, Fast messages, Thinking messages, tokens per message, free balance.

| Week ending | Portal tokens | Fast | Thinking | Tokens per message | Free balance |
| --- | --- | --- | --- | --- | --- |
| (first week of the alpha) | | | | | |

### Automatic allowance

- Set in the deployment config: `inference.allowance` with `requestLimit` (1 to 10,000) and `days` (1 to 31) (`server/deployment-config.ts`).
- **If it is missing, every invitee is refused** with "No request allowance is available." Check it at switch-on.
- How it works (`ensureAllowance` in `server/app.ts`): when an account has no current period, a new one starts on its first `/api/status` call or its first chat. Fast costs 1 request; Thinking costs 5 (the report's `allowanceCost`; owner decision 13 November, was 3).
- A used-up period stays used up until it ends. A higher `requestLimit` in the config applies only to new periods, not to a period already running.
- Rough size check (corrected 13 November): the spend guard books **every** Privatemode request, Fast or Thinking, at the worst case of the largest mode (about EUR 0.11 at 8,000 characters, EUR 0.14 at 32,000; `server/spend-guard.ts`). So `approvedSpendUSD` must cover all requests in a 7-day window at that rate: 10 invitees at 150 requests is up to 1,500 requests, about USD 250. With USD 100, chat stops for everyone after about 530 to 850 requests.
- Daily: query C. Every invitee who has signed in should have a row.

### 90-day purge

- The service runs the purge at start and then once a day (`server/request-retention.ts`).
- Log lines: "Request records purged: N deleted, M past 90 days held in an open allowance period." (only when N or M is above 0), or "Request record purge failed." when the function or its grant is missing.
- The first real deletions come 90 days after the first alpha request (about mid-February 2027 if the alpha starts in November). Until then, no "purged" line is normal.
- `M` (held) should be 0, because automatic periods last at most 31 days.
- Monthly: query D should return 0.

### Extra read-only queries (psql as the owner role)

Queries A, B and C are in the Tinfoil-era section below and still apply. Query C was written when Thinking counted 3; it now counts 5 (decided 14 November), so read its Thinking figures with that in mind.

```sql
-- D: request records older than 90 days (should be 0 once the purge runs)
SELECT COUNT(*) AS older_than_90_days FROM usage_requests
WHERE created_at < (extract(epoch FROM now() - interval '90 days') * 1000);

-- E: messages by mode and state, last 7 days. Thinking = a request with a ".2" unit row (it costs 5).
-- uncertain = not finished: user Stop, time-out, upstream refusal or broken stream. Refused requests have no row.
SELECT CASE WHEN EXISTS (SELECT 1 FROM usage_requests u WHERE u.request_id = r.request_id || '.2')
            THEN 'thinking' ELSE 'fast' END AS mode,
       r.state, COUNT(*)
FROM usage_requests r
WHERE r.request_id NOT LIKE '%.%'
  AND r.created_at >= (extract(epoch FROM now() - interval '7 days') * 1000)
GROUP BY 1, 2 ORDER BY 1, 2;

-- F: active accounts, last 7 days (a count only)
SELECT COUNT(DISTINCT account_id) AS active_accounts FROM usage_requests
WHERE created_at >= (extract(epoch FROM now() - interval '7 days') * 1000);

-- G: invitees who have signed in at least once
SELECT COUNT(*) AS signed_in_once FROM "user";
```

Query E's mode split depends on today's costs (Fast 1, Thinking 5). If the report changes `allowanceCost`, change the query.

### Known gaps (Privatemode)

- **Refused requests are not counted:** allowance, spend cap, 3 per server, 1 per account, paused, and busy from the per-account attestation cap. Friends' reports are the only signal.
- **Time-outs are not counted.** The browser decides them; the ledger shows them only inside `uncertain`.
- **The report and key warnings are log lines only:** nobody sees them unless the log is read or an alert (O2) watches for them.
- **The queue and our limits live in one server's memory.** With two instances, or a live test from another machine, each paces on its own and together they can pass Privatemode's limit.
- **No automatic alert** until O2 is set up.

---

## Tinfoil-era version: 12 November 2026 (superseded, kept for the record)

A ten-minute routine for the owner, once in the morning and once in the evening, for the first seven days after chat is switched on. Everything below uses what exists today; nothing sends content anywhere. Until an alert provider exists (checklist O2), this routine is the only alarm.

### Daily routine

| What | Where | Normal | Act when | What to do |
| --- | --- | --- | --- | --- |
| Service up | `curl -sS -o /dev/null -w "%{http_code}\n" https://app.cometrow.com/readyz` | `200` | anything else | Read the Render log; if the database or role is the cause, stop chat (`touch <stopFile>`) and use the runbook |
| Deploy state | Render, Events | latest "Deploy live" is the commit you deployed; no failed events | a failed or unexpected deploy | Roll back with the Events "Rollback" button (drilled 25 October) |
| Startup line | Render, Logs | "CometRow restricted deployment listening; email disabled, chat enabled for allowlisted accounts." | the "startup failed" line, or the "inference disabled" line while chat should be on | Check the `inference` section and secret files |
| Purge job | Render, Logs | no "Request record purge failed." line | that line appears | The purge function or its grant is missing; reinstall per `docs/development-deployment.md` |
| Spend against the cap | psql as the owner role, query A below | committed spend clearly under `approvedSpendUSD` | above 50 % of the cap in week one | Decide on the cap (D5) or stop chat; the relay refuses on its own at 100 % |
| Requests without metering | query B below | 0 to a few | rising every day | Interrupted or uncertain requests; they count at their worst case against the cap and the account allowance |
| Use per account | query C below | each invitee within their allowance | one account near its limit on day one | Talk to the invitee; adjust the allowance only on purpose |
| Supplier side | Tinfoil or Privatemode dashboard, usage and spend | matches query A within cents | supplier spend clearly above ours | Stop chat and compare; something bypasses the relay |
| Supplier status | the supplier's status page and changelog | no incident, no model deprecation | a deprecation or incident | Follow "Model lifecycle" in `docs/invited-trial-runbook.md` |
| Headers | `node scripts/check-headers.mjs https://app.cometrow.com` (after each deploy) | HEADER CHECK PASSED | any row not ok | Fix before inviting anyone else |
| Certificate | `node --import tsx scripts/certificate-expiry.ts app.cometrow.com` (weekly; not from the owner's PC because of the antivirus) | more than 14 days left | 14 days or less | Check the custom domain in Render |
| Friends' reports | the support contact (checklist R6) | quiet | any report of seeing someone else's data, a wrong answer that hurt, or a page that would not load | Stop chat first, then investigate |

### Read-only queries (psql as the owner role)

Replace `<from_ms>` and `<to_ms>` with the report's `reviewedAt` and `validUntil` in milliseconds (the window the spend guard uses).

```sql
-- A: committed spend in the review window (metered cost, and requests without metering)
SELECT COALESCE(SUM(m.cost_usd),0) AS metered_usd,
       COUNT(*) FILTER (WHERE m.cost_usd IS NULL) AS unmetered
FROM usage_requests r LEFT JOIN usage_metrics m ON m.request_id = r.request_id
WHERE r.created_at >= <from_ms> AND r.created_at < <to_ms>;

-- B: requests by state today
SELECT state, COUNT(*) FROM usage_requests
WHERE created_at >= (extract(epoch FROM date_trunc('day', now())) * 1000)
GROUP BY state;

-- C: requests per account in the current allowance period
SELECT r.account_id, COUNT(*) AS used, a.request_limit
FROM usage_requests r JOIN usage_allowances a ON a.period_id = r.period_id
WHERE a.starts_at <= (extract(epoch FROM now()) * 1000) AND a.ends_at > (extract(epoch FROM now()) * 1000)
GROUP BY r.account_id, a.request_limit;
```

Committed spend, as the relay computes it: `metered_usd + unmetered x worst case per request`, where the worst case is `(maxInputCharacters x input price + maxOutputTokens x output price) / 1,000,000` from the report.

### Known gaps in week one

- **No refused-request counts.** The relay answers 429 (allowance or spend) and 503 (paused) without logging them, by design (content-free logs). Friends' reports are the only signal; a privacy-safe counter is a later item.
- **No automatic alert** until the alert provider (O2) is set up.
- **Privatemode, if chosen, reports no token usage to the relay:** query A then shows every request as unmetered, and the supplier dashboard is the only cost figure.
