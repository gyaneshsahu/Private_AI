# Render deploy and live checks (13 November 2026)

Status: written by the agent from the repository on `codex/development-handoff` (local HEAD `4492903`; GitHub has `45fe62a`). Nothing was deployed, nothing was run on Render, no live call was made. Every step is for the owner. Anything the repository cannot show is marked **(unverified)**.

How to read this: do the sections in order. Each section ends with what you should see. If you see something else, stop and go to section 7.

## 0. Read this first: three problems found while checking the code

1. **Fixed in code on 13 November (was a blocker): the automatic allowance on the hosted database.** The hosted service connects as the restricted role `cometrow_runtime`, which may only read allowances, so the first version of the automatic allowance would have failed there and every invitee would have seen "No request allowance is available." The fix follows the purge pattern: an operator SQL function `start_auto_allowance(text, integer, integer)` owned by the schema owner, with hard bounds (1 to 31 days, 1 to 10,000 requests), the database clock, and `EXECUTE` granted to `cometrow_runtime`. Tested against PostgreSQL as the restricted role (`tests/account-privileges.test.ts`).
   - **What you do once, before switching chat on:** section 3.5 (three SQL statements).
   - If it is not installed, the hourly count line shows `allowance.not_permitted` and invitees are refused.
   - Check after the fix: section 5, step 6 ("150 requests remaining" on the account page).
2. **The app spend cap of USD 100 per week is too small for 10 active invitees.** The relay cannot meter Privatemode, so it books **every** request, Fast or Thinking, at the worst case of the largest mode: `(maxInputCharacters x input price + 16,384 x output price) / 1,000,000` (`server/spend-guard.ts`). With the report draft prices (EUR 1.55 input, EUR 5.74 output per 1M tokens) that is about EUR 0.11 per request at 8,000 characters and about EUR 0.14 at 32,000 characters. USD 100 then allows only about 530 to 850 requests per 7-day window, for everyone together. Ten invitees using only Fast can send 1,500. When the cap is reached, chat stops for **everyone** until the next report window. The rough check in `week-one-monitoring.md` (300 Thinking requests, about USD 30) misses that Fast requests are booked at the same worst case. Details and a suggested number: section 8, row "Privatemode balance".
3. **The breach plan still names Tinfoil as the AI supplier** (`breach-plan-onepage-20261112.md`). Privatemode is primary since 12 November. The "Rotate secrets" list has no Privatemode key. Fix it before you approve the plan (owner list row 10, decision D16).

## 1. Before you start

All of these must be done before the chat-on deploy (section 5). The code-only deploy (section 4, part A) can happen earlier. Row numbers are the rows of the table "What needs you before the alpha" in [owner-decisions.md](owner-decisions.md).

| # | Must be done | Where it is recorded | Done? |
| --- | --- | --- | --- |
| 1 | The allowance fix (section 0) is in the pushed commit you deploy, Validate (CI) is green on that exact commit, and you ran section 3.5 | agent, then you | [ ] |
| 2 | Alpha key created in the Privatemode portal with a rate limit, an expiry date and a spend limit. Stored only on Render. You told the agent the limit and the expiry | row 2, checklist P10 | [ ] |
| 3 | Privatemode spend budget set in the portal, with an alert. The app cap `approvedSpendUSD` chosen (read section 8 first). Allowance decided: 150 requests per 7 days | row 3, P12, D5, S6 | [ ] |
| 4 | Privatemode privacy wording approved, including the "Always search" sentence and the Brave search sentences | rows 4 and 4b | [ ] |
| 5 | Brave production key and its terms in hand (search is on) | row 4b, R5 | [ ] |
| 6 | Four open report checks accepted in writing; repository name `edgelesssys/privatemode-public` confirmed | row 5, P9, D1 | [ ] |
| 7 | Report finalised and signed by you. It must contain: `modes.thinking.allowanceCost: 5` (the draft JSON still says 3), `maxInputCharacters: 32000` (row 8), `pricing`, `approvedSpendUSD`, `privatemode.portalKeyLimit` (with `expiresAt`), the manifest digest in `releaseDigests`, `reviewedAt` and `validUntil` (at most 7 days later) | rows 5 and 8 | [ ] |
| 8 | Edgeless DPA of 24 July 2026 and the 12 November email filed | row 6, L5 | [ ] |
| 9 | Safety case 07 graded for Fast `glm-5.3-flash` low and Thinking `glm-5.3` high | row 7, P5 | [ ] |
| 10 | Database password rotated (the one you called exposed) | row 9, S2 | [ ] |
| 11 | Legal texts approved after a legal read: privacy policy corrections, health consent decision, terms, acceptable use and the 18+ rule, record of processing, breach plan | row 10, L1 to L10, D16 | [ ] |
| 12 | Safe Browsing review requested and cleared; a real website live at `cometrow.com` | row 11, R4, `safe-browsing-20261112.md` | [ ] |
| 13 | Support mailbox working; first invitees chosen; pause rule decided | row 12, R3, R6 | [ ] |
| 14 | Attestation question sent to Privatemode support (does not block the deploy, but decides capacity) | row 1, P11 | [ ] |

Not needed for this deploy: email delivery, Tinfoil, the attestation audit (keep `attestationAudit` out of the config), payments.

