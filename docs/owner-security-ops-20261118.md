# Security and operations questions, 18 November 2026

Answers to the owner's seven questions of 18 November. Nothing was deployed, no account was created, no dashboard was opened and no money was spent. The only contact with the live site was one DNS lookup and one TLS handshake (item 3).

Labels:
- **verified**: I read it in the code, or ran it today.
- **docs say**: it is written in an earlier document, but nobody checked it today.
- **owner-reported**: the owner said it, as recorded in the docs.
- **to check**: only a dashboard, or a vendor's own page, can answer it.

Commits on `codex/development-handoff` (not pushed): `6e2e01f` security.txt and Dependabot; `7ad1792` error log line; `d387762` daily external check; `cf7ec62` axe in the audit harness; `0ab3e26` the three accessibility fixes (`src/` only; revert this one alone if it gets in the way of the UI work).

## Short version

| # | Question | Answer |
|---|---|---|
| 1 | Render transport and database | The app is fine for the invite-only alpha, which the owner accepted as a risk on 20 October. For open sign-up, three problems remain open: there is no visitor IP, Render's edge is not authenticated, and the bridge listens on all interfaces. The database **can be reached from the internet** at its external hostname, protected by its password and TLS. Whether an IP allow-list is set is **not known**. |
| 2 | Backups | **Not known.** The docs disagree: one says Render keeps 3 days of point-in-time recovery, another says backups are "not set up". Only the Render dashboard can settle it. Restore steps and a rehearsal are below. The rehearsal has never been run against Render. |
| 3 | Monitoring and error tracking | Prepared. A daily certificate, DNS and health check is committed and stays off until you switch it on. UptimeRobot monitor settings are ready to type in. A content-free error line is built. |
| 4 | Session length | Today a session ends after **1 hour** without use, and there is **no absolute limit**. Proposal: 14 days without use, at most 90 days in total, plus a "Sign out everywhere" button. Nothing is changed yet. |
| 5 | security.txt, Dependabot, axe | Built and committed. axe found **3 problems** on the main screens; all 3 are fixed. After the fixes, **0** problems on 128 screenshots. |
| 6 | Third-party services | 13 services listed below. A signed DPA is on record only for Privatemode, and how it was concluded is unclear. Every dashboard spending cap is "to check". |
| 7 | Bot protection | Proposal only. Keep the invite list until you open sign-up. Then use Google sign-in, a cap on new accounts per day, and a proof-of-work check hosted by CometRow itself. No third-party captcha. |

## 1. Render transport and database exposure

**The note around `docs/development-deployment.md:531`** dates from 19 October. It says Render's front door (the "edge") does not yet meet the bar for public accounts.

How a request travels:
1. Render's edge, run by Cloudflare, ends HTTPS.
2. The edge sends plain HTTP to our small "bridge" (`server/render-bridge.ts`) inside the same container.
3. The bridge forwards the request over mutual TLS to the app on 127.0.0.1.

**What works (verified in code):**
- The bridge admits only `Host: app.cometrow.com` and the exact origin on every write (`server/render-bridge.ts:85-88`).
- It forwards only a fixed list of headers and strips every forwarding header a visitor could fake (`:94-102`).
- The app accepts only the bridge, identified by its pinned certificate (`server/authenticated-ingress.ts:54-90`).

**What is still open (verified in code):**
- **No visitor IP.** On Render the app never learns who is calling, so `clientAddress` is empty. Sign-in rate limits fall back to one bucket per path that **every visitor shares** (`server/account-auth.ts:589-592`). One noisy client can therefore lock everyone out of sign-in for a minute: the limit is 60 per minute (`account-auth.ts:280`).
- **The edge is not authenticated.** The bridge trusts whatever reaches its port. Render documents that services in the same Render workspace can reach that port over the private network. The bridge listens on `0.0.0.0` (`server/deployment-process.ts:112`), so such traffic would be treated like public traffic. Whether the workspace holds any other service is to check (Render → workspace → services). With none, nothing can use this path.
- **Docs say:** on 20 October the owner approved "the restricted Render/PostgreSQL proposal and its explicit platform-hop trust" (`docs/development-deployment.md:162`). That approval covered the owner-only milestone, not a public launch, and no later document widens it.

**What stops production use (open sign-up):** the shared rate-limit bucket (see item 7). Before you open sign-up, either get a trusted client-IP contract from Render, or move to the direct-TLS gateway prototyped on 19 October (Caddy with mutual TLS).

