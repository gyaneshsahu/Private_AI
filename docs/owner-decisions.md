# Owner decisions needed

Running list kept while the owner is away (from 12 November 2026). Each entry names the decision, the safe default the agent applied, and where it matters. Nothing here is decided until the owner says so.

| # | Decision | Safe default applied | Where |
| --- | --- | --- | --- |
| D1 | Which review checks, if any, the owner accepts for the invite-only alpha instead of passing, and the written reason for each (the new `accepted-by-owner` status). | None accepted. No qualification report exists, so private chat stays off. | `shared/contracts.ts` (`accepted-by-owner`), step 2 |
| D2 | Approve or change the health-consent wording (`docs/health-consent-draft-20261112.md`, marked draft). | Draft text behind the `healthConsentDraft` flag, which is off in production. | Step 3 |
| D3 | Where the consent choice is recorded: on the device only, or also on our server as proof of consent (GDPR Art. 7(1)). A server record needs a new database migration, which would stop older releases from starting (rollback). | Device only, keyed to the text version; a changed text asks again. | Step 3 |
| D4 | Whether "Not now" still allows chatting. | Allowed, with a standing reminder to leave health and other sensitive details out. | Step 3 |
| D5 | Spending ceiling: amount (`approvedSpendUSD` in the report) and window. | Window = the report's review period (`reviewedAt` to `validUntil`), stricter than a calendar month when a report runs longer; no report exists, so no amount is set. | Step 4, `server/spend-guard.ts` |
| D6 | Stop switch mechanism: an instant stop file plus `enabled: false` in the deployment config for a durable stop. | Both, documented in `docs/development-deployment.md`; no database flag (a migration would stop older releases). | Step 4 |
| D7 | When to switch production chat on: add the `inference` section, the API key and report as Render secret files, and deploy. | Not done; production config unchanged, chat off. | Step 4 |