## 2. Secret files on Render

Where: Render dashboard, service **private-ai-deployment**, **Environment**, **Secret Files**. Render puts each file at `/etc/secrets/<file name>`. Choose **Save only** wherever Render offers it. Never paste a key into chat, a log, a screenshot or the repository.

### 2.1 Files that already exist (keep them, do not change)

These ten were uploaded in October and are live. Keep their contents. The only one you change in this deploy is `render-config.json`.

| File name on Render | What is in it |
| --- | --- |
| `render-config.json` | The deployment config (paths and allowlist, no secret values). You edit this one (2.3) |
| `auth-secret` | Session signing secret. Changing it signs everyone out |
| `database-url` | Database URL of the restricted role `cometrow_runtime`. If you rotated the database password (section 1, row 10), this file holds the new URL |
| `database-ca.pem` | Public CA for the database TLS check (ISRG Root X1) |
| `server.key`, `server.pem` | Internal app listener certificate. **Expires 18 January 2027** |
| `client-ca.pem` | CA between the bridge and the app |
| `bridge.key`, `bridge.pem` | Bridge certificate. **Expires 18 January 2027** |
| `google-social.json` | Google OAuth client ID and secret |

### 2.2 New files for chat

The names below are suggestions. Any name works if the path in `render-config.json` matches. Names ending in `.key` are also kept out of the Docker build context by `.dockerignore` (`*.key`). Every file must be between 1 byte and 64 KiB (`server/deployment-config.ts`).

| File name on Render | Config field | What goes in it | Where it comes from |
| --- | --- | --- | --- |
| `privatemode-api.key` | `inference.apiKeyFile` | The Privatemode **alpha** key, on one line, nothing else | Privatemode portal (portal.privatemode.ai), your alpha key |
| `qualification-privatemode.json` | `inference.qualificationFile` | The signed qualification report. It must say `"provider": "privatemode"` | The agent prepares it, you sign it. Renewed every week |
| `privatemode-manifest.json` | `inference.manifestFile` | The approved Privatemode manifest, exact bytes. Do not open and re-save it: one changed byte changes the digest and chat refuses | The agent runs `npx tsx scripts/privatemode-manifest.ts --write .local/privatemode-manifest.json` with the development key, outside alpha hours (07:00 to 24:00 German time). It prints the digest that goes into the report's `releaseDigests`. The current local copy is 5,992 bytes |
| `brave-search.key` | `inference.searchKeyFile` | The Brave Search production key, on one line | Brave Search API dashboard **(unverified: plan name and labels)** |

Not secret files (do not create them on Render):
- `stopFile`: `/tmp/cometrow-chat-stop`. Chat is paused while this file exists. `/tmp` is emptied at every restart and deploy.
- `noticeFile`: `/tmp/cometrow-notice.txt`. Its text is shown to every user. Also emptied at every restart.

Rule from the code: with a Privatemode report, `manifestFile` is required and `attestationAudit` must be absent. Otherwise the service refuses to start ("Inference files do not match the report's provider", printed only as "startup failed").

### 2.3 Complete example `render-config.json` (placeholders only)

Copy the values for `peerCertificateSha256` and `allowedEmails` from your **current** `render-config.json`. Everything else below matches the live file and `deployment/render-config.example.json`.

```json
{
  "mode": "restricted-deployment",
  "email": "disabled",
  "host": "127.0.0.1",
  "port": 8443,
  "assets": "/app/dist",
  "secretFile": "/etc/secrets/auth-secret",
  "databaseUrlFile": "/etc/secrets/database-url",
  "databaseCaFile": "/etc/secrets/database-ca.pem",
  "tlsKeyFile": "/etc/secrets/server.key",
  "tlsCertFile": "/etc/secrets/server.pem",
  "clientCaFile": "/etc/secrets/client-ca.pem",
  "peerCertificateSha256": [
    "KEEP_THE_64_HEX_VALUE_FROM_YOUR_CURRENT_FILE"
  ],
  "allowedEmails": [
    "owner@example.com",
    "test-account@example.com"
  ],
  "socialCredentialsFile": "/etc/secrets/google-social.json",
  "renderBridge": {
    "keyFile": "/etc/secrets/bridge.key",
    "certFile": "/etc/secrets/bridge.pem",
    "caFile": "/etc/secrets/client-ca.pem",
    "servername": "localhost"
  },
  "inference": {
    "enabled": true,
    "apiKeyFile": "/etc/secrets/privatemode-api.key",
    "qualificationFile": "/etc/secrets/qualification-privatemode.json",
    "stopFile": "/tmp/cometrow-chat-stop",
    "manifestFile": "/etc/secrets/privatemode-manifest.json",
    "searchKeyFile": "/etc/secrets/brave-search.key",
    "noticeFile": "/tmp/cometrow-notice.txt",
    "allowance": { "requestLimit": 150, "days": 7, "dailyLimit": 40 }
  }
}
```

What is new since the last deploy (the live config has no `inference` section at all):

| Field | New since | Required? |
| --- | --- | --- |
| `inference` with `enabled`, `apiKeyFile`, `qualificationFile`, `stopFile` | 12 November | yes, for chat |
| `inference.manifestFile` | 12 November | yes, because the report names Privatemode |
| `inference.allowance` | 13 November | yes in practice: without it nobody can chat |
| `inference.searchKeyFile` | 13 November | yes, because search is on (decision of 13 November) |
| `inference.noticeFile` | 13 November | optional, recommended |

