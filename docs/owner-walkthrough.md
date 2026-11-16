# Owner walkthrough: from today to the first invite (16 November 2026)

**Purpose:** every set-up and every test only you can do, in the right order, one numbered step at a time. Development is finished; this is the manual part.
**How to use it:** do one step, then report back with the "Report back" line. The agent ticks `docs/owner-test-list.md`, records decisions in `docs/owner-decisions.md`, and tells you the next step. If you see something other than "Expect", stop and say what you saw.
**Rules:** never paste a key, a password, a database address or a report file that holds them into chat. Use made-up content in every test. The agent never deploys, pays or signs anything: Render, the Privatemode portal, money and legal texts are yours.
**Words used:** "deploy doc" = `docs/render-deploy-and-live-checks-20261113.md`. "decisions doc" = `docs/owner-decisions.md`. "test list" = `docs/owner-test-list.md`. "laptop" = PowerShell in the repository folder on your PC. "Render Shell" = Render dashboard, service **private-ai-deployment**, **Shell**. "the report" = the signed qualification report file.
**Contents:** A. Set-ups: 1 Price list, 2 Secure master key, 3 Manifest check, 4 Alpha key limits, 5 Report prerequisites, 6 Sign the report, 7 Secret files on Render, 8 Database password, 9 Prepare the migration run, 10 Deploy part A, 11 Privilege SQL, 12 Clean up and check, 13 Deploy part B (chat on). B. Hosted checks: 14 Chat, search, files; 15 Two accounts; 16 Your controls; 17 Rollback; 18 Download, German off, logs. C. Launch-readiness tests: 19 Switch on Secure, pictures, code and voice for tests; 20 T-144; 21 T-145; 22 T-146; 23 T-147; 24 T-148; 25 T-149; 26 T-150; 27 T-151; 28 T-152. D. Real-AI smoke test: 29 Fast; 30 Thinking; 31 Web search; 32 File; 33 Picture; 34 Voice to text; 35 Code run; 36 Portal reading. E. Real devices: 37 Android, 38 iPhone, 39 Tablet. F. Decisions before the first invite: 40 Legal read of the Secure texts, 41 Account closure, 42 Terms page, 43 Health-consent wording, 44 Passkeys, 45 Secure Max 7-day reset, 46 Deletion of closed accounts. Then "After all steps".

---

## A. Set-ups

### 1. Confirm the price list (billing is already on)

Billing is recorded as done today (owner-reported: pay-as-you-go as an individual, EUR 50 monthly cap on the CometRow key, per-key limits 100 requests per minute, 400K prompt tokens, 20K completion tokens). The agent's cost sums use the prices from your notes of 11 November (`docs/privatemode-master-notes.md`, section 6).

**Do:** in the Privatemode portal or on docs.privatemode.ai/pricing, compare these figures (EUR per 1M tokens, plus VAT):

| Model | Input | Output | Cached input |
| --- | --- | --- | --- |
| GLM-5.3 (Thinking) | 1.55 | 5.74 | 0.15 |
| GLM-5.3-Flash (Fast) | 0.20 | 0.65 | 0.05 |

Speech, EUR per audio minute: Whisper large-v3 0.014, Voxtral Mini 3B 0.004.

**Expect:** the same figures today.

**Report back:** "prices match", or the figure that differs and its new value.

### 2. Secure master key with two offline backups (T-142)

Secure mode saves chats to the account under one key per user. Those keys are locked with one master key that lives only in Render's environment. If it is lost, every Secure account's saved content is gone for good; backups of the database do not help (`docs/secure-store-20261116.md`, section 7). Nothing changes until `inference.secureStore` is switched on (step 19).

**Do:** on your laptop, make the key once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the printed line (44 characters). Save it in your password manager and in **two** offline places that are not this laptop (for example a printed sheet in the folder where you keep contracts, and a USB stick kept somewhere else). Then Render dashboard, service **private-ai-deployment**, **Environment**, **Environment Variables**: add `PRIVATEAI_CUSTODY_KEY` with that value, **Save only**. Close the terminal window so the line is not left on screen.

**Expect:** the variable is listed on Render (its value hidden). Two offline copies exist. Nothing else changes.

**Report back:** "master key set, two copies". Never the key.

### 3. Check Privatemode's new manifest before approving it (T-120, part 1)

