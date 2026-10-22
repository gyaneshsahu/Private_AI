# Inactive-account retention: activation proposal — 22 October 2026

Owner decision document for launch-plan item 3.3. Nothing in this document is active. No code was changed for it, no job exists, and nothing on the hosted database is scheduled to be deleted. Every "would" below stays conditional until the owner records a decision in READINESS.md.

Short version: the code the plan calls "inactive-account retention" does not delete inactive accounts. It deletes credential rows of accounts whose owner explicitly closed them, seven days after the request, and it can run today only against a throwaway synthetic database while the whole service is quarantined. On the hosted database nothing is eligible, because closing an account needs email proof and email delivery is disabled there. Activation is therefore not urgent; it is a package of decisions, three code changes and one disclosure, listed in section 5.

## 1. What the retention code does today

There are two separate, inactive code paths. Neither is imported by the application, a CLI, a scheduler or a deployment step.

### 1a. Consumer accounts, PostgreSQL (the hosted candidate)

- Migration `0009-account-closure.sql` created `account_closure` with `requestedAt`, `purgeAfter` (default and check: at least seven days after the request), `holdUntil` and `purgedAt`. The hosted `privateai_accounts` database has this table: it was among the twelve migrations applied on 21 October.
- `server/account-closure.ts` `requestAccountClosure` writes the closure receipt after a fresh email proof (at most five minutes old) and immediately deletes the account's sessions and sign-in codes. Sign-in, billing and research paths refuse closed accounts from that moment (`account-access.ts`, `account-auth.ts`, `billing-workflow.ts`, `billing-reconciliation.ts`). Closure is denial, not deletion.
- `server/inactive-consumer-retention.ts` `purgeSyntheticClosedAccounts` is the only deletion code. It selects closures whose `purgeAfter` has passed and whose `holdUntil` is empty or past, deletes the matching `"user"` rows, lets the foreign keys cascade, and stamps `purgedAt`. It refuses to run unless the connected database is literally `privateai_synthetic` with a disposable `usage_test_…`/`auth_test_…` schema, and unless `account_recovery_control.mode` is `quarantined`. Both refusals are hard-coded, so it cannot touch the hosted database even by accident, and it cannot run while the service is serving users (quarantine denies every sign-in).
- The runtime database role in `server/account-privileges.ts` has SELECT and INSERT on `account_closure` and no DELETE on `"user"` rows outside normal auth flows; it has no UPDATE on `purgedAt`. A purge would need its own role.
- No code path writes `holdUntil`. The column exists; the hold procedure does not.
- Tested in `tests/account-access.test.ts` on the synthetic container: the purge refuses to run outside quarantine, a due closure is purged with its passkeys, a held closure and a recent closure are kept, and a second run removes nothing. The billing tests separately show a customer binding surviving a synthetic deletion (`docs/ARCHITECTURE.md`).

### 1b. Restricted-trial invitation registry, SQLite (the older access model)

- `server/inactive-retention.ts`: `prepareRetentionSchema`, `revokeWithRetention` (records the revocation time once; a second revocation cannot restart the clock), `setRetentionHold`, and `purgeEligibleAccounts`, which deletes invitation rows expired for seven days or revoked for seven days by recorded time, skips held rows, and requires paused access. It sets `PRAGMA secure_delete`, which reduces page remnants and proves nothing about WAL, disk or backups.
- `scripts/retention-assessment.ts --preview` prints aggregate counts only (no identifiers, no writes) from `server/retention-assessment.ts`.
- Backups of this registry are the Windows task in `scripts/windows-backup.ps1`: encrypted archives in `C:\PrivateAI-backups`, local copies older than seven days removed on each run.
- This path concerns the invitation registry of the restricted trial, not the consumer accounts on app.cometrow.com. It is listed here so the owner does not mistake its seven-plus-seven-day figures for hosted facts.

### 1c. What is not implemented anywhere

- No deletion by inactivity. No code reads last sign-in time or session age to decide anything. An "inactive account" rule would be a new feature with its own notice, grace period and disclosure, not an activation.
- No automatic run. No scheduler, cron, Render job or startup hook calls either purge.
- No deletion of usage, billing or security records (see section 2).
- No proof of physical erasure. Both purges return `physicalErasureVerified: false` on purpose.