Rules for this file:
- `allowedEmails`: 1 to 10 addresses, lower case, exactly the Google address. **Your own address and the test account count.** With both on the list, only 8 places are left for invitees.
- `allowance.days` is 1 to 31. A new `requestLimit` applies only to new periods, not to a period already running.
- Keep `attestationAudit` out of the file.
- Every change to this file needs a deploy before it takes effect (section 4, part B).

## 3. Database

The database is Render PostgreSQL **privateai-accounts** (database `privateai_accounts`, Frankfurt, version 17). The owner role is the one Render created (`privateai_app`). The service uses `cometrow_runtime`.

### 3.1 Snapshot before you deploy

1. Write down the exact UTC time before you click Deploy. Render's point-in-time recovery can restore to that time. The repository records a three-day window on the paid tier (`development-deployment.md`); check it on the database page **(unverified: current window and page labels)**.
2. If the database page offers a manual backup or export, start one and wait until it is done **(unverified)**.
3. Optional, from your laptop with the owner connection string from your credential store: `pg_dump --format=custom --no-owner --file cometrow-20261113.dump "<owner connection string>"`. The file holds every account's email address: keep it in a private folder outside every Git checkout, and delete it after 7 days. **(unverified: whether `pg_dump` is installed on your PC and whether the database's access control lets your IP in.)**

### 3.2 Migration check (service shell)

Render dashboard, service **private-ai-deployment**, **Shell**. Run:

```
node --import tsx server/deployment-database-entry.ts check /etc/secrets/render-config.json
```

Expected: `{"operation":"check","applied":14,"pending":0,"remoteTlsVerificationRequired":true}`.

- No migration was added since the live release `ae439fa` (checked with `git log` on `server/migrations`), so `pending` must be 0 before and after this deploy.
- `apply-pending` is **not** needed for this deploy. If `pending` is ever above 0: the runtime role cannot apply migrations. Use the owner URL as described in `docs/private/runbook-operational-20261024.md` (step 7 of the roles section), and because a service with a pending migration does not start, run it once as the Pre-Deploy Command and clear the field afterwards (`invited-trial-runbook.md`, "Before the first invitation", step 5):
  `node --import tsx server/deployment-database-entry.ts apply-pending /etc/secrets/render-config.json`
- `check` does not notice a dropped table. It compares migration history only.

### 3.3 Restricted roles (already in place)

The roles `cometrow_runtime` and `cometrow_notice` were created on 25 October (checklist S4). Check that the service still uses the restricted one:

```
node --import tsx server/deployment-database-entry.ts privileges-check /etc/secrets/render-config.json
```

Expected: `"role":"cometrow_runtime"`, `"superuser":false`, `"createRole":false`, `"createInSchema":false`, `"restricted":true`.

If you rotated the database password (section 1, row 10): the runtime role has its own password. Rotate the one you called exposed, then rebuild the matching URL in `database-url` (runtime) or in your credential store (owner).

The automatic allowance needs the function in section 3.5 on this restricted setup.

### 3.4 The 90-day purge function (no action)

It was installed on 25 October (checklist L7) and its SQL has not changed since. Nothing to run. If the log ever shows `Request record purge failed.`, print the plan and run its last three statements as the owner role:

```
node --import tsx server/deployment-database-entry.ts privileges-plan public cometrow_runtime cometrow_notice
```

(`CREATE OR REPLACE FUNCTION ... purge_expired_requests`, `REVOKE ALL ON FUNCTION ... FROM PUBLIC`, `GRANT EXECUTE ON FUNCTION ... TO cometrow_runtime`; all safe to rerun.) The schema name `public` is the one the rehearsals used **(unverified for the hosted database; your 25 October run used the right one)**.

### 3.5 The automatic allowance function (new, run once before chat is on)

As the owner role, in the service shell, print the plan and run **only these three statements** from it (they come after the purge statements):

```
node --import tsx server/deployment-database-entry.ts privileges-plan public cometrow_runtime cometrow_notice
```

1. `CREATE OR REPLACE FUNCTION ... start_auto_allowance(p_account text, p_days integer, p_limit integer) ...`
2. `REVOKE ALL ON FUNCTION ... start_auto_allowance(text, integer, integer) FROM PUBLIC`
3. `GRANT EXECUTE ON FUNCTION ... start_auto_allowance(text, integer, integer) TO cometrow_runtime`

All three are safe to rerun. Check: after chat is on, the account page shows "150 requests remaining" (section 5, step 6), and the count line never shows `allowance.not_permitted`. The same schema-name caveat as 3.4 applies.

## 4. Deploy

Two deploys, on purpose. Part A puts the new code live with chat off. Part B switches chat on. After part A, the new commit becomes a rollback target that accepts the `inference` section, which makes later rollbacks easy.

### 4.1 Settings to check once

Render dashboard, service **private-ai-deployment**, **Settings** **(unverified: exact section names)**:

