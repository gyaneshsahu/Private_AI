# Rehearsals T4 (rollback with chat on) and O3 (recovery), run locally on 12 November 2026

Status: **both run by the agent on the owner's PC.** They used throwaway local databases and containers only: no Render, no hosted database, no real keys, no live inference and no real user data. The timestamps below are UTC. Everything hosted is listed under "Still needs the owner on Render".

| Rehearsal | Result | One-line reason |
|---|---|---|
| T4 rollback with chat on | **PASS for the app; FAIL for chat through the Render edge** | The release, rollback, roll-forward, stop switch, spend cap and metering all behave as designed against one database. Every chat request through the Render bridge is refused with 403 because the bridge drops the CSRF and encryption headers. This affects both `37a3a67` and `ae439fa`. |
| O3 recovery rehearsal | **PASS with run-sheet corrections** | Backup, loss, restore and reopen worked, and row counts matched. The run sheet's `DROP TABLE` statement fails as written. The pause step does not invalidate sessions. A service cannot start on a paused database. |

## Common setup

- **Database:** the pre-existing throwaway container `privateai-auth-synthetic-20261019` (PostgreSQL 17, 127.0.0.1:5433) was stopped when found and has been stopped again. Inside it the agent used a new database `cometrow_rehearsal_20261112`, a restore target `cometrow_rehearsal_20261112_restored`, and two restricted roles `rehearsal_runtime_t4` and `rehearsal_notice_t4`. Those roles were created with the reviewed grant plan from `privileges-plan public rehearsal_runtime_t4 rehearsal_notice_t4`, including the purge function, so the app ran as a restricted runtime role, as on Render. All of these were dropped afterwards. The `privateai_synthetic` database was not touched.
- **Releases:** HEAD = `37a3a67` (current `codex/development-handoff`). Previous release = `ae439fa`, the commit live on Render according to the handoff note of 12 November. Each was checked out into a plain-path worktree (`C:\Gyanesh\Startups\Private_AI-rehearsal-head`, `C:\Gyanesh\Startups\Private_AI-rehearsal-old`) and built as its Render image with `docker build -f Dockerfile.render --target render-candidate -t cometrow-rehearsal:<release> .`. HEAD took 35 s and `ae439fa` took 11 s; both used cached layers and the default `PRIVACY_PLACEHOLDERS=forbid`. The worktrees and images have been removed.
- **Composition:** the Render entry (`server/render-entry.ts`) ran inside the image with a render config of the same shape as `deployment/render-config.example.json`:
  - the bridge on PORT 18100;
  - the app on 127.0.0.1:18443 over mTLS with a pinned bridge certificate from a local rehearsal CA;
  - `email: disabled`;
  - an allowlist of one synthetic address;
  - for chat-on runs, an `inference` section `{enabled, apiKeyFile, qualificationFile, stopFile}`.
- **Why containers:** on this PC Avast intercepts loopback TLS. A host-run release answered every request through the bridge with 502, because the bridge saw "Avast Web/Mail Shield Untrusted Root" instead of the app certificate. This is the same local problem recorded on 22 October. All containers therefore shared the network namespace of the throwaway Postgres container (`--network container:privateai-auth-synthetic-20261019`), where nothing intercepts.
- **Chat fixture:**
  - API key: `LOCAL_FIXTURE_FAKE_KEY_NOT_REAL`.
  - Qualification file: `qualification-LOCAL-FIXTURE.json`. Every check carries the evidence text "LOCAL FIXTURE ... NOT a qualification report". The origin is `https://fake-upstream.rehearsal.test/`, the model `gpt-oss-120b`, the price USD 1 per million tokens each way, at most 5000 input characters and 500 output tokens. The worst case is therefore USD 0.0055 per request, and `approvedSpendUSD` was 0.05.
  - Fake upstream: the app container got `HTTPS_PROXY=http://127.0.0.1:18080` and `NODE_EXTRA_CA_CERTS=<rehearsal CA>`. A helper container ran `fake-upstream.mjs`, a CONNECT proxy that tunnels only `fake-upstream.rehearsal.test:443` into an in-process TLS server. That server returns 200, `Ehbp-Response-Nonce`, 64 bytes, and the trailer `X-Tinfoil-Usage-Metrics: prompt=100,completion=50,model=gpt-oss-120b,cost_usd=0.01`. It counts forwarded requests, checks the bearer key, and refuses and records any other CONNECT target.
