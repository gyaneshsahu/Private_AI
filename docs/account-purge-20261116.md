# Closed-account purge (16 November 2026)

Status: built, off by default, tested offline and on a disposable local PostgreSQL. Not run on the hosted database.

## What it does

A person closes the account on /account (typed phrase, fresh email code). Sign-in stops at once (server/account-closure.ts). With the purge switched on, `graceDays` after the closure request the account is deleted:

- the `"user"` row, and with it, by ON DELETE CASCADE: sessions, sign-in methods, passkeys, security notices, email proofs, research approvals, Secure items, files and the account's key (custody_keys), vault sync data, background tasks;
- the sign-in code rows for the address.

Kept: usage and billing rows (no contact data, needed for reconciliation and tax records), and the closure receipt (opaque id and times), stamped `purgedAt`. Database backups are not touched; their copies expire on the hosting provider's schedule.

Never purged: operator suspensions (`holdUntil = 'infinity'`, scripts/account-operator.ts). Nothing runs while account recovery verification is in progress (`account_recovery_control.mode` not `normal`). At most 100 accounts per daily pass.

## Switch and parts

- `inference.accountPurge: { "enabled": true, "graceDays": 30 }` in the deployment config (strict schema, 7 to 365, default 30). Absent or disabled: off.
- The job: `purge_closed_accounts(grace_days)`, a SECURITY DEFINER function in `accountPrivilegePlan` (server/account-purge.ts). The runtime role may call it and holds no UPDATE on account_closure, so it cannot erase accounts by another rule. Runs at start and daily from server/deployment-process.ts; log lines carry counts only.
- `status.accountPurge.graceDays`: the deletion text on /account names the days. Off: the text says content stays until it is deleted on request.
- Development: `PRIVATEAI_ACCOUNT_PURGE=1` shows the status and text only (no account database, no job).

## Before switching it on (owner)

1. Decide the retention period (owner decision 7). Recommended: 30 days, long enough to undo a mistaken closure by support, short enough to match "deleted".
2. Run the updated `accountPrivilegePlan` SQL as the schema owner (it installs the function). Until then the job logs "Closed account purge failed; nothing was deleted." once a day.
3. Account closure needs email delivery, which is off in production (`emailEnabled: false`), so nobody can close an account today and the purge has nothing to do. Decide how a Google-only user closes the account.
4. Legal read of the deletion text (English and German) in src/text/account.ts.