| Setting | Must be |
| --- | --- |
| Branch | `codex/development-handoff` |
| Dockerfile Path | `Dockerfile.render` (it ends at the `render-candidate` stage, entry `server/render-entry.ts`, argument `/etc/secrets/render-config.json`) |
| Docker Build Context Directory | `.` |
| Docker Command | empty |
| Pre-Deploy Command | empty |
| Health Check Path | `/healthz` |
| Auto-Deploy | Off |
| Environment variable `VITE_GERMAN_UI` | **absent** (German off). Set it to `1` and redeploy only after the German legal texts are approved. `Dockerfile.render` takes it as a build argument **(unverified: that Render hands environment variables to the Docker build; if German does not appear after setting it, tell the agent)** |

Never click **Deploy latest commit**. It takes whatever is newest on the branch, which may not be the tested commit.

### 4.2 Part A: new code, chat off

1. Ask the agent for the full 40-character SHA of the commit to deploy. It must be pushed and its Validate run green. (Local HEAD `4492903` is not on GitHub yet, and the allowance fix is still to come.)
2. **Events** page: write down the live SHA. Expected: `ae439faf2bd4ae2e7d0cb68d433cf4e10eef5209` (the release named in the 12 November handoff) **(unverified: read it on the page)**.
3. Baseline from your laptop (PowerShell):
   - `curl.exe -sS -o NUL -w "%{http_code}\n" https://app.cometrow.com/readyz` gives `200`.
   - `node scripts/check-headers.mjs https://app.cometrow.com` gives `HEADER CHECK PASSED`.
4. Upload the four new secret files from 2.2 (Save only). They do nothing yet: the current config does not point at them. **Do not** change `render-config.json` yet.
5. Write down the UTC time (section 3.1).
6. **Manual Deploy**, **Deploy a specific commit**, paste the full SHA, **Deploy**.
7. Wait until the deploy event shows **Live**. Then open **Logs** and look for:
   - `CometRow restricted deployment listening; email and inference disabled.` (correct for part A)
   - no `CometRow restricted deployment startup failed.`
   - no `Request record purge failed.` (the purge runs once at start)
   - `Request records purged: ...` appears only when something was deleted. No such line is normal until about February 2027.
8. Check from your laptop:
   - `curl.exe -sS -o NUL -w "%{http_code}\n" https://app.cometrow.com/readyz` gives `200`.
   - `node scripts/check-headers.mjs https://app.cometrow.com` prints `ok` on all four rows (`/healthz`, `/api/status`, `/`, `/missing`) and `HEADER CHECK PASSED`.
9. Browser: sign in with your Google account. The workspace opens. Sign out. Sign in again.
10. Shell: run `check` and `privileges-check` (section 3.2 and 3.3). Same results as before.

If any step fails: section 7, "Deploy failed".

### 4.3 Part B: chat on (owner only)

Do section 1 first. Then section 5. Part B is written there because the order matters.

### 4.4 What to watch in the log after chat is on

| Log line (exact start) | When | What it means |
| --- | --- | --- |
| `CometRow restricted deployment listening; email disabled, chat enabled for allowlisted accounts.` | at start | Chat config loaded. If you see `email and inference disabled.` instead, `enabled` is false or the `inference` section is missing |
| `CometRow restricted deployment startup failed.` | at start | A file is missing, too big, the JSON is wrong, or the manifest does not match the provider. Nothing more is printed, by design |
| `CometRow counts (last hour): {...}` | once an hour, only when something happened | Counts only, no account or text. Names such as `chat.fast.completed`, `chat.thinking.refused_allowance`, `chat.fast.refused_spend`, `attest.busy_queue`, `search.executed`, `search.failed`. Counts reset at each restart |
| `Privatemode attestation queue: {...}` | only when Privatemode answers 429 or our queue refuses | See `week-one-monitoring.md`. Any new `limited429` means everyone got "busy" for about 60 seconds |
| `The provider review expires at ...` | hourly, from 48 hours before `validUntil` | Renew the report now |
| `The provider review expired at ...` | hourly, after `validUntil` | Chat is refused for everyone until a new report is deployed |
| `The Privatemode API key expires at ...` | hourly, from 14 days before `portalKeyLimit.expiresAt` | Create the next key |
| `The Privatemode API key expired at ...` | hourly, after expiry | Every chat fails upstream |
| `Request record purge failed.` | once a day | The purge function or its grant is missing (section 3.4) |

## 5. Switch chat on safely

The stop file lives in `/tmp`, and `/tmp` is emptied at every deploy. So it cannot already exist when the new instance starts. The docs do not describe a way around this. The gap is a few seconds to a minute, and it is harmless while only you and your test account are on the allowlist. That is why you switch on with **only those two addresses** in `allowedEmails`.

1. In `render-config.json`, set `allowedEmails` to your address and the test account only. Add the whole `inference` section from 2.3. Save only.
2. Write down the UTC time.
3. **Manual Deploy**, **Deploy a specific commit**, the **same SHA** as part A.
4. As soon as the event shows **Live**, open **Shell** and run:
   `touch /tmp/cometrow-chat-stop`
