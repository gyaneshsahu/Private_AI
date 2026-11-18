# Owner live test: everything you do before it (18 November 2026)

**The goal, in your words:** CometRow runs for real at `app.cometrow.com`, with real sign-in, the real AI and every feature on. Only you and your test account can sign in. You test it like a real user, list the problems, the agent fixes them, you test again. When everything works, 10 to 20 friends are invited.

**This file is the one list for that.** Do the parts in order. Every step names the place, what to do, and how you know it is done. When you finish a step, tell the agent its number (for example "A3 done"). Never paste a key, a password or a database address into chat.

**Older lists:** `docs/owner-walkthrough.md` (16 Nov) still has the detailed clicks for the Render steps. This file says which of its steps to do and what changed since. `docs/owner-test-list.md` keeps the T-numbers. The test list for the live test is `docs/owner-live-test-list-20261118.md`.

**Status words:** *verified* means the agent checked it in the code or tests. *Owner-reported* means you said it and nobody else checked. *Unverified* means nobody has checked it yet.

---

## What the agent fixed today (verified by tests, pushed after CI)

1. **Image creation can now be switched on in the real deployment.** Before today it only worked on the local test server. It is a new `inference.imageCreation` section with its own key file, and an unknown model name is refused at start (`server/deployment-config.ts`).
2. **Image creation is no longer cut off on Render.** The Render bridge drops a connection after 15 seconds of silence, and a picture can take longer than that. That one path now gets 75 seconds (`server/render-bridge.ts`).
3. **Every build switch can now be set on Render.** Canvas, memory, projects, voice conversation and Scheduled were missing from the Docker build, so setting them on Render would have done nothing (`Dockerfile`, `Dockerfile.render`).
4. **The sign-in list holds 30 addresses** instead of 10: you, the test account and 10 to 20 friends.
5. **A complete "everything on" config file:** `deployment/render-config.owner-test.example.json`. A test loads it exactly as the server does, so no field name or limit in it is wrong (`tests/deployment-inference-config.test.ts`).

Not done by the agent: nothing was deployed, no account was created, no key was used, and no Docker image was built (Docker is not running on this PC).

---

## Part D: decisions first (they change what you set up)

| # | Decision | Options | Agent default |
| --- | --- | --- | --- |
| D1 | **Image provider for the owner test** | (a) **Black Forest Labs** direct (`api.eu.bfl.ai`). It works today with no new code, but its standard API terms let BFL train on prompts and pictures (`docs/image-creation-20261117.md`). Fine for your own made-up prompts, **not** for friends. (b) **Microsoft Foundry FLUX.2 [pro], EU**, or (c) **Google Vertex Imagen 4, EU**. Both exclude training in their standard terms, but each needs a new adapter: about half a day of agent work, after you choose. (d) Image creation off for now | (a) for your test; (b) or (c) before friends |
| D2 | **Which features are on for your test** | Everything (the example file), or a list | Everything |
| D3 | **German interface for your test** (`VITE_GERMAN_UI`) | On: only you and the test account can sign in, so nobody else sees the unapproved German texts. Off: until the German legal read | On, for your test only |
| D4 | **Session length** | **Decided 18 November: 14 days without use (the timer restarts each time you use the app), at most 90 days after sign-in, and "Sign out everywhere" in Settings > Security.** Built the same day; the Terms and Privacy Policy say so in English and German (for the legal read) | Done |
| D5 | **Deep research for everyone or premium only** | Everyone on the list, or `research.allowedEmails` | Everyone (only you and the test account) |
| D6 | **Allowance for your test** | The alpha plan your friends will get (150 a week, 40 a day), or the premium plan (600 a week, 150 a day, more pictures, voice and research). A full test pass uses more than 40 in a day | Premium for your test: change `"plan": "alpha"` to `"premium"` in the config. Back to alpha before friends |

**Your answers, 18 November:** D1 Black Forest Labs for your test, D2 everything, D3 German on for your test, D4 as above, D5 everyone, D6 premium.

---

## Part A: accounts and keys (do these first: some take days)

