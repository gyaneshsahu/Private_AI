# Owner decisions needed

Running list kept while the owner is away (from 12 November 2026). Each entry names the decision, the safe default the agent applied, and where it matters. Nothing here is decided until the owner says so.

## What needs you before the alpha, in order (updated 13 November)

**Owner decisions of 13 November (after the overnight report):**
- **Chat allowance:** 150 requests per 7 days per invitee. **Thinking counts 5** (was 3; set in the report's `modes.thinking.allowanceCost`). Config: `"allowance": { "requestLimit": 150, "days": 7 }`.
- **Web search:** on for the alpha, Brave (`inference.searchKeyFile`). Needs a Brave production key and the search sentences in the privacy wording.
- **Free for the alpha,** invite-only, one server.
- **Erase deletes request records too.**
- **Concurrent chats stay at 3** per server for now.
- **Privatemode free balance:** nearly 500k tokens left (owner, portal, 13 November).
- **New requirement: German and English interface,** default from the browser language (de gives German, otherwise English), a visible DE/EN switch saved on the device, never IP or email. All user-facing text translated, including server messages, refusals, emergency and health cards. German drafts of the privacy policy, health consent and acceptable use with the 18+ rule; **German is the binding text**.

**Settled since 12 November:**
- Privatemode is the primary provider; Tinfoil is the backup.
- Stage 3 is merged into the development line, with session verification refreshed at most every 10 minutes.
- Thinking runs at high effort, not max.
- Per-mode time limits.
- The masking false positive is fixed.
- German rules: the search-first choice, sourced-only rules, official-source preference, the answer-side check and an "Always search for rules, fees and deadlines" setting (off by default) are built. On 40 fresh questions, confident errors that reach a user unwarned fell from 8 to 1 with the answer-side check. Brave Goggles made searched answers worse (0 to 4 errors on 20 questions), so they stay off (`evaluation/german-rules-40-20261113/SUMMARY.md`).
- The attestation queue is built.

All of this is on `codex/development-handoff` with CI green, and none of it is live. Your steps in order:

| # | What you do | My recommendation | Why it is in this place |
| --- | --- | --- | --- |
| 1 | **Send the attestation question to Privatemode support** (draft in `docs/privatemode-attestation-limit-20261112.md`) | Send today. Ask whether the limit is per organisation, key or IP; what it is on the Standard tier; and whether it can be raised without Enterprise | The queue keeps the alpha safe, but it caps how many people can start chatting at the same moment. This decides launch capacity, and the answer takes time |
| 2 | **Create the alpha key** in the Privatemode portal, with a rate limit, an expiry date and a spend limit. Store it **only on Render** (secret file `inference.apiKeyFile`). Keep the free development key in Credential Manager for local work. Tell me the limit and the expiry | Expiry: alpha end plus 2 weeks | Chat cannot run in production without it. Keeping it off the laptop stops tests from eating its limits |
| 3 | **Money:** a Privatemode spend budget, the app's ceiling `approvedSpendUSD` (D5), and the **chat allowance per invitee** (`inference.allowance`, new 13 Nov: without it nobody can chat) | **Corrected 13 Nov:** EUR 200 per month at Privatemode with an alert at 90 % (worst case for 10 invitees using all 150 requests is about EUR 180 net per month; normal use is far less); allowance 150 requests per 7 days (Thinking counts 5; decided 13 Nov); `approvedSpendUSD` about USD 250 per 7-day report window for 10 invitees (about USD 100 for the first 2 to 4). The app books **every** request, Fast too, at Thinking's worst case (about EUR 0.11 to 0.14), so USD 100 would stop chat for everyone after about 530 to 850 requests in total. The free ~500k tokens last about 200 answers, so the paid budget must exist before the first invitee | Without a budget the alpha stops when the free tokens run out. If the app ceiling is too low, chat stops for everyone |
| 4 | **Approve the Privatemode privacy wording** (`docs/privacy-wording-privatemode-20261112.md`: the D17 sentences, the 10-minute check, automatic search covering rules, fees and deadlines, and the new sentence for "Always search for rules, fees and deadlines" in `shared/privacy-copy.ts`), and decide on the sentence "does not use them to train any AI" | Approve; keep the training sentence with the DPA reference | Users must be told the truth for the provider in use |
| 4b | **Web search on or off for the alpha** (R5). Production can now take a Brave key file (`inference.searchKeyFile`, 13 Nov) | **On.** The German-rules safety (search-first, always-search, official sources) only works with search, and with no beta it must be tried by real people now. Needs a Brave production key and its terms, and the search sentences in step 4 | Without search, the biggest trust risk found in testing stays unprotected |
| 5 | **Accept the four open report checks in writing** (GPU checked only on Privatemode's side; AMD/Intel revocation in the Wasm unknown; no per-request metering; attestation freshness up to 10 minutes) and **confirm the repository name** `edgelesssys/privatemode-public` | Accept for the invite-only alpha | I then finalise the report with the key limits from step 2, and you sign it (valid 7 days, renewed weekly) |
| 6 | **Contracts:** file the Edgeless DPA of 24 July 2026 and the 12 Nov email; review `docs/dpa-record-privatemode-20261112.md` | File both | GDPR Art. 28 and 30 |
| 7 | **Grade safety case 07** for the models now in use (Fast `glm-5.3-flash` low; Thinking `glm-5.3` **high**). Files are in `.local/privatemode-fast-tier-20261112/`: `privatemode-glmflash-low-safety.md` (Fast) and `privatemode-glm-high-safety.md` (Thinking, added 13 Nov, 3 repetitions) | Grade; keep the mapping unless a grade fails | The safety gate is your call |
| 8 | **Context size:** raise the report's `maxInputCharacters` from 8,000 to 32,000 | 32,000 | Search answers with the opened page fail above 8,000 |
| 9 | **Rotate the database password you called exposed** (S2) | Rotate now | Status unknown |
| 10 | **Legal texts:** health consent D2-D4; L6 legal basis; DPIA L10 (now for Privatemode); terms; acceptable use and the 18+ rule; record of processing and breach plan D16 (no deputy for a 10-person alpha, D15) | Approve after a legal read | Needed before people outside your circle use it |
| 11 | **Safe Browsing:** the Search Console steps in `docs/safe-browsing-20261112.md` | Do it before sending invites | The domain warning scares invitees away |
| 12 | **Cohort and support:** Google-only sign-in, first invitees, a support contact and the pause rule (R2, R3, B17, R6) | 2 friends first, then up to 10 | Who gets in, and how they reach you |
| 13 | **Deploy and switch on** once I report CI green: deploy to Render with chat off; set the Render secrets (key file, manifest file, deployment secret); I then run the hosted checks; switch chat on only after steps 2-5 | As stated | Nothing from 12-13 November is live yet |
| 14 | **Device checks** T1 (second account) and T2 (Safari, Firefox, phone; the 29 MB Privatemode Wasm is cached after the first load) | - | Only you have the accounts and devices |
| 15 | **Later, not blocking the first invitees:** operations (O1-O3), the inactivity rule, branch policy and `main` (O6), the Enterprise plan, the owner sample scores and the paste batches | - | - |

**Launch decisions that now fall inside the alpha (no beta; launch-gap audit of 13 November night, `docs/pre-alpha-checklist.md` top section):**

| Decision | My recommendation | Why now |
| --- | --- | --- |
| **Free or paid at launch** (audit G2: billing exists only as a Stripe test-mode rehearsal, and production refuses it) | Decide in the first alpha week. If paid, live payments (VAT, withdrawal consent, cancellation button) must run with invitees before launch | Payments are the riskiest launch path and cannot be tried for the first time at launch |
| **German interface** (audit G8: the app, consent, terms and policy are English only) | Yes, German for launch, with a native-speaker review. About 5 to 8 agent days; I can start once you say yes | The market is Germany; health consent and legal texts in German matter most |
| **Open sign-up and capacity** (audit G5: allowlist of at most 10, one 0.5 CPU instance, limits held in memory) | Plan a waitlist for launch; keep one instance for the alpha; raise our limit of 3 chats at once to 10 | Capacity beyond one instance needs shared limits (a redesign), so it must be planned now |
| **Privacy policy fixes** (audit G7: the contact section says an account can be closed there, the deletion section says it cannot; no legal basis per purpose; no rights section; browser storage not described) | Let me draft the corrected text for your legal read | The policy must be true on day one of the alpha |
| **Erasure requests** (audit G6: Google-only users cannot close their account) | Use the operator procedure (built 13 Nov: `scripts/account-operator.ts` prints SQL, you review and run it; steps in `docs/invited-trial-runbook.md`). It erases request records too, although they are otherwise kept 90 days: no legal duty to keep them while there is no billing. Confirm that, and revisit when paid billing starts (tax records) | A person can ask for erasure at any time (GDPR Art. 17) |
| **Two known limits from the code review** (accept for the alpha): a message retried after a provider refusal counts twice against the allowance; a modified browser could claim Fast while asking for Thinking-level effort, because the message body is encrypted | Accept; the Privatemode portal spend limit is the real backstop | You should know them before you set the budget |

**New decisions from 13 November (not blocking the first invitees, but before growth):**

| Decision | My recommendation | Why |
| --- | --- | --- |
| **German rules: next step (decided by your rule "if the gain is small, ship the warnings and move on").** Official-source preference (a) is built; Goggles were tested and are off. | Stop tuning German rules for the alpha. Watch real use, and revisit Goggles only with a page reader that finds the right section of a long official page | The warnings now cover 14 of 15 confident errors on fresh questions; more ranking work did not help |
| **Our relay's limit of 3 chats at once per server instance** | Raise to 10 for the alpha, keep the per-account limit of 1. Cost is still capped by the allowance and the spend ceiling | At 5 users starting together, 2 of 20 answers were refused by our own limit, not Privatemode |
| **Tinfoil privacy text: automatic search sentence** | Leave it until Tinfoil is used again (backup only); it still says "time-sensitive" only, while the Privatemode text now includes rules, fees and deadlines | The approved Tinfoil text changes only with your approval |
| **Privatemode attestation allowance** | Ask support (rank 1 above); plan the launch around the Standard-tier figure they give | It is now the ceiling for how many people can start chatting at the same moment |
**Key swap (your question of 13 Nov):** swapping the key is mostly just the secret. On Render, replace the key file and restart (the key is read at start). Record the new limits and expiry in the report (`privatemode.portalKeyLimit`); the startup warning reads the expiry from there. Set a calendar reminder 14 days before expiry. The approved manifest, the users' cache salts (they come from the deployment secret, not the key) and the free-token balance (it belongs to the organisation) are not affected.

### Earlier version of this list (kept for the record)

<details><summary>Ranked list before the Privatemode decision</summary>

Ranked list (updated 12 November, after the overnight run)

Order = what unblocks the most first. My recommended default is in each row. Details: `docs/overnight-log.md` and the files named.

| Rank | What you decide or do | Recommended default | Why it is here |
| --- | --- | --- | --- |
| 1 | **Deploy `codex/development-handoff` to Render** (contains the Render bridge fix `09dcf74`) and, on the live site, one browser check that a signed-in workspace action works | Deploy after Validate is green; chat stays off (no `inference` section) | Without the fix every chat request through app.cometrow.com fails with 403 (T4 rehearsal). Everything new is dormant |
| 2 | **Safety grades for case 07 (P5)**, then **provider (P7)** and **models (P6)** | Tinfoil, gpt-oss-120b low, fallback gemma4-31b thinking (draft report ready); Privatemode only if its Edgeless replies (P4, P8) arrive and you accept GLM-5.3-Flash as the qualifying arm | Gates the report, the policy text, the DPA and the spend cap. Parity run: same behaviour on both; GLM-5.3-Flash best quality; Tinfoil faster; Privatemode needs 6–9 days of Stage 3 |
| 2a | **Grade safety case 07 for the new mode models** (`.local/wide-screen-20261112/tinfoil-deepseek-off-safety.md`, `tinfoil-glm-max-safety.md` and their backups) and **score the blind benchmark sheet** | Grade, then accept the wide-screen picks unless a grade or the benchmark says otherwise | The modes are built on these four arms |
| 2b | **Approve the privacy wording** on branch `privacy-wording-20261112` (diff in `docs/privacy-wording-diff-20261112.md` there) | Approve and merge | Replaces the four high overclaims (rank 3) |
| 2c | **Allowance for modes:** Thinking counts 3 requests; a rejected request plus its automatic retry uses the allowance twice (refunds need a delete grant the runtime role lacks) | Keep 3; accept double count for the alpha | Cost fairness, not safety |
| 2d | **Raise the Tinfoil account limit** (API paused for this billing period since about 18:38 UTC, 12 Nov) | Raise it; then rerun the fresh benchmark (run 2) and finish Tinfoil Thinking arithmetic (about USD 2.5) | Blocks run 2 and the Thinking arithmetic |
| 2e | **Context size with the top page:** the draft report allows 8,000 input characters; prompt plus search excerpts plus up to 6,000 characters of page text often exceed it ("Selected context is too large") | Raise to 32,000 in the report, as the benchmark used | Search answers fail without it |
| 2f | **Privacy text:** the top page is used "for answers in that conversation and is never saved" (you asked for "that answer"; it stays selected for follow-ups) | Accept | Wording accuracy |
| 2g | **Score the owner sample** (`evaluation/benchmark-fresh-20261112/owner-sample.md`, 30 answers) and optionally the **arithmetic paste batches** in ChatGPT and Claude | Score; graders count as trusted only within 1 point on average | Validates the model graders |
| 2h | **Accept the routing and search design** (`docs/routing-and-search-20261112.md`): Auto rules from evidence, "Answer again with Thinking", one-tap check after an unsearched time-sensitive answer | Accept; recheck on the next fresh prompt set | Auto quality and cost; Thinking counts 3 against the allowance |
| 2i | **Privatemode Fast tier:** glm-5.3-flash had 22 of 90 silent wrong answers on word problems (Auto avoids it; a user who forces Fast does not) | Either a different Fast model on Privatemode, or build the completeness check first | No silent wrong numbers |
| 2j | **Build the completeness check** (every figure the question asks for appears in the answer; on device) | Build next | The only remaining source of silent number errors |
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

</details>

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
