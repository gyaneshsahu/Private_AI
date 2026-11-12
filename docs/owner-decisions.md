# Owner decisions needed

Running list kept while the owner is away (from 12 November 2026). Each entry names the decision, the safe default the agent applied, and where it matters. Nothing here is decided until the owner says so.

## What needs you, ranked by what blocks the alpha (12 November)

Order = what unblocks the most other work first. Items from the pre-alpha checklist (`docs/pre-alpha-checklist.md`) and the D-list below. Everything not listed here is either done or work the agent can do alone.

| Rank | What you decide or do | Why it is here | Unblocks |
| --- | --- | --- | --- |
| 1 | **Store the new Tinfoil key**: `.\scripts\windows-secret.ps1 -Action Set -Name TINFOIL_API_KEY` (masked prompt) | The entry `PrivateAI/Local/TINFOIL_API_KEY` was last written 5 October (`tk_4`...`X8GA`, 51 characters, no whitespace); Tinfoil answers 401 `invalid_api_key`. Compare with the new key in the dashboard, then save it with this command and check that `cmdkey`/the module shows today's date. Budget USD 5, USD 0 used (owner-reported) | All Tinfoil test runs (T6, model checks, web search tests) |
| 2 | **Provider choice (P7)**: Tinfoil or Privatemode | Almost every legal and launch step depends on which one | D8, D10, D17, P6, P9, L5, L6, S6 |
| 3 | **Safety grades for case 07 (P5)** and the **default and fallback model (P6)** | Inputs to P7 and to the qualification report | P7, P9 |
| 4 | **Privacy policy provider section**: D10, D8, D14, D9 in one review | No user message may reach a provider while the live policy names no provider and no transfer outside the EU | Switching chat on |
| 5 | **Health consent**: D2 (wording), D3 (where the choice is recorded), D4 ("Not now") | Health is the product's main use; Art. 9 needs explicit consent | Switching chat on |
| 6 | **Supplier contract and legal basis**: L5 (accept the DPA as a business customer), L6 (Art. 9(2)(a) settled against the provider's terms), L10 (DPIA and terms drafts) | Required before personal data is processed | Switching chat on |
| 7 | **Record of processing and breach plan** (D16), **breach deputy or accepted risk** (D15) | GDPR Art. 30 and 33 duties start with the first user | Inviting anyone |
| 8 | **Qualification report sign-off**: which checks you accept and why (D1, P9) | Chat refuses to start without a report | Switching chat on |
| 9 | **Spending ceiling** amount and window (D5, S6) | The guard needs a number | Switching chat on |
| 10 | **Rotate the database password you called exposed (S2)** | No record of where it was exposed; status unknown | Inviting anyone |
| 11 | **Switch chat on and test it live** (D7, O4), then the stop switch on Render (S5), rollback with chat on (T4), live failure cases (T6, owner part) | The agent guides each step; deploys are yours | Inviting anyone |
| 12 | **Cohort**: Google-only or email (R2), invitee list (R3), cohort size (B17), support contact and pause rule (R6), Safe Browsing warning (R4) | Who gets in, and how they reach you | Inviting anyone |
| 13 | **Device checks**: second Google account isolation (T1), Safari, Firefox and phone (T2) | Only you have the accounts and devices | Inviting anyone |
| 14 | **Operations**: backup destination (O1), downtime alert provider (O2) | Recovery and noticing an outage | Inviting anyone |
| 15 | **Branch policy and `main`** (O6 step 4): fast-forward `main` to the tested line; release from `main` or keep working on `codex/development-handoff` | The agent never touches `main` | Clean releases (not the alpha itself) |
| — | **Not blocking the alpha:** D11, D12 (scan recall), D13, D17 (becomes rank 4 if Privatemode wins), L9/A14 release pinning, L11, L12, R1, R5 (web search, off), T7, O3, S3, D12 inactivity rule; **Exa tests** need an `EXA_API_KEY` in Credential Manager (not stored today) | | |

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