## 2. What activating it would delete, and when

"Activating" means the consumer path (1a) running against the hosted database. The registry path (1b) has no hosted counterpart.

### Deleted, by cascade from the `"user"` row

| Table | Content | Why it goes |
| --- | --- | --- |
| `"user"` | account ID, name, email, verification flag | the purge target |
| `session` | session tokens, IP address, user agent | FK cascade (already emptied at closure) |
| `account` | provider links, password hash, any provider tokens (none are stored by design) | FK cascade |
| `passkey` | public keys, credential IDs, device type | FK cascade |
| `account_security_event` | security notices and their delivery state | FK cascade |
| `account_credential_change` | credential-change timestamps | FK cascade |
| `account_email_proof`, `consumer_request_count`, `research_consent` | per-session proofs, counters, consent | cascade through `session` |

### Retained after a purge

| Table | Why it stays | Open decision |
| --- | --- | --- |
| `account_closure` | the receipt that a closure happened and when it was purged; the UUID becomes a pseudonym with no email behind it | none; this is the audit trail |
| `usage_accounts`, `usage_allowances`, `usage_requests`, `usage_metrics` | keyed by the opaque account ID as text, no foreign key; request counts, tokens, published cost; no content | retention period for usage records is undecided (`docs/backup-retention-policy.md`, 19 October) |
| `billing_customer_binding`, `billing_event_inbox`, `billing_assessment`, `billing_operation` | deliberately no foreign key so billing evidence never blocks a credential purge (`docs/ARCHITECTURE.md`) | billing-record retention needs a legal review before any live billing; test-mode rows today |
| `verification`, `rateLimit` | keyed by identifier text, not by user; sign-in codes are deleted at closure | check whether any other identifier type remains for a closed email |
| Render platform logs, PostgreSQL WAL and backups | outside the application | see "when" below |

Encrypted conversation history is never on the server; it lives in the user's browser vault and is unaffected either way (the privacy statement already says so).

### When

- Earliest: seven days after the closure request (`purgeAfter`), or `holdUntil` if later, and only at the moment an operator runs the purge. There is no later-than bound today because nothing runs by itself.
- Backups: the paid Render PostgreSQL plan keeps a point-in-time recovery window of three days (`docs/development-deployment.md`). Deleted rows therefore remain recoverable by the platform for up to three days after the purge, and in any manual dump the owner has taken for a restore rehearsal for as long as that dump exists. The "seven days plus seven days, up to fourteen" figure in `docs/backup-retention-policy.md` describes the Windows registry backups of path 1b, not the hosted database.
- Today on the hosted database: zero accounts are eligible, and none can become eligible, because closure requires an email proof and email delivery is disabled in the restricted runtime (the closure control is greyed out for that reason). Activation would have no effect until email is enabled.

## 3. Checks before activation (all open)

