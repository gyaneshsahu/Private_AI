# Recovery rehearsal checklist (launch plan 7.1) — prepared 24 October 2026

**Corrected 12 November** after the local rehearsal (`docs/rehearsals-t4-o3-20261112.md`): step 4 needs `CASCADE`; new step 5a ends sessions and sign-in codes on the restore (a restore otherwise revives them); step 6 must not switch the running service and `check` alone does not prove integrity (compare counts); step 7 had pointed at the retired invite-registry runbook and now says how to reconcile and when to switch the service; roles on a restored instance and the paused-database health failure added to the preconditions.

Status: PREPARED, not run. The owner and the agent run it together in a later session. Every step marked **Owner** is the owner's; the agent only runs `scripts/recovery-rehearsal.ts`, which sends SELECT statements and GET probes and refuses everything else (`tests/recovery-rehearsal.test.ts`).

## Preconditions (all must hold before step 1)

- **Owner:** the restored instance has the roles `cometrow_runtime` and `cometrow_notice` with their passwords (the dump carries grants to them, not the roles); without them the service cannot connect to the restore.
- **Never pause the live database:** `/readyz` and Render's `/healthz` require `mode='normal'`, so a paused database fails the health check and a service cannot start on it.

- **Owner:** the current candidate is deployed and live on `https://app.cometrow.com` (`/readyz` 200); the live commit SHA is written down.
- **Owner:** the owner database URL is in the Windows credential store (runbook 7.6 step 3); it is never pasted into chat, a file in a checkout, or git.
- **Owner:** Render point-in-time recovery is shown as available for the Render PostgreSQL (three-day window).
- **Owner:** a throwaway database exists on the same Render PostgreSQL instance (or a second Render database) holding synthetic data only, created with `initialize-empty` and the synthetic workspace; its URL is in a file outside every checkout, for example `the protected backup folder\rehearsal-url.txt`. The live `privateai_accounts` database is never the target of any step below.
- **Agent:** `node --import tsx scripts/recovery-rehearsal.ts steps` prints the eight steps; the receipt path is chosen outside the checkout, for example `the protected backup folder\rehearsal-20261024.json`.

## Sequence

Each agent command is `node --import tsx scripts/recovery-rehearsal.ts record <step> <url-file> <receipt.json> https://app.cometrow.com`; it appends one timestamped entry (migration plan, recovery mode, row counts of the account tables, `/readyz` and `/healthz` status and latency) and holds no URL or secret.

| # | Step | Owner | Agent | Pass | Rollback |
| --- | --- | --- | --- | --- | --- |
| 1 | Baseline | Note live SHA and time. | `record baseline` | `pending: []`, `recoveryOpen: true`, `readyz` 200 | none needed |
| 2 | Enter paused recovery | In the throwaway database shell: `UPDATE account_recovery_control SET mode='quarantined' WHERE singleton=true;` | `record paused` | `recoveryOpen: false`; the live service is untouched (`readyz` still 200) | `UPDATE ... SET mode='normal'` on the same throwaway database |
| 3 | Backup | Take the Render backup or snapshot of the throwaway database; note its time. | `record backup` | snapshot listed by Render; counts recorded | none needed |
| 4 | Simulate loss | On the throwaway database only: `DROP TABLE usage_requests CASCADE;` (one table; `CASCADE` drops only the `usage_metrics` foreign-key constraint, no other table). | `record loss` | `counts.usage_requests` is an error string; other counts unchanged | restore from step 3 (that is step 5) |
| 5 | Restore | Restore the step-3 snapshot into a new throwaway database; write its URL to a new URL file. | `record restored <new-url-file>` | counts equal step 3; `pending: []`; `recoveryOpen: false` | discard the new database; the step-3 snapshot stays |
| 5a | End old sessions on the restore | In the restored database's shell, one transaction (the same statements as `quarantineSyntheticRestore` in `server/account-restore.ts`): `BEGIN; UPDATE account_recovery_control SET mode='quarantined', generation=pg_catalog.gen_random_uuid(), "updatedAt"=clock_timestamp() WHERE singleton=true; DELETE FROM "session"; DELETE FROM "verification"; UPDATE account_security_event SET "deliveryState"=CASE WHEN "deliveryState"='pending' THEN 'blocked' ELSE 'uncertain' END, "settledAt"=clock_timestamp() WHERE "deliveryState" IN ('pending','dispatching'); COMMIT;` | `record quarantined <new-url-file>` | sessions and sign-in codes 0; pending notices held | none needed: everyone signs in again |
| 6 | Checks | One-off commands from the service shell, with a config whose `databaseUrlFile` points at the restored database: `privileges-check` then `check` (runbook 7.6 step 4, 7.7). Do **not** switch the running service to the restored database yet: a service cannot start on a paused database. `check` compares migration history only; the proof of integrity is the row counts matching step 3. | `record checked` | `restricted` as expected, `pending: 0`, no checksum mismatch, counts equal step 3 | stop on a mismatch; the owner decides (runbook 7.7) |
| 7 | Leave recovery | After reconciliation: counts equal step 3, and the held security notices (`deliveryState='blocked'`) reviewed and either resent or left (the invite-registry runbook section no longer applies; there is no other reconciliation for the account database): `UPDATE account_recovery_control SET mode='normal' WHERE singleton=true;` on the restored database. Then point the service at the restored database and restart it. | `record reopened` | `recoveryOpen: true`; `readyz` 200 | set `mode='quarantined'` again |

## What is measured

- Recovery time: `sinceFirstMs` of the `reopened` entry minus `sinceFirstMs` of the `loss` entry in the receipt. The target is written into READINESS.md with the receipt path; there is no pass threshold yet, the first run sets the baseline.
- Data equality: row counts at `backup` and `restored` are identical.
- Service isolation: `readyz` and `healthz` stay 200 in every entry; the live service never sees the rehearsal.

## Stop criteria (abort, record in READINESS.md, roll back the current step)

- Any command would touch `privateai_accounts` or the live secret files.
- `check` reports a checksum mismatch or the migration history is unknown.
- `readyz` leaves 200 at any step.
- The restore does not complete or counts differ from `backup`.

## Never

- No real data: synthetic rows only, in a throwaway database.
- No deletion, drop or update on the live database; no change to the secret files.
- No new migrations; `apply-pending` and `initialize-empty` are not part of this rehearsal.
- No URL, password or receipt with secrets in chat, the checkout or git.

## Evidence to keep

The receipt JSON (outside the checkout), the live SHA, the snapshot time, the measured recovery time and the pass/stop outcome of each step, as a dated READINESS.md entry labelled owner-reported where the agent did not see the Render dashboard.
