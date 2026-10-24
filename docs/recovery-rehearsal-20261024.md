# Recovery rehearsal checklist (launch plan 7.1) — prepared 24 October 2026

Status: PREPARED, not run. The owner and the agent run it together in a later session. Every step marked **Owner** is the owner's; the agent only runs `scripts/recovery-rehearsal.ts`, which sends SELECT statements and GET probes and refuses everything else (`tests/recovery-rehearsal.test.ts`).

## Preconditions (all must hold before step 1)

- **Owner:** the current candidate is deployed and live on `https://app.cometrow.com` (`/readyz` 200); the live commit SHA is written down.
- **Owner:** the owner database URL is in the Windows credential store (runbook 7.6 step 3); it is never pasted into chat, a file in a checkout, or git.
- **Owner:** Render point-in-time recovery is shown as available for the Render PostgreSQL (three-day window).
- **Owner:** a throwaway database exists on the same Render PostgreSQL instance (or a second Render database) holding synthetic data only, created with `initialize-empty` and the synthetic workspace; its URL is in a file outside every checkout, for example `the protected backup folder\rehearsal-url.txt`. The live `privateai_accounts` database is never the target of any step below.
- **Agent:** `node --import tsx scripts/recovery-rehearsal.ts steps` prints the seven steps; the receipt path is chosen outside the checkout, for example `the protected backup folder\rehearsal-20261024.json`.

## Sequence

Each agent command is `node --import tsx scripts/recovery-rehearsal.ts record <step> <url-file> <receipt.json> https://app.cometrow.com`; it appends one timestamped entry (migration plan, recovery mode, row counts of the account tables, `/readyz` and `/healthz` status and latency) and holds no URL or secret.

| # | Step | Owner | Agent | Pass | Rollback |
| --- | --- | --- | --- | --- | --- |
| 1 | Baseline | Note live SHA and time. | `record baseline` | `pending: []`, `recoveryOpen: true`, `readyz` 200 | none needed |
| 2 | Enter paused recovery | In the throwaway database shell: `UPDATE account_recovery_control SET mode='quarantined' WHERE singleton=true;` | `record paused` | `recoveryOpen: false`; the live service is untouched (`readyz` still 200) | `UPDATE ... SET mode='normal'` on the same throwaway database |
| 3 | Backup | Take the Render backup or snapshot of the throwaway database; note its time. | `record backup` | snapshot listed by Render; counts recorded | none needed |
| 4 | Simulate loss | On the throwaway database only: `DROP TABLE usage_requests;` (one table, nothing else). | `record loss` | `counts.usage_requests` is an error string; other counts unchanged | restore from step 3 (that is step 5) |
| 5 | Restore | Restore the step-3 snapshot into a new throwaway database; write its URL to a new URL file. | `record restored <new-url-file>` | counts equal step 3; `pending: []`; `recoveryOpen: false` | discard the new database; the step-3 snapshot stays |
| 6 | Checks | From the service shell, with a config whose `databaseUrlFile` points at the restored database: `privileges-check` then `check` (runbook 7.6 step 4, 7.7). | `record checked` | `restricted` as expected, `pending: 0`, no checksum mismatch | stop on a mismatch; the owner decides (runbook 7.7) |
| 7 | Leave recovery | After reconciliation (runbook "Registry backup and paused recovery" item 4): `UPDATE account_recovery_control SET mode='normal' WHERE singleton=true;` on the restored database. | `record reopened` | `recoveryOpen: true`; `readyz` 200 | set `mode='quarantined'` again |

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
