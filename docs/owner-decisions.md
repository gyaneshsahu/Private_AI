# Owner decisions needed

Running list kept while the owner is away (from 12 November 2026). Each entry names the decision, the safe default the agent applied, and where it matters. Nothing here is decided until the owner says so.

## What needs you, ranked by what blocks the alpha (updated 12 November, after the overnight run)

Order = what unblocks the most first. My recommended default is in each row. Details: `docs/overnight-log.md` and the files named.

| Rank | What you decide or do | Recommended default | Why it is here |
| --- | --- | --- | --- |
| 1 | **Deploy `codex/development-handoff` to Render** (contains the Render bridge fix `09dcf74`) and, on the live site, one browser check that a signed-in workspace action works | Deploy after Validate is green; chat stays off (no `inference` section) | Without the fix every chat request through app.cometrow.com fails with 403 (T4 rehearsal). Everything new is dormant |
| 2 | **Safety grades for case 07 (P5)**, then **provider (P7)** and **models (P6)** | Tinfoil, gpt-oss-120b low, fallback gemma4-31b thinking (draft report ready); Privatemode only if its Edgeless replies (P4, P8) arrive and you accept GLM-5.3-Flash as the qualifying arm | Gates the report, the policy text, the DPA and the spend cap. Parity run: same behaviour on both; GLM-5.3-Flash best quality; Tinfoil faster; Privatemode needs 6–9 days of Stage 3 |
| 3 | **One text review of what we promise**: approved privacy statement rows P1–P4 and P5–P10 (`docs/copy-audit-20261112.md`), live policy rows #1–#2, provider section D8/D9/D10/D14 | Accept the proposed replacements in the audit | Four high rows say more than is true today ("we never see", "we never can", "checks pass", protected graphics processor). Must be true before the first message |
| 4 | **Health consent** D2 (text), D3 (device only), D4 ("Not now" allows chat) | Approve the draft; add the short-term-memory sentence from audit #11 | Art. 9 consent |
| 5 | **Supplier contract and legal texts**: L5 DPA, L6 legal basis, L10 DPIA and terms, acceptable use and 18+ rule (`docs/acceptable-use-draft-20261112.md`, `docs/age-rule-draft-20261112.md`) | Approve after a legal read; 18+ by self-declaration twice, no ID check | Needed before personal data is processed |
| 6 | **Record of processing and breach plan** (D16), **breach deputy** (D15) | Approve both; accept no deputy for a 10-person alpha in writing | GDPR Art. 30 and 33 |
| 7 | **Sign the qualification report** (P9, D1): four checks need your written acceptance (browser check partial, freshness, hardware chain, budget) | Accept the four for the invite-only alpha, report valid 7 days, renewed weekly | Chat refuses to start without a report |
| 8 | **Spending ceiling** (D5, S6) | USD 10 per 7-day report window for the alpha | The guard needs a number |
| 9 | **Rotate the database password you called exposed** (S2) | Rotate now | Status unknown |
| 10 | **Switch chat on and run the hosted checks** (D7, O4, S5, T4 hosted, T6 hosted, a real browser chat through Render) | Owner only first, then friends | Rollback past `8a26a30` needs the `inference` key removed from the Render config first (T4 finding). `/api/status` now says not ready while the spending limit is reached |
| 11 | **Cohort**: Google-only (R2), invitee list (R3), size (B17), support contact and pause rule (R6, also needed before the acceptable-use text can be published), Safe Browsing (R4) | Google-only, 2 friends first, then up to 10 | Who gets in and how they reach you |
| 12 | **Device checks** T1 (second account), T2 (Safari, Firefox, phone) | — | Only you have the accounts and devices; the automated sweep is clean in all three engines |
| 13 | **Operations**: backup destination (O1), downtime alerts (O2), hosted recovery run (O3) and what to do about sessions that survive a restore | Render point-in-time restore; sessions are ended on the restore by the SQL step 5a now in the run sheet (no new command needed) | O3 local rehearsal passed; run sheet corrected 12 November |
| 14 | **Inactivity rule** (checklist D12; not decision D12 below) | Option A: no code; delete accounts a set time after the alpha ends; set the end date | Wiring the existing file would delete nothing on the hosted service |
| 15 | **Branch policy and `main`** (O6 step 4) | Fast-forward `main` to the tested line; release from `main` | The agent never touches `main` |
| — | **Not blocking the alpha:** web search (R5: Brave stays default; Tinfoil enclave search only as a later opt-in after its written answers, `docs/search-comparison-20261112.md`), D11, D12 (scan recall), D13, D17 (becomes rank 3 if Privatemode wins), L9/A14 release pinning, L11, L12, R1, T7, S3, Exa (stopped until Exa replies) | | |

## All decisions, by number

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
| D17 | If Privatemode is chosen, four sentences of the approved privacy statement must change (cache wording, metadata retention including permanent per-key token counts, soft spending limits, the browser-check gap), listed in `docs/provider-promises-20261112.md`. | The statement stays as approved; it is accurate for Tinfoil. | B19 |
| D18 | Secret scan in CI. | **Resolved 12 November, no decision needed:** built as a small in-house script (`scripts/secret-scan.mjs`), no new dependency; history of all branches searched once, nothing found. | A9 |