- **Signed-in user:** production sign-in is Google only, so the driver `drive.mjs seed` used the owner role to insert one synthetic user (`rehearsal-owner@example.test`, verified), one session and an allowance of 20 requests. The session cookie `__Secure-privateai-account.session_token` was signed with the fixture auth secret in the same way as better-call's `signCookieValue`.
- **Probes:** `drive.mjs probe <label>` sends, in this order:
  - `GET /healthz` through the bridge;
  - `GET /readyz` directly over mTLS;
  - `GET /api/status` through the bridge, with the cookie;
  - the chat POST once through the bridge and once directly over mTLS, acting as the edge with the pinned certificate and `x-privateai-edge-*` headers. The headers are cookie, Origin, `X-PrivateAI-CSRF`, `X-Tinfoil-Enclave-Url` and `Ehbp-Encapsulated-Key`, with a 32-byte body.

  It then reads the fake upstream counters and the database's `usage_requests` and `usage_metrics` counts.
- **Where the files are:** the harness files are outside the repository, in the session scratchpad (`...\scratchpad\t4\`: `fake-upstream.mjs`, `drive.mjs`, `wait-ready.mjs`, `make-configs.mjs`, `o3-record.ps1`, the configs and `o3-receipt.json`). The URL files, keys and secrets were deleted after the run. If the owner wants to repeat the run without the agent, these files should be moved into `scripts/`; that was not done.

Container start command used for every release (PowerShell; `$S` = the scratchpad folder):

```
docker run -d --name cometrow-t4-app --network container:privateai-auth-synthetic-20261019 -v "${S}:/rehearsal" -e PORT=18100 -e HTTPS_PROXY=http://127.0.0.1:18080 -e NODE_EXTRA_CA_CERTS=/rehearsal/ca.pem cometrow-rehearsal:<release> /rehearsal/<config>.json
docker exec cometrow-t4-helper node /rehearsal/wait-ready.mjs <start-iso> 90   # polls bridge /healthz every 100 ms
docker exec cometrow-t4-helper node /rehearsal/drive.mjs probe <label>
```

## T4: rollback with chat on

**Goal:** show the following against one database:

- HEAD with chat on admits and meters chat requests;
- rolling back to the release live on Render (`ae439fa`) starts, and chat behaves as that release defines;
- rolling forward works again;
- the stop switch refuses chat with 503 and forwards nothing.

### Steps and results

| # | Time (UTC) | Command / action | Result |
|---|---|---|---|
| 0 | 12:44:20 | `server/deployment-database-entry.ts initialize-empty` (HEAD, owner role) | 14 migrations applied, pending 0 |
| 1 | 12:48:20 | start HEAD `config-head-chat.json` | ready in **2.0 s**; log line "chat enabled for allowlisted accounts" |
| 2 | 12:48:37 | probe `head-chat-on` | `/api/status` 200, `inference.ready: true`, model gpt-oss-120b. **Direct chat 200**: forwarded 1 with the correct fixture key and model, `usage_requests` 1, metered USD 0.01. **Chat through the bridge 403 "Request authorization failed."** |
| 3 | 12:48:46 | create the stop file, probe, delete the stop file, probe (0.4 s in total) | stop on: status "Private chat is paused by the operator.", direct chat **503**, forwarded unchanged (1). Stop off: direct chat 200, forwarded 2. Takes effect on the next request; no restart needed |
| 4 | 12:48:50 | four more probes | 200, 200, 200, then **429 "approved spending limit ... reached"** at metered USD 0.05. Worst-case arithmetic as designed: 5 forwarded, the 6th refused, nothing sent |
| 5 | 12:48:54–12:49:19 (not stamped) | `docker stop -t 15` (SIGTERM drain) | exit 0 in 0.1 s |
| 6 | 12:48:54–12:49:19 (not stamped) | start `ae439fa` with the **same config** (inference enabled) | **startup failed, exit 1 after 1.6 s** ("CometRow restricted deployment startup failed.") |
| 7 | 12:48:54–12:49:19 (not stamped) | start `ae439fa` with `inference.enabled: false` | **startup failed, exit 1 after 1.2 s** |
| 8 | about 12:49:19 | `ae439fa` image: `check` and `privileges-check` against the same database (config without an `inference` section) | `applied 14, pending 0`; role `rehearsal_runtime_t4`, `restricted: true` |
| 9 | 12:49:20 | start `ae439fa` with `config-old-nochat.json` (no `inference` key) | ready in **1.4 s**; "email and inference disabled" |
| 10 | 12:49:21 | probe `old-ae439fa-no-inference-section` | `/healthz` 200, `/readyz` 200; the same session still works (status 200); `inference.ready: false`; direct chat **503 "Protected inference is not qualified. No request was forwarded."**; forwarded unchanged (5). Reads HEAD-written usage rows without error |
| 11 | 12:49:32 | stop old, start HEAD `config-head-chat.json` (roll forward) | stop 0.1 s, ready in **1.5 s** |
| 12 | 12:49:33 | probe `forward-head-same-fixture` | status `ready: true`, but direct chat **429** (spend cap reached). The cap is durable across rollback and forward because it is computed from the database |
| 13 | 12:49:42 | fixture `approvedSpendUSD` raised to 1.0, `docker restart` | ready in 1.1 s; direct chat 200 (forwarded 6) |
| 14 | 12:49:43 | stop file on, probe, off, probe | 503 then 200 (forwarded 7) |
| 15 | 12:49:53 | HEAD with `config-head-chat-disabled.json` (durable stop) | ready in 1.2 s, "email and inference disabled", chat 503 "not qualified" |

The fake upstream received 7 requests in total, all with the fixture key and all for `gpt-oss-120b`. No CONNECT to any other host was attempted. Metered spend was fictitious USD 0.07 and real spend was USD 0.

### Pass/fail

- **Pass:**
  - Migration compatibility: no migration was added between `ae439fa` and `37a3a67`; both read 14 applied and 0 pending.
  - The old release starts on the HEAD-used database and keeps the session.
  - Chat is off on the old release (503, nothing forwarded).
  - Roll-forward works.
  - Stop file and durable stop.
  - Spend cap and metering.
- **Fail (launch blocker for chat on Render):** chat through the Render bridge, on both releases.

### Problems found

1. **Blocker: the Render bridge drops the headers chat needs.**
   - What happens: `server/render-bridge.ts` forwards a positive list of headers: cookie, origin, content-type, accept, accept-language and `sec-fetch-*`. `X-PrivateAI-CSRF`, `X-Tinfoil-Enclave-Url`, `Ehbp-Encapsulated-Key` and `X-Tinfoil-Model` are not on the list. Every chat POST through `app.cometrow.com` therefore fails the consumer CSRF check with 403 "Request authorization failed.", before the relay runs. The same requests sent directly to the app succeed.
   - Wider effect: every CSRF-protected workspace POST behind the bridge fails the same way, for example `/api/research/prepare` and the billing POSTs.
   - Why nobody saw it: the owner's live 7.9 checks used only GET and Better Auth routes, which carry no custom headers.
   - Fix needed (app code, not changed here): add those four request headers to the bridge's list, and add a case to `tests/render-bridge.test.ts` that a chat POST with CSRF reaches the app. That test is PostgreSQL-gated, so CI's durable job or a container run proves it, not the host.
2. **Rollback hazard: releases before the 12 November merge refuse a config with an `inference` key.**
   - What happens: `ae439fa` refused to start when the config had an `inference` section, even with `enabled: false`, because the config schema is `.strict()`. Once the hosted `render-config.json` carries the section, a rollback to `ae439fa`, or to any release before `8a26a30`, fails startup.
   - Runbook step: before such a rollback, remove the `inference` key from `/etc/secrets/render-config.json`; setting `enabled: false` is not enough. Put it back after the roll-forward.
   - Not verified: what Render does with a deploy whose new instance never becomes healthy.
3. **The status endpoint says chat is ready when the spend cap is reached.** `/api/status` reports `inference.ready: true` while every send is refused with 429 by the cap, so the user sees chat as available and then gets an error. Minor; the cap itself works.
4. **Note: a fresh database without the purge function.** A database made with `initialize-empty` but without the operator purge SQL logs "Request record purge failed." This was seen on the first host run, before the grant plan was applied; it is already documented as operator SQL.
5. **Local only:** loopback TLS interception by Avast (see Common setup). Host-run releases cannot be rehearsed through the bridge on this PC.

### Still needs the owner on Render

- After fix 1 is deployed: a real-browser chat test through `app.cometrow.com`. It needs an accepted qualification report and the real key in a Render secret file; not before.
- The hosted rollback drill with chat on, as in `docs/rollback-drill-20261025.md`, with one added step: remove the `inference` key from the secret config before deploying the older SHA, and add it back after the roll-forward.
- Check that the hosted stop file is usable: `touch` the configured `stopFile` from the service shell and confirm the next send shows "paused by the operator". `/tmp` is cleared on restart, so a durable stop still needs `enabled: false` plus a redeploy.
- Confirm on the Events page what Render does when a rollback deploy fails startup (finding 2): does the previous instance keep serving?

### Fixes needed

| Fix | Where | Changed here? |
|---|---|---|
| Forward `x-privateai-csrf`, `x-tinfoil-enclave-url`, `ehbp-encapsulated-key` and `x-tinfoil-model` through the bridge; add a test | `server/render-bridge.ts`, `tests/render-bridge.test.ts` | no (app code) |
| Runbook: remove the `inference` key before rolling back past `8a26a30` | `docs/development-deployment.md` (production chat switch section), `docs/rollback-drill-20261025.md` | no |
| Optional: report the spend cap in `/api/status` | `server/app.ts` | no |

## O3: recovery rehearsal

**Goal:** follow `docs/recovery-rehearsal-20261024.md` and `scripts/recovery-rehearsal.ts` against the throwaway database: baseline, pause, backup, loss, restore, checks, reopen. Measure the recovery time and data equality.

### Local mapping of the run sheet

| Run sheet | Here |
|---|---|
| Throwaway database on Render | `cometrow_rehearsal_20261112`, holding T4's synthetic rows (1 user, 2 sessions, 1 allowance, 7 requests, 7 metrics) |
| Render snapshot | `pg_dump -Fc` inside the container |
| Restore into a new database | `createdb` plus `pg_restore` into `cometrow_rehearsal_20261112_restored` in the same cluster |
| Live service | HEAD release (`config-head-nochat.json`) on the throwaway database |
| Origin | `http://127.0.0.1:18100` (bridge) |

The record command ran from the HEAD image, with the script mounted from the checkout and the receipt outside the checkout:

```
docker run --rm --network container:privateai-auth-synthetic-20261019 -v "${S}:/rehearsal" -v "C:\Gyanesh\Startups\Private_AI\scripts\recovery-rehearsal.ts:/app/scripts/recovery-rehearsal.ts:ro" --entrypoint node cometrow-rehearsal:head-37a3a67 --import tsx scripts/recovery-rehearsal.ts record <step> /rehearsal/<url-file> /rehearsal/o3-receipt.json http://127.0.0.1:18100
```

### Steps and receipt

Owner-side SQL ran as `docker exec privateai-auth-synthetic-20261019 psql -U privateai_synthetic -d <db> -c "..."`.

| Step | At (UTC) | sinceFirstMs | Action | recoveryOpen | usage_requests | healthz (bridge) |
|---|---|---|---|---|---|---|
| baseline | 12:50:42.596 | 0 | none | true | 7 | 200 |
| paused | 12:50:49.428 | 6 832 | `UPDATE account_recovery_control SET mode='quarantined' WHERE singleton=true;` | false | 7 | **503** |
| backup | 12:51:08.354 | 25 758 | `pg_dump -U privateai_synthetic -d cometrow_rehearsal_20261112 -Fc -f /tmp/o3-backup.dump`: **0.15 s**, 54 KB, 23 table-data entries, includes `purge_expired_requests()` and all grants | false | 7 | 503 |
| loss | 12:51:22.114 | 39 518 | `DROP TABLE usage_requests;` **failed** (FK from `usage_metrics`); `DROP TABLE usage_requests CASCADE;` succeeded and dropped only the FK constraint | false | error: relation does not exist | 503 |
| restored | 12:51:29.572 | 46 976 | `createdb ... cometrow_rehearsal_20261112_restored`; `pg_restore --exit-on-error`: **0.53 s** | false | 7 (equal to backup) | 503 |
| checked | 12:52:02.744 | 80 148 | `privileges-check` with the runtime URL: role `rehearsal_runtime_t4`, `restricted: true`. `check`: applied 14, pending 0, no mismatch. Owner URL: `restricted: false`, as expected. Starting the service on the restored, still paused database: **startup failed, exit 1** | false | 7 | 0 (service down) |
| reopened | 12:52:13.361 | 90 765 | `UPDATE ... SET mode='normal'` on the restored database, then the service started on it (runtime role): ready in **1.3 s** | true | 7 | 200 |

- **Data equality:** the counts at `backup` and `restored` are identical for all seven tables. **PASS**.
- **Recovery time:** reopened − loss = **51.2 s**, measured by the run sheet's metric. Almost all of it was operator pacing, including one failed service start. Machine time was about 2 s: dump 0.15 s, restore 0.53 s, service start 1.3 s. This is a baseline for 54 KB of synthetic data, not a Render estimate.
- **After reopening:** the T4 session issued before the backup still works on the restored database (`/api/status` 200), and chat stays 503 because the config has no inference section.

### Pass/fail

**PASS:** backup, loss, restore and reopen with matching counts and a working service. The run sheet needs the corrections below before the hosted run.

### Problems found (run sheet wrong or missing)

1. **Step 4 SQL fails as written.**
   - What happens: `DROP TABLE usage_requests;` errors because `usage_metrics.request_id` references it (migration 0013).
   - Fix: use `DROP TABLE usage_requests CASCADE;`, which drops only that FK constraint.
2. **Pausing makes readiness fail for any service on that database, and a service cannot start on it.**
   - What happens: `/readyz` and Render's `/healthz` require `mode='normal'`. With the database paused, the running service answered 503. A service started against a paused database exits at startup ("Production startup was not admitted"), and the record command's probes then fail.
   - Run sheet change: step 6 must not switch the service to the restored database before step 7. Order for a real recovery: restore, check, reopen, then point the service at the restored database and restart.
   - Hazard: pausing the live database makes Render's health check fail. Not verified: how Render reacts to that.
3. **The pause does not invalidate sessions.**
   - What happens: step 2 only sets `mode`. A session restored from the backup is valid again after step 7, as shown above.
   - Existing code that would cover it: `quarantineSyntheticRestore` in `server/account-restore.ts` also deletes sessions and verifications, holds pending notices and rotates `generation`. It refuses every database name except `privateai_restore_<hex>`, and no production operator command exists.
   - Fix needed (owner decision, app code): a reviewed `restore-quarantine` operator command in `server/deployment-database-entry.ts`, or explicit SQL in the run sheet for after a restore. Without it a real restore revives old sessions.
4. **Step 7 points at the wrong runbook.** It cites "Registry backup and paused recovery" item 4 for reconciliation. That section is `docs/invited-trial-runbook.md` and covers the retired SQLite invite registry, not the PostgreSQL account database. No reconciliation procedure exists for the account database.
5. **`check` does not detect a dropped table.** `pending: []` stayed true after the table was dropped, because `check` compares migration history only. Only the row counts showed the loss, so `check` passing in step 6 is not proof of schema integrity.
6. **Script fix (made): the record command lost the entry when the service was down.**
   - What happened: `record` threw "fetch failed" when the origin was unreachable, and the step's entry was never written.
   - Fix: `collectChecks` now records `status: 0` for an unreachable origin.
   - Test: a new case in `tests/recovery-rehearsal.test.ts` passes with the fix, and fails without it with "fetch failed" (checked against HEAD). The file now has 3 passing tests.
7. **The readiness reading differs locally.** With origin `http://127.0.0.1:18100`, `readyz` reads 403 at every step, because the bridge requires `Host: app.cometrow.com`. Locally the bridge's `/healthz`, which probes the app's `/readyz`, is the readiness reading. Against `https://app.cometrow.com` this does not apply.
8. **The run sheet does not cover roles on a restored instance.** The dump carries grants to `cometrow_runtime` and `cometrow_notice`. A restore into a new Render database works only if those roles exist there with their passwords.

### Still needs the owner on Render

The hosted part of the run sheet:

- Render snapshot or point-in-time restore of a throwaway database into a new database;
- confirm the restored instance has the runtime and notice roles;
- `privileges-check` and `check` from the service shell;
- leave recovery;
- the measured recovery time, recorded as owner-reported.

Apply corrections 1 to 4 to the run sheet first, and decide on session invalidation (problem 3) before any real restore.

### Fixes needed

| Fix | Where | Changed here? |
|---|---|---|
| `DROP TABLE usage_requests CASCADE;` | `docs/recovery-rehearsal-20261024.md` step 4 | no |
| Order: reopen before pointing a service at the restored database; note that readiness and startup fail while paused | `docs/recovery-rehearsal-20261024.md` steps 6–7 | no |
| Session and verification invalidation for a production restore | `server/deployment-database-entry.ts` (new command) or run-sheet SQL | no (owner decision) |
| Correct the reconciliation reference | `docs/recovery-rehearsal-20261024.md` step 7 | no |
| Record a down service as status 0 | `scripts/recovery-rehearsal.ts`, `tests/recovery-rehearsal.test.ts` | **yes** |

## Files changed by this work

- `docs/rehearsals-t4-o3-20261112.md` (new, this file)
- `scripts/recovery-rehearsal.ts` (probe returns status 0 for an unreachable origin)
- `tests/recovery-rehearsal.test.ts` (one new test)

## Cleanup done

- Removed: containers `cometrow-t4-app` and `cometrow-t4-helper`; images `cometrow-rehearsal:head-37a3a67` and `cometrow-rehearsal:old-ae439fa`; both worktrees (the HEAD worktree's `node_modules` was a junction to the main checkout and only the link was removed).
- Dropped: databases `cometrow_rehearsal_20261112` and `cometrow_rehearsal_20261112_restored`; roles `rehearsal_runtime_t4` and `rehearsal_notice_t4`; `/tmp/o3-backup.dump` in the container.
- `privateai-auth-synthetic-20261019` is stopped again, as found.
- The durable suite was not run.

## Fixed after the rehearsal (12 November)

The bridge blocker is fixed in code: `server/render-bridge.ts` now forwards `x-privateai-csrf`, `x-privateai-continuation-approval`, `x-tinfoil-enclave-url`, `x-tinfoil-model` and `ehbp-encapsulated-key` (each checked by the app itself), still no forwarding or identity headers. `tests/render-bridge-headers.test.ts` scans the browser code and the EHBP library for every custom request header and fails if the bridge would drop one (mutation-checked). Not deployed: it reaches app.cometrow.com only with the owner's next deploy, and a real browser chat through Render is still to be run.