**Can the database be reached from the public internet? Yes, its hostname can.**
- Docs say: the app uses Render PostgreSQL `privateai-accounts` (Frankfurt, PostgreSQL 17, plan 0.1c-256mb) through its **external** hostname, `…frankfurt-postgres.render.com` (`docs/LOCAL_CODEX_HANDOFF.md:90,102`). It was chosen on purpose: Render's internal connection uses a self-signed certificate that the app's strict TLS check would refuse (`docs/development-deployment.md:197`).
- Verified in code: the connection requires TLS, checks the CA and refuses a self-signed certificate (`ssl: { ca, rejectUnauthorized: true }`, `server/deployment-process.ts:65-72`). The URL cannot carry options such as `sslmode` (`server/deployment-config.ts:379`).
- **To check:** whether anyone ever set the IP allow-list. The plan said to restrict access to Render's outbound addresses (`development-deployment.md:183,197`), but no document records that it was done.
  - Where to look: Render dashboard → the `privateai-accounts` database → **Networking** (on some accounts the label is "Access Control") → the inbound IP rules.
  - If it shows `0.0.0.0/0`, anyone on the internet can try passwords against it.
  - A safe value: the service's outbound IP ranges, listed under the web service → **Connect → Outbound**. Your own IP should be on the list only while you run a manual `pg_dump`.

**There is no Render blueprint** (`render.yaml`) in the repository. The service and the database were set up by hand in the dashboard, and the config lives in Render secret files (`deployment/render-config.example.json` shows the shape).

## 2. Postgres backups and how to restore

**Status: not known.**
- Docs say Render keeps a 3-day point-in-time recovery window on this paid plan (`docs/development-deployment.md:221`, `docs/eu-hosting-20261023.md:8`).
- The Art. 30 draft says backups are "not chosen … not set up" (`docs/art30-record-draft-20261112.md:14`).
- Nobody has looked at the dashboard since then.
- The off-site backup (`docs/offhost-backup-proposal-20261023.md`) is a proposal only. The PC backup scripts cover the old invite file, not Postgres.

**Owner check (5 minutes):** Render → `privateai-accounts` → **Recovery**. Write down:
- whether point-in-time recovery is shown;
- the window length (3 days or 7);
- the earliest restore time;
- whether "Export" (logical backups) is offered.

Record the date in READINESS.md as owner-reported. The privacy policy still has the open line "[To confirm: whether, and for how long, database backups keep copies.]" (`shared/privacy-policy.ts:228`). The answer from this check goes there.