Privatemode changed its deployment on 14 November. The app refuses to chat until you approve the new fingerprint (digest) `d63eb5cf91cb3079fe25a848573a4d0e9d869f462dab4f71fd02bdb372f8e833` by signing it into the report (step 6). What changed, in plain words: `docs/manifest-rotation-20261114.md`. Short version: the same services redeployed under a new name, stricter AMD hardware minimums, new machine images, and a new recovery key.

**Do:** (a) open docs.privatemode.ai/changelog and find **v1.64.0** (vLLM 0.32.0, Contrast 1.26.2). (b) Email Edgeless support, in the same mail as your other open questions (decisions doc, 15 November block, item 2): "Did Privatemode v1.64.0 go live on 14 November 2026, and is the new seed-share owner key in the manifest (`SeedshareOwnerPubKeys`, starting `3082020a02820201009eb7f0`) yours?" (c) Read the four differences in `docs/manifest-rotation-20261114.md`; the agent's comparison tool found no warning for this rotation (`tests/manifest-rotation.test.ts`).

**Expect:** the changelog entry describes an upgrade, not a new service. Edgeless's answer may take days; approving before it is your call (the minimums got stricter, nothing was added).

**Report back:** "changelog read" and, when it arrives, Edgeless's answer in your words; or "approve now without the answer".

### 4. Alpha key: confirm its limits and expiry (T-03)

The report records the alpha key's limits (`privatemode.portalKeyLimit`). The report is owner-signed, so you give the numbers.

**Do:** in the Privatemode portal, API keys, open the CometRow key. Read: the rate limit, the spend limit, the expiry date. If it has no expiry date, set one (alpha end plus 2 weeks). Check that this key is a different key from the development key in your Credential Manager.

**Expect:** two keys in the portal. The CometRow key has a rate limit, a spend limit and an expiry date.

**Report back:** rate limit (today 100 per minute), spend limit (today EUR 50 per month), the token limits (400K prompt, 20K completion), the expiry date, and the date you set the limits. Never the key.

### 5. Prerequisites the report needs from you (T-11, T-12, T-13, T-60)

The report cannot be finalised without four answers. If you already gave them, say so.

**Do:** (a) T-11: one written sentence accepting each of the four open checks (graphics processor checked only on Privatemode's side; AMD and Intel revocation unknown; no per-request metering; the secure-server check can be up to 10 minutes old) and "name confirmed" for `edgelesssys/privatemode-public`. (b) T-12: read `.local/privatemode-fast-tier-20261112/privatemode-glmflash-low-safety.md` (Fast) and `privatemode-glm-high-safety.md` (Thinking) and give each a grade. (c) T-13: confirm input size 32,000 characters. (d) T-60: the app spend ceiling `approvedSpendUSD` for a 7-day window (agent default about USD 100 for the first 2 to 4 accounts; the portal's EUR 50 monthly cap is the real money wall).

**Expect:** you can answer each in one line.

**Report back:** the four sentences, the two grades, "32,000 confirmed", and the USD ceiling (or "T-60: yes").

### 6. Sign the report (T-22; manifest approval T-120, part 2)

The report is valid 7 days from `reviewedAt`, so do this just before step 13, after steps 3 to 5. The agent prepares the file with: Thinking counts 5, input 32,000, prices, your ceiling, your key limits and expiry, the new digest `d63eb5cf…` first, and `speech` and `vision` already in it so the smoke test (part D) needs no second signing.

**Do:** ask the agent: "report draft please". Open the file it names in Notepad. Check the values from steps 4 and 5. The key block looks like this (the report has no field for the token limits; the agent notes them in the ledger instead):

```json
"portalKeyLimit": {
  "source": "owner-reported",
  "setAt": "2026-11-16T00:00:00Z",
  "expiresAt": "<the expiry date from step 4>",
  "requestsPerMinute": 100,
  "spendLimit": { "amount": 50, "currency": "EUR" }
}
```

Decide whether the old digest `5fa927e3…` is removed (agent default: remove it; keeping it would accept a return to the weaker hardware minimums). Set `reviewedAt` to now and `validUntil` to at most 7 days later (ISO dates, as the draft shows). Save as `qualification-privatemode.json` in a private folder outside the repository. Then two checks on the laptop. First, the manifest file's fingerprint:

```bash
Get-FileHash .local/privatemode-manifest.json -Algorithm SHA256
```

Second, that Privatemode's live deployment is still the one your report approves (uses the development key from Credential Manager; one attestation, no tokens):

```bash
Import-Module .\scripts\WindowsSecrets.psm1; Invoke-WithPrivateAiSecret -Name PRIVATEMODE_API_KEY -Action { npx tsx scripts/privatemode-manifest.ts --check <path to your signed qualification-privatemode.json> }
```

