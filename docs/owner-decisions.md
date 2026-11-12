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
| D8 | Approve or change the provider section of the privacy policy (`docs/provider-disclosure-draft-20261112.md`, marked draft), for the provider that is chosen. | Draft behind the `providerDisclosureDraft` flag, off in production; the approved policy is unchanged. | Step 5 |
| D9 | When final, where the provider name comes from: the qualification report's `provider` (follows a switch automatically) or a fixed setting. | Flag value only, for review; no report exists. Recommendation: the report's `provider`. | Step 5 |
| D10 | The current live policy names no provider and states no transfer outside the EU, while Tinfoil processes in the US. It must be fixed before any user's messages reach a provider. | Chat is off in production, so no message is sent today; the draft text is ready for approval. | Step 5 |
| D11 | Whether to warn when a page URL approved for fetching contains a recognised identifier (an email or IBAN in a query string). Masking would break the URL, so only a warning is possible. | Not built: outside the planned masking slice (A4 covers search text, which is already masked). | Step 6 |
| D12 | Whether to improve recall on scanned documents (87.3% on the German held-out set; ID numbers 94.1%), and how. A change must be tuned on the development split, then measured on a new held-out set. | No detector change in this slice. | Step 6 |
| D13 | Add the measured masking limits to the approved privacy statement ("What stays on your device"). Proposed sentence (draft): "Not every one of these is recognised, least of all in photos and scans of documents, and web page addresses you approve for fetching are sent exactly as written." | The approved statement is unchanged; the same limits now appear in the app where they apply (note under answers, page-fetch approval). | T3 |
| D14 | The privacy policy names no hosting provider (Render, with its network edge) and does not name Google sign-in as a recipient; the record of processing lists both. | Unchanged; added to the policy work with D8 and D10. | F1 |
| D15 | Breach plan: name a deputy, or accept that nobody acts while the owner is unreachable during the alpha. | No deputy; the draft plan says so. | F1 |
| D16 | Approve the record of processing (`docs/art30-record-draft-20261112.md`) and the breach plan (`docs/breach-plan-draft-20261112.md`), both drafts. | Drafts in `docs/`, not acted on. | F1 |