**Restoring after a real incident** (for example lost or corrupted data). Each step marks who does it.
1. **Owner:** stop new damage. Set the `inference.stop` file or suspend the service, and note the time of the incident.
2. **Owner:** Render → `privateai-accounts` → Recovery → restore to a time just before the incident. Docs say Render restores into a **new** database instance and leaves the live one untouched; confirm this on the page.
3. **Owner:** on the new instance, create the roles `cometrow_runtime` and `cometrow_notice` with their passwords. The dump carries grants to these roles, not the roles themselves.
4. **Owner (one transaction in the new database's shell):** end every old session and sign-in code. This is step 5a of `docs/recovery-rehearsal-20261024.md`. Without it, a restore brings stolen or revoked sessions back to life.
5. **Agent or owner (from the service shell):** with a config whose `databaseUrlFile` points at the new instance, run:
   - `node --import tsx server/deployment-database-entry.ts privileges-check <config>`
   - then `… check <config>`.
   Compare the row counts with the last known numbers.
6. **Owner:** check the held security notices, then set `mode='normal'` (step 7 of the sheet).
7. **Owner:** replace the secret file `database-url` with the new instance's external URL and redeploy. `/healthz` must return 200.
8. **Owner:** keep the old instance until the new one has run cleanly for a day, then delete it. Users must sign in again. Anything written after the restore point is lost: usage records, revocations and closures. Reconcile closures by hand, so a closed account does not come back to life.

**Rehearsal:** `docs/recovery-rehearsal-20261024.md` is ready. It runs on a throwaway database with synthetic data only. The agent's tool sends only SELECT statements and GET probes (`scripts/recovery-rehearsal.ts`). It passed locally on 12 November (`docs/rehearsals-t4-o3-20261112.md`) and has **never run against Render** (owner-decisions O3). Suggested plan:
- run it once before invitees arrive, together, in about 45 minutes;
- after that, run it every three months and after any plan change;
- the first run sets the recovery-time baseline.

## 3. Monitoring and error tracking

**A. Daily external check, built and off** (`.github/workflows/monitor.yml`, commit `d387762`).
- What it checks, once a day from GitHub's machines (outside Render and outside your PC):
  - the certificate is valid and has at least 14 days left (`scripts/certificate-expiry.ts`);
  - `app.cometrow.com` still points to `private-ai-deployment.onrender.com` (verified today with one DNS lookup);
  - `/healthz` answers 200.
- It is content-free: no cookie, no account, no payload.
- A failed run sends GitHub's usual failure e-mail.
- **To switch it on:**
  1. Merge the branch to `main`. Scheduled runs start only from the default branch.
  2. GitHub → repository → Settings → Secrets and variables → Actions → Variables → add `COMETROW_MONITOR` = `on`.
  3. Optional: install the GitHub mobile app for push alerts.
- Costs about 30 Actions minutes a month.
- I did not run it on GitHub. Locally the certificate check ran and showed Avast's certificate, not the real one, as the 23 October proposal warned. This is why the check must run off your PC.

**B. Five-minute liveness probe: UptimeRobot free plan** (the 23 October proposal). The free tier reportedly allows 50 monitors at 5-minute checks, and its terms reportedly allow commercial use since mid-2026. Those facts come from third-party pages; **confirm them on uptimerobot.com before you sign up**. Type in:

| Field | Value |
|---|---|
| Monitor type | HTTP(s) |
| Friendly name | CometRow health |
| URL | `https://app.cometrow.com/healthz` |
| Interval | 5 minutes (free) |
| Alert after | 2 failed checks |
| Expected status | 200 |
| Alert contacts | operator mailbox and UptimeRobot app push |
| Quiet hours | none during the invite trial |

- On Render, `/healthz` goes through the bridge to `/readyz`, so one probe covers both liveness and readiness. Each probe makes one small read-only database query, which is fine every 5 minutes (verified, `server/render-bridge.ts:74,137`).
- Paid UptimeRobot (about USD 10 a month, docs say) adds 1-minute checks and SSL monitoring. The daily GitHub check covers the certificate for free.
- **Backup heartbeat:** there is no Postgres backup job yet (item 2), so there is nothing to ping. If the off-site backup is approved, use healthchecks.io's free "Hobbyist" plan: reportedly 20 checks, to confirm. Alert if no ping arrives within 26 hours.

**C. Error tracking without personal data, built** (commit `7ad1792`).
- Every server fault that reaches the last error handler writes one line to the host log, for example `server-error POST /api/sync Error 23505`. The line holds:
  - the method;
  - the first two parts of the path;
  - the error class;
  - a short code, such as a PostgreSQL error number.
- It never holds the message, stack, query, body, headers or IDs (`server/app.ts`, `logServerError`, with a test).
- Limits:
  - it sees only faults that reach the last handler, not errors a route catches itself;
  - it lands in Render's logs, under Render's retention (still "to confirm" in the privacy policy);
  - **it alerts nobody**: you read it in Render → Logs, searching for `server-error`.
- This fits the privacy policy's sentence "our systems log no content".
- **Not proposed now:** Sentry or another error service. It would need a new dependency, a DPA and its own scrubbing rules. Its browser SDK sends the visitor's IP and headers unless they are switched off. Revisit after launch if the log line is not enough.

## 4. Session length

**Today (verified, `server/account-auth.ts:265-270`):**
- A session ends after **1 hour without use** (`expiresIn: 3600`).
- While it is in use, it is extended at most every 5 minutes.
- "Fresh" actions (adding a credential, recovery) need a sign-in from the last 5 minutes.
- There is **no absolute limit**: a session in steady use never ends.
- The Terms and the privacy policy both say "1 hour" (`shared/terms-of-use.ts:41`, `shared/privacy-policy.ts:205,261`).
- The account page lists your sessions and signs out one at a time. There is **no "Sign out everywhere"** button in production.

**Secure mode:** after sign-in, the browser fetches the account's content key (`/api/secure/key`) and keeps it in memory only. Anyone holding a valid session cookie can therefore read all Secure content. A longer session means a longer window for a stolen cookie.

**Secure Max:** its own lock is separate from the session.
- The vault locks after 15 minutes without a key press or tap (`src/App.tsx:774-791`).
- "Remember this device" keeps the vault key on the device with no expiry (`src/vault.ts`).

**Proposal (ChatGPT-like, not applied):**

| Setting | Today | Proposed |
|---|---|---|
| Ends after no use | 1 hour | **14 days**, sliding (`expiresIn: 1209600`) |
| Extended at most every | 5 minutes | 1 day (`updateAge: 86400`) |
| Absolute limit | none | **90 days**, then sign in again (new check on `createdAt`, small code change) |
| Fresh sign-in for sensitive actions | 5 minutes | 5 minutes, and add Secure export and delete-all to it |
| Sign out everywhere | no | **add** to Settings → Security (deletes every session of the account) |
| Secure Max lock | 15 minutes | unchanged; it stays independent of the session |

**The trade-off in plain words:**
- Users stop being signed out every hour, which is the main complaint a chat app gets.
- In return, a stolen cookie or an unlocked shared computer stays useful for up to 14 days instead of 1 hour. That covers chats, memory, and with Secure on, all saved Secure content.
- Secure Max content stays protected by its 15-minute lock either way.
- The cookies stay HttpOnly, Secure and SameSite=Lax. Signing out a session in the list works at once, because the app reads the session row on every request.
- What makes the longer sessions acceptable: the sessions list already exists, plus the new "Sign out everywhere" and the 90-day limit.

**If you approve:**
- change the two numbers, add the absolute limit and the button;
- update the "1 hour" sentences in the Terms and the privacy policy;
- bump both versions. Under the consent model, everyone accepts the new version once at the next sign-in. The legal read sees the new sentence first.

## 5. security.txt, Dependabot and the axe check

- **security.txt** (commit `6e2e01f`):
  - served at `/.well-known/security.txt`, no sign-in needed;
  - Contact: `security@cometrow.com`, from the legal identity file;
  - Expires: 17 November 2027;
  - Preferred-Languages: en, de;
  - Canonical and Policy: the terms page.
  - A test fails once the date has passed, as a reminder to renew it.
  - Tested through `createApp`, plain and with the invite gate. The production composition passes non-`/api` paths to the same router, as `/terms` already does.
  - **Owner:** is `security@` a mailbox someone reads?
- **Dependabot** (`.github/dependabot.yml`):
  - weekly, Monday, for npm (minor and patch grouped into one pull request), GitHub Actions and the Dockerfiles;
  - it opens pull requests only and merges nothing;
  - it works only once the file is on `main`.
- **axe** (commit `cf7ec62`):
  - The audit tour got an `--axe` switch, which runs axe-core's WCAG 2.2 A and AA rules on every screenshot.
  - I used the tour, which signs in a synthetic account with the same cookie that `/__audit/sign-in` sets, instead of a manual `--serve` session. It covers more screens and is repeatable.
  - axe-core is **not** in `package.json`, because that file has your uncommitted changes. Install it with `npm install --no-save axe-core@4.11.0`. Add it as a dev dependency once your `package.json` changes are committed, if you want it in CI.
  - Run: `npx tsx evaluation/audit-harness.ts --config on --axe --widths 375,1280 --lang en,de --steps <screens>`, on a free port (it never uses 4317).

**axe findings (verified, Chromium, all switches on, 375 and 1280 px, English and German, 25 main screens):**

| Rule | Where | Impact | Fix (commit `0ab3e26`) |
|---|---|---|---|
| color-contrast | message time on your own (light blue) messages: 4.32:1, needs 4.5:1 | serious | darker grey (`--ink2`) |
| color-contrast | the status line under your e-mail in the open account menu | serious | darker grey (`--ink2`) |
| listitem | "File import results" list: `role="status"` on the `<ul>` hid its list items from screen readers | serious | the live region now wraps the list |
| (no result) | 404 page: its strict CSP blocked the axe script | — | the tour bypasses the CSP only for axe; after that, clean |

- After the fixes: **0 violations on 128 screenshots**.
- Two steps timed out on this busy machine at 375 px in English. They passed on a rerun: 0 violations, 0 failed steps.
- The screens look the same apart from the slightly darker grey.
- The import-results and composer browser tests pass (22 of 22).
- axe is not a screen-reader test. The TalkBack and VoiceOver checks on real devices stay on the owner's test list.

## 6. Third-party services

Status of each data-processing agreement (DPA, German AVV), from the docs. "To check" means only the dashboard or the vendor's own page can answer it.

| Service | What it gets | DPA status | Spending cap to check in the dashboard |
|---|---|---|---|
| **Privatemode** (Edgeless Systems, DE), main AI | encrypted prompts; our server IP, times, token counts | DPA version of 24 July 2026 cited. How it was concluded is unknown; filing it is an owner step (`docs/dpa-record-privatemode-20261112.md:61`) | **EUR 50 a month cost cap on the key**, plus 100 requests a minute, 400K prompt and 20K completion tokens (owner-reported 16 Nov). Raise it before 10 invitees. |
| **Tinfoil** (US), backup AI | prompts to its enclave; the browser also fetches attestation data from tinfoil.sh and Sigstore | the privacy policy says a DPA with SCCs is in place; not seen signed (docs say) | account limit; the API was paused at the limit on 12 Nov (docs say). Check that there is no auto top-up. |
| **Brave Search** (US) | search text, masked on the device (search is automatic since 19 November 2026) | search queries are **excluded** from Brave's DPA; transfer basis still to check; "waiting for owner" | production key not issued yet. Check for a monthly cap at issue. The app's own limit is 24 searches a day. |
| **Black Forest Labs** (image creation, `api.eu.bfl.ai`) | masked image description | DPA "on request" only; standard terms allow training on inputs. Docs suggest choosing another provider | prepaid credits only, **no auto top-up**; the app's limit is 3 a day. Feature off, no account. |
| **Render** (web service and database, Frankfurt) | everything hosted, including encrypted Secure data and sessions | "to sign or check" | Render has no hard cap (to check): confirm the plans (database 0.1c-256mb, about USD 6 a month), **autoscaling off**, disk 1 GB, and turn on billing alerts if offered |
| **Cloudflare** (Render's edge) | visitor IP and connection data | covered through Render (to confirm) | none (not our account) |
| **Hetzner** object storage (DE) | encrypted project-file blobs | owner to sign the AVV in the account before use | not set up. About EUR 6.49 a month base; check the traffic and storage price per TB |
| **Google** sign-in | e-mail and Google ID at sign-in | treated as an independent controller; which entity and transfer basis "to confirm" | free. Check that the Google Cloud project has **no billing account**, or a budget alert at EUR 1 |
| **Apple** sign-in | prepared, off | — | — |
| **Stripe** | test mode only | sign the processor terms before live mode | n/a (fees only) |
| **GitHub** (code, CI, Dependabot, daily check) | source code, CI logs, no user data | GitHub's DPA through its terms (to check for the plan) | Settings → Billing → Actions spending limit **USD 0** |
| **UptimeRobot** (proposed) | probe URL and status codes only | not needed for content-free probes (no personal data); check its terms | free plan: none |
| **E-mail sender** | none chosen; e-mail is off | — | — |

**Not used at runtime (verified):** no font, CDN or analytics service. Pyodide and the OCR files are served by CometRow itself, and the CSP is `'self'`. Exa was stopped (docs say).

**App-side ceiling:** `approvedSpendUSD` is not set. The suggested value was USD 10 per 7-day window (`docs/owner-decisions.md:244`), and the owner's number is still open.

## 7. Bot protection for open sign-up (proposal, nothing built)

Facts that shape the choice:
- On Render the app sees **no visitor IP** (item 1), so per-IP limits cannot work. One script could also use up the shared sign-in bucket for everyone.
- The CSP allows only CometRow's own scripts. A third-party captcha (Turnstile, hCaptcha, reCAPTCHA) would need a CSP change, a new processor and a privacy-policy line, and it sends visitors' data to a US company.

**Recommended order:**
1. **Until sign-up opens:** keep the invite list. It is the strongest bot protection there is.
2. **When it opens: Google sign-in only.** Google already filters bots at its sign-in, and e-mail-code sign-in stays off.
3. **A cap on new accounts:** for example 50 new accounts per day for the whole service. When the cap is reached, the page says "Sign-up is full for today". This costs nothing and limits the damage of any bot run. New accounts start with the normal weekly allowance, so a bot cannot run up the provider bill beyond the cap.
4. **If e-mail sign-up opens later:** add a proof-of-work check that CometRow hosts itself, such as the open-source ALTCHA. The browser solves a small puzzle and no third party is involved. Also refuse throwaway e-mail domains.
5. **Before any of this goes public:** fix the shared rate-limit bucket by getting a real client IP (a Render contract or the direct-TLS gateway). Otherwise rate limits protect nobody.

## Not done or not verified

- No Render, Privatemode, Brave, Google or GitHub dashboard was opened. Every "to check" line above needs the owner.
- The vendor plan facts for UptimeRobot, healthchecks.io and Sentry come from search results, not the vendors' own pages.
- The GitHub workflows (monitor, Dependabot) were not run on GitHub. CI on this branch runs after the next push.
- The session proposal is not applied. It needs the owner's decision and the legal read.