**Expect:** a saved file that says `"provider": "privatemode"`, has the new digest in `releaseDigests`, and the two dates. The hash is `D63EB5CF91CB3079FE25A848573A4D0E9D869F462DAB4F71FD02BDB372F8E833`. The check command ends without "exit 1" (a 1 means Privatemode rotated again: stop and tell the agent).

**Report back:** "signed", the `validUntil` date, "old digest removed" or "kept", "hash matches", and the check command's last line.

### 7. Upload the secret files on Render (deploy doc, section 2.2 and 4.2 step 4)

Four new files. They do nothing until the config points at them (step 13). The ten files from October stay as they are.

**Do:** Render dashboard, service **private-ai-deployment**, **Environment**, **Secret Files**. Add, **Save only** each:

| File name on Render | Content |
| --- | --- |
| `privatemode-api.key` | the alpha key, one line |
| `qualification-privatemode.json` | the signed report from step 6 |
| `privatemode-manifest.json` | the new manifest, exact bytes: the agent gives you `.local/privatemode-manifest.json` (5,994 bytes). Do not open and re-save it |
| `brave-search.key` | the Brave production key, one line (T-04) |

Do **not** change `render-config.json` yet.

**Expect:** fourteen secret files listed. The service did not restart.

**Report back:** "four files uploaded" and the byte size Render shows for the manifest file, if shown.

### 8. Rotate the exposed database password (T-14; deploy doc, section 1 row 10 and 3.3)

Only you know which password you called exposed. There are two roles: the owner role `privateai_app` (Render created it; its address lives in your credential store) and the runtime role `cometrow_runtime` (its address is the Render secret file `database-url`). Rotating the runtime password breaks the live site until the new address is in `database-url`, so do this right before step 10, in a quiet hour.

**Do:** Render dashboard, database **privateai-accounts**. If the exposed one is the owner role: use the database page's own password reset (unverified: Render's labels; no script in the repository does this). Rebuild the owner address in your credential store. If it is the runtime role: in the database shell, as the owner role, set a new password for `cometrow_runtime`, build the new address (same host, database and `sslmode`, new password) and replace the content of the secret file `database-url`, **Save only**; the change takes effect at the deploy in step 10. No script in the repository does this step.

**Expect:** the old password no longer works. After step 10, `/readyz` gives 200.

**Report back:** "rotated", and which role (owner or runtime). Never the address.

### 9. Prepare the one-time migration run (T-143, part 1)

The new code needs five database migrations (0021 to 0025; the live database recorded 14, the repository has 19). The service refuses to start while a migration is pending, and the runtime role may not apply migrations. So the migration runs once, as the owner role, as Render's **Pre-Deploy Command** on the new code (deploy doc 3.2; `docs/private/runbook-operational-20261024.md`, roles section, step 7).

**One-way door:** once these migrations are recorded, the October release `ae439fa` can no longer start (it refuses a migration history it does not know). From here on, "rollback" means the new code with chat off (step 17), never the old release. If the pre-deploy fails, the old release keeps running untouched; nothing was changed in that case, and you paste the pre-deploy output to the agent.

**Do:** Render, **Environment**, **Secret Files**: (a) add `database-url-owner.key` with the **owner** role's address (one line; the `.key` ending keeps it out of the build, like the other secret files), **Save only**. (b) Add `render-config-migrate.json`: a copy of your current `render-config.json` with one change, `"databaseUrlFile": "/etc/secrets/database-url-owner.key"` (this copy holds paths and addresses, no secret values). **Save only**. (c) **Settings**, **Pre-Deploy Command**:

```bash
node --import tsx server/deployment-database-entry.ts apply-pending /etc/secrets/render-config-migrate.json
```