5. Signed in, open `https://app.cometrow.com/api/status`. Expected: `"inference"` with `"ready": false` and the reason "Private chat is paused by the operator." Send one message: it is refused with "Private chat is paused by the operator. No request was forwarded."
6. Open the account page (`https://app.cometrow.com/account`). Expected: **"150 requests remaining"**. If it says "No plan is active for this account yet." and chat later says "No request allowance is available", the allowance blocker (section 0) is not fixed. Stop here.
7. Logs: the line `... chat enabled for allowlisted accounts.`, no startup failure, no expiry warning (if you see one, the report or the key is close to expiry: fix that first).
8. Remove the stop: `rm /tmp/cometrow-chat-stop`.
9. Reload `/api/status`: `"ready": true`, and `validUntil` is the date of your signed report.
10. Send one short Fast message. The answer arrives. The account page now shows 149.
11. Run the live-check list (section 6) with your account and the test account.
12. Only after section 6 passes: add the first two invitees to `allowedEmails`, deploy the same SHA again, and run the quick checks (section 4.2, steps 7 to 9). Every allowlist change is a deploy: it restarts the service, clears the stop and notice files, and may cut a running answer. Do it at a quiet hour.

## 6. Live-check list

Do these on the live site after section 5. Use your account (A) and the test account (B). Write `pass` or `fail` and the date. Do not paste real personal content into test messages.

### 6.1 Chat, search and safety features

| # | Step | Expected result | Pass/fail |
| --- | --- | --- | --- |
| 1 | Pick **Fast**, send "Write two sentences about autumn." | Answer arrives within a few seconds. Account page count goes down by 1 | |
| 2 | Pick **Thinking**, send a short reasoning question | "Still thinking" may show; answer arrives (within 120 s to the first word). Count goes down by 5 | |
| 3 | Pick **Auto**, send a simple question, then a harder one | Auto picks a mode and says why; both answer. Count goes down by 1 or 5 matching the mode | |
| 4 | Under a Fast answer, press **Answer again with Thinking** | A new Thinking answer arrives. Count goes down by 5 | |
| 5 | Search: ask a time-sensitive question and approve the search ("Search the web for:", the exact text is shown) | Answer with sources. Only the approved text is sent. Next hourly `CometRow counts` line shows `search.executed` | |
| 6 | German rules, search-first choice: with "Always search" off, ask "Wie hoch ist die Gebuehr fuer einen neuen Personalausweis?" | Before anything is sent, the app asks "This is about rules, fees or deadlines, which change. Search the official source first?" with **Search and answer** and **Answer without checking**. **Search and answer** gives an answer from the results, preferring an official site | |
| 7 | German-rules warning: same question, press **Answer without checking** | If the answer has figures: "This answer gives figures or deadlines that were not checked against an official source." If the search found no official site: "No official source was found in the search results. Check the responsible authority before relying on these figures." | |
| 8 | Settings: turn on **Always search for rules, fees and deadlines**, ask a rules question | No search-first question; it searches on its own and answers from the results. Turn the setting off again | |
| 9 | Attachments: attach a small text or PDF file with a made-up email address in it, ask about it | Answer uses the file. A note like "Kept on this device: 1 email address" shows | |
| 10 | **Photo to text**: take or choose a PNG or JPEG photo of printed text (at most 10 MB) | Text is read on the device and can be edited before sending. Camera works where offered | |
| 11 | Vault: set a passphrase (at least 12 characters), save a conversation, lock, unlock | Saved conversation reopens after unlocking | |
| 12 | **Encrypted backup and restore**: export a backup file, then restore it in another browser | Restored conversation opens with the same passphrase | |
| 13 | Account page | Shows the requests remaining; the count matches what you sent (Fast 1, Thinking 5) | |
| 14 | Allowance used up (test account B only): as the owner role, set B's current limit just above what B used: `UPDATE usage_allowances SET request_limit = <used + 1> WHERE account_id = '<B accountId from /api/status>' AND ends_at > (extract(epoch FROM now()) * 1000);` Then send two Fast messages | The first works. The second is refused: "No request allowance is available. No request was forwarded." A Thinking message with too little left says "Not enough request allowance: this mode counts as 5 requests." Afterwards set B's limit back to 150 | |
| 15 | Privacy policy page in the app | Names Privatemode as the provider (checklist L4) | |

### 6.2 Accounts and access

| # | Step | Expected result | Pass/fail |
| --- | --- | --- | --- |
| 16 | **Isolation (T1).** A in one browser, B in another browser (or another browser profile). B opens Saved | B sees nothing of A's, even with the same vault passphrase. B's account page shows only B's counts | |
| 17 | `/api/status` in each browser | Different `accountId` for A and B | |
| 18 | A's cookie cannot read B: in A's browser, DevTools console: `fetch('/api/status', {headers: {'X-Account-ID': '<B accountId>'}}).then(r => r.json()).then(j => j.accountId)` | Prints A's `accountId`, not B's. The hint is ignored (the same rule `tests/tenant-isolation.test.ts` checks) | |
| 19 | A signs out, then opens `/api/status` again in the same tab | Refused (401 or 403), no account data | |
| 20 | Sign in with a Google account that is **not** in `allowedEmails` | Refused; no workspace. As the owner role, `SELECT COUNT(*) FROM "user";` is unchanged | |
| 21 | Stay signed in but idle for more than 1 hour | Signed out (session lifetime 3,600 s in `server/account-auth.ts`) | |