1. **Scope decision (owner).** Closed accounts only, which is what exists, or an inactivity rule as well, which does not exist. Recommendation: closed accounts only; defer inactivity until there are accounts and an enabled sender for the required notice.
2. **Hosted-capable purge (engineering, after 1).** The present function refuses non-synthetic databases by name. A separate function for the hosted database must keep: explicit database-name allowlist, dry run that prints counts only, no identifiers in output, a required operator-typed confirmation of the count, and a returned record for READINESS.
3. **Quarantine versus per-account lock (owner decision, engineering proposal).** The purge currently demands the whole service quarantined, which means every user is refused during the run. Options: (a) keep that and purge only in announced maintenance windows; (b) replace it with the existing per-account advisory lock used by closure, so the service stays up. Recommendation: (b), because (a) turns a routine deletion into downtime.
4. **Database role.** A dedicated purge role with DELETE on `"user"` and UPDATE (`purgedAt`) on `account_closure`, granted in the review-only privilege plan, never the runtime role; credentials in the owner's secret store, never in Git or Render environment variables shared with the runtime.
5. **Hold procedure.** Define who may set `holdUntil`, on what grounds (dispute, legal request, suspected takeover), and add the one SQL statement or command to do it. Without this the incident brake exists only as a column.
6. **Tests on the synthetic container** (`npm run test:durable` with `PRIVATEAI_SYNTHETIC_PG`): closed-and-due is purged, closed-and-held is kept, closed-but-early is kept, open account untouched, billing binding and usage rows retained, second run is a no-op, dry run writes nothing. Then one restore rehearsal proving that a backup taken before the purge, restored into a paused instance, stays quarantined and cannot sign the purged account back in.
7. **Disclosure.** `shared/privacy-copy.ts` (and therefore the website copy) must state what closing an account deletes, the seven-day delay, the three-day platform backup window, and what is kept (pseudonymous usage and billing records). The retention matrix in `docs/backup-retention-policy.md` needs a hosted-database row with these facts.
8. **Usage and billing record retention (owner).** Decide how long pseudonymous usage rows and test-mode billing rows outlive the account. Not required for the purge itself, but the disclosure in 7 must say something true about them.
9. **Prerequisites that are not retention work:** email delivery enabled on the hosted runtime (otherwise no closure can happen), and the pending one-time migration apply for 0013 recorded, so the schema on the hosted database matches the tested code.

## 4. Rollback

- **Before a run:** nothing to roll back. There is no scheduler to disable; the capability is absent until the role in check 4 exists. Revoking that role's grants removes the capability again.
- **During a run:** the purge is one transaction; an error rolls back everything, and the dry run must precede each real run.
- **After a run:** there is no per-account undo inside the application. Credential rows are gone; the `account_closure` receipt remains. The only recovery is a platform point-in-time restore within three days, which restores the entire database to that moment and resurrects every other change made since, so it is a disaster procedure under the recovery acceptance rules (restore into a paused instance, quarantine, reconcile), not a rollback of one deletion. The owner should treat each real run as irreversible and rely on the hold and the dry run, not on backups.

## 5. Exact owner steps

Nothing below asks the owner to run SQL or change hosted settings now.

1. Record in READINESS.md the scope decision from check 1 (closed accounts only, or also inactivity) and the lock decision from check 3 (quarantine window or per-account lock). One sentence each is enough.
2. Decide the two retention figures the disclosure needs: how long pseudonymous usage rows are kept after a purge, and how long test-mode billing rows are kept. If undecided, say "indefinitely until a policy is set" in the disclosure rather than inventing a number.
3. Confirm the backup facts from the Render dashboard: the point-in-time window of the `privateai_accounts` plan, and whether any manual dumps of the hosted database exist on the founder machine or elsewhere. Report the two facts only; do not change backup settings.
4. Approve engineering to implement checks 2, 4, 5 and 6 on this branch and on the synthetic container, with the dry run as the default mode and no hosted run.
5. After the engineering evidence is in READINESS.md, approve the disclosure text (check 7) before it is deployed; the deletion capability must not reach the hosted service ahead of the text that describes it.
6. First hosted run only when all of the following are true: email delivery enabled, at least one real closure older than seven days, migration state recorded, dry-run count reviewed by the owner on the day, and the run performed by the owner with the purge role, never by an agent. Record the returned counts in READINESS.md.
7. Until step 6, leave everything as it is. Nothing is eligible, nothing runs, and the privacy statement makes no deletion promise it cannot keep.

## Sources read

`server/inactive-consumer-retention.ts`, `server/inactive-retention.ts`, `server/retention-assessment.ts`, `server/account-closure.ts`, `server/account-privileges.ts`, `server/migrations/0001`, `0003`, `0005`, `0007`, `0008`, `0009`, `0010`, `0011`, `scripts/retention-assessment.ts`, `scripts/windows-backup.ps1`, `tests/account-access.test.ts`, `tests/inactive-retention.test.ts`, `docs/backup-retention-policy.md`, `docs/development-deployment.md`, `docs/ARCHITECTURE.md`, `CLAUDE_HANDOFF.md`, `docs/launch-plan-20261022.md`.