**Save only**. (d) Write down the exact UTC time (Render's point-in-time recovery can go back to it; deploy doc 3.1).

**Expect:** two more secret files and a Pre-Deploy Command; nothing has run yet.

**Report back:** "migration run prepared" and the UTC time.

### 10. Deploy part A: new code, chat off, with the migration (T-29, deploy doc 4.1 and 4.2)

**Do:** (a) **Settings**: Branch `codex/development-handoff`, Dockerfile Path `Dockerfile.render`, Docker Build Context `.`, Docker Command empty, Health Check Path `/healthz`, Auto-Deploy Off, no `VITE_GERMAN_UI` variable. (b) Ask the agent: "newest green commit please" and get the full 40-character id. (c) **Events**: write down the live commit id (expected to start `ae439fa`). (d) Baseline on the laptop:

```bash
curl.exe -sS -o NUL -w "%{http_code}\n" https://app.cometrow.com/readyz
```

```bash
node scripts/check-headers.mjs https://app.cometrow.com
```

(e) **Manual Deploy**, **Deploy a specific commit**, paste the id, **Deploy**. Never "Deploy latest commit". (f) Wait for **Live**. (g) **Logs**: the pre-deploy output shows `"pending":0`; then `CometRow restricted deployment listening; email and inference disabled.`; no `startup failed`; no `Request record purge failed.`. Go straight on to step 11 before signing in.

**Expect:** baseline `200` and `HEADER CHECK PASSED`; the pre-deploy line; the listening line.

**Report back:** old and new commit id, the time, the pre-deploy line (it holds counts only), and whether the listening line is there.

### 11. Re-run the privilege SQL as the owner role (T-143 part 2, T-30)

The runtime role needs rights on the new tables, and three functions must exist: the 90-day purge, the closed-account purge and the automatic allowance. One printed plan holds all of it; every statement is safe to rerun. Do it right after step 10, before anyone signs in.

**Do:** on the laptop (connects to nothing, prints SQL):

```bash
node --import tsx server/deployment-database-entry.ts privileges-plan public cometrow_runtime cometrow_notice
```

Copy the whole output. Render dashboard, database **privateai-accounts**, its shell (connected as the owner role `privateai_app`), paste and run it. Then run as a check:

```bash
SELECT name FROM privateai_schema_migrations ORDER BY name;
```

**Expect:** every statement runs without error (a grant on a table repeats harmlessly). The list ends with `0025-secure-store.sql`.

**Report back:** "privileges done" and the last three names from the list; or the first error sentence verbatim.

### 12. Clean up after the migration, then check (T-143 end; deploy doc 4.2 steps 8 to 10)

**Do:** (a) **Settings**, clear the **Pre-Deploy Command**, **Save only**. (b) **Secret Files**: delete `database-url-owner.key` and `render-config-migrate.json`. (c) Render Shell:

```bash
node --import tsx server/deployment-database-entry.ts check /etc/secrets/render-config.json
```

```bash
node --import tsx server/deployment-database-entry.ts privileges-check /etc/secrets/render-config.json
```

(d) On the laptop, the two commands from step 10 (d) again. (e) Sign in with Google, open the account page, sign out, sign in again.

**Expect:** `"pending":0` with `"applied":19`. Role `cometrow_runtime`, `"superuser":false`, `"createRole":false`, `"createInSchema":false`, `"restricted":true`. `200` and `HEADER CHECK PASSED`. Sign-in works.

**Report back:** paste both Shell output lines (they hold no secrets), and the three results.

### 13. Deploy part B: chat on, for you and the test account only (T-31; deploy doc section 5)

Needs: steps 6 to 12 done, T-04 Brave key in place, T-16 test Google account ready. If more than 7 days passed since step 6, sign a fresh report first.

**Do:** (1) In the secret file `render-config.json`: set `allowedEmails` to your address and the test account only; add the whole `inference` section from deploy doc 2.3 (`enabled`, `apiKeyFile`, `qualificationFile`, `stopFile`, `manifestFile`, `searchKeyFile`, `noticeFile`, `allowance` 150 per 7 days with `dailyLimit` 40). **Save only**. (2) Write down the UTC time. (3) **Manual Deploy**, **Deploy a specific commit**, the **same** id as step 10. (4) As soon as it is **Live**, Render Shell:

```bash
touch /tmp/cometrow-chat-stop
```

(5) Signed in, open `https://app.cometrow.com/api/status`: `"ready": false`, reason "Private chat is paused by the operator." (6) Open `https://app.cometrow.com/account`: **"150 requests remaining"**. If it says "No plan is active for this account yet", stop. (7) **Logs**: `... chat enabled for allowlisted accounts.`, no startup failure, no expiry warning, and `CometRow manifest check: the live Privatemode manifest ... is approved and served.` (8) Render Shell:

```bash
rm /tmp/cometrow-chat-stop
```

(9) Reload `/api/status`: `"ready": true`, `validUntil` is your date. (10) Send one short Fast message: "Write two sentences about autumn."

**Expect:** the answer arrives; the account page shows 149.

**Report back:** "chat on", the time, what `/api/status` and the account page show, and the manifest-check log line.

---

## B. Hosted checks (deploy doc, section 6)

Use your account (A) and the test account (B). Made-up content only.

### 14. Chat, search, files (T-32; deploy doc 6.1, rows 1 to 15 and 14a)

**Do:** row by row: Fast (count down 1), Thinking (down 5), Auto twice, "Answer again with Thinking", a search you approve, the German rules question "Wie hoch ist die Gebuehr fuer einen neuen Personalausweis?" with "Search and answer" then with "Answer without checking", "Always search" on then off, a small text file with a made-up email address, photo to text, vault passphrase save and unlock, encrypted backup and restore in another browser, account page count, allowance used up on B (the `UPDATE usage_allowances ...` statement in row 14, then set it back to 150), privacy policy page names Privatemode. Row 14a (daily cap) is optional: set `"dailyLimit": 6` for one deploy, send Thinking, Fast, Fast; the third is refused; set it back.

**Expect:** as each row says.

**Report back:** the row numbers that failed and what you saw; "6.1 passed" otherwise.

### 15. Two accounts (T-33; deploy doc 6.2, rows 16 to 21)

**Do:** A in one browser, B in another. B opens Saved. `/api/status` in each. Row 18's console line in A's browser. A signs out and opens `/api/status`. A Google account not on the list tries to sign in. Stay idle more than 1 hour.

**Expect:** B sees nothing of A. Different `accountId`. The hint is ignored. 401 or 403 after sign-out. The unlisted account is refused. Idle sign-out after 1 hour.

**Report back:** pass or fail per row.

### 16. Your controls (T-34; deploy doc 6.3, rows 22 to 25a, 27, 28)

**Do:** Render Shell, in turn:

```bash
touch /tmp/cometrow-chat-stop
```

```bash
rm /tmp/cometrow-chat-stop
```

```bash
echo "Test notice: maintenance tonight at 22:00." > /tmp/cometrow-notice.txt
```

```bash
: > /tmp/cometrow-notice.txt
```

Then **Logs**, search `CometRow model`. Row 27 (spend cap) is optional. Row 28: erase B with `scripts/account-operator.ts` (`show`, `suspend`, wait 5 minutes, `erase`, `show`), each piped into `psql` with the owner address as `docs/invited-trial-runbook.md`, "Suspend or erase one account", shows.

**Expect:** paused and refused; works again; "Notice from CometRow: Test notice ..." after 30 s; notice gone; one line `CometRow model check: ... listed and unchanged`; after erase `accounts_matched` 0 and B can sign in again as empty.

**Report back:** pass or fail per row, and paste the model-check line.

### 17. Rollback and roll forward (T-35; deploy doc 6.5, changed)

**Changed from the deploy doc:** after step 10 the database records 19 migrations. A release that does not know them (the October release `ae439fa`) refuses to start ("Migration history is unknown"). So the full drill back to `ae439fa` is no longer possible. Use the quick rollback only.

**Do:** (1) in `render-config.json` set `"enabled": false` inside `inference`, **Save only**; deploy the **same** id. (2) Logs: `email and inference disabled.`; `/readyz` 200; sign-in works; `/api/status` says chat not ready. (3) Set `"enabled": true` again; deploy the same id. (4) Chat works; the account page shows the same counts as before.

**Expect:** as in (2) and (4).

**Report back:** the times of the four steps.

### 18. Download size, German off, logs (T-36; deploy doc 6.4, rows 37, 39, 43)

**Do:** on a computer, DevTools, Network, filter `wasm`, reload: read the transferred size of the Privatemode file. Set the browser language to German, open the sign-in page and the app. Send a message with a made-up word such as `zebracanary4817`, approve a search with it, then **Logs**: search for that word, your email address and `callback/google?`. Run again:

```bash
node scripts/check-headers.mjs https://app.cometrow.com
```

**Expect:** about 5 MB transferred with `content-encoding: br`. Everything English, no DE/EN switch. No hits for the word or your address. `HEADER CHECK PASSED`.

**Report back:** the transferred size, pass or fail per row, and whether `callback/google?` shows a query string in Render's logs.

---

## C. Launch-readiness tests (test list T-142 to T-157)

Where the sixteen items are in this file: T-142 is step 2, T-143 is steps 9 to 12, T-144 to T-152 are steps 20 to 28, T-153 is step 41, T-154 is step 46, T-155 is step 40, T-156 is step 44, T-157 is step 42.

### 19. Switch on Secure, pictures, code and voice for the tests (one deploy)

Secure needs the master key from step 2 and migration 0025 from step 10; Secure Max needs sync with file sync. Pictures, code and voice are needed for step 24 and part D; the report from step 6 already carries `speech` and `vision`. All of this is for you and the test account only (the external cryptography review of sync is still open: decisions doc, 15 November block, item 1).

**Do:** in `render-config.json`, inside `inference`, add:

```json
"secureStore": { "enabled": true, "quotaMb": 200, "filesQuotaMb": 1024 },
"vaultSync": { "enabled": true, "quotaMb": 200, "maxDevices": 5, "blobs": { "store": "postgres", "quotaMb": 1024, "maxFileMb": 10 } },
"images": { "enabled": true, "maxBytes": 280000, "dailyImages": 10 },
"code": { "enabled": true },
"voice": { "enabled": true, "chunkSeconds": 30, "maxTurnSeconds": 180, "dailyUnits": 60 }
```

**Save only**. Deploy the same id. Then open `/api/status`, and Settings, Data controls: "Export my chats".

**Expect:** the log shows the listening line and no startup failure (a missing or malformed master key stops the start). `/api/status` has `secureStore`, `vaultSync`, `images`, `code` and `voice` fields. The "+" menu shows "Ask about a picture"; a microphone button sits by the message box. The export file opens.

**Report back:** "switches on" and whether the export worked; or the first error sentence verbatim.

### 20. Secure on two devices (T-144)

**Do:** sign in on the laptop and on a phone; chat on one; ask a question that needs web search ("What is the weather in Hamburg tomorrow?"), approve it, wait for the answer with sources.

**Expect:** the chat appears on the other device after sign-in; the answer keeps its sources and shows no raw ids such as `[synthetic-0002]`; Settings never says "we never can" read it.

**Report back:** what you saw, with a screenshot of any wrong text.

### 21. Secure Max first use on a phone (T-145)

**Do:** on the phone, open the sidebar entry "Secure Max" for the first time.

**Expect:** it sets up sync with a device name and a recovery key (you type its last group back), then opens the section; "Lock now" and the 15-minute lock work; a second device unlocks only by approval or the recovery key.

**Report back:** the result and anything confusing. Never the recovery key.

### 22. Reset Secure Max and Open in Secure Max (T-146)

**Do:** Settings, Secure Max: try "Open CometRow in Secure Max" and "Reset Secure Max" (test data only).

**Expect:** both ask first and do what they say.

**Report back:** the result.

### 23. Keyboard shortcuts in real browsers (T-147)

**Do:** in Chrome, Edge, Firefox and Safari press Ctrl (Cmd on a Mac) + Shift + O, Ctrl + K, Ctrl + Shift + S, Shift + Esc, Ctrl + Shift + C, Ctrl + Shift + ; and Ctrl + /.

**Expect:** each does its CometRow action, or nothing if the browser keeps the key for itself.

**Report back:** which keys each browser takes.

### 24. Phone pass (T-148)

**Do:** on iPhone Safari and an Android phone: new chat, send, stop, retry, edit, copy; the answer's icon row and its Retry and More menus; paste a screenshot (pictures on, step 19); the sidebar drawer, rename and delete a chat; turn the phone sideways.

**Expect:** nothing cut off or too small to tap; notices show above the message box; the drawer scrolls on a short screen.

**Report back:** screenshots of anything that looks wrong (no chat content).

### 25. Tablet portrait in German (T-149)

Needs `VITE_GERMAN_UI` = `1` as a Render environment variable and a deploy (T-43), or skip until the German legal read (T-10) and say so.

**Do:** open the app on a tablet held upright, in German.

**Expect:** the composer fits on one screen width and "Senden" is fully visible.

**Report back:** a screenshot, or "skipped: German off".

### 26. Offline (T-150)

**Do:** open the app online, get one answer, switch to flight mode, type a message.

**Expect:** Send is off with the reason shown, the draft stays, old answers still show; back online, Send works again.

**Report back:** the result.

### 27. Hosted error pages (T-151)

**Do:** open `https://app.cometrow.com/no-such-page` in an English and a German browser.

**Expect:** a CometRow page with a link back, not "Cannot GET"; the tab shows the CometRow icon.

**Report back:** a screenshot.

### 28. Export and delete all chats, Secure on (T-152)

**Do:** Settings, Data controls: export my chats as Markdown and as JSON; then "Delete all chats" on the test account signed in on two devices.

**Expect:** the files open and hold your test chats only; after deleting, both devices show no chats.

**Report back:** the result.

---

## D. Real-AI smoke test on the hosted site (you, synthetic data, low spend)

Each step costs a few cents at most. Note the account page figure ("N of 150 requests remaining") before and after each step; what each feature costs comes from the signed report (Fast 1, Thinking 5; the picture and voice costs are the report's `vision` and `speech` values, the agent tells you them). The production app shows no token line (development builds only); token totals come from the Privatemode portal in step 36. For every step: report any error sentence word for word.

### 29. One Fast chat (glm-5.3-flash)

**Do:** pick **Fast**. Type: "Write a four-line poem about a cat named Zebracanary who lives in a lighthouse."

**Expect:** an answer within a few seconds; the count goes down by 1.

**Report back:** the count before and after; any error sentence verbatim.

### 30. One Thinking chat (glm-5.3)

**Do:** pick **Thinking**. Type: "A train leaves at 09:17 and arrives at 11:52. How long is the trip in minutes? Show the steps."

**Expect:** "Still thinking" may show; the answer arrives (first word within 120 s) and says 155 minutes; the count goes down by 5.

**Report back:** the number it gave, the count before and after; any error sentence verbatim.

### 31. One web search

**Do:** pick **Fast**. Type: "What is the current ticket price for the Hamburg Elbphilharmonie plaza?" Read the proposed search text in "Search the web for:", approve it.

**Expect:** an answer with source links; only the approved text was sent; the count goes down by 1.

**Report back:** the proposed search text, whether sources appeared, and any error sentence verbatim.

### 32. One file

**Do:** make a text file `test-invoice.txt` with three made-up lines, for example "Invoice 2026-0042, customer Pia Example, pia@example.test, total EUR 123.45". Attach it, ask: "What is the invoice total and who is the customer?"

**Expect:** the answer gives EUR 123.45 and the name; a note like "Kept on this device: 1 email address"; the count goes down by the file-question cost (1, or 2 if you set T-74 to 2).

**Report back:** the note text, the count change, and any error sentence verbatim.

### 33. One picture

**Do:** "+", "Ask about a picture". Choose a photo of a printed page or a drawing with no person in it (for example a photo of a printed shopping list you wrote). Answer the health question. Ask: "What does this picture show?"

**Expect:** a sensible description; the count goes down by the report's picture cost; the picture is not kept after the answer.

**Report back:** whether the description fit, the count change, and any error sentence verbatim.

### 34. Voice to text

**Do:** tap the microphone button, allow the microphone when the browser asks (it should ask only now), say in English: "Please remind me to water the plants on Tuesday", tap stop.

**Expect:** the text lands in the message box; nothing is sent until you press Send; "Voice today" shows the seconds used.

**Report back:** the words it heard, whether the browser asked for the microphone before or after the tap, and any error sentence verbatim.

### 35. One code run

**Do:** pick **Fast**. Type: "Calculate exactly: 123456789 multiplied by 987654321, and the sum of all whole numbers from 1 to 10000."

**Expect:** the answer shows that code ran (a calculation step) and gives 121932631112635269 and 50005000; the first run downloads about 13.5 MB once; the count goes down by 1.

**Report back:** the two numbers, whether a code step was shown, the count change, and any error sentence verbatim.

### 36. Read the portal

**Do:** Privatemode portal, usage or billing page for the CometRow key.

**Expect:** a small number of requests and tokens since step 13; cost well under EUR 1.

**Report back:** total prompt tokens, completion tokens, cached tokens (if shown), the cost shown, and the request count, as the portal shows them.

---

## E. Real devices

The app has no install file in the repository (`docs/multi-device-and-usability-20261115.md`, item 4: planned before launch). "Install as app" below means the browser's own "Add to Home screen"; whether an install prompt appears is one of the things to find out.

### 37. Android phone (Chrome)

**Do:** open `https://app.cometrow.com`, Chrome menu, "Add to Home screen", open it from the icon. Then: Fast and Thinking message, search, "Photo to text" with "Use camera", the microphone button with a short dictation, look for a live voice button next to the microphone, jump to latest while an answer streams (T-84), Enter on the on-screen keyboard (T-82).

**Expect:** the icon opens the app full screen or in a browser tab (say which); the camera and microphone are asked for only after the tap and work; **no live voice button** on Android (decided: dictation only, decisions doc 16 November item 23); Enter makes a new line, only the button sends.

**Report back:** phone model, Android version, how the icon opened, pass or fail per item, and any message sent without you wanting it.

### 38. iPhone (Safari), if available (T-47, T-123)

**Do:** Share, "Add to Home Screen", open from the icon. Same items as step 37. Also dictate 30 seconds once.

**Expect:** all work; no reload or crash while the big Privatemode file loads; the camera path works; the 30-second upload is accepted.

**Report back:** iPhone model and iOS version, how the icon opened, pass or fail per item; or "no iPhone".

### 39. Tablet

**Do:** held upright and sideways: compose, mode picker, account page, Settings, a Bluetooth keyboard if you have one (Enter sends, Shift+Enter makes a line; T-82). Add to Home screen as above.

**Expect:** nothing cut off, no sideways scrolling, buttons easy to tap.

**Report back:** tablet model, pass or fail, screenshots of anything wrong.

---

## F. Decisions before the first invite

Each step: read, then say your choice. "Agent default" is what happens if you say "default". Options are the ones in the decisions doc (16 November block) and the test list; "other: say what" is always allowed.

### 40. Legal read of the new Secure texts (T-155; decisions doc items 5, 6, 7, 21)

**Do:** give `docs/secure-copy-draft-20261116.md` to the same reader as the rest of the policy, German first. Also the account deletion texts in `src/text/account.ts`, the footer "No advertising. No training on your data." and the Help contact line. Decide: (a) the Privacy & data sentence for Secure: the longer sentence, or the one-liner "Saved to your account and available on all your devices after sign-in. CometRow holds the key." (agent default: the longer one); (b) the promise "never used to train AI or for advertising" in both modes (default: yes); (c) the footer (default: keep); (d) the rewritten Getting started and Trial scope texts (default: approve, keep "Trial scope" while the alpha runs).

**Expect:** a yes or a list of changes per text.

**Report back:** your choice for (a) to (d), and the changes, if any.

### 41. Account closure in production (T-153; decisions doc item 2)

Today closing an account needs an e-mail code, and e-mail sending is off, so nobody can close an account in production.

**Do:** choose: (a) turn on e-mail codes for closure only; (b) support closes on request until then (you run the operator script); (c) other: say what.

**Expect:** one choice.

**Report back:** your choice.

### 42. Terms of use page (T-157; decisions doc item 10)

None exists; Help links the privacy policy and the imprint only. The agent adds the link when the page exists.

**Do:** choose: (a) add a Terms page before launch (agent default); (b) other: say what.

**Expect:** one choice, and who writes the text if (a).

**Report back:** your choice.

### 43. Health-consent wording (decisions doc item 20)

The consent text still says "Settings, Privacy & data"; Settings now calls it "Data controls". Changing the text bumps its version, so every user is asked again.

**Do:** choose: (a) update the wording with a version bump after the legal read (agent default); (b) other: say what.

**Expect:** one choice.

**Report back:** your choice.

### 44. Passkeys (T-156; decisions doc item 4)

Your 20 October decision: sign-in by Google and e-mail only; "Add passkey" is hidden in production.

**Do:** choose: (a) keep (agent default for the alpha); (b) allow passkeys. T-126 (does your passkey manager support PRF on each device) is useful before (b).

**Expect:** one choice.

**Report back:** "keep" or "allow passkeys".

### 45. Delayed Secure Max reset (decisions doc item 1)

Someone who lost every device and the recovery key cannot reset Secure Max alone; support erases on request with the operator script.

**Do:** choose: (a) build a 7-day delayed self-service reset later (agent default; small); (b) other: say what.

**Expect:** one choice.

**Report back:** your choice.

### 46. Automatic deletion of closed accounts (T-154; decisions doc item 3)

Built behind `inference.accountPurge`, off; step 11 installed its function.

**Do:** choose the grace period (default 30 days; allowed 7 to 365) and when to switch it on.

**Expect:** one choice.

**Report back:** "purge on, N days" or "not yet".

---

## After all steps

The agent ticks the matching items in `docs/owner-test-list.md` (T-03, T-11 to T-14, T-22, T-29 to T-36, T-120, T-142 to T-157, and the device items you covered), records every choice from part F in `docs/owner-decisions.md` with the date, and writes the smoke-test numbers and the portal reading into the evidence ledger (owner-reported, dated). Items you skipped stay open with your reason.

The first-invite gate: paid billing on (done), the signed report deployed with the approved manifest, parts B and D passed with no unexplained error, the legal read (steps 40 and 43 and the earlier T-05 to T-09), the closure path chosen (step 41), the Terms decision (step 42), Safe Browsing cleared (T-15), the support mailboxes working (T-17), and two days alone with at least 20 messages per mode (T-39). Then: add the first two addresses to `allowedEmails`, deploy the same id, and run step 12 (c) to (e) again.