### 6.3 Operator controls

| # | Step | Expected result | Pass/fail |
| --- | --- | --- | --- |
| 22 | **Stop switch on**: Shell `touch /tmp/cometrow-chat-stop`, then send | Refused at once: "Private chat is paused by the operator. No request was forwarded." `/api/status` says paused | |
| 23 | **Stop switch off**: `rm /tmp/cometrow-chat-stop`, then send | Works again, no restart needed | |
| 24 | **Notice file**: Shell `echo "Test notice: maintenance tonight at 22:00." > /tmp/cometrow-notice.txt`, wait 30 s, reload the app | "Notice from CometRow: Test notice: maintenance tonight at 22:00." for A and B. Text over 500 characters is cut | |
| 25 | Clear the notice: `: > /tmp/cometrow-notice.txt`, wait 30 s, reload | Notice gone | |
| 26 | **Rollback and roll forward**, see 6.5 | as described there | |
| 27 | **Spend cap** (optional, quiet hour): the agent prepares a copy of the report with `approvedSpendUSD` just above today's committed spend; deploy it; send once | Refused: "The approved spending limit for this provider review is reached. No request was forwarded." `/api/status` gives the same reason. Then deploy the real report again. Locally proven in the T4 rehearsal; the cap is computed from the database, so it survives restarts | |
| 28 | **Erase procedure on test account B** (`invited-trial-runbook.md`, "Suspend or erase one account"): `show`, `suspend`, wait 5 minutes, `erase`, `show`. Command: `node --import tsx scripts/account-operator.ts show --email <B address> \| psql "<owner connection>" -v ON_ERROR_STOP=1` | `accounts_matched` 1 before. After `erase`: every count 0 except `account_closure` (0 or 1). Final `show`: `accounts_matched` 0. B can sign in again as a new, empty account while still on the allowlist | |

### 6.4 Browsers, phones, language, accessibility, logs

| # | Step | Expected result | Pass/fail |
| --- | --- | --- | --- |
| 29 | **Chrome** (Windows): sign in, Fast and Thinking message, search, photo to text, reload | All work | |
| 30 | **Brave browser** with Shields at default, then Shields aggressive: same steps | All work. Watch for: Google sign-in redirect, the Privatemode file loading, photo to text (Brave adds noise to canvas reads, which could change OCR), saved conversations kept after closing the browser **(unverified: not tested by the agent)** | |
| 31 | **Firefox**: same steps | All work | |
| 32 | **Safari on macOS**: same steps | All work. Close Safari, reopen: saved conversations still there | |
| 33 | **iPhone Safari**: same steps, plus camera for photo to text | All work. No page reload or crash while the Privatemode file loads **(unverified: real iPhone never tested; only WebKit in Playwright)** | |
| 34 | **Android Chrome** (for example the Galaxy A52) | All work | |
| 35 | **Edge** (Windows), tracking prevention at default | All work | |
| 36 | Phone width (360 to 390 px): compose, mode picker, account page, settings | No text cut off, no sideways scrolling, buttons easy to tap | |
| 37 | **First load of the 29 MB Privatemode file** on a phone with mobile data, cache empty. Time from opening the app to "ready to send" | At most 30 s (alpha plan M11). On a computer, DevTools, Network, filter `wasm`: about 5 MB transferred, `content-encoding: br`, `cache-control: public, max-age=31536000, immutable` | |
| 38 | Second visit on the same phone | At most 5 s. DevTools shows the file from disk cache | |
| 39 | **German and English interface**: once deployed. Browser language German gives German; the DE/EN switch changes it and is remembered in this browser only | Not testable yet: the language layer is in the code, but the DE/EN switch is not on any screen yet (`LanguageSwitch` in `src/i18n.tsx` is not used) | |
| 40 | Accessibility: keyboard only (Tab, Shift+Tab, Enter, Esc) through sign-in, compose, send, mode picker, settings | Every control reachable; focus always visible | |
| 41 | Screen reader: VoiceOver on iPhone, TalkBack on Android (`galaxy-a52-talkback-checks.md`) | Buttons have names; answers are read out | |
| 42 | Browser zoom 200 % on a computer | Nothing overlaps or disappears | |
| 43 | **Logs contain no message content**: send a message with a made-up word such as `zebracanary4817`, also approve a search with it. Then Render **Logs**, search for `zebracanary4817` and for your email address | No hits for either. Also search `callback/google?`: note whether Render's request logs show the Google callback query string **(unverified: Render's own request logging)** | |

### 6.5 Rollback and roll forward (T4 hosted)

Important constraint: releases older than `8a26a30` refuse to start when `render-config.json` has an `inference` key, even with `"enabled": false` (the config schema is strict). The live release `ae439fa` is older. Also, `ae439fa` lacks the bridge header fix, so chat and some signed-in actions fail behind the bridge on it.

Preferred quick rollback for a chat problem (no code change): set `"enabled": false` in `render-config.json` and deploy the same new SHA. The log then says `email and inference disabled.`

