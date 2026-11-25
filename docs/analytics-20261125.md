# Privacy-safe analytics and the owner's dashboard (25 November 2026)

**Status:** built on the branch `feat/analytics`, behind a switch that is off. Nothing deployed.

## What you get

An **Owner dashboard** entry in the account menu, shown only to addresses on your owner list. It shows, for the last 7, 30 or 90 days:

- **People:** accounts active this week, the week before, and how many came back; active accounts per day and how many of them had been there on an earlier day.
- **Messages per mode:** Fast, Thinking, and everything else, per day.
- **Feature use:** every kind of request (picture questions, voice, deep research, searches, created images, background runs) and six counted uses (canvas opened, whiteboard opened, project created, memory saved, read aloud, PDF export).
- **Errors** and **limits reached**, per day and as lists by name.
- **Cost per day** in euros, at list prices before VAT, for what the price list covers. Requests without a price are counted beside it, never guessed.

## What it is made of

1. **The usage records the app already keeps** when metering is on: one row per request with the account, the kind, the model and token counts. The dashboard reads them when you open it and counts. Nothing new about a person is stored for analytics.
2. **Day totals of the server's fixed-name counters.** The same counters that already print the hourly `CometRow counts` log line. Their totals go into one small table: a day, a name, a number. No account, no session, no address, no text.
3. **Six "use" counters from the browser.** When someone opens the canvas, the browser sends one request holding the name `canvas.opened` and nothing else. The server adds one to today's total and does not note who it was.

**Never part of it:** a message, an answer, a title, a file name, a search text, an IP address, a browser or device detail. A test puts a marker word into a message and checks that it is nowhere on the dashboard.

**No third party.** No analytics service, no script from elsewhere, no cookie. The Content Security Policy would block one anyway.

## Switches

| Where | Switch | Default |
| --- | --- | --- |
| `render-config.json` | `"analytics": { "enabled": true, "ownerEmails": ["you@example.com"], "retentionDays": 90 }` inside `inference` | off |
| Database | migration `0028-analytics-daily.sql` (one table: day, name, value) | not applied |
| Local development | `PRIVATEAI_ANALYTICS=1` | off |

With the switch off: no route, no menu entry, and the browser makes no counting request (a test checks this).

## Retention

- **Day totals:** `retentionDays` (default 90, between 7 and 400). Older days are deleted every 10 minutes while the app runs.
- **People and cost** come from the usage records, which the Privacy Policy already says are kept 90 days. The dashboard cannot look further back than they reach.

## Decisions taken

1. **No new table about people.** "Active users" and "returning users" are counted from records that exist anyway. That is the smallest footprint, and it means analytics adds no new personal data, only a new use of data already described in the policy (see the legal note).
2. **"Returning" has two meanings, both shown:** per day (active today and on an earlier day of the period shown) and per week (active this week and the week before).
3. **A non-owner who asks for the dashboard gets "not found"**, the same answer as for an address that does not exist.
4. **Days are UTC days.** Around midnight in Germany a request can count toward the neighbouring day.
5. **Counts since the last 10-minute save are lost at a restart.** Accepted: they are totals for trends, not bookkeeping.
6. **Cost excludes what the price list does not have:** Brave searches (billed by Brave) and any model without a price. The number is labelled as list prices.
7. **The use counter can be inflated** by a signed-in user who calls it in a loop. It only makes that counter useless, costs nothing and reveals nothing; no limit was added.

## For the owner before switching on

- **Database:** `apply-pending` once for migration 0028, then the privileges SQL again.
- **Your address** goes into `ownerEmails` (the Google address you sign in with).
- **Privacy Policy, draft for the lawyer.** English: "To run and improve CometRow we count how it is used: how many accounts are active, how many requests of each kind are made, which features are opened, how often errors and limits occur, and what the requests cost us. We count from the usage records described above and from totals that hold no account. We never use the content of your messages for this, and we use no analytics service of another company." German: „Um CometRow zu betreiben und zu verbessern, zählen wir, wie es genutzt wird: wie viele Konten aktiv sind, wie viele Anfragen jeder Art gestellt werden, welche Funktionen geöffnet werden, wie oft Fehler und Limits auftreten und was die Anfragen uns kosten. Wir zählen aus den oben beschriebenen Nutzungsdatensätzen und aus Summen, die kein Konto enthalten. Den Inhalt Ihrer Nachrichten verwenden wir dafür nie, und wir nutzen keinen Analysedienst eines anderen Unternehmens.“
- **For the lawyer to weigh:** the legal basis for counting from usage records (legitimate interest in running the service, Art. 6(1)(f) GDPR, with the right to object) and whether the existing sentence about usage records already covers "statistics".

## Tests

- `tests/analytics.test.ts` (4): the numbers from records and counters, cost per record, the flush and retention, the switch, the owner list, the fixed names.
- `tests/analytics-postgres.test.ts` (1, runs in CI with the database): the table under the app's database role; nothing but a day, a name and a number fits.
- `tests/owner-dashboard-ui.test.ts` (5): the real app at 375 and 1,280 pixels, English and German; and no counting request with the switch off.

## Not verified

- Real numbers: nobody has used the app with the switch on.
- How the 90-day table reads on a real phone (it scrolls sideways inside its frame).