| # | Do | Where | Done when | T |
| --- | --- | --- | --- | --- |
| A1 | **Brave Search production key.** Needed for web search and deep research. Set the plan's monthly spending limit in the dashboard (USD 5 per 1,000 searches; 30 a day per account is plenty). | api-dashboard.search.brave.com (labels unverified) | You hold the key and a monthly limit is set. Tell the agent the limit, not the key | T-04 |
| A2 | **Image provider key** (per D1). For BFL: an account, an API key, and a spending limit or prepaid credit of about EUR 5 (an image costs EUR 0.014 to 0.028). | dashboard.bfl.ai (unverified), or the Azure or Google console | Key held, limit set | (new) |
| A3 | **Test Google account.** A second Google account used only for checks. | Google | You can sign in to it | T-16 |
| A4 | **Google sign-in audience.** In Google Auth Platform, under Audience, read the status. If it says "Testing", add your address and the test account as test users. | console.cloud.google.com (labels unverified) | Both addresses can pass the Google screen | T-16 |
| A5 | **Privatemode key limits and expiry.** Read the CometRow key's rate limit, spend limit and expiry; set an expiry if there is none (`owner-walkthrough.md` step 4). EUR 50 a month is enough for the owner test (owner-reported). | portal.privatemode.ai | You tell the agent the limits and the expiry date | T-03 |
| A6 | **Price check.** Compare the price table in `owner-walkthrough.md` step 1. | Privatemode pricing page | "Prices match" | T-01 |
| A7 | **Manifest approval.** Read the 14 November rotation (`owner-walkthrough.md` step 3) and decide. | docs.privatemode.ai changelog | "Approve" (with or without Edgeless's answer) | T-120 |
| A8 | **Report answers.** The four sentences, two grades, 32,000 characters and the USD ceiling (`owner-walkthrough.md` step 5). | You, to the agent | The agent has all four | T-11, T-12, T-13, T-60 |

## Part B: secrets you make yourself (on your laptop; nothing leaves it except into Render)

| # | Do | Done when | T |
| --- | --- | --- | --- |
| B1 | **Secure master key** (`PRIVATEAI_CUSTODY_KEY`). Run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Keep the line in your password manager and **two offline places**. If it is lost, every Secure chat is lost for good (`owner-walkthrough.md` step 2). | Three copies exist; none in the repository | T-142 |
| B2 | **Background-task key.** Run `node -p "'k1:'+require('crypto').randomBytes(32).toString('base64')"`. The whole printed line is the file content. | One line starting `k1:` saved privately | (new) |
| B3 | **Rotate the exposed database password** (`owner-walkthrough.md` step 8). Do it right before the deploy, in a quiet hour. | The old password no longer works | T-14 |

## Part C: report (the agent prepares it, you sign it)

| # | Do | Done when | T |
| --- | --- | --- | --- |
| C1 | Say "report draft please" once A5 to A8 are done. The draft carries Thinking cost 5, 32,000 characters, prices, your ceiling, your key limits, the new digest, and `speech` and `vision` (voice and pictures need them). | The agent names the file | T-22 |
| C2 | Sign it: `reviewedAt` now, `validUntil` at most 7 days later, then the two checks in `owner-walkthrough.md` step 6. **Sign it the day you deploy**: it expires after 7 days and chat stops for everyone. | Hash matches; the check ends without "exit 1" | T-22 |

## Part E: Render setup (dashboard, service `private-ai-deployment`)

| # | Do | Done when | T |
| --- | --- | --- | --- |
| E1 | **Secret Files: add six files**, each with **Save only**: `privatemode-api.key` (the alpha key), `qualification-privatemode.json` (signed report), `privatemode-manifest.json` (the agent gives you the exact file; never open and re-save it), `brave-search.key`, `image-api.key` (A2), `background-tasks.key` (B2). Keep the 10 files from October. | 16 secret files listed | T-29 |
| E2 | **Environment variable** `PRIVATEAI_CUSTODY_KEY` = the B1 line. **Save only**. | Listed, value hidden | T-142 |
| E3 | **Build variables** (value `1` each, per D2 and D3): `VITE_CANVAS`, `VITE_MEMORY`, `VITE_PROJECTS`, `VITE_READ_ALOUD`, `VITE_PDF_EXPORT`, `VITE_WHITEBOARD`, `VITE_LIVE_VOICE`, `VITE_SCHEDULED`, and `VITE_GERMAN_UI` if D3 is on. **Unverified:** whether Render hands these to the Docker build. You will see it after the deploy: Whiteboard shows in the left menu. | Listed | T-43 |
| E4 | **Settings**: Branch `codex/development-handoff`, Dockerfile Path `Dockerfile.render`, Build Context `.`, Docker Command empty, Health Check Path `/healthz`, Auto-Deploy **Off**. | As listed | T-29 |
| E5 | **Database checks** (`docs/owner-security-ops-20261118.md`, sections 1 and 2): on the database `privateai-accounts`, read the IP allow-list under **Networking** or **Access Control**, and read the backup or point-in-time recovery window. | You tell the agent both values | T-19, T-42 |
| E6 | **Instance size:** read it. Recorded as 0.5 CPU and 512 MB (20 October). Untested with every feature on. | You tell the agent the plan name | (check) |

## Part F: deploy (follow `owner-walkthrough.md` steps 9 to 13, with these corrections)

1. **Step 9, migrations:** the new code needs **six** migrations, 0021 to 0026 (verified: the repository has 20, the live database recorded 14). The rest of the step is unchanged: run it once as the Pre-Deploy Command with the owner address. **One-way door:** after it, the October release cannot start again.
2. **Step 10, deploy part A:** ask the agent for "newest green commit". Unchanged otherwise.
3. **Step 11, privilege SQL:** unchanged. The migration list ends with `0026-consent-records.sql`.
4. **Step 12:** the check now expects `"applied":20` (not 19).
5. **Step 13, chat on:** do **not** use the short `inference` section from the deploy doc. Use `deployment/render-config.owner-test.example.json` instead:
   - Copy `peerCertificateSha256` from your current file.
   - Put your address and the test account in `allowedEmails`, lower case, exactly the Google addresses.
   - Leave out the parts you said no to in D1, D2 and D5.

   The rest of step 13 is unchanged: stop file at once, account page, logs, remove the stop file, one Fast message.
6. **After step 13**, open `https://app.cometrow.com/api/status` while signed in. It should list `voice`, `images`, `imageCreation`, `code`, `research`, `secureStore`, `vaultSync` and `backgroundTasks`. Send the agent the list of names (no values). A missing name means the config did not load that part.

If the log says `CometRow restricted deployment startup failed.`, nothing else is printed, by design. Send the agent the time and which file you changed last. Most often a file is missing, a path is wrong, or `PRIVATEAI_CUSTODY_KEY` is malformed.

## Part G: safety nets for the test (small, do them the same day)

| # | Do | Done when | T |
| --- | --- | --- | --- |
| G1 | **Uptime alert:** UptimeRobot (free plan) on `https://app.cometrow.com/healthz`, alert to your phone. Settings are in `docs/owner-security-ops-20261118.md`, section 3. | A test alert reached your phone | T-20 |
| G2 | **Calendar entries:** report renewal every 6 days; Privatemode key expiry minus 14 days; **internal certificates expire 18 January 2027** (entry for early January). | Three entries | T-21 |
| G3 | **Know the stop switch:** Render Shell `touch /tmp/cometrow-chat-stop` stops chat at once; `rm /tmp/cometrow-chat-stop` resumes it. | You tried it once | T-34 |

When Parts D to G are done, start the test list: `docs/owner-live-test-list-20261118.md` (31 sections, with a findings log for bugs and wanted changes).

---

## Before friends are invited (not needed for your own test)

The agent will work through these with you after your test rounds. Listed now so nothing is forgotten:

1. **Legal read** of the Terms, the Privacy Policy, the sign-in line and the feature texts (`docs/legal-read-consent-20261118.md`; T-05 to T-10, T-155), German first. German is binding.
2. **Image provider with a no-training contract and a DPA** (D1 b or c; the agent builds the adapter).
3. **Data processing agreements** for every partner (`docs/owner-security-ops-20261118.md`, section 6). Only Privatemode has one on record.
4. **Spend limits sized for 20 people:** Privatemode EUR 50 a month is below the worst case of about EUR 180 for 10 people; the app ceiling `approvedSpendUSD`; Brave and image provider limits.
5. **Support mailboxes** support@ and security@cometrow.com receive mail (T-17). **Safe Browsing** cleared (T-15).
6. **Session length** decision (D4) with matching text.
7. **Account closure** path: email is off, so nobody can close an account alone today (T-153).
8. **Google sign-in:** either every friend added as a test user, or the app published (T-16, T-62).
9. **Secure Max for friends:** the external cryptography review of sync is still open (decision D1 of 15 November).
10. **Backups:** know the window, decide on the off-host backup (`docs/offhost-backup-proposal-20261023.md`), rehearse one restore (`docs/owner-security-ops-20261118.md`, section 2).
11. **Known limits for more people:** some counters live in the server's memory and reset on a restart; all visitors share one sign-in rate bucket behind Render (fine for an invite list).

## Later (after the alpha starts)

Payments, open sign-up and its bot protection, the off-host backup, a second server, and passkeys.