Full drill to the previous release:
1. Events: note the new SHA (live) and the previous SHA (`ae439fa...`).
2. In `render-config.json`, **remove the whole `inference` key**. Save only.
3. **Manual Deploy**, **Deploy a specific commit**, previous full SHA. Or **Events**, the earlier successful deploy, **Rollback to this deploy**.
4. Expected: Live; log `email and inference disabled.`; `/readyz` 200; sign-in works; `/api/status` shows chat not ready; header check passes.
5. Put the `inference` key back in `render-config.json`. Save only.
6. **Manual Deploy**, **Deploy a specific commit**, the new SHA.
7. Expected: Live; log `chat enabled for allowlisted accounts.`; chat works; the account page shows the same counts as before (they live in the database).
8. Write down the times (the table in `rollback-drill-20261025.md`) and give them to the agent.

Not known: what Render does when a deploy never becomes healthy. With the legacy disk attached, Render probably cannot keep the old instance running during a deploy **(unverified)**. Check the Events page during the drill.

## 7. If something goes wrong

1. **Stop chat at once**: Shell `touch /tmp/cometrow-chat-stop`. It works on the next request.
2. **Make the stop last**: set `"enabled": false` in `render-config.json`, deploy the same SHA. A restart alone clears the stop file.
3. **Sign-in or data problem**: remove the address from `allowedEmails` and deploy. That only blocks new sign-ins. To end sessions now, run `scripts/account-operator.ts suspend` for that address (section 6.3, row 28). Sessions otherwise last up to 1 hour after last use.
4. **Deploy failed or the new release misbehaves**: roll back (6.5). Do not roll back past `8a26a30` with an `inference` key in the config. Do not reset or restore the database as part of a rollback.
5. **Database lost or damaged**: follow `recovery-rehearsal-20261024.md` (corrected 12 November). Restore into a new database, end old sessions (step 5a), check, reopen, and only then point the service at it.
6. **Provider outage**: stop chat, put a notice in the notice file. A switch to Tinfoil is manual and announced (`provider-switch-20261112.md`), never automatic.
7. **Preserve facts**: the time you noticed, who told you, Render Events and Logs, screenshots of supplier notices. Delete no database rows. Keep no message content.
8. **Who to tell** (`breach-plan-onepage-20261112.md`, after you update it for Privatemode):
   - Personal data affected: the 72-hour clock starts when you become aware. Notify LDI NRW (Duesseldorf) through its online breach form unless the risk to people is unlikely.
   - High risk to people: email them without undue delay from security@cometrow.com (template in the breach plan).
   - Suppliers as needed: Privatemode (Edgeless Systems) support, Render support, Google (OAuth secret), Brave (search key).
   - Every breach goes in the private log under `docs/private/`, and a dated content-free line in `READINESS.md`.
9. **Exposed secret**: rotate it (breach plan list) and add the missing line: Privatemode alpha key, create a new key in the portal, replace `privatemode-api.key`, update `portalKeyLimit` in the report, deploy, then delete the old key.

## 8. Things you may forget, and suggested add-ons

"Must" means before the first invitee.

| Item | What to do | Must? |
| --- | --- | --- |
| **Allowance function** | Section 3.5 run once; the account page shows 150 | Must |
| **Privatemode balance** | See the estimate below. Paid budget active before the first invitee. Portal spend limit on the alpha key | Must |
| **App spend cap** | Size `approvedSpendUSD` for worst-case booking (estimate below), or accept that chat stops for everyone when it is reached | Must (decide) |
| **Google OAuth publishing status** | Google Cloud console, **Google Auth Platform**, **Audience**: read the status **(unverified: labels)**. The docs say to keep a restricted testing rollout. If it says **Testing**: only listed test users can sign in, so add every invitee and the test account as test users, and tell invitees they will see a "Google hasn't verified this app" screen **(unverified: Google behaviour, not in the repository)**. The 7-day token expiry of Testing mode does not matter here: the app asks only for `openid` and `email` and keeps no Google tokens (`server/account-social.ts`; sessions last 1 hour anyway). If it says **In production**: the CometRow allowlist is the only gate. Also set Branding: app name CometRow, home page, privacy link (checklist L12, status unknown) | Must (check) |
| **Brave production key, terms, transfer basis** | Brave is in the USA; the transfer basis is "unknown" in the record of processing draft. Brave keeps queries up to 90 days. Storage rights for results are not granted, and the app saves search answers on the device: read the plan's terms on that. Price USD 5 per 1,000 searches | Must |
| **Support mailbox** | support@cometrow.com and security@cometrow.com must receive mail; send a test to each. The acceptable-use text cannot be published without it (R6) | Must |
| **Safe Browsing** | `safe-browsing-20261112.md`: verify the domain, read the sample URLs, put the website live at `cometrow.com`, request review | Must |
| **Uptime alert** (O2) | External probe on `https://app.cometrow.com/readyz` and `/healthz`, alert to your phone (`liveness-alerts-proposal-20261023.md`, UptimeRobot costed at USD 10 a month). The expiry warnings are log lines only, so nothing reaches you without a daily log look | Must (checklist says it blocks the alpha) |
| **Backups and retention** (O1) | Know the point-in-time window. Decide the off-host encrypted nightly backup (`offhost-backup-proposal-20261023.md`). State in the erasure reply how long backups keep data | Must (checklist says it blocks the alpha) |
| **Weekly report renewal** | Calendar entry every week, 2 days before `validUntil`, late evening: agent prepares, you sign, replace `qualification-privatemode.json`, deploy the same SHA, then `/readyz`, `/api/status` and one message | Must |
| **Key expiry** | Calendar entry 14 days before `portalKeyLimit.expiresAt`. Key swap: new key file, update `portalKeyLimit`, deploy | Must |
| **Internal certificates expire 18 January 2027** | `server.pem` and `bridge.pem`. After that the bridge cannot reach the app: total outage. Calendar entry for early January to reissue them (`scripts/certificate-expiry.ts` reports expiry) | Must (calendar entry now) |
| **Allowlist places** | Your account and the test account use 2 of the 10 places | Must (plan) |
| **Test account** | A second Google account only for checks (T1, rows 14 and 28) | Must |
| **Breach plan** | Update to Privatemode (section 0, point 3) and approve | Must |
| **Database password** | Rotate the exposed one (S2) | Must |
| **Render instance and no spin-down** | The service runs on 0.5 CPU / 512 MB at USD 7 a month (recorded 20 October). Paid instances do not spin down **(unverified: check the plan name on the dashboard)**. 512 MB under real load is untested | Check |
| **Legacy disk** | The 1 GB disk at `/var/data` was kept for rolling back to the October runtime. A disk usually stops zero-downtime deploys, so every deploy or failed deploy can interrupt users **(unverified)**. Decide whether to remove it after a backup | Add-on |
| **Log retention** | How long Render keeps logs is unknown (`privacy-policy-corrections-draft-20261113.md`, open point). Your weekly review reads a week of logs: read them before they are gone, or add a log stream | Add-on |
| **DNS and TLS** | Cloudflare DNS: the `app` record should be "DNS only" (grey cloud) so that only Render terminates TLS **(unverified: current setting)**. Check the certificate weekly (`week-one-monitoring.md`) | Check |
| **Status page** | A free status page from the uptime tool, linked in the invite email. The notice file covers messages inside the app. Prepare notice texts in English and German in advance | Add-on |
| **Separate Privatemode organisation for development** | Tests and invitees share one attestation limit per organisation. A second organisation lets you test during the day (`week-one-monitoring.md`) | Add-on |
| **Safari storage** | Safari may delete site data after some days without a visit **(unverified, not handled in the code)**. Ask invitees to make an encrypted backup of saved conversations | Add-on |

