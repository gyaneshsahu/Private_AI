# Week-one monitoring after chat goes on — 12 November 2026 (checklist O5)

A ten-minute routine for the owner, once in the morning and once in the evening, for the first seven days after chat is switched on. Everything below uses what exists today; nothing sends content anywhere. Until an alert provider exists (checklist O2), this routine is the only alarm.

## Daily routine

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

## Read-only queries (psql as the owner role)

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

## Known gaps in week one

- **No refused-request counts.** The relay answers 429 (allowance or spend) and 503 (paused) without logging them, by design (content-free logs). Friends' reports are the only signal; a privacy-safe counter is a later item.
- **No automatic alert** until the alert provider (O2) is set up.
- **Privatemode, if chosen, reports no token usage to the relay:** query A then shows every request as unmetered, and the supplier dashboard is the only cost figure.