### Privatemode balance and budget: estimate

Inputs: report draft prices for GLM-5.3, EUR 1.55 input and EUR 5.74 output per 1M tokens, plus 19 % VAT. Fast `glm-5.3-flash` is probably cheaper, so these are upper bounds. Output limits: Fast 2,048, Thinking 16,384 tokens. Input limit 32,000 characters, about 8,000 to 11,000 tokens (10,000 used below). Allowance 150 per 7 days; Thinking counts 5, so at most 150 Fast or 30 Thinking requests per person per week. Average seen in testing: about 2,500 tokens per answer with search.

| Case, 10 accounts, one week | Tokens | Cost net | Cost with VAT |
| --- | --- | --- | --- |
| Worst case, everyone uses all 150 as Fast with full input (1,500 requests) | about 18 million | about EUR 41 | about EUR 49 |
| Worst case, everyone uses all of it as Thinking (300 requests) | about 8 million | about EUR 33 | about EUR 39 |
| Full allowance at the testing average (1,500 answers x 2,500 tokens) | about 3.8 million | about EUR 11 | about EUR 13 |
| A third of the allowance at the testing average | about 1.3 million | about EUR 4 | about EUR 4 to 5 |

What this means:
- **The free balance (about 500,000 tokens, owner, 13 November) is about 200 answers.** Phase 0 (you alone, at least 20 messages per mode plus these live checks) may use half of it. In the worst case, 10 people use it up in a few hours.
- **The paid budget must exist before the first invitee.** Better: before you run the live checks, so they cannot stop halfway.
- The recommended EUR 100 a month at Privatemode covers normal use (about EUR 15 to 55 a month for 10 people) but not the worst case (about EUR 180 net, EUR 210 with VAT, per month). EUR 100 is fine as a hard wall if you accept that chat stops at it. Set the portal alert at EUR 25 a week (the alpha plan's stop rule).
- **App cap (`approvedSpendUSD`)**: it books every request at about EUR 0.14 (32,000 characters) times your EUR to USD rate, Fast or Thinking alike. For a 7-day window: number of accounts x 150 x that amount. For 4 accounts in phase 1 (you, the test account, 2 friends) that is about USD 90 to 110 at a rate near 1.1; for 10 accounts about USD 240 to 290 **(unverified: your exchange rate and whether `pricing` includes VAT)**. The portal spend limit stays the real money wall.
- Note for the weekly review: query A in `week-one-monitoring.md` counts each Thinking request 5 times (it includes the unit rows); the relay counts it once.

## What the agent did not verify

- Anything on Render, Google, Cloudflare, Brave or the Privatemode portal: dashboard labels, the live SHA, the PITR window, the instance plan, the disk, log retention.
- The allowance function on the real hosted database (tested on the synthetic database with the restricted role only).
- Real browsers and phones: only the automated sweep in Chromium, Firefox and WebKit exists.
- Whether `pg_dump` or `psql` is installed on your PC, and whether the database lets your IP connect.
